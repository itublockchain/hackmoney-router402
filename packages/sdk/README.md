<p align="center">
  <img src="https://router402.xyz/banner.gif" alt="Router402" width="100%" />
</p>

# @router402/sdk

TypeScript SDK for [Router402](https://router402.xyz) — an OpenRouter-compatible AI gateway with true micropayment billing via the [x402 protocol](https://www.x402.org/) on Base.

Access Claude, Gemini, and more through a single API. Every request settles the cost of the **previous** request as a USDC micropayment — your funds stay in your smart account until you actually use them.

## Installation

```bash
npm install @router402/sdk viem
```

```bash
yarn add @router402/sdk viem
```

```bash
pnpm add @router402/sdk viem
```

```bash
bun add @router402/sdk viem
```

> `viem` is a peer dependency required for blockchain interactions.

## Quick Start

### Chat Completions

For chat completions, you only need a JWT token (get one at [router402.xyz](https://router402.xyz)):

```typescript
import { Router402Sdk } from "@router402/sdk";

const sdk = new Router402Sdk({ token: "your-jwt-token" });

const response = await sdk.chat("What is ERC-4337?");
console.log(response);
```

Specify a model and options:

```typescript
const response = await sdk.chat("Explain account abstraction", {
  model: "anthropic/claude-haiku-4.5",
  temperature: 0.7,
  max_tokens: 500,
});
```

### Smart Account Operations

For smart account management (deploy, session keys, gasless transactions), provide `chain` and `pimlicoApiKey`:

```typescript
import { Router402Sdk } from "@router402/sdk";
import { baseSepolia } from "viem/chains";

const sdk = new Router402Sdk({
  chain: baseSepolia,
  pimlicoApiKey: "your-pimlico-api-key",
  token: "your-jwt-token",
});
```

## Features

| Feature | Description |
|---------|-------------|
| **Chat Completions** | One-line AI calls via `sdk.chat(prompt)` |
| **Smart Accounts** | Create and manage Kernel v3.1 smart contract wallets |
| **Session Keys** | Generate, approve, and manage delegated signing keys |
| **Gasless Transactions** | Gas fees sponsored via Pimlico paymaster |
| **Account Setup** | One-call orchestration of the full setup flow |
| **Backend Support** | Export session keys for server-side transaction execution |

## Configuration

```typescript
interface Router402Config {
  /** Target chain (required for smart account features) */
  chain?: Chain;

  /** Pimlico API key (required for smart account features) */
  pimlicoApiKey?: string;

  /** JWT token for API authentication */
  token?: string;

  /** Entry point version (default: "0.7") */
  entryPointVersion?: "0.7";

  /** Session key validity in seconds (default: 1 year) */
  sessionKeyValidityPeriod?: number;

  /** API base URL (default: "https://api.router402.xyz") */
  apiBaseUrl?: string;
}
```

## API Reference

### `new Router402Sdk(config)` / `createRouter402Sdk(config)`

Create an SDK instance. Both forms are equivalent:

```typescript
import { Router402Sdk, createRouter402Sdk } from "@router402/sdk";

const sdk = new Router402Sdk(config);
// or
const sdk = createRouter402Sdk(config);
```

---

### Chat Methods

#### `sdk.chat(prompt, options?)`

Send a chat completion request. Returns the assistant's response as a string.

```typescript
const answer = await sdk.chat("What is x402?");
```

**Parameters:**
- `prompt` — The user message
- `options.model` — Model identifier (default: `"anthropic/claude-opus-4.6"`)
- `options.temperature` — Sampling temperature (0–2)
- `options.max_tokens` — Maximum tokens to generate

#### `sdk.setToken(token)`

Set or update the JWT token for API requests.

```typescript
sdk.setToken("new-jwt-token");
```

---

### Smart Account Methods

> These methods require `chain` and `pimlicoApiKey` in the config.

#### `sdk.getSmartAccountAddress(walletClient)`

Get the deterministic smart account address for a wallet.

```typescript
const address = await sdk.getSmartAccountAddress(walletClient);
```

#### `sdk.isSmartAccountDeployed(address)`

Check if a smart account is deployed on-chain.

```typescript
const deployed = await sdk.isSmartAccountDeployed(address);
```

#### `sdk.getSmartAccountInfo(walletClient, eoaAddress)`

Get complete smart account information.

```typescript
const info = await sdk.getSmartAccountInfo(walletClient, eoaAddress);
// { address, eoaAddress, isDeployed, chainId }
```

#### `sdk.getSmartAccountBalance(address)`

Get the ETH balance of a smart account.

```typescript
const balance = await sdk.getSmartAccountBalance(address);
```

#### `sdk.deploySmartAccount(walletClient)`

Deploy a smart account on-chain.

```typescript
const result = await sdk.deploySmartAccount(walletClient);
if (result.success) {
  console.log("Deployed:", result.txHash);
}
```

---

### Session Key Methods

#### `sdk.generateSessionKey(smartAccountAddress, ownerAddress)`

Generate a new session key pair.

```typescript
const sessionKey = sdk.generateSessionKey(smartAccountAddress, ownerAddress);
```

#### `sdk.approveSessionKey(walletClient, sessionKey, allowedCallers?)`

Approve a session key with the owner wallet. Returns the updated session key with approval data.

```typescript
const approvedKey = await sdk.approveSessionKey(walletClient, sessionKey);
```

Optionally restrict which addresses can use the session key:

```typescript
const approvedKey = await sdk.approveSessionKey(walletClient, sessionKey, [
  "0xBackendAddress...",
]);
```

#### `sdk.isSessionKeyValid(sessionKey)`

Check if a session key exists, is approved, and hasn't expired.

#### `sdk.canUseSessionKey(sessionKey)`

Check if a session key can be used for transactions (approved + not expired).

#### `sdk.isSessionKeyExpired(sessionKey)`

Check if a session key has expired.

#### `sdk.getSessionKeyRemainingTime(sessionKey)`

Get the remaining validity time in milliseconds.

#### `sdk.exportSessionKeyForBackend(sessionKey)`

Export session key data for server-side transaction execution. Returns `null` if the key isn't approved.

```typescript
const backendData = sdk.exportSessionKeyForBackend(sessionKey);
// { privateKey, serializedSessionKey, smartAccountAddress, chainId }
```

---

### Transaction Methods

#### `sdk.sendOwnerTransaction(walletClient, calls)`

Send a transaction signed by the owner wallet.

```typescript
const result = await sdk.sendOwnerTransaction(walletClient, [
  { to: "0x...", value: 1000n, data: "0x..." },
]);
```

#### `sdk.sendSessionKeyTransaction(sessionKey, calls)`

Send a transaction using a session key (client-side).

```typescript
const result = await sdk.sendSessionKeyTransaction(approvedSessionKey, [
  { to: "0x...", value: 0n, data: "0x..." },
]);
```

#### `sdk.sendSessionKeyTransactionFromBackend(sessionKeyData, calls)`

Send a transaction using exported session key data (server-side).

```typescript
const result = await sdk.sendSessionKeyTransactionFromBackend(backendData, [
  { to: "0x...", value: 0n, data: "0x..." },
]);
```

---

### Setup Methods

#### `sdk.setupAccount(walletClient, eoaAddress, options)`

Full account setup flow: get info, deploy, generate session key, approve, and enable on-chain.

```typescript
const result = await sdk.setupAccount(walletClient, eoaAddress, {
  usdcAddress: "0xUSDC...",
  onStatus: (status) => console.log("Status:", status),
});

console.log("Account:", result.info.address);
console.log("Session key approved:", result.sessionKey.isApproved);
```

**Status callbacks:** `initializing` → `deploying` → `creating_session_key` → `approving_session_key` → `enabling_session_key` → `complete`

#### `sdk.enableSessionKeyOnChain(sessionKey, usdcAddress, smartAccountAddress)`

Enable an approved session key on-chain. This is called automatically by `setupAccount`, but can be used independently.

```typescript
const result = await sdk.enableSessionKeyOnChain(
  approvedSessionKey,
  usdcAddress,
  smartAccountAddress,
);
```

---

### Utility Methods

#### `sdk.getConfig()`

Get the resolved configuration object.

#### `sdk.getChainId()`

Get the configured chain ID.

## Error Handling

All errors are thrown as `SmartAccountError` with a `type` field:

```typescript
import { SmartAccountError } from "@router402/sdk";

try {
  await sdk.chat("Hello");
} catch (error) {
  if (error instanceof SmartAccountError) {
    switch (error.type) {
      case "NOT_CONFIGURED":
        // Missing required configuration
        break;
      case "SESSION_KEY_EXPIRED":
        // Session key needs renewal
        break;
      case "SESSION_KEY_NOT_APPROVED":
        // Session key hasn't been approved yet
        break;
      // ...
    }
  }
}
```

**Error types:**

| Type | Description |
|------|-------------|
| `NOT_CONFIGURED` | Missing required configuration (e.g., no JWT token for chat) |
| `DEPLOYMENT_FAILED` | Smart account deployment failed |
| `INSUFFICIENT_FUNDS` | Not enough funds for the operation |
| `USER_REJECTED` | User rejected the wallet signature |
| `NETWORK_ERROR` | Network request failed |
| `SESSION_KEY_NOT_APPROVED` | Session key hasn't been approved |
| `INVALID_SESSION_KEY` | Session key data is invalid |
| `SESSION_KEY_EXPIRED` | Session key has expired |
| `UNKNOWN_ERROR` | Unexpected error |

## Advanced Usage

The SDK also exports low-level utilities for advanced use cases:

```typescript
import {
  // Kernel account utilities
  createKernelPublicClient,
  createPimlicoPaymasterClient,
  createEcdsaValidator,
  createKernelAccountFromWallet,
  createKernelSmartAccountClient,
  getKernelAccountAddress,
  isKernelAccountDeployed,
  createSessionKeyApproval,
  createKernelClientFromSessionKey,

  // Session key utilities
  generateSessionKey,
  isSessionKeyValid,
  isSessionKeyExpired,
  canUseSessionKey,
  getSessionKeyRemainingTime,
  getSessionKeyAccount,
  exportSessionKeyForBackend,
  markSessionKeyApproved,

  // Transaction utilities
  sendOwnerTransaction,
  sendSessionKeyTransaction,

  // Config utilities
  resolveConfig,
  validateConfig,
  validateSmartAccountConfig,
  DEFAULT_API_BASE_URL,
  DEFAULT_SESSION_KEY_VALIDITY,
  ENTRY_POINT_ADDRESS,
  KERNEL_VERSION,
} from "@router402/sdk";
```

## How Payments Work

Router402 uses a unique **pay-for-previous** model:

1. Your first request is free — there's no previous cost to settle
2. Each subsequent request settles the **previous** request's cost as a USDC micropayment on Base
3. Settlement happens via Flashblocks (~0.2s finality)
4. Your funds stay in your smart account until a completed request is being paid for

No prepaid balances. No subscriptions. No custody.

## Links

- [Website](https://router402.xyz)
- [Documentation](https://docs.router402.xyz)
- [GitHub](https://github.com/itublockchain/hackmoney-route402)
- [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=router402xyz.router402-vscode)

## License

MIT
