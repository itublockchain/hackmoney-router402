import type { Address, Hex, WalletClient } from "viem";
import { createPublicClient, http } from "viem";
import { SMART_ACCOUNT_CONFIG } from "@/config/smart-account";
import { createKernelAccountFromWallet, sendOwnerTransaction } from "./kernel";
import type { SmartAccountInfo, TransactionResult } from "./types";
import { SmartAccountError } from "./types";

/**
 * Create a public client for reading blockchain data
 */
export function createBasePublicClient() {
  return createPublicClient({
    chain: SMART_ACCOUNT_CONFIG.chain,
    transport: http(),
  });
}

/**
 * Create a Smart Account instance using Kernel
 * @param walletClient - The wallet client (owner/signer)
 * @returns The Kernel account instance
 */
export async function createSmartAccount(walletClient: WalletClient) {
  return createKernelAccountFromWallet(walletClient);
}

/**
 * Get the deterministic Smart Account address for a wallet
 * @param walletClient - The wallet client (owner/signer)
 * @returns The computed Smart Account address
 */
export async function getSmartAccountAddress(
  walletClient: WalletClient
): Promise<Address> {
  const account = await createSmartAccount(walletClient);
  return account.address;
}

/**
 * Check if a Smart Account is deployed on-chain
 * @param address - The Smart Account address to check
 * @returns Whether the account has code deployed
 */
export async function isSmartAccountDeployed(
  address: Address
): Promise<boolean> {
  const publicClient = createBasePublicClient();
  const code = await publicClient.getCode({ address });
  return code !== undefined && code !== "0x";
}

/**
 * Get complete Smart Account information
 * @param walletClient - The wallet client (owner/signer)
 * @param eoaAddress - The EOA address of the owner
 * @returns Smart Account info including address and deployment status
 */
export async function getSmartAccountInfo(
  walletClient: WalletClient,
  eoaAddress: Address
): Promise<SmartAccountInfo> {
  const account = await createSmartAccount(walletClient);
  const smartAccountAddress = account.address;
  const isDeployed = await account.isDeployed();

  return {
    address: smartAccountAddress,
    eoaAddress,
    isDeployed,
    chainId: SMART_ACCOUNT_CONFIG.chainId,
  };
}

/**
 * Get the ETH balance of a Smart Account
 * @param address - The Smart Account address
 * @returns Balance in wei
 */
export async function getSmartAccountBalance(
  address: Address
): Promise<bigint> {
  const publicClient = createBasePublicClient();
  return publicClient.getBalance({ address });
}

/**
 * Send a sponsored transaction using the owner wallet
 * @param walletClient - The wallet client/owner
 * @param calls - The calls to execute
 * @returns The transaction result with tx hash
 */
export async function sendUserOperation(
  walletClient: WalletClient,
  calls: Array<{
    to: Address;
    value?: bigint;
    data?: Hex;
  }>
): Promise<TransactionResult> {
  const result = await sendOwnerTransaction(walletClient, calls);

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
