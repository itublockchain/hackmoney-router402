import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import {
  deserializePermissionAccount,
  serializePermissionAccount,
  toPermissionValidator,
} from "@zerodev/permissions";
import {
  toSignatureCallerPolicy,
  toSudoPolicy,
  toTimestampPolicy,
} from "@zerodev/permissions/policies";
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
import {
  entryPoint07Address,
  prepareUserOperation,
} from "viem/account-abstraction";
import { privateKeyToAccount } from "viem/accounts";
import { getAction } from "viem/utils";
import { KERNEL_VERSION } from "./config.js";
import type { SmartAccountResolvedConfig as ResolvedConfig } from "./types.js";
import { SmartAccountError } from "./types.js";

/**
 * Create a public client for kernel account operations.
 */
export function createKernelPublicClient(
  config: ResolvedConfig
): PublicClient<Transport, Chain> {
  return createPublicClient({
    chain: config.chain,
    transport: http(config.rpcUrl),
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
 * Verification gas limit multiplier.
 * Kernel V3.1 accounts with permission validators (session keys + policies)
 * have higher verification costs than the bundler estimates. This multiplier
 * gives a safety buffer to prevent AA26 (over verificationGasLimit) errors.
 */
const VERIFICATION_GAS_MULTIPLIER = 3n;
const CALL_GAS_MULTIPLIER = 2n;

/**
 * Create a Smart Account Client with Pimlico bundler and paymaster.
 * Applies a gas multiplier to verificationGasLimit to handle the higher
 * gas costs of permission-based validators (session keys with policies).
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
      prepareUserOperation: async (client, parameters) => {
        const userOp = (await getAction(
          client,
          prepareUserOperation,
          "prepareUserOperation"
        )(parameters as never)) as Record<string, unknown>;

        // Apply multiplier to verification and call gas limits
        if (userOp.verificationGasLimit) {
          userOp.verificationGasLimit =
            (userOp.verificationGasLimit as bigint) *
            VERIFICATION_GAS_MULTIPLIER;
        }
        if (userOp.callGasLimit) {
          userOp.callGasLimit =
            (userOp.callGasLimit as bigint) * CALL_GAS_MULTIPLIER;
        }

        return userOp as never;
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
 *
 * @param walletClient - The owner wallet client
 * @param sessionKeyAddress - The session key's public address
 * @param config - Resolved SDK configuration
 * @param expiresAt - Expiry timestamp in milliseconds (enforced on-chain via toTimestampPolicy)
 * @param allowedCallers - Optional array of addresses allowed to use this session key (enforced on-chain via toSignatureCallerPolicy)
 */
export async function createSessionKeyApproval(
  walletClient: WalletClient,
  sessionKeyAddress: Address,
  config: ResolvedConfig,
  expiresAt: number,
  allowedCallers?: Address[]
): Promise<string> {
  const publicClient = createKernelPublicClient(config);
  const entryPoint = getEntryPoint(config.entryPointVersion);
  const ecdsaValidator = await createEcdsaValidator(walletClient, config);

  // Create an "empty account" for the session key (only using the address)
  const emptyAccount = addressToEmptyAccount(sessionKeyAddress);
  const emptySessionKeySigner = await toECDSASigner({ signer: emptyAccount });

  // Convert expiresAt from milliseconds to seconds for on-chain uint48
  const validUntil = Math.floor(expiresAt / 1000);

  // Build policies: sudo (allows all actions) + timestamp (on-chain expiry)
  const policies = [
    toSudoPolicy({}),
    toTimestampPolicy({ validUntil }),
    ...(allowedCallers && allowedCallers.length > 0
      ? [toSignatureCallerPolicy({ allowedCallers })]
      : []),
  ];

  // Create permission plugin with combined policies
  const permissionPlugin = await toPermissionValidator(publicClient, {
    entryPoint,
    signer: emptySessionKeySigner,
    policies,
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
