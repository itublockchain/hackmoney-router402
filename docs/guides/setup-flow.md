# Full Setup Flow

This guide walks through the complete user onboarding flow, from wallet connection to making the first authenticated API call.

## Overview

The setup flow consists of these phases:

```
1. Connect Wallet  ──▶  2. Deploy Account  ──▶  3. Create Session Key
                                                         │
4. Authorize with Server  ◀──  Enable on-chain  ◀───────┘
         │
5. Make API Calls (with JWT)
```

## Phase 1: Connect Wallet

The user connects their EOA wallet (MetaMask, WalletConnect, etc.) to the application.

```typescript
// Using Wagmi + ConnectKit in React
import { ConnectKitButton } from "connectkit";
import { useAccount, useWalletClient } from "wagmi";

function App() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  return (
    <div>
      <ConnectKitButton />
      {isConnected && <p>Connected: {address}</p>}
    </div>
  );
}
```

## Phase 2: Initialize SDK and Deploy Smart Account

Create the SDK instance and check if the smart account needs deployment.

```typescript
import { Router402Sdk } from "@router402/sdk";
import { baseSepolia } from "viem/chains";

const sdk = new Router402Sdk({
  chain: baseSepolia,
  pimlicoApiKey: process.env.NEXT_PUBLIC_PIMLICO_API_KEY!,
});

async function initializeAccount(walletClient, eoaAddress) {
  // Step 1: Get smart account info
  const info = await sdk.getSmartAccountInfo(walletClient, eoaAddress);
  console.log("Smart Account:", info.address);
  console.log("Deployed:", info.isDeployed);

  // Step 2: Deploy if needed (gasless -- paymaster covers gas)
  if (!info.isDeployed) {
    const deployResult = await sdk.deploySmartAccount(walletClient);
    if (!deployResult.success) {
      throw new Error("Deployment failed: " + deployResult.error);
    }
    console.log("Deployed! TX:", deployResult.txHash);
  }

  return info;
}
```

## Phase 3: Create and Approve Session Key

Generate a session key and have the owner approve it. The approval triggers a wallet signature request.

```typescript
async function createSessionKey(walletClient, smartAccountAddress, eoaAddress) {
  // Step 1: Generate a random keypair
  const sessionKey = sdk.generateSessionKey(smartAccountAddress, eoaAddress);
  console.log("Generated key:", sessionKey.publicKey);
  console.log("Expires:", new Date(sessionKey.expiresAt));

  // Step 2: Owner approves (wallet will prompt for signature)
  const approvedKey = await sdk.approveSessionKey(walletClient, sessionKey);
  console.log("Approved:", approvedKey.isApproved);

  // Step 3: Enable on-chain (first session key transaction)
  const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia
  const enableResult = await sdk.enableSessionKeyOnChain(
    approvedKey,
    USDC_ADDRESS,
    smartAccountAddress
  );
  console.log("Enabled on-chain:", enableResult.success);

  return approvedKey;
}
```

## Phase 4: Authorize with Server

Send the session key data to the Route402 server to receive a JWT token.

```typescript
import { signTypedData } from "viem/actions";

async function authorizeWithServer(walletClient, sessionKey, smartAccountAddress, eoaAddress, chainId) {
  // Step 1: Prepare authorization data
  const backendData = sdk.exportSessionKeyForBackend(sessionKey);
  if (!backendData) {
    throw new Error("Session key not approved");
  }

  const nonce = 0; // First authorization

  const requestBody = {
    smartAccountAddress,
    privateKey: backendData.privateKey,
    serializedSessionKey: backendData.serializedSessionKey,
    eoaAddress,
    chainId,
    nonce,
  };

  // Step 2: Sign EIP-712 authorization message
  const signature = await signTypedData(walletClient, {
    domain: {
      name: "Route402",
      chainId: BigInt(chainId),
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
      smartAccountAddress,
      privateKey: backendData.privateKey,
      serializedSessionKey: backendData.serializedSessionKey,
      eoaAddress,
      chainId: BigInt(chainId),
      nonce: BigInt(nonce),
    },
  });

  // Step 3: Send to server
  const response = await fetch("https://api.example.com/v1/authorize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-authorization-signature": signature,
    },
    body: JSON.stringify(requestBody),
  });

  const result = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  return result.data; // { token, sessionKeyId }
}
```

