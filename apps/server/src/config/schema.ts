import { z } from "zod";

/**
 * Environment variable validation schema
 * This schema defines all required and optional environment variables
 * with their types and validation rules.
 */
export const configSchema = z.object({
  /**
   * Server port number
   * @default 8080
   */
  PORT: z
    .string()
    .default("8080")
    .transform((val) => Number.parseInt(val, 10))
    .pipe(z.number().int().positive()),

  /**
   * Node environment
   * @default "development"
   */
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  /**
   * CORS origin for cross-origin requests
   * @default "http://localhost:3000"
   */
  CORS_ORIGIN: z.url().default("http://localhost:3000"),

  /**
   * Database connection URL
   * PostgreSQL connection string for Neon database
   * @default "postgresql://username:password@host.neon.tech/neondb"
   */
  DATABASE_URL: z.url(),

  /**
   * Base RPC URL
   * RPC endpoint for blockchain interactions
   * @default "https://mainnet.base.org/"
   */
  RPC_URL: z.url().default("https://mainnet.base.org/"),

  /**
   * x402 Payment wallet address
   * Wallet address to receive payments
   * @default "0x5Ba55eaBD43743Ef6bB6285f393fA3CbA33FbA5e"
   */
  PAY_TO: z.string().default("0x5Ba55eaBD43743Ef6bB6285f393fA3CbA33FbA5e"),

  /**
   * x402 Facilitator URL
   * URL for the x402 facilitator service
   * @default "https://x402.org/facilitator"
   */
  FACILITATOR_URL: z.url().default("https://x402.org/facilitator"),

  /**
   * JWT Secret for signing authorization tokens
   * Should be a strong random string in production
   */
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),

  /**
   * Pimlico API Key for account abstraction
   */
  PIMLICO_API_KEY: z.string().min(1, "PIMLICO_API_KEY is required"),
});

/**
 * Inferred type from the config schema
 */
export type Config = z.infer<typeof configSchema>;
