import * as vscode from "vscode";
import type { StandarflowClient, WorkspaceInfo } from "./mcpClient";

export async function probeWorkspace(client: StandarflowClient): Promise<WorkspaceInfo> {
  const info = await client.workspaceInfo();
  if (info.first_run) {
    void vscode.window.showInformationMessage(
      "Standarflow workspace is empty. Open the command palette and run \"Standarflow: Show Workspace Info\" to verify the connection, then create your first group.",
    );
  }
  return info;
}
