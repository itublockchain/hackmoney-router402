import { KERNEL_V3_1 } from "@zerodev/sdk/constants";
import { base, baseSepolia } from "wagmi/chains";
import { getConfig } from "@/config/index";

const config = getConfig();

/**
 * Get the target chain based on environment configuration
 * - testnet: Base Sepolia
 * - mainnet: Base Mainnet
 */
function getTargetChain() {
  return config.NEXT_PUBLIC_CHAIN_ENV === "mainnet" ? base : baseSepolia;
}

const targetChain = getTargetChain();

/**
 * ERC-4337 Entry Point v0.7
 * Standard entry point contract for account abstraction
 */
export const ENTRY_POINT_ADDRESS =
  "0x0000000071727De22E5E9d8BAf0edAc6f37da032" as const;

/**
 * Entry Point version used by Kernel account
 */
export const ENTRY_POINT_VERSION = "0.7" as const;

/**
 * Kernel version - using KERNEL_V3_1
 */
export const KERNEL_VERSION = KERNEL_V3_1;

/**
 * Get the Pimlico bundler/paymaster URL for the chain
 */
function getPimlicoUrl(): string | undefined {
  const apiKey = config.NEXT_PUBLIC_PIMLICO_API_KEY;
  if (!apiKey) return undefined;
  return `https://api.pimlico.io/v2/${targetChain.id}/rpc?apikey=${apiKey}`;
}

/**
 * Smart Account Configuration
 * Uses Pimlico for bundler and paymaster services
 */
export const SMART_ACCOUNT_CONFIG = {
  /** Target chain for smart account operations */
  chain: targetChain,

  /** Chain ID */
  chainId: targetChain.id,

  /** Entry point address */
  entryPoint: ENTRY_POINT_ADDRESS,

  /** Entry point version */
  entryPointVersion: ENTRY_POINT_VERSION,

  /** Kernel account version */
  kernelVersion: KERNEL_VERSION,

  /** Pimlico API Key */
  pimlicoApiKey: config.NEXT_PUBLIC_PIMLICO_API_KEY,

  /** Pimlico bundler/paymaster URL */
  pimlicoUrl: getPimlicoUrl(),

  /** Whether Pimlico is configured (required for smart account operations) */
  isConfigured: !!config.NEXT_PUBLIC_PIMLICO_API_KEY,
} as const;

/**
 * Session Key Configuration
 */
export const SESSION_KEY_CONFIG = {
  /** Validity period in seconds (1 year) */
  validityPeriod: 365 * 24 * 60 * 60,

  /** Storage key for session keys in LocalStorage */
  storageKey: "route402_session_keys_v2",

  /** Maximum number of session keys to store per smart account */
  maxKeysPerAccount: 5,
} as const;

/**
 * Check if Pimlico is configured (required for smart account operations)
 */
export function isPimlicoConfigured(): boolean {
  return !!SMART_ACCOUNT_CONFIG.pimlicoApiKey;
}
