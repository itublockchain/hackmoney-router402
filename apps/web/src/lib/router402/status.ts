import type { SessionKeyData } from "@router402/sdk";
import type { Address } from "viem";
import { getActiveSessionKey, getAuthToken } from "@/lib/session-keys";
import { useSmartAccountStore } from "@/stores";

export type Router402Status =
  | "disconnected"
  | "not_configured"
  | "initializing"
  | "deploying"
  | "creating_session_key"
  | "approving_session_key"
  | "enabling_session_key"
  | "sending_to_backend"
  | "ready"
  | "error";

interface StatusCheckParams {
  isConnected: boolean;
  eoaAddress: Address | undefined;
  storedEoaAddress: Address | undefined;
  storeHydrated: boolean;
}

interface StatusCheckResult {
  status: Router402Status | null;
  activeSessionKey: SessionKeyData | undefined;
  shouldReset: boolean;
}

/**
 * Synchronous status check — reads localStorage and Zustand store to determine
 * the current Router402 status without triggering any async operations.
 */
export function checkSyncStatus(params: StatusCheckParams): StatusCheckResult {
  const { isConnected, eoaAddress, storedEoaAddress, storeHydrated } = params;

  if (!isConnected || !eoaAddress) {
    return {
      status: "disconnected",
      activeSessionKey: undefined,
      shouldReset: false,
    };
  }

  if (!storeHydrated) {
    return { status: null, activeSessionKey: undefined, shouldReset: false };
  }

  if (storedEoaAddress && storedEoaAddress !== eoaAddress) {
    return { status: null, activeSessionKey: undefined, shouldReset: true };
  }

  const storeState = useSmartAccountStore.getState();
  if (storeState.address && storeState.isDeployed) {
    const existingKey = getActiveSessionKey(storeState.address);
    if (existingKey && getAuthToken(storeState.address)) {
      return {
        status: "ready",
        activeSessionKey: existingKey,
        shouldReset: false,
      };
    }
  }

  return {
    status: "not_configured",
    activeSessionKey: undefined,
    shouldReset: false,
  };
}
