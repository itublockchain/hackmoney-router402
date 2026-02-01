/**
 * Claude Provider Adapter
 *
 * Implements the LLMProvider interface for Anthropic Claude models.
 * Handles message translation, tool calling, and streaming responses.
 *
 * @module providers/claude
 * @see Requirements 3.1, 3.2, 3.3, 7.1, 7.2, 7.3, 7.5
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  Message as AnthropicMessage,
  Tool as ClaudeToolType,
  ContentBlock,
  ContentBlockParam,
  ImageBlockParam,
  MessageParam,
  RawMessageStreamEvent,
  TextBlock,
  TextBlockParam,
  ToolResultBlockParam,
  ToolUseBlock,
  ToolUseBlockParam,
} from "@anthropic-ai/sdk/resources/messages.js";
import type { ContentPart, Message, Tool } from "../types/chat.js";
import {
  type ClaudeToolUseBlock,
  fromClaudeToolCalls,
  toClaudeToolChoice,
} from "../utils/tool-mapper.js";
import type {
  ChatChunk,
  ChatParams,
  ChatResponse,
  LLMProvider,
} from "./base.js";
import {
  AuthenticationError,
  InvalidRequestError,
  ProviderError,
  ProviderUnavailableError,
  RateLimitError,
} from "./base.js";

// ============================================================================
// Claude Message Types
// ============================================================================

/**
 * Supported image media types for Claude
 */
type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

// ============================================================================
// Tool Translation
// ============================================================================

/**
 * Converts OpenRouter tool definitions to Claude format.
 * Ensures input_schema has the required 'type: object' field.
 *
 * @param tools - Array of OpenRouter tool definitions
 * @returns Array of Claude tool definitions
 */
function toClaudeToolsWithSchema(tools: Tool[]): ClaudeToolType[] {
  return tools.map((t) => ({
    name: t.function.name,
    description: t.function.description,
    input_schema: {
      type: "object" as const,
      properties:
        (t.function.parameters as Record<string, unknown>)?.properties ?? {},
      required: (t.function.parameters as Record<string, unknown>)?.required as
        | string[]
        | undefined,
    },
  }));
}

// ============================================================================
// Message Translation
// ============================================================================

/**
 * Extracts system messages from the message array and concatenates them.
 *
 * @see Requirement 3.1 - Extract system messages and pass them as the separate system parameter
 *
 * @param messages - Array of OpenRouter messages
 * @returns Concatenated system message string, or undefined if no system messages
 */
export function extractSystemMessages(messages: Message[]): string | undefined {
  const systemMessages = messages
    .filter((m) => m.role === "system")
    .map((m) => {
      if (typeof m.content === "string") {
        return m.content;
      }
      if (Array.isArray(m.content)) {
        return m.content
          .filter(
            (part): part is { type: "text"; text: string } =>
              part.type === "text"
          )
          .map((part) => part.text)
          .join("\n");
      }
      return "";
    })
    .filter((content) => content.length > 0);

  return systemMessages.length > 0 ? systemMessages.join("\n\n") : undefined;
}

/**
 * Validates and returns a supported image media type.
 *
 * @param mediaType - The media type string to validate
 * @returns A valid ImageMediaType or defaults to 'image/jpeg'
 */
function validateImageMediaType(mediaType: string): ImageMediaType {
  const validTypes: ImageMediaType[] = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ];
  return validTypes.includes(mediaType as ImageMediaType)
    ? (mediaType as ImageMediaType)
    : "image/jpeg";
}

/**
 * Converts OpenRouter content parts to Claude content blocks.
 *
 * @param content - OpenRouter content (string or array of content parts)
 * @returns Array of Claude content blocks
 */
function convertContentToClaude(
  content: string | ContentPart[] | null
): ContentBlockParam[] {
  if (content === null) {
    return [];
  }

  if (typeof content === "string") {
    return [{ type: "text", text: content }];
  }

  return content.map((part): ContentBlockParam => {
    if (part.type === "text") {
      return { type: "text", text: part.text };
    }
    if (part.type === "image_url") {
      const url = part.image_url.url;
      // Check if it's a base64 data URL
      if (url.startsWith("data:")) {
        const match = url.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          return {
            type: "image",
            source: {
              type: "base64",
              media_type: validateImageMediaType(match[1]),
              data: match[2],
            },
          } as ImageBlockParam;
        }
      }
      // URL-based image
      return {
        type: "image",
        source: {
          type: "url",
          url: url,
        },
      } as ImageBlockParam;
    }
    // Fallback for unknown types
    return { type: "text", text: "" };
  });
}

