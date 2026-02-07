/**
 * MCP Server Configuration
 *
 * Define remote MCP servers that the gateway will connect to.
 * Tools from these servers are automatically discovered and
 * made available to LLMs during chat completions.
 *
 * Use `allowedTools` to whitelist specific tools — this keeps
 * token usage low by not sending dozens of tool schemas to the LLM.
 *
 * @module config/mcp-servers
 */

import type { McpServerConfig } from "../services/mcp-manager.js";

export const mcpServers: McpServerConfig[] = [
  {
    name: "lifi",
    url: "https://mcp-cloudflare.omerfurkanyuruk1.workers.dev/mcp",
    allowedTools: [
      "get-quote",
      "get-chains",
      "get-tokens",
      "get-token",
      "get-status",
    ],
    systemMessage:
      "The user asked you to use LI.FI. To perform the requested action, first resolve the chain names they provided by calling get-chains. Then resolve the token details by calling get-tokens or get-token. Only after that, request a quote using the resolved values. The quote must be returned as a transaction request inside a fenced code block. The fenced block identifier must be tx (```tx). Ensure the `to`, `value`, and `data` fields are included and complete. The transaction is sponsored by Router402, so the user does not need to hold any native gas token.",
  },
];
