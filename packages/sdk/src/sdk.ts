import type { Address, WalletClient } from "viem";
import { encodeFunctionData, erc20Abi } from "viem";
import { resolveConfig, validateSmartAccountConfig } from "./config.js";
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
  ChatOptions,
  ChatResponse,
  GasOverrides,
  ResolvedConfig,
  Router402Config,
  SessionKeyData,
  SessionKeyForBackend,
  SetupAccountOptions,
  SetupAccountResult,
  SmartAccountInfo,
  SmartAccountResolvedConfig,
  TransactionExecutionResult,
} from "./types.js";
import { SmartAccountError } from "./types.js";

/**
 * Router402 SDK - Main entry point for chat completions and smart account operations
 *
 * Usage (chat only):
 * ```typescript
 * const sdk = new Router402Sdk({ token: "your-jwt-token" });
 * const response = await sdk.chat("What is ERC-4337?");
 * ```
 *
 * Usage (with smart accounts):
 * ```typescript
 * const sdk = new Router402Sdk({
 *   chain: baseSepolia,
 *   pimlicoApiKey: "your-api-key",
 *   token: "your-jwt-token",
 * });
 * ```
 */
export class Router402Sdk {
  private config: ResolvedConfig;
  private token: string | null = null;

  constructor(userConfig: Router402Config) {
    this.config = resolveConfig(userConfig);
    if (userConfig.token) {
      this.token = userConfig.token;
    }
  }

  /**
   * Ensures chain and pimlicoApiKey are configured.
   * Returns the config with smart account fields guaranteed.
   * Throws SmartAccountError if not configured.
   */
  private requireSmartAccountConfig(): SmartAccountResolvedConfig {
    validateSmartAccountConfig(this.config);
    return this.config as SmartAccountResolvedConfig;
  }

  /**
   * Get the resolved configuration
   */
  getConfig(): ResolvedConfig {
    return this.config;
  }

  /**
   * Get the chain ID (requires chain to be configured)
   */
  getChainId(): number {
    const config = this.requireSmartAccountConfig();
    return config.chainId;
  }

  // =====================
  // Smart Account Methods
  // =====================

  /**
   * Get the deterministic smart account address for a wallet
   */
  async getSmartAccountAddress(walletClient: WalletClient): Promise<Address> {
    const config = this.requireSmartAccountConfig();
    return getKernelAccountAddress(walletClient, config);
  }

  /**
   * Check if a smart account is deployed on-chain
   */
  async isSmartAccountDeployed(address: Address): Promise<boolean> {
    const config = this.requireSmartAccountConfig();
    return isKernelAccountDeployed(address, config);
  }

  /**
   * Get complete smart account information
   */
  async getSmartAccountInfo(
    walletClient: WalletClient,
    eoaAddress: Address
  ): Promise<SmartAccountInfo> {
    const config = this.requireSmartAccountConfig();
    const account = await createKernelAccountFromWallet(walletClient, config);
    const isDeployed = await account.isDeployed();

    return {
      address: account.address,
      eoaAddress,
      isDeployed,
      chainId: config.chainId,
    };
  }

  /**
   * Get the ETH balance of a smart account
   */
  async getSmartAccountBalance(address: Address): Promise<bigint> {
    const config = this.requireSmartAccountConfig();
    const publicClient = createKernelPublicClient(config);
    return publicClient.getBalance({ address });
  }

  /**
   * Deploy a smart account (sends a no-op transaction to trigger deployment)
   */
  async deploySmartAccount(
    walletClient: WalletClient
  ): Promise<TransactionExecutionResult> {
    this.requireSmartAccountConfig();
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
    calls: CallData[],
    gasOverrides?: GasOverrides
  ): Promise<TransactionExecutionResult> {
    const config = this.requireSmartAccountConfig();
    return sendOwnerTransaction(walletClient, calls, config, gasOverrides);
  }

