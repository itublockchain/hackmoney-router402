import type { Hex, WalletClient } from "viem";
import {
  createKernelAccountFromWallet,
  createKernelClientFromSessionKey,
  createKernelSmartAccountClient,
} from "./kernel";
import type {
  CallData,
  ResolvedConfig,
  TransactionExecutionResult,
} from "./types";

/**
 * Send a user operation using the owner wallet.
 */
export async function sendOwnerTransaction(
  walletClient: WalletClient,
  calls: CallData[],
  config: ResolvedConfig
): Promise<TransactionExecutionResult> {
  try {
    const account = await createKernelAccountFromWallet(walletClient, config);
    const client = createKernelSmartAccountClient(account, config);

    const userOpHash = await client.sendUserOperation({
      calls: calls.map((call) => ({
        to: call.to,
        data: call.data ?? "0x",
        value: call.value ?? 0n,
      })),
    });

    const receipt = await client.waitForUserOperationReceipt({
      hash: userOpHash,
    });

    return {
      success: true,
      txHash: receipt.receipt.transactionHash,
      userOpHash,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send a transaction using a session key.
 * This can be used by both frontend and backend.
 */
export async function sendSessionKeyTransaction(
  sessionKeyPrivateKey: Hex,
  serializedApproval: string,
  calls: CallData[],
  config: ResolvedConfig
): Promise<TransactionExecutionResult> {
  try {
    const client = await createKernelClientFromSessionKey(
      sessionKeyPrivateKey,
      serializedApproval,
      config
    );

    const userOpHash = await client.sendUserOperation({
      calls: calls.map((call) => ({
        to: call.to,
        data: call.data ?? "0x",
        value: call.value ?? 0n,
      })),
    });

    const receipt = await client.waitForUserOperationReceipt({
      hash: userOpHash,
    });

    return {
      success: true,
      txHash: receipt.receipt.transactionHash,
      userOpHash,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
