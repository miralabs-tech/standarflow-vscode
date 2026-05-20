# Commands reference

Every command is also available from the **command palette** (`Ctrl+Shift+P`) prefixed with `Standarflow: `. The list below is grouped by intent. The “Where” column tells you which tree node exposes the command in its right-click menu.

## Workspace

| Command | What it does | Where |
| --- | --- | --- |
| `Standarflow: Open Settings` | Opens the `standarflow.*` settings page | palette |
| `Standarflow: Reconnect` | Disposes and re-creates the MCP client | palette |
| `Standarflow: Disconnect` | Closes the MCP client | palette |
| `Standarflow: Show Workspace Info` | Pops up DB path, schema version, counts | palette |
| `Standarflow: Refresh Tree` | Re-fetches the tree | tree title bar |
| `Standarflow: Generate .mcp.json` | Writes (or appends) a Standarflow entry into `${workspaceFolder}/.mcp.json` so other MCP-aware agents can connect | palette |
| `Standarflow: Delete Database` | Removes the SQLite file (and its `-wal` / `-shm`); reconnect creates a fresh one | palette |

## Groups

| Command | What it does | Where |
| --- | --- | --- |
| `Standarflow: Create Group` | New group at root, under an existing parent, or under the selected group node | palette · tree title · context on a `group` node |
| `Standarflow: Delete Group` | Confirms then removes the group; sessions, artefacts, file_refs and links are deleted via cascade. **Files on disk are not removed.** | context on a `group` node |

## Sessions & artefacts

A “session” is a top-level temporal container. An “artefact” is a session whose `parent_session_id` points at another session (so it nests in the tree). The same commands work on both because they share the same row shape.

| Command | What it does | Where |
| --- | --- | --- |
| `Standarflow: Save Session` | New session in the chosen group. If a session is selected in the tree, offers to chain after it (`continues` link + supersedes the previous one). Uses the active markdown editor or an inline input for the body. | palette · context on a group / session / artefact node |
| `Standarflow: Edit Session Body` | Opens the current body in an untitled markdown editor; on confirm, the body is patched back via `session_update`. The webview viewer has the same edit button inline. | context on a session / artefact |
| `Standarflow: Rename Session` | Changes the slug (validates `^[a-z0-9][a-z0-9_\-]*$`) | context on a session / artefact |
| `Standarflow: Change Session Kind` | Free-text kind (`session`, `adr`, `note`, `memory`, `design`, `debug`, `spec`, …) | context on a session / artefact |
| `Standarflow: Change Session Status` | QuickPick between `active` / `superseded` / `archived` | context on a session / artefact |
| `Standarflow: Move Session to Group` | Re-parents the row under a different group | context on a session / artefact |
| `Standarflow: Reparent Session` | Picks a sibling session as the new parent, or “top-level” to clear it (turn an artefact back into a session, or vice-versa) | context on a session / artefact |
| `Standarflow: Delete Session` | Hard delete. Cascades to artefacts, file_refs, links. Files on disk are not removed. | context on a session / artefact |
| `Standarflow: Focus Session` | Pins the session as the active target for `claude-code` / `cursor` / `cli` hooks — every file touched by your AI agent will auto-attach here. See [`automation.md`](./automation.md) for the hook setup. | context on a session / artefact · palette |
| `Standarflow: Clear Focus` | Drops the current client's focus pointer; hooks become no-ops. | palette · status bar |
| `Standarflow: Pick Focus Session…` | Quick-pick wrapper around the focus commands. Also invoked by clicking the `$(target)` status bar item. | palette · status bar |

Clicking a session or artefact in the tree opens the **webview viewer** in a new tab. The viewer renders the body markdown, lists attached files with inline `.md` preview, and shows incoming / outgoing links. The toolbar has an **Edit body** button that round-trips through `session_update`.

## File references

| Command | What it does | Where |
| --- | --- | --- |
| `Standarflow: Attach File to Session` | Picks a file via the open dialog and attaches it with a role (`memory` / `note` / `attachment` / `source` / custom) and optional description | palette · context on a session / artefact |
| `Standarflow: Import Memory Folder` | Walks a directory, attaches every file matching an extension (defaults to `.md`) with role `memory`. Provider-agnostic. | palette · context on a session / artefact |
| `Standarflow: Claim File Reference` | Sets the `created_by` of a file_ref to the current MCP client (the extension). Useful when a row was attached by another agent and you want to take ownership. | context on a fileRef |
| `Standarflow: Detach File Reference` | Removes the file_ref from the DB. **The file on disk is not touched.** | context on a fileRef |
| `Standarflow: Delete File Reference and Source` | Deletes the file on disk *and* detaches the row. Double-confirmation modal. If the file is already missing, the row is detached anyway. | context on a fileRef |
