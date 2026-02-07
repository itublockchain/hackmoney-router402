# SDK Overview

The `@router402/sdk` package provides a TypeScript SDK for managing Kernel v3.1 smart accounts with session key support. It handles smart account creation, deployment, session key lifecycle, and transaction execution through ERC-4337 user operations.

## Package Information

```
Package: @router402/sdk
Version: 0.1.0
Runtime: TypeScript (ESM)
Peer dependency: viem ^2.0.0
```

## Installation

```bash
npm install @router402/sdk viem
# or
bun add @router402/sdk viem
```

## Core Features

| Feature | Description |
|---------|-------------|
| **Smart Accounts** | Create and manage Kernel v3.1 smart contract wallets |
| **Session Keys** | Generate, approve, and manage delegated signing keys |
| **Gasless Transactions** | Gas fees sponsored by Pimlico paymaster |
| **Account Setup** | One-call orchestration of the full setup flow |
| **Backend Support** | Export session keys for server-side transaction execution |

## Quick Example

```typescript
import { Router402Sdk } from "@router402/sdk";
import { baseSepolia } from "viem/chains";

const sdk = new Router402Sdk({
  chain: baseSepolia,
  pimlicoApiKey: "your-pimlico-api-key",
});

// Get the deterministic smart account address
const address = await sdk.getSmartAccountAddress(walletClient);

// Deploy the smart account (if not already deployed)
await sdk.deploySmartAccount(walletClient);

// Generate and approve a session key
const sessionKey = sdk.generateSessionKey(address, eoaAddress);
const approvedKey = await sdk.approveSessionKey(walletClient, sessionKey);

// Send a transaction using the session key
const result = await sdk.sendSessionKeyTransaction(approvedKey, [
  { to: "0x...", value: 0n },
]);
```

## SDK Architecture

The SDK is organized into focused modules:

| Module | File | Purpose |
|--------|------|---------|
| `Router402Sdk` | `sdk.ts` | Main class -- high-level API |
| Config | `config.ts` | Configuration validation and resolution |
| Kernel | `kernel.ts` | ZeroDev Kernel account integration |
| Session Keys | `session-keys.ts` | Key generation, validation, and export |
| Transactions | `transactions.ts` | User operation execution |
| Types | `types.ts` | All TypeScript interfaces and types |

## Technology Stack

The SDK builds on these libraries:

- **[ZeroDev SDK](https://docs.zerodev.app/)** -- Kernel v3.1 smart account creation and management
- **[Pimlico](https://docs.pimlico.io/)** -- ERC-4337 bundler and paymaster for gasless transactions
- **[Viem](https://viem.sh/)** -- TypeScript Ethereum client for wallet interactions
- **[permissionless](https://docs.pimlico.io/permissionless)** -- Account abstraction utilities

## Key Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `ENTRY_POINT_ADDRESS` | `0x0000000071727De22E5E9d8BAf0edAc6f37da032` | ERC-4337 Entry Point v0.7 |
| `KERNEL_VERSION` | `KERNEL_V3_1` | ZeroDev Kernel version |
| `DEFAULT_SESSION_KEY_VALIDITY` | `31536000` (1 year) | Default session key lifetime in seconds |

## Sections

- [Getting Started](getting-started.md) -- Installation and initial setup
- [Smart Accounts](smart-accounts.md) -- Account creation, deployment, and management
- [Session Keys](session-keys.md) -- Session key lifecycle and policies
- [Transactions](transactions.md) -- Sending transactions and user operations
- [Types Reference](types.md) -- Complete TypeScript type definitions
