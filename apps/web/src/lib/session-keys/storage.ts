import type { SessionKeyData, SessionKeyForBackend } from "@router402/sdk";
import {
  isSessionKeyExpired,
  exportSessionKeyForBackend as sdkExportSessionKeyForBackend,
} from "@router402/sdk";
import type { Address } from "viem";
import { SESSION_KEY_CONFIG, SMART_ACCOUNT_CONFIG } from "@/config";

/**
 * Session Key storage structure (one session key per smart account)
 */
interface SessionKeyStorage {
  [smartAccountAddress: Address]: SessionKeyData;
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
function loadSessionKeys(): SessionKeyStorage {
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
function saveSessionKeys(storage: SessionKeyStorage): void {
  if (!isLocalStorageAvailable()) return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
  } catch (err) {
    console.error("Failed to save session keys to localStorage", err);
  }
}

/**
 * Get the session key for a specific Smart Account.
 * Returns the key only if it is valid (not expired, approved, and has serialized data).
 */
export function getActiveSessionKey(
  smartAccountAddress: Address
): SessionKeyData | undefined {
  const storage = loadSessionKeys();
  const key = storage[smartAccountAddress];

  if (!key) return undefined;
  if (isSessionKeyExpired(key)) return undefined;
  if (!key.isApproved || !key.serializedSessionKey) return undefined;

  return key;
}

/**
 * Get the raw session key for a Smart Account (regardless of approval/expiry status).
 */
export function getSessionKeyForAccount(
  smartAccountAddress: Address
): SessionKeyData | undefined {
  const storage = loadSessionKeys();
  return storage[smartAccountAddress];
}

/**
 * Store a session key for a Smart Account.
 * Replaces any existing key for this account.
 */
export function storeSessionKey(sessionKey: SessionKeyData): void {
  const storage = loadSessionKeys();
  storage[sessionKey.smartAccountAddress] = sessionKey;
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
  const key = storage[smartAccountAddress];

  if (!key || key.publicKey !== publicKey) return;

  storage[smartAccountAddress] = {
    ...key,
    isApproved: true,
    serializedSessionKey,
  };
  saveSessionKeys(storage);
}

/**
 * Remove the session key for a Smart Account
 */
export function removeSessionKey(smartAccountAddress: Address): void {
  const storage = loadSessionKeys();
  delete storage[smartAccountAddress];
  saveSessionKeys(storage);
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

const AUTH_TOKEN_KEY = "router402_auth_tokens";

/**
 * Auth token storage structure (one token per smart account address)
 */
interface AuthTokenStorage {
  [smartAccountAddress: Address]: string;
}

function loadAuthTokens(): AuthTokenStorage {
  if (!isLocalStorageAvailable()) return {};

  try {
    const data = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!data) return {};
    return JSON.parse(data) as AuthTokenStorage;
  } catch {
    return {};
  }
}

function saveAuthTokens(storage: AuthTokenStorage): void {
  if (!isLocalStorageAvailable()) return;

  try {
    localStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify(storage));
  } catch (err) {
    console.error("Failed to save auth tokens to localStorage", err);
  }
}

/**
 * Store the authentication token for a specific smart account
 */
export function storeAuthToken(
  token: string,
  smartAccountAddress: Address
): void {
  const storage = loadAuthTokens();
  storage[smartAccountAddress] = token;
  saveAuthTokens(storage);
}

/**
 * Get the stored authentication token for a specific smart account
 */
export function getAuthToken(smartAccountAddress: Address): string | null {
  const storage = loadAuthTokens();
  return storage[smartAccountAddress] ?? null;
}

/**
 * Remove the stored authentication token for a specific smart account
 */
export function removeAuthToken(smartAccountAddress: Address): void {
  const storage = loadAuthTokens();
  delete storage[smartAccountAddress];
  saveAuthTokens(storage);
}
