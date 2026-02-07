import { KERNEL_V3_1 } from "@zerodev/sdk/constants";
import type { ResolvedConfig, Router402Config } from "./types.js";
import { SmartAccountError } from "./types.js";

/**
 * ERC-4337 Entry Point v0.7
 * Standard entry point contract for account abstraction
 */
export const ENTRY_POINT_ADDRESS =
  "0x0000000071727De22E5E9d8BAf0edAc6f37da032" as const;

/**
 * Default session key validity period: 1 year in seconds
 */
export const DEFAULT_SESSION_KEY_VALIDITY = 365 * 24 * 60 * 60;

/**
 * Kernel version - using KERNEL_V3_1
 */
export const KERNEL_VERSION = KERNEL_V3_1;

/**
 * Resolve configuration with defaults
 */
export function resolveConfig(config: Router402Config): ResolvedConfig {
  if (!config.pimlicoApiKey) {
    throw new SmartAccountError(
      "NOT_CONFIGURED",
      "Pimlico API key is required. Provide pimlicoApiKey in the configuration."
    );
  }

  const chainId = config.chain.id;
  const pimlicoUrl = `https://api.pimlico.io/v2/${chainId}/rpc?apikey=${config.pimlicoApiKey}`;

  return {
    chain: config.chain,
    chainId,
    pimlicoApiKey: config.pimlicoApiKey,
    pimlicoUrl,
    entryPointVersion: config.entryPointVersion ?? "0.7",
    sessionKeyValidityPeriod:
      config.sessionKeyValidityPeriod ?? DEFAULT_SESSION_KEY_VALIDITY,
  };
}

/**
 * Validate that configuration is complete
 */
export function validateConfig(config: Router402Config): void {
  if (!config.chain) {
    throw new SmartAccountError("NOT_CONFIGURED", "Chain is required.");
  }
  if (!config.pimlicoApiKey) {
    throw new SmartAccountError(
      "NOT_CONFIGURED",
      "Pimlico API key is required."
    );
  }
}
