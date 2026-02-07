import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import {
  type ChatMessage,
  fetchModels,
  sendStreamingChatCompletion,
} from "../api/client";
import {
  buildContextHeader,
  getCurrentFileContent,
  getFileLanguage,
  getRelativeFilePath,
} from "../context/gather";
import { CHAT_PROMPT } from "../prompts";
import { getApiKey, getConfig } from "../utils/config";

export class ChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "router402.chatView";

  private webviewView?: vscode.WebviewView;
  private conversationHistory: ChatMessage[] = [];
  private abortController?: AbortController;
  private selectedModel?: string;
  private webviewReady: Promise<void>;
  private resolveWebviewReady!: () => void;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly context: vscode.ExtensionContext
  ) {
    this.webviewReady = new Promise((resolve) => {
      this.resolveWebviewReady = resolve;
    });
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this.webviewView = webviewView;
    this.resolveWebviewReady();

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "media")],
    };

    webviewView.webview.html = this.getHtmlContent(webviewView.webview);

    // Send initial config and available models to webview
    this.postConfig();
    this.postModels();

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case "sendMessage":
          await this.handleUserMessage(message.text, message.model);
          break;
        case "modelChange":
          this.selectedModel = message.model;
          break;
        case "reviewFile":
          await this.reviewCurrentFile();
          break;
        case "insertCode":
          this.insertCode(message.code);
          break;
        case "stopGeneration":
          this.abortController?.abort();
          break;
        case "clearChat":
          this.abortController?.abort();
          this.conversationHistory = [];
          break;
        case "setApiKey":
          await vscode.commands.executeCommand("router402.setApiKey");
          break;
        case "openDashboard":
          await vscode.commands.executeCommand("router402.openDashboard");
          break;
      }
    });

    // Update config when settings change
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("router402")) {
        this.postConfig();
      }
    });

    // Update config when API key changes in secret storage
    this.context.secrets.onDidChange((e) => {
      if (e.key === "router402.apiKey") {
        this.postConfig();
      }
    });
  }

  /** Sends current config to the webview. */
  private async postConfig(): Promise<void> {
    const config = getConfig();
    const apiKey = await getApiKey();
    this.webviewView?.webview.postMessage({
      type: "config",
      model: config.defaultModel,
      hasApiKey: !!apiKey,
    });
  }

  /** Fetches available models from the API and sends them to the webview. */
  private async postModels(): Promise<void> {
    const models = await fetchModels();
    this.webviewView?.webview.postMessage({
      type: "models",
      models,
    });
  }

  /** Handles a user message: sends to API with streaming. */
  private async handleUserMessage(text: string, model?: string): Promise<void> {
    if (!this.webviewView) {
      return;
    }

    const apiKey = await getApiKey();
    if (!apiKey) {
      const action = await vscode.window.showWarningMessage(
        "Please set your Router 402 API key to use the chat.",
        "Set API Key",
        "Open Dashboard"
      );
      if (action === "Set API Key") {
        await vscode.commands.executeCommand("router402.setApiKey");
      } else if (action === "Open Dashboard") {
        await vscode.commands.executeCommand("router402.openDashboard");
      }
      return;
    }

    // Add context header if available
    const contextHeader = buildContextHeader();
    const userContent = contextHeader ? `${contextHeader}${text}` : text;

    // Build messages
    if (this.conversationHistory.length === 0) {
      this.conversationHistory.push({
        role: "system",
        content: CHAT_PROMPT,
      });
    }

    this.conversationHistory.push({
      role: "user",
      content: userContent,
    });

    // Signal webview that assistant is responding
    this.webviewView.webview.postMessage({ type: "startResponse" });

    this.abortController = new AbortController();

    const chatModel = model || this.selectedModel;

    try {
      const fullResponse = await sendStreamingChatCompletion(
        this.conversationHistory,
        (chunk) => {
          this.webviewView?.webview.postMessage({
            type: "streamChunk",
            text: chunk,
          });
        },
        chatModel,
        this.abortController.signal
      );

      if (fullResponse) {
        this.conversationHistory.push({
          role: "assistant",
          content: fullResponse,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      vscode.window.showErrorMessage(`Router 402: ${msg}`);
    } finally {
      this.abortController = undefined;
      this.webviewView.webview.postMessage({ type: "endResponse" });
    }
  }

  /** Reviews the current file by gathering its content and sending it as a message. */
  private async reviewCurrentFile(): Promise<void> {
    const content = getCurrentFileContent();
    const filePath = getRelativeFilePath();
    const language = getFileLanguage();

    if (!content) {
      vscode.window.showWarningMessage("No active file to review.");
      return;
    }

    const label = filePath ?? "current file";
    const lang = language ?? "text";
    const message = `Please review my current file for bugs, performance, and best practices.\n\nHere is the content of \`${label}\`:\n\n\`\`\`${lang}\n${content}\n\`\`\``;

    this.webviewView?.webview.postMessage({
      type: "addUserMessage",
      text: "Please review my current file for bugs, performance, and best practices.",
    });

    await this.handleUserMessage(message);
  }

  /** Inserts code at the cursor position in the active editor. */
  private insertCode(code: string): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage("No active editor to insert code into.");
      return;
    }

    editor.edit((editBuilder) => {
      editBuilder.insert(editor.selection.active, code);
    });
  }

  /** Builds the webview HTML by reading template files. */
  private getHtmlContent(webview: vscode.Webview): string {
    const mediaPath = vscode.Uri.joinPath(this.extensionUri, "media");

    // Read template files
    const htmlPath = path.join(mediaPath.fsPath, "chat.html");
    const cssPath = path.join(mediaPath.fsPath, "chat.css");
    const jsPath = path.join(mediaPath.fsPath, "chat.js");

    let html = fs.readFileSync(htmlPath, "utf-8");
    const css = fs.readFileSync(cssPath, "utf-8");
    const js = fs.readFileSync(jsPath, "utf-8");

    // Get CSP nonce
    const nonce = getNonce();

    // Get logo URI
    const logoUri = webview.asWebviewUri(
      vscode.Uri.joinPath(mediaPath, "logo.svg")
    );

    // Replace placeholders
    html = html
      .replace(/{{nonce}}/g, nonce)
      .replace(/{{cspSource}}/g, webview.cspSource)
      .replace(/{{logoUri}}/g, logoUri.toString())
      .replace("{{styles}}", css)
      .replace("{{scripts}}", js);

    return html;
  }

  /**
   * Streams an externally-triggered request (e.g. from explain/review commands)
   * into the chat panel so results stream token-by-token.
   */
  public async addExternalMessage(
    userLabel: string,
    messages: ChatMessage[],
    model?: string
  ): Promise<void> {
    // Focus the chat view to ensure it's open and resolved
    await vscode.commands.executeCommand("router402.chatView.focus");
    await this.webviewReady;

    if (!this.webviewView) {
      return;
    }

    // Show the chat panel
    this.webviewView.show?.(true);

    // Display the user message in the chat
    this.webviewView.webview.postMessage({
      type: "addUserMessage",
      text: userLabel,
    });

    // Stream the response
    this.webviewView.webview.postMessage({ type: "startResponse" });
    this.abortController = new AbortController();

    try {
      const fullResponse = await sendStreamingChatCompletion(
        messages,
        (chunk) => {
          this.webviewView?.webview.postMessage({
            type: "streamChunk",
            text: chunk,
          });
        },
        model || this.selectedModel,
        this.abortController.signal
      );

      // Add to conversation history so follow-ups have context
      if (fullResponse) {
        if (this.conversationHistory.length === 0) {
          this.conversationHistory.push({
            role: "system",
            content: CHAT_PROMPT,
          });
        }
        this.conversationHistory.push({ role: "user", content: userLabel });
        this.conversationHistory.push({
          role: "assistant",
          content: fullResponse,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      vscode.window.showErrorMessage(`Router 402: ${msg}`);
    } finally {
      this.abortController = undefined;
      this.webviewView.webview.postMessage({ type: "endResponse" });
    }
  }

  /** Returns whether the chat panel is currently visible. */
  public get isVisible(): boolean {
    return this.webviewView?.visible ?? false;
  }

  /** Reveals the chat panel. */
  public reveal(): void {
    this.webviewView?.show?.(true);
  }
}

/** Generates a random nonce for CSP. */
function getNonce(): string {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
