# SDK

The `@router402/sdk` package provides a TypeScript SDK for accessing AI models through Router402's payment-gated API. It handles smart account creation, session key management, and chat completions in a simple interface.

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

// For chat completions, just pass your JWT token
const sdk = new Router402Sdk({
  token: "your-jwt-token",
});

// Send a chat completion request
const response = await sdk.chat("What is ERC-4337?");
console.log(response);

// Use a different model
const answer = await sdk.chat("Explain account abstraction", {
  model: "anthropic/claude-haiku-4.5",
});
```

For smart account operations (deploy, session keys, gasless transactions), also provide `chain` and `pimlicoApiKey`:

```typescript
import { Router402Sdk } from "@router402/sdk";
import { baseSepolia } from "viem/chains";

const sdk = new Router402Sdk({
  chain: baseSepolia,
  pimlicoApiKey: "your-pimlico-api-key",
  token: "your-jwt-token", // optional here, can also use setToken() later
});
```

## Features

| Feature | Description |
|---------|-------------|
| **Chat Completions** | Send chat requests with `sdk.chat(prompt)` -- one line to AI |
| **Smart Accounts** | Create and manage Kernel v3.1 smart contract wallets |
| **Session Keys** | Generate, approve, and manage delegated signing keys |
| **Gasless Transactions** | Gas fees sponsored by Pimlico paymaster |
| **Account Setup** | One-call orchestration of the full setup flow |
| **Backend Support** | Export session keys for server-side transaction execution |

## Sections

- [Getting Started](getting-started.md) -- Installation, setup guide, and chat completions example
