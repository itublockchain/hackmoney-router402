import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface SmartAccountState {
  address?: string;
  isDeployed: boolean;
  isLoading: boolean;
  error?: Error;
}

interface SmartAccountActions {
  setAddress: (address: string | undefined) => void;
  setDeployed: (isDeployed: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: Error | undefined) => void;
  reset: () => void;
  updateState: (state: Partial<SmartAccountState>) => void;
}

export type SmartAccountStore = SmartAccountState & SmartAccountActions;

const initialState: SmartAccountState = {
  address: undefined,
  isDeployed: false,
  isLoading: false,
  error: undefined,
};

export const useSmartAccountStore = create<SmartAccountStore>()(
  devtools(
    (set) => ({
      ...initialState,
      setAddress: (address) => set({ address }, false, "setAddress"),
      setDeployed: (isDeployed) => set({ isDeployed }, false, "setDeployed"),
      setLoading: (isLoading) => set({ isLoading }, false, "setLoading"),
      setError: (error) => set({ error }, false, "setError"),
      reset: () => set(initialState, false, "reset"),
      updateState: (state) => set(state, false, "updateState"),
    }),
    { name: "SmartAccountStore" }
  )
);
