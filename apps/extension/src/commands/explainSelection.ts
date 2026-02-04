import * as vscode from "vscode";
import { sendChatCompletion } from "../api/client";
import {
  getFileLanguage,
  getRelativeFilePath,
  getSelectedText,
} from "../context/gather";
import { EXPLAIN_PROMPT } from "../prompts";
import { ensureWalletConfigured } from "../utils/config";

/** Explains the selected code using the Router 402 API. */
export async function explainSelection(): Promise<void> {
  if (!(await ensureWalletConfigured())) {
    return;
  }

  const selectedText = getSelectedText();
  if (!selectedText) {
    vscode.window.showWarningMessage("Please select some code to explain.");
    return;
  }

  const language = getFileLanguage() ?? "text";
  const filePath = getRelativeFilePath() ?? "unknown";

  const userMessage = `File: ${filePath}\nLanguage: ${language}\n\n\`\`\`${language}\n${selectedText}\n\`\`\``;

  const response = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Router 402: Explaining code...",
      cancellable: false,
    },
    async () => {
      return sendChatCompletion([
        { role: "system", content: EXPLAIN_PROMPT },
        { role: "user", content: userMessage },
      ]);
    }
  );

  if (!response) {
    return;
  }

  // Show the explanation in a webview panel
  const panel = vscode.window.createWebviewPanel(
    "router402Explain",
    "Router 402: Explanation",
    vscode.ViewColumn.Beside,
    { enableScripts: false }
  );

  panel.webview.html = renderExplanationHtml(response);
}

/** Renders explanation markdown as HTML. */
function renderExplanationHtml(markdown: string): string {
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
  </style>
</head>
<body>
  <h1>Code Explanation</h1>
  <hr>
  <p>${html}</p>
</body>
</html>`;
}