## Phase 5: Make Authenticated API Calls

Use the JWT token for authenticated chat completions.

```typescript
async function chat(token, message) {
  const response = await fetch("https://api.example.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      model: "anthropic/claude-3.5-sonnet",
      messages: [
        { role: "user", content: message },
      ],
    }),
  });

  const result = await response.json();
  return result.choices[0].message.content;
}

// Usage
const answer = await chat(token, "What is account abstraction?");
console.log(answer);
```

### Streaming

```typescript
async function streamChat(token, message, onChunk) {
  const response = await fetch("https://api.example.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      model: "anthropic/claude-3.5-sonnet",
      messages: [
        { role: "user", content: message },
      ],
      stream: true,
    }),
  });

  const reader = response.body.getReader();
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
          onChunk(content);
        }
      }
    }
  }
}

// Usage
await streamChat(token, "Tell me about ERC-4337", (chunk) => {
  process.stdout.write(chunk);
});
```

## Using setupAccount (Simplified)

The SDK provides `setupAccount()` to handle phases 2-3 in a single call:

```typescript
const result = await sdk.setupAccount(walletClient, eoaAddress, {
  usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  onStatus: (status) => {
    switch (status) {
      case "initializing":
        console.log("Getting account info...");
        break;
      case "deploying":
        console.log("Deploying smart account...");
        break;
      case "creating_session_key":
        console.log("Generating session key...");
        break;
      case "approving_session_key":
        console.log("Please sign in your wallet...");
        break;
      case "enabling_session_key":
        console.log("Enabling session key on-chain...");
        break;
      case "complete":
        console.log("Setup complete!");
        break;
    }
  },
});

// result.info.address       -- Smart account address
// result.sessionKey          -- Approved and enabled session key
// result.enableResult        -- Transaction result from enablement
```

Then proceed to Phase 4 (authorize with server) and Phase 5 (API calls).

## Complete Example

Putting it all together:

```typescript
import { Router402Sdk } from "@router402/sdk";
import { baseSepolia } from "viem/chains";

const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

const sdk = new Router402Sdk({
  chain: baseSepolia,
  pimlicoApiKey: process.env.NEXT_PUBLIC_PIMLICO_API_KEY!,
});

async function onboard(walletClient, eoaAddress) {
  // 1. Setup account (deploy + session key)
  const setup = await sdk.setupAccount(walletClient, eoaAddress, {
    usdcAddress: USDC_BASE_SEPOLIA,
    onStatus: (s) => console.log("Status:", s),
  });

  // 2. Authorize with server
  const auth = await authorizeWithServer(
    walletClient,
    setup.sessionKey,
    setup.info.address,
    eoaAddress,
    sdk.getChainId()
  );

  // 3. Ready to use!
  const answer = await chat(auth.token, "Hello, Route402!");
  console.log("Response:", answer);
}
```

## Error Handling

Each phase can fail for different reasons. Handle errors appropriately:

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

## Checking Existing Status

Before running the full setup, check if the user is already configured:

```typescript
const statusResponse = await fetch(
  `https://api.example.com/v1/authorize/check?walletAddress=${eoaAddress}`
);
const status = await statusResponse.json();

if (status.data.ready) {
  console.log("User is already set up!");
  // Skip to making API calls
} else {
  console.log("Needs setup:", {
    exists: status.data.exists,
    hasSessionKey: status.data.hasSessionKey,
  });
  // Run the setup flow
}
```
