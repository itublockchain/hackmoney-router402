"use client";

import { useCallback, useRef, useState } from "react";
import type { Address } from "viem";
import { APP_CONFIG } from "@/config";
import { getAuthToken } from "@/lib/session-keys/storage";
import type { ChatMessage } from "@/stores/chat.store";

/**
 * Half of each model's max output token capacity.
 * Sources: Anthropic docs (64k for all 4.5 models), Google docs (65,536 for Gemini 3).
 */
const MODEL_MAX_TOKENS: Record<string, number> = {
  "anthropic/claude-opus-4.5": 32_000,
  "anthropic/claude-sonnet-4.5": 32_000,
  "anthropic/claude-haiku-4.5": 32_000,
  "google/gemini-3-pro-preview": 32_768,
  "google/gemini-3-flash-preview": 32_768,
};

const DEFAULT_MAX_TOKENS = 16_384;

function getMaxTokens(model: string): number {
  return MODEL_MAX_TOKENS[model] ?? DEFAULT_MAX_TOKENS;
}

interface UseChatCompletionOptions {
  sessionId: string;
  model: string;
  smartAccountAddress: Address | undefined;
  addMessage: (
    sessionId: string,
    role: "user" | "assistant",
    content: string,
    errorCode?: number
  ) => string;
  updateMessage: (
    sessionId: string,
    messageId: string,
    content: string,
    errorCode?: number
  ) => void;
  messages: ChatMessage[];
}

interface UseChatCompletionReturn {
  sendMessage: (content: string) => Promise<void>;
  stop: () => void;
  isStreaming: boolean;
}

export function useChatCompletion({
  sessionId,
  model,
  smartAccountAddress,
  addMessage,
  updateMessage,
  messages,
}: UseChatCompletionOptions): UseChatCompletionReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      const authToken = smartAccountAddress
        ? getAuthToken(smartAccountAddress)
        : null;
      if (!authToken) {
        addMessage(
          sessionId,
          "assistant",
          "Error: No auth token found. Please complete setup first."
        );
        return;
      }

      // Add user message to store
      addMessage(sessionId, "user", content);

      // Build messages array for the API (only role + content)
      const apiMessages = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content },
      ];

      // Create placeholder assistant message
      const assistantMessageId = addMessage(sessionId, "assistant", "");

      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      setIsStreaming(true);

      let accumulated = "";
      let flushTimer: ReturnType<typeof setTimeout> | null = null;
      let needsFlush = false;

      const flushToStore = () => {
        flushTimer = null;
        if (needsFlush) {
          needsFlush = false;
          updateMessage(sessionId, assistantMessageId, accumulated);
        }
      };

      const scheduleFlush = () => {
        needsFlush = true;
        if (!flushTimer) {
          flushTimer = setTimeout(flushToStore, 50);
        }
      };

      try {
        const response = await fetch(
          `${APP_CONFIG.apiUrl}/v1/chat/completions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              model,
              messages: apiMessages,
              stream: true,
              max_tokens: getMaxTokens(model),
            }),
            signal: abortController.signal,
          }
        );

        if (!response.ok) {
          if (response.status === 402) {
            updateMessage(
              sessionId,
              assistantMessageId,
              "Insufficient balance to complete this request.",
              402
            );
            return;
          }

          const errorText = await response.text();
          let errorMessage: string;
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage =
              errorJson.error?.message || errorJson.message || errorText;
          } catch {
            errorMessage = errorText;
          }
          updateMessage(
            sessionId,
            assistantMessageId,
            `Error: ${errorMessage}`
          );
          return;
        }

        const reader = response.body?.getReader();
        console.log();
        if (!reader) {
          updateMessage(
            sessionId,
            assistantMessageId,
            "Error: No response stream available."
          );
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE lines
          const lines = buffer.split("\n");
          // Keep the last potentially incomplete line in the buffer
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(":")) continue;

            if (trimmed.startsWith("data: ")) {
              const data = trimmed.slice(6);

              if (data === "[DONE]") {
                break;
              }

              try {
                const chunk = JSON.parse(data);

                // Handle error events from server
                if (chunk.error) {
                  updateMessage(
                    sessionId,
                    assistantMessageId,
                    `Error: ${chunk.error.message || "Unknown error"}`
                  );
                  return;
                }

                const delta = chunk.choices?.[0]?.delta?.content;
                if (delta) {
                  accumulated += delta;
                  scheduleFlush();
                }
              } catch {
                // Skip malformed JSON chunks
              }
            }
          }
        }

        // Flush any remaining content immediately
        if (flushTimer) {
          clearTimeout(flushTimer);
          flushTimer = null;
        }

        // If no content was received, show a fallback message
        if (!accumulated) {
          updateMessage(
            sessionId,
            assistantMessageId,
            "No response received from the server."
          );
        } else {
          // Final flush to ensure all content is in store
          updateMessage(sessionId, assistantMessageId, accumulated);
        }
      } catch (error) {
        if (flushTimer) {
          clearTimeout(flushTimer);
          flushTimer = null;
        }
        if (error instanceof DOMException && error.name === "AbortError") {
          // User cancelled — flush whatever was accumulated
          if (accumulated) {
            updateMessage(sessionId, assistantMessageId, accumulated);
          } else {
            updateMessage(
              sessionId,
              assistantMessageId,
              "Response was cancelled."
            );
          }
        } else {
          const message =
            error instanceof Error ? error.message : "Unknown error";
          updateMessage(sessionId, assistantMessageId, `Error: ${message}`);
        }
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [sessionId, model, smartAccountAddress, addMessage, updateMessage, messages]
  );

  return { sendMessage, stop, isStreaming };
}
