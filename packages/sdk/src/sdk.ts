import type { Address, WalletClient } from "viem";
import { resolveConfig, validateConfig } from "./config.js";
import {
  createKernelAccountFromWallet,
  createKernelPublicClient,
  createSessionKeyApproval,
  getKernelAccountAddress,
  isKernelAccountDeployed,
} from "./kernel.js";
import {
  canUseSessionKey,
  exportSessionKeyForBackend,
  generateSessionKey,
  getSessionKeyRemainingTime,
  isSessionKeyExpired,
  isSessionKeyValid,
  markSessionKeyApproved,
} from "./session-keys.js";
import {
  sendOwnerTransaction,
  sendSessionKeyTransaction,
} from "./transactions.js";
import type {
  CallData,
  ResolvedConfig,
  Router402Config,
  SessionKeyData,
  SessionKeyForBackend,
  SmartAccountInfo,
  TransactionExecutionResult,
} from "./types.js";
import { SmartAccountError } from "./types.js";

/**
 * Router402 SDK - Main entry point for smart account operations
 *
 * Usage:
 * ```typescript
 * import { Router402Sdk } from "@router402/sdk";
 * import { baseSepolia } from "viem/chains";
 *
 * const sdk = new Router402Sdk({
 *   chain: baseSepolia,
 *   pimlicoApiKey: "your-api-key",
 * });
 *
 * // Get smart account address
 * const address = await sdk.getSmartAccountAddress(walletClient);
 *
 * // Deploy smart account
 * await sdk.deploySmartAccount(walletClient);
 *
 * // Create and approve session key
 * const sessionKey = sdk.generateSessionKey(smartAccountAddress, eoaAddress);
 * const approvedKey = await sdk.approveSessionKey(walletClient, sessionKey);
 *
 * // Send transaction with session key
 * await sdk.sendSessionKeyTransaction(approvedKey, [{ to: "0x...", value: 0n }]);
 * ```
 */
export class Router402Sdk {
  private config: ResolvedConfig;

  constructor(userConfig: Router402Config) {
    validateConfig(userConfig);
    this.config = resolveConfig(userConfig);
  }

  /**
   * Get the resolved configuration
   */
  getConfig(): ResolvedConfig {
    return this.config;
  }

  /**
   * Get the chain ID
   */
  getChainId(): number {
    return this.config.chainId;
  }

  // =====================
  // Smart Account Methods
  // =====================

  /**
   * Get the deterministic smart account address for a wallet
   */
  async getSmartAccountAddress(walletClient: WalletClient): Promise<Address> {
    return getKernelAccountAddress(walletClient, this.config);
  }

  /**
   * Check if a smart account is deployed on-chain
   */
  async isSmartAccountDeployed(address: Address): Promise<boolean> {
    return isKernelAccountDeployed(address, this.config);
  }

  /**
   * Get complete smart account information
   */
  async getSmartAccountInfo(
    walletClient: WalletClient,
    eoaAddress: Address
  ): Promise<SmartAccountInfo> {
    const account = await createKernelAccountFromWallet(
      walletClient,
      this.config
    );
    const isDeployed = await account.isDeployed();

    return {
      address: account.address,
      eoaAddress,
      isDeployed,
      chainId: this.config.chainId,
    };
  }

  /**
   * Get the ETH balance of a smart account
   */
  async getSmartAccountBalance(address: Address): Promise<bigint> {
    const publicClient = createKernelPublicClient(this.config);
    return publicClient.getBalance({ address });
  }

  /**
   * Deploy a smart account (sends a no-op transaction to trigger deployment)
   */
  async deploySmartAccount(
    walletClient: WalletClient
  ): Promise<TransactionExecutionResult> {
    const address = await this.getSmartAccountAddress(walletClient);

    // Send a 0-value transaction to self to trigger deployment
    return this.sendOwnerTransaction(walletClient, [
      { to: address, value: 0n },
    ]);
  }

  // ===================
  // Transaction Methods
  // ===================

