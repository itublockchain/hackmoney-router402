import { BASE_URL } from "../constants.js";
import type { Chain, ChainData } from "../types.js";

// Cache for chain data
let chainsCache: ChainData | null = null;
let chainsCacheInitialized = false;

/**
 * Refresh the chains cache from the LiFi API
 */
export async function refreshChainsCache(): Promise<void> {
  const response = await fetch(`${BASE_URL}/v1/chains?chainTypes=SVM,EVM`);
  if (!response.ok) {
    throw new Error(`Failed to fetch chains: ${response.statusText}`);
  }

  const data = (await response.json()) as ChainData;
  chainsCache = data;
  chainsCacheInitialized = true;
}

/**
 * Get the chains cache, initializing if needed
 */
export async function getChainsCache(): Promise<ChainData> {
  if (!chainsCacheInitialized || !chainsCache) {
    await refreshChainsCache();
  }
  // After refreshChainsCache(), chainsCache is guaranteed to be non-null
  return chainsCache as ChainData;
}

/**
 * Get chain by ID from cache
 */
export async function getChainById(id: number): Promise<Chain | null> {
  const cache = await getChainsCache();
  return cache.chains.find((chain) => chain.id === id) || null;
}

/**
 * Get chain by name from cache
 */
export async function getChainByName(name: string): Promise<Chain | null> {
  const cache = await getChainsCache();
  const nameLower = name.toLowerCase();
  return (
    cache.chains.find(
      (chain) =>
        chain.name.toLowerCase() === nameLower ||
        chain.key.toLowerCase() === nameLower ||
        String(chain.id) === nameLower,
    ) || null
  );
}

/**
 * Get native token info for a chain ID
 */
export async function getNativeTokenInfo(
  chainId: bigint,
): Promise<{ symbol: string; decimals: number }> {
  const cache = await getChainsCache();
  const chainIdNum = Number(chainId);

  const chain = cache.chains.find((c) => c.id === chainIdNum);
  if (chain) {
    if (chain.nativeToken?.symbol) {
      return {
        symbol: chain.nativeToken.symbol,
        decimals: chain.nativeToken.decimals,
      };
    }
    if (chain.nativeCurrency?.symbol) {
      return {
        symbol: chain.nativeCurrency.symbol,
        decimals: chain.nativeCurrency.decimals,
      };
    }
    if (chain.metamask?.chainName) {
      const symbolParts = chain.metamask.chainName.split(" ");
      if (symbolParts.length > 0) {
        return { symbol: symbolParts[0], decimals: 18 };
      }
    }
  }

  // Try refreshing cache and looking again
  await refreshChainsCache();
  const refreshedCache = await getChainsCache();
  const refreshedChain = refreshedCache.chains.find((c) => c.id === chainIdNum);

  if (refreshedChain) {
    if (refreshedChain.nativeToken?.symbol) {
      return {
        symbol: refreshedChain.nativeToken.symbol,
        decimals: refreshedChain.nativeToken.decimals,
      };
    }
    if (refreshedChain.nativeCurrency?.symbol) {
      return {
        symbol: refreshedChain.nativeCurrency.symbol,
        decimals: refreshedChain.nativeCurrency.decimals,
      };
    }
  }

  return { symbol: "Native Token", decimals: 18 };
}
