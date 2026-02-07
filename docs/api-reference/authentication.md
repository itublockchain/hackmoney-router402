# Authentication

The authorization endpoints handle user registration, session key management, and JWT token generation using EIP-712 signature verification.

## Check User Status

Check whether a wallet address is registered and fully configured.

```
GET /v1/authorize/check
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `walletAddress` | `string` | Yes | Ethereum wallet address (`0x`-prefixed, 40 hex characters) |

### Response

```json
{
  "data": {
    "exists": true,
    "hasSessionKey": true,
    "fieldsComplete": true,
    "ready": true,
    "user": {
      "walletAddress": "0x1234...abcd",
      "hasPaymentThreshold": true,
      "currentDebt": "0.0025",
      "totalSpent": "1.5000"
    },
    "sessionKey": {
      "chainId": 84532,
      "smartAccountAddress": "0xabcd...1234",
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  },
  "error": null,
  "meta": {
    "timestamp": "2025-01-15T10:30:00.000Z",
    "path": "/check"
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `exists` | `boolean` | Whether the user exists in the database |
| `hasSessionKey` | `boolean` | Whether a session key is registered |
| `fieldsComplete` | `boolean` | Whether all required fields are set |
| `ready` | `boolean` | Whether the user is fully configured and can use the API |
| `user` | `object \| undefined` | User details (only present if user exists) |
| `user.hasPaymentThreshold` | `boolean` | Whether the user has a configured payment threshold |
| `user.currentDebt` | `string` | Current accumulated debt as a decimal string |
| `user.totalSpent` | `string` | Total amount spent as a decimal string |
| `sessionKey` | `object \| undefined` | Session key details (only present if registered) |
| `sessionKey.chainId` | `number` | Blockchain network ID |
| `sessionKey.smartAccountAddress` | `string` | Associated smart account address |
| `sessionKey.createdAt` | `string` | ISO 8601 timestamp of creation |

### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| `400` | `"Invalid wallet address format"` | The `walletAddress` query parameter is missing or malformed |
| `500` | `"Internal server error"` | Unexpected server failure |

### Example

```bash
curl "https://api.example.com/v1/authorize/check?walletAddress=0x1234567890abcdef1234567890abcdef12345678"
```

---

## Authorize Session Key

Submit a session key for authorization with EIP-712 signature verification. On success, returns a JWT token for authenticated API access.

```
POST /v1/authorize
```

### Headers

| Header | Type | Required | Description |
|--------|------|----------|-------------|
| `x-authorization-signature` | `string` | Yes | EIP-712 typed data signature of the authorization message |
| `Content-Type` | `string` | Yes | Must be `application/json` |

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `smartAccountAddress` | `string` | Yes | Smart account address (`0x`-prefixed, 40 hex chars) |
| `privateKey` | `string` | Yes | Session key private key |
| `serializedSessionKey` | `string` | Yes | Serialized permission account data |
| `eoaAddress` | `string` | Yes | Owner EOA address (`0x`-prefixed, 40 hex chars) |
| `chainId` | `number` | Yes | Blockchain network ID (positive integer) |
| `nonce` | `number` | Yes | Unique nonce for replay protection (non-negative integer) |

### Request Example

```json
{
  "smartAccountAddress": "0xabcdef1234567890abcdef1234567890abcdef12",
  "privateKey": "0x...",
  "serializedSessionKey": "...",
  "eoaAddress": "0x1234567890abcdef1234567890abcdef12345678",
  "chainId": 84532,
  "nonce": 0
}
```

### Response (201 Created)

```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "sessionKeyId": "clx1234567890"
  },
  "error": null,
  "meta": {
    "timestamp": "2025-01-15T10:30:00.000Z",
    "path": "/"
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `token` | `string` | JWT token for authenticated API access |
| `sessionKeyId` | `string` | Unique identifier for the registered session key |

### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| `400` | `"Missing x-authorization-signature header"` | The signature header is not provided |
| `400` | `"Validation failed"` | Request body does not match the schema |
| `401` | `"Invalid signature"` | EIP-712 signature verification failed |
| `500` | `"Internal server error"` | Unexpected server failure |

### EIP-712 Signature Details

The authorization message is signed using EIP-712 typed data. The domain and message structure must match what the server expects:

**Domain:**
- `name`: Route402 domain name
- `chainId`: The blockchain network ID

**Message fields:**
- `smartAccountAddress` -- The smart account address
- `privateKey` -- The session key private key
- `serializedSessionKey` -- The serialized permission data
- `eoaAddress` -- The owner EOA address
- `chainId` -- The blockchain network ID
- `nonce` -- Replay protection nonce

The signature must be produced by the EOA that owns the smart account. The server recovers the signer address from the signature and verifies it matches the expected wallet.

### Example

```bash
curl -X POST "https://api.example.com/v1/authorize" \
  -H "Content-Type: application/json" \
  -H "x-authorization-signature: 0x..." \
  -d '{
    "smartAccountAddress": "0xabcdef...",
    "privateKey": "0x...",
    "serializedSessionKey": "...",
    "eoaAddress": "0x123456...",
    "chainId": 84532,
    "nonce": 0
  }'
```
