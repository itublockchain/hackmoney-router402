import {
  SmartAccountError,
  type SmartAccountInfo,
  type TransactionResult,
} from "@router402/sdk";
import type { Address, Hex, WalletClient } from "viem";
import { router402Sdk } from "@/config";

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
 * Check if a Smart Account is deployed on-chain
 */
export async function isSmartAccountDeployed(
  address: Address
): Promise<boolean> {
  const sdk = assertSdkConfigured();
  return sdk.isSmartAccountDeployed(address);
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
