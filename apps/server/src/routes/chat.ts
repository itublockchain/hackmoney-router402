/**
 * Chat Route Handler
 *
 * Provides the POST /chat/completions endpoint for OpenRouter-compatible
 * chat completion requests. Supports both streaming (SSE) and non-streaming
 * (JSON) responses.
 *
 * @module routes/chat
 * @see Requirements 1.1, 6.1, 6.2, 6.3, 6.4
 */

import { logger } from "@router402/utils";
import {
  type NextFunction,
  type Request,
  type Response,
  Router,
} from "express";
import { ZodError } from "zod";
import { ProviderError, RateLimitError } from "../providers/base.js";
import { ChatService } from "../services/chat.service.js";
import { recordUsage } from "../services/debt.js";
import { ChatCompletionRequestSchema } from "../types/chat.js";
import {
  formatValidationError,
  getHttpStatusCode,
  getRateLimitHeaders,
  translateProviderError,
} from "../utils/errors.js";
import { calculateCost, isSupportedModel } from "../utils/pricing.js";
import {
  getSmartAccountAddressFromContext,
  getWalletAddress,
} from "../utils/request-context.js";

const chatLogger = logger.context("ChatRoute");

// ============================================================================
// Chat Router Factory
// ============================================================================

/**
 * Creates an Express router for chat completion endpoints.
 *
 * This router is designed to be mounted under the x402 paid router,
 * where payment verification is handled by middleware before reaching
 * these endpoints.
 *
 * @returns Express Router configured with chat completion endpoints
 *
 * @example
 * ```typescript
 * import { createChatRouter } from './routes/chat.js';
 *
 * // Mount under x402 paid router
 * paidRouter.use('/', createChatRouter());
 * ```
 */
export function createChatRouter(): Router {
  const chatRouter = Router();
  const chatService = new ChatService();

  /**
   * POST /chat/completions
   *
   * OpenRouter-compatible chat completion endpoint.
   * Supports both streaming (SSE) and non-streaming (JSON) responses.
   *
   * @see Requirement 1.1 - Validate request body against OpenRouter schema using Zod
   * @see Requirement 6.1 - Set response headers for SSE
   * @see Requirement 6.2 - Yield ChatCompletionChunk objects with object as 'chat.completion.chunk'
   * @see Requirement 6.3 - Format each chunk as 'data: {json}\n\n' per SSE specification
   * @see Requirement 6.4 - Send 'data: [DONE]\n\n' as the final message
   */
  chatRouter.post(
    "/chat/completions",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Validate request body with Zod schema (Requirement 1.1)
        const parseResult = ChatCompletionRequestSchema.safeParse(req.body);

        if (!parseResult.success) {
          // Return 400 error with formatted validation error
          const errorResponse = formatValidationError(parseResult.error);
          res.status(400).json(errorResponse);
          return;
        }

        const request = parseResult.data;

        // Get wallet from AsyncLocalStorage (set by x402 hook)
        const walletAddress = getWalletAddress();
        // Use smart account address for MCP prompt (fallback to EOA)
        const mcpWalletAddress =
          getSmartAccountAddressFromContext() ?? walletAddress;

        if (request.stream) {
          // Handle streaming response (Requirements 6.1, 6.2, 6.3, 6.4)
          await handleStreamingResponse(
            res,
            chatService,
            request,
            walletAddress,
            mcpWalletAddress
          );
        } else {
          // Handle non-streaming response
          const response = await chatService.complete(
            request,
            mcpWalletAddress
          );

          // Debug log for usage tracking
          chatLogger.debug("Usage tracking check", {
            walletAddress,
            hasUsage: !!response.usage,
            model: request.model,
            isSupportedModel: request.model
              ? isSupportedModel(request.model)
              : false,
          });

          // Record usage if wallet is available
          if (
            walletAddress &&
            response.usage &&
            request.model &&
            isSupportedModel(request.model)
          ) {
            const model = request.model;
            const cost = calculateCost(
              model,
              response.usage.prompt_tokens,
              response.usage.completion_tokens
            );
            chatLogger.info("Recording usage", {
              wallet: walletAddress.slice(0, 10),
              model,
              promptTokens: response.usage.prompt_tokens,
              completionTokens: response.usage.completion_tokens,
              totalCost: cost.totalCost.toNumber(),
            });
            await recordUsage(
              walletAddress,
              model,
              response.usage.prompt_tokens,
              response.usage.completion_tokens,
              cost.baseCost.toNumber(),
              cost.commission.toNumber(),
              cost.totalCost.toNumber()
            );
          }

          res.json(response);
        }
      } catch (error) {
        // Handle errors through the error handling middleware
        next(error);
      }
    }
  );

  return chatRouter;
}

