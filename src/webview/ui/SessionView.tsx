import MarkdownIt from "markdown-it";
import { useState } from "preact/hooks";
import type { LinkPeer, LinkRow, SessionViewData } from "./types";

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });

type MdEntry =
  | { kind: "loading" }
  | { kind: "ok"; content: string }
  | { kind: "err"; message: string };

interface Props {
  data: SessionViewData;
  mdByFileRefId: Record<number, MdEntry | undefined>;
  onNavigateSession: (peer: LinkPeer) => void;
  onNavigateMd: (fileRefId: number, path: string) => void;
  onEditInVscode: (path: string) => void;
  onReadInlineMd: (fileRefId: number) => void;
  onSaveBody: (bodyMd: string) => void;
}

function basename(p: string): string {
  const idx = Math.max(p.lastIndexOf("/"), p.lastIndexOf("\\"));
  return idx >= 0 ? p.slice(idx + 1) : p;
}

function shortId(id: string): string {
  return id.length > 12 ? id.slice(0, 8) : id;
}

function formatDate(unixSec: number): string {
  return new Date(unixSec * 1000).toISOString().replace("T", " ").slice(0, 19);
}

function isMdPath(path: string): boolean {
  return path.toLowerCase().endsWith(".md") || path.toLowerCase().endsWith(".markdown");
}

interface LinkItemProps {
  link: LinkRow;
  direction: "outgoing" | "incoming";
  onNavigate: (peer: LinkPeer) => void;
}

function LinkItem({ link, direction, onNavigate }: LinkItemProps) {
  const peerLabel = link.peer
    ? `${link.peer.group_path}/${link.peer.slug}`
    : `#${direction === "outgoing" ? link.to_id : link.from_id}`;
  const peerDesc = link.peer
    ? `${link.peer.kind} · ${link.peer.status}`
    : "(unresolved)";

  const body = (
    <>
      {direction === "incoming" && (
        <span class="session-view__link-direction">→</span>
      )}
      <code class="session-view__link-relation">{link.relation}</code>
      {direction === "outgoing" && (
        <span class="session-view__link-direction">→</span>
      )}
      <span class="session-view__link-target">
        <span class="session-view__link-target-slug">{peerLabel}</span>
        <span class="session-view__link-target-desc">{peerDesc}</span>
      </span>
    </>
  );

  if (link.peer) {
    return (
      <li class="session-view__link">
        <button
          type="button"
          class="session-view__link-button"
          onClick={() => onNavigate(link.peer!)}
          title={`Navigate to ${peerLabel}`}
        >
          {body}
        </button>
      </li>
    );
  }
  return <li class="session-view__link session-view__link--unresolved">{body}</li>;
}

