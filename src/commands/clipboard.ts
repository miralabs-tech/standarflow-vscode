import * as vscode from "vscode";
import type { CommandCtx } from "./shared";
import { pickGroupPath, pickSession } from "./shared";
import { nodeFileRef, nodeGroupPath, nodeSelection } from "./treeNode";

async function copyToClipboard(text: string, label: string): Promise<void> {
  await vscode.env.clipboard.writeText(text);
  void vscode.window.setStatusBarMessage(`Copied ${label}: ${text}`, 2500);
}

export async function copySessionReference(ctx: CommandCtx): Promise<void> {
  const sel = nodeSelection(ctx.node) ?? (await pickSession(ctx.client, "Session to copy"));
  if (!sel) return;
  await copyToClipboard(`${sel.groupPath}/${sel.slug}`, "session reference");
}

export async function copySessionSlug(ctx: CommandCtx): Promise<void> {
  const sel =
    nodeSelection(ctx.node) ?? (await pickSession(ctx.client, "Session whose slug to copy"));
  if (!sel) return;
  await copyToClipboard(sel.slug, "slug");
}

export async function copyGroupPath(ctx: CommandCtx): Promise<void> {
  const groupPath =
    nodeGroupPath(ctx.node) ?? (await pickGroupPath(ctx.client, "Group path to copy"));
  if (!groupPath) return;
  await copyToClipboard(groupPath, "group path");
}

export async function copyFileRefPath(ctx: CommandCtx): Promise<void> {
  const fileNode = nodeFileRef(ctx.node);
  if (!fileNode) {
    void vscode.window.showWarningMessage(
      "Right-click a file reference in the tree to copy its path.",
    );
    return;
  }
  await copyToClipboard(fileNode.file.path, "file path");
}
