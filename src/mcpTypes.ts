export type SessionStatus =
  | "active"
  | "completed"
  | "superseded"
  | "archived"
  | "paused";

export interface WorkspaceInfo {
  bin_path: string | null;
  db_path: string;
  schema_version: number;
  groups_count: number;
  sessions_count: number;
  file_refs_count: number;
  conversations_count: number;
  /// The workspace's current session pointer, or null before the first focus
  /// on a build carrying the pointer.
  current_session_id: number | null;
  first_run: boolean;
}

export interface GroupRow {
  id: number;
  parent_id: number | null;
  slug: string;
  title: string | null;
  description: string | null;
  created_at: number;
  updated_at: number;
  created_by: string;
  updated_by: string | null;
}

export interface SessionRow {
  id: number;
  group_id: number;
  parent_session_id: number | null;
  slug: string;
  kind: string;
  status: SessionStatus;
  title: string | null;
  body_md: string;
  created_at: number;
  updated_at: number;
  created_by: string;
  updated_by: string | null;
}

export interface SessionLite {
  id: number;
  parent_session_id: number | null;
  slug: string;
  kind: string;
  status: SessionStatus;
  title: string | null;
  created_at: number;
  updated_at: number;
  created_by: string;
}

export interface SessionUpdate {
  bodyMd?: string;
  kind?: string;
  status?: SessionStatus;
  title?: string;
  clearTitle?: boolean;
  parentSlug?: string;
  clearParent?: boolean;
  newGroupPath?: string;
  newSlug?: string;
}

export interface FileDeleteWithSourceResult {
  file_ref_id: number;
  path: string;
  file_deleted: boolean;
  file_was_missing: boolean;
}

export interface FocusedSession {
  conversation_id: number;
  provider: string;
  provider_conversation_id: string;
  group_path: string;
  session_id: number;
  session_slug: string;
  session_kind: string;
  session_status: SessionStatus;
  focused_at: number;
  pending_session_id: number | null;
  /// false when this is the workspace's inherited suggestion (no focus row
  /// yet) rather than a confirmed focus.
  confirmed: boolean;
}

/// One conversation's focused session, as returned by `focus_list` — the
/// whole focus map, readable by a client that is not itself a conversation.
export interface FocusEntry {
  conversation_id: number;
  provider: string;
  provider_conversation_id: string;
  client_label: string | null;
  workspace_path: string | null;
  last_seen_at: number;
  ended_at: number | null;
  group_path: string;
  session_id: number;
  session_slug: string;
  session_kind: string;
  session_status: SessionStatus;
  focused_at: number;
  /// Whether the conversation's agent process is still running.
  is_live: boolean;
}

export interface FileRefRow {
  id: number;
  session_id: number;
  path: string;
  role: string;
  source: string;
  description: string | null;
  created_at: number;
  created_by: string;
}

export interface LinkPeer {
  id: number;
  slug: string;
  group_path: string;
  kind: string;
  status: SessionStatus;
}

export interface LinkRow {
  from_id: number;
  to_id: number;
  relation: string;
  created_at: number;
  created_by: string;
  peer: LinkPeer | null;
}

export interface LinkOf {
  outgoing: LinkRow[];
  incoming: LinkRow[];
}

export interface Conversation {
  id: number;
  provider: string;
  provider_conversation_id: string;
  client_label: string | null;
  workspace_path: string | null;
  transcript_path: string | null;
  first_seen_at: number;
  last_seen_at: number;
  ended_at: number | null;
  last_pid: number | null;
  last_conversation_pid: number | null;
  /// Whether the conversation's agent process is still running. Computed by
  /// the MCP server from the live process set, not stored.
  is_live: boolean;
}

export interface Participant {
  id: number;
  session_id: number;
  conversation_id: number;
  first_touch_at: number;
  last_touch_at: number;
  touch_count: number;
}

export interface FileChange {
  id: number;
  session_id: number;
  conversation_id: number;
  file_path: string;
  op: string;
  kind: string | null;
  tool_name: string | null;
  ts: number;
}
