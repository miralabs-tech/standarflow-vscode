# Automation — sync standarflow with your AI agent

Standarflow can track, **automatically**, every file your AI agent touches during a turn and roll those touches up into a markdown summary appended to the focused session. Two pieces make this work :

1. A **focused session** — a per-client pointer that says "from now on, attach what gets touched onto this session".
2. **Claude Code hooks** (or equivalent harness hooks) that fire on `Edit` / `Write` / `Stop` events and call the standarflow CLI.

> The standarflow side is provider-agnostic. The hook config below is Claude Code-specific but the same shape works for any harness that can shell-out on tool events.

---

## 1. Pin a focused session

You can pin a session from three places :

| Where | How |
| --- | --- |
| Status bar | Click the `$(target)` item next to the standarflow status indicator |
| Tree view | Right-click a session / artefact → **Standarflow: Focus Session** |
| Command palette | `Standarflow: Pick Focus Session…` |

The focus is **per MCP client**. The extension focuses for `standarflow-vscode`, Claude Code focuses for `claude-code`, Cursor for `cursor`, the CLI for `cli` (or whatever you set in `$STANDARFLOW_CLIENT`). Each client has its own pointer — no interference in multi-agent setups.

To clear : status bar → `Clear focus`, or `Standarflow: Clear Focus` from the palette.

---

## 2. Wire the hooks (Claude Code)

