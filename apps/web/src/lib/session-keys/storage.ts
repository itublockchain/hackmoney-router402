import type { SessionKeyData, SessionKeyForBackend } from "@router402/sdk";
import { exportSessionKeyForBackend as sdkExportSessionKeyForBackend } from "@router402/sdk";
import type { Address } from "viem";
import {
  SESSION_KEY_CONFIG,
  SMART_ACCOUNT_CONFIG,
} from "@/config/smart-account";
import { isSessionKeyExpired } from "./generate";

/**
 * Session Key storage structure (indexed by smart account address)
 */
export interface SessionKeyStorage {
  [smartAccountAddress: Address]: SessionKeyData[];
}

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
 */
export function getSessionKeysForAccount(
  smartAccountAddress: Address
): SessionKeyData[] {
  const storage = loadSessionKeys();
  return storage[smartAccountAddress] || [];
}

/**
 * Get the most recent valid and approved session key for a Smart Account
 */
export function getActiveSessionKey(
  smartAccountAddress: Address
): SessionKeyData | undefined {
  const keys = getSessionKeysForAccount(smartAccountAddress);

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
 */
export function storeSessionKey(sessionKey: SessionKeyData): void {
  const storage = loadSessionKeys();
  const accountKeys = storage[sessionKey.smartAccountAddress] || [];

  accountKeys.push(sessionKey);

  const prunedKeys = accountKeys
    .filter((key) => !isSessionKeyExpired(key))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, SESSION_KEY_CONFIG.maxKeysPerAccount);

  storage[sessionKey.smartAccountAddress] = prunedKeys;
  saveSessionKeys(storage);
}

/**
 * Update a session key with serialized approval data
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
 */
export function exportSessionKeyForBackend(
  sessionKey: SessionKeyData
): SessionKeyForBackend | null {
  return sdkExportSessionKeyForBackend(
    sessionKey,
    SMART_ACCOUNT_CONFIG.chainId
  );
}
