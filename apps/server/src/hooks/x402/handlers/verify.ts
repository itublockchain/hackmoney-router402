/**
 * x402 Verification Hooks
 *
 * Handlers for payment verification lifecycle events.
 * Includes debt checking via payment payload.
 */

import { logger } from "@router402/utils";
import type { DecodedPaymentSignature } from "../types.js";

const hookLogger = logger.context("x402:Verify");

/**
 * Extracts wallet address from payment payload
 */
function extractWalletAddress(paymentPayload: unknown): string | null {
  if (!paymentPayload || typeof paymentPayload !== "object") {
    return null;
  }

  const payload = paymentPayload as DecodedPaymentSignature;

  // Try nested structure: payload.authorization.from
  if (payload.payload?.authorization?.from) {
    return payload.payload.authorization.from;
  }

  // Try direct authorization access
  if ("authorization" in payload) {
    const auth = (payload as { authorization?: { from?: string } })
      .authorization;
    return auth?.from ?? null;
  }

  return null;
}

/**
 * Checks if a wallet has outstanding debt
 */
async function hasAddressDebt(walletAddress: string): Promise<boolean> {
  // TODO: Implement actual debt check against database
  hookLogger.info("Checking debt for wallet", { walletAddress });
  return false;
}

/**
 * Runs before payment verification
 * Checks wallet debt status before allowing verification
 */
export async function onBeforeVerify(context: {
  paymentPayload: unknown;
  requirements: { network: string; amount: string; scheme: string };
}): Promise<{ abort: true; reason: string } | undefined> {
  const walletAddress = extractWalletAddress(context.paymentPayload);

  if (walletAddress) {
    const hasDebt = await hasAddressDebt(walletAddress);

    if (hasDebt) {
      hookLogger.warn("Verification blocked - wallet has outstanding debt", {
        walletAddress,
      });
      return {
        abort: true,
        reason: "Outstanding debt must be settled before making payments",
      };
    }
  }
}

/**
 * Runs after successful payment verification
 */
export async function onAfterVerify(context: {
  result: { payer?: string };
  requirements: { network: string; amount: string };
}): Promise<void> {
  hookLogger.info("Payment verified", {
    payer: context.result.payer ?? "unknown",
    network: context.requirements.network,
    amount: context.requirements.amount,
  });
}

/**
 * Runs when verification fails
 */
export async function onVerifyFailure(context: {
  error: Error;
  requirements: { network: string };
}): Promise<void> {
  hookLogger.error("Verification failed", {
    error: context.error?.message,
    network: context.requirements.network,
  });
}
