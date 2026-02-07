/**
 * Provider Base Interface
 *
 * Defines the common interface that all LLM provider adapters must implement.
 * This abstraction allows the chat service to work with different providers
 * (Claude, Gemini) through a unified interface.
 *
 * @module providers/base
 * @see Requirements 3.1, 3.4, 4.1
 */

import type {
  FinishReason,
  Message,
  ResponseFormat,
  Tool,
  ToolCall,
  ToolChoice,
} from "../types/chat.js";

// ============================================================================
// Chat Parameters Interface
// ============================================================================

/**
 * Parameters for chat completion requests.
 * These are the normalized parameters passed to provider adapters.
 * The chat service translates OpenRouter request format to these params.
 */
export interface ChatParams {
  /** Array of messages in the conversation */
  messages: Message[];

  /** Provider-specific model identifier */
  model: string;

  /** Sampling temperature (0-2) */
  temperature?: number;

  /** Maximum tokens to generate */
  maxTokens?: number;

  /** Nucleus sampling parameter (0-1) */
  topP?: number;

  /** Top-k sampling parameter */
  topK?: number;

  /** Stop sequences to end generation */
  stop?: string[];

  /** Tool definitions for function calling */
  tools?: Tool[];

  /** Tool selection strategy */
  toolChoice?: ToolChoice;

  /** Response format specification */
  responseFormat?: ResponseFormat;
}

// ============================================================================
// Chat Response Interface (Non-Streaming)
// ============================================================================

/**
 * Response from a non-streaming chat completion.
 * Provider adapters translate their native response format to this structure.
 */
export interface ChatResponse {
  /** Generated text content, null if only tool calls */
  content: string | null;

  /** Tool calls made by the model */
  toolCalls?: ToolCall[];

  /** Reason why generation stopped */
  finishReason: FinishReason;

  /** Token usage statistics */
  usage: {
    /** Number of tokens in the prompt */
    promptTokens: number;
    /** Number of tokens in the completion */
    completionTokens: number;
  };

  /**
   * Raw provider-specific response parts for multi-turn tool calling.
   * Used to preserve provider metadata (e.g. Gemini thoughtSignature)
   * that must be echoed back in subsequent turns.
   */
  rawAssistantParts?: unknown;
}

// ============================================================================
// Chat Chunk Interface (Streaming)
// ============================================================================

/**
 * A chunk from a streaming chat completion.
 * Provider adapters yield these chunks as they receive streaming data.
 */
export interface ChatChunk {
  /** Incremental text content */
  content?: string;

  /** Incremental tool calls */
  toolCalls?: ToolCall[];

  /** Finish reason (only in final chunk) */
  finishReason?: FinishReason;

  /** Usage statistics (only in final chunk) */
  usage?: {
    /** Number of tokens in the prompt */
    promptTokens: number;
    /** Number of tokens in the completion */
    completionTokens: number;
  };

  /**
   * Raw provider-specific response parts accumulated during streaming.
   * Used to preserve provider metadata (e.g. Gemini thoughtSignature)
   * that must be echoed back in subsequent tool-calling turns.
   */
  rawAssistantParts?: unknown;
}

// ============================================================================
// LLM Provider Interface
// ============================================================================

/**
 * Interface that all LLM provider adapters must implement.
 * Provides a unified API for chat completions across different providers.
 *
 * @example
 * ```typescript
 * class ClaudeProvider implements LLMProvider {
 *   name = 'claude';
 *
 *   async chat(params: ChatParams): Promise<ChatResponse> {
 *     // Translate params to Claude format and call API
 *   }
 *
 *   async *chatStream(params: ChatParams): AsyncGenerator<ChatChunk> {
 *     // Stream responses from Claude API
 *   }
 * }
 * ```
 */
export interface LLMProvider {
  /** Provider name identifier (e.g., 'claude', 'gemini') */
  readonly name: string;

  /**
   * Perform a non-streaming chat completion.
   *
   * @param params - Chat parameters including messages and generation settings
   * @returns Promise resolving to the complete response
   * @throws {ProviderError} If the provider returns an error
   */
  chat(params: ChatParams): Promise<ChatResponse>;

  /**
   * Perform a streaming chat completion.
   *
   * @param params - Chat parameters including messages and generation settings
   * @yields ChatChunk objects as they are received from the provider
   * @throws {ProviderError} If the provider returns an error
   */
  chatStream(params: ChatParams): AsyncGenerator<ChatChunk>;
}

