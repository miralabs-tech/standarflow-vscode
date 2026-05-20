import * as vscode from "vscode";
import { matcher } from "matchigo";
import type {
  Conversation,
  FileChange,
  FileRefRow,
  FocusEntry,
  GroupRow,
  SessionLite,
  StandarflowClient,
} from "./mcpClient";

export type TreeNode =
  | { kind: "conversationsRoot" }
  | { kind: "conversation"; conversation: Conversation; focus: FocusEntry | null }
  | { kind: "group"; path: string; group: GroupRow }
  | { kind: "session"; groupPath: string; session: SessionLite }
  | { kind: "artefact"; groupPath: string; parent: SessionLite; artefact: SessionLite }
  | { kind: "fileRef"; groupPath: string; sessionSlug: string; file: FileRefRow }
  | { kind: "fileChangeGroup"; groupPath: string; session: SessionLite; changes: FileChange[] }
  | { kind: "fileChangeDir"; sessionId: number; dir: FileTreeDir }
  | { kind: "fileChangeFile"; sessionId: number; file: FileTreeFile };

/// A directory in the coalesced "Touched files" path tree.
export interface FileTreeDir {
  kind: "dir";
  name: string;
  relPath: string;
  children: FileTreeNode[];
}

/// A leaf in the path tree — one entry per distinct file, carrying every
/// change row logged against it.
export interface FileTreeFile {
  kind: "file";
  name: string;
  relPath: string;
  path: string;
  changes: FileChange[];
}

export type FileTreeNode = FileTreeDir | FileTreeFile;

const sessionIcon = matcher<SessionLite, vscode.ThemeIcon>()
  .with({ status: "active" }, () =>
    new vscode.ThemeIcon("circle-filled", new vscode.ThemeColor("charts.green")),
  )
  .with({ status: "completed" }, () =>
    new vscode.ThemeIcon("pass-filled", new vscode.ThemeColor("charts.green")),
  )
  .with({ status: "superseded" }, () =>
    new vscode.ThemeIcon("circle-outline", new vscode.ThemeColor("charts.gray")),
  )
  .with({ status: "archived" }, () =>
    new vscode.ThemeIcon("archive", new vscode.ThemeColor("charts.gray")),
  )
  .with({ status: "paused" }, () =>
    new vscode.ThemeIcon("debug-pause", new vscode.ThemeColor("charts.yellow")),
  )
  .exhaustive();

function artefactIconName(kind: string): string {
  switch (kind) {
    case "adr":
      return "tag";
    case "note":
      return "note";
    case "memory":
    case "memory-index":
      return "database";
    case "debug":
      return "bug";
    case "design":
      return "symbol-color";
    case "spec":
      return "checklist";
    default:
      return "circle-small";
  }
}

function basename(p: string): string {
  const idx = Math.max(p.lastIndexOf("/"), p.lastIndexOf("\\"));
  return idx >= 0 ? p.slice(idx + 1) : p;
}

function fileChangeIcon(op: string): vscode.ThemeIcon {
  switch (op) {
    case "create":
      return new vscode.ThemeIcon("diff-added", new vscode.ThemeColor("charts.green"));
    case "delete":
      return new vscode.ThemeIcon("diff-removed", new vscode.ThemeColor("charts.red"));
    default:
      return new vscode.ThemeIcon("diff-modified", new vscode.ThemeColor("charts.yellow"));
  }
}

function relSegments(filePath: string, root: string | undefined): string[] {
  const norm = (s: string) => s.replace(/\\/g, "/").replace(/\/+$/, "");
  const fp = norm(filePath);
  if (root) {
    const r = norm(root);
    if (fp.toLowerCase().startsWith(`${r.toLowerCase()}/`)) {
      return fp
        .slice(r.length + 1)
        .split("/")
        .filter(Boolean);
    }
  }
  return [fp];
}

function sortFileTree(nodes: FileTreeNode[]): void {
  nodes.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  for (const n of nodes) {
    if (n.kind === "dir") sortFileTree(n.children);
  }
}

