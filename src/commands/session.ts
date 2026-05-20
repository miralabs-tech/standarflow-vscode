import * as vscode from "vscode";
import type { CommandCtx } from "./shared";
import { listAllGroupPaths, pickSession, pickGroupPath, validateSlug } from "./shared";
import { nodeGroupPath, nodeKind, nodeSelection } from "./treeNode";

export async function sessionSave(ctx: CommandCtx): Promise<void> {
  const { client, node } = ctx;
  let groupPath = nodeGroupPath(node);
  if (!groupPath) {
    const groups = await listAllGroupPaths(client);
    if (groups.length === 0) {
      void vscode.window.showWarningMessage(
        'No group exists yet. Run "Standarflow: Create Group" first.',
      );
      return;
    }
    const choice = await vscode.window.showQuickPick(groups, {
      placeHolder: "Group to save into",
    });
    if (!choice) return;
    groupPath = choice;
  }

  const slug = await vscode.window.showInputBox({
    prompt: "Session slug",
    placeHolder: "session-002",
    validateInput: validateSlug,
  });
  if (slug === undefined) return;

  const kind = await vscode.window.showInputBox({
    prompt: "Kind (default 'session'; try 'adr', 'note', 'memory', 'design', 'debug', 'spec', …)",
    placeHolder: "session",
  });
  if (kind === undefined) return;

  const title = await vscode.window.showInputBox({
    prompt: "Title (optional, human-readable)",
  });
  if (title === undefined) return;

  const editor = vscode.window.activeTextEditor;
  const editorContent = editor?.document.getText() ?? "";
  let bodyMd: string | undefined;

  if (editor && editor.document.languageId === "markdown" && editorContent.length > 0) {
    const useEditor = await vscode.window.showQuickPick(
      [
        { label: "$(file) Use active markdown editor", id: "editor" },
        { label: "$(edit) Type body inline", id: "inline" },
      ],
      { placeHolder: "Where does the body come from?" },
    );
    if (!useEditor) return;
    if (useEditor.id === "editor") {
      bodyMd = editorContent;
    }
  }
  if (bodyMd === undefined) {
    bodyMd = await vscode.window.showInputBox({
      prompt: "Body (markdown)",
      placeHolder: "What was done · what's planned next",
    });
    if (bodyMd === undefined) return;
  }

  let continuesSlug: string | undefined;
  const prev = nodeSelection(node);
  if (prev) {
    const yes = await vscode.window.showQuickPick(
      [
        { label: "$(arrow-right) No, standalone session", id: "no" },
        { label: `$(link) Yes, continues '${prev.slug}' (supersedes it)`, id: "yes" },
      ],
      { placeHolder: "Chain after the selected session?" },
    );
    if (!yes) return;
    if (yes.id === "yes") continuesSlug = prev.slug;
  }

  const s = await client.sessionSave({
    groupPath,
    slug: slug.trim(),
    bodyMd,
    kind: kind.trim() || undefined,
    title: title.trim() || undefined,
    continuesSlug,
  });
  void vscode.window.showInformationMessage(
    `Saved session #${s.id} ${s.slug} into ${groupPath}`,
  );
}

export async function sessionRename(ctx: CommandCtx): Promise<void> {
  const { client, node } = ctx;
  const sel = nodeSelection(node) ?? (await pickSession(client, "Session to rename"));
  if (!sel) return;
  const newSlug = await vscode.window.showInputBox({
    prompt: `Rename ${sel.slug} to`,
    value: sel.slug,
    validateInput: validateSlug,
  });
  if (newSlug === undefined) return;
  const trimmed = newSlug.trim();
  if (trimmed === sel.slug) return;
  await client.sessionUpdate(sel.groupPath, sel.slug, { newSlug: trimmed });
  void vscode.window.showInformationMessage(`Renamed ${sel.slug} → ${trimmed}`);
}

export async function sessionMove(ctx: CommandCtx): Promise<void> {
  const { client, node } = ctx;
  const sel = nodeSelection(node) ?? (await pickSession(client, "Session to move"));
  if (!sel) return;
  const targetGroup = await pickGroupPath(client, "Move to group", sel.groupPath);
  if (!targetGroup) return;
  await client.sessionUpdate(sel.groupPath, sel.slug, { newGroupPath: targetGroup });
  void vscode.window.showInformationMessage(`Moved ${sel.slug} → ${targetGroup}`);
}

