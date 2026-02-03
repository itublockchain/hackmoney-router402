"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Address } from "viem";
import { useAccount, useSwitchChain, useWalletClient } from "wagmi";
import { SMART_ACCOUNT_CONFIG } from "@/config";
import {
  getSmartAccountInfo,
  isSmartAccountDeployed,
  SmartAccountError,
  sendUserOperation,
} from "@/lib/smart-account";
import { useSmartAccountStore } from "@/stores";

interface UseSmartAccountReturn {
  /** Smart Account address (deterministic) */
  address: Address | undefined;
  /** Owner EOA address */
  eoaAddress: Address | undefined;
  /** Whether the Smart Account is deployed on-chain */
  isDeployed: boolean;
  /** Whether an operation is in progress */
  isLoading: boolean;
  /** Whether a deployment is in progress */
  isDeploying: boolean;
  /** Error from last operation */
  error: Error | undefined;
  /** Whether the wallet is connected */
  isConnected: boolean;
  /** Refresh deployment status */
  refreshDeploymentStatus: () => Promise<void>;
  /** Deploy the Smart Account */
  deploySmartAccount: () => Promise<void>;
}

/**
 * Hook to manage Smart Account integration using Kernel
 *
 * Handles:
 * - Smart Account address calculation (deterministic from EOA)
 * - Deployment status checking
 * - State management via Zustand store
 *
 * @returns Smart account state and utilities
 */
export function useSmartAccount(): UseSmartAccountReturn {
  const { address: eoaAddress, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient({
    chainId: SMART_ACCOUNT_CONFIG.chainId,
  });
  const { switchChainAsync } = useSwitchChain();

  const {
    address,
    isDeployed,
    isLoading,
    error,
    eoaAddress: storedEoaAddress,
    setLoading,
    setError,
    updateState,
    reset,
    updateLastChecked,
  } = useSmartAccountStore();

  // Track initialization to prevent duplicate calls
  const isInitializing = useRef(false);
  const lastInitializedEoa = useRef<Address | undefined>(undefined);

  // Local state for deployment in progress
  const [isDeploying, setIsDeploying] = useState(false);

  /**
   * Ensure the wallet is on the correct chain before performing operations
   */
  const ensureCorrectChain = useCallback(async () => {
    const targetChainId = SMART_ACCOUNT_CONFIG.chainId;
    await switchChainAsync({ chainId: targetChainId });
  }, [switchChainAsync]);

  /**
   * Initialize Smart Account when wallet connects
   */
  const initializeSmartAccount = useCallback(async () => {
    if (!walletClient || !eoaAddress) return;
    if (isInitializing.current) return;
    if (lastInitializedEoa.current === eoaAddress && address) return;

    isInitializing.current = true;
    setLoading(true);
    setError(undefined);

    try {
      const info = await getSmartAccountInfo(walletClient, eoaAddress);

      updateState({
        address: info.address,
        eoaAddress: info.eoaAddress,
        isDeployed: info.isDeployed,
        isLoading: false,
        error: undefined,
      });

      updateLastChecked();
      lastInitializedEoa.current = eoaAddress;
    } catch (err) {
      const error =
        err instanceof SmartAccountError
          ? err
          : new Error(
              err instanceof Error
                ? err.message
                : "Failed to initialize Smart Account"
            );

      setError(error);
      setLoading(false);
    } finally {
      isInitializing.current = false;
    }
  }, [
    walletClient,
    eoaAddress,
    address,
    setLoading,
    setError,
    updateState,
    updateLastChecked,
  ]);

  /**
   * Refresh deployment status without recalculating address
   */
  const refreshDeploymentStatus = useCallback(async () => {
    if (!address) return;

    setLoading(true);
    setError(undefined);

    try {
      const deployed = await isSmartAccountDeployed(address);

      updateState({
        isDeployed: deployed,
        isLoading: false,
      });

      updateLastChecked();
    } catch (err) {
      const error =
        err instanceof SmartAccountError
          ? err
          : new Error(
              err instanceof Error
                ? err.message
                : "Failed to check deployment status"
            );

      setError(error);
      setLoading(false);
    }
  }, [address, setLoading, setError, updateState, updateLastChecked]);

  /**
   * Deploy the Smart Account by sending a no-op user operation
   */
  const deploySmartAccount = useCallback(async () => {
    if (!walletClient || !address || isDeployed) return;

    setIsDeploying(true);
    setError(undefined);

    try {
      await ensureCorrectChain();

      // Send a no-op transaction to deploy the smart account
      const result = await sendUserOperation(walletClient, [
        {
          to: address,
          value: BigInt(0),
          data: "0x",
        },
      ]);

      if (result.success) {
        updateState({
          isDeployed: true,
          deploymentTxHash: result.txHash,
        });
        updateLastChecked();
      } else {
        throw new Error("Deployment transaction failed");
      }
    } catch (err) {
      const error =
        err instanceof SmartAccountError
          ? err
          : new Error(
              err instanceof Error
                ? err.message
                : "Failed to deploy Smart Account"
            );

      setError(error);
    } finally {
      setIsDeploying(false);
    }
  }, [
    walletClient,
    address,
    isDeployed,
    setError,
    updateState,
    updateLastChecked,
    ensureCorrectChain,
  ]);

  useEffect(() => {
    if (!isConnected || !eoaAddress) {
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

    initializeSmartAccount();
  }, [
    isConnected,
    eoaAddress,
    storedEoaAddress,
    reset,
    initializeSmartAccount,
  ]);

  return {
    address,
    eoaAddress,
    isDeployed,
    isLoading,
    isDeploying,
    error,
    isConnected,
    refreshDeploymentStatus,
    deploySmartAccount,
  };
}
