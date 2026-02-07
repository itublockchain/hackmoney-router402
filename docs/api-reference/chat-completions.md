# Chat Completions

The chat completions endpoint provides OpenAI-compatible LLM inference. It supports both streaming (Server-Sent Events) and non-streaming (JSON) responses.

This endpoint is protected -- you must authenticate with a JWT token or provide x402 payment proof.

## Endpoint

**`POST /v1/chat/completions`**

## Authentication

| Method | Header | Description |
|--------|--------|-------------|
| API Token | `Authorization: Bearer <token>` | Use the token from [/v1/authorize](authentication.md#authorize-session-key) |

## Request Body

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `messages` | `Message[]` | Yes | -- | Array of conversation messages (min 1) |
| `model` | `string` | No | -- | Model identifier (e.g., `anthropic/claude-sonnet-4.5`) |
| `stream` | `boolean` | No | `false` | Enable Server-Sent Events streaming |
| `temperature` | `number` | No | -- | Sampling temperature (0-2) |
| `max_tokens` | `number` | No | -- | Maximum tokens to generate |
| `top_p` | `number` | No | -- | Nucleus sampling threshold (0-1) |
| `top_k` | `number` | No | -- | Top-K sampling |
| `frequency_penalty` | `number` | No | -- | Frequency penalty (-2 to 2) |
| `presence_penalty` | `number` | No | -- | Presence penalty (-2 to 2) |
| `stop` | `string \| string[]` | No | -- | Stop sequence(s) |
| `response_format` | `object` | No | -- | `{ type: "text" }` or `{ type: "json_object" }` |
| `tools` | `Tool[]` | No | -- | Function definitions for tool calling |
| `tool_choice` | `ToolChoice` | No | -- | Tool selection strategy |

### Message Format

```typescript
{
  role: "system" | "user" | "assistant" | "tool",
  content: string | ContentPart[] | null,
  name?: string,            // For tool messages
  tool_call_id?: string,    // Required for tool role
  tool_calls?: ToolCall[]   // Present in assistant messages
}
```

**Content Parts** (for multimodal messages):

```typescript
// Text content
{ type: "text", text: "Hello, world!" }

// Image content
{ type: "image_url", image_url: { url: "https://...", detail?: "auto" | "low" | "high" } }
```

### Tool Definition

```typescript
{
  type: "function",
  function: {
    name: "get_weather",
    description: "Get the current weather for a location",
    parameters: {
      type: "object",
      properties: {
        location: { type: "string", description: "City name" }
      },
      required: ["location"]
    }
  }
}
```

### Tool Choice

| Value | Description |
|-------|-------------|
| `"none"` | Do not call any tools |
| `"auto"` | Let the model decide |
| `"required"` | The model must call a tool |
| `{ type: "function", function: { name: "..." } }` | Force a specific tool |

---

## Non-Streaming Response

When `stream` is `false` or omitted, the endpoint returns a single JSON response.

### Example Request

```bash
curl -X POST "https://api.router402.xyz/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt-token>" \
  -d '{
    "model": "anthropic/claude-sonnet-4.5",
    "messages": [
      { "role": "system", "content": "You are a helpful assistant." },
      { "role": "user", "content": "What is ERC-4337?" }
    ],
    "temperature": 0.7,
    "max_tokens": 1024
  }'
```

### Example Response

```json
{
  "id": "gen-abc123",
  "object": "chat.completion",
  "created": 1738234200,
  "model": "anthropic/claude-sonnet-4.5",
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

---

## Streaming Response

When `stream` is `true`, the endpoint returns Server-Sent Events (SSE).

### Example Request

```bash
curl -X POST "https://api.router402.xyz/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt-token>" \
  -d '{
    "model": "anthropic/claude-sonnet-4.5",
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

Each chunk is sent as `data: {json}\n\n`:

```
data: {"id":"gen-abc123","object":"chat.completion.chunk","created":1738234200,"model":"anthropic/claude-sonnet-4.5","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}

data: {"id":"gen-abc123","object":"chat.completion.chunk","created":1738234200,"model":"anthropic/claude-sonnet-4.5","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}

data: {"id":"gen-abc123","object":"chat.completion.chunk","created":1738234200,"model":"anthropic/claude-sonnet-4.5","choices":[{"index":0,"delta":{"content":"!"},"finish_reason":null}]}

data: {"id":"gen-abc123","object":"chat.completion.chunk","created":1738234200,"model":"anthropic/claude-sonnet-4.5","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":10,"completion_tokens":2,"total_tokens":12}}

data: [DONE]
```

### Chunk Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique ID, same across all chunks |
| `object` | `string` | Always `"chat.completion.chunk"` |
| `created` | `number` | Unix timestamp |
| `model` | `string` | Model identifier |
| `choices[].delta.role` | `string` | `"assistant"` (first chunk only) |
| `choices[].delta.content` | `string` | Incremental text content |
| `choices[].finish_reason` | `string?` | Set in final content chunk (`"stop"`, `"length"`, `"tool_calls"`) |
| `usage` | `object` | Token usage (final chunk only) |

The stream terminates with `data: [DONE]\n\n`.

---

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

Includes headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`.

### Payment Required (402)

When no JWT token or x402 payment is provided, the server returns HTTP `402` with payment requirements specifying accepted schemes, networks, and amounts.

### Streaming Errors

If an error occurs after streaming has started, it is sent as an SSE event:

```
data: {"error":{"message":"Provider error","type":"server_error"}}

data: [DONE]
```

---

## Usage Tracking

Token usage is automatically tracked for authenticated users. After each completion, the server records:

- Prompt tokens and completion tokens
- Cost breakdown (base cost + 10% commission)
- Wallet address association

This data is used for debt accumulation and billing through the smart account payment system.
