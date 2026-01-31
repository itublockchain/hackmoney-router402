import { configLogger } from "@/lib/logger";
import { type Config, configSchema } from "./schema";

/**
 * Load and validate application configuration from environment variables
 * This function validates environment variables at build/runtime
 *
 * In Next.js:
 * - NEXT_PUBLIC_* variables are available in both server and client
 * - Other variables are only available on the server
 *
 * @throws {Error} If required environment variables are missing or invalid
 * @returns {Config} Validated and typed configuration object
 */
function loadConfig(): Config {
  try {
    // Parse and validate environment variables
    const config = configSchema.parse({
      NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID:
        process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      NODE_ENV: process.env.NODE_ENV,
    });

    return config;
  } catch (error) {
    // Format Zod errors for better readability
    if (error instanceof Error) {
      configLogger.error("Configuration validation failed", {
        error: error.message,
      });
      throw new Error(
        `Invalid configuration: ${error.message}\n\nPlease check your environment variables and .env file.`
      );
    }

    throw error;
  }
}

/**
 * Global configuration instance
 * Initialized once at module load
 */
let configInstance: Config | null = null;

/**
 * Get the application configuration
 * Lazy-loads and caches the configuration on first access
 *
 * @returns {Config} The validated configuration object
 */
export function getConfig(): Config {
  if (!configInstance) {
    configInstance = loadConfig();
  }
  return configInstance;
}

/**
 * Re-export types for convenience
 */
export type { Config } from "./schema";
