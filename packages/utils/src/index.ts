/**
 * Format current timestamp in ISO format
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Format uptime in seconds
 */
export function formatUptime(startTime: number): number {
  return Math.floor((Date.now() - startTime) / 1000);
}

/**
 * Async delay utility
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Environment variable helper with type safety
 */
export function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${key} is not defined`);
  }
  return value;
}

/**
 * Logger utilities
 */
export { Logger, LogLevel, type LogMetadata, logger } from "./logger";

/**
 * Type-safe route builder utilities
 */
export {
  defineRoute,
  type RouteConfig,
  type RouteHandler,
  type TypedRequest,
  ValidationError,
  validationErrorHandler,
} from "./route-builder";
