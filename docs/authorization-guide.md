# Authorization Endpoint - Frontend Implementation Guide

Bu doküman, `/authorize` endpoint'ini kullanarak session key kaydı yapmak için frontend implementasyonunu açıklar.

## EIP-712 Typed Data Signature

Authorization endpoint'i EIP-712 standardını kullanır. Client tarafında wallet ile imzalama yapılmalıdır.

### Domain

```typescript
const domain = {
  name: "Router402 Authorization",
  version: "1",
  chainId: 84532, // Base Sepolia örneği
};
```

### Types

```typescript
const types = {
  Authorization: [
    { name: "smartAccountAddress", type: "address" },
    { name: "privateKey", type: "string" },
    { name: "chainId", type: "uint256" },
    { name: "nonce", type: "uint256" },
  ],
};
```

### Message

```typescript
const message = {
  smartAccountAddress: "0x...", // Smart Account adresi
  privateKey: "0x...",          // Session key private key
  chainId: 84532n,              // BigInt olarak chain ID
  nonce: 0n,                    // BigInt olarak nonce (replay protection)
};
```

## Viem ile İmzalama

```typescript
import { createWalletClient, custom } from "viem";
import { baseSepolia } from "viem/chains";

const walletClient = createWalletClient({
  chain: baseSepolia,
  transport: custom(window.ethereum),
});

const [account] = await walletClient.getAddresses();

// EIP-712 typed data signature
const signature = await walletClient.signTypedData({
  account,
  domain: {
    name: "Router402 Authorization",
    version: "1",
    chainId: 84532,
  },
  types: {
    Authorization: [
      { name: "smartAccountAddress", type: "address" },
      { name: "privateKey", type: "string" },
      { name: "chainId", type: "uint256" },
      { name: "nonce", type: "uint256" },
    ],
  },
  primaryType: "Authorization",
  message: {
    smartAccountAddress: "0x1234567890123456789012345678901234567890",
    privateKey: "0xabc123...",
    chainId: 84532n,
    nonce: 0n,
  },
});
```

## Wagmi ile İmzalama

```typescript
import { useSignTypedData } from "wagmi";

const { signTypedDataAsync } = useSignTypedData();

const signature = await signTypedDataAsync({
  domain: {
    name: "Router402 Authorization",
    version: "1",
    chainId: 84532,
  },
  types: {
    Authorization: [
      { name: "smartAccountAddress", type: "address" },
      { name: "privateKey", type: "string" },
      { name: "chainId", type: "uint256" },
      { name: "nonce", type: "uint256" },
    ],
  },
  primaryType: "Authorization",
  message: {
    smartAccountAddress: "0x1234567890123456789012345678901234567890",
    privateKey: "0xabc123...",
    chainId: 84532n,
    nonce: 0n,
  },
});
```

## API Request

```typescript
const response = await fetch("/authorize", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-authorization-signature": signature,
  },
  body: JSON.stringify({
    smartAccountAddress: "0x1234567890123456789012345678901234567890",
    privateKey: "0xabc123...",
    serializedSessionKey: "serialized-session-key-data",
    chainId: 84532,
    nonce: 0,
  }),
});

const result = await response.json();
// { data: { token: "jwt-token", sessionKeyId: "..." }, error: null, meta: {...} }
```

## Tam Örnek

```typescript
import { createWalletClient, custom } from "viem";
import { baseSepolia } from "viem/chains";

async function authorizeSessionKey(
  smartAccountAddress: string,
  privateKey: string,
  serializedSessionKey: string,
  chainId: number
) {
  const walletClient = createWalletClient({
    chain: baseSepolia,
    transport: custom(window.ethereum),
  });

  const [account] = await walletClient.getAddresses();
  const nonce = Date.now(); // Basit nonce stratejisi

  // 1. EIP-712 imzası oluştur
  const signature = await walletClient.signTypedData({
    account,
    domain: {
      name: "Router402 Authorization",
      version: "1",
      chainId,
    },
    types: {
      Authorization: [
        { name: "smartAccountAddress", type: "address" },
        { name: "privateKey", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "nonce", type: "uint256" },
      ],
    },
    primaryType: "Authorization",
    message: {
      smartAccountAddress: smartAccountAddress as `0x${string}`,
      privateKey,
      chainId: BigInt(chainId),
      nonce: BigInt(nonce),
    },
  });

  // 2. API'ye gönder
  const response = await fetch("http://localhost:8080/authorize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-authorization-signature": signature,
    },
    body: JSON.stringify({
      smartAccountAddress,
      privateKey,
      serializedSessionKey,
      chainId,
      nonce,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  const result = await response.json();
  return result.data; // { token, sessionKeyId }
}

// Kullanım
const { token, sessionKeyId } = await authorizeSessionKey(
  "0x1234567890123456789012345678901234567890",
  "0xprivatekey...",
  "serialized-session-key",
  84532
);

// Token'ı localStorage'a kaydet
localStorage.setItem("auth_token", token);
```

## Response

### Başarılı (201 Created)

```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "sessionKeyId": "clxyz123..."
  },
  "error": null,
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "path": "/"
  }
}
```

### Hata Durumları

| Status | Açıklama |
|--------|----------|
| 400 | Missing signature header veya validation error |
| 401 | Invalid signature |
| 500 | Internal server error |

## Notlar

- `nonce` replay attack'leri önlemek için kullanılır. Her request için unique olmalı (timestamp kullanılabilir).
- Token 1 yıl geçerlidir.
- Aynı wallet için tekrar authorize çağrılırsa mevcut kayıt güncellenir.
