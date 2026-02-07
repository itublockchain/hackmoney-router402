# Models

The models endpoint returns the list of AI models available for chat completions. No authentication is required.

## List Models

**`GET /v1/models`**

### Example Request

```bash
curl "https://api.router402.xyz/v1/models"
```

### Response (200 OK)

```json
{
  "data": [
    "anthropic/claude-opus-4.6",
    "anthropic/claude-opus-4.5",
    "anthropic/claude-sonnet-4.5",
    "anthropic/claude-haiku-4.5",
    "google/gemini-3-pro-preview",
    "google/gemini-3-flash-preview"
  ]
}
```

## Model Naming

Model identifiers follow the `provider/model-name` format. Use these identifiers in the `model` field of [chat completion requests](chat-completions.md).

## Pricing

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| `anthropic/claude-opus-4.6` | $5.00 | $25.00 |
| `anthropic/claude-opus-4.5` | $5.00 | $25.00 |
| `anthropic/claude-sonnet-4.5` | $3.00 | $15.00 |
| `anthropic/claude-haiku-4.5` | $1.00 | $5.00 |
| `google/gemini-3-pro-preview` | $4.00 | $18.00 |
| `google/gemini-3-flash-preview` | $0.50 | $3.00 |

A 10% commission is applied on top of the base token costs.
