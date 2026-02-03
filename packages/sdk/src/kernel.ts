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
  PublicClient,
  Transport,
  WalletClient,
} from "viem";
import { createPublicClient, http } from "viem";
import { entryPoint07Address } from "viem/account-abstraction";
import { privateKeyToAccount } from "viem/accounts";
import { KERNEL_VERSION } from "./config.js";
import type { ResolvedConfig } from "./types.js";
import { SmartAccountError } from "./types.js";

/**
 * Create a public client for kernel account operations.
 */
export function createKernelPublicClient(
  config: ResolvedConfig
): PublicClient<Transport, Chain> {
  return createPublicClient({
    chain: config.chain,
    transport: http(),
  }) as PublicClient<Transport, Chain>;
}

/**
 * Create a Pimlico client for bundler and paymaster operations.
 */
export function createPimlicoPaymasterClient(
  config: ResolvedConfig
): ReturnType<typeof createPimlicoClient> {
  return createPimlicoClient({
    chain: config.chain,
    transport: http(config.pimlicoUrl),
    entryPoint: {
      address: entryPoint07Address,
      version: "0.7",
    },
  });
}

/**
 * Create an ECDSA validator from a wallet client.
 */
export async function createEcdsaValidator(
  walletClient: WalletClient,
  config: ResolvedConfig
) {
  if (!walletClient.account) {
    throw new SmartAccountError(
      "USER_REJECTED",
      "Wallet client account is not available."
    );
  }

  const publicClient = createKernelPublicClient(config);
  const entryPoint = getEntryPoint(config.entryPointVersion);
  const ownerClient = walletClient as WalletClient<
    Transport,
    Chain | undefined,
    Account
  >;

  return signerToEcdsaValidator(publicClient, {
    signer: ownerClient,
    entryPoint,
    kernelVersion: KERNEL_VERSION,
  });
}

/**
 * Create a Kernel Smart Account instance from a wallet client (owner).
 */
export async function createKernelAccountFromWallet(
  walletClient: WalletClient,
  config: ResolvedConfig
) {
  const publicClient = createKernelPublicClient(config);
  const entryPoint = getEntryPoint(config.entryPointVersion);
  const ecdsaValidator = await createEcdsaValidator(walletClient, config);

  return createKernelAccount(publicClient, {
    plugins: {
      sudo: ecdsaValidator,
    },
    entryPoint,
    kernelVersion: KERNEL_VERSION,
  });
}

/**
 * Create a Smart Account Client with Pimlico bundler and paymaster.
 */
export function createKernelSmartAccountClient<
  TAccount extends Awaited<ReturnType<typeof createKernelAccount>>,
>(account: TAccount, config: ResolvedConfig) {
  const pimlicoClient = createPimlicoPaymasterClient(config);

  return createSmartAccountClient({
    account,
    chain: config.chain,
    bundlerTransport: http(config.pimlicoUrl),
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
  walletClient: WalletClient,
  config: ResolvedConfig
): Promise<Address> {
  const account = await createKernelAccountFromWallet(walletClient, config);
  return account.address;
}

/**
 * Check if the Kernel Smart Account is deployed.
 */
export async function isKernelAccountDeployed(
  address: Address,
  config: ResolvedConfig
): Promise<boolean> {
  const publicClient = createKernelPublicClient(config);
  const code = await publicClient.getCode({ address });
  return code !== undefined && code !== "0x";
}

/**
 * Create a session key approval (serialized permission account).
 * This creates an approval that the session key holder can use to send transactions.
 */
export async function createSessionKeyApproval(
  walletClient: WalletClient,
  sessionKeyAddress: Address,
  config: ResolvedConfig
): Promise<string> {
  const publicClient = createKernelPublicClient(config);
  const entryPoint = getEntryPoint(config.entryPointVersion);
  const ecdsaValidator = await createEcdsaValidator(walletClient, config);

  // Create an "empty account" for the session key (only using the address)
  const emptyAccount = addressToEmptyAccount(sessionKeyAddress);
  const emptySessionKeySigner = await toECDSASigner({ signer: emptyAccount });

  // Create permission plugin with sudo policy (allows all actions)
  const permissionPlugin = await toPermissionValidator(publicClient, {
    entryPoint,
    signer: emptySessionKeySigner,
    policies: [toSudoPolicy({})],
    kernelVersion: KERNEL_VERSION,
  });

  // Create the kernel account with both sudo and regular plugins
  const sessionKeyAccount = await createKernelAccount(publicClient, {
    entryPoint,
    plugins: {
      sudo: ecdsaValidator,
      regular: permissionPlugin,
    },
    kernelVersion: KERNEL_VERSION,
  });

  // Serialize the permission account (this contains the approval)
  return serializePermissionAccount(sessionKeyAccount);
}

/**
 * Deserialize and create a kernel client from a session key.
 * Used by the backend or frontend to send transactions with the session key.
 */
export async function createKernelClientFromSessionKey(
  sessionKeyPrivateKey: Hex,
  serializedApproval: string,
  config: ResolvedConfig
) {
  const publicClient = createKernelPublicClient(config);
  const entryPoint = getEntryPoint(config.entryPointVersion);
  const sessionKeyAccount = privateKeyToAccount(sessionKeyPrivateKey);

  // Create the ECDSA signer from the session key
  const sessionKeySigner = await toECDSASigner({
    signer: sessionKeyAccount,
  });

  // Deserialize the permission account with the real session key signer
  const kernelAccount = await deserializePermissionAccount(
    publicClient,
    entryPoint,
    KERNEL_VERSION,
    serializedApproval,
    sessionKeySigner
  );

  // Create the client with Pimlico paymaster
  return createKernelSmartAccountClient(kernelAccount, config);
}
