# Authorization

The authorization system handles session key registration and JWT token generation using EIP-712 signature verification. Once you have a JWT token, include it as a Bearer token in all subsequent API requests.

## Authorization Flow

```mermaid
sequenceDiagram
    participant User as User Wallet
    participant Client as Client App
    participant Server as Router402 Server

    User->>Client: Sign EIP-712 authorization
    Client->>Server: POST /v1/authorize (body + signature header)
    Server->>Server: Recover signer from EIP-712 signature
    Server->>Server: Verify recovered address matches eoaAddress
    Server-->>Client: JWT token + session key ID

    Client->>Client: Store JWT token locally

    Client->>Server: POST /v1/chat/completions
    Note over Client,Server: Authorization: Bearer <token>
    Server-->>Client: AI response
```

---

## Authorize Session Key

Submit a session key for authorization with EIP-712 signature verification. Returns a JWT token for authenticated API access.

**`POST /v1/authorize`**

### Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `application/json` |
| `x-authorization-signature` | Yes | EIP-712 signature of the authorization message |

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `smartAccountAddress` | `string` | Yes | Smart account address (`0x`-prefixed) |
| `privateKey` | `string` | Yes | Session key private key |
| `serializedSessionKey` | `string` | Yes | Serialized session key permission data |
| `eoaAddress` | `string` | Yes | Owner EOA wallet address (`0x`-prefixed) |
| `chainId` | `number` | Yes | Blockchain network ID (positive integer) |
| `nonce` | `number` | Yes | Replay protection nonce (non-negative integer) |

### EIP-712 Signature Details

The authorization message must be signed using EIP-712 typed data with the following structure:

**Domain:**

```typescript
{
  name: "Router402 Authorization",
  version: "1",
  chainId: <chainId from request>
}
```

**Types:**

```typescript
{
  Authorization: [
    { name: "smartAccountAddress", type: "address" },
    { name: "privateKey", type: "string" },
    { name: "serializedSessionKey", type: "string" },
    { name: "eoaAddress", type: "address" },
    { name: "chainId", type: "uint256" },
    { name: "nonce", type: "uint256" }
  ]
}
```

The signature must be produced by the EOA that owns the smart account. The server recovers the signer address and verifies it matches `eoaAddress`.

### Example Request

```bash
curl -X POST "https://api.router402.xyz/v1/authorize" \
  -H "Content-Type: application/json" \
  -H "x-authorization-signature: 0xabcdef..." \
  -d '{
    "smartAccountAddress": "0xabcdef...",
    "privateKey": "0x...",
    "serializedSessionKey": "...",
    "eoaAddress": "0x123456...",
    "chainId": 8453,
    "nonce": 0
  }'
```

### Response (201 Created)

```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "sessionKeyId": "sk_abc123"
  },
  "error": null,
  "meta": {
    "timestamp": "2026-01-30T10:30:00.000Z",
    "path": "/v1/authorize"
  }
}
```

### Error Responses

| Status | Condition |
|--------|-----------|
| `400` | Missing `x-authorization-signature` header or request body validation failed |
| `401` | Invalid EIP-712 signature (recovered address doesn't match `eoaAddress`) |
| `500` | Internal server error |

---

## Using Your Token

After authorization, store the JWT token and include it in all API requests as a Bearer token in the `Authorization` header.

```typescript
const response = await fetch("https://api.router402.xyz/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    model: "anthropic/claude-sonnet-4.5",
    messages: [{ role: "user", content: "Hello!" }],
  }),
});
```

If your token is invalid or your balance is insufficient, you will receive:

| Status | Meaning |
|--------|---------|
| `401` | Token is invalid or expired -- re-authorize to get a new token |
| `402` | Insufficient balance -- deposit USDC to your smart account |
