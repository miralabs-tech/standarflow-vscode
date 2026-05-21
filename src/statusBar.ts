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
    text: "$(standarflow-logo) standarflow: idle",
    tooltip: "Not connected.",
  }))
  .with({ kind: "connecting" }, () => ({
    text: "$(sync~spin) standarflow: connecting",
    tooltip: "Spawning standarflow binary…",
  }))
  .with({ kind: "ready" }, (s) => ({
    text: `$(standarflow-logo) ${s.info.groups_count}g · ${s.info.sessions_count}s`,
    tooltip:
      `Standarflow — ${s.info.groups_count} group(s) · ${s.info.sessions_count} session(s)\n` +
      `DB: ${s.info.db_path}\n` +
      `Schema v${s.info.schema_version}\n` +
      `${s.info.file_refs_count} file ref(s) · ${s.info.conversations_count} conversation(s)`,
  }))
  .with({ kind: "error" }, (s) => ({
    text: "$(error) standarflow: error",
    tooltip: s.message,
  }))
  .exhaustive();

/// Single status-bar item: connection state with the focus count folded in as
/// a suffix. Clicking it opens the Standarflow action menu.
export class StandarflowStatusBar implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;
  private state: ConnectionState = { kind: "disconnected" };
  private focusCount = 0;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.item.command = "standarflow.showActions";
    this.item.show();
    this.render();
  }

  set(state: ConnectionState): void {
    this.state = state;
    this.render();
  }

  setFocusCount(count: number): void {
    this.focusCount = Math.max(0, count);
    this.render();
  }

  hideFocus(): void {
    this.focusCount = 0;
    this.render();
  }

  private render(): void {
    const { text, tooltip } = renderState(this.state);
    const ready = this.state.kind === "ready";
    this.item.text = ready ? `${text} · ${this.focusCount}f` : text;
    this.item.tooltip =
      tooltip +
      (ready ? `\n${this.focusCount} conversation(s) with a pinned session` : "") +
      "\n— Click for actions —";
  }

  dispose(): void {
    this.item.dispose();
  }
}
