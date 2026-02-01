/**
 * x402 HTTP Request Hooks
 *
 * Handlers for HTTP-level request processing before payment flow.
 * Grants access if user's debt is below their threshold.
 */

import { logger } from "@router402/utils";
import { decodePaymentSignatureHeader } from "../../../../external/x402/typescript/packages/core/dist/esm/http/index.mjs";
import type {
  HTTPRequestContext,
  RouteConfig,
} from "../../../../external/x402/typescript/packages/core/dist/esm/server/index.mjs";
import type { PaymentPayload } from "../../../../external/x402/typescript/packages/core/dist/esm/types/index.mjs";
import { isDebtBelowThreshold } from "../../../services/debt.js";
import {
  extractWalletFromPayload,
  verifyPaymentSignature,
} from "../../../utils/signature.js";

const hookLogger = logger.context("x402:HTTP");

/**
 * HTTP Protected Request Hook
 *
 * Runs on every request to a protected route before payment processing.
 * - Return { grantAccess: true } to bypass payment
 * - Return { abort: true, reason } to return 403
 * - Return undefined to continue to payment flow
 *
 * Access is granted if:
 * 1. Payment signature is valid (wallet address matches signer)
 * 2. User's debt is below their threshold (from database)
 */
export async function onProtectedRequest(
  context: HTTPRequestContext,
  _routeConfig: RouteConfig
): Promise<
  { grantAccess: true } | { abort: true; reason: string } | undefined
> {
  const path = context.path;
  const method = context.method;

  hookLogger.debug("Processing protected request", { method, path });

  const paymentHeader = context.paymentHeader;
  if (!paymentHeader) {
    hookLogger.debug("No payment header, proceeding to payment flow");
    return undefined;
  }

  let payload: PaymentPayload;
  try {
    payload = decodePaymentSignatureHeader(paymentHeader);
  } catch (error) {
    hookLogger.debug("Failed to decode payment header", { error });
    return undefined;
  }

  const innerPayload = payload.payload as Record<string, unknown>;
  const walletAddress = extractWalletFromPayload(innerPayload);

  if (!walletAddress) {
    hookLogger.debug(
      "No wallet address in payload, proceeding to payment flow"
    );
    return undefined;
  }

  // Verify signature matches the claimed wallet address
  const isValidSignature = await verifyPaymentSignature(
    innerPayload,
    walletAddress,
    payload.accepted
  );

  if (!isValidSignature) {
    hookLogger.warn("Invalid signature - address mismatch", {
      claimedWallet: walletAddress.slice(0, 10),
    });
    return undefined;
  }

  // Check if debt is below threshold (from database)
  const belowThreshold = await isDebtBelowThreshold(walletAddress);

  if (belowThreshold) {
    hookLogger.info("Access granted - debt below threshold", {
      wallet: walletAddress.slice(0, 10),
      path,
    });
    return { grantAccess: true };
  }

  // Debt exceeds threshold - require payment
  hookLogger.info("Debt exceeds threshold, requiring payment", {
    wallet: walletAddress.slice(0, 10),
    path,
  });
  return undefined;
}
