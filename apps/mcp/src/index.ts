import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { z } from "zod";
import * as blockchain from "./handlers/blockchain.js";
import * as lifi from "./handlers/lifi.js";

const VERSION = "1.0.0";

function textContent(text: string): {
  content: [{ type: "text"; text: string }];
} {
  return { content: [{ type: "text", text }] };
}

export class LiFiMCP extends McpAgent {
  server = new McpServer({
    name: "lifi-mcp",
    version: VERSION,
  });

  async init() {
    // --- LiFi API tools ---
    this.server.tool(
      "get-tokens",
      {
        chains: z.string().optional(),
        chainTypes: z.string().optional(),
        minPriceUSD: z.string().optional(),
      },
      async (args) => textContent(await lifi.getTokens(args)),
    );

    this.server.tool(
      "get-token",
      { chain: z.string(), token: z.string() },
      async (args) => textContent(await lifi.getToken(args)),
    );

    this.server.tool(
      "get-quote",
      {
        fromChain: z.string(),
        toChain: z.string(),
        fromToken: z.string(),
        toToken: z.string(),
        fromAddress: z.string(),
        fromAmount: z.string(),
        toAddress: z.string().optional(),
        slippage: z.string().optional(),
        integrator: z.string().optional(),
        order: z.string().optional(),
        allowBridges: z.array(z.string()).optional(),
        allowExchanges: z.array(z.string()).optional(),
      },
      async (args) => textContent(await lifi.getQuote(args)),
    );

    this.server.tool(
      "get-status",
      {
        txHash: z.string(),
        bridge: z.string().optional(),
        fromChain: z.string().optional(),
        toChain: z.string().optional(),
      },
      async (args) => textContent(await lifi.getStatus(args)),
    );

    this.server.tool(
      "get-chains",
      { chainTypes: z.string().optional() },
      async (args) => textContent(await lifi.getChains(args)),
    );

    this.server.tool(
      "get-connections",
      {
        fromChain: z.string().optional(),
        toChain: z.string().optional(),
        fromToken: z.string().optional(),
        toToken: z.string().optional(),
        chainTypes: z.string().optional(),
        allowBridges: z.array(z.string()).optional(),
      },
      async (args) => textContent(await lifi.getConnections(args)),
    );

    this.server.tool(
      "get-tools",
      { chains: z.array(z.string()).optional() },
      async (args) => textContent(await lifi.getTools(args)),
    );

    this.server.tool("get-chain-by-id", { id: z.string() }, async (args) =>
      textContent(await lifi.getChainByIdHandler(args)),
    );

    this.server.tool("get-chain-by-name", { name: z.string() }, async (args) =>
      textContent(await lifi.getChainByNameHandler(args)),
    );

    // --- Blockchain read tools ---
    this.server.tool(
      "get-native-token-balance",
      { rpcUrl: z.string(), address: z.string() },
      async (args) => textContent(await blockchain.getNativeTokenBalance(args)),
    );

    this.server.tool(
      "get-token-balance",
      {
        rpcUrl: z.string(),
        tokenAddress: z.string(),
        walletAddress: z.string(),
      },
      async (args) => textContent(await blockchain.getTokenBalance(args)),
    );

    this.server.tool(
      "get-allowance",
      {
        rpcUrl: z.string(),
        tokenAddress: z.string(),
        ownerAddress: z.string(),
        spenderAddress: z.string(),
      },
      async (args) => textContent(await blockchain.getAllowance(args)),
    );

    this.server.tool(
      "simulate-transaction",
      {
        rpcUrl: z.string(),
        from: z.string(),
        to: z.string(),
        data: z.string().optional(),
        value: z.string().optional(),
      },
      async (args) =>
        textContent(await blockchain.simulateTransactionTool(args)),
    );

    this.server.tool(
      "get-approve-transaction",
      {
        tokenAddress: z.string(),
        spenderAddress: z.string(),
        amount: z.string(),
      },
      async (args) => textContent(await blockchain.getApproveTransaction(args)),
    );
  }
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/mcp") {
      return LiFiMCP.serve("/mcp").fetch(request, env, ctx);
    }
    return new Response("Not found", { status: 404 });
  },
};
