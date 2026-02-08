import { KERNEL_V3_1 } from "@zerodev/sdk/constants";
import type {
  ResolvedConfig,
  Router402Config,
  SmartAccountResolvedConfig,
} from "./types.js";
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
 * Default Router402 API base URL
 */
export const DEFAULT_API_BASE_URL = "https://api.router402.xyz";

/**
 * Resolve configuration with defaults.
 * Only `chain` and `pimlicoApiKey` are needed for smart account operations.
 * For chat-only usage, neither is required.
 */
export function resolveConfig(config: Router402Config): ResolvedConfig {
  const chain = config.chain;
  const chainId = chain?.id;
  const pimlicoUrl =
    config.pimlicoApiKey && chainId
      ? `https://api.pimlico.io/v2/${chainId}/rpc?apikey=${config.pimlicoApiKey}`
      : undefined;

  // Build WalletConnect RPC URL if project ID is available
  const walletConnectRpcUrl =
    config.walletConnectProjectId && chainId
      ? `https://rpc.walletconnect.com/v1/?chainId=eip155:${chainId}&projectId=${config.walletConnectProjectId}`
      : undefined;

  // Use explicit rpcUrl, then WalletConnect RPC, then chain's default, then Pimlico as last resort.
  // Pimlico bundler URL returns non-standard revert error formats that break
  // getSenderAddress in @zerodev/sdk, so prefer a standard JSON-RPC endpoint.
  const chainDefaultRpc = chain?.rpcUrls?.default?.http?.[0];
  const rpcUrl =
    config.rpcUrl ?? walletConnectRpcUrl ?? chainDefaultRpc ?? pimlicoUrl;

  return {
    chain,
    chainId,
    pimlicoApiKey: config.pimlicoApiKey,
    pimlicoUrl,
    rpcUrl,
    entryPointVersion: config.entryPointVersion ?? "0.7",
    sessionKeyValidityPeriod:
      config.sessionKeyValidityPeriod ?? DEFAULT_SESSION_KEY_VALIDITY,
    apiBaseUrl: config.apiBaseUrl ?? DEFAULT_API_BASE_URL,
  };
}

/**
 * Validate that configuration has the required fields for smart account operations.
 * Throws if chain or pimlicoApiKey is missing.
 * Returns a narrowed type with those fields guaranteed.
 */
export function validateSmartAccountConfig(
  config: ResolvedConfig
): asserts config is SmartAccountResolvedConfig {
  if (!config.chain) {
    throw new SmartAccountError(
      "NOT_CONFIGURED",
      "Chain is required for smart account operations. Provide `chain` in the configuration."
    );
  }
  if (!config.pimlicoApiKey) {
    throw new SmartAccountError(
      "NOT_CONFIGURED",
      "Pimlico API key is required for smart account operations. Provide `pimlicoApiKey` in the configuration."
    );
  }
}

/**
 * @deprecated Use validateSmartAccountConfig instead. Basic config validation is no longer required.
 */
export function validateConfig(_config: Router402Config): void {
  // No-op: chain and pimlicoApiKey are now optional.
  // Smart account methods validate lazily via validateSmartAccountConfig.
}