export function SessionView({
  data,
  mdByFileRefId,
  onNavigateSession,
  onNavigateMd,
  onEditInVscode,
  onReadInlineMd,
  onSaveBody,
}: Props) {
  const { groupPath, session, files, links, participants, fileChanges, conversations } =
    data;
  const hasLinks = links.outgoing.length > 0 || links.incoming.length > 0;
  const convById = new Map(conversations.map((c) => [c.id, c]));
  const wasUpdated =
    session.updated_at > session.created_at ||
    session.updated_by !== session.created_by;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(session.body_md);
  const [expandedFileRefIds, setExpandedFileRefIds] = useState<Set<number>>(new Set());

  if (!editing && draft !== session.body_md) {
    setDraft(session.body_md);
  }

  const startEdit = () => {
    setDraft(session.body_md);
    setEditing(true);
  };
  const cancelEdit = () => {
    setDraft(session.body_md);
    setEditing(false);
  };
  const saveEdit = () => {
    onSaveBody(draft);
    setEditing(false);
  };

  const toggleExpand = (id: number) => {
    setExpandedFileRefIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        if (!mdByFileRefId[id]) {
          onReadInlineMd(id);
        }
      }
      return next;
    });
  };

  return (
    <article class="session-view">
      <header class="session-view__header">
        <div class="session-view__path">{groupPath}</div>
        <h1 class="session-view__title">{session.slug}</h1>
        <div class="session-view__meta">
          <span class={`session-view__tag session-view__tag--status session-view__tag--${session.status}`}>
            {session.status}
          </span>
          <span class="session-view__tag session-view__tag--kind">{session.kind}</span>
          {session.created_by && (
            <span class="session-view__tag session-view__tag--client">by {session.created_by}</span>
          )}
          <span class="session-view__tag session-view__tag--time">{formatDate(session.created_at)}</span>
          {wasUpdated && (
            <span class="session-view__tag session-view__tag--updated">
              updated {formatDate(session.updated_at)}
              {session.updated_by && session.updated_by !== session.created_by
                ? ` · ${session.updated_by}`
                : ""}
            </span>
          )}
        </div>
      </header>

      <section class="session-view__body-section">
        <div class="session-view__body-toolbar">
          {!editing ? (
            <button type="button" class="session-view__btn" onClick={startEdit}>
              Edit body
            </button>
          ) : (
            <>
              <button type="button" class="session-view__btn session-view__btn--primary" onClick={saveEdit}>
                Save
              </button>
              <button type="button" class="session-view__btn" onClick={cancelEdit}>
                Cancel
              </button>
            </>
          )}
        </div>
        {!editing ? (
          <div
            class="session-view__body"
            dangerouslySetInnerHTML={{ __html: md.render(session.body_md) }}
          />
        ) : (
          <textarea
            class="session-view__editor"
            value={draft}
            onInput={(e) => setDraft((e.target as HTMLTextAreaElement).value)}
            rows={Math.max(12, draft.split("\n").length + 2)}
            spellcheck={false}
          />
        )}
      </section>

      {files.length > 0 && (
        <aside class="session-view__panel session-view__panel--files">
          <h2 class="session-view__panel-title">Attached files ({files.length})</h2>
          <ul class="session-view__list">
            {files.map((f) => {
              const expanded = expandedFileRefIds.has(f.id);
              const mdEntry = mdByFileRefId[f.id];
              const isMd = isMdPath(f.path);
              return (
                <li class="session-view__file" key={f.id}>
                  <div class="session-view__file-row">
                    <button
                      type="button"
                      class="session-view__file-button"
                      onClick={() =>
                        isMd
                          ? onNavigateMd(f.id, f.path)
                          : onEditInVscode(f.path)
                      }
                      title={
                        isMd
                          ? `Open ${basename(f.path)} in the viewer (use Edit to open in VSCode)`
                          : f.path
                      }
                    >
                      <span class="session-view__file-role">{f.role}</span>
                      <span class="session-view__file-name">{basename(f.path)}</span>
                      <span class="session-view__file-path">{f.path}</span>
                      {f.created_by && (
                        <span class="session-view__file-client">{f.created_by}</span>
                      )}
                    </button>
                    <div class="session-view__file-actions">
                      {isMd && (
                        <button
                          type="button"
                          class="session-view__btn session-view__btn--tiny"
                          onClick={() => toggleExpand(f.id)}
                        >
                          {expanded ? "Hide" : "Preview"}
                        </button>
                      )}
                      <button
                        type="button"
                        class="session-view__btn session-view__btn--tiny"
                        onClick={() => onEditInVscode(f.path)}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                  {f.description && (
                    <div class="session-view__file-desc">{f.description}</div>
                  )}
                  {isMd && expanded && (
                    <div class="session-view__file-preview">
                      {mdEntry?.kind === "loading" && <em>Loading…</em>}
                      {mdEntry?.kind === "err" && (
                        <div class="session-view__file-preview-error">
                          Failed to read: {mdEntry.message}
                        </div>
                      )}
                      {mdEntry?.kind === "ok" && (
                        <div
                          class="session-view__body"
                          dangerouslySetInnerHTML={{ __html: md.render(mdEntry.content) }}
                        />
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </aside>
      )}

      {hasLinks && (
        <aside class="session-view__panel session-view__panel--links">
          <h2 class="session-view__panel-title">Links</h2>
          {links.outgoing.length > 0 && (
            <div class="session-view__links-section">
              <h3 class="session-view__links-subtitle">Outgoing</h3>
              <ul class="session-view__list">
                {links.outgoing.map((l) => (
                  <LinkItem
                    key={`out-${l.from_id}-${l.to_id}-${l.relation}`}
                    link={l}
                    direction="outgoing"
                    onNavigate={onNavigateSession}
                  />
                ))}
              </ul>
            </div>
          )}
          {links.incoming.length > 0 && (
            <div class="session-view__links-section">
              <h3 class="session-view__links-subtitle">Incoming</h3>
              <ul class="session-view__list">
                {links.incoming.map((l) => (
                  <LinkItem
                    key={`in-${l.from_id}-${l.to_id}-${l.relation}`}
                    link={l}
                    direction="incoming"
                    onNavigate={onNavigateSession}
                  />
                ))}
              </ul>
            </div>
          )}
        </aside>
      )}

      {participants.length > 0 && (
        <aside class="session-view__panel session-view__panel--participants">
          <h2 class="session-view__panel-title">
            Conversations ({participants.length})
          </h2>
          <ul class="session-view__list">
            {participants.map((p) => {
              const conv = convById.get(p.conversation_id);
              const label = conv
                ? `${conv.provider} · ${shortId(conv.provider_conversation_id)}`
                : `conv#${p.conversation_id}`;
              return (
                <li class="session-view__participant" key={p.id}>
                  <span class="session-view__participant-label">{label}</span>
                  <span class="session-view__participant-meta">
                    {p.touch_count} touch{p.touch_count === 1 ? "" : "es"} · last{" "}
                    {formatDate(p.last_touch_at)}
                  </span>
                </li>
              );
            })}
          </ul>
        </aside>
      )}

      {fileChanges.length > 0 && (
        <aside class="session-view__panel session-view__panel--changes">
          <h2 class="session-view__panel-title">
            File changes ({fileChanges.length})
          </h2>
          <ul class="session-view__list">
            {fileChanges.map((c) => (
              <li class="session-view__change" key={c.id}>
                <code class="session-view__change-op">{c.op}</code>
                <span class="session-view__change-name">
                  {basename(c.file_path)}
                </span>
                {c.tool_name && (
                  <span class="session-view__change-tool">{c.tool_name}</span>
                )}
                <span class="session-view__change-time">{formatDate(c.ts)}</span>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </article>
  );
}
