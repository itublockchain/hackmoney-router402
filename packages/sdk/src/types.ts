import type { Address, Chain, Hash, Hex } from "viem";

/**
 * SDK Configuration options
 *
 * For chat-only usage, only `token` (or later `setToken()`) is needed.
 * For smart account operations, `chain` and `pimlicoApiKey` are also required.
 */
export interface Router402Config {
  /** Target chain for smart account operations (required for smart account features) */
  chain?: Chain;

  /** Pimlico API key for bundler/paymaster services (required for smart account features) */
  pimlicoApiKey?: string;

  /** JWT token for authenticated API requests (optional — can also be set later via setToken()) */
  token?: string;

  /** Entry point version (default: "0.7") */
  entryPointVersion?: "0.7";

  /** Session key validity period in seconds (default: 1 year) */
  sessionKeyValidityPeriod?: number;

  /** Router402 API base URL (default: "https://api.router402.xyz") */
  apiBaseUrl?: string;

  /** Custom RPC URL for chain interactions (defaults to Pimlico RPC if pimlicoApiKey is set) */
  rpcUrl?: string;
}

/**
 * Resolved configuration with defaults applied.
 * For chat-only usage, chain/pimlico fields may be undefined.
 */
export interface ResolvedConfig {
  chain?: Chain;
  chainId?: number;
  pimlicoApiKey?: string;
  pimlicoUrl?: string;
  rpcUrl?: string;
  entryPointVersion: "0.7";
  sessionKeyValidityPeriod: number;
  apiBaseUrl: string;
}

/**
 * Resolved configuration with smart account fields guaranteed present.
 * Used by internal kernel, session key, and transaction modules.
 */
export interface SmartAccountResolvedConfig extends ResolvedConfig {
  chain: Chain;
  chainId: number;
  pimlicoApiKey: string;
  pimlicoUrl: string;
  rpcUrl: string;
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
  /** Private key (hex string) */
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
 * Status values emitted during the account setup flow
 */
export type SetupStatus =
  | "initializing"
  | "deploying"
  | "creating_session_key"
  | "approving_session_key"
  | "enabling_session_key"
  | "complete";

/**
 * Callbacks for setup progress reporting
 */
export interface SetupCallbacks {
  /** Called when the setup status changes */
  onStatus?: (status: SetupStatus) => void;
}

/**
 * Options for the setupAccount flow
 */
export interface SetupAccountOptions extends SetupCallbacks {
  /** USDC contract address on the target chain (required for session key enablement) */
  usdcAddress: Address;
  /** If provided, skip deployment and session key creation when already done */
  existingSessionKey?: SessionKeyData;
}

/**
 * Result of the setupAccount flow
 */
export interface SetupAccountResult {
  /** Smart account info (address, deployment status, etc.) */
  info: SmartAccountInfo;
  /** The approved and on-chain-enabled session key */
  sessionKey: SessionKeyData;
  /** Result of the session key enablement transaction */
  enableResult: TransactionExecutionResult;
}

/**
 * Chat message for completions API
 */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Options for the chat method
 */
export interface ChatOptions {
  /** Model to use (default: "anthropic/claude-sonnet-4.5") */
  model?: string;
  /** Sampling temperature (0-2) */
  temperature?: number;
  /** Maximum tokens to generate */
  max_tokens?: number;
}

/**
 * Usage data from chat completions
 */
export interface ChatUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

/**
 * Response from the chat completions API
 */
export interface ChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }[];
  usage: ChatUsage;
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
