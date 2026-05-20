import * as vscode from "vscode";
import type { CommandCtx } from "./shared";
import { pickSession } from "./shared";
import { nodeConversation } from "./treeNode";

export async function conversationFocus(ctx: CommandCtx): Promise<void> {
  const conv = nodeConversation(ctx.node);
  if (!conv) {
    void vscode.window.showWarningMessage(
      "Pick a conversation in the Standarflow tree to focus it.",
    );
    return;
  }
  const sel = await pickSession(ctx.client, "Session to focus this conversation on");
  if (!sel) return;
  await ctx.client.sessionFocus(sel.groupPath, sel.slug, conv.conversation.id);
  void vscode.window.showInformationMessage(
    `Focused ${sel.groupPath}/${sel.slug} for this conversation — its hook-driven file changes now attach there.`,
  );
}

export async function conversationUnfocus(ctx: CommandCtx): Promise<void> {
  const conv = nodeConversation(ctx.node);
  if (!conv) {
    void vscode.window.showWarningMessage(
      "Pick a conversation in the Standarflow tree to clear its focus.",
    );
    return;
  }
  await ctx.client.sessionUnfocus(conv.conversation.id);
  void vscode.window.showInformationMessage("Focus cleared for this conversation.");
}

export async function conversationRename(ctx: CommandCtx): Promise<void> {
  const conv = nodeConversation(ctx.node);
  if (!conv) {
    void vscode.window.showWarningMessage(
      "Pick a conversation in the Standarflow tree to rename it.",
    );
    return;
  }
  const c = conv.conversation;
  const label = await vscode.window.showInputBox({
    title: "Rename conversation",
    prompt: "Human-friendly label. Leave empty to clear and fall back to the id.",
    value: c.client_label ?? "",
  });
  if (label === undefined) return;
  const trimmed = label.trim();
  await ctx.client.conversationSetLabel(c.id, trimmed === "" ? null : trimmed);
  void vscode.window.showInformationMessage(
    trimmed === ""
      ? "Conversation label cleared."
      : `Conversation renamed to "${trimmed}".`,
  );
}
