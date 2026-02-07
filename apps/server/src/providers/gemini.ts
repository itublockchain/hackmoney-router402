/**
 * Gemini Provider Adapter
 *
 * Implements the LLMProvider interface for Google Gemini models.
 * Handles message translation, tool calling, and streaming responses.
 *
 * @module providers/gemini
 * @see Requirements 3.4, 3.5, 3.6, 7.1, 7.2, 7.3, 7.4, 7.5
 */

import {
  type Content,
  type FunctionCall,
  type FunctionCallingMode,
  type FunctionDeclaration,
  type FunctionDeclarationSchema,
  type FunctionDeclarationsTool,
  type GenerateContentResult,
  type GenerationConfig,
  GoogleGenerativeAI,
  type Part,
  SchemaType,
  type ToolConfig,
} from "@google/generative-ai";
import type { ContentPart, Message, Tool } from "../types/chat.js";
import {
  fromGeminiToolCalls,
  type GeminiFunctionCall,
  getSpecificFunctionName,
  toGeminiToolChoice,
} from "../utils/tool-mapper.js";
import type {
  ChatChunk,
  ChatParams,
  ChatResponse,
  LLMProvider,
} from "./base.js";
import {
  AuthenticationError,
  ContentFilterError,
  InvalidRequestError,
  ProviderError,
  ProviderUnavailableError,
  RateLimitError,
} from "./base.js";

// ============================================================================
// Tool Translation
// ============================================================================

/**
 * Converts OpenRouter tool parameters to Gemini FunctionDeclarationSchema format.
 * The Google AI SDK requires a specific schema format with type and properties fields.
 *
 * @param parameters - OpenRouter tool parameters (JSON Schema format)
 * @returns Gemini FunctionDeclarationSchema or undefined
 */
function convertParametersToGeminiSchema(
  parameters: Record<string, unknown> | undefined
): FunctionDeclarationSchema | undefined {
  if (!parameters) {
    return undefined;
  }

  // Extract properties from the JSON Schema
  const properties = (parameters.properties as Record<string, unknown>) || {};
  const required = (parameters.required as string[]) || [];

  // Convert each property to Gemini schema format
  const geminiProperties: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
    const prop = value as Record<string, unknown>;
    const geminiProp: Record<string, unknown> = {
      type: mapJsonSchemaTypeToGemini(prop.type as string),
      description: prop.description,
      ...(prop.enum ? { enum: prop.enum } : {}),
    };

    // Gemini requires 'items' for array types
    if (prop.type === "array") {
      if (prop.items) {
        const items = prop.items as Record<string, unknown>;
        geminiProp.items = {
          type: mapJsonSchemaTypeToGemini(items.type as string),
          ...(items.description ? { description: items.description } : {}),
          ...(items.enum ? { enum: items.enum } : {}),
        };
      } else {
        // Default to string items if not specified
        geminiProp.items = { type: SchemaType.STRING };
      }
    }

    geminiProperties[key] = geminiProp;
  }

  return {
    type: SchemaType.OBJECT,
    properties: geminiProperties as FunctionDeclarationSchema["properties"],
    required: required.length > 0 ? required : undefined,
    description: parameters.description as string | undefined,
  };
}

/**
 * Maps JSON Schema type to Gemini SchemaType.
 *
 * @param jsonType - JSON Schema type string
 * @returns Gemini SchemaType
 */
function mapJsonSchemaTypeToGemini(jsonType: string | undefined): SchemaType {
  switch (jsonType) {
    case "string":
      return SchemaType.STRING;
    case "number":
      return SchemaType.NUMBER;
    case "integer":
      return SchemaType.INTEGER;
    case "boolean":
      return SchemaType.BOOLEAN;
    case "array":
      return SchemaType.ARRAY;
    default:
      return SchemaType.OBJECT;
  }
}

/**
 * Converts OpenRouter tool definitions to Gemini FunctionDeclaration format.
 * This is a local implementation that properly handles the schema conversion
 * required by the Google AI SDK.
 *
 * @param tools - Array of OpenRouter tool definitions
 * @returns Array of Gemini FunctionDeclaration objects
 */
