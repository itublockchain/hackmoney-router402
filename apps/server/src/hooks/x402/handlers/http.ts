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
import { isDebtBelowThreshold } from "../../../services/debt.js";

const hookLogger = logger.context("x402:HTTP");

/**
 * Extracts wallet address from payment signature header
 * Supports both EIP-3009 and Permit2 payload formats
 */
function extractWalletFromPaymentHeader(
  context: HTTPRequestContext
): string | null {
  const paymentHeader = context.paymentHeader;
  if (!paymentHeader) {
    return null;
  }

  try {
    const payload = decodePaymentSignatureHeader(paymentHeader);
    const innerPayload = payload.payload as Record<string, unknown>;

    // EIP-3009 format: payload.authorization.from
    if (innerPayload.authorization) {
      const auth = innerPayload.authorization as { from?: string };
      if (auth.from) {
        return auth.from.toLowerCase();
      }
    }

    // Permit2 format: payload.permit2Authorization.from
    if (innerPayload.permit2Authorization) {
      const permit2 = innerPayload.permit2Authorization as { from?: string };
      if (permit2.from) {
        return permit2.from.toLowerCase();
      }
    }

    return null;
  } catch (error) {
    hookLogger.debug("Failed to decode payment header", { error });
    return null;
  }
}

/**
 * HTTP Protected Request Hook
 *
 * Runs on every request to a protected route before payment processing.
 * - Return { grantAccess: true } to bypass payment
 * - Return { abort: true, reason } to return 403
 * - Return undefined to continue to payment flow
 *
 * Access is granted if user's debt is below their threshold (from database)
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

  // Extract wallet address from payment signature
  const walletAddress = extractWalletFromPaymentHeader(context);

  if (!walletAddress) {
    // No payment header - continue to normal payment flow
    hookLogger.debug(
      "No wallet address in payment header, proceeding to payment flow"
    );
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
