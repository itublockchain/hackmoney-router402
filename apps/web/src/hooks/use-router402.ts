"use client";

import {
  type SessionKeyData,
  type SessionKeyForBackend,
  SmartAccountError,
} from "@router402/sdk";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { type Address, isAddressEqual } from "viem";
import { useConnection, useSwitchChain, useWalletClient } from "wagmi";
import { SMART_ACCOUNT_CONFIG } from "@/config";
import { initializeRouter402, type Router402Status } from "@/lib/router402";
import {
  exportSessionKeyForBackend,
  getActiveSessionKey,
  getAuthToken,
} from "@/lib/session-keys";
import { useAuthStore, useSmartAccountStore } from "@/stores";

export type { Router402Status };

interface UseRouter402Return {
  status: Router402Status;
  smartAccountAddress: Address | undefined;
  eoaAddress: Address | undefined;
  isDeployed: boolean;
  activeSessionKey: SessionKeyData | undefined;
  sessionKeyForBackend: SessionKeyForBackend | null;
  authToken: string | undefined;
  error: Error | undefined;
  isConnected: boolean;
  isReady: boolean;
  initialize: () => Promise<void>;
  isConnecting: boolean;
  isReconnecting: boolean;
}

/**
 * Unified hook that orchestrates the Router402 setup flow.
 *
 * Design:
 * - Single effect triggers setup when wallet connects
 * - Fast path: if session key + auth token exist in localStorage, skip to "ready"
 * - Slow path: run full SDK setup (deploy, session key, approve, enable, backend auth)
 * - Wallet switches reset everything and re-trigger
 * - No competing state machines or sync effects
 */
