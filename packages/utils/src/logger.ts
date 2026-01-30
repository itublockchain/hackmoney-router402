/**
 * Log levels for the Logger class
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Color codes for terminal output
 */
const COLORS = {
  reset: "\x1b[0m",
  debug: "\x1b[36m", // Cyan
  info: "\x1b[32m", // Green
  warn: "\x1b[33m", // Yellow
  error: "\x1b[31m", // Red
  timestamp: "\x1b[90m", // Gray
  context: "\x1b[35m", // Magenta
} as const;

/**
 * Metadata type for structured logging
 */
export type LogMetadata = Record<string, unknown>;

/**
 * Unified Logger class for backend logging
 * Provides consistent, structured logging with timestamps, colors, and context
 */
export class Logger {
  private minLevel: LogLevel;
  private contextName?: string;

  constructor(contextName?: string, minLevel?: LogLevel) {
    this.contextName = contextName;
    this.minLevel =
      minLevel ??
      (process.env.NODE_ENV === "production" ? LogLevel.INFO : LogLevel.DEBUG);
  }

  /**
   * Create a child logger with a specific context
   */
  context(name: string): Logger {
    const contextName = this.contextName ? `${this.contextName}:${name}` : name;
    return new Logger(contextName, this.minLevel);
  }

  /**
   * Set the minimum log level
   */
  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  /**
   * Format timestamp with color
   */
  private formatTimestamp(): string {
    const timestamp = new Date().toISOString();
    return `${COLORS.timestamp}[${timestamp}]${COLORS.reset}`;
  }

  /**
   * Format context with color
   */
  private formatContext(): string {
    if (!this.contextName) return "";
    return `${COLORS.context}[${this.contextName}]${COLORS.reset} `;
  }

  /**
   * Format metadata for display
   */
  private formatMetadata(metadata?: LogMetadata): string {
    if (!metadata || Object.keys(metadata).length === 0) return "";
    try {
      return ` ${JSON.stringify(metadata)}`;
    } catch {
      return " [Circular metadata]";
    }
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    levelName: string,
    color: string,
    message: string,
    metadata?: LogMetadata | Error
  ): void {
    if (level < this.minLevel) return;

    const timestamp = this.formatTimestamp();
    const context = this.formatContext();
    const levelLabel = `${color}${levelName.toUpperCase()}${COLORS.reset}`;

    let metadataStr = "";
    if (metadata) {
      if (metadata instanceof Error) {
        metadataStr = `\n${metadata.stack || metadata.message}`;
      } else {
        metadataStr = this.formatMetadata(metadata);
      }
    }

    const output = `${timestamp} ${levelLabel} ${context}${message}${metadataStr}`;

    if (level >= LogLevel.ERROR) {
      console.error(output);
    } else {
      console.log(output);
    }
  }

  /**
   * Log debug message (detailed diagnostic info)
   */
  debug(message: string, metadata?: LogMetadata): void {
    this.log(LogLevel.DEBUG, "debug", COLORS.debug, message, metadata);
  }

  /**
   * Log info message (general informational messages)
   */
  info(message: string, metadata?: LogMetadata): void {
    this.log(LogLevel.INFO, "info", COLORS.info, message, metadata);
  }

  /**
   * Log warning message (potentially harmful situations)
   */
  warn(message: string, metadata?: LogMetadata): void {
    this.log(LogLevel.WARN, "warn", COLORS.warn, message, metadata);
  }

  /**
   * Log error message (error events)
   */
  error(message: string, error?: Error | LogMetadata): void {
    this.log(LogLevel.ERROR, "error", COLORS.error, message, error);
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger();
