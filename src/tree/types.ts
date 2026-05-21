import type {
  Conversation,
  FileChange,
  FileRefRow,
  FocusEntry,
  GroupRow,
  SessionLite,
} from "../mcpClient";

export type TreeNode =
  | { kind: "conversationsRoot"; liveCount: number; ghostCount: number }
  | {
      kind: "conversation";
      conversation: Conversation;
      focus: FocusEntry | null;
      isGhost: boolean;
    }
  | { kind: "endedConversationsRoot"; count: number }
  | { kind: "group"; path: string; group: GroupRow }
  | { kind: "session"; groupPath: string; session: SessionLite; isCurrent: boolean }
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
