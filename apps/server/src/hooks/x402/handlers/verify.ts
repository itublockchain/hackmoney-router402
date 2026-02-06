/**
 * x402 Verification Hooks
 *
 * Handlers for payment verification lifecycle events.
 * Wallet address extraction and debt checking is handled in http.ts
 * before reaching verification stage.
 */

import { logger } from "@router402/utils";

const hookLogger = logger.context("x402:Verify");

/**
 * Runs before payment verification
 * Note: Wallet address extraction and grant logic moved to http.ts
 * This hook now only handles verification-specific concerns
 */
export async function onBeforeVerify(_context: {
  paymentPayload: unknown;
  requirements: { network: string; amount: string; scheme: string };
}): Promise<{ abort: true; reason: string } | undefined> {
  // Wallet extraction and debt check now handled in onProtectedRequest (http.ts)
  // This ensures wallet address is extracted from the actual signature
  return undefined;
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
