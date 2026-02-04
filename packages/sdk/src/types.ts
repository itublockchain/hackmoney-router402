import type { Address, Chain, Hash, Hex } from "viem";

/**
 * SDK Configuration options
 */
export interface Router402Config {
  /** Target chain for smart account operations */
  chain: Chain;

  /** Pimlico API key for bundler/paymaster services */
  pimlicoApiKey: string;

  /** Entry point version (default: "0.7") */
  entryPointVersion?: "0.7";

  /** Session key validity period in seconds (default: 1 year) */
  sessionKeyValidityPeriod?: number;
}

/**
 * Resolved configuration with defaults applied
 */
export interface ResolvedConfig {
  chain: Chain;
  chainId: number;
  pimlicoApiKey: string;
  pimlicoUrl: string;
  entryPointVersion: "0.7";
  sessionKeyValidityPeriod: number;
}

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
 * Session Key data - full data including private key
 * Used for client-side storage
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
  /** Serialized permission account - contains approvals (only set after approval) */
  serializedSessionKey?: string;
  /** Whether the key has been approved (serializedSessionKey is set) */
  isApproved: boolean;
  /** Addresses allowed to use this session key (enforced on-chain via toSignatureCallerPolicy) */
  allowedCallers?: Address[];
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
 * Call data for sending transactions
 */
export interface CallData {
  /** Target contract address */
  to: Address;
  /** Value to send in wei */
  value?: bigint;
  /** Calldata to send */
  data?: Hex;
}

/**
 * Transaction execution result
 */
export interface TransactionExecutionResult {
  /** Whether the transaction was successful */
  success: boolean;
  /** Transaction hash after inclusion */
  txHash?: Hex;
  /** User operation hash */
  userOpHash?: Hex;
  /** Error message if failed */
  error?: string;
}

/**
 * Error types for Smart Account operations
 */
export type SmartAccountErrorType =
  | "NOT_CONFIGURED"
  | "DEPLOYMENT_FAILED"
  | "INSUFFICIENT_FUNDS"
  | "USER_REJECTED"
  | "NETWORK_ERROR"
  | "SESSION_KEY_NOT_APPROVED"
  | "INVALID_SESSION_KEY"
  | "SESSION_KEY_EXPIRED"
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
