import * as vscode from "vscode";
import { sendChatCompletion } from "../api/client";
import {
  getCurrentFileContent,
  getFileLanguage,
  getRelativeFilePath,
} from "../context/gather";
import { REVIEW_PROMPT } from "../prompts";
import { ensureWalletConfigured } from "../utils/config";

/** Reviews the current file using the Router 402 API. */
export async function reviewFile(): Promise<void> {
  if (!(await ensureWalletConfigured())) {
    return;
  }

  const content = getCurrentFileContent();
  if (!content) {
    vscode.window.showWarningMessage("No active file to review.");
    return;
  }

  const language = getFileLanguage() ?? "text";
  const filePath = getRelativeFilePath() ?? "unknown";

  const userMessage = `File: ${filePath}\nLanguage: ${language}\n\n\`\`\`${language}\n${content}\n\`\`\``;

  const response = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Router 402: Reviewing file...",
      cancellable: false,
    },
    async () => {
      return sendChatCompletion([
        { role: "system", content: REVIEW_PROMPT },
        { role: "user", content: userMessage },
      ]);
    }
  );

  if (!response) {
    return;
  }

  // Show the review in a new webview panel
  const panel = vscode.window.createWebviewPanel(
    "router402Review",
    `Review: ${filePath}`,
    vscode.ViewColumn.Beside,
    { enableScripts: false }
  );

  panel.webview.html = renderMarkdownHtml(response, filePath);
}

/** Renders markdown content as basic HTML for the webview. */
function renderMarkdownHtml(markdown: string, title: string): string {
  // Basic markdown-to-HTML conversion
  const html = markdown
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(
      /```(\w*)\n([\s\S]*?)```/g,
      '<pre><code class="language-$1">$2</code></pre>'
    )
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 16px;
      line-height: 1.6;
    }
    h1, h2, h3 { color: var(--vscode-foreground); margin-top: 24px; }
    code {
      background: var(--vscode-textCodeBlock-background);
      padding: 2px 6px;
      border-radius: 3px;
      font-family: var(--vscode-editor-font-family, monospace);
    }
    pre {
      background: var(--vscode-textCodeBlock-background);
      padding: 12px;
      border-radius: 4px;
      overflow-x: auto;
    }
    pre code { padding: 0; background: none; }
    ul { padding-left: 20px; }
    li { margin: 4px 0; }
    strong { color: var(--vscode-foreground); }
  </style>
</head>
<body>
  <h1>Code Review: ${title}</h1>
  <hr>
  <p>${html}</p>
</body>
</html>`;
}
