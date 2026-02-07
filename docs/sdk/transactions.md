# Transactions

The SDK provides methods for sending transactions through the ERC-4337 user operation pipeline. Transactions can be signed by either the owner's wallet or a session key.

## How Transactions Work

Route402 transactions follow the ERC-4337 flow:

```
Call Data ──▶ User Operation ──▶ Pimlico Bundler ──▶ Entry Point ──▶ On-chain
                   │                    │
                   │ signed by          │ gas sponsored by
                   │ owner or           │ Pimlico paymaster
                   │ session key        │
```

1. The SDK encodes your call data into a **user operation** (UserOp).
2. The UserOp is signed by either the owner wallet or a session key.
3. The signed UserOp is sent to the **Pimlico bundler**, which bundles it into a transaction.
4. The **Pimlico paymaster** sponsors the gas fee -- users don't need to hold ETH.
5. The bundled transaction is submitted to the blockchain through the **ERC-4337 entry point**.

## Methods

### sendOwnerTransaction

Send a transaction signed by the owner's wallet. The wallet will be prompted to sign the user operation.

```typescript
async sendOwnerTransaction(
  walletClient: WalletClient,
  calls: CallData[]
): Promise<TransactionExecutionResult>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `walletClient` | `WalletClient` | Owner's wallet client |
| `calls` | `CallData[]` | Array of calls to execute |

**Returns:** A `TransactionExecutionResult`.

**Example:**

```typescript
import { encodeFunctionData } from "viem";

const result = await sdk.sendOwnerTransaction(walletClient, [
  {
    to: "0xTokenContract...",
    value: 0n,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: "transfer",
      args: ["0xRecipient...", 1000000n],
    }),
  },
]);

if (result.success) {
  console.log("Transaction hash:", result.txHash);
}
```

---

### sendSessionKeyTransaction

Send a transaction signed by a session key. No wallet prompt is required -- the session key signs automatically.

```typescript
async sendSessionKeyTransaction(
  sessionKey: SessionKeyData,
  calls: CallData[]
): Promise<TransactionExecutionResult>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `sessionKey` | `SessionKeyData` | An approved, non-expired session key |
| `calls` | `CallData[]` | Array of calls to execute |

**Returns:** A `TransactionExecutionResult`.

**Throws:**
- `SmartAccountError` with type `SESSION_KEY_EXPIRED` if the key has expired
- `SmartAccountError` with type `SESSION_KEY_NOT_APPROVED` if the key is not approved

**Example:**

```typescript
const result = await sdk.sendSessionKeyTransaction(approvedKey, [
  { to: "0x...", value: 0n },
]);
```

---

### sendSessionKeyTransactionFromBackend

Send a transaction using raw session key data, designed for backend use. Accepts the `SessionKeyForBackend` format obtained from `exportSessionKeyForBackend()`.

```typescript
async sendSessionKeyTransactionFromBackend(
  sessionKeyData: SessionKeyForBackend,
  calls: CallData[]
): Promise<TransactionExecutionResult>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `sessionKeyData` | `SessionKeyForBackend` | Session key data exported for backend use |
| `calls` | `CallData[]` | Array of calls to execute |

**Returns:** A `TransactionExecutionResult`.

**Example:**

```typescript
// On the backend
import { Router402Sdk } from "@router402/sdk";
import { baseSepolia } from "viem/chains";

const sdk = new Router402Sdk({
  chain: baseSepolia,
  pimlicoApiKey: process.env.PIMLICO_API_KEY!,
});

// sessionKeyData was stored during the authorization flow
const result = await sdk.sendSessionKeyTransactionFromBackend(
  sessionKeyData,
  [
    {
      to: "0xUSDC...",
      value: 0n,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [recipientAddress, amount],
      }),
    },
  ]
);
```

## Call Data Format

All transaction methods accept an array of `CallData` objects:

```typescript
interface CallData {
  to: Address;      // Target contract address
  value?: bigint;   // Native token value in wei (default: 0)
  data?: Hex;       // Encoded calldata
}
```

### Encoding Calldata

Use Viem's `encodeFunctionData` to encode contract calls:

```typescript
import { encodeFunctionData, erc20Abi } from "viem";

const calls: CallData[] = [
  // Simple ETH transfer
  {
    to: "0xRecipient...",
    value: 1000000000000000n, // 0.001 ETH
  },

  // ERC-20 transfer
  {
    to: "0xTokenContract...",
    value: 0n,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: "transfer",
      args: ["0xRecipient...", 1000000n], // 1 USDC (6 decimals)
    }),
  },

  // ERC-20 approve
  {
    to: "0xTokenContract...",
    value: 0n,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: ["0xSpender...", 1000000n],
    }),
  },
];
```

### Batched Transactions

You can pass multiple calls in a single transaction. The smart account executes them atomically:

```typescript
const result = await sdk.sendOwnerTransaction(walletClient, [
  { to: "0xA...", value: 100n },
  { to: "0xB...", value: 200n },
  { to: "0xC...", data: "0x..." },
]);
// All three calls execute in a single transaction
```

## Transaction Result

All transaction methods return a `TransactionExecutionResult`:

```typescript
interface TransactionExecutionResult {
  success: boolean;    // Whether the transaction succeeded
  txHash?: Hex;        // On-chain transaction hash
  userOpHash?: Hex;    // ERC-4337 user operation hash
  error?: string;      // Error message if failed
}
```

- `txHash` is set once the transaction is included in a block.
- `userOpHash` is the ERC-4337 user operation identifier.
- If `success` is `false`, check the `error` field for details.

## Gas Sponsorship

All transactions are gas-sponsored by the Pimlico paymaster. Users do not need to hold native tokens (ETH) in their smart account to execute transactions. The paymaster covers gas fees as part of the user operation bundling process.
