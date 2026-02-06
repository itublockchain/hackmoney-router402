import * as vscode from "vscode";

/** Returns the full content of the active text editor, or undefined if none. */
export function getCurrentFileContent(): string | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return undefined;
  }
  return editor.document.getText();
}

/** Returns the currently selected text, or undefined if nothing is selected. */
export function getSelectedText(): string | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.selection.isEmpty) {
    return undefined;
  }
  return editor.document.getText(editor.selection);
}

/** Returns the language ID of the active file (e.g., "typescript", "python"). */
export function getFileLanguage(): string | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return undefined;
  }
  return editor.document.languageId;
}

/** Returns the file path relative to the workspace root. */
export function getRelativeFilePath(): string | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return undefined;
  }
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    return editor.document.fileName;
  }
  return vscode.workspace.asRelativePath(editor.document.uri);
}

/** Returns the selection range as a human-readable string (e.g., "lines 5-12"). */
export function getSelectionRange(): string | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.selection.isEmpty) {
    return undefined;
  }
  const start = editor.selection.start.line + 1;
  const end = editor.selection.end.line + 1;
  return `lines ${start}-${end}`;
}

/** Builds a context string with file metadata for API requests. */
export function buildContextHeader(): string {
  const parts: string[] = [];
  const filePath = getRelativeFilePath();
  const language = getFileLanguage();
  const range = getSelectionRange();

  if (filePath) {
    parts.push(`File: ${filePath}`);
  }
  if (language) {
    parts.push(`Language: ${language}`);
  }
  if (range) {
    parts.push(`Selection: ${range}`);
  }

  return parts.length > 0 ? `${parts.join("\n")}\n\n` : "";
}