  /**
   * Send a transaction using a session key
   */
  async sendSessionKeyTransaction(
    sessionKey: SessionKeyData,
    calls: CallData[],
    gasOverrides?: GasOverrides
  ): Promise<TransactionExecutionResult> {
    const config = this.requireSmartAccountConfig();
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
      config,
      gasOverrides
    );
  }

  /**
   * Send a transaction using raw session key data (for backend use)
   */
  async sendSessionKeyTransactionFromBackend(
    sessionKeyData: SessionKeyForBackend,
    calls: CallData[],
    gasOverrides?: GasOverrides
  ): Promise<TransactionExecutionResult> {
    const config = this.requireSmartAccountConfig();
    return sendSessionKeyTransaction(
      sessionKeyData.privateKey,
      sessionKeyData.serializedSessionKey,
      calls,
      config,
      gasOverrides
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
    const config = this.requireSmartAccountConfig();
    return generateSessionKey(smartAccountAddress, ownerAddress, config);
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
    const config = this.requireSmartAccountConfig();
    const callers = allowedCallers ?? sessionKey.allowedCallers;

    const serializedApproval = await createSessionKeyApproval(
      walletClient,
      sessionKey.publicKey,
      config,
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
    const config = this.requireSmartAccountConfig();
    return exportSessionKeyForBackend(sessionKey, config.chainId);
  }

  // ====================
  // Setup Methods
  // ====================

  /**
   * Enable a session key on-chain by sending a dummy ERC20 approve transaction.
   * The first UserOp through `sendSessionKeyTransaction` activates the
   * permission validator module on-chain via the `enableSignature` mechanism.
   *
   * @param sessionKey - An approved session key with serializedSessionKey
   * @param usdcAddress - The USDC contract address on the target chain
   * @param smartAccountAddress - The smart account address (used as the spender in the dummy approve)
   */
  async enableSessionKeyOnChain(
    sessionKey: SessionKeyData,
    usdcAddress: Address,
    smartAccountAddress: Address
  ): Promise<TransactionExecutionResult> {
    const config = this.requireSmartAccountConfig();
    if (!sessionKey.isApproved || !sessionKey.serializedSessionKey) {
      throw new SmartAccountError(
        "SESSION_KEY_NOT_APPROVED",
        "Session key must be approved before enabling on-chain"
      );
    }

    const approveData = encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [smartAccountAddress, BigInt(0)],
    });

    return sendSessionKeyTransaction(
      sessionKey.privateKey,
      sessionKey.serializedSessionKey,
      [{ to: usdcAddress, value: BigInt(0), data: approveData }],
      config
    );
  }

  /**
   * Full account setup flow: get info → deploy → generate session key → approve → enable on-chain.
   *
   * This method orchestrates all the steps needed to set up a smart account with a session key.
   * It does NOT handle storage or backend authorization — those are app-specific concerns.
   *
   * @param walletClient - The owner wallet client
   * @param eoaAddress - The owner EOA address
   * @param options - Setup options including USDC address and optional callbacks
   */
  async setupAccount(
    walletClient: WalletClient,
    eoaAddress: Address,
    options: SetupAccountOptions
  ): Promise<SetupAccountResult> {
    this.requireSmartAccountConfig(); // validates upfront before multi-step flow
    const { usdcAddress, existingSessionKey, onStatus } = options;

    // Step 1: Get smart account info
    onStatus?.("initializing");
    const info = await this.getSmartAccountInfo(walletClient, eoaAddress);

    // Step 2: Deploy if not deployed
    if (!info.isDeployed) {
      onStatus?.("deploying");
      const deployResult = await this.deploySmartAccount(walletClient);
      if (!deployResult.success) {
        throw new SmartAccountError(
          "DEPLOYMENT_FAILED",
          "Failed to deploy Smart Account"
        );
      }
      info.isDeployed = true;
    }

    // Step 3: Use existing session key or create a new one
    let sessionKey: SessionKeyData;
    if (existingSessionKey && this.canUseSessionKey(existingSessionKey)) {
      sessionKey = existingSessionKey;
    } else {
      onStatus?.("creating_session_key");
      const newKey = this.generateSessionKey(info.address, eoaAddress);

      // Step 4: Approve the session key (triggers wallet signing)
      onStatus?.("approving_session_key");
      sessionKey = await this.approveSessionKey(walletClient, newKey);

      if (!sessionKey.serializedSessionKey) {
        throw new SmartAccountError(
          "SESSION_KEY_NOT_APPROVED",
          "Failed to approve session key"
        );
      }
    }

    // Step 5: Enable session key on-chain
    onStatus?.("enabling_session_key");
    const enableResult = await this.enableSessionKeyOnChain(
      sessionKey,
      usdcAddress,
      info.address
    );

    if (!enableResult.success) {
      throw new SmartAccountError(
        "UNKNOWN_ERROR",
        `Failed to enable session key on-chain: ${enableResult.error}`
      );
    }

    onStatus?.("complete");
    return { info, sessionKey, enableResult };
  }

  // ====================
  // Chat Methods
  // ====================

  /**
   * Set the JWT token for authenticated API requests
   */
  setToken(token: string): void {
    this.token = token;
  }

  /**
   * Send a chat completion request to the Router402 API.
   *
   * @param prompt - The user message to send
   * @param options - Optional model, temperature, and max_tokens overrides
   * @returns The assistant's response content
   *
   * @example
   * ```typescript
   * sdk.setToken(jwtToken);
   * const response = await sdk.chat("What is ERC-4337?");
   * console.log(response);
   * ```
   */
  async chat(prompt: string, options?: ChatOptions): Promise<string> {
    if (!this.token) {
      throw new SmartAccountError(
        "NOT_CONFIGURED",
        "JWT token is required. Pass `token` in the constructor or call setToken() before using chat()."
      );
    }

    const body = {
      model: options?.model ?? "anthropic/claude-opus-4.6",
      messages: [{ role: "user" as const, content: prompt }],
      ...(options?.temperature !== undefined && {
        temperature: options.temperature,
      }),
      ...(options?.max_tokens !== undefined && {
        max_tokens: options.max_tokens,
      }),
    };

    const response = await fetch(
      `${this.config.apiBaseUrl}/v1/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
      const error = errorData?.error as { message?: string } | null | undefined;
      const message =
        error?.message ?? `Chat request failed with status ${response.status}`;
      throw new SmartAccountError("UNKNOWN_ERROR", message);
    }

    const data = (await response.json()) as ChatResponse;
    return data.choices[0].message.content;
  }
}

/**
 * Create a new Router402Sdk instance
 */
export function createRouter402Sdk(config: Router402Config): Router402Sdk {
  return new Router402Sdk(config);
}
