import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as vscode from "vscode";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PendingDiff {
  /** URI of the real file that will receive the changes. */
  targetUri: vscode.Uri;
  /** Virtual URI used for the read-only "original" side of the diff. */
  originalUri: vscode.Uri;
  /** Path to the temp file used for the "modified" side. */
  modifiedPath: string;
  modifiedUri: vscode.Uri;
  originalContent: string;
  modifiedContent: string;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let pendingDiff: PendingDiff | undefined;

/** Scheme for the read-only original side of diffs. */
export const DIFF_SCHEME = "router402-diff";

// ---------------------------------------------------------------------------
// TextDocumentContentProvider — serves the "original" side virtually
// ---------------------------------------------------------------------------

export class DiffOriginalContentProvider
  implements vscode.TextDocumentContentProvider
{
  private contentMap = new Map<string, string>();
  private onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();

  public onDidChange = this.onDidChangeEmitter.event;

  set(uri: vscode.Uri, content: string): void {
    this.contentMap.set(uri.toString(), content);
    this.onDidChangeEmitter.fire(uri);
  }

  remove(uri: vscode.Uri): void {
    this.contentMap.delete(uri.toString());
  }

  provideTextDocumentContent(uri: vscode.Uri): string {
    return this.contentMap.get(uri.toString()) ?? "";
  }
}

export const diffContentProvider = new DiffOriginalContentProvider();

// ---------------------------------------------------------------------------
// CodeLensProvider — shows Accept / Reject at the top of the modified file
// ---------------------------------------------------------------------------

export class DiffCodeLensProvider implements vscode.CodeLensProvider {
  private onDidChangeEmitter = new vscode.EventEmitter<void>();
  public onDidChangeCodeLenses = this.onDidChangeEmitter.event;

  refresh(): void {
    this.onDidChangeEmitter.fire();
  }

  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    if (!pendingDiff) {
      return [];
    }
    // Only show lenses on the modified temp file inside the diff editor
    if (document.uri.toString() !== pendingDiff.modifiedUri.toString()) {
      return [];
    }

    const topRange = new vscode.Range(0, 0, 0, 0);
    return [
      new vscode.CodeLens(topRange, {
        title: "$(check) Accept Changes",
        command: "router402.acceptChanges",
        tooltip: "Apply these changes to the original file",
      }),
      new vscode.CodeLens(topRange, {
        title: "$(x) Reject Changes",
        command: "router402.rejectChanges",
        tooltip: "Discard these changes",
      }),
    ];
  }
}

export const diffCodeLensProvider = new DiffCodeLensProvider();

// ---------------------------------------------------------------------------
// showDiffView
// ---------------------------------------------------------------------------

/**
 * Opens a side-by-side diff comparing the original file content with
 * AI-suggested changes. Accept/Reject is available via CodeLens buttons at
 * the top of the diff, keyboard shortcuts, or the command palette.
 */
export async function showDiffView(
  originalContent: string,
  modifiedContent: string,
  editor: vscode.TextEditor,
  title = "Router 402: Suggested Changes"
): Promise<void> {
  // Clean up any previous pending diff
  cleanup();

  const targetUri = editor.document.uri;
  const ext = path.extname(editor.document.fileName) || ".txt";
  const baseName = path.basename(editor.document.fileName, ext);
  const timestamp = Date.now();

  // --- Original side: virtual read-only document ---
  const originalUri = vscode.Uri.from({
    scheme: DIFF_SCHEME,
    path: `/${baseName}${ext}`,
    query: `ts=${timestamp}`,
  });
  diffContentProvider.set(originalUri, originalContent);

  // --- Modified side: temp file (so VS Code gets correct language) ---
  const modifiedPath = path.join(
    os.tmpdir(),
    `router402-modified-${timestamp}${ext}`
  );
  fs.writeFileSync(modifiedPath, modifiedContent, "utf-8");
  const modifiedUri = vscode.Uri.file(modifiedPath);

  pendingDiff = {
    targetUri,
    originalUri,
    modifiedPath,
    modifiedUri,
    originalContent,
    modifiedContent,
  };

  // Refresh CodeLens so the lenses show up
  diffCodeLensProvider.refresh();

  // Open the diff editor
  await vscode.commands.executeCommand(
    "vscode.diff",
    originalUri,
    modifiedUri,
    title
  );
}

