import * as vscode from "vscode";
import { matcher } from "matchigo";
import { isGhost } from "./conversation";
import { buildFileTree, fileTreeNode } from "./tree/fileTree";
import { renderNode } from "./tree/render";
import type { TreeNode } from "./tree/types";
import type { SessionLite, StandarflowClient } from "./mcpClient";

export type { FileTreeDir, FileTreeFile, FileTreeNode, TreeNode } from "./tree/types";

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

  /// When true, superseded and archived top-level sessions are hidden.
  hideSuperseded = false;

  /// Last-built nodes, kept so a targeted refresh can fire the real node
  /// object (with every field renderNode needs) rather than reconstruct it.
  private conversationsRootNode: TreeNode | undefined;
  private readonly sessionNodes = new Map<number, TreeNode>();

  constructor(private readonly clientGetter: () => StandarflowClient | undefined) {}

  refresh(node?: TreeNode): void {
    this._onDidChange.fire(node);
  }

  /// Refresh only the Conversations subtree.
  refreshConversations(): void {
    if (this.conversationsRootNode) {
      this._onDidChange.fire(this.conversationsRootNode);
    }
  }

  /// Refresh only one session's subtree (artefacts, files, touched files), if
  /// that session node is currently built. A no-op otherwise.
  refreshSession(id: number): void {
    const node = this.sessionNodes.get(id);
    if (node) this._onDidChange.fire(node);
  }

  getTreeItem(node: TreeNode): vscode.TreeItem {
    return renderNode(node);
  }

  /// Parent of a node — required by `TreeView.reveal`. Only the session →
  /// group → group chain is implemented (that is what revealing a session
  /// needs); other node kinds return undefined.
  async getParent(node: TreeNode): Promise<TreeNode | undefined> {
    const client = this.clientGetter();
    if (!client) return undefined;
    if (node.kind === "session") {
      return this.groupNodeFor(client, node.groupPath);
    }
    if (node.kind === "group") {
      const idx = node.path.lastIndexOf("/");
      return idx < 0
        ? undefined
        : this.groupNodeFor(client, node.path.slice(0, idx));
    }
    return undefined;
  }

  /// Rebuild a `group` node for a slug path — `getParent` needs real GroupRow
  /// objects, and the tree's nodes are created fresh on each fetch.
  private async groupNodeFor(
    client: StandarflowClient,
    path: string,
  ): Promise<TreeNode | undefined> {
    const idx = path.lastIndexOf("/");
    const parentPath = idx < 0 ? undefined : path.slice(0, idx);
    const slug = idx < 0 ? path : path.slice(idx + 1);
    const siblings = await client.groupList(parentPath);
    const group = siblings.find((g) => g.slug === slug);
    return group ? { kind: "group", path, group } : undefined;
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
      const [groups, convs] = await Promise.all([
        client.groupList(),
        client.conversationList(),
      ]);
      const liveCount = convs.filter((c) => c.is_live).length;
      const ghostCount = convs.filter(isGhost).length;
      const groupNodes: TreeNode[] = groups.map((g) => ({
        kind: "group",
        path: g.slug,
        group: g,
      }));
      this.conversationsRootNode = {
        kind: "conversationsRoot",
        liveCount,
        ghostCount,
      };
      return [this.conversationsRootNode, ...groupNodes];
    }
    const childrenOf = matcher<TreeNode, Promise<TreeNode[]>>()
      .with({ kind: "conversationsRoot" }, async () => {
        const [convs, focuses] = await Promise.all([
          client.conversationList(),
          client.focusList(),
        ]);
        const focusByConv = new Map(focuses.map((f) => [f.conversation_id, f]));
        // Live conversations are surfaced directly; ended ones (their agent
        // process has exited) are folded under a collapsed "Ended" node.
        const liveNodes: TreeNode[] = convs
          .filter((c) => c.is_live)
          .map((c) => ({
            kind: "conversation",
            conversation: c,
            focus: focusByConv.get(c.id) ?? null,
            isGhost: isGhost(c),
          }));
        const endedCount = convs.filter((c) => !c.is_live).length;
        return endedCount > 0
          ? [...liveNodes, { kind: "endedConversationsRoot", count: endedCount }]
          : liveNodes;
      })
      .with({ kind: "endedConversationsRoot" }, async () => {
        const [convs, focuses] = await Promise.all([
          client.conversationList(),
          client.focusList(),
        ]);
        const focusByConv = new Map(focuses.map((f) => [f.conversation_id, f]));
        return convs
          .filter((c) => !c.is_live)
          .map((c) => ({
            kind: "conversation",
            conversation: c,
            focus: focusByConv.get(c.id) ?? null,
            isGhost: false,
          }));
      })
      .with({ kind: "group" }, async (n) => {
        const [subgroups, sessions, info] = await Promise.all([
          client.groupList(n.path),
          client.sessionList(n.path),
          client.workspaceInfo(),
        ]);
        const subgroupNodes: TreeNode[] = subgroups.map((g) => ({
          kind: "group",
          path: `${n.path}/${g.slug}`,
          group: g,
        }));
        const sessionNodes: TreeNode[] = sessions
          .filter((s) => s.parent_session_id === null)
          .filter(
            (s) =>
              !this.hideSuperseded ||
              (s.status !== "superseded" && s.status !== "archived"),
          )
          .map((s) => {
            const sessionNode: TreeNode = {
              kind: "session",
              groupPath: n.path,
              session: s,
              isCurrent: s.id === info.current_session_id,
            };
            this.sessionNodes.set(s.id, sessionNode);
            return sessionNode;
          });
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
