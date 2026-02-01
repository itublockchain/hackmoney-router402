/**
 * Error Utilities
 *
 * Provides utilities for translating provider errors and validation errors
 * to OpenRouter-compatible error format.
 *
 * @module utils/errors
 * @see Requirements 9.1, 9.2, 9.3, 9.4
 */

import type { ZodError } from "zod";
import {
  AuthenticationError,
  ContentFilterError,
  InvalidRequestError,
  ProviderError,
  ProviderUnavailableError,
  RateLimitError,
  UnsupportedModelError,
} from "../providers/base.js";
import type { OpenRouterError } from "../types/chat.js";

// ============================================================================
// Error Type Constants
// ============================================================================

/**
 * OpenRouter error types
 */
export const ErrorTypes = {
  /** Invalid request parameters or format */
  INVALID_REQUEST: "invalid_request_error",
  /** Rate limit exceeded */
  RATE_LIMIT: "rate_limit_error",
  /** Internal API error */
  API_ERROR: "api_error",
  /** Content was filtered */
  CONTENT_FILTER: "content_filter_error",
} as const;

export type ErrorType = (typeof ErrorTypes)[keyof typeof ErrorTypes];

// ============================================================================
// HTTP Status Code Mapping
// ============================================================================

/**
 * Maps provider error types to HTTP status codes.
 *
 * | Provider Error       | HTTP Status | OpenRouter Type        |
 * |---------------------|-------------|------------------------|
 * | Invalid API key     | 500         | api_error              |
 * | Rate limited        | 429         | rate_limit_error       |
 * | Invalid request     | 400         | invalid_request_error  |
 * | Model not found     | 404         | invalid_request_error  |
 * | Server error        | 500         | api_error              |
 * | Service unavailable | 503         | api_error              |
 */
export function getHttpStatusCode(error: unknown): number {
  if (error instanceof RateLimitError) {
    return 429;
  }
  if (error instanceof ProviderUnavailableError) {
    return 503;
  }
  if (error instanceof UnsupportedModelError) {
    return 400;
  }
  if (error instanceof InvalidRequestError) {
    return 400;
  }
  if (error instanceof ContentFilterError) {
    return 400;
  }
  if (error instanceof AuthenticationError) {
    return 500;
  }
  if (error instanceof ProviderError) {
    return error.statusCode;
  }
  return 500;
}

// ============================================================================
// Provider Error Translation
// ============================================================================

/**
 * Maps Anthropic error status codes to OpenRouter error types.
 *
 * @param status - HTTP status code from Anthropic
 * @returns OpenRouter error type
 */
function mapAnthropicErrorType(status: number | undefined): ErrorType {
  switch (status) {
    case 400:
      return ErrorTypes.INVALID_REQUEST;
    case 401:
      return ErrorTypes.API_ERROR;
    case 429:
      return ErrorTypes.RATE_LIMIT;
    case 503:
    case 529:
      return ErrorTypes.API_ERROR;
    default:
      return ErrorTypes.API_ERROR;
  }
}

/**
 * Maps Gemini error messages to OpenRouter error types.
 *
 * @param message - Error message from Gemini
 * @returns OpenRouter error type
 */
function mapGeminiErrorType(message: string): ErrorType {
  if (message.includes("429") || message.includes("rate limit")) {
    return ErrorTypes.RATE_LIMIT;
  }
  if (message.includes("400") || message.includes("invalid")) {
    return ErrorTypes.INVALID_REQUEST;
  }
  if (
    message.includes("SAFETY") ||
    message.includes("blocked") ||
    message.includes("content filter")
  ) {
    return ErrorTypes.CONTENT_FILTER;
  }
  return ErrorTypes.API_ERROR;
}

/**
 * Translates provider-specific errors to OpenRouter error format.
 *
 * Handles errors from:
 * - Anthropic Claude API
 * - Google Gemini API
 * - Generic provider errors
 *
 * @see Requirement 9.1 - Translate provider errors to OpenRouter error format
 * @see Requirement 9.2 - Return 429 error for rate limiting
 * @see Requirement 9.3 - Return 503 error for provider unavailability
 * @see Requirement 9.4 - Include error type, message, and optional details
 *
 * @param error - The error to translate
 * @param provider - The provider name ('claude' or 'gemini')
 * @returns OpenRouter-formatted error response
 */
