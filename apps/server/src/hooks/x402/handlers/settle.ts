/**
 * x402 Settlement Hooks
 *
 * Handlers for payment settlement lifecycle events.
 * These hooks run during the settlement phase of the x402 payment flow.
 */

import { logger } from "@router402/utils";
import { processPayment } from "../../../services/debt.js";

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

  return undefined;
}

/**
 * Runs after successful payment settlement
 * Creates Payment record, marks UsageRecords as paid, reduces currentDebt
 */
export async function onAfterSettle(context: {
  result: { payer?: string; transaction?: string };
  requirements: { network: string; amount: string };
}): Promise<void> {
  const payer = context.result.payer;
  const txHash = context.result.transaction;
  const amount = context.requirements.amount;

  hookLogger.info("Payment settled", {
    payer: payer ?? "unknown",
    transaction: txHash ?? "unknown",
    network: context.requirements.network,
    amount,
  });

  if (payer) {
    try {
      await processPayment(payer, amount, txHash);
    } catch (error) {
      hookLogger.error("Failed to process payment", {
        payer: payer.slice(0, 10),
        error,
      });
    }
  }
}

/**
 * Runs when settlement fails
 * Use to implement recovery logic or notify administrators
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
}
