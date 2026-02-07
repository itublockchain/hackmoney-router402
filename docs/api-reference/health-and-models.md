# Health & Models

These endpoints provide server status and available model information. Neither requires authentication.

## Health Check

Returns the current server status, uptime, and version.

{% openapi src="openapi.yaml" path="/health" method="get" %}
{% endopenapi %}

### Example

```bash
curl "https://api.example.com/health"
```

---

## List Models

Returns the list of supported AI models available for chat completions.

{% openapi src="openapi.yaml" path="/v1/models" method="get" %}
{% endopenapi %}

Model identifiers follow the `provider/model-name` format and can be used in the `model` field of [chat completion requests](chat-completions.md).

### Example

```bash
curl "https://api.example.com/v1/models"
```
