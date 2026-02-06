import type { Address } from "viem";
import { base } from "wagmi/chains";
import { getConfig } from "./get-config";

/**
 * Base Mainnet Chain Configuration
 * ChainID: 8453
 */
export const SUPPORTED_CHAIN = base;

export const CHAIN_ID = base.id;

/**
 * Application configuration
 * Uses environment-based config for dynamic values
 */
const config = getConfig();

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
