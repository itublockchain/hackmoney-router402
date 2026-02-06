/**
 * Auto-Payment Service
 *
 * Handles automatic payment processing using session keys.
 * When a user's debt exceeds their threshold, this service:
 * 1. Fetches payment requirements from v1/debt endpoint (402 response)
 * 2. Creates ERC-3009 authorization payload
 * 3. Signs with EIP-1271 (smart account signature via session key)
 * 4. Sends to facilitator for settlement
 */

import { logger } from "@router402/utils";
import { deserializePermissionAccount } from "@zerodev/permissions";
import { toECDSASigner } from "@zerodev/permissions/signers";
import { getEntryPoint, KERNEL_V3_1 } from "@zerodev/sdk/constants";
import { createPublicClient, getAddress, type Hex, http, toHex } from "viem";
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
 * EIP-3009 TransferWithAuthorization types for EIP-712 signing
 */
const authorizationTypes = {
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

/**
 * Generate a random 32-byte nonce for EIP-3009
 */
function createNonce(): Hex {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  return toHex(randomBytes);
}

/**
 * Get chain configuration based on chainId
 */
function getChainConfig(chainId: number) {
  // Currently only supporting Base Sepolia
  if (chainId === 84532) {
    return {
      chain: baseSepoliaPreconf,
    };
  }
  throw new Error(`Unsupported chainId: ${chainId}`);
}

/**
 * Create a kernel account from stored session key data
 */
async function createKernelAccountFromSessionKey(
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

  return kernelAccount;
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
 * Create EIP-3009 authorization and sign with EIP-1271 (smart account)
 */
async function createSignedPaymentPayload(
  kernelAccount: Awaited<ReturnType<typeof createKernelAccountFromSessionKey>>,
  requirements: PaymentRequirements,
  chainId: number
): Promise<{ payload: string; authorization: Record<string, unknown> } | null> {
  try {
    const nonce = createNonce();
    const now = Math.floor(Date.now() / 1000);

    // Create ERC-3009 authorization
    const authorization = {
      from: kernelAccount.address,
      to: getAddress(requirements.payTo),
      value: requirements.amount,
      validAfter: (now - 600).toString(), // 10 minutes ago
      validBefore: (now + requirements.maxTimeoutSeconds).toString(),
      nonce,
    };

    // Get EIP-712 domain from requirements.extra or use defaults
    const name = requirements.extra?.name || "USD Coin";
    const version = requirements.extra?.version || "2";

    const domain = {
      name,
      version,
      chainId,
      verifyingContract: getAddress(requirements.asset),
    };

    const message = {
      from: getAddress(authorization.from),
      to: getAddress(authorization.to),
      value: BigInt(authorization.value),
      validAfter: BigInt(authorization.validAfter),
      validBefore: BigInt(authorization.validBefore),
      nonce: authorization.nonce,
    };

    // Sign with EIP-1271 (smart account signature)
    const signature = await kernelAccount.signTypedData({
      domain,
      types: authorizationTypes,
      primaryType: "TransferWithAuthorization",
      message,
    });

    autoPayLogger.debug("EIP-3009 authorization signed", {
      from: authorization.from.slice(0, 10),
      to: authorization.to.slice(0, 10),
      value: authorization.value,
    });

    // Create payment payload
    const payloadObj = {
      x402Version: 2,
      accepted: {
        scheme: requirements.scheme,
        network: requirements.network,
        asset: requirements.asset,
        amount: requirements.amount,
        payTo: requirements.payTo,
        maxTimeoutSeconds: requirements.maxTimeoutSeconds,
        extra: requirements.extra,
      },
      payload: {
        authorization: {
          from: authorization.from,
          to: authorization.to,
          value: authorization.value,
          validAfter: Number(authorization.validAfter),
          validBefore: Number(authorization.validBefore),
          nonce: authorization.nonce,
        },
        signature,
      },
    };

    // Base64 encode the payload
    const encodedPayload = Buffer.from(JSON.stringify(payloadObj)).toString(
      "base64"
    );

    return { payload: encodedPayload, authorization };
  } catch (error) {
    autoPayLogger.error("Failed to create signed payment payload", { error });
    return null;
  }
}

/**
 * Send payment to facilitator for settlement
 */
async function settleWithFacilitator(
  encodedPayload: string,
  requirements: PaymentRequirements
): Promise<{
  success: boolean;
  txHash?: string;
  payer?: string;
  error?: string;
}> {
  const config = getConfig();

  const requestBody = {
    x402Version: 2,
    paymentPayload: JSON.parse(
      Buffer.from(encodedPayload, "base64").toString("utf-8")
    ),
    paymentRequirements: {
      scheme: requirements.scheme,
      network: requirements.network,
      amount: requirements.amount,
      asset: requirements.asset,
      payTo: requirements.payTo,
      maxTimeoutSeconds: requirements.maxTimeoutSeconds,
      extra: requirements.extra,
    },
  };

  autoPayLogger.debug("Sending to facilitator", {
    url: `${config.FACILITATOR_URL}/settle`,
    payloadPreview: encodedPayload.slice(0, 100),
    requirements: requestBody.paymentRequirements,
  });

  try {
    const response = await fetch(`${config.FACILITATOR_URL}/settle`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    autoPayLogger.debug("Facilitator response", {
      status: response.status,
      body: responseText.slice(0, 500),
    });

    let result: {
      success: boolean;
      transaction?: string;
      payer?: string;
      errorReason?: string;
    };

    try {
      result = JSON.parse(responseText);
    } catch {
      return {
        success: false,
        error: `Invalid JSON response: ${responseText.slice(0, 200)}`,
      };
    }

    if (result.success) {
      autoPayLogger.info("Facilitator settlement successful", {
        txHash: result.transaction,
        payer: result.payer,
      });
      return {
        success: true,
        txHash: result.transaction,
        payer: result.payer,
      };
    }

    autoPayLogger.warn("Facilitator settlement failed", {
      error: result.errorReason,
    });
    return {
      success: false,
      error: result.errorReason || "Settlement failed",
    };
  } catch (error) {
    autoPayLogger.error("Failed to settle with facilitator", { error });
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Settlement request failed",
    };
  }
}

/**
 * Automatically pay user's debt using their stored session key
 *
 * Flow:
 * 1. Fetch payment requirements from v1/debt (402 response)
 * 2. Get SessionKeyRecord from DB by userId
 * 3. Create kernel account from session key
 * 4. Create ERC-3009 authorization and sign with EIP-1271
 * 5. Send to facilitator for settlement
 * 6. On success, call processPayment to update DB
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

  // Step 3: Create kernel account from session key
  let kernelAccount: Awaited<
    ReturnType<typeof createKernelAccountFromSessionKey>
  >;
  try {
    kernelAccount = await createKernelAccountFromSessionKey(
      sessionKeyRecord.privateKey,
      sessionKeyRecord.serializedSessionKey,
      sessionKeyRecord.chainId
    );
    autoPayLogger.debug("Kernel account created", {
      account: kernelAccount.address.slice(0, 10),
    });
  } catch (error) {
    autoPayLogger.error("Failed to create kernel account", {
      userId,
      error,
    });
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Kernel account creation failed",
    };
  }

  // Step 4: Create signed payment payload (ERC-3009 + EIP-1271)
  const signedPayload = await createSignedPaymentPayload(
    kernelAccount,
    requirements,
    sessionKeyRecord.chainId
  );

  if (!signedPayload) {
    autoPayLogger.error("Failed to create signed payment payload", {
      userId,
    });
    return {
      success: false,
      error: "Failed to sign payment",
    };
  }

  // Step 5: Send to facilitator for settlement
  const settleResult = await settleWithFacilitator(
    signedPayload.payload,
    requirements
  );

  if (!settleResult.success) {
    autoPayLogger.error("Facilitator settlement failed", {
      userId,
      error: settleResult.error,
    });
    return {
      success: false,
      error: settleResult.error,
    };
  }

  // Step 6: Update DB with processPayment
  try {
    await processPayment(
      walletAddress,
      `${debtAmount.toFixed(8)}`,
      settleResult.txHash
    );
    autoPayLogger.info("Auto-payment successful", {
      userId,
      wallet: walletAddress.slice(0, 10),
      txHash: settleResult.txHash,
      amount: debtAmount,
    });
  } catch (error) {
    // Payment was successful but DB update failed
    // Still return success since the payment went through
    autoPayLogger.error("Failed to update DB after successful payment", {
      userId,
      txHash: settleResult.txHash,
      error,
    });
  }

  return {
    success: true,
    txHash: settleResult.txHash,
  };
}
