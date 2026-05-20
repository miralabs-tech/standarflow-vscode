import * as vscode from "vscode";
import type { CommandCtx } from "./shared";
import { listAllGroupPaths, pickGroupPath, validateSlug } from "./shared";

export async function groupCreate(ctx: CommandCtx): Promise<void> {
  const { client, node } = ctx;
  const defaultParent = node?.kind === "group" ? node.path : undefined;

  const slug = await vscode.window.showInputBox({
    prompt: "Group slug",
    placeHolder: "backend",
    validateInput: validateSlug,
  });
  if (slug === undefined) return;
  const title = await vscode.window.showInputBox({
    prompt: "Title (optional, human-readable)",
    placeHolder: slug,
  });
  if (title === undefined) return;
  const description = await vscode.window.showInputBox({
    prompt: "Description (optional)",
  });
  if (description === undefined) return;

  let parentPath = defaultParent;
  if (parentPath === undefined) {
    const groups = await listAllGroupPaths(client);
    const picks: { label: string; path: string | undefined }[] = [
      { label: "$(root-folder) (root)", path: undefined },
      ...groups.map((p) => ({ label: `$(folder) ${p}`, path: p })),
    ];
    const choice = await vscode.window.showQuickPick(picks, {
      placeHolder: "Parent group (or root)",
    });
    if (!choice) return;
    parentPath = choice.path;
  }

  const g = await client.groupCreate({
    slug: slug.trim(),
    title: title.trim() || undefined,
    description: description.trim() || undefined,
    parentPath,
  });
  void vscode.window.showInformationMessage(
    `Created group #${g.id} ${parentPath ? `${parentPath}/` : ""}${g.slug}`,
  );
}

export async function groupDelete(ctx: CommandCtx): Promise<void> {
  const { client, node } = ctx;
  const groupPath =
    node?.kind === "group" ? node.path : await pickGroupPath(client, "Group to delete");
  if (!groupPath) return;

  const sessions = await client.sessionList(groupPath);
  const confirm = await vscode.window.showWarningMessage(
    `Delete group ${groupPath}?`,
    {
      modal: true,
      detail: `${sessions.length} session(s) and all their artefacts / file_refs / links will be permanently lost. Files on disk are NOT removed.`,
    },
    "Delete",
  );
  if (confirm !== "Delete") return;

  await client.groupDelete(groupPath);
  void vscode.window.showInformationMessage(`Deleted group ${groupPath}.`);
}
