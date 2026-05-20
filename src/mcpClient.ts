import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type {
  Conversation,
  FileChange,
  FileDeleteWithSourceResult,
  FileRefRow,
  FocusEntry,
  FocusedSession,
  GroupRow,
  LinkOf,
  Participant,
  SessionLite,
  SessionRow,
  SessionUpdate,
  WorkspaceInfo,
} from "./mcpTypes";

export * from "./mcpTypes";

export class StandarflowClient {
  private client?: Client;
  private transport?: StdioClientTransport;

  async connect(binPath: string, dbPath: string): Promise<void> {
    if (this.client) {
      return;
    }
    const env: Record<string, string> = {};
    for (const [k, v] of Object.entries(process.env)) {
      if (typeof v === "string") env[k] = v;
    }
    this.transport = new StdioClientTransport({
      command: binPath,
      args: ["--db", dbPath, "mcp"],
      env,
    });
    this.client = new Client({ name: "standarflow-vscode", version: "0.1.0" });
    await this.client.connect(this.transport);
  }

  async dispose(): Promise<void> {
    try {
      await this.client?.close();
    } catch {
      // ignore
    }
    this.client = undefined;
    this.transport = undefined;
  }

  private async call<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
    const text = await this.callRaw(name, args);
    if (!text) {
      throw new Error(`${name}: empty response`);
    }
    return JSON.parse(text) as T;
  }

  workspaceInfo(): Promise<WorkspaceInfo> {
    return this.call<WorkspaceInfo>("workspace_info");
  }

  groupList(parentPath?: string): Promise<GroupRow[]> {
    return this.call<GroupRow[]>("group_list", parentPath ? { parent_path: parentPath } : {});
  }

  groupCreate(args: {
    slug: string;
    title?: string;
    description?: string;
    parentPath?: string;
  }): Promise<GroupRow> {
    const payload: Record<string, unknown> = { slug: args.slug };
    if (args.title) payload.title = args.title;
    if (args.description) payload.description = args.description;
    if (args.parentPath) payload.parent_path = args.parentPath;
    return this.call<GroupRow>("group_create", payload);
  }

  async groupDelete(groupPath: string): Promise<void> {
    await this.callRaw("group_delete", { group_path: groupPath });
  }

  sessionList(groupPath: string, pattern?: string): Promise<SessionLite[]> {
    const args: Record<string, unknown> = { group_path: groupPath };
    if (pattern) args.pattern = pattern;
    return this.call<SessionLite[]>("session_list", args);
  }

  sessionGet(
    groupPath: string,
    opts: { slug?: string; kind?: string } = {},
  ): Promise<SessionRow> {
    const args: Record<string, unknown> = { group_path: groupPath };
    if (opts.slug) args.slug = opts.slug;
    if (opts.kind) args.kind = opts.kind;
    return this.call<SessionRow>("session_get", args);
  }

  sessionChildren(sessionId: number): Promise<SessionLite[]> {
    return this.call<SessionLite[]>("session_children", { session_id: sessionId });
  }

  async sessionSave(args: {
    groupPath: string;
    slug: string;
    bodyMd: string;
    kind?: string;
    title?: string;
    parentSlug?: string;
    continuesSlug?: string;
  }): Promise<SessionRow> {
    const payload: Record<string, unknown> = {
      group_path: args.groupPath,
      slug: args.slug,
      body_md: args.bodyMd,
    };
    if (args.kind) payload.kind = args.kind;
    if (args.title) payload.title = args.title;
    if (args.parentSlug) payload.parent_slug = args.parentSlug;
    if (args.continuesSlug) payload.continues_slug = args.continuesSlug;
    return this.call<SessionRow>("session_save", payload);
  }

  async sessionUpdate(
    groupPath: string,
    slug: string,
    patch: SessionUpdate,
  ): Promise<SessionRow> {
    const payload: Record<string, unknown> = {
      group_path: groupPath,
      slug,
    };
    if (patch.bodyMd !== undefined) payload.body_md = patch.bodyMd;
    if (patch.kind !== undefined) payload.kind = patch.kind;
    if (patch.status !== undefined) payload.status = patch.status;
    if (patch.title !== undefined) payload.title = patch.title;
    if (patch.clearTitle) payload.clear_title = true;
    if (patch.parentSlug !== undefined) payload.parent_slug = patch.parentSlug;
    if (patch.clearParent) payload.clear_parent = true;
    if (patch.newGroupPath !== undefined) payload.new_group_path = patch.newGroupPath;
    if (patch.newSlug !== undefined) payload.new_slug = patch.newSlug;
    return this.call<SessionRow>("session_update", payload);
  }

  async sessionDelete(groupPath: string, slug: string): Promise<void> {
    await this.callRaw("session_delete", {
      group_path: groupPath,
      slug,
    });
  }

  async sessionFocus(
    groupPath: string,
    slug: string,
    conversationId?: number,
  ): Promise<void> {
    const payload: Record<string, unknown> = { group_path: groupPath, slug };
    if (conversationId !== undefined) payload.conversation_id = conversationId;
    await this.callRaw("session_focus", payload);
  }

  async sessionUnfocus(conversationId?: number): Promise<void> {
    const payload: Record<string, unknown> = {};
    if (conversationId !== undefined) payload.conversation_id = conversationId;
    await this.callRaw("session_unfocus", payload);
  }

  async sessionFocused(conversationId?: number): Promise<FocusedSession | null> {
    const payload: Record<string, unknown> = {};
    if (conversationId !== undefined) payload.conversation_id = conversationId;
    const text = await this.callRaw("session_focused", payload);
    if (!text || text.trim() === "null") return null;
    return JSON.parse(text) as FocusedSession;
  }

  conversationGet(conversationId?: number): Promise<Conversation> {
    const payload: Record<string, unknown> = {};
    if (conversationId !== undefined) payload.conversation_id = conversationId;
    return this.call<Conversation>("conversation_get", payload);
  }

  conversationList(activeSince?: number): Promise<Conversation[]> {
    const payload: Record<string, unknown> = {};
    if (activeSince !== undefined) payload.active_since = activeSince;
    return this.call<Conversation[]>("conversation_list", payload);
  }

  focusList(): Promise<FocusEntry[]> {
    return this.call<FocusEntry[]>("focus_list");
  }

  conversationSetLabel(
    conversationId: number,
    label: string | null,
  ): Promise<Conversation> {
    return this.call<Conversation>("conversation_set_label", {
      conversation_id: conversationId,
      label,
    });
  }

  sessionParticipants(sessionId: number): Promise<Participant[]> {
    return this.call<Participant[]>("session_participants", { session_id: sessionId });
  }

  sessionFileChanges(sessionId: number, limit?: number): Promise<FileChange[]> {
    const payload: Record<string, unknown> = { session_id: sessionId };
    if (limit !== undefined) payload.limit = limit;
    return this.call<FileChange[]>("session_file_changes", payload);
  }

  fileList(groupPath: string, sessionSlug: string): Promise<FileRefRow[]> {
    return this.call<FileRefRow[]>("file_list", {
      group_path: groupPath,
      session_slug: sessionSlug,
    });
  }

  async fileAttach(args: {
    groupPath: string;
    sessionSlug: string;
    path: string;
    role?: string;
    description?: string;
  }): Promise<FileRefRow> {
    const payload: Record<string, unknown> = {
      group_path: args.groupPath,
      session_slug: args.sessionSlug,
      path: args.path,
    };
    if (args.role) payload.role = args.role;
    if (args.description) payload.description = args.description;
    return this.call<FileRefRow>("file_attach", payload);
  }

  async fileRead(fileRefId: number): Promise<string> {
    return this.callRaw("file_read", { file_ref_id: fileRefId });
  }

  async fileRemove(fileRefId: number): Promise<void> {
    await this.callRaw("file_remove", { file_ref_id: fileRefId });
  }

  async fileClaim(fileRefId: number): Promise<FileRefRow> {
    return this.call<FileRefRow>("file_claim", { file_ref_id: fileRefId });
  }

  async fileDeleteWithSource(fileRefId: number): Promise<FileDeleteWithSourceResult> {
    return this.call<FileDeleteWithSourceResult>("file_delete_with_source", {
      file_ref_id: fileRefId,
    });
  }

  async memoryImport(args: {
    groupPath: string;
    sessionSlug: string;
    dirPath: string;
    ext?: string;
    role?: string;
  }): Promise<FileRefRow[]> {
    const payload: Record<string, unknown> = {
      group_path: args.groupPath,
      session_slug: args.sessionSlug,
      dir_path: args.dirPath,
    };
    if (args.ext) payload.ext = args.ext;
    if (args.role) payload.role = args.role;
    return this.call<FileRefRow[]>("memory_import", payload);
  }

  async linkAdd(fromId: number, toId: number, relation: string): Promise<void> {
    await this.callRaw("link_add", {
      from_id: fromId,
      to_id: toId,
      relation,
    });
  }

  async linkRemove(fromId: number, toId: number, relation: string): Promise<void> {
    await this.callRaw("link_remove", {
      from_id: fromId,
      to_id: toId,
      relation,
    });
  }

  linkOf(sessionId: number): Promise<LinkOf> {
    return this.call<LinkOf>("link_of", { session_id: sessionId });
  }

  private async callRaw(name: string, args: Record<string, unknown>): Promise<string> {
    if (!this.client) {
      throw new Error("standarflow MCP client not connected");
    }
    const result = await this.client.callTool({ name, arguments: args });
    const content = result.content as Array<{ type: string; text?: string }> | undefined;
    const text = content?.[0]?.text ?? "";
    if (result.isError) {
      throw new Error(`${name}: ${text || "unknown MCP error"}`);
    }
    return text;
  }
}