export async function sessionReparent(ctx: CommandCtx): Promise<void> {
  const { client, node } = ctx;
  const sel = nodeSelection(node) ?? (await pickSession(client, "Session to reparent"));
  if (!sel) return;
  const candidates = (await client.sessionList(sel.groupPath)).filter(
    (s) => s.slug !== sel.slug,
  );
  const picks: { label: string; slug: string | null }[] = [
    { label: "$(remove) Make top-level (no parent)", slug: null },
    ...candidates.map((s) => ({
      label: `$(symbol-class) ${s.slug}`,
      slug: s.slug,
    })),
  ];
  const choice = await vscode.window.showQuickPick(picks, {
    placeHolder: "New parent session",
  });
  if (!choice) return;
  if (choice.slug === null) {
    await client.sessionUpdate(sel.groupPath, sel.slug, { clearParent: true });
    void vscode.window.showInformationMessage(`${sel.slug} → top-level`);
  } else {
    await client.sessionUpdate(sel.groupPath, sel.slug, { parentSlug: choice.slug });
    void vscode.window.showInformationMessage(
      `${sel.slug} → child of ${choice.slug}`,
    );
  }
}

export async function sessionSetKind(ctx: CommandCtx): Promise<void> {
  const { client, node } = ctx;
  const sel = nodeSelection(node) ?? (await pickSession(client, "Session to retype"));
  if (!sel) return;
  const current = nodeKind(node) ?? "session";
  const kind = await vscode.window.showInputBox({
    prompt: `Kind for ${sel.slug}`,
    value: current,
    placeHolder: "session, adr, note, memory, design, debug, spec, …",
  });
  if (kind === undefined) return;
  const trimmed = kind.trim();
  if (!trimmed || trimmed === current) return;
  await client.sessionUpdate(sel.groupPath, sel.slug, { kind: trimmed });
  void vscode.window.showInformationMessage(`${sel.slug} kind → ${trimmed}`);
}

export async function sessionSetStatus(ctx: CommandCtx): Promise<void> {
  const { client, node } = ctx;
  const sel = nodeSelection(node) ?? (await pickSession(client, "Session to update"));
  if (!sel) return;
  const choices = [
    { label: "$(circle-filled) active", value: "active" as const },
    { label: "$(pass-filled) completed", value: "completed" as const },
    { label: "$(circle-outline) superseded", value: "superseded" as const },
    { label: "$(archive) archived", value: "archived" as const },
    { label: "$(debug-pause) paused", value: "paused" as const },
  ];
  const choice = await vscode.window.showQuickPick(choices, {
    placeHolder: "New status",
  });
  if (!choice) return;
  await client.sessionUpdate(sel.groupPath, sel.slug, { status: choice.value });
  void vscode.window.showInformationMessage(`${sel.slug} status → ${choice.value}`);
}

export async function sessionDelete(ctx: CommandCtx): Promise<void> {
  const { client, node } = ctx;
  const sel = nodeSelection(node) ?? (await pickSession(client, "Session to delete"));
  if (!sel) return;
  const confirm = await vscode.window.showWarningMessage(
    `Delete session ${sel.groupPath}/${sel.slug}?`,
    {
      modal: true,
      detail:
        "All artefacts, file_refs and links will be lost. Files on disk are NOT removed.",
    },
    "Delete",
  );
  if (confirm !== "Delete") return;
  await client.sessionDelete(sel.groupPath, sel.slug);
  void vscode.window.showInformationMessage(`Deleted ${sel.groupPath}/${sel.slug}`);
}

export async function sessionEditBody(ctx: CommandCtx): Promise<void> {
  const { client, node } = ctx;
  const sel =
    nodeSelection(node) ?? (await pickSession(client, "Session whose body you want to edit"));
  if (!sel) return;
  const current = await client.sessionGet(sel.groupPath, { slug: sel.slug });
  const doc = await vscode.workspace.openTextDocument({
    content: current.body_md,
    language: "markdown",
  });
  const editor = await vscode.window.showTextDocument(doc, { preview: false });
  const action = await vscode.window.showInformationMessage(
    `Editing body of ${sel.slug}. Save back when ready?`,
    { modal: false },
    "Save back",
    "Cancel",
  );
  if (action !== "Save back") return;
  const newBody = editor.document.getText();
  await client.sessionUpdate(sel.groupPath, sel.slug, { bodyMd: newBody });
  void vscode.window.showInformationMessage(`Updated body of ${sel.slug}.`);
}
