import * as vscode from "vscode";
import { pingApi } from "../api/client";
import {
  API_ENDPOINT,
  DASHBOARD_URL,
  getConfig,
  truncateAddress,
} from "../utils/config";

let statusBarItem: vscode.StatusBarItem;
let connected = false;

/** Creates and shows the Router 402 status bar item. */
export function createStatusBar(context: vscode.ExtensionContext): void {
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.command = "router402.statusBarClicked";
  context.subscriptions.push(statusBarItem);

  // Register the quick-pick command for status bar clicks
  context.subscriptions.push(
    vscode.commands.registerCommand("router402.statusBarClicked", showQuickPick)
  );

  updateStatusBar();
  statusBarItem.show();

  // Check connectivity on activation
  checkConnectivity();

  // Re-check when settings change
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("router402")) {
        updateStatusBar();
        checkConnectivity();
      }
    })
  );
}

/** Updates the status bar text and tooltip. */
function updateStatusBar(): void {
  const config = getConfig();
  const indicator = connected ? "$(circle-filled)" : "$(circle-outline)";
  const model = config.defaultModel.split("/").pop() ?? config.defaultModel;
  const truncatedModel = model.length > 20 ? `${model.slice(0, 17)}...` : model;

  statusBarItem.text = `${indicator} Router 402 | ${truncatedModel}`;

  const wallet = config.walletAddress
    ? truncateAddress(config.walletAddress)
    : "Not configured";
  statusBarItem.tooltip = `Router 402\nModel: ${config.defaultModel}\nWallet: ${wallet}\nAPI: ${API_ENDPOINT}\nStatus: ${connected ? "Connected" : "Disconnected"}`;

  statusBarItem.color = connected
    ? undefined
    : new vscode.ThemeColor("errorForeground");
}

/** Pings the API and updates connection status. */
async function checkConnectivity(): Promise<void> {
  connected = await pingApi();
  updateStatusBar();
}

/** Shows a quick-pick menu when the status bar item is clicked. */
async function showQuickPick(): Promise<void> {
  const items: vscode.QuickPickItem[] = [
    {
      label: "$(gear) Open Router 402 Settings",
      description: "Configure wallet and model",
    },
    {
      label: "$(refresh) Check Connection",
      description: connected ? "Connected" : "Disconnected",
    },
    {
      label: "$(globe) Open Dashboard",
      description: DASHBOARD_URL,
    },
    {
      label: "$(comment-discussion) Open Chat",
      description: "Start a conversation with Router 402",
    },
  ];

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: "Router 402",
  });

  if (!selected) {
    return;
  }

  if (selected.label.includes("Settings")) {
    await vscode.commands.executeCommand(
      "workbench.action.openSettings",
      "router402"
    );
  } else if (selected.label.includes("Connection")) {
    await checkConnectivity();
    const status = connected ? "connected" : "disconnected";
    vscode.window.showInformationMessage(`Router 402 API is ${status}.`);
  } else if (selected.label.includes("Dashboard")) {
    await vscode.env.openExternal(vscode.Uri.parse(DASHBOARD_URL));
  } else if (selected.label.includes("Chat")) {
    await vscode.commands.executeCommand("router402.chat");
  }
}

/** Disposes the status bar item. */
export function disposeStatusBar(): void {
  statusBarItem?.dispose();
}
