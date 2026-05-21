import * as vscode from "vscode";
import type { StandarflowClient } from "../mcpClient";
import type { TreeNode } from "../treeProvider";
import { copyFileRefPath, copyGroupPath, copySessionReference, copySessionSlug } from "./clipboard";
import { detachFileRef, fileAttach, fileClaim, fileDeleteWithSource, memoryImport } from "./file";
import {
  conversationFocus,
  conversationKill,
  conversationRename,
  conversationUnfocus,
  killGhostConversations,
} from "./focus";
import { groupCreate, groupDelete } from "./group";
import {
  sessionDelete,
  sessionEditBody,
  sessionMove,
  sessionRename,
  sessionReparent,
  sessionSave,
  sessionSetKind,
  sessionSetStatus,
} from "./session";
import type { CommandCtx } from "./shared";

/// What to refresh after a command resolves. `focus` also refreshes the tree.
type PostAction = "none" | "tree" | "focus";

interface CommandDesc {
  id: string;
  run: (ctx: CommandCtx) => Promise<void>;
  post: PostAction;
}

const TABLE: CommandDesc[] = [
  { id: "standarflow.groupCreate", run: groupCreate, post: "tree" },
  { id: "standarflow.groupDelete", run: groupDelete, post: "tree" },
  { id: "standarflow.sessionSave", run: sessionSave, post: "tree" },
  { id: "standarflow.sessionRename", run: sessionRename, post: "tree" },
  { id: "standarflow.sessionMove", run: sessionMove, post: "tree" },
  { id: "standarflow.sessionReparent", run: sessionReparent, post: "tree" },
  { id: "standarflow.sessionSetKind", run: sessionSetKind, post: "tree" },
  { id: "standarflow.sessionSetStatus", run: sessionSetStatus, post: "tree" },
  { id: "standarflow.sessionDelete", run: sessionDelete, post: "tree" },
  { id: "standarflow.sessionEditBody", run: sessionEditBody, post: "tree" },
  { id: "standarflow.fileAttach", run: fileAttach, post: "tree" },
  { id: "standarflow.memoryImport", run: memoryImport, post: "tree" },
  { id: "standarflow.detachFileRef", run: detachFileRef, post: "tree" },
  { id: "standarflow.fileClaim", run: fileClaim, post: "tree" },
  { id: "standarflow.fileDeleteWithSource", run: fileDeleteWithSource, post: "tree" },
  { id: "standarflow.conversationFocus", run: conversationFocus, post: "focus" },
  { id: "standarflow.conversationUnfocus", run: conversationUnfocus, post: "focus" },
  { id: "standarflow.conversationRename", run: conversationRename, post: "tree" },
  { id: "standarflow.conversationKill", run: conversationKill, post: "focus" },
  { id: "standarflow.killGhostConversations", run: killGhostConversations, post: "focus" },
  { id: "standarflow.copySessionReference", run: copySessionReference, post: "none" },
  { id: "standarflow.copySessionSlug", run: copySessionSlug, post: "none" },
  { id: "standarflow.copyGroupPath", run: copyGroupPath, post: "none" },
  { id: "standarflow.copyFileRefPath", run: copyFileRefPath, post: "none" },
];

export interface CommandDeps {
  getClient: () => StandarflowClient | undefined;
  refreshTree: () => void;
  refreshFocus: () => Promise<void>;
}

async function runCommand(
  desc: CommandDesc,
  node: TreeNode | undefined,
  deps: CommandDeps,
): Promise<void> {
  const client = deps.getClient();
  if (!client) {
    void vscode.window.showWarningMessage(
      'Standarflow is not connected. Run "Standarflow: Reconnect".',
    );
    return;
  }
  try {
    await desc.run({ client, node });
  } catch (e) {
    void vscode.window.showErrorMessage(`standarflow: ${(e as Error).message}`);
    return;
  }
  if (desc.post !== "none") deps.refreshTree();
  if (desc.post === "focus") await deps.refreshFocus();
}

export function registerCommands(
  context: vscode.ExtensionContext,
  deps: CommandDeps,
): void {
  for (const desc of TABLE) {
    context.subscriptions.push(
      vscode.commands.registerCommand(desc.id, (node?: TreeNode) =>
        runCommand(desc, node, deps),
      ),
    );
  }
}