function toGeminiFunctionDeclarations(tools: Tool[]): FunctionDeclaration[] {
  return tools.map((t) => ({
    name: t.function.name,
    description: t.function.description,
    parameters: convertParametersToGeminiSchema(t.function.parameters),
  }));
}

// ============================================================================
// Message Translation
// ============================================================================

/**
 * Extracts system messages from the message array and concatenates them.
 *
 * @see Requirement 3.4 - Extract system messages and pass them as systemInstruction
 *
 * @param messages - Array of OpenRouter messages
 * @returns Concatenated system message string, or undefined if no system messages
 */
export function extractSystemInstruction(
  messages: Message[]
): string | undefined {
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
 * Converts OpenRouter content parts to Gemini parts.
 *
 * @param content - OpenRouter content (string or array of content parts)
 * @returns Array of Gemini parts
 */
function convertContentToGemini(
  content: string | ContentPart[] | null
): Part[] {
  if (content === null) {
    return [];
  }

  if (typeof content === "string") {
    return [{ text: content }];
  }

  return content.map((part): Part => {
    if (part.type === "text") {
      return { text: part.text };
    }
    if (part.type === "image_url") {
      const url = part.image_url.url;
      // Check if it's a base64 data URL
      if (url.startsWith("data:")) {
        const match = url.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          return {
            inlineData: {
              mimeType: match[1],
              data: match[2],
            },
          };
        }
      }
      // URL-based image - Gemini supports file data from URLs
      return {
        fileData: {
          mimeType: "image/jpeg", // Default mime type for URL images
          fileUri: url,
        },
      };
    }
    // Fallback for unknown types
    return { text: "" };
  });
}

/**
 * Converts a tool message to a Gemini functionResponse part.
 *
 * @see Requirement 3.6 - Convert role 'tool' messages to functionResponse format
 *
 * @param message - OpenRouter tool message
 * @returns Gemini functionResponse part
 */
function convertToolMessageToGemini(message: Message): Part {
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

  // Parse the content as JSON if possible, otherwise wrap in response object
  let responseData: Record<string, unknown>;
  try {
    responseData = JSON.parse(content);
  } catch {
    responseData = { result: content };
  }

  return {
    functionResponse: {
      name: message.name || "unknown_function",
      response: responseData,
    },
  };
}

/**
 * Translates OpenRouter messages to Gemini Content format.
 *
 * @see Requirement 3.4 - Extract system messages (handled separately via systemInstruction)
 * @see Requirement 3.5 - Map role 'assistant' to 'model' and role 'user' to 'user'
 * @see Requirement 3.6 - Convert role 'tool' messages to functionResponse format
 *
 * @param messages - Array of OpenRouter messages
 * @returns Array of Gemini Content objects
 */
export function translateMessages(messages: Message[]): Content[] {
  const geminiContents: Content[] = [];

  // Filter out system messages (they're handled separately via systemInstruction)
  const nonSystemMessages = messages.filter((m) => m.role !== "system");

  for (const message of nonSystemMessages) {
    if (message.role === "tool") {
      // Tool messages become functionResponse parts
      // They need to be part of a user turn in Gemini's format
      const functionResponse = convertToolMessageToGemini(message);

      // Check if the last content is a user turn we can append to
      const lastContent = geminiContents[geminiContents.length - 1];
      if (lastContent && lastContent.role === "user") {
        lastContent.parts.push(functionResponse);
      } else {
        // Create a new user turn with the function response
        geminiContents.push({
          role: "user",
          parts: [functionResponse],
        });
      }
    } else if (message.role === "assistant") {
      // Assistant messages map to 'model' role
      // @see Requirement 3.5

      // If raw parts are available (from agentic loop), use them directly
      // to preserve provider metadata like Gemini thoughtSignature
      const rawParts = (message as Record<string, unknown>)._rawParts as
        | Part[]
        | undefined;
      if (rawParts && Array.isArray(rawParts)) {
        geminiContents.push({
          role: "model",
          parts: rawParts,
        });
      } else {
        const parts: Part[] = [];

        // Add text content
        if (message.content) {
          const textParts = convertContentToGemini(message.content);
          parts.push(...textParts);
        }

        // Add tool calls as functionCall parts
        if (message.tool_calls) {
          for (const toolCall of message.tool_calls) {
            parts.push({
              functionCall: {
                name: toolCall.function.name,
                args: JSON.parse(toolCall.function.arguments),
              },
            });
          }
        }

        geminiContents.push({
          role: "model",
          parts: parts.length > 0 ? parts : [{ text: "" }],
        });
      }
    } else if (message.role === "user") {
      // User messages map directly
      // @see Requirement 3.5
      const parts = convertContentToGemini(message.content);
      geminiContents.push({
        role: "user",
        parts: parts.length > 0 ? parts : [{ text: "" }],
      });
    }
  }

  return geminiContents;
}

