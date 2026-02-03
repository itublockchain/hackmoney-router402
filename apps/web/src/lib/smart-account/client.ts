import type { Address, Hex, WalletClient } from "viem";
import { router402Sdk } from "@/config";
import type { SmartAccountInfo, TransactionResult } from "./types";
import { SmartAccountError } from "./types";

/**
 * Ensure SDK is configured
 */
function assertSdkConfigured() {
  if (!router402Sdk) {
    throw new SmartAccountError(
      "NOT_CONFIGURED",
      "Router402 SDK is not configured. Set NEXT_PUBLIC_PIMLICO_API_KEY."
    );
  }
  return router402Sdk;
}

/**
 * Create a Smart Account instance using Kernel
 */
export async function createSmartAccount(walletClient: WalletClient) {
  const sdk = assertSdkConfigured();
  return sdk.getSmartAccountAddress(walletClient);
}

/**
 * Get the deterministic Smart Account address for a wallet
 */
export async function getSmartAccountAddress(
  walletClient: WalletClient
): Promise<Address> {
  const sdk = assertSdkConfigured();
  return sdk.getSmartAccountAddress(walletClient);
}

/**
 * Check if a Smart Account is deployed on-chain
 */
export async function isSmartAccountDeployed(
  address: Address
): Promise<boolean> {
  const sdk = assertSdkConfigured();
  return sdk.isSmartAccountDeployed(address);
}

/**
 * Get complete Smart Account information
 */
export async function getSmartAccountInfo(
  walletClient: WalletClient,
  eoaAddress: Address
): Promise<SmartAccountInfo> {
  const sdk = assertSdkConfigured();
  return sdk.getSmartAccountInfo(walletClient, eoaAddress);
}

/**
 * Get the ETH balance of a Smart Account
 */
export async function getSmartAccountBalance(
  address: Address
): Promise<bigint> {
  const sdk = assertSdkConfigured();
  return sdk.getSmartAccountBalance(address);
}

/**
 * Send a sponsored transaction using the owner wallet
 */
export async function sendUserOperation(
  walletClient: WalletClient,
  calls: Array<{
    to: Address;
    value?: bigint;
    data?: Hex;
  }>
): Promise<TransactionResult> {
  const sdk = assertSdkConfigured();
  const result = await sdk.sendOwnerTransaction(walletClient, calls);

  if (!result.success) {
    throw new SmartAccountError(
      "UNKNOWN_ERROR",
      result.error || "Failed to send transaction"
    );
  }

  return {
    txHash: result.txHash,
    success: result.success,
  };
}

/**
 * Create a public client for reading blockchain data
 */
export function createBasePublicClient() {
  const sdk = assertSdkConfigured();
  const config = sdk.getConfig();

  // Import dynamically to avoid issues
  const { createPublicClient, http } = require("viem");
  return createPublicClient({
    chain: config.chain,
    transport: http(),
  });
}
