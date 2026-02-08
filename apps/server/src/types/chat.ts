import { z } from "zod";

// ============================================================================
// Content Part Types (for multimodal messages)
// ============================================================================

/**
 * Text content part for multimodal messages
 */
export const TextContentPartSchema = z
  .object({
    type: z.literal("text"),
    text: z.string(),
  })
  .passthrough();

/**
 * Image URL content part for multimodal messages
 */
export const ImageUrlContentPartSchema = z
  .object({
    type: z.literal("image_url"),
    image_url: z
      .object({
        url: z.string(),
        detail: z.enum(["auto", "low", "high"]).optional(),
      })
      .passthrough(),
  })
  .passthrough();

/**
 * Union of all content part types
 */
export const ContentPartSchema = z.union([
  TextContentPartSchema,
  ImageUrlContentPartSchema,
]);

export type ContentPart = z.infer<typeof ContentPartSchema>;
export type TextContentPart = z.infer<typeof TextContentPartSchema>;
export type ImageUrlContentPart = z.infer<typeof ImageUrlContentPartSchema>;

// ============================================================================
// Tool Call Types
// ============================================================================

/**
 * Function call within a tool call
 */
export const FunctionCallSchema = z
  .object({
    name: z.string(),
    arguments: z.string(),
  })
  .passthrough();

/**
 * Tool call made by the assistant
 */
export const ToolCallSchema = z
  .object({
    id: z.string(),
    type: z.literal("function"),
    function: FunctionCallSchema,
  })
  .passthrough();

export type ToolCall = z.infer<typeof ToolCallSchema>;
export type FunctionCall = z.infer<typeof FunctionCallSchema>;

// ============================================================================
// Message Types
// ============================================================================

/**
 * Message in a chat conversation
 * Supports system, user, assistant, and tool roles
 * Content can be a string or array of content parts (multimodal)
 */
export const MessageSchema = z
  .object({
    role: z.enum(["system", "user", "assistant", "tool"]),
    content: z.union([z.string(), z.array(ContentPartSchema)]).nullable(),
    name: z.string().optional(),
    tool_call_id: z.string().optional(),
    tool_calls: z.array(ToolCallSchema).optional(),
  })
  .passthrough();

export type Message = z.infer<typeof MessageSchema>;

// ============================================================================
// Tool Definition Types
// ============================================================================

/**
 * Function definition within a tool
 */
