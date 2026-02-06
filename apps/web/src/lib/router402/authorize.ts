import type { SessionKeyForBackend } from "@router402/sdk";
import type { Address, WalletClient } from "viem";
import { apiClient } from "@/lib/api-client";
import { stateLogger } from "@/lib/logger";
import { storeAuthToken } from "@/lib/session-keys";
import { useAuthStore } from "@/stores";

interface AuthorizeResponse {
  token: string;
  sessionKeyId: string;
}

/**
 * Sign an EIP-712 authorization message and submit to the backend.
 * Returns the JWT token received from the server.
 */
export async function authorizeWithBackend(
  client: WalletClient,
  eoa: Address,
  backendData: SessionKeyForBackend
): Promise<string> {
  const chainId = backendData.chainId;
  const nonce = Date.now();

  const signature = await client.signTypedData({
    account: eoa,
    domain: {
      name: "Router402 Authorization",
      version: "1",
      chainId,
    },
    types: {
      Authorization: [
        { name: "smartAccountAddress", type: "address" },
        { name: "privateKey", type: "string" },
        { name: "serializedSessionKey", type: "string" },
        { name: "eoaAddress", type: "address" },
        { name: "chainId", type: "uint256" },
        { name: "nonce", type: "uint256" },
      ],
    },
    primaryType: "Authorization",
    message: {
      smartAccountAddress: backendData.smartAccountAddress as `0x${string}`,
      eoaAddress: eoa as `0x${string}`,
      serializedSessionKey: backendData.serializedSessionKey,
      privateKey: backendData.privateKey,
      chainId: BigInt(chainId),
      nonce: BigInt(nonce),
    },
  });

  stateLogger.debug("Authorization payload", {
    smartAccountAddress: backendData.smartAccountAddress,
    eoaAddress: eoa,
    chainId,
    nonce,
  });

  const response = await apiClient.post<AuthorizeResponse>(
    "/v1/authorize",
    {
      smartAccountAddress: backendData.smartAccountAddress,
      privateKey: backendData.privateKey,
      serializedSessionKey: backendData.serializedSessionKey,
      eoaAddress: eoa,
      chainId,
      nonce,
    },
    {
      headers: {
        "x-authorization-signature": signature,
      },
    }
  );

  // Response interceptor unwraps ApiResponse.data automatically
  const result = response.data as AuthorizeResponse;
  const { token } = result;

  // Store token in session-key storage (router402_auth_token)
  storeAuthToken(token);

  // Sync token to auth store so api-client interceptor picks it up
  useAuthStore.getState().setToken(token);

  stateLogger.debug("Authorization successful", {
    sessionKeyId: result.sessionKeyId,
  });

  return token;
}
