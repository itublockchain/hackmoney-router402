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
});

/**
 * Inferred type from the config schema
 */
export type Config = z.infer<typeof configSchema>;
