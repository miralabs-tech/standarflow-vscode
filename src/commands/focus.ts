import * as vscode from "vscode";
import type { CommandCtx } from "./shared";
import { pickSession } from "./shared";
import { nodeSelection } from "./treeNode";

export async function sessionFocus(ctx: CommandCtx): Promise<void> {
  const { client, node } = ctx;
  const sel = nodeSelection(node) ?? (await pickSession(client, "Session to focus"));
  if (!sel) return;
  await client.sessionFocus(sel.groupPath, sel.slug);
  void vscode.window.showInformationMessage(
    `Focused ${sel.groupPath}/${sel.slug}. Touched files will auto-attach here when hooks fire.`,
  );
}

export async function sessionUnfocus(ctx: CommandCtx): Promise<void> {
  await ctx.client.sessionUnfocus();
  void vscode.window.showInformationMessage("Standarflow focus cleared.");
}

export async function sessionFocusPick(ctx: CommandCtx): Promise<void> {
  const { client } = ctx;
  const current = await client.sessionFocused().catch(() => null);
  const choices: {
    label: string;
    description?: string;
    action: "focus" | "unfocus" | "current";
  }[] = [];
  if (current) {
    choices.push({
      label: `$(target) ${current.group_path}/${current.session_slug}`,
      description: `current — ${current.session_kind} · ${current.session_status}`,
      action: "current",
    });
    choices.push({
      label: "$(x) Clear focus",
      description: "No more auto-attach on tool calls",
      action: "unfocus",
    });
  }
  choices.push({
    label: "$(circle-large-outline) Pick a different session…",
    action: "focus",
  });
  const pick = await vscode.window.showQuickPick(choices, {
    placeHolder: current
      ? `Currently focused: ${current.group_path}/${current.session_slug}`
      : "No session focused yet",
  });
  if (!pick) return;
  if (pick.action === "current") return;
  if (pick.action === "unfocus") {
    await sessionUnfocus(ctx);
    return;
  }
  await sessionFocus({ client, node: undefined });
}
