/**
 * x402 HTTP Request Hooks
 *
 * Handlers for HTTP-level request processing before payment flow.
 * Grants access if user's debt is below their threshold.
 * Supports JWT Bearer token authentication for session-based access.
 */

import { logger } from "@router402/utils";
import { decodePaymentSignatureHeader } from "@x402/core/http";
import type { HTTPRequestContext, RouteConfig } from "@x402/core/server";
import type { PaymentPayload } from "@x402/core/types";
import {
  getSmartAccountAddress,
  verifyToken,
} from "../../../services/auth.service.js";
import { autoPayDebt } from "../../../services/auto-payment.js";
import { getUserDebt, isDebtBelowThreshold } from "../../../services/debt.js";
// import { checkIsStaked } from "../../../services/stake.service.js";
import {
  setSmartAccountAddress,
  setWalletAddress,
} from "../../../utils/request-context.js";
import {
  extractWalletFromPayload,
  verifyPaymentSignature,
} from "../../../utils/signature.js";

const hookLogger = logger.context("x402:HTTP");

/**
 * Extract wallet address from HTTP request context
 * Used by routes to get the authenticated wallet for usage tracking
 */
export function extractWalletFromContext(
  context: HTTPRequestContext
): string | null {
  const paymentHeader = context.paymentHeader;
  if (!paymentHeader) return null;

  try {
    const payload = decodePaymentSignatureHeader(paymentHeader);
    const innerPayload = payload.payload as Record<string, unknown>;
    return extractWalletFromPayload(innerPayload);
  } catch {
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
 * Access flow priority:
 * 1. JWT Bearer token authentication (if Authorization header present)
 * 2. Payment signature authentication (existing flow)
 *
 * JWT flow grants access if:
 * - Token is valid
 * - User's debt is below their threshold (from database)
 *
 * Payment signature flow grants access if:
 * - Payment signature is valid (wallet address matches signer)
 * - User's debt is below their threshold (from database)
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

  // ============================================
  // JWT Bearer Token Flow (Priority 1)
  // Validates: Requirements 2.1, 2.2, 2.5, 2.6, 6.1
  // ============================================
  const authHeader = context.adapter.getHeader("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7); // Remove "Bearer " prefix

    hookLogger.debug("JWT Bearer token found, validating...");

    const jwtPayload = verifyToken(token);

    if (jwtPayload) {
      // JWT is valid - extract wallet address from payload
      const { walletAddress, userId, chainId } = jwtPayload;

      hookLogger.debug("JWT validated successfully", {
        wallet: walletAddress.slice(0, 10),
        userId,
        chainId,
      });

      // Look up smart account address for MCP system prompt injection
      const smartAccountAddr = await getSmartAccountAddress(userId);

      // SKIP --- HACKATHON ---
      // Check if user has staked via the staking contract
      // if (smartAccountAddr) {
      //   const staked = await checkIsStaked(smartAccountAddr);
      //   if (!staked) {
      //     hookLogger.warn("Access denied - user has not staked", {
      //       wallet: walletAddress.slice(0, 10),
      //       smartAccount: smartAccountAddr.slice(0, 10),
      //       path,
      //     });
      //     return {
      //       abort: true,
      //       reason:
      //         "User has not staked. Please stake before accessing this resource.",
      //     };
      //   }
      // }

      // Check if debt is below threshold (from database)
      // Task 3.2 will add: if debt >= threshold, trigger autoPayDebt()
      const belowThreshold = await isDebtBelowThreshold(walletAddress);

      if (belowThreshold) {
        // Store wallet in async context for usage tracking
        setWalletAddress(walletAddress);
        if (smartAccountAddr) setSmartAccountAddress(smartAccountAddr);

        hookLogger.info("Access granted via JWT - debt below threshold", {
          wallet: walletAddress.slice(0, 10),
          path,
        });
        return { grantAccess: true };
      }

      // Debt exceeds threshold - trigger auto-payment
      // Validates: Requirements 3.2
      hookLogger.info(
        "JWT valid but debt exceeds threshold, triggering auto-payment",
        {
          wallet: walletAddress.slice(0, 10),
          path,
        }
      );

      const debtAmount = await getUserDebt(walletAddress);
      const autoPayResult = await autoPayDebt(
        userId,
        walletAddress,
        chainId,
        debtAmount
      );

      if (autoPayResult.success) {
        // Auto-payment successful - grant access
        // Validates: Requirement 5.2
        setWalletAddress(walletAddress);
        if (smartAccountAddr) setSmartAccountAddress(smartAccountAddr);

        hookLogger.info("Access granted via JWT - auto-payment successful", {
          wallet: walletAddress.slice(0, 10),
          txHash: autoPayResult.txHash,
          path,
        });
        return { grantAccess: true };
      }

      // Auto-payment failed - fallback to normal x402 payment flow
      // Validates: Requirement 4.6 (graceful fallback)
      hookLogger.warn("Auto-payment failed, falling back to payment flow", {
        wallet: walletAddress.slice(0, 10),
        error: autoPayResult.error,
        path,
      });
      return undefined;
    }

    // JWT validation failed - continue to payment signature flow
    hookLogger.debug("JWT validation failed, falling back to payment flow");
  }

  // ============================================
  // Payment Signature Flow (Priority 2)
  // Original flow - unchanged
  // ============================================
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
    // Store wallet in async context for usage tracking
    setWalletAddress(walletAddress);

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
