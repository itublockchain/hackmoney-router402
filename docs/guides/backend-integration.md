# Backend Integration

This guide explains how to integrate Route402 into your server-side application. You'll learn how to receive session key data from clients, execute transactions on their behalf, and manage the payment lifecycle.

## Overview

The backend integration pattern:

```
┌────────────┐    Session Key    ┌───────────────┐    UserOps    ┌──────────────┐
│   Client    │──────────────────▶│  Your Backend  │──────────────▶│  Blockchain  │
│  (Browser)  │    + JWT Token    │  (Node.js)     │   via SDK     │  (ERC-4337)  │
└────────────┘                   └───────────────┘               └──────────────┘
```

1. The client completes the setup flow and authorizes with your server.
2. Your server receives the session key data and JWT token.
3. Your backend uses the SDK to execute transactions using the session key.

## Server-Side SDK Setup

Install and configure the SDK on your server:

```typescript
import { Router402Sdk } from "@router402/sdk";
import { baseSepolia } from "viem/chains";

const sdk = new Router402Sdk({
  chain: baseSepolia,
  pimlicoApiKey: process.env.PIMLICO_API_KEY!,
});
```

## Receiving Session Key Data

When a client authorizes via `POST /v1/authorize`, the server receives session key data in the `SessionKeyForBackend` format:

```typescript
interface SessionKeyForBackend {
  privateKey: Hex;
  serializedSessionKey: string;
  smartAccountAddress: Address;
  chainId: number;
}
```

Store this data securely in your database, associated with the user:

```typescript
// Example: storing session key data after authorization
async function handleAuthorization(sessionKeyData: SessionKeyForBackend, userId: string) {
  // Store in database (encrypt the private key at rest)
  await db.sessionKeys.create({
    data: {
      userId,
      privateKey: encrypt(sessionKeyData.privateKey),
      serializedSessionKey: sessionKeyData.serializedSessionKey,
      smartAccountAddress: sessionKeyData.smartAccountAddress,
      chainId: sessionKeyData.chainId,
    },
  });
}
```

## Executing Transactions

Use `sendSessionKeyTransactionFromBackend` to execute transactions on behalf of users:

```typescript
import { encodeFunctionData, erc20Abi } from "viem";

async function processPayment(userId: string, recipient: string, amount: bigint) {
  // 1. Retrieve session key data from database
  const sessionKeyRecord = await db.sessionKeys.findUnique({
    where: { userId },
  });

  if (!sessionKeyRecord) {
    throw new Error("No session key found for user");
  }

  const sessionKeyData = {
    privateKey: decrypt(sessionKeyRecord.privateKey),
    serializedSessionKey: sessionKeyRecord.serializedSessionKey,
    smartAccountAddress: sessionKeyRecord.smartAccountAddress,
    chainId: sessionKeyRecord.chainId,
  };

  // 2. Encode the transaction
  const transferData = encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [recipient, amount],
  });

  // 3. Execute via SDK
  const result = await sdk.sendSessionKeyTransactionFromBackend(
    sessionKeyData,
    [
      {
        to: USDC_CONTRACT_ADDRESS,
        value: 0n,
        data: transferData,
      },
    ]
  );

  if (!result.success) {
    throw new Error(`Transaction failed: ${result.error}`);
  }

  return result.txHash;
}
```

## Checking Smart Account Status

Query the blockchain for smart account information:

```typescript
// Check if a smart account is deployed
const isDeployed = await sdk.isSmartAccountDeployed(smartAccountAddress);

// Get balance
const balance = await sdk.getSmartAccountBalance(smartAccountAddress);
console.log(`Balance: ${balance} wei`);
```

## Batched Transactions

Execute multiple operations in a single transaction:

```typescript
async function batchedOperations(sessionKeyData, operations) {
  const calls = operations.map((op) => ({
    to: op.contractAddress,
    value: 0n,
    data: encodeFunctionData({
      abi: op.abi,
      functionName: op.functionName,
      args: op.args,
    }),
  }));

  return sdk.sendSessionKeyTransactionFromBackend(sessionKeyData, calls);
}
```

## Usage Tracking Integration

