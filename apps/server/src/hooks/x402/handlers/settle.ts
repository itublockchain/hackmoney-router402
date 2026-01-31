/**
 * x402 Settlement Hooks
 *
 * Handlers for payment settlement lifecycle events.
 * These hooks run during the settlement phase of the x402 payment flow.
 */

import { logger } from "@router402/utils";

const hookLogger = logger.context("x402:Settle");

/**
 * Runs before payment settlement
 * Use to perform final checks before committing the transaction
 *
 * @returns AbortResult to reject, undefined to continue
 */
export async function onBeforeSettle(context: {
  requirements: { network: string; amount: string };
}): Promise<{ abort: true; reason: string } | undefined> {
  hookLogger.debug("Before settle", {
    network: context.requirements.network,
    amount: context.requirements.amount,
  });

  // Example: Check if settlement should be delayed
  // const shouldDelay = await checkSettlementQueue();
  // if (shouldDelay) {
  //   return { abort: true, reason: "Settlement queue full, try again later" };
  // }

  return undefined;
}

/**
 * Runs after successful payment settlement
 * Use for recording transactions, updating balances, or triggering webhooks
 */
export async function onAfterSettle(context: {
  result: { payer?: string; transaction?: string };
  requirements: { network: string; amount: string };
}): Promise<void> {
  hookLogger.info("Payment settled", {
    payer: context.result.payer ?? "unknown",
    transaction: context.result.transaction ?? "unknown",
    network: context.requirements.network,
    amount: context.requirements.amount,
  });

  // This is where you'd typically record the payment to your database
  // The actual database recording is handled by the payment recorder service
}

/**
 * Runs when settlement fails
 * Use to implement recovery logic or notify administrators
 *
 * @returns RecoveryResult to override failure, undefined to propagate error
 */
export async function onSettleFailure(context: {
  error: Error;
  requirements: { network: string; amount: string };
}): Promise<void> {
  hookLogger.error("Settlement failed", {
    error: context.error?.message,
    network: context.requirements.network,
    amount: context.requirements.amount,
  });

  // Example: Implement retry logic for transient failures
  // if (context.error?.message.includes("nonce")) {
  //   const retryResult = await retrySettlement(context);
  //   if (retryResult) {
  //     return { recovered: true, result: retryResult };
  //   }
  // }
}
