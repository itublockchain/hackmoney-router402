import type { Address, Hash, Hex } from "viem";

/**
 * Smart Account information
 */
export interface SmartAccountInfo {
  /** Smart Account address (deterministic) */
  address: Address;
  /** Owner EOA address */
  eoaAddress: Address;
  /** Whether the account is deployed on-chain */
  isDeployed: boolean;
  /** Chain ID */
  chainId: number;
}

/**
 * Smart Account deployment result
 */
export interface DeploymentResult {
  /** Transaction hash of deployment */
  txHash: Hash;
  /** User operation hash */
  userOpHash: Hash;
  /** Smart Account address */
  address: Address;
  /** Whether deployment was successful */
  success: boolean;
}

/**
 * Transaction result from sendTransaction
 */
export interface TransactionResult {
  /** Transaction hash after inclusion */
  txHash?: Hash;
  /** Whether the operation was successful */
  success: boolean;
}

/**
 * User operation result from sendUserOperation
 */
export interface UserOperationResult {
  /** Transaction hash after inclusion */
  txHash?: Hash;
  /** User operation hash */
  userOpHash?: Hash;
  /** Whether the operation was successful */
  success: boolean;
}

/**
 * Session Key data stored in LocalStorage
 */
export interface SessionKeyData {
  /** Private key (hex string) - only stored locally, never shared */
  privateKey: Hex;
  /** Public address derived from private key */
  publicKey: Address;
  /** Timestamp when key was created */
  createdAt: number;
  /** Timestamp when key expires */
  expiresAt: number;
  /** Smart Account address this key is associated with */
  smartAccountAddress: Address;
  /** Owner EOA address (needed for account derivation) */
  ownerAddress: Address;
  /** Serialized permission account - contains approvals */
  serializedSessionKey?: string;
  /** Whether the key has been approved (serializedSessionKey is set) */
  isApproved: boolean;
}

/**
 * Data to send to backend for transaction execution
 * Contains everything needed to reconstruct the session key client
 */
export interface SessionKeyForBackend {
  /** Private key (hex string) */
  privateKey: Hex;
  /** Serialized permission account */
  serializedSessionKey: string;
  /** Smart Account address */
  smartAccountAddress: Address;
  /** Chain ID */
  chainId: number;
}

/**
 * Session Key storage structure (indexed by smart account address)
 */
export interface SessionKeyStorage {
  [smartAccountAddress: Address]: SessionKeyData[];
}

/**
 * Error types for Smart Account operations
 */
export type SmartAccountErrorType =
  | "BUNDLER_NOT_CONFIGURED"
  | "DEPLOYMENT_FAILED"
  | "INSUFFICIENT_FUNDS"
  | "USER_REJECTED"
  | "NETWORK_ERROR"
  | "SESSION_KEY_NOT_APPROVED"
  | "UNKNOWN_ERROR";

/**
 * Smart Account error
 */
export class SmartAccountError extends Error {
  type: SmartAccountErrorType;

  constructor(type: SmartAccountErrorType, message: string) {
    super(message);
    this.name = "SmartAccountError";
    this.type = type;
  }
}
