/**
 * Provider Registry
 *
 * Factory module for selecting and instantiating LLM provider adapters
 * based on OpenRouter model identifiers. Maps OpenRouter model IDs to
 * provider-specific model IDs and returns the appropriate provider instance.
 *
 * @module providers/index
 * @see Requirements 2.1, 2.2, 2.3, 2.4
 */

import type { LLMProvider } from "./base.js";
import { UnsupportedModelError } from "./base.js";
import { ClaudeProvider } from "./claude.js";
import { GeminiProvider } from "./gemini.js";

// ============================================================================
// Supported Models Mapping
// ============================================================================

/**
 * Mapping of OpenRouter model identifiers to provider-specific model IDs.
 *
 * OpenRouter uses a vendor/model format (e.g., 'anthropic/claude-sonnet-4.5')
 * while providers use their own identifiers (e.g., 'claude-sonnet-4-5-20250929').
 *
 * @see Requirement 2.4 - Map OpenRouter model identifiers to provider-specific model identifiers
 */
export const SUPPORTED_MODELS = {
  // Anthropic Claude models
  "anthropic/claude-opus-4.5": "claude-opus-4-5-20251101",
  "anthropic/claude-sonnet-4.5": "claude-sonnet-4-5-20250929",
  "anthropic/claude-haiku-4.5": "claude-haiku-4-5-20251001",

  // Google Gemini models
  "google/gemini-3-pro-preview": "gemini-3-pro-preview",
  "google/gemini-3-flash-preview": "gemini-3-flash-preview",
} as const;

/**
 * Type representing all supported OpenRouter model identifiers.
 */
export type SupportedModel = keyof typeof SUPPORTED_MODELS;

/**
 * Type representing all provider-specific model identifiers.
 */
export type ProviderModelId = (typeof SUPPORTED_MODELS)[SupportedModel];

/**
 * List of all supported model identifiers for error messages.
 */
export const SUPPORTED_MODEL_LIST = Object.keys(
  SUPPORTED_MODELS
) as SupportedModel[];

// ============================================================================
// Provider Factory
// ============================================================================

/**
 * Result of getProvider() containing the provider instance and mapped model ID.
 */
export interface ProviderResult {
  /** The LLM provider adapter instance */
  provider: LLMProvider;
  /** The provider-specific model identifier */
  modelId: string;
}

/**
 * Error thrown when a model prefix doesn't match any known provider.
 * This is a programming error - if a model is in SUPPORTED_MODELS,
 * its prefix should be handled in getProvider().
 */
export class UnknownProviderError extends Error {
  /** The model that has an unknown provider prefix */
  public readonly model: string;

  constructor(model: string) {
    super(
      `Unknown provider for model '${model}'. This is an internal error - the model is in SUPPORTED_MODELS but has no provider handler.`
    );
    this.name = "UnknownProviderError";
    this.model = model;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, UnknownProviderError);
    }
  }
}

/**
 * Factory function that returns the appropriate provider adapter based on
 * the OpenRouter model identifier.
 *
 * The function:
 * 1. Validates the model is supported
 * 2. Maps the OpenRouter model ID to the provider-specific model ID
 * 3. Instantiates and returns the appropriate provider adapter
 *
 * @param model - OpenRouter model identifier (e.g., 'anthropic/claude-sonnet-4.5')
 * @returns Object containing the provider instance and mapped model ID
 * @throws {UnsupportedModelError} If the model is not in SUPPORTED_MODELS
 * @throws {UnknownProviderError} If the model prefix doesn't match any provider
 *
 * @see Requirement 2.1 - Route anthropic/* models to Claude Provider
 * @see Requirement 2.2 - Route google/* models to Gemini Provider
 * @see Requirement 2.3 - Return 400 error for unsupported models listing supported models
 * @see Requirement 2.4 - Map OpenRouter model identifiers to provider-specific model identifiers
 *
 * @example
 * ```typescript
 * const { provider, modelId } = getProvider('anthropic/claude-sonnet-4.5');
 * // provider is ClaudeProvider instance
 * // modelId is 'claude-sonnet-4-5-20250929'
 *
 * const response = await provider.chat({ model: modelId, messages: [...] });
 * ```
 */
export function getProvider(model: string): ProviderResult {
  // Check if model is supported and get the provider-specific model ID
  const modelId = SUPPORTED_MODELS[model as SupportedModel];

  if (!modelId) {
    throw new UnsupportedModelError(model, SUPPORTED_MODEL_LIST);
  }

  // Route to appropriate provider based on model prefix
  if (model.startsWith("anthropic/")) {
    return { provider: new ClaudeProvider(), modelId };
  }

  if (model.startsWith("google/")) {
    return { provider: new GeminiProvider(), modelId };
  }

  // This should never happen if SUPPORTED_MODELS is properly maintained
  throw new UnknownProviderError(model);
}

/**
 * Check if a model identifier is supported.
 *
 * @param model - Model identifier to check
 * @returns true if the model is supported, false otherwise
 *
 * @example
 * ```typescript
 * if (isModelSupported('anthropic/claude-sonnet-4.5')) {
 *   // Model is supported
 * }
 * ```
 */
export function isModelSupported(model: string): model is SupportedModel {
  return model in SUPPORTED_MODELS;
}

/**
 * Get the provider-specific model ID for a supported model.
 *
 * @param model - OpenRouter model identifier
 * @returns The provider-specific model ID, or undefined if not supported
 *
 * @example
 * ```typescript
 * const modelId = getProviderModelId('anthropic/claude-sonnet-4.5');
 * // Returns 'claude-sonnet-4-5-20250929'
 * ```
 */
export function getProviderModelId(model: string): string | undefined {
  return SUPPORTED_MODELS[model as SupportedModel];
}

/**
 * Get the provider name for a model identifier.
 *
 * @param model - Model identifier
 * @returns 'anthropic' | 'google' | undefined
 *
 * @example
 * ```typescript
 * const provider = getProviderName('anthropic/claude-sonnet-4.5');
 * // Returns 'anthropic'
 * ```
 */
export function getProviderName(
  model: string
): "anthropic" | "google" | undefined {
  if (model.startsWith("anthropic/")) {
    return "anthropic";
  }
  if (model.startsWith("google/")) {
    return "google";
  }
  return undefined;
}
