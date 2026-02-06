import * as vscode from "vscode";
import {
  getCurrentFileContent,
  getFileLanguage,
  getRelativeFilePath,
} from "../context/gather";
import { getChatProvider } from "../extension";
import { REVIEW_PROMPT } from "../prompts";
import { ensureApiKeyConfigured } from "../utils/config";

/** Reviews the current file using the Router 402 API and streams the result in the chat panel. */
export async function reviewFile(): Promise<void> {
  if (!(await ensureApiKeyConfigured())) {
    return;
  }

  const content = getCurrentFileContent();
  if (!content) {
    vscode.window.showWarningMessage("No active file to review.");
    return;
  }

  const chatProvider = getChatProvider();
  if (!chatProvider) {
    vscode.window.showErrorMessage("Chat panel is not available.");
    return;
  }

  const language = getFileLanguage() ?? "text";
  const filePath = getRelativeFilePath() ?? "unknown";

  const userMessage = `File: ${filePath}\nLanguage: ${language}\n\n\`\`\`${language}\n${content}\n\`\`\``;
  const label = `Review file \`${filePath}\``;

  await chatProvider.addExternalMessage(label, [
    { role: "system", content: REVIEW_PROMPT },
    { role: "user", content: userMessage },
  ]);
}
