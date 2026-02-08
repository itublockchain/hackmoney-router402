import {
  createRouter402Sdk,
  DEFAULT_SESSION_KEY_VALIDITY,
  type Router402Config,
} from "@router402/sdk";
import { base, baseSepolia } from "wagmi/chains";
import { getConfig } from "./get-config";

const config = getConfig();

/**
 * Get the target chain based on environment configuration
 */
function getTargetChain() {
  return config.NEXT_PUBLIC_CHAIN_ENV === "mainnet" ? base : baseSepolia;
}

const targetChain = getTargetChain();

if (!config.NEXT_PUBLIC_PIMLICO_API_KEY) {
  throw new Error("Pimlico API key is not configured");
}

/**
 * SDK Configuration
 */
const sdkConfig: Router402Config = {
  chain: targetChain,
  pimlicoApiKey: config.NEXT_PUBLIC_PIMLICO_API_KEY,
  walletConnectProjectId: config.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
  rpcUrl: config.NEXT_PUBLIC_RPC_URL,
};

/**
 * Router402 SDK instance - use this for all smart account operations
 */
export const router402Sdk = createRouter402Sdk(sdkConfig);

/**
 * Smart Account Configuration (for backwards compatibility)
 */
export const SMART_ACCOUNT_CONFIG = {
  /** Target chain for smart account operations */
  chain: targetChain,

  /** Chain ID */
  chainId: targetChain.id,

  /** Pimlico API Key */
  pimlicoApiKey: config.NEXT_PUBLIC_PIMLICO_API_KEY,

  /** Whether Pimlico is configured (required for smart account operations) */
  isConfigured: !!config.NEXT_PUBLIC_PIMLICO_API_KEY,
} as const;

/**
 * Session Key Configuration
 */
export const SESSION_KEY_CONFIG = {
  /** Validity period in seconds (1 year) */
  validityPeriod: DEFAULT_SESSION_KEY_VALIDITY,

  /** Storage key for session keys in LocalStorage */
  storageKey: "router402_session_keys",
} as const;

/**
 * Check if Pimlico is configured (required for smart account operations)
 */
export function isPimlicoConfigured(): boolean {
  return !!SMART_ACCOUNT_CONFIG.pimlicoApiKey;
}
