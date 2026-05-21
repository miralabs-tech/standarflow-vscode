import * as vscode from "vscode";
import { isGhost } from "../conversation";
import type { CommandCtx } from "./shared";
import { pickSession } from "./shared";
import { nodeConversation, nodeSelection } from "./treeNode";

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

/// Pick a live conversation and focus it on the session/artefact node — the
/// inverse of conversationFocus, started from the session side.
export async function focusConversationHere(ctx: CommandCtx): Promise<void> {
  const sel = nodeSelection(ctx.node);
  if (!sel) {
    void vscode.window.showWarningMessage(
      "Pick a session or artefact in the Standarflow tree.",
    );
    return;
  }
  const convs = (await ctx.client.conversationList()).filter((c) => c.is_live);
  if (convs.length === 0) {
    void vscode.window.showWarningMessage("No live conversation to focus.");
    return;
  }
  const choice = await vscode.window.showQuickPick(
    convs.map((c) => ({
      label: c.client_label ?? c.provider_conversation_id.slice(0, 8),
      description: c.workspace_path ?? undefined,
      conv: c,
    })),
    { placeHolder: `Conversation to focus on ${sel.slug}` },
  );
  if (!choice) return;
  await ctx.client.sessionFocus(sel.groupPath, sel.slug, choice.conv.id);
  void vscode.window.showInformationMessage(
    `Focused "${choice.label}" on ${sel.groupPath}/${sel.slug}.`,
  );
}

/// Focus a conversation on the workspace's current session — one click, no
/// picker. Offered only for a conversation that has no focus yet.
export async function adoptCurrentSession(ctx: CommandCtx): Promise<void> {
  const conv = nodeConversation(ctx.node);
  if (!conv) {
    void vscode.window.showWarningMessage(
      "Pick a conversation in the Standarflow tree.",
    );
    return;
  }
  const info = await ctx.client.workspaceInfo();
  if (!info.current_session_group_path || !info.current_session_slug) {
    void vscode.window.showWarningMessage(
      "No current session to adopt — focus one explicitly first.",
    );
    return;
  }
  await ctx.client.sessionFocus(
    info.current_session_group_path,
    info.current_session_slug,
    conv.conversation.id,
  );
  void vscode.window.showInformationMessage(
    `Focused this conversation on the current session "${info.current_session_slug}".`,
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

export async function killGhostConversations(ctx: CommandCtx): Promise<void> {
  const ghosts = (await ctx.client.conversationList()).filter(isGhost);
  if (ghosts.length === 0) {
    void vscode.window.showInformationMessage(
      "No ghost conversations — nothing to kill.",
    );
    return;
  }
  const choice = await vscode.window.showWarningMessage(
    `Kill ${ghosts.length} ghost agent process(es)? These conversations have been live but silent since SessionStart.`,
    { modal: true },
    "Kill all",
  );
  if (choice !== "Kill all") return;
  let killed = 0;
  for (const g of ghosts) {
    const pid = g.last_conversation_pid;
    if (pid === null) continue;
    try {
      process.kill(pid);
      killed++;
    } catch (e) {
      // ESRCH — already gone, count it; anything else, skip and keep going.
      if ((e as NodeJS.ErrnoException).code === "ESRCH") killed++;
    }
  }
  // Let the OS drop the processes before the post-command refresh runs.
  await new Promise((resolve) => setTimeout(resolve, 400));
  void vscode.window.showInformationMessage(
    `Stopped ${killed} ghost agent process(es).`,
  );
}
