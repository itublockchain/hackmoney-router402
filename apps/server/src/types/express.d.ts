/**
 * Express type augmentation for custom request properties
 */

declare global {
  // biome-ignore lint/style/noNamespace: Required for Express type augmentation
  namespace Express {
    interface Request {
      /** Wallet address extracted from x402 payment header */
      walletAddress?: string;
    }
  }
}

export {};
