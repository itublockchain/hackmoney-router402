# API Reference

The Route402 server exposes a REST API built on Express.js. All endpoints follow a consistent response format and use Zod for request validation.

{% hint style="info" %}
The full API specification is available as an [OpenAPI 3.1 file](openapi.yaml). GitBook renders interactive API documentation from this spec automatically.
{% endhint %}

## Base URL

```
https://your-deployment.example.com
```

## Response Format

All responses follow the `ApiResponse<T>` wrapper format:

```json
{
  "data": { ... },
  "error": null,
  "meta": {
    "timestamp": "2025-01-15T10:30:00.000Z",
    "path": "/v1/models"
  }
}
```

On error, `data` is `null` and `error` contains the error message:

```json
{
  "data": null,
  "error": "Invalid wallet address format",
  "meta": {
    "timestamp": "2025-01-15T10:30:00.000Z",
    "path": "/v1/authorize/check"
  }
}
```

## Route Map

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | None | Server health check |
| `GET` | `/v1/models` | None | List supported AI models |
| `GET` | `/v1/authorize/check` | None | Check user authorization status |
| `POST` | `/v1/authorize` | EIP-712 Signature | Authorize session key |
| `POST` | `/v1/chat/completions` | x402 Payment / JWT | Chat completion (streaming & non-streaming) |

## Authentication Methods

Route402 uses multiple authentication mechanisms depending on the endpoint:

### x402 Payment Protocol
The chat completions endpoint is protected by the x402 payment protocol. Clients must include valid payment proof in their requests. If no payment is provided, the server responds with HTTP `402 Payment Required` along with payment requirements.

### EIP-712 Signature
The authorization endpoint uses EIP-712 typed data signatures to verify wallet ownership. The signature is passed in the `x-authorization-signature` header.

### JWT Token
After successful authorization, clients receive a JWT token that can bypass the x402 payment requirement for subsequent requests.

## Error Codes

| HTTP Status | Meaning |
|-------------|---------|
| `200` | Success |
| `201` | Resource created |
| `400` | Bad request (validation error) |
| `401` | Unauthorized (invalid signature) |
| `402` | Payment required (x402) |
| `404` | Resource not found |
| `429` | Rate limited |
| `500` | Internal server error |

## Rate Limiting

When rate limited, the server returns HTTP `429` with the following headers:

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests allowed |
| `X-RateLimit-Remaining` | Remaining requests in window |
| `X-RateLimit-Reset` | Unix timestamp when limit resets |
| `Retry-After` | Seconds to wait before retrying |
