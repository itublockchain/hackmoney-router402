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
