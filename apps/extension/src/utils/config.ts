import * as vscode from "vscode";

export const API_ENDPOINT = "http://localhost:8080";
export const DASHBOARD_URL = "https://router402.xyz/chat";

export interface Router402Config {
  walletAddress: string;
  defaultModel: string;
}

/** Reads all Router 402 extension settings. */
export function getConfig(): Router402Config {
  const cfg = vscode.workspace.getConfiguration("router402");
  return {
    walletAddress: cfg.get<string>("walletAddress", ""),
    defaultModel: cfg.get<string>(
      "defaultModel",
      "anthropic/claude-sonnet-4-20250514"
    ),
  };
}

/**
 * Validates that a wallet address is configured.
 * Shows a warning notification with an "Open Settings" button if not.
 * Returns true if valid, false otherwise.
 */
export async function ensureWalletConfigured(): Promise<boolean> {
  const { walletAddress } = getConfig();
  if (!walletAddress) {
    const action = await vscode.window.showWarningMessage(
      "Please configure your wallet address in Router 402 settings.",
      "Open Settings"
    );
    if (action === "Open Settings") {
      await vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "router402.walletAddress"
      );
    }
    return false;
  }
  return true;
}

/** Truncates a wallet address for display (e.g., 0x1234...abcd). */
export function truncateAddress(address: string): string {
  if (address.length <= 10) {
    return address;
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
