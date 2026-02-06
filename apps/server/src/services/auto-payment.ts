/**
 * Auto-Payment Service
 *
 * Handles automatic payment processing using session keys.
 * When a user's debt exceeds their threshold, this service uses
 * the stored session key to execute a direct USDC transfer via UserOperation.
 *
 * Note: We use direct USDC transfer via UserOperation instead of ERC-3009 + facilitator
 * because smart account (kernel) signatures are not compatible with ERC-3009's
 * standard ECDSA signature verification.
 */

import { logger } from "@router402/utils";
import { deserializePermissionAccount } from "@zerodev/permissions";
import { toECDSASigner } from "@zerodev/permissions/signers";
import { getEntryPoint, KERNEL_V3_1 } from "@zerodev/sdk/constants";
import { createSmartAccountClient } from "permissionless";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import {
  type Address,
  createPublicClient,
  encodeFunctionData,
  erc20Abi,
  type Hex,
  http,
  parseUnits,
} from "viem";
import { entryPoint07Address } from "viem/account-abstraction";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepoliaPreconf } from "viem/chains";
import { PrismaClient } from "../../generated/prisma/client.js";
import { getConfig } from "../config/index.js";
import { processPayment } from "./debt.js";

const autoPayLogger = logger.context("AutoPayment");

let prisma: PrismaClient | null = null;

/**
 * Initialize the auto-payment service with Prisma client
 */
export function initAutoPaymentService(client: PrismaClient): void {
  prisma = client;
  autoPayLogger.info("Auto-payment service initialized");
}

/**
 * Get Prisma client or throw if not initialized
 */
function getPrisma(): PrismaClient {
  if (!prisma) {
    throw new Error(
      "Auto-payment service not initialized. Call initAutoPaymentService first."
    );
  }
  return prisma;
}

/**
 * Result of an auto-payment attempt
 */
export interface AutoPaymentResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

/**
 * USDC contract address on Base Sepolia
 */
const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as Address;

/**
 * Get chain configuration based on chainId
 */
function getChainConfig(chainId: number) {
  const config = getConfig();
  // Currently only supporting Base Sepolia
  if (chainId === 84532) {
    return {
      chain: baseSepoliaPreconf,
      pimlicoUrl: `https://api.pimlico.io/v2/base-sepolia/rpc?apikey=${config.PIMLICO_API_KEY}`,
    };
  }
  throw new Error(`Unsupported chainId: ${chainId}`);
}

/**
 * Create Pimlico paymaster client
 */
function createPimlicoPaymasterClient(
  chainConfig: ReturnType<typeof getChainConfig>
) {
  return createPimlicoClient({
    chain: chainConfig.chain,
    transport: http(chainConfig.pimlicoUrl),
    entryPoint: {
      address: entryPoint07Address,
      version: "0.7",
    },
  });
}

/**
 * Create a smart account client from stored session key data using Pimlico
 */
async function createSmartAccountClientFromSessionKey(
  privateKey: string,
  serializedSessionKey: string,
  chainId: number
) {
  const chainConfig = getChainConfig(chainId);

  // Create public client for the chain
  const publicClient = createPublicClient({
    chain: chainConfig.chain,
    transport: http(),
  });

  // Create signer from private key
  const sessionKeySigner = privateKeyToAccount(privateKey as Hex);
  const ecdsaSigner = await toECDSASigner({ signer: sessionKeySigner });

  // Get entry point for version 0.7
  const entryPoint = getEntryPoint("0.7");

  // Deserialize the permission account from stored session key
  const kernelAccount = await deserializePermissionAccount(
    publicClient,
    entryPoint,
    KERNEL_V3_1,
    serializedSessionKey,
    ecdsaSigner
  );

  // Create Pimlico client for paymaster
  const pimlicoClient = createPimlicoPaymasterClient(chainConfig);

  // Create smart account client using Pimlico
  const smartAccountClient = createSmartAccountClient({
    account: kernelAccount,
    chain: chainConfig.chain,
    bundlerTransport: http(chainConfig.pimlicoUrl),
    paymaster: pimlicoClient,
    userOperation: {
      estimateFeesPerGas: async () => {
        const prices = await pimlicoClient.getUserOperationGasPrice();
        return prices.fast;
      },
    },
  });

  return smartAccountClient;
}

/**
 * Execute direct USDC transfer via UserOperation
 * This bypasses the facilitator and sends USDC directly from the smart account
 */