/// Coalesce flat change rows into a path tree: one leaf per distinct file,
/// carrying all its change rows. Paths are shown relative to the workspace.
function buildFileTree(
  changes: FileChange[],
  root: string | undefined,
): FileTreeNode[] {
  const byPath = new Map<string, FileChange[]>();
  for (const c of changes) {
    const arr = byPath.get(c.file_path);
    if (arr) arr.push(c);
    else byPath.set(c.file_path, [c]);
  }
  const roots: FileTreeNode[] = [];
  for (const [path, rows] of byPath) {
    const segs = relSegments(path, root);
    let children = roots;
    let prefix = "";
    for (let i = 0; i < segs.length - 1; i++) {
      const name = segs[i];
      prefix = prefix ? `${prefix}/${name}` : name;
      let dir = children.find(
        (n): n is FileTreeDir => n.kind === "dir" && n.name === name,
      );
      if (!dir) {
        dir = { kind: "dir", name, relPath: prefix, children: [] };
        children.push(dir);
      }
      children = dir.children;
    }
    const name = segs[segs.length - 1];
    children.push({
      kind: "file",
      name,
      relPath: prefix ? `${prefix}/${name}` : name,
      path,
      changes: rows,
    });
  }
  sortFileTree(roots);
  return roots;
}

function fileTreeNode(sessionId: number, n: FileTreeNode): TreeNode {
  return n.kind === "dir"
    ? { kind: "fileChangeDir", sessionId, dir: n }
    : { kind: "fileChangeFile", sessionId, file: n };
}

