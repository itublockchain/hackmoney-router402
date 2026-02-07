# Chat Completions

The chat completions endpoint provides OpenRouter-compatible LLM inference. It supports both streaming (Server-Sent Events) and non-streaming (JSON) responses.

This endpoint is protected by the x402 payment protocol. Unauthenticated requests receive HTTP `402 Payment Required` with payment requirements. Authorized users with a valid JWT token can bypass the payment step.

{% openapi src="openapi.yaml" path="/v1/chat/completions" method="post" %}
{% endopenapi %}

## Authentication

This endpoint accepts authentication via:

1. **x402 Payment** -- Include payment proof in the request headers according to the x402 protocol.
2. **JWT Token** -- Pass a valid JWT (obtained from the [authorization endpoint](authentication.md)) to bypass payment.

## Message Format

```typescript
{
  role: "system" | "user" | "assistant" | "tool";
  content: string | ContentPart[] | null;
  name?: string;
  tool_call_id?: string;       // Required for tool role
  tool_calls?: ToolCall[];     // Present in assistant messages
}
```

**Content Parts** (for multimodal messages):

```typescript
// Text content
{ type: "text", text: "Hello, world!" }

// Image content
{ type: "image_url", image_url: { url: "https://...", detail?: "auto" | "low" | "high" } }
```

## Tool Definition

```typescript
{
  type: "function",
  function: {
    name: "get_weather",
    description: "Get the current weather",
    parameters: {
      type: "object",
      properties: {
        location: { type: "string" }
      }
    }
  }
}
```

## Tool Choice

| Value | Description |
|-------|-------------|
| `"none"` | Do not call any tools |
| `"auto"` | Let the model decide |
| `"required"` | The model must call a tool |
| `{ type: "function", function: { name: "..." } }` | Force a specific tool |

## Non-Streaming Response

When `stream` is `false` or omitted, the endpoint returns a single JSON response.

### Request Example

```bash
curl -X POST "https://api.example.com/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt-token>" \
  -d '{
    "model": "anthropic/claude-3.5-sonnet",
    "messages": [
      { "role": "system", "content": "You are a helpful assistant." },
      { "role": "user", "content": "What is ERC-4337?" }
    ],
    "temperature": 0.7,
    "max_tokens": 1024
  }'
```

### Response

```json
{
  "id": "gen-abc123",
  "object": "chat.completion",
  "created": 1705312200,
  "model": "anthropic/claude-3.5-sonnet",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "ERC-4337 is an Ethereum standard for account abstraction..."
      },
      "finish_reason": "stop",
      "logprobs": null
    }
  ],
  "usage": {
    "prompt_tokens": 25,
    "completion_tokens": 150,
    "total_tokens": 175
  }
}
```

## Streaming Response

When `stream` is `true`, the endpoint returns a Server-Sent Events (SSE) stream.

### Request Example

```bash
curl -X POST "https://api.example.com/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt-token>" \
  -d '{
    "model": "anthropic/claude-3.5-sonnet",
    "messages": [
      { "role": "user", "content": "Hello!" }
    ],
    "stream": true
  }'
```

### Response Headers

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

### Stream Format

Each chunk is sent as an SSE event in the format `data: {json}\n\n`:

```
data: {"id":"gen-abc123","object":"chat.completion.chunk","created":1705312200,"model":"anthropic/claude-3.5-sonnet","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}

data: {"id":"gen-abc123","object":"chat.completion.chunk","created":1705312200,"model":"anthropic/claude-3.5-sonnet","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}

data: {"id":"gen-abc123","object":"chat.completion.chunk","created":1705312200,"model":"anthropic/claude-3.5-sonnet","choices":[{"index":0,"delta":{"content":"!"},"finish_reason":null}]}

data: {"id":"gen-abc123","object":"chat.completion.chunk","created":1705312200,"model":"anthropic/claude-3.5-sonnet","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":10,"completion_tokens":2,"total_tokens":12}}

data: [DONE]
```

### Chunk Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier (same across all chunks in a response) |
| `object` | `string` | Always `"chat.completion.chunk"` |
| `created` | `number` | Unix timestamp |
| `model` | `string` | Model identifier |
| `choices[].delta.role` | `string` | Present in the first chunk (`"assistant"`) |
| `choices[].delta.content` | `string` | Incremental text content |
| `choices[].finish_reason` | `string \| null` | Set in the final content chunk |
| `usage` | `object` | Token usage (only in the final chunk) |

The stream terminates with `data: [DONE]\n\n`.

## Error Responses

### Validation Error (400)

```json
{
  "error": {
    "message": "messages array must not be empty",
    "type": "invalid_request_error",
    "param": "messages"
  }
}
```

### Rate Limit (429)

```json
{
  "error": {
    "message": "Rate limit exceeded",
    "type": "rate_limit_error",
    "code": "rate_limit_exceeded"
  }
}
```

Rate limit responses include headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, and `Retry-After`.

### Payment Required (402)

When no payment or JWT token is provided, the server returns HTTP 402 with x402 payment requirements specifying the accepted payment schemes, networks, and amounts.

### Streaming Errors

If an error occurs after streaming has started (headers already sent), the error is sent as an SSE event before the stream closes:

```
data: {"error":{"message":"Provider error","type":"server_error"}}

data: [DONE]
```

## Usage Tracking

Token usage is automatically tracked for authenticated users. After each completion, the server records:

- Prompt tokens and completion tokens
- Cost breakdown (base cost + commission)
- Wallet address association

This data is used for debt accumulation and billing through the smart account payment system.