/**
 * Converts a tool message to a Claude tool_result content block.
 *
 * @see Requirement 3.3 - Convert role 'tool' messages to tool_result content blocks
 *
 * @param message - OpenRouter tool message
 * @returns Claude tool_result content block
 */
function convertToolMessageToClaude(message: Message): ToolResultBlockParam {
  const content =
    typeof message.content === "string"
      ? message.content
      : message.content
        ? message.content
            .filter(
              (part): part is { type: "text"; text: string } =>
                part.type === "text"
            )
            .map((part) => part.text)
            .join("\n")
        : "";

  return {
    type: "tool_result",
    tool_use_id: message.tool_call_id || "",
    content: content,
  };
}

/**
 * Translates OpenRouter messages to Claude message format.
 *
 * @see Requirement 3.1 - Extract system messages (handled separately)
 * @see Requirement 3.2 - Map role 'assistant' to 'assistant' and role 'user' to 'user'
 * @see Requirement 3.3 - Convert role 'tool' messages to tool_result content blocks
 *
 * @param messages - Array of OpenRouter messages
 * @returns Array of Claude MessageParam objects
 */
export function translateMessages(messages: Message[]): MessageParam[] {
  const claudeMessages: MessageParam[] = [];

  // Filter out system messages (they're handled separately)
  const nonSystemMessages = messages.filter((m) => m.role !== "system");

  for (const message of nonSystemMessages) {
    if (message.role === "tool") {
      // Tool messages become tool_result content blocks
      // They need to be part of a user message in Claude's format
      const toolResult = convertToolMessageToClaude(message);

      // Check if the last message is a user message we can append to
      const lastMessage = claudeMessages[claudeMessages.length - 1];
      if (
        lastMessage &&
        lastMessage.role === "user" &&
        Array.isArray(lastMessage.content)
      ) {
        lastMessage.content.push(toolResult);
      } else {
        // Create a new user message with the tool result
        claudeMessages.push({
          role: "user",
          content: [toolResult],
        });
      }
    } else if (message.role === "assistant") {
      // Assistant messages map directly
      const content: ContentBlockParam[] = [];

      // Add text content
      if (message.content) {
        const textContent =
          typeof message.content === "string"
            ? message.content
            : message.content
                .filter(
                  (part): part is { type: "text"; text: string } =>
                    part.type === "text"
                )
                .map((part) => part.text)
                .join("\n");

        if (textContent) {
          content.push({ type: "text", text: textContent } as TextBlockParam);
        }
      }

      // Add tool calls as tool_use blocks
      if (message.tool_calls) {
        for (const toolCall of message.tool_calls) {
          content.push({
            type: "tool_use",
            id: toolCall.id,
            name: toolCall.function.name,
            input: JSON.parse(toolCall.function.arguments),
          } as ToolUseBlockParam);
        }
      }

      claudeMessages.push({
        role: "assistant",
        content:
          content.length > 0
            ? content
            : [{ type: "text", text: "" } as TextBlockParam],
      });
    } else if (message.role === "user") {
      // User messages map directly
      const content = convertContentToClaude(message.content);
      claudeMessages.push({
        role: "user",
        content:
          content.length > 0
            ? content
            : [{ type: "text", text: "" } as TextBlockParam],
      });
    }
  }

  return claudeMessages;
}

// ============================================================================
// Response Translation
// ============================================================================

/**
 * Maps Claude stop reason to OpenRouter finish reason.
 *
 * @param stopReason - Claude stop reason
 * @returns OpenRouter finish reason
 */
function mapStopReason(
  stopReason: AnthropicMessage["stop_reason"]
): ChatResponse["finishReason"] {
  switch (stopReason) {
    case "end_turn":
      return "stop";
    case "max_tokens":
      return "length";
    case "tool_use":
      return "tool_calls";
    case "stop_sequence":
      return "stop";
    default:
      return "stop";
  }
}

/**
 * Extracts text content from Claude content blocks.
 *
 * @param content - Array of Claude content blocks
 * @returns Concatenated text content or null
 */
function extractTextContent(content: ContentBlock[]): string | null {
  const textBlocks = content.filter(
    (block): block is TextBlock => block.type === "text"
  );

  if (textBlocks.length === 0) {
    return null;
  }

  return textBlocks.map((block) => block.text).join("");
}

