import type { SessionKeyData } from "@router402/sdk";
import type { Address, Hash } from "viem";
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface SmartAccountState {
  /** Smart Account address (deterministic) */
  address?: Address;
  /** Owner EOA address */
  eoaAddress?: Address;
  /** Whether the Smart Account is deployed on-chain */
  isDeployed: boolean;
  /** Whether an operation is in progress */
  isLoading: boolean;
  /** Error from last operation */
  error?: Error;
  /** Deployment transaction hash */
  deploymentTxHash?: Hash;
  /** Timestamp of last deployment status check */
  lastCheckedAt?: number;
  /** Current session key data */
  sessionKey?: SessionKeyData;
  /** Whether the session key is authorized on the Smart Account */
  isSessionKeyAuthorized: boolean;
}

interface SmartAccountActions {
  /** Set the Smart Account address */
  setAddress: (address: Address | undefined) => void;
  /** Set the EOA address */
  setEoaAddress: (address: Address | undefined) => void;
  /** Set deployment status */
  setDeployed: (isDeployed: boolean) => void;
  /** Set loading state */
  setLoading: (isLoading: boolean) => void;
  /** Set error */
  setError: (error: Error | undefined) => void;
  /** Set deployment transaction hash */
  setDeploymentTxHash: (txHash: Hash | undefined) => void;
  /** Set session key data */
  setSessionKey: (sessionKey: SessionKeyData | undefined) => void;
  /** Set session key authorization status */
  setSessionKeyAuthorized: (isAuthorized: boolean) => void;
  /** Update last checked timestamp */
  updateLastChecked: () => void;
  /** Reset store to initial state */
  reset: () => void;
  /** Update multiple state fields at once */
  updateState: (state: Partial<SmartAccountState>) => void;
}

export type SmartAccountStore = SmartAccountState & SmartAccountActions;

const initialState: SmartAccountState = {
  address: undefined,
  eoaAddress: undefined,
  isDeployed: false,
  isLoading: false,
  error: undefined,
  deploymentTxHash: undefined,
  lastCheckedAt: undefined,
  sessionKey: undefined,
  isSessionKeyAuthorized: false,
};

export const useSmartAccountStore = create<SmartAccountStore>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        setAddress: (address) => set({ address }, false, "setAddress"),

        setEoaAddress: (eoaAddress) =>
          set({ eoaAddress }, false, "setEoaAddress"),

        setDeployed: (isDeployed) => set({ isDeployed }, false, "setDeployed"),

        setLoading: (isLoading) => set({ isLoading }, false, "setLoading"),

        setError: (error) => set({ error }, false, "setError"),

        setDeploymentTxHash: (deploymentTxHash) =>
          set({ deploymentTxHash }, false, "setDeploymentTxHash"),

        setSessionKey: (sessionKey) =>
          set({ sessionKey }, false, "setSessionKey"),

        setSessionKeyAuthorized: (isSessionKeyAuthorized) =>
          set({ isSessionKeyAuthorized }, false, "setSessionKeyAuthorized"),

        updateLastChecked: () =>
          set({ lastCheckedAt: Date.now() }, false, "updateLastChecked"),

        reset: () => set(initialState, false, "reset"),

        updateState: (state) => set(state, false, "updateState"),
      }),
      {
        name: "route402-smart-account",
        partialize: (state) => ({
          // Only persist these fields
          address: state.address,
          eoaAddress: state.eoaAddress,
          isDeployed: state.isDeployed,
          deploymentTxHash: state.deploymentTxHash,
          // Don't persist loading/error states or session keys (stored separately)
        }),
      }
    ),
    { name: "SmartAccountStore" }
  )
);