// ============================================================================
// Response Translation
// ============================================================================

/**
 * Maps Gemini finish reason to OpenRouter finish reason.
 *
 * @param finishReason - Gemini finish reason
 * @returns OpenRouter finish reason
 */
function mapFinishReason(
  finishReason: string | undefined
): ChatResponse["finishReason"] {
  switch (finishReason) {
    case "STOP":
      return "stop";
    case "MAX_TOKENS":
      return "length";
    case "SAFETY":
    case "RECITATION":
    case "BLOCKLIST":
    case "PROHIBITED_CONTENT":
    case "SPII":
      return "content_filter";
    default:
      return "stop";
  }
}

/**
 * Extracts text content from Gemini parts.
 *
 * @param parts - Array of Gemini parts
 * @returns Concatenated text content or null
 */
function extractTextContent(parts: Part[]): string | null {
  if (!parts || parts.length === 0) {
    return null;
  }

  const textParts: string[] = [];

  for (const part of parts) {
    if (
      "text" in part &&
      typeof part.text === "string" &&
      part.text.length > 0
    ) {
      textParts.push(part.text);
    }
  }

  if (textParts.length === 0) {
    return null;
  }

  return textParts.join("");
}

/**
 * Extracts function calls from Gemini parts.
 *
 * @param parts - Array of Gemini parts
 * @returns Array of Gemini function calls
 */
