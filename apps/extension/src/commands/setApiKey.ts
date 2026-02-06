import * as vscode from "vscode";
import {
  DASHBOARD_URL,
  deleteApiKey,
  getApiKey,
  setApiKey,
} from "../utils/config";

/** Prompts the user to enter their Router 402 API key and stores it securely. */
export async function setApiKeyCommand(): Promise<void> {
  const existingKey = await getApiKey();

  if (existingKey) {
    const action = await vscode.window.showQuickPick(
      [
        {
          label: "$(key) Update API Key",
          description: "Replace the current API key",
        },
        {
          label: "$(trash) Remove API Key",
          description: "Delete the stored API key",
        },
        { label: "$(close) Cancel", description: "Keep the current API key" },
      ],
      { placeHolder: "You already have an API key configured" }
    );

    if (!action) {
      return;
    }

    if (action.label.includes("Remove")) {
      await deleteApiKey();
      vscode.window.showInformationMessage("Router 402 API key removed.");
      return;
    }

    if (action.label.includes("Cancel")) {
      return;
    }
  }

  const apiKey = await vscode.window.showInputBox({
    prompt: "Enter your Router 402 API key",
    placeHolder: "Paste your API key from the Router 402 dashboard",
    password: true,
    ignoreFocusOut: true,
    validateInput: (value) => {
      if (!value || !value.trim()) {
        return "API key cannot be empty";
      }
      return null;
    },
  });

  if (!apiKey) {
    return;
  }

  await setApiKey(apiKey.trim());

  const action = await vscode.window.showInformationMessage(
    "Router 402 API key saved securely.",
    "Check Connection"
  );

  if (action === "Check Connection") {
    await vscode.commands.executeCommand("router402.statusBarClicked");
  }
}

/** Opens the dashboard for the user to get an API key. */
export async function openSetupGuide(): Promise<void> {
  const action = await vscode.window.showInformationMessage(
    "To get your API key:\n1. Go to the Router 402 dashboard\n2. Connect your wallet\n3. Complete the setup process\n4. Copy your API key",
    "Open Dashboard",
    "I have my API key"
  );

  if (action === "Open Dashboard") {
    await vscode.env.openExternal(vscode.Uri.parse(DASHBOARD_URL));
  } else if (action === "I have my API key") {
    await setApiKeyCommand();
  }
}
