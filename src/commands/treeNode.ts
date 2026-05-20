import { matcher } from "matchigo";
import type { TreeNode } from "../treeProvider";

export type FileRefNode = Extract<TreeNode, { kind: "fileRef" }>;
export type ConversationNode = Extract<TreeNode, { kind: "conversation" }>;

export interface SessionSelection {
  groupPath: string;
  slug: string;
}

const groupPathOf = matcher<TreeNode, string | undefined>()
  .with({ kind: "conversationsRoot" }, () => undefined)
  .with({ kind: "conversation" }, () => undefined)
  .with({ kind: "group" }, (n) => n.path)
  .with({ kind: "session" }, (n) => n.groupPath)
  .with({ kind: "artefact" }, (n) => n.groupPath)
  .with({ kind: "fileRef" }, (n) => n.groupPath)
  .with({ kind: "fileChangeGroup" }, (n) => n.groupPath)
  .with({ kind: "fileChangeDir" }, () => undefined)
  .with({ kind: "fileChangeFile" }, () => undefined)
  .exhaustive();

const sessionSlugOf = matcher<TreeNode, string | undefined>()
  .with({ kind: "conversationsRoot" }, () => undefined)
  .with({ kind: "conversation" }, () => undefined)
  .with({ kind: "group" }, () => undefined)
  .with({ kind: "session" }, (n) => n.session.slug)
  .with({ kind: "artefact" }, (n) => n.artefact.slug)
  .with({ kind: "fileRef" }, (n) => n.sessionSlug)
  .with({ kind: "fileChangeGroup" }, (n) => n.session.slug)
  .with({ kind: "fileChangeDir" }, () => undefined)
  .with({ kind: "fileChangeFile" }, () => undefined)
  .exhaustive();

const kindOf = matcher<TreeNode, string | undefined>()
  .with({ kind: "conversationsRoot" }, () => undefined)
  .with({ kind: "conversation" }, () => undefined)
  .with({ kind: "group" }, () => undefined)
  .with({ kind: "session" }, (n) => n.session.kind)
  .with({ kind: "artefact" }, (n) => n.artefact.kind)
  .with({ kind: "fileRef" }, () => undefined)
  .with({ kind: "fileChangeGroup" }, () => undefined)
  .with({ kind: "fileChangeDir" }, () => undefined)
  .with({ kind: "fileChangeFile" }, () => undefined)
  .exhaustive();

const selectionOf = matcher<TreeNode, SessionSelection | undefined>()
  .with({ kind: "conversationsRoot" }, () => undefined)
  .with({ kind: "conversation" }, () => undefined)
  .with({ kind: "group" }, () => undefined)
  .with({ kind: "session" }, (n) => ({ groupPath: n.groupPath, slug: n.session.slug }))
  .with({ kind: "artefact" }, (n) => ({ groupPath: n.groupPath, slug: n.artefact.slug }))
  .with({ kind: "fileRef" }, () => undefined)
  .with({ kind: "fileChangeGroup" }, () => undefined)
  .with({ kind: "fileChangeDir" }, () => undefined)
  .with({ kind: "fileChangeFile" }, () => undefined)
  .exhaustive();

export function nodeGroupPath(node: TreeNode | undefined): string | undefined {
  return node ? groupPathOf(node) : undefined;
}

export function nodeSessionSlug(node: TreeNode | undefined): string | undefined {
  return node ? sessionSlugOf(node) : undefined;
}

export function nodeKind(node: TreeNode | undefined): string | undefined {
  return node ? kindOf(node) : undefined;
}

export function nodeSelection(node: TreeNode | undefined): SessionSelection | undefined {
  return node ? selectionOf(node) : undefined;
}

export function nodeFileRef(node: TreeNode | undefined): FileRefNode | undefined {
  return node?.kind === "fileRef" ? node : undefined;
}

export function nodeConversation(
  node: TreeNode | undefined,
): ConversationNode | undefined {
  return node?.kind === "conversation" ? node : undefined;
}
