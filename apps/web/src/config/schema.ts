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
   * Node environment
   * @default "development"
   */
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

/**
 * Inferred type from the config schema
 */
export type Config = z.infer<typeof configSchema>;
