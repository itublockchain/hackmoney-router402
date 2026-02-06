import type { SessionKeyData } from "@router402/sdk";
import type { Address, WalletClient } from "viem";
import { router402Sdk } from "@/config";
import {
  exportSessionKeyForBackend,
  getActiveSessionKey,
  getAuthToken,
  storeSessionKey,
  updateSessionKeyApproval,
} from "@/lib/session-keys";
import {
  getSmartAccountInfo,
  sendUserOperation,
} from "@/lib/smart-account/client";
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
 * Pure async initialization flow for Router402.
 * Takes all dependencies as arguments so it can be tested without React hooks.
 */
export async function initializeRouter402(
  deps: InitializeDeps
): Promise<InitializeResult> {
  const { client, eoa, onStatus, onStoreUpdate, onLastChecked } = deps;

  // Fast path: check if setup is already complete synchronously
  const storeState = useSmartAccountStore.getState();
  if (storeState.address && storeState.isDeployed) {
    const existingKey = getActiveSessionKey(storeState.address);
    const existingToken = getAuthToken();
    if (existingKey && existingToken) {
      return { sessionKey: existingKey, authToken: existingToken };
    }
  }

  // Step 1: Get Smart Account info
  onStatus("initializing");

  const info = await getSmartAccountInfo(client, eoa);

  onStoreUpdate({
    address: info.address,
    eoaAddress: info.eoaAddress,
    isDeployed: info.isDeployed,
    isLoading: false,
    error: undefined,
  });
  onLastChecked();

  // Step 2: Deploy Smart Account if not deployed
  if (!info.isDeployed) {
    onStatus("deploying");

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

    onStoreUpdate({
      isDeployed: true,
      deploymentTxHash: deployResult.txHash,
    });
    onLastChecked();
  }

  // Step 3: Check for existing valid session key
  let sessionKey = getActiveSessionKey(info.address);

  // Step 4: Create and approve session key if none exists
  if (!sessionKey) {
    onStatus("creating_session_key");

    if (!router402Sdk) {
      throw new Error("Router402 SDK is not configured");
    }

    const newKey = router402Sdk.generateSessionKey(info.address, eoa);
    storeSessionKey(newKey);

    // Step 5: Approve the session key (triggers wallet signing)
    onStatus("approving_session_key");

    const approvedKey = await router402Sdk.approveSessionKey(client, newKey);

    if (!approvedKey.serializedSessionKey) {
      throw new Error("Failed to approve session key");
    }

    updateSessionKeyApproval(
      info.address,
      newKey.publicKey,
      approvedKey.serializedSessionKey
    );

    sessionKey = getActiveSessionKey(info.address);
  }

  // Step 6: Send session key to backend (if no token stored yet)
  let authToken = getAuthToken() ?? undefined;
  if (sessionKey && !authToken) {
    onStatus("sending_to_backend");

    const backendData = exportSessionKeyForBackend(sessionKey);
    if (backendData) {
      authToken = await authorizeWithBackend(client, eoa, backendData);
    }
  }

  return { sessionKey, authToken };
}
