"use client";

import {
  type SessionKeyData,
  type SessionKeyForBackend,
  SmartAccountError,
} from "@router402/sdk";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Address } from "viem";
import { useConnection, useSwitchChain, useWalletClient } from "wagmi";
import { router402Sdk, SMART_ACCOUNT_CONFIG } from "@/config";
import {
  exportSessionKeyForBackend,
  getActiveSessionKey,
  getAuthToken,
  storeAuthToken,
  storeSessionKey,
  updateSessionKeyApproval,
} from "@/lib/session-keys";
import {
  getSmartAccountInfo,
  sendUserOperation,
} from "@/lib/smart-account/client";
import { useSmartAccountStore } from "@/stores";

/**
 * Possible states for the Router402 initialization flow
 */
export type Router402Status =
  | "disconnected" // Wallet not connected
  | "not_configured" // Pimlico API key not set
  | "initializing" // Loading smart account info
  | "deploying" // Deploying smart account
  | "creating_session_key" // Creating new session key
  | "approving_session_key" // Approving session key on-chain
  | "sending_to_backend" // Sending session key to backend
  | "ready" // Everything ready to use
  | "error"; // An error occurred

interface UseRouter402Return {
  /** Current status of the Router402 setup */
  status: Router402Status;
  /** Smart Account address (deterministic) */
  smartAccountAddress: Address | undefined;
  /** Owner EOA address */
  eoaAddress: Address | undefined;
  /** Whether the Smart Account is deployed on-chain */
  isDeployed: boolean;
  /** The active session key (approved and not expired) */
  activeSessionKey: SessionKeyData | undefined;
  /** Session key data formatted for backend use */
  sessionKeyForBackend: SessionKeyForBackend | null;
  /** Error from last operation */
  error: Error | undefined;
  /** Whether the wallet is connected */
  isConnected: boolean;
  /** Whether everything is ready for transactions */
  isReady: boolean;
  /** Manually trigger the initialization flow */
  initialize: () => Promise<void>;
}

/**
 * Unified hook that handles the complete Router402 setup flow:
 * 1. Calculate Smart Account address
 * 2. Deploy Smart Account if not deployed
 * 3. Create session key if not exists
 * 4. Approve session key if not approved
 * 5. Store in localStorage
 * 6. Send session key to backend with signed message auth
 *
 * IMPORTANT: The initialization flow (which triggers wallet signing) is only
 * run when `initialize()` is called explicitly. The hook's useEffect only
 * performs synchronous state checks (fast path) — it never triggers signing.
 */
