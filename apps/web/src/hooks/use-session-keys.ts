"use client";

import {
  canUseSessionKey,
  getSessionKeyRemainingTime,
  isSessionKeyExpired,
  type SessionKeyData,
  type SessionKeyForBackend,
} from "@router402/sdk";
import { useCallback, useEffect, useState } from "react";
import type { Address } from "viem";
import { useSwitchChain, useWalletClient } from "wagmi";
import { router402Sdk, SMART_ACCOUNT_CONFIG } from "@/config";
import {
  exportSessionKeyForBackend,
  getSessionKeyForAccount,
  removeSessionKey as removeSessionKeyFromStorage,
  storeSessionKey,
  updateSessionKeyApproval,
} from "@/lib/session-keys";

interface UseSessionKeysReturn {
  /** The session key for the smart account (if any) */
  sessionKey: SessionKeyData | undefined;
  /** Whether the session key is active (valid and approved) */
  isActive: boolean;
  /** Whether Pimlico is configured (required for session keys) */
  isConfigured: boolean;
  /** Whether a session key operation is in progress */
  isLoading: boolean;
  /** Whether a session key is being approved */
  isApproving: boolean;
  /** Whether a test transfer is in progress */
  isSendingTestTransfer: boolean;
  /** Hash of the last test transfer */
  lastTestTransferHash: string | undefined;
  /** Error from last operation */
  error: Error | undefined;
  /** Create a new session key (replaces existing one) */
  createSessionKey: () => void;
  /** Approve the current session key (creates serialized permission account) */
  approveSessionKey: () => Promise<void>;
  /** Remove the session key */
  removeSessionKey: () => void;
  /** Refresh session key from storage */
  refreshSessionKey: () => void;
  /** Send a test ETH transfer using the session key */
  sendTestTransfer: (toAddress: Address) => Promise<void>;
  /** Format remaining time for the session key */
  formatRemainingTime: (sessionKey: SessionKeyData) => string;
  /** Export session key data for backend use */
  getSessionKeyForBackend: () => SessionKeyForBackend | null;
}

/**
 * Hook to manage the session key for a Smart Account.
 * Each account has exactly one session key.
 */
