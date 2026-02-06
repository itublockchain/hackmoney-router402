import * as vscode from "vscode";
import { checkAccountStatus } from "../api/client";
import { DASHBOARD_URL, ensureApiKeyConfigured } from "../utils/config";

/** Checks the user's Router 402 account status and displays it. */
export async function checkAccount(): Promise<void> {
  const hasKey = await ensureApiKeyConfigured();
  if (!hasKey) {
    return;
  }

  const status = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Router 402: Checking account status...",
      cancellable: false,
    },
    async () => {
      return checkAccountStatus();
    }
  );

  if (!status) {
    vscode.window.showErrorMessage(
      "Could not retrieve account status. Check your network connection and API endpoint."
    );
    return;
  }

  if (!status.exists) {
    const action = await vscode.window.showWarningMessage(
      "No account found. Please complete setup on the dashboard.",
      "Open Dashboard"
    );
    if (action === "Open Dashboard") {
      await vscode.env.openExternal(vscode.Uri.parse(DASHBOARD_URL));
    }
    return;
  }

  // Build status message
  const lines: string[] = [];

  if (status.user) {
    lines.push(`Current Debt: $${status.user.currentDebt}`);
    lines.push(`Total Spent: $${status.user.totalSpent}`);
  }

  if (status.sessionKey) {
    lines.push(`Session Key: Active (Chain ${status.sessionKey.chainId})`);
    lines.push(`Smart Account: ${status.sessionKey.smartAccountAddress}`);
  } else {
    lines.push("Session Key: Not configured");
  }

  lines.push(`Account Ready: ${status.ready ? "Yes" : "No"}`);

  const panel = vscode.window.createWebviewPanel(
    "router402AccountStatus",
    "Router 402: Account Status",
    vscode.ViewColumn.Active,
    { enableScripts: false }
  );

  panel.webview.html = renderAccountStatusHtml(status, lines);
}

/** Renders the account status as HTML. */
function renderAccountStatusHtml(
  status: {
    exists: boolean;
    ready: boolean;
    user?: {
      currentDebt: string;
      totalSpent: string;
    };
    sessionKey?: {
      chainId: number;
      smartAccountAddress: string;
      createdAt: string;
    };
  },
  _lines: string[]
): string {
  const readyBadge = status.ready
    ? '<span style="color: #4ade80;">Ready</span>'
    : '<span style="color: #f87171;">Not Ready</span>';

  const sessionKeyStatus = status.sessionKey
    ? `<tr><td>Session Key</td><td style="color: #4ade80;">Active</td></tr>
       <tr><td>Chain ID</td><td>${status.sessionKey.chainId}</td></tr>
       <tr><td>Smart Account</td><td><code>${status.sessionKey.smartAccountAddress}</code></td></tr>
       <tr><td>Created</td><td>${new Date(status.sessionKey.createdAt).toLocaleDateString()}</td></tr>`
    : '<tr><td>Session Key</td><td style="color: #f87171;">Not configured</td></tr>';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 24px;
      line-height: 1.6;
    }
    h1 { margin-bottom: 8px; }
    table { border-collapse: collapse; width: 100%; max-width: 500px; margin-top: 16px; }
    td { padding: 8px 12px; border-bottom: 1px solid var(--vscode-editorWidget-border, #333); }
    td:first-child { font-weight: 600; width: 160px; color: var(--vscode-descriptionForeground); }
    code {
      background: var(--vscode-textCodeBlock-background);
      padding: 2px 6px;
      border-radius: 3px;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 12px;
    }
    .section { margin-top: 24px; }
    .section h2 { font-size: 14px; margin-bottom: 4px; }
  </style>
</head>
<body>
  <h1>Account Status ${readyBadge}</h1>

  <div class="section">
    <h2>Usage</h2>
    <table>
      <tr><td>Current Debt</td><td>$${status.user?.currentDebt ?? "0.00"}</td></tr>
      <tr><td>Total Spent</td><td>$${status.user?.totalSpent ?? "0.00"}</td></tr>
    </table>
  </div>

  <div class="section">
    <h2>Session Key</h2>
    <table>
      ${sessionKeyStatus}
    </table>
  </div>
</body>
</html>`;
}
