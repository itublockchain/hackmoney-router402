import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as vscode from "vscode";

interface PendingDiff {
  originalUri: vscode.Uri;
  modifiedUri: vscode.Uri;
  targetEditor: vscode.TextEditor;
  originalContent: string;
  modifiedContent: string;
}

let pendingDiff: PendingDiff | undefined;

/**
 * Shows a diff view comparing original code with AI-suggested changes.
 * Creates temporary files for the diff and registers accept/reject handlers.
 */
export async function showDiffView(
  originalContent: string,
  modifiedContent: string,
  editor: vscode.TextEditor,
  title = "Router 402: Suggested Changes"
): Promise<void> {
  // Clean up any previous pending diff
  cleanupTempFiles();

  const tmpDir = os.tmpdir();
  const timestamp = Date.now();
  const ext = path.extname(editor.document.fileName) || ".txt";

  const originalPath = path.join(
    tmpDir,
    `router402-original-${timestamp}${ext}`
  );
  const modifiedPath = path.join(
    tmpDir,
    `router402-modified-${timestamp}${ext}`
  );

  fs.writeFileSync(originalPath, originalContent, "utf-8");
  fs.writeFileSync(modifiedPath, modifiedContent, "utf-8");

  const originalUri = vscode.Uri.file(originalPath);
  const modifiedUri = vscode.Uri.file(modifiedPath);

  pendingDiff = {
    originalUri,
    modifiedUri,
    targetEditor: editor,
    originalContent,
    modifiedContent,
  };

  await vscode.commands.executeCommand(
    "vscode.diff",
    originalUri,
    modifiedUri,
    title
  );

  // Show accept/reject buttons
  const action = await vscode.window.showInformationMessage(
    "Review the suggested changes.",
    "Accept Changes",
    "Reject Changes"
  );

  if (action === "Accept Changes") {
    await acceptChanges();
  } else {
    rejectChanges();
  }
}

/** Applies the modified content to the original editor. */
export async function acceptChanges(): Promise<void> {
  if (!pendingDiff) {
    vscode.window.showWarningMessage("No pending changes to accept.");
    return;
  }

  const { targetEditor, modifiedContent } = pendingDiff;

  // Check if the target editor is still valid
  const doc = targetEditor.document;
  if (doc.isClosed) {
    vscode.window.showErrorMessage("The original file has been closed.");
    cleanupTempFiles();
    return;
  }

  const fullRange = new vscode.Range(
    doc.positionAt(0),
    doc.positionAt(doc.getText().length)
  );

  const edit = new vscode.WorkspaceEdit();
  edit.replace(doc.uri, fullRange, modifiedContent);
  await vscode.workspace.applyEdit(edit);

  vscode.window.showInformationMessage("Changes applied.");
  cleanupTempFiles();
}

/** Discards the suggested changes. */
export function rejectChanges(): void {
  if (!pendingDiff) {
    vscode.window.showWarningMessage("No pending changes to reject.");
    return;
  }

  vscode.window.showInformationMessage("Changes rejected.");
  cleanupTempFiles();
}

/** Removes temporary diff files and clears pending state. */
function cleanupTempFiles(): void {
  if (!pendingDiff) {
    return;
  }

  try {
    fs.unlinkSync(pendingDiff.originalUri.fsPath);
  } catch {
    // File may already be gone
  }
  try {
    fs.unlinkSync(pendingDiff.modifiedUri.fsPath);
  } catch {
    // File may already be gone
  }

  pendingDiff = undefined;
}

/** Registers the accept/reject commands. */
export function registerDiffCommands(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("router402.acceptChanges", acceptChanges),
    vscode.commands.registerCommand("router402.rejectChanges", rejectChanges)
  );
}