function extractFunctionCalls(parts: Part[]): GeminiFunctionCall[] {
  return parts
    .filter(
      (part): part is { functionCall: FunctionCall } =>
        "functionCall" in part && part.functionCall !== undefined
    )
    .map((part) => ({
      name: part.functionCall.name,
      args: (part.functionCall.args as Record<string, unknown>) || {},
    }));
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Translates Google AI SDK errors to provider errors.
 *
 * @param error - Error from Google AI SDK
 * @returns Appropriate ProviderError subclass
 */
function translateError(error: unknown): ProviderError {
  if (error instanceof Error) {
    const message = error.message;

    // Check for authentication errors
    if (
      message.includes("API key") ||
      message.includes("authentication") ||
      message.includes("401")
    ) {
      return new AuthenticationError("gemini", error);
    }

    // Check for rate limit errors
    if (message.includes("429") || message.includes("rate limit")) {
      return new RateLimitError("gemini", undefined, error);
    }

    // Check for service unavailable
    if (
      message.includes("503") ||
      message.includes("unavailable") ||
      message.includes("overloaded")
    ) {
      return new ProviderUnavailableError("gemini", error);
    }

    // Check for content filter errors
    if (
      message.includes("SAFETY") ||
      message.includes("blocked") ||
      message.includes("content filter")
    ) {
      return new ContentFilterError("gemini", error);
    }

    // Check for invalid request errors
    if (message.includes("400") || message.includes("invalid")) {
      return new InvalidRequestError("gemini", message, undefined, error);
    }

    return new ProviderError(message, 500, "api_error", error);
  }

  return new ProviderError("An unexpected error occurred", 500, "api_error");
}

// ============================================================================
// Gemini Provider Implementation
// ============================================================================

/**
 * Gemini provider adapter implementing the LLMProvider interface.
 *
 * Handles:
 * - Message translation (systemInstruction, role mapping, functionResponse)
 * - Non-streaming chat completions
 * - Streaming chat completions with generateContentStream()
 * - Tool calling
 * - Parameter mapping
 *
 * @see Requirements 3.4, 3.5, 3.6, 7.1, 7.2, 7.3, 7.4, 7.5
 */
export class GeminiProvider implements LLMProvider {
  readonly name = "gemini";
  private client: GoogleGenerativeAI;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GOOGLE_API_KEY;
    if (!key) {
      throw new AuthenticationError("gemini");
    }
    this.client = new GoogleGenerativeAI(key);
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
      const systemInstruction = extractSystemInstruction(params.messages);
      const contents = translateMessages(params.messages);

      // Build generation config
      // @see Requirements 7.1, 7.2, 7.3, 7.4, 7.5
      const generationConfig: GenerationConfig = {};

      if (params.temperature !== undefined) {
        generationConfig.temperature = params.temperature;
      }
      if (params.maxTokens !== undefined) {
        generationConfig.maxOutputTokens = params.maxTokens;
      }
      if (params.topP !== undefined) {
        generationConfig.topP = params.topP;
      }
      if (params.topK !== undefined) {
        generationConfig.topK = params.topK;
      }
      if (params.stop !== undefined && params.stop.length > 0) {
        generationConfig.stopSequences = params.stop;
      }

      // Build tools configuration
      let tools: FunctionDeclarationsTool[] | undefined;
      let toolConfig: ToolConfig | undefined;

      if (params.tools && params.tools.length > 0) {
        tools = [
          {
            functionDeclarations: toGeminiFunctionDeclarations(params.tools),
          },
        ];

        // Set tool choice mode
        const toolChoiceMode = toGeminiToolChoice(params.toolChoice);
        if (toolChoiceMode) {
          toolConfig = {
            functionCallingConfig: {
              mode: toolChoiceMode as FunctionCallingMode,
            },
          };

          // Handle specific function selection
          const specificFunction = getSpecificFunctionName(params.toolChoice);
          if (specificFunction && toolConfig.functionCallingConfig) {
            toolConfig.functionCallingConfig.allowedFunctionNames = [
              specificFunction,
            ];
          }
        }
      }

      // Create the model with configuration
      const model = this.client.getGenerativeModel({
        model: params.model,
        systemInstruction: systemInstruction,
        generationConfig,
        tools,
        toolConfig,
      });

      // Generate content
      const result: GenerateContentResult = await model.generateContent({
        contents,
      });

      const response = result.response;
      const candidate = response.candidates?.[0];

      if (!candidate) {
        throw new ProviderError(
          "No response candidate returned from Gemini",
          500,
          "api_error"
        );
      }

      // Extract content - try response.text() first, then fall back to parts extraction
      let textContent: string | null = null;
      try {
        const text = response.text();
        textContent = text || null;
      } catch {
        // If response.text() fails (e.g., for tool calls), extract from parts
        const parts = candidate.content?.parts || [];
        textContent = extractTextContent(parts);
      }

      // Extract tool calls from parts
      const parts = candidate.content?.parts || [];
      const functionCalls = extractFunctionCalls(parts);
      const toolCalls =
        functionCalls.length > 0
          ? fromGeminiToolCalls(functionCalls)
          : undefined;

      // Determine finish reason
      const finishReason = mapFinishReason(candidate.finishReason);

      // Get usage metadata
      const usageMetadata = response.usageMetadata;

      return {
        content: textContent,
        toolCalls,
        finishReason:
          toolCalls && toolCalls.length > 0 ? "tool_calls" : finishReason,
        usage: {
          promptTokens: usageMetadata?.promptTokenCount || 0,
          completionTokens: usageMetadata?.candidatesTokenCount || 0,
        },
        // Preserve raw parts for multi-turn tool calling (thoughtSignature)
        rawAssistantParts: candidate.content?.parts,
      };
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }
      throw translateError(error);
    }
  }

  /**
   * Perform a streaming chat completion using generateContentStream().
   *
   * @param params - Chat parameters
   * @yields ChatChunk objects as they are received from the provider
   * @throws {ProviderError} If the provider returns an error
   */
  async *chatStream(params: ChatParams): AsyncGenerator<ChatChunk> {
    try {
      const systemInstruction = extractSystemInstruction(params.messages);
      const contents = translateMessages(params.messages);

      // Build generation config
      // @see Requirements 7.1, 7.2, 7.3, 7.4, 7.5
      const generationConfig: GenerationConfig = {};

      if (params.temperature !== undefined) {
        generationConfig.temperature = params.temperature;
      }
      if (params.maxTokens !== undefined) {
        generationConfig.maxOutputTokens = params.maxTokens;
      }
      if (params.topP !== undefined) {
        generationConfig.topP = params.topP;
      }
      if (params.topK !== undefined) {
        generationConfig.topK = params.topK;
      }
      if (params.stop !== undefined && params.stop.length > 0) {
        generationConfig.stopSequences = params.stop;
      }

      // Build tools configuration
      let tools: FunctionDeclarationsTool[] | undefined;
      let toolConfig: ToolConfig | undefined;

      if (params.tools && params.tools.length > 0) {
        tools = [
          {
            functionDeclarations: toGeminiFunctionDeclarations(params.tools),
          },
        ];

        // Set tool choice mode
        const toolChoiceMode = toGeminiToolChoice(params.toolChoice);
        if (toolChoiceMode) {
          toolConfig = {
            functionCallingConfig: {
              mode: toolChoiceMode as FunctionCallingMode,
            },
          };

          // Handle specific function selection
          const specificFunction = getSpecificFunctionName(params.toolChoice);
          if (specificFunction && toolConfig.functionCallingConfig) {
            toolConfig.functionCallingConfig.allowedFunctionNames = [
              specificFunction,
            ];
          }
        }
      }

      // Create the model with configuration
      const model = this.client.getGenerativeModel({
        model: params.model,
        systemInstruction: systemInstruction,
        generationConfig,
        tools,
        toolConfig,
      });

      // Generate content stream
      const streamResult = await model.generateContentStream({
        contents,
      });

      let promptTokens = 0;
      let completionTokens = 0;
      let lastFinishReason: ChatResponse["finishReason"] | undefined;
      let hasYieldedToolCalls = false;

      // Process stream chunks
      for await (const chunk of streamResult.stream) {
        const candidate = chunk.candidates?.[0];

        if (candidate) {
          const parts = candidate.content?.parts || [];

          // Extract text content
          const textContent = extractTextContent(parts);
          if (textContent) {
            yield { content: textContent };
          }

          // Extract function calls
          const functionCalls = extractFunctionCalls(parts);
          if (functionCalls.length > 0 && !hasYieldedToolCalls) {
            const toolCalls = fromGeminiToolCalls(functionCalls);
            yield { toolCalls };
            hasYieldedToolCalls = true;
          }

          // Track finish reason
          if (candidate.finishReason) {
            lastFinishReason = mapFinishReason(candidate.finishReason);
          }
        }

        // Track usage metadata
        const usageMetadata = chunk.usageMetadata;
        if (usageMetadata) {
          promptTokens = usageMetadata.promptTokenCount || promptTokens;
          completionTokens =
            usageMetadata.candidatesTokenCount || completionTokens;
        }
      }

      // Yield final chunk with finish reason and usage
      yield {
        finishReason: hasYieldedToolCalls
          ? "tool_calls"
          : lastFinishReason || "stop",
        usage: {
          promptTokens,
          completionTokens,
        },
      };
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }
      throw translateError(error);
    }
  }
}