export function useRouter402(): UseRouter402Return {
  const {
    address: eoaAddress,
    isConnected,
    isConnecting,
    isReconnecting,
  } = useConnection();

  // Use walletClient WITHOUT chain filter — we switch chains inside initialize()
  const { data: walletClient } = useWalletClient();
  const { mutateAsync: switchChainAsync } = useSwitchChain();

  const queryClient = useQueryClient();

  const {
    address: smartAccountAddress,
    eoaAddress: storedEoaAddress,
    isDeployed,
    setLoading,
    setError: setStoreError,
    updateState,
    reset,
    updateLastChecked,
  } = useSmartAccountStore();

  const [status, setStatus] = useState<Router402Status>("disconnected");
  const [error, setError] = useState<Error | undefined>(undefined);
  const [activeSessionKey, setActiveSessionKey] = useState<
    SessionKeyData | undefined
  >(undefined);
  const [authToken, setAuthToken] = useState<string | undefined>(undefined);

  // Track the EOA we last initialized for to detect wallet switches
  const initializedForEoa = useRef<Address | undefined>(undefined);
  // Guard against concurrent initialize() calls
  const isRunning = useRef(false);

  // Refs for values used inside initialize() — avoids stale closures
  const walletClientRef = useRef(walletClient);
  const eoaAddressRef = useRef(eoaAddress);
  const switchChainRef = useRef(switchChainAsync);
  const setLoadingRef = useRef(setLoading);
  const setStoreErrorRef = useRef(setStoreError);
  const updateStateRef = useRef(updateState);
  const updateLastCheckedRef = useRef(updateLastChecked);

  walletClientRef.current = walletClient;
  eoaAddressRef.current = eoaAddress;
  switchChainRef.current = switchChainAsync;
  setLoadingRef.current = setLoading;
  setStoreErrorRef.current = setStoreError;
  updateStateRef.current = updateState;
  updateLastCheckedRef.current = updateLastChecked;

  /**
   * Run the full setup pipeline. Can be called automatically or via retry button.
   */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialize = useCallback(async () => {
    const client = walletClientRef.current;
    const eoa = eoaAddressRef.current;

    if (isRunning.current) return;
    if (!client || !eoa) return;

    // Verify the walletClient's signer matches the target EOA.
    // After a MetaMask account switch, eoaAddress updates immediately but
    // walletClient is re-fetched asynchronously via TanStack Query. During
    // this window the old client is still cached — skip until the new one arrives.
    if (!isAddressEqual(client.account?.address, eoa)) {
      return;
    }

    if (!SMART_ACCOUNT_CONFIG.isConfigured) {
      setStatus("error");
      setError(new Error("Pimlico API key is not configured"));
      return;
    }

    isRunning.current = true;
    // Mark this EOA as "in progress" immediately so the useEffect won't
    // re-trigger initialize() when Zustand store updates mid-flow cause
    // dependency changes (e.g. smartAccountAddress gets set during setup).
    initializedForEoa.current = eoa;
    setError(undefined);
    setStatus("initializing");
    setLoadingRef.current(true);

    try {
      // Fast path: if Zustand store already has the smart account for this EOA
      // and localStorage has both a valid session key and auth token, skip
      // everything (including the chain switch) and go straight to "ready".
      const store = useSmartAccountStore.getState();
      if (store.address && store.eoaAddress === eoa && store.isDeployed) {
        const cachedKey = getActiveSessionKey(store.address);
        const cachedToken = getAuthToken(store.address);
        if (cachedKey && cachedToken) {
          setActiveSessionKey(cachedKey);
          setAuthToken(cachedToken);
          setStatus("ready");
          initializedForEoa.current = eoa;
          setLoadingRef.current(false);
          isRunning.current = false;
          return;
        }
      }

      // Switch to the correct chain first
      await switchChainRef.current({
        chainId: SMART_ACCOUNT_CONFIG.chainId,
      });

      const result = await initializeRouter402({
        client,
        eoa,
        onStatus: setStatus,
        onStoreUpdate: (state) => updateStateRef.current(state),
        onLastChecked: () => updateLastCheckedRef.current(),
      });

      setActiveSessionKey(result.sessionKey);
      setAuthToken(result.authToken);
      setStatus("ready");
    } catch (err) {
      const wrapped =
        err instanceof SmartAccountError
          ? err
          : new Error(
              err instanceof Error
                ? err.message
                : "Failed to initialize Router402"
            );

      console.error(err);
      setError(wrapped);
      setStoreErrorRef.current(wrapped);
      setStatus("error");
      // Reset so the retry button can re-trigger initialize()
      initializedForEoa.current = undefined;
    }

    setLoadingRef.current(false);
    isRunning.current = false;
  }, []);

  /**
   * Try the fast path: check localStorage for existing valid session.
   * Returns true if we found a valid session and set status to "ready".
   */
  const tryFastPath = useCallback((saAddress: Address): boolean => {
    const existingKey = getActiveSessionKey(saAddress);
    const existingToken = getAuthToken(saAddress);
    if (existingKey && existingToken) {
      setActiveSessionKey(existingKey);
      setAuthToken(existingToken);
      setStatus("ready");
      return true;
    }
    return false;
  }, []);

  /**
   * Main effect: triggers setup when wallet connects.
   *
   * Flow:
   * 1. Not connected → "disconnected", clear state
   * 2. Connected but no walletClient yet → "not_configured" (waiting)
   * 3. Connected + walletClient → check store for smart account address
   *    a. If store has address → try fast path (localStorage session key)
   *    b. If fast path succeeds → "ready"
   *    c. If fast path fails or no store address → run initialize()
   */
  useEffect(() => {
    // Disconnected: reset everything
    if (!isConnected || !eoaAddress) {
      setStatus("disconnected");
      setActiveSessionKey(undefined);
      setAuthToken(undefined);
      setError(undefined);
      initializedForEoa.current = undefined;
      isRunning.current = false;
      useAuthStore.getState().logout();
      return;
    }

    // Wallet switched: reset store and allow re-initialization
    if (initializedForEoa.current && initializedForEoa.current !== eoaAddress) {
      reset();
      initializedForEoa.current = undefined;
      isRunning.current = false;
      setActiveSessionKey(undefined);
      setAuthToken(undefined);
      setError(undefined);
      setStatus("not_configured");
      useAuthStore.getState().logout();
      // Flush all TanStack Query caches (balances, contract reads, wallet client)
      // to prevent stale data from the previous account leaking through.
      queryClient.invalidateQueries();
      // Fall through — will trigger init below or on next render when walletClient updates
    }

    // Already initialized for this EOA
    if (initializedForEoa.current === eoaAddress) return;

    // No wallet client yet, or wallet client still belongs to previous account —
    // wait for wagmi to re-fetch the correct one after account switch.
    if (
      !walletClient ||
      walletClient.account?.address.toLowerCase() !== eoaAddress.toLowerCase()
    ) {
      setStatus("not_configured");
      return;
    }

    // Try fast path: check if store already has the smart account address
    // for THIS EOA (persisted from a previous session via Zustand persist).
    // Skip if the store has data from a different wallet.
    if (smartAccountAddress && storedEoaAddress === eoaAddress) {
      if (tryFastPath(smartAccountAddress)) {
        initializedForEoa.current = eoaAddress;
        return;
      }
    }

    // Run full initialization. Use a small delay to let React state settle
    // (prevents firing during wagmi's reconnect flicker).
    const timer = setTimeout(() => {
      initialize();
    }, 300);

    return () => clearTimeout(timer);
  }, [
    isConnected,
    eoaAddress,
    walletClient,
    smartAccountAddress,
    storedEoaAddress,
    reset,
    initialize,
    tryFastPath,
    queryClient,
  ]);

  const sessionKeyForBackend = activeSessionKey
    ? exportSessionKeyForBackend(activeSessionKey)
    : null;

  const isReady = status === "ready" && !!activeSessionKey && !!authToken;

  return {
    status,
    smartAccountAddress,
    eoaAddress,
    isDeployed,
    activeSessionKey,
    sessionKeyForBackend,
    authToken,
    error,
    isConnected,
    isReady,
    initialize,
    isConnecting,
    isReconnecting,
  };
}
