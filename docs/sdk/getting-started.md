# Getting Started

This guide covers everything you need to go from installation to making your first chat completion request with Router402.

## Prerequisites

- **Node.js 18+** or **Bun 1.0+**
- A **Pimlico API key** ([pimlico.io](https://www.pimlico.io/))
- A wallet library like **Wagmi** or **Viem**

## Installation

```bash
npm install @router402/sdk viem
```

Or with Bun:

```bash
bun add @router402/sdk viem
```

## Configuration

Create an SDK instance:

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
| `sessionKeyValidityPeriod` | `number` | No | `31536000` | Session key validity in seconds (1 year) |

## Setup Flow

The complete setup flow from wallet connection to making API calls:

```mermaid
flowchart TD
    A["1. Connect Wallet"] --> B["2. Initialize SDK"]
    B --> C["3. Deploy Smart Account"]
    C --> D["4. Create & Approve Session Key"]
    D --> E["5. Enable Session Key On-Chain"]
    E --> F["6. Authorize with Server"]
    F --> G["7. Make Chat Completion Requests"]

    style A fill:#f9f,stroke:#333
    style G fill:#9f9,stroke:#333
```

### Step 1: Create a Wallet Client

```typescript
// With Wagmi (React)
import { useWalletClient } from "wagmi";
const { data: walletClient } = useWalletClient();

// With Viem directly
import { createWalletClient, custom } from "viem";
import { baseSepolia } from "viem/chains";

const walletClient = createWalletClient({
  chain: baseSepolia,
  transport: custom(window.ethereum),
});
```

### Step 2: Setup Account (Deploy + Session Key)

The `setupAccount()` method handles deployment, session key generation, approval, and on-chain enablement in a single call:

```typescript
const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

const setup = await sdk.setupAccount(walletClient, eoaAddress, {
  usdcAddress: USDC_BASE_SEPOLIA,
  onStatus: (status) => {
    // "initializing" → "deploying" → "creating_session_key"
    // → "approving_session_key" → "enabling_session_key" → "complete"
    console.log("Setup status:", status);
  },
});

console.log("Smart Account:", setup.info.address);
console.log("Session Key:", setup.sessionKey.publicKey);
```

### Step 3: Authorize with Server

Sign an EIP-712 message and send the session key data to the Router402 server to receive a JWT token:

```typescript
import { signTypedData } from "viem/actions";

// Export session key for the server
const backendData = sdk.exportSessionKeyForBackend(setup.sessionKey);
const nonce = 0;

const requestBody = {
  smartAccountAddress: setup.info.address,
  privateKey: backendData.privateKey,
  serializedSessionKey: backendData.serializedSessionKey,
  eoaAddress,
  chainId: sdk.getChainId(),
  nonce,
};

// Sign the EIP-712 authorization message
const signature = await signTypedData(walletClient, {
  domain: {
    name: "Router402 Authorization",
    version: "1",
    chainId: BigInt(sdk.getChainId()),
  },
  types: {
    Authorization: [
      { name: "smartAccountAddress", type: "address" },
      { name: "privateKey", type: "string" },
      { name: "serializedSessionKey", type: "string" },
      { name: "eoaAddress", type: "address" },
      { name: "chainId", type: "uint256" },
      { name: "nonce", type: "uint256" },
    ],
  },
  primaryType: "Authorization",
  message: {
    ...requestBody,
    chainId: BigInt(sdk.getChainId()),
    nonce: BigInt(nonce),
  },
});

// Send to the server
const response = await fetch("https://api.router402.xyz/v1/authorize", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-authorization-signature": signature,
  },
  body: JSON.stringify(requestBody),
});

const { data } = await response.json();
const jwtToken = data.token;
```

### Step 4: Make Chat Completion Requests

Use the JWT token for authenticated chat completions:

```typescript
// Non-streaming
async function chat(token: string, message: string) {
  const response = await fetch("https://api.router402.xyz/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      model: "anthropic/claude-sonnet-4.5",
      messages: [
        { role: "user", content: message },
      ],
    }),
  });

  const result = await response.json();
  return result.choices[0].message.content;
}

const answer = await chat(jwtToken, "What is account abstraction?");
console.log(answer);
```

### Streaming Example

```typescript
async function streamChat(token: string, message: string) {
  const response = await fetch("https://api.router402.xyz/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      model: "anthropic/claude-sonnet-4.5",
      messages: [
        { role: "user", content: message },
      ],
      stream: true,
    }),
  });

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value);
    const lines = text.split("\n");

    for (const line of lines) {
      if (line.startsWith("data: ") && line !== "data: [DONE]") {
        const chunk = JSON.parse(line.slice(6));
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          process.stdout.write(content);
        }
      }
    }
  }
}

await streamChat(jwtToken, "Tell me about ERC-4337");
```

## Complete Example

Putting it all together:

```typescript
import { Router402Sdk } from "@router402/sdk";
import { baseSepolia } from "viem/chains";
import { signTypedData } from "viem/actions";

const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

const sdk = new Router402Sdk({
  chain: baseSepolia,
  pimlicoApiKey: process.env.PIMLICO_API_KEY!,
});

async function onboard(walletClient, eoaAddress: string) {
  // 1. Setup account (deploy + session key)
  const setup = await sdk.setupAccount(walletClient, eoaAddress, {
    usdcAddress: USDC_BASE_SEPOLIA,
    onStatus: (s) => console.log("Status:", s),
  });

  // 2. Authorize with server (get JWT)
  const backendData = sdk.exportSessionKeyForBackend(setup.sessionKey);
  const signature = await signTypedData(walletClient, {
    domain: {
      name: "Router402 Authorization",
      version: "1",
      chainId: BigInt(sdk.getChainId()),
    },
    types: {
      Authorization: [
        { name: "smartAccountAddress", type: "address" },
        { name: "privateKey", type: "string" },
        { name: "serializedSessionKey", type: "string" },
        { name: "eoaAddress", type: "address" },
        { name: "chainId", type: "uint256" },
        { name: "nonce", type: "uint256" },
      ],
    },
    primaryType: "Authorization",
    message: {
      smartAccountAddress: setup.info.address,
      privateKey: backendData.privateKey,
      serializedSessionKey: backendData.serializedSessionKey,
      eoaAddress,
      chainId: BigInt(sdk.getChainId()),
      nonce: 0n,
    },
  });

  const authResponse = await fetch("https://api.router402.xyz/v1/authorize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-authorization-signature": signature,
    },
    body: JSON.stringify({
      smartAccountAddress: setup.info.address,
      privateKey: backendData.privateKey,
      serializedSessionKey: backendData.serializedSessionKey,
      eoaAddress,
      chainId: sdk.getChainId(),
      nonce: 0,
    }),
  });

  const { data } = await authResponse.json();

  // 3. Make a chat completion request
  const chatResponse = await fetch("https://api.router402.xyz/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${data.token}`,
    },
    body: JSON.stringify({
      model: "anthropic/claude-sonnet-4.5",
      messages: [{ role: "user", content: "Hello, Router402!" }],
    }),
  });

  const result = await chatResponse.json();
  console.log("Response:", result.choices[0].message.content);
}
```

## Error Handling

The SDK throws `SmartAccountError` for domain-specific errors:

```typescript
import { SmartAccountError } from "@router402/sdk";

try {
  await sdk.setupAccount(walletClient, eoaAddress, { usdcAddress });
} catch (error) {
  if (error instanceof SmartAccountError) {
    switch (error.type) {
      case "USER_REJECTED":
        console.log("User cancelled the wallet signature");
        break;
      case "DEPLOYMENT_FAILED":
        console.log("Smart account deployment failed");
        break;
      case "NETWORK_ERROR":
        console.log("Network issue -- check RPC connection");
        break;
      default:
        console.error("Setup error:", error.message);
    }
  }
}
```

### Error Types

| Type | Description |
|------|-------------|
| `NOT_CONFIGURED` | SDK not properly configured |
| `DEPLOYMENT_FAILED` | Smart account deployment failed |
| `INSUFFICIENT_FUNDS` | Not enough funds for operation |
| `USER_REJECTED` | User rejected the wallet prompt |
| `NETWORK_ERROR` | Blockchain network error |
| `SESSION_KEY_NOT_APPROVED` | Session key has not been approved |
| `INVALID_SESSION_KEY` | Session key data is invalid |
| `SESSION_KEY_EXPIRED` | Session key has passed its expiration |