export function useSessionKeys(
  smartAccountAddress: Address | undefined
): UseSessionKeysReturn {
  const { data: walletClient } = useWalletClient({
    chainId: SMART_ACCOUNT_CONFIG.chainId,
  });
  const switchChainAsync = useSwitchChain();
  const [sessionKey, setSessionKey] = useState<SessionKeyData | undefined>(
    undefined
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isSendingTestTransfer, setIsSendingTestTransfer] = useState(false);
  const [lastTestTransferHash, setLastTestTransferHash] = useState<
    string | undefined
  >(undefined);
  const [error, setError] = useState<Error | undefined>(undefined);

  /**
   * Ensure the wallet is on the correct chain before performing operations
   */
  const ensureCorrectChain = useCallback(async () => {
    const targetChainId = SMART_ACCOUNT_CONFIG.chainId;
    await switchChainAsync.mutateAsync({ chainId: targetChainId });
  }, [switchChainAsync.mutateAsync]);

  /**
   * Load session key from storage
   */
  const refreshSessionKey = useCallback(() => {
    if (!smartAccountAddress) {
      setSessionKey(undefined);
      return;
    }

    const key = getSessionKeyForAccount(smartAccountAddress);
    if (key && !isSessionKeyExpired(key)) {
      setSessionKey(key);
    } else {
      setSessionKey(undefined);
    }
  }, [smartAccountAddress]);

  /**
   * Create a new session key (replaces existing one)
   */
  const handleCreateSessionKey = useCallback(() => {
    if (!smartAccountAddress) {
      setError(new Error("Smart account address is required"));
      return;
    }

    if (!walletClient?.account?.address) {
      setError(new Error("Wallet is not connected"));
      return;
    }

    setIsLoading(true);
    setError(undefined);

    try {
      if (!router402Sdk) {
        throw new Error("Router402 SDK is not configured");
      }
      const ownerAddress = walletClient.account.address;
      const newKey = router402Sdk.generateSessionKey(
        smartAccountAddress,
        ownerAddress
      );
      storeSessionKey(newKey);
      refreshSessionKey();
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to create session key");
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, [smartAccountAddress, walletClient, refreshSessionKey]);

  /**
   * Approve the current session key
   */
  const handleApproveSessionKey = useCallback(async () => {
    if (!smartAccountAddress || !walletClient) {
      setError(
        new Error("Smart account address and wallet client are required")
      );
      return;
    }

    if (!router402Sdk) {
      setError(new Error("Router402 SDK is not configured"));
      return;
    }

    if (!sessionKey) {
      setError(new Error("No session key to approve"));
      return;
    }

    if (sessionKey.isApproved) {
      return;
    }

    setIsApproving(true);
    setError(undefined);

    try {
      await ensureCorrectChain();

      const approvedKey = await router402Sdk.approveSessionKey(
        walletClient,
        sessionKey
      );

      if (!approvedKey.serializedSessionKey) {
        throw new Error("Failed to approve session key");
      }

      updateSessionKeyApproval(
        smartAccountAddress,
        sessionKey.publicKey,
        approvedKey.serializedSessionKey
      );

      refreshSessionKey();
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to approve session key");
      setError(error);
    } finally {
      setIsApproving(false);
    }
  }, [
    smartAccountAddress,
    walletClient,
    sessionKey,
    refreshSessionKey,
    ensureCorrectChain,
  ]);

  /**
   * Remove the session key
   */
  const handleRemoveSessionKey = useCallback(() => {
    if (!smartAccountAddress) {
      setError(new Error("Smart account address is required"));
      return;
    }

    setIsLoading(true);
    setError(undefined);

    try {
      removeSessionKeyFromStorage(smartAccountAddress);
      refreshSessionKey();
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to remove session key");
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, [smartAccountAddress, refreshSessionKey]);

  /**
   * Send a test ETH transfer using the session key
   */
  const sendTestTransfer = useCallback(
    async (toAddress: Address) => {
      if (!smartAccountAddress) {
        setError(new Error("Smart account address is required"));
        return;
      }

      if (!router402Sdk) {
        setError(new Error("Router402 SDK is not configured"));
        return;
      }

      if (
        !sessionKey ||
        !canUseSessionKey(sessionKey) ||
        !sessionKey.serializedSessionKey
      ) {
        setError(
          new Error(
            "Session key is not approved or has expired. Please approve it first."
          )
        );
        return;
      }

      setIsSendingTestTransfer(true);
      setError(undefined);
      setLastTestTransferHash(undefined);

      try {
        const result = await router402Sdk.sendSessionKeyTransaction(
          sessionKey,
          [
            {
              to: toAddress,
              value: BigInt("100000000000000"), // 0.0001 ETH
            },
          ]
        );

        if (result.success) {
          setLastTestTransferHash(result.txHash);
        } else {
          throw new Error(result.error || "Transaction failed");
        }
      } catch (err) {
        const error =
          err instanceof Error
            ? err
            : new Error("Failed to send test transfer");
        setError(error);
      } finally {
        setIsSendingTestTransfer(false);
      }
    },
    [smartAccountAddress, sessionKey]
  );

  /**
   * Format remaining time for display
   */
  const formatRemainingTime = useCallback((key: SessionKeyData): string => {
    const remainingMs = getSessionKeyRemainingTime(key);
    if (remainingMs === 0) return "Expired";

    const seconds = Math.floor(remainingMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m`;
    }
    return `${seconds}s`;
  }, []);

  /**
   * Get session key data for backend use
   */
  const getSessionKeyForBackendFn =
    useCallback((): SessionKeyForBackend | null => {
      if (!sessionKey) return null;
      return exportSessionKeyForBackend(sessionKey);
    }, [sessionKey]);

  /**
   * Whether the session key is active (valid and approved)
   */
  const isActive = !!sessionKey && canUseSessionKey(sessionKey);

  useEffect(() => {
    refreshSessionKey();
  }, [refreshSessionKey]);

  return {
    sessionKey,
    isActive,
    isConfigured: SMART_ACCOUNT_CONFIG.isConfigured,
    isLoading,
    isApproving,
    isSendingTestTransfer,
    lastTestTransferHash,
    error,
    createSessionKey: handleCreateSessionKey,
    approveSessionKey: handleApproveSessionKey,
    removeSessionKey: handleRemoveSessionKey,
    refreshSessionKey,
    sendTestTransfer,
    formatRemainingTime,
    getSessionKeyForBackend: getSessionKeyForBackendFn,
  };
}