The Route402 server automatically tracks token usage for chat completions. The tracking flow:

```
Chat Request ──▶ LLM Response ──▶ Calculate Cost ──▶ Record to DB
                                        │
                                   Model pricing
                                   (prompt + completion tokens)
```

Access user debt and usage data through the check endpoint:

```typescript
async function getUserDebt(walletAddress: string) {
  const response = await fetch(
    `${API_URL}/v1/authorize/check?walletAddress=${walletAddress}`
  );
  const result = await response.json();

  if (result.data?.user) {
    return {
      currentDebt: result.data.user.currentDebt,
      totalSpent: result.data.user.totalSpent,
    };
  }

  return null;
}
```

## Error Handling

Handle common error scenarios:

```typescript
import { SmartAccountError } from "@router402/sdk";

async function safeTransaction(sessionKeyData, calls) {
  try {
    return await sdk.sendSessionKeyTransactionFromBackend(
      sessionKeyData,
      calls
    );
  } catch (error) {
    if (error instanceof SmartAccountError) {
      switch (error.type) {
        case "SESSION_KEY_EXPIRED":
          // Notify user to re-authorize with a new session key
          console.error("Session key expired, user needs to re-authorize");
          break;
        case "SESSION_KEY_NOT_APPROVED":
          // Session key data is invalid or corrupted
          console.error("Invalid session key data");
          break;
        case "NETWORK_ERROR":
          // Blockchain network issue -- retry
          console.error("Network error, retrying...");
          break;
        case "INSUFFICIENT_FUNDS":
          // Smart account does not have enough balance
          console.error("Insufficient funds in smart account");
          break;
        default:
          console.error("Transaction error:", error.message);
      }
    }
    throw error;
  }
}
```

## Security Considerations

### Private Key Storage

Session key private keys grant transaction authority over the user's smart account. Store them securely:

- Encrypt private keys at rest in your database.
- Use environment variables or a secrets manager (AWS Secrets Manager, HashiCorp Vault) for encryption keys.
- Never log session key private keys.
- Implement access controls on database records containing key material.

### Session Key Expiration

Session keys have a configurable expiration (default: 1 year). Monitor expiration and prompt users to re-authorize before their key expires:

```typescript
function isSessionKeyExpiring(expiresAt: number, warningDays = 30): boolean {
  const warningMs = warningDays * 24 * 60 * 60 * 1000;
  return Date.now() + warningMs >= expiresAt;
}
```

### Allowed Callers

When creating session keys, use the `allowedCallers` parameter to restrict which addresses can submit transactions. Set this to your backend's wallet address:

```typescript
// On the client during setup
const approvedKey = await sdk.approveSessionKey(walletClient, sessionKey, [
  "0xYourBackendWalletAddress...",
]);
```

This prevents anyone who obtains the session key data from using it -- only your backend can submit transactions.

## Environment Variables

Required environment variables for your backend:

| Variable | Description |
|----------|-------------|
| `PIMLICO_API_KEY` | Pimlico API key for bundler/paymaster |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for JWT token signing |

## Example: Express.js Integration

A minimal Express.js server that uses the Route402 SDK:

```typescript
import express from "express";
import { Router402Sdk } from "@router402/sdk";
import { baseSepolia } from "viem/chains";
import { encodeFunctionData, erc20Abi } from "viem";

const app = express();
app.use(express.json());

const sdk = new Router402Sdk({
  chain: baseSepolia,
  pimlicoApiKey: process.env.PIMLICO_API_KEY!,
});

// Process a payment on behalf of a user
app.post("/api/pay", async (req, res) => {
  const { userId, recipient, amount } = req.body;

  // 1. Get session key from database
  const sessionKeyData = await getSessionKeyForUser(userId);

  // 2. Execute transfer
  const result = await sdk.sendSessionKeyTransactionFromBackend(
    sessionKeyData,
    [
      {
        to: USDC_ADDRESS,
        value: 0n,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: "transfer",
          args: [recipient, BigInt(amount)],
        }),
      },
    ]
  );

  res.json({
    success: result.success,
    txHash: result.txHash,
  });
});

app.listen(3000);
```
