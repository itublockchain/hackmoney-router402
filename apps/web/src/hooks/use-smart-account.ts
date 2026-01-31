"use client";

import { useEffect } from "react";
import { useConnection } from "wagmi";
import { useSmartAccountStore } from "@/stores";

interface SmartAccountState {
  address?: string;
  isDeployed: boolean;
  isLoading: boolean;
  error?: Error;
}

/**
 * Hook to manage Biconomy Smart Account integration
 *
 * @returns Smart account state and utilities
 *
 * @example
 * const { address, isDeployed, isLoading } = useSmartAccount();
 */
export function useSmartAccount(): SmartAccountState {
  const { address: eoaAddress, isConnected } = useConnection();
  const { address, isDeployed, isLoading, error, updateState, reset } =
    useSmartAccountStore();

  useEffect(() => {
    if (!isConnected || !eoaAddress) {
      reset();
      return;
    }

    // TODO: Initialize Biconomy Smart Account
    // This is a placeholder for future Biconomy integration
    // Will include:
    // 1. Create smart account instance
    // 2. Check if account is deployed
    // 3. Handle deployment if needed
    // 4. Return smart account address

    updateState({
      address: eoaAddress,
      isDeployed: false,
      isLoading: false,
    });
  }, [eoaAddress, isConnected, updateState, reset]);

  return { address, isDeployed, isLoading, error };
}
