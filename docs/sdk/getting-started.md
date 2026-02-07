# Getting Started

This guide walks you through installing the SDK, configuring it, and setting up your first smart account.

## Prerequisites

- **Node.js 18+** or **Bun 1.0+**
- A **Pimlico API key** (get one at [pimlico.io](https://www.pimlico.io/))
- A wallet library like **Wagmi** or **Viem** for wallet client creation

## Installation

```bash
npm install @router402/sdk viem
```

Or with Bun:

```bash
bun add @router402/sdk viem
```

## Configuration

Create an SDK instance with your configuration:

```typescript
import { Router402Sdk } from "@router402/sdk";
import { baseSepolia } from "viem/chains";

const sdk = new Router402Sdk({
  chain: baseSepolia,
  pimlicoApiKey: process.env.PIMLICO_API_KEY!,
});
```

### Configuration Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `chain` | `Chain` | Yes | -- | Target blockchain (from `viem/chains`) |
| `pimlicoApiKey` | `string` | Yes | -- | Pimlico API key for bundler and paymaster |
| `entryPointVersion` | `"0.7"` | No | `"0.7"` | ERC-4337 entry point version |
| `sessionKeyValidityPeriod` | `number` | No | `31536000` | Session key validity in seconds (default: 1 year) |

The SDK validates the configuration on construction and throws if required fields are missing or invalid.

### Factory Function

You can also use the factory function:

```typescript
import { createRouter402Sdk } from "@router402/sdk";

const sdk = createRouter402Sdk({
  chain: baseSepolia,
  pimlicoApiKey: "your-api-key",
});
```

## Creating a Wallet Client

The SDK requires a Viem `WalletClient` for operations that need wallet signing. Here's how to create one:

### With Wagmi (React)

```typescript
import { useWalletClient } from "wagmi";

function MyComponent() {
  const { data: walletClient } = useWalletClient();

  // Use walletClient with the SDK
  if (walletClient) {
    const address = await sdk.getSmartAccountAddress(walletClient);
  }
}
```

### With Viem Directly

```typescript
import { createWalletClient, custom } from "viem";
import { baseSepolia } from "viem/chains";

const walletClient = createWalletClient({
  chain: baseSepolia,
  transport: custom(window.ethereum),
});
```

## First Steps

### 1. Get Your Smart Account Address

Every EOA deterministically maps to a smart account address. You can get this address before the account is deployed:

```typescript
const smartAccountAddress = await sdk.getSmartAccountAddress(walletClient);
console.log("Smart Account:", smartAccountAddress);
```

### 2. Check Deployment Status

```typescript
const isDeployed = await sdk.isSmartAccountDeployed(smartAccountAddress);
console.log("Deployed:", isDeployed);
```

### 3. Deploy the Smart Account

If the account is not deployed, deploy it. This sends a no-op user operation that triggers on-chain deployment:

```typescript
if (!isDeployed) {
  const result = await sdk.deploySmartAccount(walletClient);
  console.log("Deploy tx:", result.txHash);
}
```

### 4. Create a Session Key

Generate a session key pair and have the owner approve it:

```typescript
// Generate key pair
const sessionKey = sdk.generateSessionKey(smartAccountAddress, eoaAddress);

// Owner approves the key (triggers wallet signature)
const approvedKey = await sdk.approveSessionKey(walletClient, sessionKey);
```

### 5. Send a Transaction

Use the approved session key to send transactions without the owner's wallet:

```typescript
const result = await sdk.sendSessionKeyTransaction(approvedKey, [
  {
    to: "0x...",
    value: 0n,
    data: "0x...",
  },
]);

console.log("Success:", result.success);
console.log("Tx hash:", result.txHash);
```

## Using the Setup Flow

For a simpler experience, use `setupAccount()` which orchestrates all steps automatically:

```typescript
const result = await sdk.setupAccount(walletClient, eoaAddress, {
  usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // USDC on Base Sepolia
  onStatus: (status) => {
    console.log("Setup status:", status);
    // "initializing" → "deploying" → "creating_session_key"
    // → "approving_session_key" → "enabling_session_key" → "complete"
  },
});

console.log("Smart Account:", result.info.address);
console.log("Session Key:", result.sessionKey.publicKey);
console.log("Is approved:", result.sessionKey.isApproved);
```

## Reading Configuration

Access the resolved configuration at any time:

```typescript
const config = sdk.getConfig();
console.log("Chain ID:", config.chainId);
console.log("Pimlico URL:", config.pimlicoUrl);
console.log("Session key validity:", config.sessionKeyValidityPeriod, "seconds");
```

## Error Handling

The SDK throws `SmartAccountError` for domain-specific errors:

```typescript
import { SmartAccountError } from "@router402/sdk";

try {
  await sdk.deploySmartAccount(walletClient);
} catch (error) {
  if (error instanceof SmartAccountError) {
    console.error(`[${error.type}] ${error.message}`);
    // e.g. [DEPLOYMENT_FAILED] Failed to deploy Smart Account
  }
}
```

See [Types Reference](types.md) for the full list of error types.

## Next Steps

- [Smart Accounts](smart-accounts.md) -- Learn about smart account management in detail
- [Session Keys](session-keys.md) -- Understand session key policies and lifecycle
- [Transactions](transactions.md) -- Send transactions with owner wallets and session keys
