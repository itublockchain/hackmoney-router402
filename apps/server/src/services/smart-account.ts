import {
  type CallData,
  createRouter402Sdk,
  type Router402Config,
  type SessionKeyForBackend,
  type TransactionExecutionResult,
} from "@router402/sdk";
import { baseSepolia } from "viem/chains";
import { getConfig } from "../config/index.js";

const config = getConfig();

/**
 * Get the target chain based on environment
 * Currently hardcoded to Base Sepolia for testnet
 */
function getTargetChain() {
  // TODO: Add CHAIN_ENV to config when mainnet support is needed
  return baseSepolia;
}

/**
 * Create the Router402 SDK instance
 */
function createSdk() {
  if (!config.PIMLICO_API_KEY) {
    throw new Error("PIMLICO_API_KEY is not set");
  }

  const sdkConfig: Router402Config = {
    chain: getTargetChain(),
    pimlicoApiKey: config.PIMLICO_API_KEY,
  };

  return createRouter402Sdk(sdkConfig);
}

/**
 * Send a transaction using a session key
 *
 * This is the main entry point for the server to send transactions
 * on behalf of a user using their session key.
 */
export async function sendSessionKeyTransaction(
  sessionKeyData: SessionKeyForBackend,
  calls: CallData[]
): Promise<TransactionExecutionResult> {
  const sdk = createSdk();
  return sdk.sendSessionKeyTransactionFromBackend(sessionKeyData, calls);
}

/**
 * Check if a smart account is deployed
 */
export async function isSmartAccountDeployed(
  address: `0x${string}`
): Promise<boolean> {
  const sdk = createSdk();
  return sdk.isSmartAccountDeployed(address);
}

/**
 * Get the balance of a smart account
 */
export async function getSmartAccountBalance(
  address: `0x${string}`
): Promise<bigint> {
  const sdk = createSdk();
  return sdk.getSmartAccountBalance(address);
}
