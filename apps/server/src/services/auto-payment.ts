/**
 * Auto-Payment Service
 *
 * Handles automatic payment processing using session keys.
 * When a user's debt exceeds their threshold, this service:
 * 1. Fetches payment requirements from v1/debt endpoint (402 response)
 * 2. Signs an EIP-3009 TransferWithAuthorization via kernelClient (smart account)
 * 3. Sends the signed x402 payment payload to the facilitator for settlement
 * 4. Updates the DB on success
 */

import {
  createKernelClientFromSessionKey,
  DEFAULT_API_BASE_URL,
  type SmartAccountResolvedConfig,
} from "@router402/sdk";
import { logger } from "@router402/utils";
import { getAddress, type Hex, toHex } from "viem";
import { PrismaClient } from "../../generated/prisma/client.js";
import { getChainConfig } from "../config/chain.js";
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

/** EIP-3009 TransferWithAuthorization typed data types */
const transferWithAuthorizationTypes = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
} as const;

/**
 * Build a ResolvedConfig for the SDK from server config and chainId
 */
function buildSdkConfig(chainId: number): SmartAccountResolvedConfig {
  const config = getConfig();
  const { chain, chainId: expectedChainId } = getChainConfig();

  if (chainId !== expectedChainId) {
    throw new Error(
      `Unsupported chainId: ${chainId}. Expected ${expectedChainId} for current environment.`
    );
  }

  const rpcUrl =
    config.RPC_URL ??
    `https://rpc.walletconnect.com/v1/?chainId=eip155:${chainId}&projectId=${config.WALLET_CONNECT_PROJECT_ID}`;

  return {
    chain,
    chainId,
    pimlicoApiKey: config.PIMLICO_API_KEY,
    pimlicoUrl: `https://api.pimlico.io/v2/${chainId}/rpc?apikey=${config.PIMLICO_API_KEY}`,
    entryPointVersion: "0.7",
    sessionKeyValidityPeriod: 365 * 24 * 60 * 60,
    apiBaseUrl: DEFAULT_API_BASE_URL,
    rpcUrl,
  };
}

/**
 * Generate a random 32-byte nonce for EIP-3009
 */
