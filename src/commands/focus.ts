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

export async function conversationKill(ctx: CommandCtx): Promise<void> {
  const conv = nodeConversation(ctx.node);
  if (!conv) {
    void vscode.window.showWarningMessage(
      "Pick a conversation in the Standarflow tree to kill its agent.",
    );
    return;
  }
  const c = conv.conversation;
  const pid = c.last_conversation_pid;
  if (pid === null) {
    void vscode.window.showWarningMessage(
      "No agent process id recorded for this conversation.",
    );
    return;
  }
  const label = c.client_label ?? c.provider_conversation_id.slice(0, 8);
  const choice = await vscode.window.showWarningMessage(
    `Kill the agent process (pid ${pid}) for conversation "${label}"? Its chat closes.`,
    { modal: true },
    "Kill",
  );
  if (choice !== "Kill") return;
  try {
    process.kill(pid);
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    // ESRCH — the process is already gone, which is the goal anyway.
    if (err.code !== "ESRCH") {
      void vscode.window.showErrorMessage(
        `Could not kill process ${pid}: ${err.message}`,
      );
      return;
    }
  }
  // Give the OS a moment to drop the process from the table before the
  // post-command refresh recomputes is_live, or the killed chat lingers a tick.
  await new Promise((resolve) => setTimeout(resolve, 400));
  void vscode.window.showInformationMessage(
    `Conversation "${label}" agent (pid ${pid}) stopped.`,
  );
}
