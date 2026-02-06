import * as vscode from "vscode";
import { openChat } from "./commands/chat";
import { checkAccount } from "./commands/checkAccount";
import { editSelection } from "./commands/editSelection";
import { explainSelection } from "./commands/explainSelection";
import { inlineEdit } from "./commands/inlineEdit";
import { openDashboard } from "./commands/openDashboard";
import { reviewFile } from "./commands/reviewFile";
import { setApiKeyCommand } from "./commands/setApiKey";
import { ChatViewProvider } from "./ui/chatPanel";
import { registerDiffCommands } from "./ui/diffView";
import { createStatusBar } from "./ui/statusBar";
import { initSecretStorage } from "./utils/config";

let chatProviderInstance: ChatViewProvider | undefined;

/** Returns the singleton ChatViewProvider instance. */
export function getChatProvider(): ChatViewProvider | undefined {
  return chatProviderInstance;
}

/** Called when the extension is activated. */
export function activate(context: vscode.ExtensionContext): void {
  // Initialize secret storage for API key management
  initSecretStorage(context);

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
    vscode.commands.registerCommand("router402.openDashboard", openDashboard),
    vscode.commands.registerCommand("router402.setApiKey", setApiKeyCommand),
    vscode.commands.registerCommand("router402.checkAccount", checkAccount),
    vscode.commands.registerCommand("router402.toggleChat", () => {
      if (chatProviderInstance?.isVisible) {
        vscode.commands.executeCommand("workbench.action.closeSidebar");
      } else {
        vscode.commands.executeCommand("router402.chatView.focus");
      }
    })
  );

  // Register diff accept/reject commands
  registerDiffCommands(context);

  // Register the chat webview provider
  const chatProvider = new ChatViewProvider(context.extensionUri);
  chatProviderInstance = chatProvider;
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
