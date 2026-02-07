# Types Reference

Complete TypeScript type definitions exported by `@router402/sdk`.

## Configuration

### Router402Config

Input configuration for creating an SDK instance.

```typescript
interface Router402Config {
  /** Target chain for smart account operations */
  chain: Chain;

  /** Pimlico API key for bundler/paymaster services */
  pimlicoApiKey: string;

  /** Entry point version (default: "0.7") */
  entryPointVersion?: "0.7";

  /** Session key validity period in seconds (default: 31536000 / 1 year) */
  sessionKeyValidityPeriod?: number;
}
```

### ResolvedConfig

Internal configuration after defaults are applied and values computed.

```typescript
interface ResolvedConfig {
  chain: Chain;
  chainId: number;
  pimlicoApiKey: string;
  pimlicoUrl: string;
  entryPointVersion: "0.7";
  sessionKeyValidityPeriod: number;
}
```

## Smart Account Types

### SmartAccountInfo

Complete information about a smart account.

```typescript
interface SmartAccountInfo {
  /** Smart Account address (deterministic, derived from owner EOA) */
  address: Address;

  /** Owner EOA address */
  eoaAddress: Address;

  /** Whether the account is deployed on-chain */
  isDeployed: boolean;

  /** Chain ID */
  chainId: number;
}
```

### DeploymentResult

Result of a smart account deployment.

```typescript
interface DeploymentResult {
  /** Transaction hash of deployment */
  txHash: Hash;

  /** User operation hash */
  userOpHash: Hash;

  /** Smart Account address */
  address: Address;

  /** Whether deployment was successful */
  success: boolean;
}
```

## Session Key Types

### SessionKeyData

Full session key data including the private key. Used for client-side storage and transaction signing.

```typescript
interface SessionKeyData {
  /** Private key (hex string) -- keep secret */
  privateKey: Hex;

  /** Public address derived from private key */
  publicKey: Address;

  /** Timestamp (ms) when key was created */
  createdAt: number;

  /** Timestamp (ms) when key expires */
  expiresAt: number;

  /** Smart Account address this key is associated with */
  smartAccountAddress: Address;

  /** Owner EOA address (needed for account derivation) */
  ownerAddress: Address;

  /** Serialized permission account (set after approval) */
  serializedSessionKey?: string;

  /** Whether the key has been approved by the owner */
  isApproved: boolean;

  /** Addresses allowed to use this session key (on-chain enforced) */
  allowedCallers?: Address[];
}
```

### SessionKeyForBackend

Subset of session key data for backend use. Contains everything needed to reconstruct a session key client on the server.

```typescript
interface SessionKeyForBackend {
  /** Private key (hex string) */
  privateKey: Hex;

  /** Serialized permission account */
  serializedSessionKey: string;

  /** Smart Account address */
  smartAccountAddress: Address;

  /** Chain ID */
  chainId: number;
}
```

## Transaction Types

### CallData

Input format for transaction calls.

```typescript
interface CallData {
  /** Target contract address */
  to: Address;

  /** Value to send in wei */
  value?: bigint;

  /** Encoded calldata */
  data?: Hex;
}
```

### TransactionExecutionResult

Result from any transaction method.

```typescript
interface TransactionExecutionResult {
  /** Whether the transaction was successful */
  success: boolean;

  /** Transaction hash after block inclusion */
  txHash?: Hex;

  /** ERC-4337 user operation hash */
  userOpHash?: Hex;

  /** Error message if failed */
  error?: string;
}
```

### TransactionResult

Simplified transaction result.

```typescript
interface TransactionResult {
  /** Transaction hash after inclusion */
  txHash?: Hash;

  /** Whether the operation was successful */
  success: boolean;
}
```

### UserOperationResult

Result from a user operation submission.

```typescript
interface UserOperationResult {
  /** Transaction hash after inclusion */
  txHash?: Hash;

  /** User operation hash */
  userOpHash?: Hash;

  /** Whether the operation was successful */
  success: boolean;
}
```

## Setup Types

### SetupAccountOptions

Options for the `setupAccount()` method.

```typescript
interface SetupAccountOptions extends SetupCallbacks {
  /** USDC contract address on the target chain (required for session key enablement) */
  usdcAddress: Address;

  /** If provided, skip key generation when an existing key is still valid */
  existingSessionKey?: SessionKeyData;
}
```

### SetupAccountResult

Result of the `setupAccount()` method.

```typescript
interface SetupAccountResult {
  /** Smart account info (address, deployment status, etc.) */
  info: SmartAccountInfo;

  /** The approved and on-chain-enabled session key */
  sessionKey: SessionKeyData;

  /** Result of the session key enablement transaction */
  enableResult: TransactionExecutionResult;
}
```

### SetupCallbacks

Callbacks for progress reporting during setup.

```typescript
interface SetupCallbacks {
  /** Called when the setup status changes */
  onStatus?: (status: SetupStatus) => void;
}
```

### SetupStatus

Status values emitted during the account setup flow.

```typescript
type SetupStatus =
  | "initializing"          // Getting smart account info
  | "deploying"             // Deploying smart account on-chain
  | "creating_session_key"  // Generating session key pair
  | "approving_session_key" // Owner signing approval (wallet prompt)
  | "enabling_session_key"  // First session key transaction
  | "complete";             // Setup finished successfully
```

## Error Types

### SmartAccountError

Custom error class for smart account operations.

```typescript
class SmartAccountError extends Error {
  type: SmartAccountErrorType;

  constructor(type: SmartAccountErrorType, message: string);
}
```

### SmartAccountErrorType

All possible error classifications.

```typescript
type SmartAccountErrorType =
  | "NOT_CONFIGURED"          // SDK not properly configured
  | "DEPLOYMENT_FAILED"       // Smart account deployment failed
  | "INSUFFICIENT_FUNDS"      // Not enough funds for operation
  | "USER_REJECTED"           // User rejected the wallet prompt
  | "NETWORK_ERROR"           // Blockchain network error
  | "SESSION_KEY_NOT_APPROVED" // Session key has not been approved
  | "INVALID_SESSION_KEY"     // Session key data is invalid
  | "SESSION_KEY_EXPIRED"     // Session key has passed its expiration
  | "UNKNOWN_ERROR";          // Unexpected error
```

## Viem Types

The SDK re-uses types from Viem:

| Type | Import | Description |
|------|--------|-------------|
| `Address` | `viem` | `0x`-prefixed Ethereum address string |
| `Hex` | `viem` | `0x`-prefixed hex string |
| `Hash` | `viem` | 32-byte transaction/operation hash |
| `Chain` | `viem` | Chain configuration object |
| `WalletClient` | `viem` | Wallet client for signing operations |
