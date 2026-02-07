/**
 * MCP Manager Service
 *
 * Manages connections to remote MCP servers, discovers their tools,
 * and executes tool calls on behalf of the LLM gateway.
 * Converts MCP tools to OpenRouter format so they can be injected
 * into LLM requests seamlessly.
 *
 * @module services/mcp-manager
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { logger } from "@router402/utils";
import type { Tool } from "../types/chat.js";

const mcpLogger = logger.context("McpManager");

// ============================================================================
// Types
// ============================================================================

export interface McpServerConfig {
  /** Unique name for this MCP server */
  name: string;
  /** Remote server URL (Streamable HTTP endpoint) */
  url: string;
  /** Optional headers for authentication */
  headers?: Record<string, string>;
  /**
   * Whitelist of tool names to expose from this server.
   * If omitted, all tools are exposed.
   * Use original MCP tool names (without the mcp_ prefix).
   */
  allowedTools?: string[];
  /**
   * Optional system message to inject when this server's tools are
   * included in a chat request. Useful for giving the LLM context
   * about how to use the tools (e.g. DeFi assistant persona for Li.Fi).
   */
  systemMessage?: string;
}

interface ConnectedServer {
  config: McpServerConfig;
  client: Client;
  tools: Tool[];
}

// ============================================================================
// MCP Manager
// ============================================================================

export class McpManager {
  private servers: Map<string, ConnectedServer> = new Map();

  /**
   * Connect to a remote MCP server and discover its tools.
   */
  async connect(config: McpServerConfig): Promise<void> {
    const client = new Client({
      name: "router402-gateway",
      version: "1.0.0",
    });

    try {
      const url = new URL(config.url);

      const transport = new StreamableHTTPClientTransport(url, {
        requestInit: config.headers ? { headers: config.headers } : undefined,
      });

      await client.connect(transport);

      // Discover tools
      const { tools: mcpTools } = await client.listTools();

      // Filter tools if allowedTools is specified
      const allowed = config.allowedTools;
      const filteredTools = allowed
        ? mcpTools.filter((t) => allowed.includes(t.name))
        : mcpTools;

      // Convert MCP tools → OpenRouter Tool format
      const tools: Tool[] = filteredTools.map((t) => ({
        type: "function" as const,
        function: {
          name: `mcp_${config.name}__${t.name}`,
          description: t.description || `MCP tool: ${t.name}`,
          parameters: (t.inputSchema as Record<string, unknown>) ?? {
            type: "object",
            properties: {},
          },
        },
      }));

      this.servers.set(config.name, { config, client, tools });

      mcpLogger.info(`Connected to MCP server '${config.name}'`, {
        url: config.url,
        toolCount: tools.length,
        tools: tools.map((t) => t.function.name),
      });
    } catch (error) {
      mcpLogger.error(`Failed to connect to MCP server '${config.name}'`, {
        url: config.url,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Connect to multiple MCP servers.
   */
  async connectAll(configs: McpServerConfig[]): Promise<void> {
    const results = await Promise.allSettled(
      configs.map((c) => this.connect(c))
    );

    for (let i = 0; i < results.length; i++) {
      if (results[i].status === "rejected") {
        mcpLogger.warn(
          `MCP server '${configs[i].name}' failed to connect, skipping`
        );
      }
    }
  }

  /**
   * Get all discovered MCP tools in OpenRouter format.
   */
  getAllTools(): Tool[] {
    const tools: Tool[] = [];
    for (const server of this.servers.values()) {
      tools.push(...server.tools);
    }
    return tools;
  }

  /**
   * Check if a tool name belongs to an MCP server.
   * MCP tools are prefixed with `mcp_{serverName}__`.
   */
  isMcpTool(toolName: string): boolean {
    return toolName.startsWith("mcp_");
  }

  /**
   * Execute an MCP tool call.
   * Parses the prefixed tool name to find the right server and original tool name.
   *
   * @returns JSON string of the tool result
   */
  async executeTool(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<string> {
    // Parse: mcp_{serverName}__{originalToolName}
    const match = toolName.match(/^mcp_([^_]+(?:_[^_]+)*)__(.+)$/);
    if (!match) {
      throw new Error(`Invalid MCP tool name format: ${toolName}`);
    }

    // Try to find the server - handle names with underscores
    let serverName: string | undefined;
    let originalToolName: string | undefined;

    // Split on __ and try to match server names
    const parts = toolName.slice(4).split("__"); // remove "mcp_" prefix
    if (parts.length >= 2) {
      const possibleToolName = parts[parts.length - 1];
      const possibleServerName = parts.slice(0, -1).join("__");

      if (this.servers.has(possibleServerName)) {
        serverName = possibleServerName;
        originalToolName = possibleToolName;
      }
    }

    // Fallback to regex match
    if (!serverName && match) {
      serverName = match[1];
      originalToolName = match[2];
    }

    if (!serverName || !originalToolName) {
      throw new Error(`Cannot parse MCP tool name: ${toolName}`);
    }

    const server = this.servers.get(serverName);
    if (!server) {
      throw new Error(`MCP server '${serverName}' not found`);
    }

    mcpLogger.debug(`Executing MCP tool`, {
      server: serverName,
      tool: originalToolName,
      args,
    });

    const result = await server.client.callTool({
      name: originalToolName,
      arguments: args,
    });

    // Extract text content from MCP result
    if (result.content && Array.isArray(result.content)) {
      const textParts = result.content
        .filter((c): c is { type: "text"; text: string } => c.type === "text")
        .map((c) => c.text);
      return textParts.join("\n");
    }

    return JSON.stringify(result);
  }

  /**
   * Disconnect from all MCP servers.
   */
  async disconnectAll(): Promise<void> {
    for (const [name, server] of this.servers) {
      try {
        await server.client.close();
        mcpLogger.info(`Disconnected from MCP server '${name}'`);
      } catch (error) {
        mcpLogger.warn(`Error disconnecting from MCP server '${name}'`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    this.servers.clear();
  }

  /**
   * Check if any MCP servers are connected.
   */
  hasServers(): boolean {
    return this.servers.size > 0;
  }

  /**
   * Collect system messages from all connected MCP servers that have one configured.
   * Returns deduplicated system messages to inject into the conversation.
   */
  getSystemMessages(): string[] {
    const messages: string[] = [];
    for (const server of this.servers.values()) {
      if (server.config.systemMessage) {
        messages.push(server.config.systemMessage);
      }
    }
    return messages;
  }
}

// ============================================================================
// Singleton
// ============================================================================

let mcpManagerInstance: McpManager | null = null;

export function getMcpManager(): McpManager {
  if (!mcpManagerInstance) {
    mcpManagerInstance = new McpManager();
  }
  return mcpManagerInstance;
}

export function initMcpManager(): McpManager {
  mcpManagerInstance = new McpManager();
  return mcpManagerInstance;
}
