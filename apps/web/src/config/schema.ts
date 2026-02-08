import { z } from "zod";

/**
 * Environment variable validation schema for frontend
 * This schema defines all required and optional environment variables
 * with their types and validation rules.
 *
 * Note: Next.js only exposes environment variables prefixed with NEXT_PUBLIC_
 * to the browser. Server-side only variables don't need this prefix.
 */
export const configSchema = z.object({
  /**
   * WalletConnect Project ID
   * Required for wallet connection functionality
   * Get yours at: https://cloud.walletconnect.com/
   */
  NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID: z.string().min(1, {
    message: "WalletConnect Project ID is required",
  }),

  /**
   * Application URL
   * Used for canonical URLs, OG tags, and redirects
   * @default "http://localhost:3000" in development
   */
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),

  /**
   * Backend API URL
   * Used for API calls to the backend server
   * @default "http://localhost:8080" in development
   */
  NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:8080"),

  /**
   * Pimlico API Key
   * Used for ERC-4337 bundler and paymaster operations
   * Get yours at: https://dashboard.pimlico.io/
   */
  NEXT_PUBLIC_PIMLICO_API_KEY: z.string().min(1).optional(),

  /**
   * ZeroDev Project ID
   * Required for ZeroDev SDK operations (bundler, paymaster, session keys)
   * Get yours at: https://dashboard.zerodev.app/
   */
  NEXT_PUBLIC_ZERODEV_PROJECT_ID: z.string().min(1).optional(),

  /**
   * Node environment
   * @default "development"
   */
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  /**
   * Chain environment
   * Determines which blockchain network to use
   * - "testnet": Base Sepolia (for testing)
   * - "mainnet": Base Mainnet (for production)
   * @default "testnet"
   */
  NEXT_PUBLIC_CHAIN_ENV: z.enum(["testnet", "mainnet"]).default("testnet"),

  /**
   * Custom RPC URL for chain interactions
   * Overrides the chain's default RPC endpoint for smart account operations
   * If not set, the chain's built-in default RPC is used
   */
  NEXT_PUBLIC_RPC_URL: z.string().url().optional(),
});

/**
 * Inferred type from the config schema
 */
export type Config = z.infer<typeof configSchema>;
