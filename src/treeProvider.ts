import * as vscode from "vscode";
import { matcher } from "matchigo";
import type {
  FileChange,
  FileRefRow,
  GroupRow,
  SessionLite,
  StandarflowClient,
} from "./mcpClient";

export type TreeNode =
  | { kind: "group"; path: string; group: GroupRow }
  | { kind: "session"; groupPath: string; session: SessionLite }
  | { kind: "artefact"; groupPath: string; parent: SessionLite; artefact: SessionLite }
  | { kind: "fileRef"; groupPath: string; sessionSlug: string; file: FileRefRow }
  | { kind: "fileChangeGroup"; groupPath: string; session: SessionLite; changes: FileChange[] }
  | { kind: "fileChange"; groupPath: string; change: FileChange };

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

const renderNode = matcher<TreeNode, vscode.TreeItem>()
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
      vscode.TreeItemCollapsibleState.None,
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
    const item = new vscode.TreeItem(
      "Touched files",
      vscode.TreeItemCollapsibleState.Collapsed,
    );
    item.id = `fileChangeGroup:${n.session.id}`;
    item.iconPath = new vscode.ThemeIcon("history");
    item.description = `${n.changes.length}`;
    item.tooltip = `${n.changes.length} file change(s) logged for ${n.session.slug}`;
    item.contextValue = "standarflow.fileChangeGroup";
    return item;
  })
  .with({ kind: "fileChange" }, (n) => {
    const uri = vscode.Uri.file(n.change.file_path);
    const item = new vscode.TreeItem(
      basename(n.change.file_path),
      vscode.TreeItemCollapsibleState.None,
    );
    item.id = `fileChange:${n.change.id}`;
    item.iconPath = fileChangeIcon(n.change.op);
    item.description = n.change.tool_name
      ? `${n.change.op} · ${n.change.tool_name}`
      : n.change.op;
    item.tooltip =
      `${n.change.op} · ${n.change.file_path}` +
      (n.change.tool_name ? `\nvia ${n.change.tool_name}` : "");
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
      return groups.map((g) => ({ kind: "group", path: g.slug, group: g }));
    }
    if (node.kind === "group") {
      const [subgroups, sessions] = await Promise.all([
        client.groupList(node.path),
        client.sessionList(node.path),
      ]);
      const subgroupNodes: TreeNode[] = subgroups.map((g) => ({
        kind: "group",
        path: `${node.path}/${g.slug}`,
        group: g,
      }));
      const sessionNodes: TreeNode[] = sessions
        .filter((s) => s.parent_session_id === null)
        .map((s) => ({ kind: "session", groupPath: node.path, session: s }));
      return [...subgroupNodes, ...sessionNodes];
    }
    if (node.kind === "session") {
      const [children, files, changes] = await Promise.all([
        client.sessionChildren(node.session.id),
        client.fileList(node.groupPath, node.session.slug),
        client.sessionFileChanges(node.session.id, 200),
      ]);
      const artefactNodes: TreeNode[] = children.map((c) => ({
        kind: "artefact",
        groupPath: node.groupPath,
        parent: node.session,
        artefact: c,
      }));
      const fileNodes: TreeNode[] = files.map((f) => ({
        kind: "fileRef",
        groupPath: node.groupPath,
        sessionSlug: node.session.slug,
        file: f,
      }));
      const changeGroup: TreeNode[] =
        changes.length > 0
          ? [
              {
                kind: "fileChangeGroup",
                groupPath: node.groupPath,
                session: node.session,
                changes,
              },
            ]
          : [];
      return [...artefactNodes, ...fileNodes, ...changeGroup];
    }
    if (node.kind === "fileChangeGroup") {
      return node.changes.map((c) => ({
        kind: "fileChange",
        groupPath: node.groupPath,
        change: c,
      }));
    }
    return [];
  }
}
