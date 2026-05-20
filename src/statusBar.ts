import * as vscode from "vscode";
import { matcher } from "matchigo";
import type { WorkspaceInfo } from "./mcpClient";

export type ConnectionState =
  | { kind: "disconnected" }
  | { kind: "connecting" }
  | { kind: "ready"; info: WorkspaceInfo }
  | { kind: "error"; message: string };

type Rendered = { text: string; tooltip: string };

const renderState = matcher<ConnectionState, Rendered>()
  .with({ kind: "disconnected" }, () => ({
    text: "$(database) standarflow: idle",
    tooltip: "Not connected.",
  }))
  .with({ kind: "connecting" }, () => ({
    text: "$(sync~spin) standarflow: connecting",
    tooltip: "Spawning standarflow binary…",
  }))
  .with({ kind: "ready" }, (s) => ({
    text: `$(database) standarflow: ${s.info.groups_count}g · ${s.info.sessions_count}s`,
    tooltip:
      `DB: ${s.info.db_path}\n` +
      `Schema v${s.info.schema_version}\n` +
      `${s.info.file_refs_count} file refs · ${s.info.conversations_count} conversations`,
  }))
  .with({ kind: "error" }, (s) => ({
    text: "$(error) standarflow: error",
    tooltip: s.message,
  }))
  .exhaustive();

export class StandarflowStatusBar implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;
  private readonly focusItem: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.item.command = "standarflow.showWorkspaceInfo";
    this.item.show();
    this.set({ kind: "disconnected" });

    this.focusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
    this.focusItem.command = "workbench.view.extension.standarflow";
    this.focusItem.hide();
  }

  set(state: ConnectionState): void {
    const { text, tooltip } = renderState(state);
    this.item.text = text;
    this.item.tooltip = tooltip;
  }

  setFocusCount(count: number): void {
    if (count <= 0) {
      this.focusItem.hide();
      return;
    }
    this.focusItem.text = `$(target) ${count} focused`;
    this.focusItem.tooltip =
      `${count} conversation(s) have a pinned standarflow session.\n` +
      "Open the Standarflow view to manage focus per conversation.";
    this.focusItem.show();
  }

  hideFocus(): void {
    this.focusItem.hide();
  }

  dispose(): void {
    this.item.dispose();
    this.focusItem.dispose();
  }
}
