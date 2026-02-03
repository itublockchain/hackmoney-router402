// Client utilities
export {
  createBasePublicClient,
  createSmartAccount,
  getSmartAccountAddress,
  getSmartAccountBalance,
  getSmartAccountInfo,
  isSmartAccountDeployed,
  sendUserOperation,
} from "./client";

// Re-export kernel utilities from SDK
export {
  createEcdsaValidator,
  createKernelAccountFromWallet,
  createKernelClientFromSessionKey,
  createKernelPublicClient,
  createKernelSmartAccountClient,
  createSessionKeyApproval,
  getKernelAccountAddress,
  isKernelAccountDeployed,
} from "./kernel";

// Re-export types from SDK
export * from "./types";
