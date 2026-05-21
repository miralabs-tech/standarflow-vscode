export type SessionStatus =
  | "active"
  | "completed"
  | "superseded"
  | "archived"
  | "paused";

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
  created_by: string;
  updated_at: number;
  updated_by: string | null;
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
  workspace_path: string | null;
  first_seen_at: number;
  last_seen_at: number;
  ended_at: number | null;
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

export interface SessionViewData {
  groupPath: string;
  session: SessionRow;
  files: FileRefRow[];
  links: LinkOf;
  participants: Participant[];
  fileChanges: FileChange[];
  conversations: Conversation[];
}

export interface MdViewData {
  path: string;
  fileRefId: number;
  content: string;
}

export type MdEntry =
  | { kind: "loading" }
  | { kind: "ok"; content: string }
  | { kind: "err"; message: string };

export type ViewState =
  | { kind: "session"; data: SessionViewData }
  | { kind: "session-loading"; groupPath: string; slug: string }
  | { kind: "md"; data: MdViewData }
  | { kind: "md-loading"; path: string; fileRefId: number };

// Host → Webview
export interface InitMessage {
  type: "init";
  data: SessionViewData;
}
export interface PushSessionDataMessage {
  type: "pushSessionData";
  data: SessionViewData;
}
export interface PushMdDataMessage {
  type: "pushMdData";
  data: MdViewData;
}
export interface MdContentMessage {
  type: "mdContent";
  fileRefId: number;
  content: string;
}
export interface MdErrorMessage {
  type: "mdError";
  fileRefId: number;
  message: string;
}
export interface NavigationErrorMessage {
  type: "navigationError";
  message: string;
}

export type HostToWebview =
  | InitMessage
  | PushSessionDataMessage
  | PushMdDataMessage
  | MdContentMessage
  | MdErrorMessage
  | NavigationErrorMessage;

// Webview → Host
export interface ReadyMessage {
  type: "ready";
}
export interface SaveBodyMessage {
  type: "saveBody";
  bodyMd: string;
}
export interface ReadMdMessage {
  type: "readMd";
  fileRefId: number;
}
export interface RequestSessionMessage {
  type: "requestSession";
  groupPath: string;
  slug: string;
}
export interface RequestMdMessage {
  type: "requestMd";
  fileRefId: number;
  path: string;
}
export interface OpenFileMessage {
  type: "openFile";
  path: string;
}
export interface EditFileMessage {
  type: "editFile";
  path: string;
}

export type WebviewToHost =
  | ReadyMessage
  | SaveBodyMessage
  | ReadMdMessage
  | RequestSessionMessage
  | RequestMdMessage
  | OpenFileMessage
  | EditFileMessage;
