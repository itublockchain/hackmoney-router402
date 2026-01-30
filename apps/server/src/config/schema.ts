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
  CORS_ORIGIN: z.string().url().default("http://localhost:3000"),
});

/**
 * Inferred type from the config schema
 */
export type Config = z.infer<typeof configSchema>;
