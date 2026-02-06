import type { SessionKeyData } from "@router402/sdk";
import { sendSessionKeyTransaction } from "@router402/sdk";
import type { Address, WalletClient } from "viem";
import { encodeFunctionData, erc20Abi } from "viem";
import { router402Sdk, USDC_ADDRESS } from "@/config";
import {
  exportSessionKeyForBackend,
  getActiveSessionKey,
  getAuthToken,
  removeSessionKey,
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

  // Step 3: Check for existing valid session key.
  // If there's no auth token yet, the previous setup didn't complete fully.
  // In that case, discard the stale session key (its enable signature may
  // reference an outdated on-chain nonce) and force a fresh one.
  let sessionKey = getActiveSessionKey(info.address);
  const hasAuthToken = !!getAuthToken();
  if (sessionKey && !hasAuthToken) {
    removeSessionKey(info.address);
    sessionKey = undefined;
  }

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

  // Step 6: Enable session key on-chain by sending an empty UserOp.
  // The first UserOp through `sendSessionKeyTransaction` activates the
  // permission validator module on-chain via the `enableSignature` mechanism.
  if (sessionKey?.serializedSessionKey) {
    onStatus("enabling_session_key");

    if (!router402Sdk) {
      throw new Error("Router402 SDK is not configured");
    }

    const config = router402Sdk.getConfig();
    const approveData = encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [info.address, BigInt(0)],
    });
    const enableResult = await sendSessionKeyTransaction(
      sessionKey.privateKey,
      sessionKey.serializedSessionKey,
      [{ to: USDC_ADDRESS, value: BigInt(0), data: approveData }],
      config
    );

    if (!enableResult.success) {
      // Clear the stale session key so the next retry creates a fresh one
      // with a new enable signature matching the current on-chain nonce.
      removeSessionKey(info.address);
      throw new Error(
        `Failed to enable session key on-chain: ${enableResult.error}`
      );
    }
  }

  // Step 7: Send session key to backend (if no token stored yet)
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
