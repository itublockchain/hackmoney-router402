# Health & Models

These endpoints provide server status and available model information. Neither requires authentication.

## Health Check

Returns the current server status, uptime, and version.

```
GET /health
```

### Response

```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "uptime": 3600,
  "version": "0.1.0"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `status` | `string` | Server status: `"ok"`, `"degraded"`, or `"error"` |
| `timestamp` | `string` | Current server time (ISO 8601) |
| `uptime` | `number` | Seconds since server started |
| `version` | `string` | Server version |

### Example

```bash
curl "https://api.example.com/health"
```

---

## List Models

Returns the list of supported AI models available for chat completions.

```
GET /v1/models
```

### Response

```json
{
  "data": [
    "anthropic/claude-3.5-sonnet",
    "openai/gpt-4o",
    "google/gemini-pro",
    "meta-llama/llama-3-70b-instruct"
  ]
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data` | `string[]` | Array of supported model identifiers |

Model identifiers follow the `provider/model-name` format and can be used in the `model` field of [chat completion requests](chat-completions.md).

### Example

```bash
curl "https://api.example.com/v1/models"
```