function generateNonce(): Hex {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  return toHex(randomBytes);
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
    const response = await fetch(`${serverUrl}/v1/debt`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "payment-signature": paymentHeader,
      },
    });

    if (response.status === 402) {
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
 * Sign an EIP-3009 TransferWithAuthorization using the kernelClient (smart account).
 * The smart account signs via EIP-1271, allowing gasless USDC transfers through the facilitator.
 */
async function signTransferAuthorization(
  kernelClient: Awaited<ReturnType<typeof createKernelClientFromSessionKey>>,
  params: {
    from: string;
    to: string;
    value: bigint;
    asset: string;
    chainId: number;
    extra?: { name?: string; version?: string };
  }
): Promise<{ authorization: Record<string, unknown>; signature: Hex }> {
  const now = Math.floor(Date.now() / 1000);
  const nonce = generateNonce();

  // USDC EIP-712 domain (from payment requirements extra or defaults)
  const domain = {
    name: params.extra?.name ?? "USD Coin",
    version: params.extra?.version ?? "2",
    chainId: params.chainId,
    verifyingContract: getAddress(params.asset) as `0x${string}`,
  };

  const message = {
    from: getAddress(params.from) as `0x${string}`,
    to: getAddress(params.to) as `0x${string}`,
    value: params.value,
    validAfter: BigInt(now - 60), // Valid 1 minute ago
    validBefore: BigInt(now + 3600), // Valid for 1 hour
    nonce,
  };

  // Sign with kernelClient's smart account (EIP-1271 signature)
  const signature = await kernelClient.signTypedData({
    domain,
    types: transferWithAuthorizationTypes,
    primaryType: "TransferWithAuthorization",
    message,
  });

  autoPayLogger.info("signTypedData result", {
    signatureLength: signature.length,
    signaturePrefix: signature.slice(0, 20),
    domain: JSON.stringify(domain),
    from: message.from,
    to: message.to,
    value: message.value.toString(),
    nonce,
  });

  const authorization = {
    from: message.from,
    to: message.to,
    value: message.value.toString(),
    validAfter: Number(message.validAfter),
    validBefore: Number(message.validBefore),
    nonce,
  };

  return { authorization, signature };
}

/**
 * Send a signed x402 payment payload to the facilitator for settlement
 */
async function settleWithFacilitator(
  paymentPayload: Record<string, unknown>,
  requirements: PaymentRequirements
): Promise<{
  success: boolean;
  transaction?: string;
  payer?: string;
  error?: string;
}> {
  const config = getConfig();

  const body = {
    x402Version: 1,
    paymentPayload,
    paymentRequirements: {
      scheme: requirements.scheme,
      network: requirements.network,
      maxAmountRequired: requirements.amount,
      asset: requirements.asset,
      payTo: requirements.payTo,
      maxTimeoutSeconds: requirements.maxTimeoutSeconds,
      extra: requirements.extra,
    },
  };

  try {
    const response = await fetch(`${config.FACILITATOR_URL}/settle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const result = (await response.json()) as {
      success?: boolean;
      transaction?: string;
      payer?: string;
      errorReason?: string;
      error?: string;
    };

    if (!response.ok || !result.success) {
      return {
        success: false,
        error: result.errorReason || result.error || `HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      transaction: result.transaction,
      payer: result.payer,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Facilitator request failed",
    };
  }
}

/**
 * Automatically pay user's debt using x402 protocol settlement.
 *
 * Flow:
 * 1. Fetch payment requirements from v1/debt (402 response)
 * 2. Get SessionKeyRecord from DB
 * 3. Create kernelClient from session key
 * 4. Sign EIP-3009 TransferWithAuthorization with smart account
 * 5. Send x402 payment payload to facilitator for settlement
 * 6. On success, call processPayment to update DB
 */
export async function autoPayDebt(
  userId: string,
  walletAddress: string,
  _chainId: number,
  debtAmount: number
): Promise<AutoPaymentResult> {
  const db = getPrisma();

  autoPayLogger.info("Starting auto-payment via x402 settle", {
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

  // Step 3: Create kernelClient from session key
  try {
    const sdkConfig = buildSdkConfig(sessionKeyRecord.chainId);
    const chainId = sdkConfig.chainId;

    const kernelClient = await createKernelClientFromSessionKey(
      sessionKeyRecord.privateKey as Hex,
      sessionKeyRecord.serializedSessionKey,
      sdkConfig
    );

    autoPayLogger.debug("KernelClient created", {
      smartAccount: sessionKeyRecord.smartAccountAddress.slice(0, 10),
    });

    // Step 4: Sign EIP-3009 TransferWithAuthorization
    const { authorization, signature } = await signTransferAuthorization(
      kernelClient,
      {
        from: sessionKeyRecord.smartAccountAddress,
        to: requirements.payTo,
        value: paymentAmount,
        asset: requirements.asset,
        chainId,
        extra: requirements.extra as { name?: string; version?: string },
      }
    );

    autoPayLogger.debug("EIP-3009 authorization signed", {
      from: sessionKeyRecord.smartAccountAddress.slice(0, 10),
      payTo: requirements.payTo.slice(0, 10),
      amount: requirements.amount,
    });

    // Step 5: Create x402 payment payload and settle via facilitator
    const paymentPayload = {
      x402Version: 1 as const,
      scheme: "exact",
      network: requirements.network,
      payload: {
        signature,
        authorization,
      },
    };

    const settleResult = await settleWithFacilitator(
      paymentPayload,
      requirements
    );

    if (!settleResult.success) {
      autoPayLogger.error("Facilitator settlement failed", {
        userId,
        error: settleResult.error,
      });
      return {
        success: false,
        error: settleResult.error || "Facilitator settlement failed",
      };
    }

    autoPayLogger.info("x402 settlement successful", {
      userId,
      txHash: settleResult.transaction,
      payer: settleResult.payer,
    });

    // Step 6: Update DB with processPayment
    try {
      await processPayment(
        walletAddress,
        `${debtAmount.toFixed(8)}`,
        settleResult.transaction
      );
      autoPayLogger.info("Auto-payment complete", {
        userId,
        wallet: walletAddress.slice(0, 10),
        txHash: settleResult.transaction,
        amount: debtAmount,
      });
    } catch (error) {
      // Payment was successful but DB update failed
      // Still return success since the payment went through
      autoPayLogger.error("Failed to update DB after successful payment", {
        userId,
        txHash: settleResult.transaction,
        error,
      });
    }

    return {
      success: true,
      txHash: settleResult.transaction,
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
