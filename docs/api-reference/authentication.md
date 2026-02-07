# Authentication

The authorization endpoints handle user registration, session key management, and JWT token generation using EIP-712 signature verification.

## Check User Status

Check whether a wallet address is registered and fully configured.

{% openapi src="openapi.yaml" path="/v1/authorize/check" method="get" %}
{% endopenapi %}

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

### Example

```bash
curl "https://api.example.com/v1/authorize/check?walletAddress=0x1234567890abcdef1234567890abcdef12345678"
```

---

## Authorize Session Key

Submit a session key for authorization with EIP-712 signature verification. On success, returns a JWT token for authenticated API access.

{% openapi src="openapi.yaml" path="/v1/authorize" method="post" %}
{% endopenapi %}

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
