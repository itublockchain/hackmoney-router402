import "dotenv/config";
import type { Chain } from "viem";
import { base, baseSepolia } from "viem/chains";

/**
 * Chain configuration based on CHAIN_ENV
 * - mainnet → Base Mainnet (8453)
 * - testnet → Base Sepolia (84532)
 */

export interface ChainConfig {
  chain: Chain;
  chainId: number;
  /** EIP-155 network identifier for x402 (e.g. "eip155:8453") */
  network: string;
}

export function getChainConfig(): ChainConfig {
  const isMainnet = process.env.CHAIN_ENV === "mainnet";

  if (isMainnet) {
    return {
      chain: base,
      chainId: 8453,
      network: "eip155:8453",
    };
  }

  return {
    chain: baseSepolia,
    chainId: 84532,
    network: "eip155:84532",
  };
}
