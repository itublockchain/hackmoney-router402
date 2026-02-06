import * as vscode from "vscode";
import { sendChatCompletion } from "../api/client";
import {
  getFileLanguage,
  getRelativeFilePath,
  getSelectedText,
} from "../context/gather";
import { EDIT_PROMPT } from "../prompts";
import { showDiffView } from "../ui/diffView";
import { ensureApiKeyConfigured } from "../utils/config";

/** Edits the selected code based on a user-provided instruction. */
export async function editSelection(): Promise<void> {
  if (!(await ensureApiKeyConfigured())) {
    return;
  }

  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage("No active editor.");
    return;
  }

  const selectedText = getSelectedText();
  if (!selectedText) {
    vscode.window.showWarningMessage("Please select some code to edit.");
    return;
  }

  const instruction = await vscode.window.showInputBox({
    prompt: "What changes would you like to make?",
    placeHolder:
      "e.g., Add error handling, Optimize performance, Convert to async/await",
  });

  if (!instruction) {
    return;
  }

  const language = getFileLanguage() ?? "text";
  const filePath = getRelativeFilePath() ?? "unknown";

  const userMessage = `File: ${filePath}\nLanguage: ${language}\nInstruction: ${instruction}\n\nCode to edit:\n\`\`\`${language}\n${selectedText}\n\`\`\``;

  const response = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Router 402: Editing code...",
      cancellable: false,
    },
    async () => {
      return sendChatCompletion([
        { role: "system", content: EDIT_PROMPT },
        { role: "user", content: userMessage },
      ]);
    }
  );

  if (!response) {
    return;
  }

  // Extract code from markdown code blocks if present
  const editedCode = extractCode(response, language);

  await showDiffView(selectedText, editedCode, editor);
}

/** Extracts code from a markdown code block, falling back to raw text. */
function extractCode(response: string, _language: string): string {
  const codeBlockMatch = response.match(/```(?:\w*)\n([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trimEnd();
  }
  return response.trim();
}
