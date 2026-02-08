import { BASE_URL } from "../constants.js";
import {
  getChainById,
  getChainByName,
  getChainsCache,
  refreshChainsCache,
} from "../utils/chains.js";

type QuoteData = {
  transactionRequest: {
    value: string;
    to: string;
    data: string;
    chainId: number;
    gasPrice: string;
    gasLimit: string;
    from: string;
  };
  estimate: {
    approvalAddress?: string;
    gasCosts: string;
    gasCostsUSD: string;
    totalGasCost: string;
    totalGasCostUSD: string;
    slippage: number;
    integratorFee: string;
    integratorFeeUSD: string;
  };
};

/** Maximum number of tokens to return per chain to limit payload size */
const MAX_TOKENS_PER_CHAIN = 50;

/**
 * Get tokens from LiFi API
 * Filters response to essential fields and caps per-chain results to reduce token usage.
 */
export async function getTokens(args: {
  chains?: string;
  chainTypes?: string;
  minPriceUSD?: string;
}): Promise<string> {
  const params = new URLSearchParams();
  if (args.chains) params.append("chains", args.chains);
  if (args.chainTypes) params.append("chainTypes", args.chainTypes);
  if (args.minPriceUSD) params.append("minPriceUSD", args.minPriceUSD);

  const url = params.toString()
    ? `${BASE_URL}/v1/tokens?${params.toString()}`
    : `${BASE_URL}/v1/tokens`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch tokens: ${response.statusText}`);
  }

  const data = (await response.json()) as {
    tokens: Record<
      string,
      Array<{
        address: string;
        symbol: string;
        decimals: number;
        name: string;
        chainId?: number;
      }>
    >;
  };

  const filtered: Record<
    string,
    Array<{
      address: string;
      symbol: string;
      decimals: number;
      name: string;
      chainId?: number;
    }>
  > = {};

  for (const [chainId, tokens] of Object.entries(data.tokens)) {
    filtered[chainId] = tokens.slice(0, MAX_TOKENS_PER_CHAIN).map((t) => ({
      address: t.address,
      symbol: t.symbol,
      decimals: t.decimals,
      name: t.name,
      chainId: t.chainId,
    }));
  }

  return JSON.stringify({ tokens: filtered });
}

/**
 * Get specific token info from LiFi API
 */
export async function getToken(args: {
  chain: string;
  token: string;
}): Promise<string> {
  if (!args.chain || !args.token) {
    throw new Error("Both chain and token parameters are required");
  }

  const params = new URLSearchParams();
  params.append("chain", args.chain);
  params.append("token", args.token);

  const response = await fetch(`${BASE_URL}/v1/token?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch token: ${response.statusText}`);
  }
  return await response.text();
}

/**
 * Get quote for token swap/transfer
 * Returns an EIP-712 signable object
 */
export async function getQuote(args: {
  fromChain: string;
  toChain: string;
  fromToken: string;
  toToken: string;
  fromAddress: string;
  fromAmount: string;
  toAddress?: string;
  slippage?: string;
  integrator?: string;
  order?: string;
  allowBridges?: string[];
  allowExchanges?: string[];
}): Promise<string> {
  if (
    !args.fromChain ||
    !args.toChain ||
    !args.fromToken ||
    !args.toToken ||
    !args.fromAddress ||
    !args.fromAmount
  ) {
    throw new Error(
      "Required parameters: fromChain, toChain, fromToken, toToken, fromAddress, fromAmount",
    );
  }

  const params = new URLSearchParams();
  params.append("fromChain", args.fromChain);
  params.append("toChain", args.toChain);
  params.append("fromToken", args.fromToken);
  params.append("toToken", args.toToken);
  params.append("fromAddress", args.fromAddress);
  params.append("fromAmount", args.fromAmount);

  if (args.toAddress) params.append("toAddress", args.toAddress);
  if (args.slippage) params.append("slippage", args.slippage);
  if (args.integrator) params.append("integrator", args.integrator);
  if (args.order) params.append("order", args.order);
  if (args.allowBridges?.length) {
    params.append("allowBridges", args.allowBridges.join(","));
  }
  if (args.allowExchanges?.length) {
    params.append("allowExchanges", args.allowExchanges.join(","));
  }

  const response = await fetch(`${BASE_URL}/v1/quote?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch quote: ${response.statusText}`);
  }

  const quoteData: QuoteData = await response.json();
  const txReq = quoteData.transactionRequest;

  const result: Record<string, string> = {
    value: txReq.value,
    to: txReq.to,
    data: txReq.data,
  };

  if (quoteData.estimate.approvalAddress) {
    result.approvalAddress = quoteData.estimate.approvalAddress;
  }

  return `\`\`\`tx\n${JSON.stringify(result, null, 2)}\n\`\`\``;
}

/**
 * Get status of a transaction
 */
export async function getStatus(args: {
  txHash: string;
  bridge?: string;
  fromChain?: string;
  toChain?: string;
}): Promise<string> {
  if (!args.txHash) {
    throw new Error("txHash parameter is required");
  }

  const params = new URLSearchParams();
  params.append("txHash", args.txHash);
  if (args.bridge) params.append("bridge", args.bridge);
  if (args.fromChain) params.append("fromChain", args.fromChain);
  if (args.toChain) params.append("toChain", args.toChain);

  const response = await fetch(`${BASE_URL}/v1/status?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch status: ${response.statusText}`);
  }
  return await response.text();
}

/**
 * Slim a chain object to only the fields the LLM needs for resolution.
 */
