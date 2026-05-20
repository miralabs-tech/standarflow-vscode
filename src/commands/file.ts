import * as path from "node:path";
import * as vscode from "vscode";
import type { CommandCtx } from "./shared";
import { listAllGroupPaths } from "./shared";
import { nodeFileRef, nodeGroupPath, nodeSessionSlug } from "./treeNode";

export async function fileAttach(ctx: CommandCtx): Promise<void> {
  const { client, node } = ctx;
  let groupPath = nodeGroupPath(node);
  let sessionSlug = nodeSessionSlug(node);

  if (!groupPath) {
    const groups = await listAllGroupPaths(client);
    if (groups.length === 0) {
      void vscode.window.showWarningMessage("No group exists yet.");
      return;
    }
    const choice = await vscode.window.showQuickPick(groups, { placeHolder: "Group" });
    if (!choice) return;
    groupPath = choice;
  }

  if (!sessionSlug) {
    const sessions = await client.sessionList(groupPath);
    const tops = sessions.filter((s) => s.parent_session_id === null);
    if (tops.length === 0) {
      void vscode.window.showWarningMessage(
        `No session in ${groupPath}. Save one first.`,
      );
      return;
    }
    const choice = await vscode.window.showQuickPick(
      tops.map((s) => ({
        label: s.slug,
        description: `${s.kind} · ${s.status}`,
        slug: s.slug,
      })),
      { placeHolder: "Session to attach to" },
    );
    if (!choice) return;
    sessionSlug = choice.slug;
  }

  const picked = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    openLabel: "Attach to session",
  });
  if (!picked || picked.length === 0) return;
  const filePath = picked[0]!.fsPath;

  const role = await vscode.window.showInputBox({
    prompt: "Role (memory, note, attachment, source, …)",
    placeHolder: "attachment",
  });
  if (role === undefined) return;

  const description = await vscode.window.showInputBox({
    prompt: "Description (optional)",
  });
  if (description === undefined) return;

  const f = await client.fileAttach({
    groupPath,
    sessionSlug,
    path: filePath,
    role: role.trim() || undefined,
    description: description.trim() || undefined,
  });
  void vscode.window.showInformationMessage(
    `Attached file_ref#${f.id} ${path.basename(f.path)} → ${groupPath}/${sessionSlug}`,
  );
}

export async function memoryImport(ctx: CommandCtx): Promise<void> {
  const { client, node } = ctx;
  let groupPath = nodeGroupPath(node);
  let sessionSlug = nodeSessionSlug(node);

  if (!groupPath) {
    const groups = await listAllGroupPaths(client);
    if (groups.length === 0) {
      void vscode.window.showWarningMessage("No group exists yet.");
      return;
    }
    const choice = await vscode.window.showQuickPick(groups, { placeHolder: "Group" });
    if (!choice) return;
    groupPath = choice;
  }

  if (!sessionSlug) {
    const sessions = await client.sessionList(groupPath);
    const tops = sessions.filter((s) => s.parent_session_id === null);
    if (tops.length === 0) {
      void vscode.window.showWarningMessage(
        `No session in ${groupPath}. Save one first.`,
      );
      return;
    }
    const choice = await vscode.window.showQuickPick(
      tops.map((s) => ({
        label: s.slug,
        description: `${s.kind} · ${s.status}`,
        slug: s.slug,
      })),
      { placeHolder: "Session to import files into" },
    );
    if (!choice) return;
    sessionSlug = choice.slug;
  }

  const picked = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    openLabel: "Import from directory",
  });
  if (!picked || picked.length === 0) return;
  const dirPath = picked[0]!.fsPath;

  const ext = await vscode.window.showInputBox({
    prompt: "File extension to import (default 'md')",
    placeHolder: "md",
  });
  if (ext === undefined) return;

  const role = await vscode.window.showInputBox({
    prompt: "Role for imported files (default 'memory')",
    placeHolder: "memory",
  });
  if (role === undefined) return;

  const imported = await client.memoryImport({
    groupPath,
    sessionSlug,
    dirPath,
    ext: ext.trim() || undefined,
    role: role.trim() || undefined,
  });
  void vscode.window.showInformationMessage(
    `Imported ${imported.length} file(s) into ${groupPath}/${sessionSlug}`,
  );
}

export async function detachFileRef(ctx: CommandCtx): Promise<void> {
  const fileNode = nodeFileRef(ctx.node);
  if (!fileNode) {
    void vscode.window.showWarningMessage(
      "Right-click a file reference in the tree to detach it.",
    );
    return;
  }
  const confirm = await vscode.window.showWarningMessage(
    `Detach ${path.basename(fileNode.file.path)} from session?`,
    { modal: true, detail: "The file on disk is NOT deleted." },
    "Detach",
  );
  if (confirm !== "Detach") return;
  await ctx.client.fileRemove(fileNode.file.id);
  void vscode.window.showInformationMessage(`Detached file_ref#${fileNode.file.id}`);
}

export async function fileClaim(ctx: CommandCtx): Promise<void> {
  const fileNode = nodeFileRef(ctx.node);
  if (!fileNode) {
    void vscode.window.showWarningMessage(
      "Right-click a file reference in the tree to claim it.",
    );
    return;
  }
  const updated = await ctx.client.fileClaim(fileNode.file.id);
  void vscode.window.showInformationMessage(
    `Claimed file_ref#${updated.id} (now created_by=${updated.created_by ?? "?"}).`,
  );
}

export async function fileDeleteWithSource(ctx: CommandCtx): Promise<void> {
  const fileNode = nodeFileRef(ctx.node);
  if (!fileNode) {
    void vscode.window.showWarningMessage(
      "Right-click a file reference in the tree to delete it with its source.",
    );
    return;
  }
  const basename = path.basename(fileNode.file.path);
  const confirm = await vscode.window.showWarningMessage(
    `Delete ${basename} from disk AND detach from session?`,
    {
      modal: true,
      detail: `${fileNode.file.path}\n\nThis removes the file on disk. Other sessions referencing this same path will break.`,
    },
    "Delete from disk",
  );
  if (confirm !== "Delete from disk") return;
  const out = await ctx.client.fileDeleteWithSource(fileNode.file.id);
  if (out.file_was_missing) {
    void vscode.window.showWarningMessage(
      `File ${out.path} was already missing — file_ref detached anyway.`,
    );
  } else {
    void vscode.window.showInformationMessage(
      `Deleted ${out.path} and detached file_ref#${out.file_ref_id}.`,
    );
  }
}