export function useRouter402(): UseRouter402Return {
  const { address: eoaAddress, isConnected } = useConnection();
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
  const [storeHydrated, setStoreHydrated] = useState(false);

  // === Refs for ALL unstable values ===
  // These let `initialize` read current values without being in its dep array.
  const isRunning = useRef(false);
  const walletClientRef = useRef(walletClient);
  const eoaAddressRef = useRef(eoaAddress);
  const switchChainRef = useRef(switchChainAsync);
  const setLoadingRef = useRef(setLoading);
  const setStoreErrorRef = useRef(setStoreError);
  const updateStateRef = useRef(updateState);
  const updateLastCheckedRef = useRef(updateLastChecked);

  // Keep refs in sync on every render
  walletClientRef.current = walletClient;
  eoaAddressRef.current = eoaAddress;
  switchChainRef.current = switchChainAsync;
  setLoadingRef.current = setLoading;
  setStoreErrorRef.current = setStoreError;
  updateStateRef.current = updateState;
  updateLastCheckedRef.current = updateLastChecked;

  // Listen for Zustand store hydration from persist middleware.
  // The persist middleware hydrates asynchronously, so the first render
  // may see empty state. Once hydration completes, we re-check.
  useEffect(() => {
    const unsub = useSmartAccountStore.persist.onFinishHydration(() => {
      setStoreHydrated(true);
    });
    // If already hydrated (e.g. fast load), check synchronously
    if (useSmartAccountStore.persist.hasHydrated()) {
      setStoreHydrated(true);
    }
    return unsub;
  }, []);

  /**
   * Main initialization flow. This is called MANUALLY (from setup page button
   * or from the auto-init effect at most once). It reads all external values
   * from refs so that the callback identity never changes.
   *
   * eslint-disable-next-line react-hooks/exhaustive-deps — intentionally empty
   * deps; all values are read from refs to prevent re-creation.
   */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialize = useCallback(async () => {
    const client = walletClientRef.current;
    const eoa = eoaAddressRef.current;

    // Prevent concurrent runs
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

    // Fast path: check if setup is already complete synchronously
    const storeState = useSmartAccountStore.getState();
    if (storeState.address && storeState.isDeployed) {
      const existingKey = getActiveSessionKey(storeState.address);
      if (existingKey && getAuthToken()) {
        setActiveSessionKey(existingKey);
        setStatus("ready");
        return;
      }
    }

    isRunning.current = true;
    setError(undefined);

    try {
      // Step 1: Get Smart Account info
      setStatus("initializing");
      setLoadingRef.current(true);

      await switchChainRef.current({
        chainId: SMART_ACCOUNT_CONFIG.chainId,
      });

      const info = await getSmartAccountInfo(client, eoa);

      updateStateRef.current({
        address: info.address,
        eoaAddress: info.eoaAddress,
        isDeployed: info.isDeployed,
        isLoading: false,
        error: undefined,
      });
      updateLastCheckedRef.current();

      // Step 2: Deploy Smart Account if not deployed
      if (!info.isDeployed) {
        setStatus("deploying");

        const deployResult = await sendUserOperation(client, [
          {
            to: info.address,
            value: BigInt(0),
            data: "0x",
          },
        ]);

        if (!deployResult.success) {
          throw new Error("Failed to deploy Smart Account");
        }

        updateStateRef.current({
          isDeployed: true,
          deploymentTxHash: deployResult.txHash,
        });
        updateLastCheckedRef.current();
      }

      // Step 3: Check for existing valid session key
      let sessionKey = getActiveSessionKey(info.address);

      // Step 4: Create and approve session key if none exists
      if (!sessionKey) {
        setStatus("creating_session_key");

        if (!router402Sdk) {
          throw new Error("Router402 SDK is not configured");
        }

        const newKey = router402Sdk.generateSessionKey(info.address, eoa);
        storeSessionKey(newKey);

        // Step 5: Approve the session key (triggers wallet signing)
        setStatus("approving_session_key");

        const approvedKey = await router402Sdk.approveSessionKey(
          client,
          newKey
        );

        if (!approvedKey.serializedSessionKey) {
          throw new Error("Failed to approve session key");
        }

        updateSessionKeyApproval(
          info.address,
          newKey.publicKey,
          approvedKey.serializedSessionKey
        );

        // Refresh the session key from storage
        sessionKey = getActiveSessionKey(info.address);
      }

      setActiveSessionKey(sessionKey);

      // Step 6: Send session key to backend (if no token stored yet)
      if (sessionKey && !getAuthToken()) {
        setStatus("sending_to_backend");

        const backendData = exportSessionKeyForBackend(sessionKey);
        if (backendData) {
          const chainId = backendData.chainId;
          const nonce = Date.now();

          // EIP-712 typed data signature
          const signature = await client.signTypedData({
            account: eoa,
            domain: {
              name: "Router402 Authorization",
              version: "1",
              chainId,
            },
            types: {
              Authorization: [
                { name: "smartAccountAddress", type: "address" },
                { name: "privateKey", type: "string" },
                { name: "serializedSessionKey", type: "string" },
                { name: "eoaAddress", type: "address" },
                { name: "chainId", type: "uint256" },
                { name: "nonce", type: "uint256" },
              ],
            },
            primaryType: "Authorization",
            message: {
              smartAccountAddress:
                backendData.smartAccountAddress as `0x${string}`,
              eoaAddress: eoa as `0x${string}`,
              serializedSessionKey: backendData.serializedSessionKey,
              privateKey: backendData.privateKey,
              chainId: BigInt(chainId),
              nonce: BigInt(nonce),
            },
          });

          console.log("data", {
            smartAccountAddress:
              backendData.smartAccountAddress as `0x${string}`,
            privateKey: backendData.privateKey,
            serializedSessionKey: backendData.serializedSessionKey,
            eoaAddress: eoa as `0x${string}`,
            chainId: BigInt(chainId),
            nonce: BigInt(nonce),
          });

          // const response = await apiClient.post<{
          //   token: string;
          //   sessionKeyId: string;
          // }>("/authorize", {
          //   smartAccountAddress: backendData.smartAccountAddress,
          //   privateKey: backendData.privateKey,
          //   serializedSessionKey: backendData.serializedSessionKey,
          //   chainId,
          //   nonce,
          // }, {
          //   headers: { "x-authorization-signature": signature },
          // });

          // storeAuthToken(response.data.token);

          // Set mock token for now
          console.log("signature", signature);
          storeAuthToken("mock-token");
        }
      }

      setStatus("ready");
    } catch (err) {
      const error =
        err instanceof SmartAccountError
          ? err
          : new Error(
              err instanceof Error
                ? err.message
                : "Failed to initialize Router402"
            );

      setError(error);
      setStoreErrorRef.current(error);
      setStatus("error");
    } finally {
      isRunning.current = false;
      setLoadingRef.current(false);
    }
  }, []);

  /**
   * Get session key data for backend use
   */
  const sessionKeyForBackend = activeSessionKey
    ? exportSessionKeyForBackend(activeSessionKey)
    : null;

  /**
   * Check if everything is ready
   */
  const isReady = status === "ready" && !!activeSessionKey && !!getAuthToken();

  /**
   * Synchronous state check effect.
   *
   * This effect ONLY performs synchronous reads (localStorage, Zustand store)
   * to determine the correct status. It NEVER triggers wallet signing or
   * async operations. This prevents the double-sign issue.
   *
   * Depends on `storeHydrated` so it re-runs after Zustand persist finishes
   * hydrating from localStorage (which is async and may not be ready on first render).
   */
  useEffect(() => {
    // Handle disconnection
    if (!isConnected || !eoaAddress) {
      setStatus("disconnected");
      setActiveSessionKey(undefined);
      return;
    }

    // Wait for Zustand to hydrate before making any state decisions
    if (!storeHydrated) return;

    // Handle EOA change — reset everything
    if (storedEoaAddress && storedEoaAddress !== eoaAddress) {
      reset();
      return;
    }

    // Synchronous fast path: check if already fully set up
    const storeState = useSmartAccountStore.getState();
    if (storeState.address && storeState.isDeployed) {
      const existingKey = getActiveSessionKey(storeState.address);
      if (existingKey && getAuthToken()) {
        setActiveSessionKey(existingKey);
        setStatus("ready");
        return;
      }
    }

    // Connected, hydrated, but not ready — needs setup.
    // Set to "not_configured" so the guard knows to redirect to /setup.
    // We use a state updater to only transition from idle states,
    // avoiding overwriting active flow states (deploying, approving, etc.).
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
    error,
    isConnected,
    isReady,
    initialize,
  };
}
