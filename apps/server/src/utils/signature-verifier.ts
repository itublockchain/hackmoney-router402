/**
 * Authorization Signature Verification Utilities
 *
 * Verifies authorization signatures and recovers wallet addresses using viem.
 */

import { logger } from "@router402/utils";
import { recoverMessageAddress } from "viem";

const sigLogger = logger.context("auth-signature");

export interface SignatureVerificationResult {
  isValid: boolean;
  walletAddress?: `0x${string}`;
  error?: string;
}

/**
 * Verifies an authorization signature and recovers the wallet address.
 *
 * @param signature - The signature from x-authorization-signature header
 * @param message - The message that was signed (stringified request body)
 * @returns SignatureVerificationResult with isValid, walletAddress, and optional error
 */
export async function verifyAuthorizationSignature(
  signature: string,
  message: string
): Promise<SignatureVerificationResult> {
  try {
    const walletAddress = await recoverMessageAddress({
      message,
      signature: signature as `0x${string}`,
    });

    sigLogger.debug("Signature verified successfully", {
      walletAddress,
    });

    return {
      isValid: true,
      walletAddress,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    sigLogger.debug("Signature verification failed", { error: errorMessage });

    return {
      isValid: false,
      error: errorMessage,
    };
  }
}