export function translateProviderError(
  error: unknown,
  provider: string
): OpenRouterError {
  // Handle our custom provider error types
  if (error instanceof RateLimitError) {
    return {
      error: {
        message: error.message,
        type: ErrorTypes.RATE_LIMIT,
        code: "rate_limit_exceeded",
      },
    };
  }

  if (error instanceof ProviderUnavailableError) {
    return {
      error: {
        message: error.message,
        type: ErrorTypes.API_ERROR,
        code: "service_unavailable",
      },
    };
  }

  if (error instanceof AuthenticationError) {
    return {
      error: {
        message: error.message,
        type: ErrorTypes.API_ERROR,
        code: "authentication_error",
      },
    };
  }

  if (error instanceof UnsupportedModelError) {
    return {
      error: {
        message: error.message,
        type: ErrorTypes.INVALID_REQUEST,
        code: "model_not_found",
      },
    };
  }

  if (error instanceof InvalidRequestError) {
    return {
      error: {
        message: error.message,
        type: ErrorTypes.INVALID_REQUEST,
        param: error.param,
        code: "invalid_request",
      },
    };
  }

  if (error instanceof ContentFilterError) {
    return {
      error: {
        message: error.message,
        type: ErrorTypes.CONTENT_FILTER,
        code: "content_filtered",
      },
    };
  }

  if (error instanceof ProviderError) {
    return {
      error: {
        message: error.message,
        type: error.type as ErrorType,
        code: error.name.toLowerCase(),
      },
    };
  }

  // Handle raw Anthropic SDK errors (if they weren't already wrapped)
  if (provider === "claude" && isAnthropicError(error)) {
    const anthropicError = error as AnthropicErrorLike;
    return {
      error: {
        message: anthropicError.message,
        type: mapAnthropicErrorType(anthropicError.status),
        code: anthropicError.error?.type,
      },
    };
  }

  // Handle raw Google AI SDK errors (if they weren't already wrapped)
  if (provider === "gemini" && error instanceof Error) {
    return {
      error: {
        message: error.message,
        type: mapGeminiErrorType(error.message),
      },
    };
  }

  // Generic error handling
  if (error instanceof Error) {
    return {
      error: {
        message: error.message,
        type: ErrorTypes.API_ERROR,
      },
    };
  }

  // Unknown error type
  return {
    error: {
      message: "An unexpected error occurred",
      type: ErrorTypes.API_ERROR,
    },
  };
}

// ============================================================================
// Anthropic Error Type Guard
// ============================================================================

/**
 * Shape of Anthropic SDK errors
 */
interface AnthropicErrorLike {
  message: string;
  status?: number;
  error?: {
    type?: string;
    message?: string;
  };
}

/**
 * Type guard to check if an error looks like an Anthropic SDK error.
 *
 * @param error - The error to check
 * @returns True if the error has Anthropic error shape
 */
function isAnthropicError(error: unknown): error is AnthropicErrorLike {
  if (!(error instanceof Error)) {
    return false;
  }
  const err = error as unknown as Record<string, unknown>;
  return (
    typeof err.status === "number" ||
    (typeof err.error === "object" && err.error !== null)
  );
}

// ============================================================================
// Validation Error Formatting
// ============================================================================

/**
 * Formats Zod validation errors to OpenRouter error format.
 *
 * Combines all validation issues into a single error message,
 * with the first issue's path used as the param field.
 *
 * @see Requirement 9.4 - Include error type, message, and optional details
 *
 * @param error - Zod validation error
 * @returns OpenRouter-formatted error response
 *
 * @example
 * ```typescript
 * const result = schema.safeParse(data);
 * if (!result.success) {
 *   const openRouterError = formatValidationError(result.error);
 *   // { error: { message: "messages: Required", type: "invalid_request_error", param: "messages" } }
 * }
 * ```
 */
export function formatValidationError(error: ZodError): OpenRouterError {
  const issues = error.issues.map((issue) => {
    const path = issue.path.join(".");
    return path ? `${path}: ${issue.message}` : issue.message;
  });

  const firstPath = error.issues[0]?.path.join(".");

  return {
    error: {
      message: issues.join("; "),
      type: ErrorTypes.INVALID_REQUEST,
      param: firstPath || undefined,
    },
  };
}

// ============================================================================
// Error Response Builder
// ============================================================================

/**
 * Creates an OpenRouter error response with the given parameters.
 *
 * @param message - Error message
 * @param type - Error type
 * @param param - Optional parameter that caused the error
 * @param code - Optional error code
 * @returns OpenRouter-formatted error response
 */
export function createErrorResponse(
  message: string,
  type: ErrorType = ErrorTypes.API_ERROR,
  param?: string,
  code?: string
): OpenRouterError {
  return {
    error: {
      message,
      type,
      ...(param && { param }),
      ...(code && { code }),
    },
  };
}

// ============================================================================
// Rate Limit Headers
// ============================================================================

/**
 * Extracts rate limit headers from a RateLimitError.
 *
 * @see Requirement 9.2 - Return 429 error with appropriate headers
 *
 * @param error - The rate limit error
 * @returns Headers object with Retry-After if available
 */
export function getRateLimitHeaders(
  error: RateLimitError
): Record<string, string> {
  const headers: Record<string, string> = {};

  if (error.retryAfter !== undefined) {
    headers["Retry-After"] = String(error.retryAfter);
  }

  return headers;
}