Edit `~/.claude/settings.json` (global) or `.claude/settings.json` (per-project) and add :

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write|NotebookEdit",
        "hooks": [
          {
            "type": "command",
            "command": "standarflow file attach-touched \"${tool_input.file_path}\" --kind ${tool_name} --client \"claude-code:<chat-label>\""
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "standarflow turn drain --client \"claude-code:<chat-label>\""
          }
        ]
      }
    ]
  }
}
```

> **About `--client` vs `env`** : the hook scripts pass the client label via the CLI flag `--client` rather than an `env` block on the hook entry. The hook spec doesn't reliably support `env`, but the CLI flag works on every platform and reads the same focus row as the MCP server. The MCP server side (in `mcpServers.standarflow.env`) still uses `STANDARFLOW_CLIENT` because env propagation works fine when spawning a server process.

What happens :

- After **every** `Edit` / `Write` / `NotebookEdit` tool call, the hook fires `standarflow file attach-touched <path>`. The CLI :
  - exits 0 silently if no session is focused for `claude-code`
  - canonicalises the path
  - skips noise paths (`target/`, `node_modules/`, `dist/`, `.git/`, `.standarflow/`, `.standardoc/`, `.next/`, `.nuxt/`, files ending in `.lock` / `.tsbuildinfo` / `.log` / `.tmp` / `.swp`)
  - infers a role (`memory` for `~/.claude/projects/*/memory/*`, `source` otherwise)
  - upserts a `file_ref` on the focused session (idempotent on `(session_id, path)`)
  - inserts a `turn_log` row tagging the kind (`edit` / `write` / `notebook`) for later drain
- At the end of each turn, `Stop` fires `standarflow turn drain`. The CLI :
  - reads pending `turn_log` entries for `claude-code`
  - groups them by kind and de-dupes paths
  - appends a `## Turn YYYY-MM-DD HH:MM:SS UTC` block to the focused session's `body_md` with one bullet per `kind path`
  - bumps `updated_at` / `updated_by` on the session
  - clears the drained `turn_log` rows

If no focus is pinned, both hooks are no-ops — safe to leave wired up permanently.

---

## 3. Wire the hooks (other harnesses)

The CLI surface is the only contract :

```
standarflow file attach-touched <path> [--kind edit|write|notebook] [--role memory|note|source|attachment] [--client <name>]
standarflow turn drain [--client <name>] [--dry-run]
standarflow session focus --group <g> --slug <s>
standarflow session unfocus
standarflow session focused [--client <name>]
```

Any harness that can shell-out on tool events can map its tool names to these commands. Examples :

- **Cursor** — use its `tool_calls.post` hook (when stable) with `STANDARFLOW_CLIENT=cursor`.
- **Aider** / custom agents — wrap the file-edit code path to call `standarflow file attach-touched`.
- **Manual** — call from your own shell when you want to log a touch (`standarflow file attach-touched ./src/foo.rs`).

---

## 4. Inspecting the result

The focused session's webview viewer (`Standarflow: Open Session`) shows :

- The auto-attached files in the **Attached files** panel — preview `.md` inline, click to navigate in-webview.
- The cumulative `## Turn …` blocks rolled up into the `body_md`.
- The `updated_at` / `updated_by` tag in the header, reflecting the last drain.

The CLI exposes :

```
standarflow turn drain --dry-run   # preview what the next drain would write, without touching the body
standarflow session focused        # prints "group/slug" or empty
```

---

## 5. Running multiple instances in the same workspace

The focused session is stored in the DB **per `client_name`** ([`session_focus.client_name`](../../../crates/standarflow-core/migrations/V4__session_focus.sql) is the primary key). By default :

- The VSCode extension identifies itself as `standarflow-vscode:<workspace-folder-name>` (auto-derived from `vscode.workspace.workspaceFolders[0]` basename).
- The Claude Code MCP client identifies as `claude-code`.
- The CLI identifies as `cli` (or `$STANDARFLOW_CLIENT` if set).

If you run **two Claude Code chats in the same workspace** they share the same DB *and* the same `client_name = "claude-code"`, so they collide on a single focus row.

To get independent focus rows per instance, override the label via `STANDARFLOW_CLIENT` :

```json
// settings.json for the "infra" chat
{
  "mcpServers": {
    "standarflow": {
      "command": "standarflow",
      "args": ["mcp"],
      "env": { "STANDARFLOW_CLIENT": "claude-code:standarflow-dev:infra" }
    }
  },
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write|NotebookEdit",
        "hooks": [
          {
            "type": "command",
            "command": "standarflow file attach-touched \"${tool_input.file_path}\" --kind ${tool_name} --client \"claude-code:standarflow-dev:infra\""
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "standarflow turn drain --client \"claude-code:standarflow-dev:infra\""
          }
        ]
      }
    ]
  }
}

// settings.json for the "frontend" chat — same shape, just swap the label
// in three places: mcpServers.standarflow.env, PostToolUse hook --client,
// Stop hook --client. The label is the full focus key — keep it consistent
// across the three or the agent will read one row and the hooks will write
// to another.
```

**Use the extension's command** `Standarflow: Generate Claude Code .mcp.json Snippet…` to produce a ready-to-paste snippet with a consistent label across all three places. It prompts for a group + chat label and outputs the full mcpServers + hooks block in jsonc.

Both the MCP server (used by `session_focus` / `session_focused` etc.) and the CLI (used by `standarflow file attach-touched` / `standarflow turn drain` from your hooks) read `STANDARFLOW_CLIENT` (env) or `--client` (CLI flag) so labels stay consistent between live calls and hook calls.

For VSCode windows, override via the `standarflow.clientLabel` setting (per-window with [Workspace settings](https://code.visualstudio.com/docs/getstarted/settings#_settings-precedence) or globally with User settings). Empty value = the auto-derived `standarflow-vscode:<workspace>` default.

## 6. The rule about autonomous writes

This automation is the **single sanctioned exception** to the "no autonomous session writes" rule. The agent itself (Claude) still never calls `session_save` / `session_update` on its own initiative. The hook scripts do — and the hook config is the user's explicit, persistent delegation. Read [[feedback_session_creation]] for the underlying intent.

If you want to fully disable the auto-write side temporarily, drop the `Stop` hook ; the `PostToolUse` hook will keep auto-attaching files (which is structural state, not narrative) but no `body_md` updates will happen.
