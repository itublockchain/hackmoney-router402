"use client";

import {
  type SessionKeyData,
  type SessionKeyForBackend,
  SmartAccountError,
} from "@router402/sdk";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Address } from "viem";
import { useConnection, useSwitchChain, useWalletClient } from "wagmi";
import { SMART_ACCOUNT_CONFIG } from "@/config";
import {
  checkSyncStatus,
  initializeRouter402,
  type Router402Status,
} from "@/lib/router402";
import { exportSessionKeyForBackend, getAuthToken } from "@/lib/session-keys";
import { useSmartAccountStore } from "@/stores";

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
 * Business logic lives in `lib/router402/`:
 * - `status.ts`     — synchronous status computation
 * - `initialize.ts` — async setup flow (deploy, session key, authorize)
 * - `authorize.ts`  — EIP-712 signing + backend submission
 *
 * The hook only wires React state, refs, and effects.
 */
export function useRouter402(): UseRouter402Return {
  const {
    address: eoaAddress,
    isConnected,
    isConnecting,
    isReconnecting,
  } = useConnection();
  const { data: walletClient } = useWalletClient({
    chainId: SMART_ACCOUNT_CONFIG.chainId,
  });
  const { mutateAsync: switchChainAsync } = useSwitchChain();

  const {
    address: smartAccountAddress,
    isDeployed,
    eoaAddress: storedEoaAddress,
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
  const [storeHydrated, setStoreHydrated] = useState(false);

  // Refs for unstable values — lets `initialize` read current values
  // without being in its dependency array.
  const isRunning = useRef(false);
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

  // Listen for Zustand store hydration
  useEffect(() => {
    const unsub = useSmartAccountStore.persist.onFinishHydration(() => {
      setStoreHydrated(true);
    });
    if (useSmartAccountStore.persist.hasHydrated()) {
      setStoreHydrated(true);
    }
    return unsub;
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialize = useCallback(async () => {
    const client = walletClientRef.current;
    const eoa = eoaAddressRef.current;

    if (isRunning.current) return;
    if (!client || !eoa) {
      setStatus("disconnected");
      return;
    }
    if (!SMART_ACCOUNT_CONFIG.isConfigured) {
      setStatus("not_configured");
      setError(new Error("Pimlico API key is not configured"));
      return;
    }

    isRunning.current = true;
    setError(undefined);
    setLoadingRef.current(true);

    try {
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

      setError(wrapped);
      setStoreErrorRef.current(wrapped);
      setStatus("error");
    } finally {
      isRunning.current = false;
      setLoadingRef.current(false);
    }
  }, []);

  const sessionKeyForBackend = activeSessionKey
    ? exportSessionKeyForBackend(activeSessionKey)
    : null;

  const isReady = status === "ready" && !!activeSessionKey && !!getAuthToken();

  // Synchronous state check — never triggers signing or async ops
  useEffect(() => {
    const result = checkSyncStatus({
      isConnected,
      eoaAddress,
      storedEoaAddress,
      storeHydrated,
    });

    if (result.shouldReset) {
      reset();
      return;
    }

    if (result.status === "disconnected") {
      setStatus("disconnected");
      setActiveSessionKey(undefined);
      return;
    }

    if (result.status === null) return;

    if (result.status === "ready") {
      setActiveSessionKey(result.activeSessionKey);
      setAuthToken(getAuthToken() ?? undefined);
      setStatus("ready");
      return;
    }

    setStatus((prev) => {
      if (prev === "disconnected" || prev === "not_configured") {
        return "not_configured";
      }
      return prev;
    });
  }, [isConnected, eoaAddress, storedEoaAddress, storeHydrated, reset]);

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
