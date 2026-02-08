/**
 * Express type augmentation for custom request properties
 */

import type { JwtPayload } from "../services/auth.service.js";

declare global {
  // biome-ignore lint/style/noNamespace: Required for Express type augmentation
  namespace Express {
    interface Request {
      /** Wallet address extracted from x402 payment header */
      walletAddress?: string;
      /** JWT payload attached by auth middleware */
      user?: JwtPayload;
    }
  }
}

// biome-ignore lint: We need to augment the Express namespace for our custom request properties
export {};
