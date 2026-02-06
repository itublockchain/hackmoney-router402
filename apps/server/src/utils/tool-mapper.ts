import { randomUUID } from "node:crypto";
import type { Tool, ToolCall, ToolChoice } from "../types/chat.js";

// ============================================================================
// Claude Provider Types
// ============================================================================

/**
 * Claude tool definition format
 * Claude uses input_schema instead of parameters
 */
export interface ClaudeTool {
  name: string;
  description?: string;
  input_schema: Record<string, unknown>;
}

/**
 * Claude tool_use content block from response
 */
export interface ClaudeToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

/**
 * Claude tool choice format
 */
export type ClaudeToolChoice =
  | { type: "auto" }
  | { type: "any" }
  | { type: "tool"; name: string };

// ============================================================================
// Gemini Provider Types
// ============================================================================

/**
 * Gemini function declaration format
 */
export interface GeminiFunctionDeclaration {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
}

/**
 * Gemini function call from response
 */
export interface GeminiFunctionCall {
  name: string;
  args: Record<string, unknown>;
}

/**
 * Gemini tool choice format (function calling mode)
 */
export type GeminiToolChoice = "AUTO" | "ANY" | "NONE";

// ============================================================================
// OpenRouter → Claude Tool Conversion
// ============================================================================

/**
 * Converts OpenRouter tool definitions to Claude format
 *
 * Requirement 4.1: Translate OpenRouter tool format to provider-specific format
 * Requirement 4.2: Convert function.parameters to input_schema for Claude
 *
 * @param tools - Array of OpenRouter tool definitions
 * @returns Array of Claude tool definitions
 */
export function toClaudeTools(tools: Tool[]): ClaudeTool[] {
  return tools.map((t) => ({
    name: t.function.name,
    description: t.function.description,
    input_schema: t.function.parameters ?? { type: "object", properties: {} },
  }));
}

// ============================================================================
// OpenRouter → Gemini Tool Conversion
// ============================================================================

/**
 * Converts OpenRouter tool definitions to Gemini format
 *
 * Requirement 4.1: Translate OpenRouter tool format to provider-specific format
 * Requirement 4.3: Convert tools to functionDeclarations format for Gemini
 *
 * @param tools - Array of OpenRouter tool definitions
 * @returns Array of Gemini function declarations
 */
export function toGeminiTools(tools: Tool[]): GeminiFunctionDeclaration[] {
  return tools.map((t) => ({
    name: t.function.name,
    description: t.function.description,
    parameters: t.function.parameters,
  }));
}

// ============================================================================
// Claude → OpenRouter Tool Call Conversion
// ============================================================================

/**
 * Converts Claude tool_use blocks to OpenRouter ToolCall format
 *
 * Requirement 4.4: Translate provider tool calls back to OpenRouter ToolCall format
 * Requirement 4.5: Map Claude tool_use id, name, input to OpenRouter format with JSON-stringified arguments
 *
 * @param blocks - Array of Claude tool_use content blocks
 * @returns Array of OpenRouter tool calls
 */
export function fromClaudeToolCalls(blocks: ClaudeToolUseBlock[]): ToolCall[] {
  return blocks.map((b) => ({
    id: b.id,
    type: "function" as const,
    function: {
      name: b.name,
      arguments: JSON.stringify(b.input),
    },
  }));
}

// ============================================================================
// Gemini → OpenRouter Tool Call Conversion
// ============================================================================

/**
 * Generates a unique call ID for Gemini tool calls
 * Format: call_{24 hex characters}
 *
 * @returns A unique call ID string
 */
function generateCallId(): string {
  return `call_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
}

/**
 * Converts Gemini functionCall responses to OpenRouter ToolCall format
 *
 * Requirement 4.4: Translate provider tool calls back to OpenRouter ToolCall format
 * Requirement 4.6: Generate unique call ID for Gemini and stringify args field
 *
 * @param calls - Array of Gemini function calls
 * @returns Array of OpenRouter tool calls
 */
export function fromGeminiToolCalls(calls: GeminiFunctionCall[]): ToolCall[] {
  return calls.map((c) => ({
    id: generateCallId(),
    type: "function" as const,
    function: {
      name: c.name,
      arguments: JSON.stringify(c.args),
    },
  }));
}

// ============================================================================
// OpenRouter → Claude Tool Choice Conversion
// ============================================================================

/**
 * Converts OpenRouter tool_choice to Claude format
 *
 * Requirement 4.7: Translate tool_choice to provider-specific tool selection format
 *
 * OpenRouter → Claude mapping:
 * - "none" → not supported (return undefined, tools should not be sent)
 * - "auto" → { type: "auto" }
 * - "required" → { type: "any" }
 * - { type: "function", function: { name } } → { type: "tool", name }
 *
 * @param toolChoice - OpenRouter tool choice specification
 * @returns Claude tool choice or undefined if not applicable
 */
export function toClaudeToolChoice(
  toolChoice: ToolChoice | undefined
): ClaudeToolChoice | undefined {
  if (toolChoice === undefined) {
    return undefined;
  }

  if (toolChoice === "none") {
    // Claude doesn't have a "none" equivalent - caller should not send tools
    return undefined;
  }

  if (toolChoice === "auto") {
    return { type: "auto" };
  }

  if (toolChoice === "required") {
    return { type: "any" };
  }

  // Specific function choice
  if (typeof toolChoice === "object" && toolChoice.type === "function") {
    return { type: "tool", name: toolChoice.function.name };
  }

  return undefined;
}

// ============================================================================
// OpenRouter → Gemini Tool Choice Conversion
// ============================================================================

/**
 * Converts OpenRouter tool_choice to Gemini format (function calling mode)
 *
 * Requirement 4.7: Translate tool_choice to provider-specific tool selection format
 *
 * OpenRouter → Gemini mapping:
 * - "none" → "NONE"
 * - "auto" → "AUTO"
 * - "required" → "ANY"
 * - { type: "function", function: { name } } → "ANY" (Gemini doesn't support specific function selection in mode)
 *
 * Note: For specific function selection, Gemini uses allowedFunctionNames in tool config,
 * which should be handled separately by the caller.
 *
 * @param toolChoice - OpenRouter tool choice specification
 * @returns Gemini function calling mode or undefined if not specified
 */
export function toGeminiToolChoice(
  toolChoice: ToolChoice | undefined
): GeminiToolChoice | undefined {
  if (toolChoice === undefined) {
    return undefined;
  }

  if (toolChoice === "none") {
    return "NONE";
  }

  if (toolChoice === "auto") {
    return "AUTO";
  }

  if (toolChoice === "required") {
    return "ANY";
  }

  // Specific function choice - use ANY mode
  // The caller should also set allowedFunctionNames in tool config
  if (typeof toolChoice === "object" && toolChoice.type === "function") {
    return "ANY";
  }

  return undefined;
}

/**
 * Extracts the specific function name from a tool choice if specified
 * Useful for Gemini's allowedFunctionNames configuration
 *
 * @param toolChoice - OpenRouter tool choice specification
 * @returns The function name if a specific function is chosen, undefined otherwise
 */
export function getSpecificFunctionName(
  toolChoice: ToolChoice | undefined
): string | undefined {
  if (
    toolChoice !== undefined &&
    typeof toolChoice === "object" &&
    toolChoice.type === "function"
  ) {
    return toolChoice.function.name;
  }
  return undefined;
}
