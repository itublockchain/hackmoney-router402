import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import {
  deserializePermissionAccount,
  serializePermissionAccount,
  toPermissionValidator,
} from "@zerodev/permissions";
import { toSudoPolicy } from "@zerodev/permissions/policies";
import { toECDSASigner } from "@zerodev/permissions/signers";
import { addressToEmptyAccount, createKernelAccount } from "@zerodev/sdk";
import { getEntryPoint } from "@zerodev/sdk/constants";
import { createSmartAccountClient } from "permissionless";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import type {
  Account,
  Address,
  Chain,
  Hex,
  Transport,
  WalletClient,
} from "viem";
import { createPublicClient, http } from "viem";
import { entryPoint07Address } from "viem/account-abstraction";
import { privateKeyToAccount } from "viem/accounts";
import { SMART_ACCOUNT_CONFIG } from "@/config/smart-account";
import { SmartAccountError } from "./types";

const entryPoint = getEntryPoint(SMART_ACCOUNT_CONFIG.entryPointVersion);

/**
 * Create a public client for kernel account operations.
 * Uses the chain's default RPC endpoint, not the bundler URL.
 */
export function createKernelPublicClient() {
  return createPublicClient({
    chain: SMART_ACCOUNT_CONFIG.chain,
    transport: http(),
  });
}

/**
 * Ensure Pimlico bundler is configured.
 */
function assertBundlerConfigured() {
  if (!SMART_ACCOUNT_CONFIG.pimlicoUrl) {
    throw new SmartAccountError(
      "BUNDLER_NOT_CONFIGURED",
      "Pimlico is not configured. Set NEXT_PUBLIC_PIMLICO_API_KEY."
    );
  }
}

/**
 * Create an ECDSA validator from a wallet client.
 */
export async function createEcdsaValidator(walletClient: WalletClient) {
  if (!walletClient.account) {
    throw new SmartAccountError(
      "USER_REJECTED",
      "Wallet client account is not available."
    );
  }

  const publicClient = createKernelPublicClient();
  const ownerClient = walletClient as WalletClient<
    Transport,
    Chain | undefined,
    Account
  >;

  return signerToEcdsaValidator(publicClient, {
    signer: ownerClient,
    entryPoint,
    kernelVersion: SMART_ACCOUNT_CONFIG.kernelVersion,
  });
}

/**
 * Create a Kernel Smart Account instance from a wallet client (owner).
 */
export async function createKernelAccountFromWallet(
  walletClient: WalletClient
) {
  assertBundlerConfigured();

  const publicClient = createKernelPublicClient();
  const ecdsaValidator = await createEcdsaValidator(walletClient);

  return createKernelAccount(publicClient, {
    plugins: {
      sudo: ecdsaValidator,
    },
    entryPoint,
    kernelVersion: SMART_ACCOUNT_CONFIG.kernelVersion,
  });
}

/**
 * Create a Pimlico client for bundler and paymaster operations.
 */
function createPimlicoPaymasterClient() {
  return createPimlicoClient({
    chain: SMART_ACCOUNT_CONFIG.chain,
    transport: http(SMART_ACCOUNT_CONFIG.pimlicoUrl),
    entryPoint: {
      address: entryPoint07Address,
      version: "0.7",
    },
  });
}

/**
 * Create a Smart Account Client with Pimlico bundler and paymaster.
 * Uses permissionless.js createSmartAccountClient to avoid ZeroDev-specific RPC methods.
 */
export function createKernelSmartAccountClient<
  TAccount extends Awaited<ReturnType<typeof createKernelAccount>>,
>(account: TAccount) {
  assertBundlerConfigured();

  const pimlicoClient = createPimlicoPaymasterClient();

  return createSmartAccountClient({
    account,
    chain: SMART_ACCOUNT_CONFIG.chain,
    bundlerTransport: http(SMART_ACCOUNT_CONFIG.pimlicoUrl),
    paymaster: pimlicoClient,
    userOperation: {
      estimateFeesPerGas: async () => {
        const prices = await pimlicoClient.getUserOperationGasPrice();
        return prices.fast;
      },
    },
  });
}

/**
 * Get the Kernel Smart Account address for a wallet.
 */
export async function getKernelAccountAddress(
  walletClient: WalletClient
): Promise<Address> {
  const account = await createKernelAccountFromWallet(walletClient);
  return account.address;
}

/**
 * Check if the Kernel Smart Account is deployed.
 */
