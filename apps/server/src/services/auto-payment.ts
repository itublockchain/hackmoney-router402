/**
 * Auto-Payment Service
 *
 * Handles automatic payment processing using session keys.
 * When a user's debt exceeds their threshold, this service:
 * 1. Fetches payment requirements from v1/debt endpoint (402 response)
 * 2. Sends a direct USDC transfer via UserOp using the session key
 * 3. Updates the DB on success
 */

import { type ResolvedConfig, sendSessionKeyTransaction } from "@router402/sdk";
import { logger } from "@router402/utils";
import { encodeFunctionData, getAddress, type Hex } from "viem";
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
 * Payment requirements from 402 response
 */
interface PaymentRequirements {
  scheme: string;
  network: string;
  amount: string;
  asset: string;
  payTo: string;
  maxTimeoutSeconds: number;
  extra?: {
    name?: string;
    version?: string;
    [key: string]: unknown;
  };
}

/** Minimal ERC-20 ABI for transfer */
const erc20TransferAbi = [
  {
    type: "function",
    name: "transfer",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
] as const;

/**
 * Build a ResolvedConfig for the SDK from server config and chainId
 */
function buildSdkConfig(chainId: number): ResolvedConfig {
  const config = getConfig();

  // Currently only supporting Base Sepolia
  if (chainId !== 84532) {
    throw new Error(`Unsupported chainId: ${chainId}`);
  }

  return {
    chain: baseSepoliaPreconf,
    chainId,
    pimlicoApiKey: config.PIMLICO_API_KEY,
    pimlicoUrl: `https://api.pimlico.io/v2/${chainId}/rpc?apikey=${config.PIMLICO_API_KEY}`,
    entryPointVersion: "0.7",
    sessionKeyValidityPeriod: 365 * 24 * 60 * 60,
  };
}

/**
 * Fetch payment requirements from v1/debt endpoint (402 response)
 * Uses a dummy payment header to get proper price calculation
 */
async function fetchPaymentRequirements(
  walletAddress: string
): Promise<PaymentRequirements | null> {
  const config = getConfig();
  const serverUrl = `http://localhost:${config.PORT}`;

  // Create a minimal payment header so getDynamicPrice can extract wallet
  // This is a workaround since we need the wallet to calculate the debt
  const dummyPayload = {
    x402Version: 2,
    accepted: {},
    payload: {
      authorization: {
        from: walletAddress,
      },
    },
  };
  const paymentHeader = Buffer.from(JSON.stringify(dummyPayload)).toString(
    "base64"
  );

  try {
    // Make request to v1/debt - expect 402 response with payment requirements
    // Add internal header to skip JWT auth flow and prevent infinite loop
    const response = await fetch(`${serverUrl}/v1/debt`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "payment-signature": paymentHeader,
      },
    });

    if (response.status === 402) {
      // Payment requirements are in the payment-required header (base64 encoded)
      const paymentRequiredHeader = response.headers.get("payment-required");

      if (paymentRequiredHeader) {
        try {
          const decoded = Buffer.from(paymentRequiredHeader, "base64").toString(
            "utf-8"
          );
          const data = JSON.parse(decoded) as {
            accepts?: PaymentRequirements[];
          };

          autoPayLogger.debug("402 payment-required header decoded", {
            hasAccepts: !!data.accepts,
            acceptsLength: data.accepts?.length,
          });

          // Extract payment requirements from decoded header
          const accepts = data.accepts;
          if (accepts && accepts.length > 0) {
            return accepts[0];
          }
        } catch (parseError) {
          autoPayLogger.error("Failed to parse payment-required header", {
            parseError,
          });
        }
      }
    }

    autoPayLogger.warn("Unexpected response from v1/debt", {
      status: response.status,
    });
    return null;
  } catch (error) {
    autoPayLogger.error("Failed to fetch payment requirements", { error });
    return null;
  }
}

/**
 * Automatically pay user's debt using their stored session key
 *
 * Flow:
 * 1. Fetch payment requirements from v1/debt (402 response)
 * 2. Get SessionKeyRecord from DB by userId
 * 3. Encode a direct USDC transfer(payTo, amount) call
 * 4. Send via sendSessionKeyTransaction (UserOp with session key)
 * 5. On success, call processPayment to update DB
 *
 * @param userId - User ID to pay debt for
 * @param walletAddress - User's wallet address
 * @param _chainId - Chain ID for the payment (unused, we use stored chainId)
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

  autoPayLogger.info("Starting auto-payment", {
    userId,
    wallet: walletAddress.slice(0, 10),
    debtAmount,
  });

  // Step 1: Fetch payment requirements from v1/debt
  const requirements = await fetchPaymentRequirements(walletAddress);
  if (!requirements) {
    autoPayLogger.warn("Failed to fetch payment requirements", {
      userId,
      wallet: walletAddress.slice(0, 10),
    });
    return { success: false, error: "Failed to fetch payment requirements" };
  }

  autoPayLogger.debug("Payment requirements fetched", {
    scheme: requirements.scheme,
    network: requirements.network,
    amount: requirements.amount,
  });

  // If payment amount is 0, grant access directly without settlement
  const paymentAmount = BigInt(requirements.amount);
  if (paymentAmount === 0n) {
    autoPayLogger.info("Payment amount is zero, granting access directly", {
      userId,
      wallet: walletAddress.slice(0, 10),
    });
    return { success: true };
  }

  // Step 2: Get SessionKeyRecord from DB
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

  // Step 3: Encode USDC transfer calldata
  const usdcAddress = getAddress(requirements.asset);
  const payTo = getAddress(requirements.payTo);

  const transferData = encodeFunctionData({
    abi: erc20TransferAbi,
    functionName: "transfer",
    args: [payTo, paymentAmount],
  });

  autoPayLogger.debug("USDC transfer encoded", {
    asset: usdcAddress,
    payTo: payTo.slice(0, 10),
    amount: requirements.amount,
  });

  // Step 4: Send via sendSessionKeyTransaction (UserOp)
  try {
    const sdkConfig = buildSdkConfig(sessionKeyRecord.chainId);

    const result = await sendSessionKeyTransaction(
      sessionKeyRecord.privateKey as Hex,
      sessionKeyRecord.serializedSessionKey,
      [
        {
          to: usdcAddress,
          data: transferData,
        },
      ],
      sdkConfig
    );

    if (!result.success) {
      autoPayLogger.error("Session key transaction failed", {
        userId,
        error: result.error,
      });
      return {
        success: false,
        error: result.error || "Session key transaction failed",
      };
    }

    autoPayLogger.info("USDC transfer successful", {
      userId,
      txHash: result.txHash,
      userOpHash: result.userOpHash,
    });

    // Step 5: Update DB with processPayment
    try {
      await processPayment(
        walletAddress,
        `${debtAmount.toFixed(8)}`,
        result.txHash
      );
      autoPayLogger.info("Auto-payment complete", {
        userId,
        wallet: walletAddress.slice(0, 10),
        txHash: result.txHash,
        amount: debtAmount,
      });
    } catch (error) {
      // Payment was successful but DB update failed
      // Still return success since the payment went through
      autoPayLogger.error("Failed to update DB after successful payment", {
        userId,
        txHash: result.txHash,
        error,
      });
    }

    return {
      success: true,
      txHash: result.txHash,
    };
  } catch (error) {
    autoPayLogger.error("Auto-payment failed", {
      userId,
      error,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Auto-payment failed",
    };
  }
}
