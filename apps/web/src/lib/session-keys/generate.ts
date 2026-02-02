import type { Address } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { SESSION_KEY_CONFIG } from "@/config/smart-account";
import type { SessionKeyData } from "@/lib/smart-account/types";

/**
 * Generate a new session key pair
 * @param smartAccountAddress - The Smart Account address this key will be associated with
 * @param ownerAddress - The EOA address that owns the smart account (needed for account derivation)
 * @returns The generated session key data
 */
export function generateSessionKey(
  smartAccountAddress: Address,
  ownerAddress: Address
): SessionKeyData {
  // Generate a random private key
  const privateKey = generatePrivateKey();

  // Derive the public address from the private key
  const account = privateKeyToAccount(privateKey);

  const now = Date.now();

  return {
    privateKey,
    publicKey: account.address,
    createdAt: now,
    expiresAt: now + SESSION_KEY_CONFIG.validityPeriod * 1000, // Convert to ms
    smartAccountAddress,
    ownerAddress,
    isApproved: false, // Not approved yet
  };
}

/**
 * Check if a session key is expired
 * @param sessionKey - The session key to check
 * @returns Whether the key has expired
 */
export function isSessionKeyExpired(sessionKey: SessionKeyData): boolean {
  return Date.now() > sessionKey.expiresAt;
}

/**
 * Check if a session key is valid (exists, not expired, and approved)
 * @param sessionKey - The session key to check
 * @returns Whether the key is valid for use
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
 * @param sessionKey - The session key to check
 * @returns Whether the key can be used for transactions
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
 * @param sessionKey - The session key to check
 * @returns Remaining time in milliseconds, or 0 if expired
 */
export function getSessionKeyRemainingTime(sessionKey: SessionKeyData): number {
  const remaining = sessionKey.expiresAt - Date.now();
  return Math.max(0, remaining);
}

/**
 * Get an account object from session key data (for signing)
 * @param sessionKey - The session key data
 * @returns The viem Account object
 */
export function getSessionKeyAccount(sessionKey: SessionKeyData) {
  return privateKeyToAccount(sessionKey.privateKey);
}
