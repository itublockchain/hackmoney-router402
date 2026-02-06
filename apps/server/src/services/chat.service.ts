/**
 * Chat Service
 *
 * Orchestrates chat completion requests by routing them to the appropriate
 * provider adapter and formatting responses in OpenRouter format.
 *
 * @module services/chat.service
 * @see Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 6.2, 6.5, 6.6
 */

import { randomUUID } from "node:crypto";

import type { ChatChunk, ChatParams, ChatResponse } from "../providers/base.js";
import { getProvider } from "../providers/index.js";
import type {
  ChatCompletionChunk,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChunkChoice,
  ChunkDelta,
  Usage,
} from "../types/chat.js";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generates a unique response ID with 'gen-' prefix.
 *
 * @returns A unique identifier string starting with 'gen-'
 * @see Requirement 5.2 - Include id with 'gen-' prefix
 */
function generateResponseId(): string {
  return `gen-${randomUUID()}`;
}

/**
 * Gets the current Unix timestamp in seconds.
 *
 * @returns Current Unix timestamp
 * @see Requirement 5.2 - Include created timestamp
 */
function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Normalizes stop sequences to an array format.
 * Handles both string and array inputs.
 *
 * @param stop - Stop sequence(s) from the request
 * @returns Normalized array of stop sequences, or undefined if not provided
 * @see Requirement 7.5 - Normalize stop sequences to array
 */
function normalizeStop(
  stop: string | string[] | undefined
): string[] | undefined {
  if (stop === undefined) {
    return undefined;
  }
  if (typeof stop === "string") {
    return [stop];
  }
  return stop;
}

// ============================================================================
// Chat Service Class
// ============================================================================

/**
 * Service class that orchestrates chat completion requests.
 *
 * Responsibilities:
 * - Routes requests to the appropriate provider based on model
 * - Normalizes request parameters to provider format
 * - Formats provider responses to OpenRouter format
 * - Handles both streaming and non-streaming responses
 *
 * @example
 * ```typescript
 * const chatService = new ChatService();
 *
 * // Non-streaming
 * const response = await chatService.complete(request);
 *
 * // Streaming
 * for await (const chunk of chatService.stream(request)) {
 *   console.log(chunk);
 * }
 * ```
 */
export class ChatService {
  /**
   * Perform a non-streaming chat completion.
   *
   * @param request - OpenRouter-format chat completion request
   * @returns Promise resolving to OpenRouter-format response
   * @throws {UnsupportedModelError} If the model is not supported
   * @throws {ProviderError} If the provider returns an error
   * @throws {Error} If model is not specified in the request
   *
   * @see Requirement 5.1 - Return complete ChatCompletionResponse when stream is false
   * @see Requirement 5.2 - Include id, object, created, model
   * @see Requirement 5.3 - Include choices array with message
   * @see Requirement 5.4 - Include finish_reason
   * @see Requirement 5.5 - Include usage object
   */
  async complete(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    const model = this.getModelFromRequest(request);
    const { provider, modelId } = getProvider(model);
    const params = this.buildParams(request, modelId);
    const response = await provider.chat(params);
    return this.formatResponse(model, response);
  }

  /**
   * Perform a streaming chat completion.
   *
   * Yields ChatCompletionChunk objects as they are received from the provider.
   * The final chunk includes usage statistics.
   *
   * @param request - OpenRouter-format chat completion request
   * @yields ChatCompletionChunk objects in OpenRouter format
   * @throws {UnsupportedModelError} If the model is not supported
   * @throws {ProviderError} If the provider returns an error
   * @throws {Error} If model is not specified in the request
   *
   * @see Requirement 6.2 - Yield ChatCompletionChunk objects with object as 'chat.completion.chunk'
   * @see Requirement 6.5 - Final chunk SHALL include usage statistics
   * @see Requirement 6.6 - Include incremental tool_calls in delta objects
   */
  async *stream(
    request: ChatCompletionRequest
  ): AsyncGenerator<ChatCompletionChunk> {
    const model = this.getModelFromRequest(request);
    const { provider, modelId } = getProvider(model);
    const params = this.buildParams(request, modelId);

    // Generate a consistent ID for all chunks in this stream
    const responseId = generateResponseId();
    const created = getCurrentTimestamp();

    for await (const chunk of provider.chatStream(params)) {
      yield this.formatChunk(model, chunk, responseId, created);
    }
  }