export async function isKernelAccountDeployed(
  walletClient: WalletClient
): Promise<boolean> {
  const account = await createKernelAccountFromWallet(walletClient);
  return account.isDeployed();
}

/**
 * Create a session key approval (serialized permission account).
 * This creates an approval that the session key holder can use to send transactions.
 *
 * @param walletClient - The owner's wallet client
 * @param sessionKeyAddress - The address of the session key (public key)
 * @returns Serialized permission account string
 */
export async function createSessionKeyApproval(
  walletClient: WalletClient,
  sessionKeyAddress: Address
): Promise<string> {
  assertBundlerConfigured();

  const publicClient = createKernelPublicClient();
  const ecdsaValidator = await createEcdsaValidator(walletClient);

  // Create an "empty account" for the session key (only using the address)
  const emptyAccount = addressToEmptyAccount(sessionKeyAddress);
  const emptySessionKeySigner = await toECDSASigner({ signer: emptyAccount });

  // Create permission plugin with sudo policy (allows all actions)
  // In production, you might want to use more restrictive policies
  const permissionPlugin = await toPermissionValidator(publicClient, {
    entryPoint,
    signer: emptySessionKeySigner,
    policies: [toSudoPolicy({})],
    kernelVersion: SMART_ACCOUNT_CONFIG.kernelVersion,
  });

  // Create the kernel account with both sudo and regular plugins
  const sessionKeyAccount = await createKernelAccount(publicClient, {
    entryPoint,
    plugins: {
      sudo: ecdsaValidator,
      regular: permissionPlugin,
    },
    kernelVersion: SMART_ACCOUNT_CONFIG.kernelVersion,
  });

  // Serialize the permission account (this contains the approval)
  return serializePermissionAccount(sessionKeyAccount);
}

/**
 * Deserialize and create a kernel client from a session key.
 * Used by the backend or frontend to send transactions with the session key.
 *
 * @param sessionKeyPrivateKey - The session key's private key
 * @param serializedApproval - The serialized permission account from the owner
 * @returns A kernel client ready to send transactions
 */
export async function createKernelClientFromSessionKey(
  sessionKeyPrivateKey: Hex,
  serializedApproval: string
) {
  assertBundlerConfigured();

  const publicClient = createKernelPublicClient();
  const sessionKeyAccount = privateKeyToAccount(sessionKeyPrivateKey);

  // Create the ECDSA signer from the session key
  const sessionKeySigner = await toECDSASigner({
    signer: sessionKeyAccount,
  });

  // Deserialize the permission account with the real session key signer
  const kernelAccount = await deserializePermissionAccount(
    publicClient,
    entryPoint,
    SMART_ACCOUNT_CONFIG.kernelVersion,
    serializedApproval,
    sessionKeySigner
  );

  // Create the client with Pimlico paymaster
  return createKernelSmartAccountClient(kernelAccount);
}

/**
 * Send a user operation using the owner wallet.
 */
export async function sendOwnerTransaction(
  walletClient: WalletClient,
  calls: Array<{
    to: Address;
    value?: bigint;
    data?: Hex;
  }>
): Promise<{
  success: boolean;
  txHash?: Hex;
  userOpHash?: Hex;
  error?: string;
}> {
  try {
    const account = await createKernelAccountFromWallet(walletClient);
    const client = createKernelSmartAccountClient(account);

    const userOpHash = await client.sendUserOperation({
      calls: calls.map((call) => ({
        to: call.to,
        data: call.data ?? "0x",
        value: call.value ?? 0n,
      })),
    });

    const receipt = await client.waitForUserOperationReceipt({
      hash: userOpHash,
    });

    return {
      success: true,
      txHash: receipt.receipt.transactionHash,
      userOpHash,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send a transaction using a session key.
 */
export async function sendSessionKeyTransaction(
  sessionKeyPrivateKey: Hex,
  serializedApproval: string,
  calls: Array<{
    to: Address;
    value?: bigint;
    data?: Hex;
  }>
): Promise<{
  success: boolean;
  txHash?: Hex;
  userOpHash?: Hex;
  error?: string;
}> {
  try {
    const client = await createKernelClientFromSessionKey(
      sessionKeyPrivateKey,
      serializedApproval
    );

    const userOpHash = await client.sendUserOperation({
      calls: calls.map((call) => ({
        to: call.to,
        data: call.data ?? "0x",
        value: call.value ?? 0n,
      })),
    });

    const receipt = await client.waitForUserOperationReceipt({
      hash: userOpHash,
    });

    return {
      success: true,
      txHash: receipt.receipt.transactionHash,
      userOpHash,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
