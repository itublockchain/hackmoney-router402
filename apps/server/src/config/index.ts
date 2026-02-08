import "dotenv/config";
import { logger } from "@router402/utils";
import { type Config, configSchema } from "./schema.js";

/**
 * Load and validate application configuration from environment variables
 * This function should be called once at application bootstrap
 *
 * @throws {Error} If required environment variables are missing or invalid
 * @returns {Config} Validated and typed configuration object
 */
export function loadConfig(): Config {
  const configLogger = logger.context("Config");

  try {
    // Parse and validate environment variables
    const config = configSchema.parse({
      PORT: process.env.PORT,
      NODE_ENV: process.env.NODE_ENV,
      CHAIN_ENV: process.env.CHAIN_ENV,
      CORS_ORIGIN: process.env.CORS_ORIGIN,
      DATABASE_URL: process.env.DATABASE_URL,
      RPC_URL: process.env.RPC_URL,
      PAY_TO: process.env.PAY_TO,
      FACILITATOR_URL: process.env.FACILITATOR_URL,
      JWT_SECRET: process.env.JWT_SECRET,
      PIMLICO_API_KEY: process.env.PIMLICO_API_KEY,
      WALLET_CONNECT_PROJECT_ID: process.env.WALLET_CONNECT_PROJECT_ID,
    });

    configLogger.info("Configuration loaded successfully");
    return config;
  } catch (error) {
    configLogger.error("Configuration validation failed");

    // Format Zod errors for better readability
    if (error instanceof Error) {
      throw new Error(
        `Invalid configuration: ${error.message}\n\nPlease check your environment variables and .env file.`
      );
    }

    throw error;
  }
}

/**
 * Global configuration instance
 * Initialized once at application startup
 */
let configInstance: Config | null = null;

/**
 * Get the application configuration
 * Must be initialized first with loadConfig()
 *
 * @throws {Error} If configuration hasn't been loaded yet
 * @returns {Config} The validated configuration object
 */
export function getConfig(): Config {
  if (!configInstance) {
    throw new Error(
      "Configuration not initialized. Call loadConfig() first at application startup."
    );
  }
  return configInstance;
}

/**
 * Initialize and store the configuration
 * Should be called once at application bootstrap
 *
 * @returns {Config} The validated configuration object
 */
export function initConfig(): Config {
  configInstance = loadConfig();
  return configInstance;
}

/**
 * Re-export types for convenience
 */
export type { Config } from "./schema.js";
