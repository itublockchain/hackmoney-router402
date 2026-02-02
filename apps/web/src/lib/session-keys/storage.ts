import type { Address } from "viem";
import {
  SESSION_KEY_CONFIG,
  SMART_ACCOUNT_CONFIG,
} from "@/config/smart-account";
import type {
  SessionKeyData,
  SessionKeyForBackend,
  SessionKeyStorage,
} from "@/lib/smart-account/types";
import { isSessionKeyExpired } from "./generate";

const STORAGE_KEY = SESSION_KEY_CONFIG.storageKey;

/**
 * Check if localStorage is available
 */
function isLocalStorageAvailable(): boolean {
  if (typeof window === "undefined") return false;

  try {
    const test = "__storage_test__";
    window.localStorage.setItem(test, test);
    window.localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Load all session keys from LocalStorage
 * @returns The session key storage object
 */
export function loadSessionKeys(): SessionKeyStorage {
  if (!isLocalStorageAvailable()) return {};

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return {};
    return JSON.parse(data) as SessionKeyStorage;
  } catch {
    console.error("Failed to load session keys from localStorage");
    return {};
  }
}

/**
 * Save session keys to LocalStorage
 * @param storage - The session key storage object to save
 */
export function saveSessionKeys(storage: SessionKeyStorage): void {
  if (!isLocalStorageAvailable()) return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
  } catch (err) {
    console.error("Failed to save session keys to localStorage", err);
  }
}

/**
 * Get session keys for a specific Smart Account
 * @param smartAccountAddress - The Smart Account address
 * @returns Array of session keys for this account
 */
export function getSessionKeysForAccount(
  smartAccountAddress: Address
): SessionKeyData[] {
  const storage = loadSessionKeys();
  return storage[smartAccountAddress] || [];
}

/**
 * Get the most recent valid and approved session key for a Smart Account
 * @param smartAccountAddress - The Smart Account address
 * @returns The most recent valid session key, or undefined if none exists
 */
export function getActiveSessionKey(
  smartAccountAddress: Address
): SessionKeyData | undefined {
  const keys = getSessionKeysForAccount(smartAccountAddress);

  // Filter out expired keys and non-approved keys, sort by creation time (newest first)
  const validKeys = keys
    .filter(
      (key) =>
        !isSessionKeyExpired(key) && key.isApproved && key.serializedSessionKey
    )
    .sort((a, b) => b.createdAt - a.createdAt);

  return validKeys[0];
}

/**
 * Store a new session key for a Smart Account
 * @param sessionKey - The session key to store
 */
export function storeSessionKey(sessionKey: SessionKeyData): void {
  const storage = loadSessionKeys();
  const accountKeys = storage[sessionKey.smartAccountAddress] || [];

  // Add new key
  accountKeys.push(sessionKey);

  // Prune old/expired keys, keeping only the most recent ones
  const prunedKeys = accountKeys
    .filter((key) => !isSessionKeyExpired(key))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, SESSION_KEY_CONFIG.maxKeysPerAccount);

  storage[sessionKey.smartAccountAddress] = prunedKeys;
  saveSessionKeys(storage);
}

/**
 * Update a session key with serialized approval data
 * @param smartAccountAddress - The Smart Account address
 * @param publicKey - The session key's public address
 * @param serializedSessionKey - The serialized permission account from ZeroDev
 */
export function updateSessionKeyApproval(
  smartAccountAddress: Address,
  publicKey: Address,
  serializedSessionKey: string
): void {
  const storage = loadSessionKeys();
  const accountKeys = storage[smartAccountAddress] || [];

  const updatedKeys = accountKeys.map((key) =>
    key.publicKey === publicKey
      ? { ...key, isApproved: true, serializedSessionKey }
      : key
  );

  storage[smartAccountAddress] = updatedKeys;
  saveSessionKeys(storage);
}

/**
 * Remove a specific session key
 * @param smartAccountAddress - The Smart Account address
 * @param publicKey - The session key's public address to remove
 */
export function removeSessionKey(
  smartAccountAddress: Address,
  publicKey: Address
): void {
  const storage = loadSessionKeys();
  const accountKeys = storage[smartAccountAddress] || [];

  storage[smartAccountAddress] = accountKeys.filter(
    (key) => key.publicKey !== publicKey
  );

  saveSessionKeys(storage);
}

/**
 * Clear all session keys for a Smart Account
 * @param smartAccountAddress - The Smart Account address
 */
export function clearSessionKeys(smartAccountAddress: Address): void {
  const storage = loadSessionKeys();
  delete storage[smartAccountAddress];
  saveSessionKeys(storage);
}

/**
 * Clear all stored session keys
 */
export function clearAllSessionKeys(): void {
  if (!isLocalStorageAvailable()) return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Export session key data for backend use
 * Returns the data needed by the backend to send transactions
 * @param sessionKey - The session key data
 * @returns Data for backend or null if session key is not approved
 */
export function exportSessionKeyForBackend(
  sessionKey: SessionKeyData
): SessionKeyForBackend | null {
  if (!sessionKey.isApproved || !sessionKey.serializedSessionKey) {
    return null;
  }

  return {
    privateKey: sessionKey.privateKey,
    serializedSessionKey: sessionKey.serializedSessionKey,
    smartAccountAddress: sessionKey.smartAccountAddress,
    chainId: SMART_ACCOUNT_CONFIG.chainId,
  };
}
