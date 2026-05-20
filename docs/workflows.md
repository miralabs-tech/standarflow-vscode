# Workflows

A few recipes that cover the most common reasons people install Standarflow.

## 1. Tracking pair-programming sessions with Claude Code / Cursor

**Goal**: at the end of each session, save a markdown summary that captures *what was done* and *what's planned next*, so the next conversation (or another agent) can pick up cold.

1. Create a group per project / topic — e.g. `claude-code-loop`, `infra-migration`.
2. At the end of a session, ask the agent to write a markdown summary (or do it yourself).
3. Either:
   - Open the summary in the editor, then run `Standarflow: Save Session` and pick **“Use active markdown editor”** when prompted, or
   - Right-click the previous session in the tree, run **Save Session**, and accept the **“continues”** chain prompt. The previous session is auto-marked `superseded`.
4. Open the saved session in the webview viewer to skim it. Click **Edit body** if you need to tweak.

Why chain? `continues` links create a backwards-readable history: from any current session, you can walk the chain to retrieve every prior summary, in order.

## 2. Importing memory files (Claude, Cursor, custom agents)

**Goal**: pull every `*.md` file from a memory folder into a single session, in one call, so the agent can later list / read them via MCP.

1. Create a session that will hold them — `Standarflow: Save Session`, kind = `memory-index` or similar.
2. Right-click that session → **Import Memory Folder**, pick the folder (e.g. `~/.claude/projects/<project>/memory`), keep `.md` as the extension and `memory` as the role.
3. Every file is attached as a `file_ref` with role `memory`. The webview viewer shows them and lets you preview each `.md` inline.

The import is idempotent on `(session_id, path)` — running it again after edits just refreshes the role/description.

## 3. Multi-agent: scoping work per agent

**Goal**: keep `claude-code` and `cursor` work visible side-by-side but separable.

- Either **per group** (`claude-code/`, `cursor/`) — clean separation, easy filtering, but no overlap between agents.
- Or **shared group with `created_by` filtering** — agents share the same project group, every row records who wrote it. The tree shows the `created_by` tag inline.

Pick the second when agents collaborate on the same work and you want to see both timelines in one place. Pick the first when they truly own independent things.

To claim a file_ref attached by another client (e.g. you imported a memory folder via Claude Code and want the extension to “own” it), right-click → **Claim File Reference**.

## 4. Cleaning up

- **Group deletion** cascades. Before deleting, glance at the count in the confirm modal — that's how many sessions you're about to lose.
- **Session deletion** also cascades (to artefacts, file_refs, links). Files on disk are never touched unless you explicitly run **Delete File Reference and Source** on each file_ref.
- The `Standarflow: Delete Database` command wipes everything but is *safe* in the sense that it does not touch on-disk files referenced by file_refs.

## 5. Auto-track what your AI agent touches

Standarflow can sync itself with your AI agent in the background — every `Edit` / `Write` becomes a `file_ref` on a focused session, and at the end of each turn a markdown summary of the touched paths is appended to the session body. Two pieces :

1. **Pin a session** as the focused one (status bar `$(target)` item, or `Standarflow: Focus Session` on a tree node).
2. **Add a hook** in `~/.claude/settings.json` that calls `standarflow file attach-touched` on `PostToolUse` and `standarflow turn drain` on `Stop`.

Full recipe with the exact `settings.json` snippet : [`automation.md`](./automation.md).

This is the only sanctioned exception to "AI agents never write standarflow autonomously" — because the hook config is *your* explicit, persistent delegation, not the agent's initiative.

## 6. Where to look for state

- **Counts and DB path** — `Standarflow: Show Workspace Info`
- **Who wrote what** — every row exposes `created_by` (and sessions also have `updated_by` after V3). The tree and the webview viewer display it inline.
- **History of a session chain** — open the session in the webview, look at the **Links** panel: `continues` outgoing points at the previous session, `continues` incoming points at the successor.
