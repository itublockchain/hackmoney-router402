/**
 * Authorization Signature Verification Utilities
 *
 * Verifies EIP-712 typed data signatures and recovers wallet addresses using viem.
 */

import { logger } from "@router402/utils";
import { recoverTypedDataAddress } from "viem";

const sigLogger = logger.context("auth-signature");

// EIP-712 Domain for authorization
export const AUTHORIZATION_DOMAIN = {
  name: "Router402 Authorization",
  version: "1",
} as const;

// EIP-712 Types for authorization request
export const AUTHORIZATION_TYPES = {
  Authorization: [
    { name: "smartAccountAddress", type: "address" },
    { name: "privateKey", type: "string" },
    { name: "serializedSessionKey", type: "string" },
    { name: "chainId", type: "uint256" },
    { name: "nonce", type: "uint256" },
  ],
} as const;

export interface AuthorizationMessage {
  smartAccountAddress: `0x${string}`;
  privateKey: string;
  serializedSessionKey: string;
  chainId: bigint;
  nonce: bigint;
}

export interface SignatureVerificationResult {
  isValid: boolean;
  walletAddress?: `0x${string}`;
  error?: string;
}

/**
 * Verifies an EIP-712 typed data signature and recovers the wallet address.
 *
 * @param signature - The signature from x-authorization-signature header
 * @param message - The typed data message that was signed
 * @param chainId - The chain ID for domain separation
 * @returns SignatureVerificationResult with isValid, walletAddress, and optional error
 */
export async function verifyAuthorizationSignature(
  signature: string,
  message: AuthorizationMessage,
  chainId: number
): Promise<SignatureVerificationResult> {
  try {
    const domain = {
      ...AUTHORIZATION_DOMAIN,
      chainId,
    };

    const walletAddress = await recoverTypedDataAddress({
      domain,
      types: AUTHORIZATION_TYPES,
      primaryType: "Authorization",
      message: {
        smartAccountAddress: message.smartAccountAddress,
        privateKey: message.privateKey,
        serializedSessionKey: message.serializedSessionKey,
        chainId: message.chainId,
        nonce: message.nonce,
      },
      signature: signature as `0x${string}`,
    });

    sigLogger.debug("EIP-712 signature verified successfully", {
      walletAddress,
      chainId,
    });

    return {
      isValid: true,
      walletAddress,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    sigLogger.debug("EIP-712 signature verification failed", {
      error: errorMessage,
    });

    return {
      isValid: false,
      error: errorMessage,
    };
  }
}

/**
 * Helper to get the typed data for client-side signing
 * Client should use this structure with wallet.signTypedData()
 */
export function getAuthorizationTypedData(
  smartAccountAddress: string,
  privateKey: string,
  serializedSessionKey: string,
  chainId: number,
  nonce: number
) {
  return {
    domain: {
      ...AUTHORIZATION_DOMAIN,
      chainId,
    },
    types: AUTHORIZATION_TYPES,
    primaryType: "Authorization" as const,
    message: {
      smartAccountAddress: smartAccountAddress as `0x${string}`,
      privateKey,
      serializedSessionKey,
      chainId: BigInt(chainId),
      nonce: BigInt(nonce),
    },
  };
}