// ============================================================================
// Streaming Response Handler
// ============================================================================

/**
 * Handles streaming chat completion responses using Server-Sent Events (SSE).
 *
 * Sets appropriate headers and streams chunks in SSE format.
 * Handles errors gracefully by sending error events before closing the stream.
 *
 * @param res - Express response object
 * @param chatService - Chat service instance
 * @param request - Validated chat completion request
 * @param walletAddress - Optional EOA wallet address for usage tracking
 * @param mcpWalletAddress - Optional smart account address for MCP prompt injection
 *
 * @see Requirement 6.1 - Set response headers for SSE
 * @see Requirement 6.3 - Format each chunk as 'data: {json}\n\n'
 * @see Requirement 6.4 - Send 'data: [DONE]\n\n' as final message
 */
async function handleStreamingResponse(
  res: Response,
  chatService: ChatService,
  request: ReturnType<typeof ChatCompletionRequestSchema.parse>,
  walletAddress?: string,
  mcpWalletAddress?: string
): Promise<void> {
  // Set SSE headers (Requirement 6.1)
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Disable response buffering for real-time streaming
  res.flushHeaders();

  try {
    let finalUsage:
      | { prompt_tokens: number; completion_tokens: number }
      | undefined;

    // Stream chunks from the chat service (Requirements 6.2, 6.3)
    for await (const chunk of chatService.stream(request, mcpWalletAddress)) {
      // Capture usage from final chunk
      if (chunk.usage) {
        finalUsage = chunk.usage;
      }

      // Format as SSE: 'data: {json}\n\n' (Requirement 6.3)
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }

    // Record usage after streaming completes
    if (
      walletAddress &&
      finalUsage &&
      request.model &&
      isSupportedModel(request.model)
    ) {
      const model = request.model;
      const cost = calculateCost(
        model,
        finalUsage.prompt_tokens,
        finalUsage.completion_tokens
      );
      await recordUsage(
        walletAddress,
        model,
        finalUsage.prompt_tokens,
        finalUsage.completion_tokens,
        cost.baseCost.toNumber(),
        cost.commission.toNumber(),
        cost.totalCost.toNumber()
      );
    }

    // Send termination message (Requirement 6.4)
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    // Handle streaming errors gracefully
    await handleStreamingError(res, error);
  }
}

// ============================================================================
// Streaming Error Handler
// ============================================================================

/**
 * Handles errors that occur during streaming.
 *
 * Since headers have already been sent, we cannot change the status code.
 * Instead, we send an error event in SSE format and close the stream.
 *
 * @param res - Express response object
 * @param error - The error that occurred
 */
async function handleStreamingError(
  res: Response,
  error: unknown
): Promise<void> {
  // Determine the provider for error translation
  const provider = error instanceof ProviderError ? "unknown" : "unknown";

  // Translate the error to OpenRouter format
  const errorResponse = translateProviderError(error, provider);

  // Send error as SSE event
  res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);

  // Send termination message
  res.write("data: [DONE]\n\n");
  res.end();
}

// ============================================================================
// Error Handling Middleware
// ============================================================================

/**
 * Express error handling middleware for chat routes.
 *
 * Translates various error types to OpenRouter error format and
 * sets appropriate HTTP status codes.
 *
 * @param err - The error that occurred
 * @param _req - Express request object (unused)
 * @param res - Express response object
 * @param _next - Express next function (unused)
 */
export function chatErrorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const errorResponse = formatValidationError(err);
    res.status(400).json(errorResponse);
    return;
  }

  // Handle rate limit errors with appropriate headers
  if (err instanceof RateLimitError) {
    const errorResponse = translateProviderError(err, err.provider);
    const headers = getRateLimitHeaders(err);

    // Set rate limit headers
    for (const [key, value] of Object.entries(headers)) {
      res.setHeader(key, value);
    }

    res.status(429).json(errorResponse);
    return;
  }

  // Handle provider errors
  if (err instanceof ProviderError) {
    const errorResponse = translateProviderError(err, "unknown");
    const statusCode = getHttpStatusCode(err);
    res.status(statusCode).json(errorResponse);
    return;
  }

  // Handle generic errors
  const errorResponse = translateProviderError(err, "unknown");
  const statusCode = getHttpStatusCode(err);
  res.status(statusCode).json(errorResponse);
}
