"use client";

import type { SessionKeyData, SessionKeyForBackend } from "@router402/sdk";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Address } from "viem";
import { useAccount, useSwitchChain, useWalletClient } from "wagmi";
import { router402Sdk, SMART_ACCOUNT_CONFIG } from "@/config/smart-account";
import {
  exportSessionKeyForBackend,
  generateSessionKey,
  getActiveSessionKey,
  storeSessionKey,
  updateSessionKeyApproval,
} from "@/lib/session-keys";
import {
  getSmartAccountInfo,
  SmartAccountError,
  sendUserOperation,
} from "@/lib/smart-account";
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
 * 6. (TODO) Send session key to backend
 *
 * This hook automatically runs the flow when the wallet connects.
 */
export function useRouter402(): UseRouter402Return {
  const { address: eoaAddress, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient({
    chainId: SMART_ACCOUNT_CONFIG.chainId,
  });
  const { switchChainAsync } = useSwitchChain();

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

  // Track initialization to prevent duplicate calls
  const isInitializing = useRef(false);
  const lastInitializedEoa = useRef<Address | undefined>(undefined);

  /**
   * Ensure the wallet is on the correct chain before performing operations
   */
  const ensureCorrectChain = useCallback(async () => {
    const targetChainId = SMART_ACCOUNT_CONFIG.chainId;
    await switchChainAsync({ chainId: targetChainId });
  }, [switchChainAsync]);

  /**
   * Send session key to backend for storage
   * TODO: Implement this when backend endpoint is ready
   */
  const sendSessionKeyToBackend = useCallback(
    async (sessionKeyData: SessionKeyForBackend): Promise<void> => {
      // TODO: Implement API call to send session key to backend
      // Example:
      // await fetch('/api/session-keys', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(sessionKeyData),
      // });
      console.log(
        "[Router402] TODO: Send session key to backend:",
        sessionKeyData.smartAccountAddress
      );
    },
    []
  );

  /**
   * Main initialization flow
   */
  const initialize = useCallback(async () => {
    // Prevent duplicate initialization
    if (isInitializing.current) return;
    if (!walletClient || !eoaAddress) {
      setStatus("disconnected");
      return;
    }
    if (!SMART_ACCOUNT_CONFIG.isConfigured) {
      setStatus("not_configured");
      setError(new Error("Pimlico API key is not configured"));
      return;
    }

    // Skip if already initialized for this EOA
    if (
      lastInitializedEoa.current === eoaAddress &&
      smartAccountAddress &&
      isDeployed &&
      activeSessionKey
    ) {
      setStatus("ready");
      return;
    }

    isInitializing.current = true;
    setError(undefined);

    try {
      // Step 1: Get Smart Account info
      setStatus("initializing");
      setLoading(true);

      await ensureCorrectChain();

      const info = await getSmartAccountInfo(walletClient, eoaAddress);

      updateState({
        address: info.address,
        eoaAddress: info.eoaAddress,
        isDeployed: info.isDeployed,
        isLoading: false,
        error: undefined,
      });
      updateLastChecked();

      // Step 2: Deploy Smart Account if not deployed
      if (!info.isDeployed) {
        setStatus("deploying");

        const deployResult = await sendUserOperation(walletClient, [
          {
            to: info.address,
            value: BigInt(0),
            data: "0x",
          },
        ]);

        if (!deployResult.success) {
          throw new Error("Failed to deploy Smart Account");
        }

        updateState({
          isDeployed: true,
          deploymentTxHash: deployResult.txHash,
        });
        updateLastChecked();
      }

      // Step 3: Check for existing valid session key
      let sessionKey = getActiveSessionKey(info.address);

      // Step 4: Create session key if none exists
      if (!sessionKey) {
        setStatus("creating_session_key");

        const newKey = generateSessionKey(info.address, eoaAddress);
        storeSessionKey(newKey);

        // Step 5: Approve the session key
        setStatus("approving_session_key");

        if (!router402Sdk) {
          throw new Error("Router402 SDK is not configured");
        }

        const approvedKey = await router402Sdk.approveSessionKey(
          walletClient,
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

      // Step 6: Send session key to backend
      if (sessionKey) {
        const backendData = exportSessionKeyForBackend(sessionKey);
        if (backendData) {
          await sendSessionKeyToBackend(backendData);
        }
      }

      lastInitializedEoa.current = eoaAddress;
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
      setStoreError(error);
      setStatus("error");
    } finally {
      isInitializing.current = false;
      setLoading(false);
    }
  }, [
    walletClient,
    eoaAddress,
    smartAccountAddress,
    isDeployed,
    activeSessionKey,
    ensureCorrectChain,
    setLoading,
    setStoreError,
    updateState,
    updateLastChecked,
    sendSessionKeyToBackend,
  ]);

  /**
   * Get session key data for backend use
   */
  const sessionKeyForBackend = activeSessionKey
    ? exportSessionKeyForBackend(activeSessionKey)
    : null;

  /**
   * Check if everything is ready
   */
  const isReady = status === "ready" && !!activeSessionKey;

  /**
   * Handle wallet connection changes
   */
  useEffect(() => {
    if (!isConnected || !eoaAddress) {
      setStatus("disconnected");
      setActiveSessionKey(undefined);
      if (storedEoaAddress && storedEoaAddress !== eoaAddress) {
        reset();
        lastInitializedEoa.current = undefined;
      }
      return;
    }

    if (storedEoaAddress && storedEoaAddress !== eoaAddress) {
      reset();
      lastInitializedEoa.current = undefined;
    }

    // Auto-initialize on wallet connect
    initialize();
  }, [isConnected, eoaAddress, storedEoaAddress, reset, initialize]);

  /**
   * Load existing session key on mount if smart account is already set
   */
  useEffect(() => {
    if (smartAccountAddress && isDeployed) {
      const existingKey = getActiveSessionKey(smartAccountAddress);
      if (existingKey) {
        setActiveSessionKey(existingKey);
        if (status !== "ready" && !isInitializing.current) {
          setStatus("ready");
        }
      }
    }
  }, [smartAccountAddress, isDeployed, status]);

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
