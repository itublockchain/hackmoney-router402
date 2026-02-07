import type { Address } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type {
  SmartAccountResolvedConfig as ResolvedConfig,
  SessionKeyData,
  SessionKeyForBackend,
} from "./types.js";

/**
 * Generate a new session key pair
 */
export function generateSessionKey(
  smartAccountAddress: Address,
  ownerAddress: Address,
  config: ResolvedConfig
): SessionKeyData {
  // Generate a random private key
  const privateKey = generatePrivateKey();

  // Derive the public address from the private key
  const account = privateKeyToAccount(privateKey);

  const now = Date.now();
  const validityPeriodMs = config.sessionKeyValidityPeriod * 1000;

  return {
    privateKey,
    publicKey: account.address,
    createdAt: now,
    expiresAt: now + validityPeriodMs,
    smartAccountAddress,
    ownerAddress,
    isApproved: false,
  };
}

/**
 * Check if a session key is expired
 */
export function isSessionKeyExpired(sessionKey: SessionKeyData): boolean {
  return Date.now() > sessionKey.expiresAt;
}

/**
 * Check if a session key is valid (exists, not expired, and approved)
 */
export function isSessionKeyValid(
  sessionKey: SessionKeyData | undefined
): boolean {
  if (!sessionKey) return false;
  if (isSessionKeyExpired(sessionKey)) return false;
  if (!sessionKey.isApproved || !sessionKey.serializedSessionKey) return false;
  return true;
}

/**
 * Check if a session key can be used (approved with serialized data)
 */
export function canUseSessionKey(sessionKey: SessionKeyData): boolean {
  return (
    sessionKey.isApproved &&
    !!sessionKey.serializedSessionKey &&
    !isSessionKeyExpired(sessionKey)
  );
}

/**
 * Get the remaining validity time for a session key
 */
export function getSessionKeyRemainingTime(sessionKey: SessionKeyData): number {
  const remaining = sessionKey.expiresAt - Date.now();
  return Math.max(0, remaining);
}

/**
 * Get an account object from session key data (for signing)
 */
export function getSessionKeyAccount(sessionKey: SessionKeyData) {
  return privateKeyToAccount(sessionKey.privateKey);
}

/**
 * Export session key data for backend use
 * Returns the data needed by the backend to send transactions
 */
export function exportSessionKeyForBackend(
  sessionKey: SessionKeyData,
  chainId: number
): SessionKeyForBackend | null {
  if (!sessionKey.isApproved || !sessionKey.serializedSessionKey) {
    return null;
  }

  return {
    privateKey: sessionKey.privateKey,
    serializedSessionKey: sessionKey.serializedSessionKey,
    smartAccountAddress: sessionKey.smartAccountAddress,
    chainId,
  };
}

/**
 * Mark a session key as approved with the serialized approval data
 */
export function markSessionKeyApproved(
  sessionKey: SessionKeyData,
  serializedSessionKey: string
): SessionKeyData {
  return {
    ...sessionKey,
    isApproved: true,
    serializedSessionKey,
  };
}
