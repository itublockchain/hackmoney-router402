import * as vscode from "vscode";
import {
  getFileLanguage,
  getRelativeFilePath,
  getSelectedText,
} from "../context/gather";
import { getChatProvider } from "../extension";
import { EXPLAIN_PROMPT } from "../prompts";
import { ensureApiKeyConfigured } from "../utils/config";

/** Explains the selected code using the Router 402 API and streams the result in the chat panel. */
export async function explainSelection(): Promise<void> {
  if (!(await ensureApiKeyConfigured())) {
    return;
  }

  const selectedText = getSelectedText();
  if (!selectedText) {
    vscode.window.showWarningMessage("Please select some code to explain.");
    return;
  }

  const chatProvider = getChatProvider();
  if (!chatProvider) {
    vscode.window.showErrorMessage("Chat panel is not available.");
    return;
  }

  const language = getFileLanguage() ?? "text";
  const filePath = getRelativeFilePath() ?? "unknown";

  const userMessage = `File: ${filePath}\nLanguage: ${language}\n\n\`\`\`${language}\n${selectedText}\n\`\`\``;
  const label = `Explain code from \`${filePath}\``;

  await chatProvider.addExternalMessage(label, [
    { role: "system", content: EXPLAIN_PROMPT },
    { role: "user", content: userMessage },
  ]);
}