function relTime(unixSec: number): string {
  const diff = Math.floor(Date.now() / 1000 - unixSec);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function conversationLabel(c: Conversation): string {
  return c.client_label ?? c.provider_conversation_id.slice(0, 8);
}

const renderNode = matcher<TreeNode, vscode.TreeItem>()
  .with({ kind: "conversationsRoot" }, () => {
    const item = new vscode.TreeItem(
      "Conversations",
      vscode.TreeItemCollapsibleState.Collapsed,
    );
    item.id = "conversationsRoot";
    item.iconPath = new vscode.ThemeIcon("comment-discussion");
    item.contextValue = "standarflow.conversationsRoot";
    item.tooltip = "AI chats known to this workspace and the session each one focuses.";
    return item;
  })
  .with({ kind: "conversation" }, (n) => {
    const c = n.conversation;
    const ended = c.ended_at !== null;
    const item = new vscode.TreeItem(
      conversationLabel(c),
      vscode.TreeItemCollapsibleState.None,
    );
    item.id = `conversation:${c.id}`;
    item.iconPath = new vscode.ThemeIcon(
      "comment-discussion",
      n.focus
        ? new vscode.ThemeColor("charts.green")
        : new vscode.ThemeColor(ended ? "charts.gray" : "foreground"),
    );
    item.description = n.focus
      ? `→ ${n.focus.group_path}/${n.focus.session_slug} · ${relTime(c.last_seen_at)}`
      : `no focus · ${relTime(c.last_seen_at)}`;
    item.tooltip =
      `Conversation #${c.id} · ${c.provider}\n` +
      `${c.provider_conversation_id}\n` +
      (c.workspace_path ? `Workspace: ${c.workspace_path}\n` : "") +
      (n.focus
        ? `Focused: ${n.focus.group_path}/${n.focus.session_slug} (${n.focus.session_kind} · ${n.focus.session_status})`
        : "No focused session") +
      (ended ? "\n(ended)" : "");
    item.contextValue = n.focus
      ? "standarflow.conversation.focused"
      : "standarflow.conversation.unfocused";
    return item;
  })
  .with({ kind: "group" }, (n) => {
    const label = n.group.title ?? n.group.slug;
    const item = new vscode.TreeItem(
      label,
      vscode.TreeItemCollapsibleState.Collapsed,
    );
    item.id = `group:${n.group.id}`;
    item.iconPath = new vscode.ThemeIcon("folder");
    item.description = n.group.created_by ? `${n.path} · ${n.group.created_by}` : n.path;
    item.tooltip =
      `Group ${n.path}` +
      (n.group.description ? `\n${n.group.description}` : "") +
      (n.group.created_by ? `\nCreated by ${n.group.created_by}` : "");
    item.contextValue = "standarflow.group";
    return item;
  })
  .with({ kind: "session" }, (n) => {
    const item = new vscode.TreeItem(
      n.session.slug,
      vscode.TreeItemCollapsibleState.Collapsed,
    );
    item.id = `session:${n.session.id}`;
    item.iconPath = sessionIcon(n.session);
    const byTag = n.session.created_by ? ` · ${n.session.created_by}` : "";
    item.description = `${n.session.kind} · ${n.session.status}${byTag}`;
    item.tooltip = `Session #${n.session.id} (${n.session.kind}, ${n.session.status})${n.session.created_by ? `\nCreated by ${n.session.created_by}` : ""}`;
    item.contextValue = `standarflow.session.${n.session.status}`;
    item.command = {
      command: "standarflow.openSession",
      title: "Open session",
      arguments: [n.groupPath, n.session.slug],
    };
    return item;
  })
  .with({ kind: "artefact" }, (n) => {
    const item = new vscode.TreeItem(
      n.artefact.slug,
      vscode.TreeItemCollapsibleState.Collapsed,
    );
    item.id = `artefact:${n.artefact.id}`;
    item.iconPath = new vscode.ThemeIcon(artefactIconName(n.artefact.kind));
    const byTag = n.artefact.created_by ? ` · ${n.artefact.created_by}` : "";
    item.description = `${n.artefact.kind}${byTag}`;
    item.tooltip = `Artefact #${n.artefact.id} (${n.artefact.kind})${n.artefact.created_by ? `\nCreated by ${n.artefact.created_by}` : ""}`;
    item.contextValue = "standarflow.artefact";
    item.command = {
      command: "standarflow.openSession",
      title: "Open artefact",
      arguments: [n.groupPath, n.artefact.slug],
    };
    return item;
  })
  .with({ kind: "fileRef" }, (n) => {
    const uri = vscode.Uri.file(n.file.path);
    const item = new vscode.TreeItem(basename(n.file.path), vscode.TreeItemCollapsibleState.None);
    item.id = `fileRef:${n.file.id}`;
    item.iconPath = new vscode.ThemeIcon("file");
    const byTag = n.file.created_by ? ` · ${n.file.created_by}` : "";
    item.description = `${n.file.role}${byTag}`;
    item.tooltip =
      `${n.file.path}` +
      (n.file.description ? `\n${n.file.description}` : "") +
      (n.file.created_by ? `\nAttached by ${n.file.created_by}` : "");
    item.contextValue = "standarflow.fileRef";
    item.resourceUri = uri;
    item.command = {
      command: "vscode.open",
      title: "Open file",
      arguments: [uri],
    };
    return item;
  })
  .with({ kind: "fileChangeGroup" }, (n) => {
    const distinct = new Set(n.changes.map((c) => c.file_path)).size;
    const item = new vscode.TreeItem(
      "Touched files",
      vscode.TreeItemCollapsibleState.Collapsed,
    );
    item.id = `fileChangeGroup:${n.session.id}`;
    item.iconPath = new vscode.ThemeIcon("history");
    item.description = `${distinct}`;
    item.tooltip = `${distinct} file(s) touched · ${n.changes.length} change(s) logged for ${n.session.slug}`;
    item.contextValue = "standarflow.fileChangeGroup";
    return item;
  })
  .with({ kind: "fileChangeDir" }, (n) => {
    const item = new vscode.TreeItem(
      n.dir.name,
      vscode.TreeItemCollapsibleState.Expanded,
    );
    item.id = `fileChangeDir:${n.sessionId}:${n.dir.relPath}`;
    item.iconPath = vscode.ThemeIcon.Folder;
    item.contextValue = "standarflow.fileChangeDir";
    return item;
  })
  .with({ kind: "fileChangeFile" }, (n) => {
    const f = n.file;
    const uri = vscode.Uri.file(f.path);
    const sorted = [...f.changes].sort((a, b) => a.ts - b.ts);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const count = sorted.length;
    const tools = [
      ...new Set(sorted.map((c) => c.tool_name).filter((t): t is string => !!t)),
    ];
    const item = new vscode.TreeItem(f.name, vscode.TreeItemCollapsibleState.None);
    item.id = `fileChangeFile:${n.sessionId}:${f.relPath}`;
    item.iconPath = fileChangeIcon(first.op);
    item.description = count > 1 ? `${first.op} ×${count}` : first.op;
    item.tooltip =
      `${f.path}\n` +
      `${first.op}${tools.length ? ` · ${tools.join(", ")}` : ""}\n` +
      `${count} touch(es) · first ${new Date(first.ts * 1000).toLocaleString()}` +
      (count > 1 ? `\nlast ${new Date(last.ts * 1000).toLocaleString()}` : "");
    item.contextValue = "standarflow.fileChange";
    item.resourceUri = uri;
    item.command = {
      command: "vscode.open",
      title: "Open file",
      arguments: [uri],
    };
    return item;
  })
  .exhaustive();

/// Children of a session-like node — a session, or an artefact (which is
/// itself a session row): nested artefacts, file references, and the
/// Touched-files group. Shared by the `session` and `artefact` branches.
async function sessionLikeChildren(
  client: StandarflowClient,
  groupPath: string,
  session: SessionLite,
): Promise<TreeNode[]> {
  const [children, files, changes] = await Promise.all([
    client.sessionChildren(session.id),
    client.fileList(groupPath, session.slug),
    client.sessionFileChanges(session.id, 200),
  ]);
  const artefactNodes: TreeNode[] = children.map((c) => ({
    kind: "artefact",
    groupPath,
    parent: session,
    artefact: c,
  }));
  const fileNodes: TreeNode[] = files.map((f) => ({
    kind: "fileRef",
    groupPath,
    sessionSlug: session.slug,
    file: f,
  }));
  const changeGroup: TreeNode[] =
    changes.length > 0
      ? [{ kind: "fileChangeGroup", groupPath, session, changes }]
      : [];
  return [...artefactNodes, ...fileNodes, ...changeGroup];
}

export class StandarflowTreeProvider implements vscode.TreeDataProvider<TreeNode> {
  private readonly _onDidChange = new vscode.EventEmitter<TreeNode | undefined>();
  readonly onDidChangeTreeData = this._onDidChange.event;

  constructor(private readonly clientGetter: () => StandarflowClient | undefined) {}

  refresh(node?: TreeNode): void {
    this._onDidChange.fire(node);
  }

  getTreeItem(node: TreeNode): vscode.TreeItem {
    return renderNode(node);
  }

  async getChildren(node?: TreeNode): Promise<TreeNode[]> {
    try {
      return await this.fetchChildren(node);
    } catch (e) {
      const msg = (e as Error).message;
      void vscode.window.showErrorMessage(
        `standarflow tree (${node?.kind ?? "root"}): ${msg}`,
      );
      return [];
    }
  }

  private async fetchChildren(node?: TreeNode): Promise<TreeNode[]> {
    const client = this.clientGetter();
    if (!client) {
      return [];
    }
    if (!node) {
      const groups = await client.groupList();
      const groupNodes: TreeNode[] = groups.map((g) => ({
        kind: "group",
        path: g.slug,
        group: g,
      }));
      return [{ kind: "conversationsRoot" }, ...groupNodes];
    }
    const childrenOf = matcher<TreeNode, Promise<TreeNode[]>>()
      .with({ kind: "conversationsRoot" }, async () => {
        const [convs, focuses] = await Promise.all([
          client.conversationList(),
          client.focusList(),
        ]);
        const focusByConv = new Map(focuses.map((f) => [f.conversation_id, f]));
        return convs.map((c) => ({
          kind: "conversation",
          conversation: c,
          focus: focusByConv.get(c.id) ?? null,
        }));
      })
      .with({ kind: "group" }, async (n) => {
        const [subgroups, sessions] = await Promise.all([
          client.groupList(n.path),
          client.sessionList(n.path),
        ]);
        const subgroupNodes: TreeNode[] = subgroups.map((g) => ({
          kind: "group",
          path: `${n.path}/${g.slug}`,
          group: g,
        }));
        const sessionNodes: TreeNode[] = sessions
          .filter((s) => s.parent_session_id === null)
          .map((s) => ({ kind: "session", groupPath: n.path, session: s }));
        return [...subgroupNodes, ...sessionNodes];
      })
      .with({ kind: "session" }, (n) =>
        sessionLikeChildren(client, n.groupPath, n.session),
      )
      .with({ kind: "fileChangeGroup" }, (n) => {
        const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        return Promise.resolve(
          buildFileTree(n.changes, root).map((c) => fileTreeNode(n.session.id, c)),
        );
      })
      .with({ kind: "fileChangeDir" }, (n) =>
        Promise.resolve(n.dir.children.map((c) => fileTreeNode(n.sessionId, c))),
      )
      .with({ kind: "conversation" }, () => Promise.resolve<TreeNode[]>([]))
      .with({ kind: "artefact" }, (n) =>
        sessionLikeChildren(client, n.groupPath, n.artefact),
      )
      .with({ kind: "fileRef" }, () => Promise.resolve<TreeNode[]>([]))
      .with({ kind: "fileChangeFile" }, () => Promise.resolve<TreeNode[]>([]))
      .exhaustive();

    return childrenOf(node);
  }
}