// ============================================================================
// Provider Error Types
// ============================================================================

/**
 * Base error class for all provider-related errors.
 * Provides a common structure for error handling across providers.
 */
export class ProviderError extends Error {
  /** HTTP status code to return to the client */
  public readonly statusCode: number;

  /** Error type for OpenRouter error format */
  public readonly type: string;

  /** Original error from the provider (if available) */
  public readonly cause?: Error;

  constructor(
    message: string,
    statusCode: number,
    type: string,
    cause?: Error
  ) {
    super(message);
    this.name = "ProviderError";
    this.statusCode = statusCode;
    this.type = type;
    this.cause = cause;

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ProviderError);
    }
  }
}

/**
 * Error thrown when a requested model is not supported.
 * Maps to HTTP 400 Bad Request.
 *
 * @see Requirement 2.3
 */
export class UnsupportedModelError extends ProviderError {
  /** The unsupported model identifier */
  public readonly model: string;

  /** List of supported models */
  public readonly supportedModels: string[];

  constructor(model: string, supportedModels: string[] = []) {
    const supportedList =
      supportedModels.length > 0
        ? ` Supported models: ${supportedModels.join(", ")}`
        : "";
    super(
      `Model '${model}' is not supported.${supportedList}`,
      400,
      "invalid_request_error"
    );
    this.name = "UnsupportedModelError";
    this.model = model;
    this.supportedModels = supportedModels;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, UnsupportedModelError);
    }
  }
}

/**
 * Error thrown when the provider's API key is invalid or missing.
 * Maps to HTTP 500 Internal Server Error (since it's a server config issue).
 */
export class AuthenticationError extends ProviderError {
  /** The provider that failed authentication */
  public readonly provider: string;

  constructor(provider: string, cause?: Error) {
    super(
      `Authentication failed for provider '${provider}'. Check API key configuration.`,
      500,
      "api_error",
      cause
    );
    this.name = "AuthenticationError";
    this.provider = provider;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthenticationError);
    }
  }
}

/**
 * Error thrown when the provider rate limits the request.
 * Maps to HTTP 429 Too Many Requests.
 *
 * @see Requirement 9.2
 */
export class RateLimitError extends ProviderError {
  /** The provider that rate limited */
  public readonly provider: string;

  /** Retry-After value in seconds (if provided by provider) */
  public readonly retryAfter?: number;

  constructor(provider: string, retryAfter?: number, cause?: Error) {
    super(
      `Rate limit exceeded for provider '${provider}'.${retryAfter ? ` Retry after ${retryAfter} seconds.` : ""}`,
      429,
      "rate_limit_error",
      cause
    );
    this.name = "RateLimitError";
    this.provider = provider;
    this.retryAfter = retryAfter;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RateLimitError);
    }
  }
}

/**
 * Error thrown when the provider service is unavailable.
 * Maps to HTTP 503 Service Unavailable.
 *
 * @see Requirement 9.3
 */
export class ProviderUnavailableError extends ProviderError {
  /** The provider that is unavailable */
  public readonly provider: string;

  constructor(provider: string, cause?: Error) {
    super(
      `Provider '${provider}' is currently unavailable. Please try again later.`,
      503,
      "api_error",
      cause
    );
    this.name = "ProviderUnavailableError";
    this.provider = provider;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ProviderUnavailableError);
    }
  }
}

/**
 * Error thrown when the provider returns an invalid request error.
 * Maps to HTTP 400 Bad Request.
 */
export class InvalidRequestError extends ProviderError {
  /** The provider that rejected the request */
  public readonly provider: string;

  /** The parameter that caused the error (if known) */
  public readonly param?: string;

  constructor(
    provider: string,
    message: string,
    param?: string,
    cause?: Error
  ) {
    super(message, 400, "invalid_request_error", cause);
    this.name = "InvalidRequestError";
    this.provider = provider;
    this.param = param;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, InvalidRequestError);
    }
  }
}

/**
 * Error thrown when content is filtered by the provider's safety systems.
 * Maps to HTTP 400 Bad Request.
 */
export class ContentFilterError extends ProviderError {
  /** The provider that filtered the content */
  public readonly provider: string;

  constructor(provider: string, cause?: Error) {
    super(
      `Content was filtered by provider '${provider}' safety systems.`,
      400,
      "content_filter_error",
      cause
    );
    this.name = "ContentFilterError";
    this.provider = provider;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ContentFilterError);
    }
  }
}