  /**
   * Send a transaction using the owner wallet
   */
  async sendOwnerTransaction(
    walletClient: WalletClient,
    calls: CallData[]
  ): Promise<TransactionExecutionResult> {
    return sendOwnerTransaction(walletClient, calls, this.config);
  }

  /**
   * Send a transaction using a session key
   */
  async sendSessionKeyTransaction(
    sessionKey: SessionKeyData,
    calls: CallData[]
  ): Promise<TransactionExecutionResult> {
    if (isSessionKeyExpired(sessionKey)) {
      throw new SmartAccountError(
        "SESSION_KEY_EXPIRED",
        "Session key has expired"
      );
    }

    if (!sessionKey.isApproved || !sessionKey.serializedSessionKey) {
      throw new SmartAccountError(
        "SESSION_KEY_NOT_APPROVED",
        "Session key is not approved or missing serialized data"
      );
    }

    return sendSessionKeyTransaction(
      sessionKey.privateKey,
      sessionKey.serializedSessionKey,
      calls,
      this.config
    );
  }

  /**
   * Send a transaction using raw session key data (for backend use)
   */
  async sendSessionKeyTransactionFromBackend(
    sessionKeyData: SessionKeyForBackend,
    calls: CallData[]
  ): Promise<TransactionExecutionResult> {
    return sendSessionKeyTransaction(
      sessionKeyData.privateKey,
      sessionKeyData.serializedSessionKey,
      calls,
      this.config
    );
  }

  // ====================
  // Session Key Methods
  // ====================

  /**
   * Generate a new session key pair
   */
  generateSessionKey(
    smartAccountAddress: Address,
    ownerAddress: Address
  ): SessionKeyData {
    return generateSessionKey(smartAccountAddress, ownerAddress, this.config);
  }

  /**
   * Approve a session key (requires owner signature)
   * Returns the updated session key with approval data.
   *
   * The session key's expiresAt is enforced on-chain via toTimestampPolicy.
   * If allowedCallers are provided (or already set on the session key),
   * only those addresses can submit transactions with this session key.
   *
   * @param walletClient - The owner wallet client
   * @param sessionKey - The session key to approve
   * @param allowedCallers - Optional addresses allowed to use this session key (enforced on-chain)
   */
  async approveSessionKey(
    walletClient: WalletClient,
    sessionKey: SessionKeyData,
    allowedCallers?: Address[]
  ): Promise<SessionKeyData> {
    const callers = allowedCallers ?? sessionKey.allowedCallers;

    const serializedApproval = await createSessionKeyApproval(
      walletClient,
      sessionKey.publicKey,
      this.config,
      sessionKey.expiresAt,
      callers
    );

    return {
      ...markSessionKeyApproved(sessionKey, serializedApproval),
      allowedCallers: callers,
    };
  }

  /**
   * Check if a session key is valid and can be used
   */
  isSessionKeyValid(sessionKey: SessionKeyData | undefined): boolean {
    return isSessionKeyValid(sessionKey);
  }

  /**
   * Check if a session key can be used for transactions
   */
  canUseSessionKey(sessionKey: SessionKeyData): boolean {
    return canUseSessionKey(sessionKey);
  }

  /**
   * Check if a session key is expired
   */
  isSessionKeyExpired(sessionKey: SessionKeyData): boolean {
    return isSessionKeyExpired(sessionKey);
  }

  /**
   * Get remaining validity time for a session key in milliseconds
   */
  getSessionKeyRemainingTime(sessionKey: SessionKeyData): number {
    return getSessionKeyRemainingTime(sessionKey);
  }

  /**
   * Export session key data for backend use
   */
  exportSessionKeyForBackend(
    sessionKey: SessionKeyData
  ): SessionKeyForBackend | null {
    return exportSessionKeyForBackend(sessionKey, this.config.chainId);
  }
}

/**
 * Create a new Router402Sdk instance
 */
export function createRouter402Sdk(config: Router402Config): Router402Sdk {
  return new Router402Sdk(config);
}
