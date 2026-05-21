[Français](../fr/settings.md) · [↑ Documentation](../README.md)

# Settings

Three settings, all under the `standarflow.*` prefix. Edit them from
`Standarflow: Open Settings` or straight in `settings.json`. Changing any of
them reconnects the extension automatically — no window reload.

## `standarflow.binPath`

Where the `standarflow` binary lives.

- **Empty (default)** — the extension downloads the binary for your platform
  on first run and caches it. If that download ever fails, it falls back to a
  `standarflow` on your `PATH`.
- **Set it** when you have your own build and want the extension to use it —
  give the absolute path to the binary.

## `standarflow.dbPath`

Where the SQLite database file lives.

- **Empty (default)** — `${workspaceFolder}/.standarflow/standarflow.db`.
- **Set it** to share one database across several workspaces, or to keep the
  database outside the project tree. The parent folder is created on first
  connect.

## `standarflow.autoRefreshMs`

How often the tree refreshes itself, in milliseconds.

- **`0` (default)** — no auto-refresh; use `Standarflow: Refresh Tree` when you
  want an update.
- **Set it** (e.g. `2000`–`5000`) when another agent writes to the same
  database in parallel and you want its changes to surface on their own. Lower
  is wasteful, higher defeats the point.