  /**
   * Extract and validate the model from the request.
   *
   * @param request - The chat completion request
   * @returns The model identifier
   * @throws {Error} If model is not specified
   */
  private getModelFromRequest(request: ChatCompletionRequest): string {
    if (!request.model) {
      throw new Error("Model is required for chat completion requests");
    }
    return request.model;
  }

  /**
   * Build normalized ChatParams from an OpenRouter request.
   *
   * Translates OpenRouter request format to the internal ChatParams format
   * used by provider adapters.
   *
   * @param request - OpenRouter-format request
   * @param modelId - Provider-specific model identifier
   * @returns Normalized ChatParams for the provider
   *
   * @see Requirement 7.1 - Pass temperature to provider
   * @see Requirement 7.2 - Pass max_tokens to provider
   * @see Requirement 7.3 - Pass top_p to provider
   * @see Requirement 7.4 - Pass top_k to provider
   * @see Requirement 7.5 - Normalize stop sequences to array
   * @see Requirement 7.6 - Translate response_format to provider
   */
  private buildParams(
    request: ChatCompletionRequest,
    modelId: string
  ): ChatParams {
    return {
      messages: request.messages,
      model: modelId,
      temperature: request.temperature,
      maxTokens: request.max_tokens,
      topP: request.top_p,
      topK: request.top_k,
      stop: normalizeStop(request.stop),
      tools: request.tools,
      toolChoice: request.tool_choice,
      responseFormat: request.response_format,
    };
  }

  /**
   * Format a provider response into OpenRouter ChatCompletionResponse format.
   *
   * @param model - Original model identifier from the request
   * @param response - Response from the provider adapter
   * @returns OpenRouter-format ChatCompletionResponse
   *
   * @see Requirement 5.2 - Include id with 'gen-' prefix, object, created, model
   * @see Requirement 5.3 - Include choices array with message (role, content, tool_calls)
   * @see Requirement 5.4 - Include finish_reason
   * @see Requirement 5.5 - Include usage with prompt_tokens, completion_tokens, total_tokens
   */
  private formatResponse(
    model: string,
    response: ChatResponse
  ): ChatCompletionResponse {
    const usage: Usage = {
      prompt_tokens: response.usage.promptTokens,
      completion_tokens: response.usage.completionTokens,
      total_tokens:
        response.usage.promptTokens + response.usage.completionTokens,
    };

    return {
      id: generateResponseId(),
      object: "chat.completion",
      created: getCurrentTimestamp(),
      model,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: response.content,
            ...(response.toolCalls && response.toolCalls.length > 0
              ? { tool_calls: response.toolCalls }
              : {}),
          },
          finish_reason: response.finishReason,
          logprobs: null,
        },
      ],
      usage,
    };
  }

  /**
   * Format a provider chunk into OpenRouter ChatCompletionChunk format.
   *
   * @param model - Original model identifier from the request
   * @param chunk - Chunk from the provider adapter
   * @param responseId - Consistent ID for all chunks in this stream
   * @param created - Consistent timestamp for all chunks in this stream
   * @returns OpenRouter-format ChatCompletionChunk
   *
   * @see Requirement 6.2 - Object as 'chat.completion.chunk'
   * @see Requirement 6.5 - Final chunk includes usage statistics
   * @see Requirement 6.6 - Include incremental tool_calls in delta objects
   */
  private formatChunk(
    model: string,
    chunk: ChatChunk,
    responseId: string,
    created: number
  ): ChatCompletionChunk {
    // Build the delta object with incremental content
    const delta: ChunkDelta = {};

    // Include role in first chunk (when content starts)
    if (chunk.content !== undefined || chunk.toolCalls !== undefined) {
      delta.role = "assistant";
    }

    // Include content if present
    if (chunk.content !== undefined) {
      delta.content = chunk.content;
    }

    // Include tool calls if present (Requirement 6.6)
    if (chunk.toolCalls && chunk.toolCalls.length > 0) {
      delta.tool_calls = chunk.toolCalls;
    }

    // Build the choice
    const choice: ChunkChoice = {
      index: 0,
      delta,
      finish_reason: chunk.finishReason ?? null,
    };

    // Build the chunk response
    const chunkResponse: ChatCompletionChunk = {
      id: responseId,
      object: "chat.completion.chunk",
      created,
      model,
      choices: [choice],
    };

    // Include usage in final chunk (Requirement 6.5)
    if (chunk.usage) {
      chunkResponse.usage = {
        prompt_tokens: chunk.usage.promptTokens,
        completion_tokens: chunk.usage.completionTokens,
        total_tokens: chunk.usage.promptTokens + chunk.usage.completionTokens,
      };
    }

    return chunkResponse;
  }
}
