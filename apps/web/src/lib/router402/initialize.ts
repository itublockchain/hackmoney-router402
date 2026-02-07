import type {
  SessionKeyData,
  SetupAccountResult,
  SetupStatus,
} from "@router402/sdk";
import type { Address, WalletClient } from "viem";
import { router402Sdk, USDC_ADDRESS } from "@/config";
import {
  exportSessionKeyForBackend,
  getActiveSessionKey,
  getAuthToken,
  removeSessionKey,
  storeSessionKey,
  updateSessionKeyApproval,
} from "@/lib/session-keys";
import { useSmartAccountStore } from "@/stores";
import { authorizeWithBackend } from "./authorize";
import type { Router402Status } from "./status";

interface InitializeDeps {
  client: WalletClient;
  eoa: Address;
  onStatus: (status: Router402Status) => void;
  onStoreUpdate: (state: Record<string, unknown>) => void;
  onLastChecked: () => void;
}

interface InitializeResult {
  sessionKey: SessionKeyData | undefined;
  authToken: string | undefined;
}

/**
 * Map SDK setup status to web app Router402Status
 */
function mapSetupStatus(status: SetupStatus): Router402Status {
  if (status === "complete") return "ready";
  return status;
}

/**
 * Pure async initialization flow for Router402.
 * Takes all dependencies as arguments so it can be tested without React hooks.
 *
 * Delegates core setup logic (deploy, session key, enable) to the SDK's
 * `setupAccount` method. This function handles app-specific concerns:
 * localStorage persistence, Zustand store updates, and backend authorization.
 */
export async function initializeRouter402(
  deps: InitializeDeps
): Promise<InitializeResult> {
  const { client, eoa, onStatus, onStoreUpdate, onLastChecked } = deps;

  // Fast path: check if setup is already complete synchronously
  const storeState = useSmartAccountStore.getState();
  if (storeState.address && storeState.isDeployed) {
    const existingKey = getActiveSessionKey(storeState.address);
    const existingToken = getAuthToken(storeState.address);
    if (existingKey && existingToken) {
      return { sessionKey: existingKey, authToken: existingToken };
    }
  }

  if (!router402Sdk) {
    throw new Error("Router402 SDK is not configured");
  }

  // Check for existing valid session key.
  // If there's no auth token yet, the previous setup didn't complete fully.
  // In that case, discard the stale session key (its enable signature may
  // reference an outdated on-chain nonce) and force a fresh one.
  let existingSessionKey: SessionKeyData | undefined;
  if (storeState.address) {
    existingSessionKey = getActiveSessionKey(storeState.address);
    const hasAuthToken = !!getAuthToken(storeState.address);
    if (existingSessionKey && !hasAuthToken) {
      removeSessionKey(storeState.address);
      existingSessionKey = undefined;
    }
  }

  // Run the SDK setup flow, which handles:
  // - Smart account info retrieval
  // - Smart account deployment (dummy no-op transaction)
  // - Session key generation & approval
  // - Session key on-chain enablement (dummy ERC20 approve transaction)
  let result: SetupAccountResult;
  try {
    result = await router402Sdk.setupAccount(client, eoa, {
      usdcAddress: USDC_ADDRESS,
      existingSessionKey,
      onStatus: (status: SetupStatus) => {
        onStatus(mapSetupStatus(status));
      },
    });
  } catch (error) {
    // If enablement failed, clear the session key so next retry is fresh
    if (storeState.address) {
      removeSessionKey(storeState.address);
    }
    throw error;
  }

  const { info, sessionKey } = result;

  // Update Zustand store with smart account info
  onStoreUpdate({
    address: info.address,
    eoaAddress: info.eoaAddress,
    isDeployed: true,
    isLoading: false,
    error: undefined,
  });
  onLastChecked();

  // Persist session key to localStorage
  storeSessionKey(sessionKey);
  if (sessionKey.serializedSessionKey) {
    updateSessionKeyApproval(
      info.address,
      sessionKey.publicKey,
      sessionKey.serializedSessionKey
    );
  }

  // Send session key to backend (if no token stored yet)
  let authToken = getAuthToken(info.address) ?? undefined;
  if (sessionKey && !authToken) {
    onStatus("sending_to_backend");

    const backendData = exportSessionKeyForBackend(sessionKey);
    if (backendData) {
      authToken = await authorizeWithBackend(client, eoa, backendData);
    }
  }

  return { sessionKey, authToken };
}