// ---------------------------------------------------------------------------
// Accept / Reject
// ---------------------------------------------------------------------------

/** Applies the modified content to the original document. */
export async function acceptChanges(): Promise<void> {
  if (!pendingDiff) {
    vscode.window.showWarningMessage("No pending changes to accept.");
    return;
  }

  const { targetUri, modifiedContent } = pendingDiff;

  // Open the document by URI — works even if the tab was closed
  let doc: vscode.TextDocument;
  try {
    doc = await vscode.workspace.openTextDocument(targetUri);
  } catch {
    vscode.window.showErrorMessage(
      "Could not open the original file. It may have been deleted."
    );
    cleanup();
    return;
  }

  const fullRange = new vscode.Range(
    doc.positionAt(0),
    doc.positionAt(doc.getText().length)
  );
  const edit = new vscode.WorkspaceEdit();
  edit.replace(targetUri, fullRange, modifiedContent);
  const applied = await vscode.workspace.applyEdit(edit);

  if (applied) {
    vscode.window.showInformationMessage("Changes applied.");
  } else {
    vscode.window.showErrorMessage("Failed to apply changes.");
  }

  await closeDiffEditorAndCleanup();
}

/** Discards the suggested changes. */
export async function rejectChanges(): Promise<void> {
  if (!pendingDiff) {
    vscode.window.showWarningMessage("No pending changes to reject.");
    return;
  }

  vscode.window.showInformationMessage("Changes rejected.");
  await closeDiffEditorAndCleanup();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Closes the diff editor tab, then cleans up temp files / state. */
async function closeDiffEditorAndCleanup(): Promise<void> {
  if (!pendingDiff) {
    return;
  }

  const modifiedUriStr = pendingDiff.modifiedUri.toString();

  // Try to close the diff tab. Walk all tab groups looking for the tab whose
  // input contains our modified URI.
  for (const group of vscode.window.tabGroups.all) {
    for (const tab of group.tabs) {
      const input = tab.input as { modified?: vscode.Uri } | undefined;
      if (input?.modified?.toString() === modifiedUriStr) {
        try {
          await vscode.window.tabGroups.close(tab);
        } catch {
          // tab may already be closed
        }
      }
    }
  }

  cleanup();
}

/** Removes temp files and virtual content; clears state. */
function cleanup(): void {
  if (!pendingDiff) {
    return;
  }

  // Remove the virtual original content
  diffContentProvider.remove(pendingDiff.originalUri);

  // Delete the temp modified file
  try {
    fs.unlinkSync(pendingDiff.modifiedPath);
  } catch {
    // may already be gone
  }

  pendingDiff = undefined;

  // Refresh CodeLens so stale lenses disappear
  diffCodeLensProvider.refresh();
}

// ---------------------------------------------------------------------------
// Cleanup on tab close (if user closes the diff tab manually)
// ---------------------------------------------------------------------------

export function registerTabCloseListener(
  context: vscode.ExtensionContext
): void {
  context.subscriptions.push(
    vscode.window.tabGroups.onDidChangeTabs((event) => {
      if (!pendingDiff) {
        return;
      }
      const modifiedUriStr = pendingDiff.modifiedUri.toString();
      for (const tab of event.closed) {
        const input = tab.input as { modified?: vscode.Uri } | undefined;
        if (input?.modified?.toString() === modifiedUriStr) {
          cleanup();
          return;
        }
      }
    })
  );
}

// ---------------------------------------------------------------------------
// Command registration
// ---------------------------------------------------------------------------

/** Registers accept/reject commands and all diff-related providers. */
export function registerDiffCommands(context: vscode.ExtensionContext): void {
  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand("router402.acceptChanges", acceptChanges),
    vscode.commands.registerCommand("router402.rejectChanges", rejectChanges)
  );

  // Virtual document provider for the original side
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(
      DIFF_SCHEME,
      diffContentProvider
    )
  );

  // CodeLens provider for accept/reject buttons
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider("*", diffCodeLensProvider)
  );

  // Auto-cleanup when the diff tab is closed by the user
  registerTabCloseListener(context);
}