/**
 * Extracts tool use blocks from Claude content blocks.
 *
 * @param content - Array of Claude content blocks
 * @returns Array of tool use blocks
 */
function extractToolUseBlocks(content: ContentBlock[]): ClaudeToolUseBlock[] {
  return content
    .filter((block): block is ToolUseBlock => block.type === "tool_use")
    .map((block) => ({
      type: "tool_use" as const,
      id: block.id,
      name: block.name,
      input: block.input as Record<string, unknown>,
    }));
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Translates Anthropic SDK errors to provider errors.
 *
 * @param error - Error from Anthropic SDK
 * @returns Appropriate ProviderError subclass
 */
function translateError(error: unknown): ProviderError {
  if (error instanceof Anthropic.APIError) {
    const status = error.status;
    const message = error.message;

    if (status === 401) {
      return new AuthenticationError("claude", error);
    }
    if (status === 429) {
      // Try to extract retry-after from headers
      const retryAfter = error.headers?.["retry-after"];
      return new RateLimitError(
        "claude",
        retryAfter ? Number.parseInt(retryAfter, 10) : undefined,
        error
      );
    }
    if (status === 503 || status === 529) {
      return new ProviderUnavailableError("claude", error);
    }
    if (status === 400) {
      return new InvalidRequestError("claude", message, undefined, error);
    }

    return new ProviderError(message, status || 500, "api_error", error);
  }

  if (error instanceof Error) {
    return new ProviderError(error.message, 500, "api_error", error);
  }

  return new ProviderError("An unexpected error occurred", 500, "api_error");
}

// ============================================================================
// Claude Provider Implementation
// ============================================================================

/**
 * Claude provider adapter implementing the LLMProvider interface.
 *
 * Handles:
 * - Message translation (system extraction, role mapping, tool_result blocks)
 * - Non-streaming chat completions
 * - Streaming chat completions
 * - Tool calling
 * - Parameter mapping
 *
 * @see Requirements 3.1, 3.2, 3.3, 7.1, 7.2, 7.3, 7.5
 */
export class ClaudeProvider implements LLMProvider {
  readonly name = "claude";
  private client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Perform a non-streaming chat completion.
   *
   * @param params - Chat parameters
   * @returns Promise resolving to the complete response
   * @throws {ProviderError} If the provider returns an error
   */
  async chat(params: ChatParams): Promise<ChatResponse> {
    try {
      const systemMessage = extractSystemMessages(params.messages);
      const messages = translateMessages(params.messages);

      // Build request parameters
      const requestParams: Anthropic.MessageCreateParams = {
        model: params.model,
        messages: messages,
        max_tokens: params.maxTokens || 4096,
      };

      // Add system message if present
      // @see Requirement 3.1
      if (systemMessage) {
        requestParams.system = systemMessage;
      }

      // Add generation parameters
      // @see Requirements 7.1, 7.3, 7.5
      if (params.temperature !== undefined) {
        requestParams.temperature = params.temperature;
      }
      if (params.topP !== undefined) {
        requestParams.top_p = params.topP;
      }
      if (params.stop !== undefined && params.stop.length > 0) {
        requestParams.stop_sequences = params.stop;
      }

      // Add tools if present
      if (params.tools && params.tools.length > 0) {
        requestParams.tools = toClaudeToolsWithSchema(params.tools);

        const toolChoice = toClaudeToolChoice(params.toolChoice);
        if (toolChoice) {
          requestParams.tool_choice = toolChoice;
        }
      }

      const response = await this.client.messages.create(requestParams);

      // Extract content and tool calls
      const textContent = extractTextContent(response.content);
      const toolUseBlocks = extractToolUseBlocks(response.content);
      const toolCalls =
        toolUseBlocks.length > 0
          ? fromClaudeToolCalls(toolUseBlocks)
          : undefined;

      return {
        content: textContent,
        toolCalls,
        finishReason: mapStopReason(response.stop_reason),
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
        },
      };
    } catch (error) {
      throw translateError(error);
    }
  }

  /**
   * Perform a streaming chat completion.
   *
   * @param params - Chat parameters
   * @yields ChatChunk objects as they are received from the provider
   * @throws {ProviderError} If the provider returns an error
   */
  async *chatStream(params: ChatParams): AsyncGenerator<ChatChunk> {
    try {
      const systemMessage = extractSystemMessages(params.messages);
      const messages = translateMessages(params.messages);

      // Build request parameters (without stream property for the stream method)
      const requestParams: Anthropic.MessageCreateParamsNonStreaming = {
        model: params.model,
        messages: messages,
        max_tokens: params.maxTokens || 4096,
      };

      // Add system message if present
      // @see Requirement 3.1
      if (systemMessage) {
        requestParams.system = systemMessage;
      }

      // Add generation parameters
      // @see Requirements 7.1, 7.3, 7.5
      if (params.temperature !== undefined) {
        requestParams.temperature = params.temperature;
      }
      if (params.topP !== undefined) {
        requestParams.top_p = params.topP;
      }
      if (params.stop !== undefined && params.stop.length > 0) {
        requestParams.stop_sequences = params.stop;
      }

      // Add tools if present
      if (params.tools && params.tools.length > 0) {
        requestParams.tools = toClaudeToolsWithSchema(params.tools);

        const toolChoice = toClaudeToolChoice(params.toolChoice);
        if (toolChoice) {
          requestParams.tool_choice = toolChoice;
        }
      }

      const stream = this.client.messages.stream(requestParams);

      // Track accumulated tool calls for streaming
      const toolCallsInProgress: Map<
        number,
        {
          id: string;
          name: string;
          input: string;
        }
      > = new Map();

      let inputTokens = 0;
      let outputTokens = 0;

      for await (const event of stream) {
        const chunk = this.processStreamEvent(
          event as RawMessageStreamEvent,
          toolCallsInProgress
        );

        // Track usage from message_start event
        if (
          event.type === "message_start" &&
          (event as { message?: { usage?: { input_tokens: number } } }).message
            ?.usage
        ) {
          inputTokens = (
            event as { message: { usage: { input_tokens: number } } }
          ).message.usage.input_tokens;
        }

        // Track usage from message_delta event
        if (
          event.type === "message_delta" &&
          (event as { usage?: { output_tokens: number } }).usage
        ) {
          outputTokens = (event as { usage: { output_tokens: number } }).usage
            .output_tokens;
        }

        if (chunk) {
          yield chunk;
        }

        // Handle message_stop to yield final chunk with usage
        if (event.type === "message_stop") {
          yield {
            finishReason: "stop",
            usage: {
              promptTokens: inputTokens,
              completionTokens: outputTokens,
            },
          };
        }
      }
    } catch (error) {
      throw translateError(error);
    }
  }

  /**
   * Process a single stream event and return a ChatChunk if applicable.
   *
   * @param event - Stream event from Anthropic
   * @param toolCallsInProgress - Map tracking in-progress tool calls
   * @returns ChatChunk or null if no chunk should be yielded
   */
  private processStreamEvent(
    event: RawMessageStreamEvent,
    toolCallsInProgress: Map<
      number,
      { id: string; name: string; input: string }
    >
  ): ChatChunk | null {
    switch (event.type) {
      case "content_block_start": {
        const block = event.content_block;
        if (block.type === "tool_use") {
          toolCallsInProgress.set(event.index, {
            id: block.id,
            name: block.name,
            input: "",
          });
        }
        return null;
      }

      case "content_block_delta": {
        const delta = event.delta;
        if (delta.type === "text_delta") {
          return { content: delta.text };
        }
        if (delta.type === "input_json_delta") {
          const toolCall = toolCallsInProgress.get(event.index);
          if (toolCall) {
            toolCall.input += delta.partial_json;
          }
        }
        return null;
      }

      case "content_block_stop": {
        const toolCall = toolCallsInProgress.get(event.index);
        if (toolCall) {
          // Parse the accumulated JSON input
          let parsedInput: Record<string, unknown> = {};
          try {
            parsedInput = JSON.parse(toolCall.input || "{}");
          } catch {
            // If parsing fails, use empty object
          }

          const toolCalls = fromClaudeToolCalls([
            {
              type: "tool_use",
              id: toolCall.id,
              name: toolCall.name,
              input: parsedInput,
            },
          ]);

          toolCallsInProgress.delete(event.index);
          return { toolCalls };
        }
        return null;
      }

      case "message_delta": {
        if (event.delta.stop_reason) {
          return {
            finishReason: mapStopReason(event.delta.stop_reason),
          };
        }
        return null;
      }

      default:
        return null;
    }
  }
}
