import * as vscode from "vscode";

export const DASHBOARD_URL = "https://router402.xyz/setup";
const API_KEY_SECRET_KEY = "router402.apiKey";

let secretStorage: vscode.SecretStorage | undefined;

/** Initializes secret storage for API key management. Must be called during activation. */
export function initSecretStorage(context: vscode.ExtensionContext): void {
  secretStorage = context.secrets;
}

export interface Router402Config {
  apiEndpoint: string;
  defaultModel: string;
}

/** Returns the configured API endpoint. */
export function getApiEndpoint(): string {
  const cfg = vscode.workspace.getConfiguration("router402");
  return cfg.get<string>("apiEndpoint", "http://localhost:8080");
}

/** Reads all Router 402 extension settings (excluding secrets). */
export function getConfig(): Router402Config {
  const cfg = vscode.workspace.getConfiguration("router402");
  return {
    apiEndpoint: cfg.get<string>("apiEndpoint", "http://localhost:8080"),
    defaultModel: cfg.get<string>(
      "defaultModel",
      "anthropic/claude-sonnet-4.5"
    ),
  };
}

/** Retrieves the stored API key from secure storage. */
export async function getApiKey(): Promise<string> {
  if (!secretStorage) {
    return "";
  }
  return (await secretStorage.get(API_KEY_SECRET_KEY)) ?? "";
}

/** Stores the API key in secure storage. */
export async function setApiKey(apiKey: string): Promise<void> {
  if (!secretStorage) {
    throw new Error("Secret storage not initialized");
  }
  await secretStorage.store(API_KEY_SECRET_KEY, apiKey);
}

/** Deletes the stored API key from secure storage. */
export async function deleteApiKey(): Promise<void> {
  if (!secretStorage) {
    return;
  }
  await secretStorage.delete(API_KEY_SECRET_KEY);
}

/**
 * Validates that an API key is configured.
 * Shows a warning notification with action buttons if not.
 * Returns true if valid, false otherwise.
 */
export async function ensureApiKeyConfigured(): Promise<boolean> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    const action = await vscode.window.showWarningMessage(
      "Please set your Router 402 API key. You can get one from the dashboard after completing setup.",
      "Set API Key",
      "Open Dashboard"
    );
    if (action === "Set API Key") {
      await vscode.commands.executeCommand("router402.setApiKey");
    } else if (action === "Open Dashboard") {
      await vscode.env.openExternal(vscode.Uri.parse(DASHBOARD_URL));
    }
    return false;
  }
  return true;
}