export const FunctionDefinitionSchema = z
  .object({
    name: z.string(),
    description: z.string().optional(),
    parameters: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

/**
 * Tool definition for function calling
 */
export const ToolSchema = z
  .object({
    type: z.literal("function"),
    function: FunctionDefinitionSchema,
  })
  .passthrough();

export type Tool = z.infer<typeof ToolSchema>;
export type FunctionDefinition = z.infer<typeof FunctionDefinitionSchema>;

// ============================================================================
// Tool Choice Types
// ============================================================================

/**
 * Tool choice specification
 * Can be "none", "auto", "required", or a specific function
 */
export const ToolChoiceSchema = z.union([
  z.literal("none"),
  z.literal("auto"),
  z.literal("required"),
  z
    .object({
      type: z.literal("function"),
      function: z.object({
        name: z.string(),
      }),
    })
    .passthrough(),
]);

export type ToolChoice = z.infer<typeof ToolChoiceSchema>;

// ============================================================================
// Response Format Types
// ============================================================================

/**
 * Response format specification for structured outputs
 */
export const ResponseFormatSchema = z
  .object({
    type: z.enum(["text", "json_object"]),
  })
  .passthrough();

export type ResponseFormat = z.infer<typeof ResponseFormatSchema>;

// ============================================================================
// Chat Completion Request Schema
// ============================================================================

/**
 * OpenRouter-compatible chat completion request
 * Uses passthrough() to accept unknown fields without error
 * Validates required fields and types per Requirements 1.1, 1.3, 1.5
 * Accepts OpenRouter-specific fields (transforms, models, route, provider) per Requirement 1.4
 */
export const ChatCompletionRequestSchema = z
  .object({
    // Required field
    messages: z.array(MessageSchema).min(1, "messages array must not be empty"),

    // Model selection
    model: z.string().optional(),

    // Generation parameters
    temperature: z.number().min(0).max(2).optional(),
    max_tokens: z.number().int().positive().optional(),
    top_p: z.number().min(0).max(1).optional(),
    top_k: z.number().int().positive().optional(),
    frequency_penalty: z.number().min(-2).max(2).optional(),
    presence_penalty: z.number().min(-2).max(2).optional(),
    repetition_penalty: z.number().min(0).max(2).optional(),
    seed: z.number().int().optional(),

    // Streaming
    stream: z.boolean().optional(),

    // Stop sequences (string or array)
    stop: z.union([z.string(), z.array(z.string())]).optional(),

    // Response format
    response_format: ResponseFormatSchema.optional(),

    // Tool calling
    tools: z.array(ToolSchema).optional(),
    tool_choice: ToolChoiceSchema.optional(),

    // OpenRouter-specific fields (accept but ignore per Requirement 1.4)
    transforms: z.array(z.string()).optional(),
    models: z.array(z.string()).optional(),
    route: z.string().optional(),
    provider: z.record(z.string(), z.unknown()).optional(),

    // Additional optional fields
    user: z.string().optional(),
    logit_bias: z.record(z.string(), z.number()).optional(),
    logprobs: z.boolean().optional(),
    top_logprobs: z.number().int().optional(),

    // Plugins (e.g. [{ "id": "web" }] to enable MCP tools)
    plugins: z.array(z.object({ id: z.string() }).passthrough()).optional(),
  })
  .passthrough(); // Accept unknown fields per Requirement 1.2

export type ChatCompletionRequest = z.infer<typeof ChatCompletionRequestSchema>;

// ============================================================================
// Finish Reason Type
// ============================================================================

/**
 * Reason why the model stopped generating
 */
export type FinishReason = "stop" | "length" | "tool_calls" | "content_filter";

// ============================================================================
// Usage Statistics Type
// ============================================================================

/**
 * Token usage statistics
 */
export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

// ============================================================================
// Chat Completion Response Types
// ============================================================================

/**
 * Message in a chat completion response
 */
export interface ResponseMessage {
  role: "assistant";
  content: string | null;
  tool_calls?: ToolCall[];
}

/**
 * Choice in a chat completion response
 */
export interface ChatCompletionChoice {
  index: number;
  message: ResponseMessage;
  finish_reason: FinishReason;
  logprobs: null;
}

/**
 * Non-streaming chat completion response
 * Per Requirements 5.1, 5.2, 5.3, 5.4, 5.5
 */
export interface ChatCompletionResponse {
  /** Unique identifier with 'gen-' prefix */
  id: string;
  /** Always 'chat.completion' for non-streaming */
  object: "chat.completion";
  /** Unix timestamp of creation */
  created: number;
  /** Model identifier from the request */
  model: string;
  /** Array of completion choices */
  choices: ChatCompletionChoice[];
  /** Token usage statistics */
  usage: Usage;
  /** Cost of this request in USD (total including commission) */
  cost?: number;
  /** Optional system fingerprint */
  system_fingerprint?: string;
}

// ============================================================================
// Chat Completion Chunk Types (Streaming)
// ============================================================================

/**
 * Delta content in a streaming chunk
 */
export interface ChunkDelta {
  role?: "assistant";
  content?: string;
  tool_calls?: ToolCall[];
}

/**
 * Choice in a streaming chunk
 */
export interface ChunkChoice {
  index: number;
  delta: ChunkDelta;
  finish_reason: FinishReason | null;
}

/**
 * Streaming chat completion chunk
 * Per Requirements 6.2, 6.5
 */
export interface ChatCompletionChunk {
  /** Unique identifier with 'gen-' prefix */
  id: string;
  /** Always 'chat.completion.chunk' for streaming */
  object: "chat.completion.chunk";
  /** Unix timestamp of creation */
  created: number;
  /** Model identifier from the request */
  model: string;
  /** Array of chunk choices */
  choices: ChunkChoice[];
  /** Usage statistics (only in final chunk per Requirement 6.5) */
  usage?: Usage;
  /** Cost of this request in USD (only in final chunk, total including commission) */
  cost?: number;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * OpenRouter-compatible error response format
 * Per Requirement 9.4
 */
export interface OpenRouterError {
  error: {
    /** Human-readable error message */
    message: string;
    /** Error type classification */
    type: string;
    /** Parameter that caused the error (for validation errors) */
    param?: string;
    /** Error code from the provider */
    code?: string;
  };
}
