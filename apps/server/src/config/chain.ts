import "dotenv/config";
import type { Chain } from "viem";
import { base, baseSepolia } from "viem/chains";

/**
 * Chain configuration based on NODE_ENV
 * - production → Base Mainnet (8453)
 * - development/test → Base Sepolia (84532)
 */

export interface ChainConfig {
  chain: Chain;
  chainId: number;
  /** EIP-155 network identifier for x402 (e.g. "eip155:8453") */
  network: string;
}

export function getChainConfig(): ChainConfig {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
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