function slimChain(chain: {
  id: number;
  key: string;
  name: string;
  nativeToken?: { symbol: string; decimals: number };
}) {
  return {
    id: chain.id,
    key: chain.key,
    name: chain.name,
    nativeToken: chain.nativeToken
      ? {
          symbol: chain.nativeToken.symbol,
          decimals: chain.nativeToken.decimals,
        }
      : undefined,
  };
}

/**
 * Get supported chains
 * Returns slim chain objects (id, key, name, nativeToken basics) to reduce token usage.
 */
export async function getChains(args: {
  chainTypes?: string;
}): Promise<string> {
  const cache = await getChainsCache();

  if (!args.chainTypes) {
    return JSON.stringify({
      chains: cache.chains.map(slimChain),
    });
  }

  const chainTypesSlice = args.chainTypes
    .split(",")
    .map((ct) => ct.trim().toLowerCase());
  const filteredChains = cache.chains.filter((chain) => {
    return chainTypesSlice.some((ct) => chain.key.toLowerCase().includes(ct));
  });

  if (filteredChains.length === 0) {
    // Make a direct API call if no matches
    const params = new URLSearchParams();
    params.append("chainTypes", args.chainTypes);

    const response = await fetch(`${BASE_URL}/v1/chains?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch chains: ${response.statusText}`);
    }
    const data = (await response.json()) as {
      chains: Array<{
        id: number;
        key: string;
        name: string;
        nativeToken?: { symbol: string; decimals: number };
      }>;
    };
    return JSON.stringify({ chains: data.chains.map(slimChain) });
  }

  return JSON.stringify({ chains: filteredChains.map(slimChain) });
}

/**
 * Get connections between chains
 * Filters response to essential token fields to reduce token usage.
 */
export async function getConnections(args: {
  fromChain?: string;
  toChain?: string;
  fromToken?: string;
  toToken?: string;
  chainTypes?: string;
  allowBridges?: string[];
}): Promise<string> {
  const params = new URLSearchParams();
  if (args.fromChain) params.append("fromChain", args.fromChain);
  if (args.toChain) params.append("toChain", args.toChain);
  if (args.fromToken) params.append("fromToken", args.fromToken);
  if (args.toToken) params.append("toToken", args.toToken);
  if (args.chainTypes) params.append("chainTypes", args.chainTypes);
  if (args.allowBridges?.length) {
    params.append("allowBridges", JSON.stringify(args.allowBridges));
  }

  const response = await fetch(
    `${BASE_URL}/v1/connections?${params.toString()}`,
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch connections: ${response.statusText}`);
  }

  const data = (await response.json()) as {
    connections: Array<{
      fromChainId: number;
      toChainId: number;
      fromTokens: Array<{
        address: string;
        symbol: string;
        decimals: number;
        name: string;
      }>;
      toTokens: Array<{
        address: string;
        symbol: string;
        decimals: number;
        name: string;
      }>;
    }>;
  };

  const filtered = {
    connections: data.connections.map((conn) => ({
      fromChainId: conn.fromChainId,
      toChainId: conn.toChainId,
      fromTokens: conn.fromTokens.map((t) => ({
        address: t.address,
        symbol: t.symbol,
        decimals: t.decimals,
        name: t.name,
      })),
      toTokens: conn.toTokens.map((t) => ({
        address: t.address,
        symbol: t.symbol,
        decimals: t.decimals,
        name: t.name,
      })),
    })),
  };

  return JSON.stringify(filtered);
}

/**
 * Get available bridges and exchanges
 */
export async function getTools(args: { chains?: string[] }): Promise<string> {
  const params = new URLSearchParams();
  if (args.chains?.length) {
    params.append("chains", JSON.stringify(args.chains));
  }

  const response = await fetch(`${BASE_URL}/v1/tools?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch tools: ${response.statusText}`);
  }

  const data = (await response.json()) as {
    bridges?: Array<{ key?: string; name?: string }>;
    exchanges?: Array<{ key?: string; name?: string }>;
  };

  // Filter response to only include key and name for bridges and exchanges
  const filteredResponse: {
    bridges?: Array<{ key?: string; name?: string }>;
    exchanges?: Array<{ key?: string; name?: string }>;
  } = {};

  if (data.bridges) {
    filteredResponse.bridges = data.bridges.map((bridge) => ({
      key: bridge.key,
      name: bridge.name,
    }));
  }

  if (data.exchanges) {
    filteredResponse.exchanges = data.exchanges.map((exchange) => ({
      key: exchange.key,
      name: exchange.name,
    }));
  }

  return JSON.stringify(filteredResponse);
}

/**
 * Get chain by ID
 */
export async function getChainByIdHandler(args: {
  id: string;
}): Promise<string> {
  if (!args.id) {
    throw new Error("ID parameter is required");
  }

  const id = Number.parseInt(args.id, 10);
  if (Number.isNaN(id)) {
    throw new Error(`Invalid ID format. Expected integer, got: ${args.id}`);
  }

  const chain = await getChainById(id);
  if (!chain) {
    // Try refreshing cache
    await refreshChainsCache();
    const refreshedChain = await getChainById(id);
    if (!refreshedChain) {
      throw new Error(`No chain found with ID: ${id}`);
    }
    return JSON.stringify(refreshedChain);
  }

  return JSON.stringify(chain);
}

/**
 * Get chain by name
 */
export async function getChainByNameHandler(args: {
  name: string;
}): Promise<string> {
  if (!args.name) {
    throw new Error("name parameter is required");
  }

  const chain = await getChainByName(args.name);
  if (!chain) {
    // Try refreshing cache
    await refreshChainsCache();
    const refreshedChain = await getChainByName(args.name);
    if (!refreshedChain) {
      throw new Error(`No chain found matching name: ${args.name}`);
    }
    return JSON.stringify(refreshedChain);
  }

  return JSON.stringify(chain);
}
