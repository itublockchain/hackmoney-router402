import * as vscode from "vscode";
import { pingApi } from "../api/client";
import { DASHBOARD_URL, getApiKey, getConfig } from "../utils/config";

let statusBarItem: vscode.StatusBarItem;
let connected = false;
let hasApiKey = false;

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

  refreshStatusBar();
  statusBarItem.show();

  // Re-check when settings change
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("router402")) {
        refreshStatusBar();
      }
    })
  );

  // Listen for secret storage changes (API key updates)
  context.subscriptions.push(
    context.secrets.onDidChange((e) => {
      if (e.key === "router402.apiKey") {
        refreshStatusBar();
      }
    })
  );
}

/** Refreshes both API key status and connectivity, then updates display. */
async function refreshStatusBar(): Promise<void> {
  hasApiKey = !!(await getApiKey());
  connected = await pingApi();
  updateStatusBar();
}

/** Updates the status bar text and tooltip. */
function updateStatusBar(): void {
  const config = getConfig();

  let indicator: string;
  if (!hasApiKey) {
    indicator = "$(key)";
  } else if (connected) {
    indicator = "$(circle-filled)";
  } else {
    indicator = "$(circle-outline)";
  }

  const model = config.defaultModel.split("/").pop() ?? config.defaultModel;
  const truncatedModel = model.length > 20 ? `${model.slice(0, 17)}...` : model;

  statusBarItem.text = `${indicator} Router 402 | ${truncatedModel}`;

  const apiKeyStatus = hasApiKey ? "Configured" : "Not set";
  const connectionStatus = connected ? "Connected" : "Disconnected";

  statusBarItem.tooltip = `Router 402\nModel: ${config.defaultModel}\nAPI Key: ${apiKeyStatus}\nAPI: ${config.apiEndpoint}\nStatus: ${connectionStatus}`;

  if (!hasApiKey) {
    statusBarItem.color = new vscode.ThemeColor("editorWarning.foreground");
  } else if (!connected) {
    statusBarItem.color = new vscode.ThemeColor("errorForeground");
  } else {
    statusBarItem.color = undefined;
  }
}

/** Shows a quick-pick menu when the status bar item is clicked. */
async function showQuickPick(): Promise<void> {
  const items: vscode.QuickPickItem[] = [];

  if (!hasApiKey) {
    items.push({
      label: "$(key) Set API Key",
      description: "Required — paste your API key from the dashboard",
    });
  } else {
    items.push({
      label: "$(key) Manage API Key",
      description: "Update or remove your API key",
    });
  }

  items.push(
    {
      label: "$(gear) Open Settings",
      description: "Configure model and endpoint",
    },
    {
      label: "$(refresh) Check Connection",
      description: connected ? "Connected" : "Disconnected",
    },
    {
      label: "$(person) Check Account Status",
      description: "View account balance and session key info",
    },
    {
      label: "$(globe) Open Dashboard",
      description: DASHBOARD_URL,
    },
    {
      label: "$(comment-discussion) Open Chat",
      description: "Start a conversation with Router 402",
    }
  );

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: "Router 402",
  });

  if (!selected) {
    return;
  }

  if (
    selected.label.includes("Set API Key") ||
    selected.label.includes("Manage API Key")
  ) {
    await vscode.commands.executeCommand("router402.setApiKey");
    await refreshStatusBar();
  } else if (selected.label.includes("Open Settings")) {
    await vscode.commands.executeCommand(
      "workbench.action.openSettings",
      "router402"
    );
  } else if (selected.label.includes("Check Connection")) {
    await refreshStatusBar();
    const status = connected ? "connected" : "disconnected";
    vscode.window.showInformationMessage(`Router 402 API is ${status}.`);
  } else if (selected.label.includes("Account Status")) {
    await vscode.commands.executeCommand("router402.checkAccount");
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
