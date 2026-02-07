# SDK

The `@router402/sdk` package provides a TypeScript SDK for managing Kernel v3.1 smart accounts with session key support. It handles smart account creation, deployment, session key lifecycle, and transaction execution.

## Installation

```bash
npm install @router402/sdk viem
```

Or with Bun:

```bash
bun add @router402/sdk viem
```

## Quick Start

```typescript
import { Router402Sdk } from "@router402/sdk";
import { baseSepolia } from "viem/chains";

const sdk = new Router402Sdk({
  chain: baseSepolia,
  pimlicoApiKey: "your-pimlico-api-key",
});

// Get the deterministic smart account address
const address = await sdk.getSmartAccountAddress(walletClient);

// Full account setup (deploy + session key) in one call
const result = await sdk.setupAccount(walletClient, eoaAddress, {
  usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  onStatus: (status) => console.log("Status:", status),
});
```

## Features

| Feature | Description |
|---------|-------------|
| **Smart Accounts** | Create and manage Kernel v3.1 smart contract wallets |
| **Session Keys** | Generate, approve, and manage delegated signing keys |
| **Gasless Transactions** | Gas fees sponsored by Pimlico paymaster |
| **Account Setup** | One-call orchestration of the full setup flow |
| **Backend Support** | Export session keys for server-side transaction execution |

## Sections

- [Getting Started](getting-started.md) -- Installation, setup guide, and chat completions example
