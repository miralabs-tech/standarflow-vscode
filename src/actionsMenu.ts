import * as vscode from "vscode";

interface ActionItem extends vscode.QuickPickItem {
  command?: string;
}

const ACTIONS: ActionItem[] = [
  {
    label: "$(info) Workspace info",
    detail: "DB path, schema version and row counts",
    command: "standarflow.showWorkspaceInfo",
  },
  {
    label: "$(refresh) Refresh tree",
    detail: "Reload the Standarflow view",
    command: "standarflow.refreshTree",
  },
  {
    label: "$(list-tree) Open Standarflow view",
    command: "workbench.view.extension.standarflow",
  },
  { label: "Connection", kind: vscode.QuickPickItemKind.Separator },
  {
    label: "$(sync) Reconnect",
    detail: "Restart the standarflow server",
    command: "standarflow.reconnect",
  },
  {
    label: "$(plug) Install Claude Code hooks",
    command: "standarflow.installClaudeHooks",
  },
  {
    label: "$(file-code) Generate .mcp.json",
    command: "standarflow.generateMcpConfig",
  },
  { label: "$(gear) Settings", command: "standarflow.openSettings" },
  { label: "Danger zone", kind: vscode.QuickPickItemKind.Separator },
  {
    label: "$(debug-disconnect) Disconnect",
    command: "standarflow.disconnect",
  },
  {
    label: "$(trash) Delete database",
    detail: "Wipe all groups, sessions, file refs and links",
    command: "standarflow.deleteDb",
  },
];

/// Show the Standarflow action menu — the QuickPick behind the status-bar item.
export async function showActionsMenu(): Promise<void> {
  const pick = await vscode.window.showQuickPick(ACTIONS, {
    title: "Standarflow",
    placeHolder: "Pick an action",
  });
  if (pick?.command) {
    await vscode.commands.executeCommand(pick.command);
  }
}
