# Settings

All settings live under the `standarflow.*` prefix and can be edited from `Standarflow: Open Settings` or directly in `settings.json`.

## `standarflow.binPath`

- **Default**: `""` (empty)
- **What it does**: path to the `standarflow` binary the extension spawns over stdio for MCP.
- **Resolution order** when empty:
  1. Binary bundled inside the extension (`dist/bin/standarflow[.exe]`)
  2. `standarflow` on `PATH`
- **When to override**: when you build the binary yourself (`cargo build --release -p standarflow-cli`) and want the extension to use that build instead of the bundled one. Useful while developing the core crate.

## `standarflow.dbPath`

- **Default**: `""` (empty)
- **What it does**: absolute path to the SQLite database file.
- **Resolution when empty**: `${workspaceFolder}/.standarflow/standarflow.db`.
- **When to override**: when you want several workspaces to share a single DB, or to put the DB outside the project tree (e.g. on a synced drive). The path’s parent directory is created on first connect.

## `standarflow.defaultGroup`

- **Default**: `""` (empty)
- **What it does**: slug path of the group to focus by default in the tree (e.g. `backend/auth`).
- **When to set**: when you have many top-level groups and want to land on a specific one whenever the extension boots.

## `standarflow.autoRefreshMs`

- **Default**: `0` (disabled)
- **What it does**: interval, in milliseconds, at which the tree and the workspace status bar refresh themselves to surface writes made by other clients.
- **When to set**: when you run Claude Code or another MCP agent in parallel and want to see their inserts show up without having to hit `Standarflow: Refresh Tree` manually. `2000`–`5000` is a reasonable range; lower values waste CPU, higher values defeat the purpose.

## Reload behavior

Changing any `standarflow.*` setting triggers a disconnect + reconnect automatically — no window reload required.
