"use client";

import { useCallback, useEffect, useState } from "react";
import type { Address } from "viem";
import { useSwitchChain, useWalletClient } from "wagmi";
import { SMART_ACCOUNT_CONFIG } from "@/config/smart-account";
import {
  canUseSessionKey,
  exportSessionKeyForBackend,
  generateSessionKey,
  getSessionKeyRemainingTime,
  getSessionKeysForAccount,
  isSessionKeyExpired,
  removeSessionKey as removeSessionKeyFromStorage,
  storeSessionKey,
  updateSessionKeyApproval,
} from "@/lib/session-keys";
import {
  createSessionKeyApproval,
  sendSessionKeyTransaction,
} from "@/lib/smart-account";
import type {
  SessionKeyData,
  SessionKeyForBackend,
} from "@/lib/smart-account/types";

interface UseSessionKeysReturn {
  /** All session keys for the smart account */
  sessionKeys: SessionKeyData[];
  /** The active (most recent valid and approved) session key */
  activeSessionKey: SessionKeyData | undefined;
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
  /** Create a new session key */
  createSessionKey: () => void;
  /** Approve a session key (creates serialized permission account) */
  approveSessionKey: (publicKey: Address) => Promise<void>;
  /** Remove a session key by its public address */
  removeSessionKey: (publicKey: Address) => void;
  /** Refresh session keys from storage */
  refreshSessionKeys: () => void;
  /** Send a test ETH transfer using a session key */
  sendTestTransfer: (publicKey: Address, toAddress: Address) => Promise<void>;
  /** Format remaining time for a session key */
  formatRemainingTime: (sessionKey: SessionKeyData) => string;
  /** Export session key data for backend use */
  getSessionKeyForBackend: (publicKey: Address) => SessionKeyForBackend | null;
}

/**
 * Hook to manage session keys for a Smart Account
 *
 * @param smartAccountAddress - The Smart Account address
 * @returns Session key state and utilities
 */
export function useSessionKeys(
  smartAccountAddress: Address | undefined
): UseSessionKeysReturn {
  const { data: walletClient } = useWalletClient({
    chainId: SMART_ACCOUNT_CONFIG.chainId,
  });
  const { switchChainAsync } = useSwitchChain();
  const [sessionKeys, setSessionKeys] = useState<SessionKeyData[]>([]);
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
    await switchChainAsync({ chainId: targetChainId });
  }, [switchChainAsync]);

  /**
   * Load session keys from storage
   */
  const refreshSessionKeys = useCallback(() => {
    if (!smartAccountAddress) {
      setSessionKeys([]);
      return;
    }

    const keys = getSessionKeysForAccount(smartAccountAddress);
    const validKeys = keys
      .filter((key) => !isSessionKeyExpired(key))
      .sort((a, b) => b.createdAt - a.createdAt);
    setSessionKeys(validKeys);
  }, [smartAccountAddress]);

  /**
   * Create a new session key
   */
  const createSessionKey = useCallback(() => {
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
      const ownerAddress = walletClient.account.address;
      const newKey = generateSessionKey(smartAccountAddress, ownerAddress);
      storeSessionKey(newKey);
      refreshSessionKeys();
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to create session key");
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, [smartAccountAddress, walletClient, refreshSessionKeys]);

  /**
   * Approve a session key by creating a serialized permission account
   */
  const approveSessionKey = useCallback(
    async (publicKey: Address) => {
      if (!smartAccountAddress || !walletClient) {
        setError(
          new Error("Smart account address and wallet client are required")
        );
        return;
      }

      const sessionKey = sessionKeys.find((key) => key.publicKey === publicKey);
      if (!sessionKey) {
        setError(new Error("Session key not found"));
        return;
      }

      if (sessionKey.isApproved) {
        return;
      }

      setIsApproving(true);
      setError(undefined);

      try {
        await ensureCorrectChain();

        const serializedApproval = await createSessionKeyApproval(
          walletClient,
          publicKey
        );

        updateSessionKeyApproval(
          smartAccountAddress,
          publicKey,
          serializedApproval
        );

        refreshSessionKeys();
      } catch (err) {
        const error =
          err instanceof Error
            ? err
            : new Error("Failed to approve session key");
        setError(error);
      } finally {
        setIsApproving(false);
      }
    },
    [
      smartAccountAddress,
      walletClient,
      sessionKeys,
      refreshSessionKeys,
      ensureCorrectChain,
    ]
  );

  /**
   * Remove a session key
   */
  const removeSessionKey = useCallback(
    (publicKey: Address) => {
      if (!smartAccountAddress) {
        setError(new Error("Smart account address is required"));
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        removeSessionKeyFromStorage(smartAccountAddress, publicKey);
        refreshSessionKeys();
      } catch (err) {
        const error =
          err instanceof Error
            ? err
            : new Error("Failed to remove session key");
        setError(error);
      } finally {
        setIsLoading(false);
      }
    },
    [smartAccountAddress, refreshSessionKeys]
  );

  /**
   * Send a test ETH transfer using a session key
   */
  const sendTestTransfer = useCallback(
    async (publicKey: Address, toAddress: Address) => {
      if (!smartAccountAddress) {
        setError(new Error("Smart account address is required"));
        return;
      }

      const sessionKey = sessionKeys.find((key) => key.publicKey === publicKey);
      if (!sessionKey) {
        setError(new Error("Session key not found"));
        return;
      }

      if (!canUseSessionKey(sessionKey) || !sessionKey.serializedSessionKey) {
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
        const result = await sendSessionKeyTransaction(
          sessionKey.privateKey,
          sessionKey.serializedSessionKey,
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
    [smartAccountAddress, sessionKeys]
  );

  /**
   * Format remaining time for display
   */
  const formatRemainingTime = useCallback(
    (sessionKey: SessionKeyData): string => {
      const remainingMs = getSessionKeyRemainingTime(sessionKey);
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
    },
    []
  );

  /**
   * Get session key data for backend use
   */
  const getSessionKeyForBackend = useCallback(
    (publicKey: Address): SessionKeyForBackend | null => {
      const sessionKey = sessionKeys.find((key) => key.publicKey === publicKey);
      if (!sessionKey) return null;
      return exportSessionKeyForBackend(sessionKey);
    },
    [sessionKeys]
  );

  /**
   * Get active session key (most recent valid AND approved)
   */
  const activeSessionKey = smartAccountAddress
    ? sessionKeys.find((key) => canUseSessionKey(key))
    : undefined;

  useEffect(() => {
    refreshSessionKeys();
  }, [refreshSessionKeys]);

  return {
    sessionKeys,
    activeSessionKey,
    isConfigured: SMART_ACCOUNT_CONFIG.isConfigured,
    isLoading,
    isApproving,
    isSendingTestTransfer,
    lastTestTransferHash,
    error,
    createSessionKey,
    approveSessionKey,
    removeSessionKey,
    refreshSessionKeys,
    sendTestTransfer,
    formatRemainingTime,
    getSessionKeyForBackend,
  };
}
