import * as vscode from "vscode";
import { DASHBOARD_URL, getApiEndpoint, getApiKey } from "../utils/config";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
}

export interface ChatCompletionChoice {
  index: number;
  message: ChatMessage;
  finish_reason: string;
}

export interface ChatCompletionResponse {
  id: string;
  choices: ChatCompletionChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/** Callback invoked for each streamed text chunk. */
export type StreamCallback = (chunk: string) => void;

/**
 * Builds the authorization headers for API requests.
 * Uses Bearer token authentication with the stored API key.
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const apiKey = await getApiKey();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  return headers;
}

/**
 * Handles HTTP error responses with actionable VS Code notifications.
 * Returns true if an error was handled (caller should abort).
 */
async function handleApiError(status: number, _body: string): Promise<boolean> {
  switch (status) {
    case 401:
    case 403: {
      const action = await vscode.window.showErrorMessage(
        "Invalid or expired API key. Please set a valid API key from the Router 402 dashboard.",
        "Set API Key",
        "Open Dashboard"
      );
      if (action === "Set API Key") {
        await vscode.commands.executeCommand("router402.setApiKey");
      } else if (action === "Open Dashboard") {
        await vscode.env.openExternal(vscode.Uri.parse(DASHBOARD_URL));
      }
      return true;
    }
    case 402: {
      const action = await vscode.window.showErrorMessage(
        "Insufficient funds. Please top up your account on the dashboard.",
        "Open Dashboard"
      );
      if (action === "Open Dashboard") {
        await vscode.env.openExternal(vscode.Uri.parse(DASHBOARD_URL));
      }
      return true;
    }
    case 429: {
      await vscode.window.showErrorMessage(
        "Rate limited. Please wait a moment."
      );
      return true;
    }
    default: {
      if (status >= 500) {
        await vscode.window.showErrorMessage(
          "Router 402 API error. Please try again later."
        );
        return true;
      }
      return false;
    }
  }
}

/**
 * Sends a non-streaming chat completion request.
 * Returns the assistant's response text, or undefined on error.
 */
export async function sendChatCompletion(
  messages: ChatMessage[],
  model?: string
): Promise<string | undefined> {
  const config = await import("../utils/config").then((m) => m.getConfig());
  const apiEndpoint = getApiEndpoint();
  const url = `${apiEndpoint}/v1/chat/completions`;

  const body: ChatCompletionRequest = {
    model: model ?? config.defaultModel,
    messages,
    stream: false,
  };

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify(body),
    });
  } catch {
    await vscode.window.showErrorMessage(
      "Cannot reach Router 402 API. Check your network connection."
    );
    return undefined;
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    const handled = await handleApiError(response.status, errorBody);
    if (!handled) {
      await vscode.window.showErrorMessage(
        `Router 402 API returned status ${response.status}.`
      );
    }
    return undefined;
  }

  const data = (await response.json()) as ChatCompletionResponse;
  return data.choices?.[0]?.message?.content;
}

/**
 * Sends a streaming chat completion request.
 * Invokes the callback for each text delta as it arrives via SSE.
 * Returns the full concatenated response, or undefined on error.
 */
export async function sendStreamingChatCompletion(
  messages: ChatMessage[],
  onChunk: StreamCallback,
  model?: string,
  signal?: AbortSignal
): Promise<string | undefined> {
  const config = await import("../utils/config").then((m) => m.getConfig());
  const apiEndpoint = getApiEndpoint();
  const url = `${apiEndpoint}/v1/chat/completions`;

  const body: ChatCompletionRequest = {
    model: model ?? config.defaultModel,
    messages,
    stream: true,
  };

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify(body),
      signal,
    });
  } catch (_err) {
    if (signal?.aborted) {
      return undefined;
    }
    await vscode.window.showErrorMessage(
      "Cannot reach Router 402 API. Check your network connection."
    );
    return undefined;
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    const handled = await handleApiError(response.status, errorBody);
    if (!handled) {
      await vscode.window.showErrorMessage(
        `Router 402 API returned status ${response.status}.`
      );
    }
    return undefined;
  }

  // Parse SSE stream
  const reader = response.body?.getReader();
  if (!reader) {
    return undefined;
  }

  const decoder = new TextDecoder();
  let fullText = "";
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      // Keep the last incomplete line in the buffer
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) {
          continue;
        }

        const data = trimmed.slice(6);
        if (data === "[DONE]") {
          return fullText;
        }

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            fullText += delta;
            onChunk(delta);
          }
        } catch {
          // Skip malformed SSE lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return fullText;
}

/**
 * Fetches the list of available models from the API.
 * Returns an array of model identifiers, or an empty array on error.
 */
export async function fetchModels(): Promise<string[]> {
  const apiEndpoint = getApiEndpoint();
  const url = `${apiEndpoint}/v1/models`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: await getAuthHeaders(),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return [];
    }

    const json = (await response.json()) as { data?: string[] };
    return Array.isArray(json.data) ? json.data : [];
  } catch {
    return [];
  }
}

/**
 * Pings the API to check connectivity.
 * Returns true if the API is reachable.
 */
export async function pingApi(): Promise<boolean> {
  const apiEndpoint = getApiEndpoint();
  try {
    const response = await fetch(`${apiEndpoint}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export interface AccountStatus {
  exists: boolean;
  hasSessionKey: boolean;
  ready: boolean;
  user?: {
    hasPaymentThreshold: boolean;
    currentDebt: string;
    totalSpent: string;
  };
  sessionKey?: {
    chainId: number;
    smartAccountAddress: string;
    createdAt: string;
  };
}

/**
 * Checks account status using the configured API key.
 * Returns the account status or undefined on error.
 */
export async function checkAccountStatus(): Promise<AccountStatus | undefined> {
  const apiEndpoint = getApiEndpoint();
  const url = `${apiEndpoint}/v1/authorize/check`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: await getAuthHeaders(),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return undefined;
    }

    const result = (await response.json()) as { data: AccountStatus };
    return result.data;
  } catch {
    return undefined;
  }
}
