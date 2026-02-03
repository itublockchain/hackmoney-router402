import {
  type SessionKeyData,
  canUseSessionKey as sdkCanUseSessionKey,
  getSessionKeyAccount as sdkGetSessionKeyAccount,
  getSessionKeyRemainingTime as sdkGetSessionKeyRemainingTime,
  isSessionKeyExpired as sdkIsSessionKeyExpired,
  isSessionKeyValid as sdkIsSessionKeyValid,
} from "@router402/sdk";
import type { Address } from "viem";
import { router402Sdk } from "@/config/smart-account";

// Re-export types
export type { SessionKeyData };

/**
 * Generate a new session key pair
 */
export function generateSessionKey(
  smartAccountAddress: Address,
  ownerAddress: Address
): SessionKeyData {
  if (!router402Sdk) {
    throw new Error("Router402 SDK is not configured");
  }
  return router402Sdk.generateSessionKey(smartAccountAddress, ownerAddress);
}

/**
 * Check if a session key is expired
 */
export function isSessionKeyExpired(sessionKey: SessionKeyData): boolean {
  return sdkIsSessionKeyExpired(sessionKey);
}

/**
 * Check if a session key is valid (exists, not expired, and approved)
 */
export function isSessionKeyValid(
  sessionKey: SessionKeyData | undefined
): boolean {
  return sdkIsSessionKeyValid(sessionKey);
}

/**
 * Check if a session key can be used (approved with serialized data)
 */
export function canUseSessionKey(sessionKey: SessionKeyData): boolean {
  return sdkCanUseSessionKey(sessionKey);
}

/**
 * Get the remaining validity time for a session key
 */
export function getSessionKeyRemainingTime(sessionKey: SessionKeyData): number {
  return sdkGetSessionKeyRemainingTime(sessionKey);
}

/**
 * Get an account object from session key data (for signing)
 */
export function getSessionKeyAccount(sessionKey: SessionKeyData) {
  return sdkGetSessionKeyAccount(sessionKey);
}
