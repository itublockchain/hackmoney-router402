import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import { type ChatMessage, sendStreamingChatCompletion } from "../api/client";
import {
  buildContextHeader,
  getCurrentFileContent,
  getFileLanguage,
  getRelativeFilePath,
} from "../context/gather";
import { CHAT_PROMPT } from "../prompts";
import { getConfig, truncateAddress } from "../utils/config";

export class ChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "router402.chatView";

  private webviewView?: vscode.WebviewView;
  private conversationHistory: ChatMessage[] = [];
  private abortController?: AbortController;

  constructor(private readonly extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this.webviewView = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "media")],
    };

    webviewView.webview.html = this.getHtmlContent(webviewView.webview);

    // Send initial config to webview
    this.postConfig();

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case "sendMessage":
          await this.handleUserMessage(message.text);
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
      }
    });

    // Update config when settings change
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("router402")) {
        this.postConfig();
      }
    });
  }

  /** Sends current config to the webview. */
  private postConfig(): void {
    const config = getConfig();
    this.webviewView?.webview.postMessage({
      type: "config",
      walletAddress: config.walletAddress
        ? truncateAddress(config.walletAddress)
        : "",
      model: config.defaultModel,
    });
  }

  /** Handles a user message: sends to API with streaming. */
  private async handleUserMessage(text: string): Promise<void> {
    if (!this.webviewView) {
      return;
    }

    const config = getConfig();
    if (!config.walletAddress) {
      const action = await vscode.window.showWarningMessage(
        "Please configure your wallet address in Router 402 settings.",
        "Open Settings"
      );
      if (action === "Open Settings") {
        await vscode.commands.executeCommand(
          "workbench.action.openSettings",
          "router402.walletAddress"
        );
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

    const fullResponse = await sendStreamingChatCompletion(
      this.conversationHistory,
      (chunk) => {
        this.webviewView?.webview.postMessage({
          type: "streamChunk",
          text: chunk,
        });
      },
      undefined,
      this.abortController.signal
    );

    this.abortController = undefined;

    if (fullResponse) {
      this.conversationHistory.push({
        role: "assistant",
        content: fullResponse,
      });
    }

    this.webviewView.webview.postMessage({ type: "endResponse" });
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
