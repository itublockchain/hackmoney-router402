import type { Address } from "viem";
import { base, baseSepolia } from "wagmi/chains";
import { getConfig } from "./get-config";

/**
 * Chain configuration based on NEXT_PUBLIC_CHAIN_ENV
 * - mainnet → Base (8453)
 * - testnet → Base Sepolia (84532)
 */
const config = getConfig();

export const SUPPORTED_CHAIN =
  config.NEXT_PUBLIC_CHAIN_ENV === "mainnet" ? base : baseSepolia;

export const CHAIN_ID = SUPPORTED_CHAIN.id;

/**
 * Application configuration
 * Uses environment-based config for dynamic values
 */
export const APP_CONFIG = {
  name: "Router 402",
  description: "Decentralized payment routing on Base",
  url: config.NEXT_PUBLIC_APP_URL,
  apiUrl: config.NEXT_PUBLIC_API_URL,
} as const;

/**
 * USDC contract addresses per chain
 */
const USDC_ADDRESSES: Record<number, Address> = {
  8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base Mainnet
  84532: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Base Sepolia
};

/**
 * USDC address for the current chain environment
 */
export const USDC_ADDRESS: Address =
  USDC_ADDRESSES[config.NEXT_PUBLIC_CHAIN_ENV === "mainnet" ? 8453 : 84532] ??
  USDC_ADDRESSES[8453];
