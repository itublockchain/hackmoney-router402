import * as vscode from "vscode";
import { openChat } from "./commands/chat";
import { editSelection } from "./commands/editSelection";
import { explainSelection } from "./commands/explainSelection";
import { inlineEdit } from "./commands/inlineEdit";
import { openDashboard } from "./commands/openDashboard";
import { reviewFile } from "./commands/reviewFile";
import { ChatViewProvider } from "./ui/chatPanel";
import { registerDiffCommands } from "./ui/diffView";
import { createStatusBar } from "./ui/statusBar";

/** Called when the extension is activated. */
export function activate(context: vscode.ExtensionContext): void {
  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand("router402.reviewFile", reviewFile),
    vscode.commands.registerCommand("router402.editSelection", editSelection),
    vscode.commands.registerCommand(
      "router402.explainSelection",
      explainSelection
    ),
    vscode.commands.registerCommand("router402.inlineEdit", inlineEdit),
    vscode.commands.registerCommand("router402.chat", openChat),
    vscode.commands.registerCommand("router402.openDashboard", openDashboard)
  );

  // Register diff accept/reject commands
  registerDiffCommands(context);

  // Register the chat webview provider
  const chatProvider = new ChatViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ChatViewProvider.viewType,
      chatProvider,
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  );

  // Create the status bar item
  createStatusBar(context);
}

/** Called when the extension is deactivated. */
export function deactivate(): void {
  // Cleanup handled by disposables registered in context.subscriptions
}