async function executeDirectTransfer(
  smartAccountClient: Awaited<
    ReturnType<typeof createSmartAccountClientFromSessionKey>
  >,
  payTo: Address,
  amount: bigint
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    autoPayLogger.debug("Executing direct USDC transfer", {
      from: smartAccountClient.account.address.slice(0, 10),
      to: payTo.slice(0, 10),
      amount: amount.toString(),
    });

    // Encode the ERC20 transfer call
    const transferData = encodeFunctionData({
      abi: erc20Abi,
      functionName: "transfer",
      args: [payTo, amount],
    });

    // Send the UserOperation
    const txHash = await smartAccountClient.sendTransaction({
      to: USDC_ADDRESS,
      data: transferData,
      value: 0n,
    });

    autoPayLogger.info("Direct transfer successful", {
      txHash,
      from: smartAccountClient.account.address.slice(0, 10),
      to: payTo.slice(0, 10),
      amount: amount.toString(),
    });

    return { success: true, txHash };
  } catch (error) {
    autoPayLogger.error("Direct transfer failed", { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Transfer failed",
    };
  }
}

/**
 * Automatically pay user's debt using their stored session key
 *
 * Flow:
 * 1. Get SessionKeyRecord from DB by userId
 * 2. Create smart account client from session key using Pimlico
 * 3. Execute direct USDC transfer via UserOperation
 * 4. On success, call processPayment to update DB
 *
 * @param userId - User ID to pay debt for
 * @param walletAddress - User's wallet address
 * @param chainId - Chain ID for the payment (unused, we use stored chainId)
 * @param debtAmount - Amount of debt to pay (in dollars)
 * @returns AutoPaymentResult with success status and optional txHash/error
 */
export async function autoPayDebt(
  userId: string,
  walletAddress: string,
  _chainId: number,
  debtAmount: number
): Promise<AutoPaymentResult> {
  const db = getPrisma();
  const config = getConfig();

  autoPayLogger.info("Starting auto-payment", {
    userId,
    wallet: walletAddress.slice(0, 10),
    debtAmount,
  });

  // Step 1: Get SessionKeyRecord from DB
  const sessionKeyRecord = await db.sessionKeyRecord.findUnique({
    where: { userId },
  });

  if (!sessionKeyRecord) {
    autoPayLogger.warn("Session key record not found for user", {
      userId,
      wallet: walletAddress.slice(0, 10),
    });
    return { success: false, error: "Session key not found" };
  }

  // Step 2: Create smart account client from session key
  let smartAccountClient: Awaited<
    ReturnType<typeof createSmartAccountClientFromSessionKey>
  >;
  try {
    smartAccountClient = await createSmartAccountClientFromSessionKey(
      sessionKeyRecord.privateKey,
      sessionKeyRecord.serializedSessionKey,
      sessionKeyRecord.chainId
    );
    autoPayLogger.debug("Smart account client created", {
      account: smartAccountClient.account.address.slice(0, 10),
    });
  } catch (error) {
    autoPayLogger.error("Failed to create smart account client", {
      userId,
      error,
    });
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Smart account client creation failed",
    };
  }

  // Step 3: Execute direct USDC transfer
  const payTo = config.PAY_TO as Address;
  // Convert debt amount from dollars to USDC base units (6 decimals)
  const amountInBaseUnits = parseUnits(debtAmount.toFixed(6), 6);

  const transferResult = await executeDirectTransfer(
    smartAccountClient,
    payTo,
    amountInBaseUnits
  );

  if (!transferResult.success) {
    autoPayLogger.error("Direct transfer failed", {
      userId,
      error: transferResult.error,
    });
    return {
      success: false,
      error: transferResult.error,
    };
  }

  // Step 4: Update DB with processPayment
  try {
    await processPayment(
      walletAddress,
      `${debtAmount.toFixed(8)}`,
      transferResult.txHash
    );
    autoPayLogger.info("Auto-payment successful", {
      userId,
      wallet: walletAddress.slice(0, 10),
      txHash: transferResult.txHash,
      amount: debtAmount,
    });
  } catch (error) {
    // Payment was successful but DB update failed
    // Still return success since the payment went through
    autoPayLogger.error("Failed to update DB after successful payment", {
      userId,
      txHash: transferResult.txHash,
      error,
    });
  }

  return {
    success: true,
    txHash: transferResult.txHash,
  };
}
