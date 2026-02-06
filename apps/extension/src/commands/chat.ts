import * as vscode from "vscode";

/** Opens the Router 402 chat panel in the sidebar. */
export async function openChat(): Promise<void> {
  // Focus the Router 402 sidebar view
  await vscode.commands.executeCommand("router402.chatView.focus");
}
