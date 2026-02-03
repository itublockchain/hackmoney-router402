// Re-export kernel utilities from SDK
// Note: These functions now require a config parameter
// For the web app, use router402Sdk from @/config/smart-account instead

export {
  createEcdsaValidator,
  createKernelAccountFromWallet,
  createKernelClientFromSessionKey,
  createKernelPublicClient,
  createKernelSmartAccountClient,
  createPimlicoPaymasterClient,
  createSessionKeyApproval,
  getKernelAccountAddress,
  isKernelAccountDeployed,
} from "@router402/sdk";
