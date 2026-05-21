# Standarflow for VS Code

**Session, artefact, link and conversation store for AI-assisted work.** Persist
what your AI agents do, group their work, link related sessions, attach files, and
audit which chat touched what — all in a local SQLite DB next to your project.

Standarflow is powered by a small Rust binary that exposes an MCP server. The
extension talks to that binary over stdio, so the same data is reachable from
Claude Code, the terminal CLI, and this extension. The binary is fetched
automatically on first run — no separate install step.

## Quick start

1. **Install** the extension.
2. **Open** any folder — the Standarflow view appears in the Activity Bar.
3. **Create a group** (`Standarflow: Create Group`) to namespace a topic.
4. **Save a session** (`Standarflow: Save Session`) — point it at the open
   markdown editor for the body, or type it inline.
5. **Attach files** (`Standarflow: Attach File to Session`) to keep memory files,
   ADRs and transcripts next to the session that produced them.
6. **Wire Claude Code** (`Standarflow: Install Claude Code Hooks`) so every chat's
   activity flows into standarflow automatically.

The DB lives at `${workspaceFolder}/.standarflow/standarflow.db` by default.
Multiple AI clients read and write it concurrently; every row is tagged with the
client that wrote it.

## What you get

- **Tree view** of groups → sessions → artefacts → file_refs, with a status badge
  per session (`active` / `completed` / `superseded` / `archived` / `paused`).
- **Webview viewer** — click a session to open it: rendered markdown body, inline
  editing, attached files, links, and two audit panels:
  - **Conversations** — the chats that worked in this session, with touch counts.
  - **File changes** — the file mutations attributed to this session.
- **Right-click context menus** on every node — create, rename, move, reparent,
  set kind/status, delete, attach files, focus.
- **The `standarflow` CLI** — fetched and cached automatically on first run;
  point at your own build with `standarflow.binPath`.

## Identity & focus

A *conversation* is an AI chat, identified by the stable id its provider gives it
— so focus survives restarts and two chats in the same workspace never collide.
The status bar shows the focused session and which conversation it is pinned for.
Focus a session and, once hooks are installed, every file that chat edits is
logged against it.

## The standarflow binary

The extension runs a small `standarflow` Rust binary as a subprocess and speaks
MCP to it over stdio. On first activation it downloads the binary for your
platform from the [standarflow releases](https://github.com/miralabs-tech/standarflow/releases),
verifies its SHA-256 checksum, and caches it under the extension's global
storage. Later launches reuse the cached copy.

To run your own build instead, set `standarflow.binPath` to its absolute path.
If the download fails and a `standarflow` binary is on your `PATH`, the
extension uses that as a fallback.

## Settings

| Setting | Default | What it does |
| --- | --- | --- |
| `standarflow.binPath` | *(empty)* | Path to the `standarflow` binary. Empty = the auto-downloaded, cached binary; falls back to `standarflow` on `PATH`. |
| `standarflow.dbPath` | *(empty)* | Absolute path to the SQLite DB. Empty = `${workspaceFolder}/.standarflow/standarflow.db`. |
| `standarflow.autoRefreshMs` | `0` | Auto-refresh interval in ms. `0` disables it. |

## Wiring AI agents

- **`Standarflow: Generate .mcp.json`** — drop an MCP server entry into the
  workspace so Claude Code / Cursor / any MCP-aware agent read the same DB.
- **`Standarflow: Install Claude Code Hooks`** — patch `~/.claude/settings.json`
  so every Claude Code chat's hook events flow into standarflow. Idempotent,
  backed up, preserves your existing hooks.

## Docs

Full documentation, in **English** and **Français**, lives in
**[docs/](docs/README.md)** — Concepts, Commands, Automation, Settings, and a
no-jargon MCP-tools guide.

## License

MIT — see [LICENSE](LICENSE).
