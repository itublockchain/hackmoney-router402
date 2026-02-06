import * as vscode from "vscode";
import { DASHBOARD_URL } from "../utils/config";

/** Opens the Router 402 web dashboard in the user's browser. */
export async function openDashboard(): Promise<void> {
  await vscode.env.openExternal(vscode.Uri.parse(DASHBOARD_URL));
}
