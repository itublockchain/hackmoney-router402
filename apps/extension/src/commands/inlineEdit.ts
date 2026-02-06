import * as vscode from "vscode";
import { sendChatCompletion } from "../api/client";
import {
  getFileLanguage,
  getRelativeFilePath,
  getSelectedText,
} from "../context/gather";
import { EDIT_PROMPT } from "../prompts";
import { showDiffView } from "../ui/diffView";
import { ensureWalletConfigured } from "../utils/config";

/**
 * Inline edit triggered from the context menu.
 * Asks for an instruction, sends selection + instruction to API,
 * and shows an inline diff for accept/reject.
 */
export async function inlineEdit(): Promise<void> {
  if (!(await ensureWalletConfigured())) {
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
    prompt: "Describe the edit you want to make",
    placeHolder: "e.g., Refactor to use async/await, Add type annotations",
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
      title: "Router 402: Applying inline edit...",
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

  // Extract code from response
  const editedCode = extractCode(response);

  await showDiffView(selectedText, editedCode, editor);
}

/** Extracts code from a markdown code block, falling back to raw text. */
function extractCode(response: string): string {
  const codeBlockMatch = response.match(/```(?:\w*)\n([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trimEnd();
  }
  return response.trim();
}
