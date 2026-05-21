[Français](../fr/commands.md) · [↑ Documentation](../README.md)

# Commands

You never have to memorise these. Open the command palette (`Ctrl+Shift+P`),
type `Standarflow:`, and browse — or right-click a node in the tree. This page
is the full map, grouped by what you're trying to do. The **Where** column
tells you which tree node exposes each command in its right-click menu.

## Workspace

| Command | What it does | Where |
| --- | --- | --- |
| `Standarflow: Actions` | Opens a quick-pick of the common Standarflow actions | palette |
| `Standarflow: Open Settings` | Opens the `standarflow.*` settings page | palette |
| `Standarflow: Reconnect` | Disposes and re-creates the MCP client | palette |
| `Standarflow: Disconnect` | Closes the MCP client | palette |
| `Standarflow: Show Workspace Info` | Pops up the DB path, schema version and row counts | palette |
| `Standarflow: Refresh Tree` | Re-fetches the tree | tree title bar |
| `Standarflow: Reveal Current Session` | Selects and reveals the workspace's current session in the tree | tree title bar |
| `Standarflow: Hide / Show Superseded Sessions` | Toggles whether superseded sessions appear in the tree | tree title bar |
| `Standarflow: Delete Database` | Deletes the SQLite file (and its `-wal` / `-shm`); reconnecting creates a fresh one | palette |

## Groups

| Command | What it does | Where |
| --- | --- | --- |
| `Standarflow: Create Group` | New group — at the root, or nested under the selected group | palette · tree title · `group` node |
| `Standarflow: Delete Group` | Removes the group; nested groups, sessions, artefacts, file references and links cascade. **Files on disk are not removed.** | `group` node |

## Sessions & artefacts

A **session** is a top-level working notebook. An **artefact** is a session
nested under another session. The same commands apply to both — see
[concepts](./concepts.md).

| Command | What it does | Where |
| --- | --- | --- |
| `Standarflow: Save Session` | New session in the chosen group. If a session is selected, offers to chain after it (a `continues` link that supersedes the previous one). The body comes from the active markdown editor or an inline input. | palette · `group` / `session` node |
| `Standarflow: Open Session` | Opens the session in the webview viewer | palette · click in the tree |
| `Standarflow: Edit Session Body` | Opens the body in an untitled markdown editor; on save it is patched back | `session` / `artefact` node |
| `Standarflow: Rename Session` | Changes the slug | `session` / `artefact` node |
| `Standarflow: Change Session Kind` | Sets the kind — `session`, `adr`, `note`, `memory`, `design`, … (free text) | `session` / `artefact` node |
| `Standarflow: Change Session Status` | Picks `active` / `completed` / `superseded` / `archived` / `paused` | `session` / `artefact` node |
| `Standarflow: Move Session to Group` | Re-parents the session under a different group | `session` / `artefact` node |
| `Standarflow: Reparent Session` | Picks a new parent session, or “top-level” to clear it — turns a session into an artefact or back | `session` / `artefact` node |
| `Standarflow: Delete Session` | Hard delete. Cascades to artefacts, file references and links. Files on disk are not removed. | `session` / `artefact` node |

Clicking a session or artefact opens the **webview viewer**: the rendered
body, attached files with inline `.md` preview, incoming / outgoing links, and
two audit panels — **Conversations** (which chats touched it) and **File
changes**.

## Conversations & focus

A **conversation** is an AI chat. **Focus** pins a conversation onto a
session: once focused, the files that conversation touches via hooks attach to
that session. See [automation](./automation.md).

| Command | What it does | Where |
| --- | --- | --- |
| `Standarflow: Focus a Conversation Here` | From a session, pick a live conversation to focus on it | `session` / `artefact` node |
| `Standarflow: Focus Conversation on Session…` | From a conversation, pick the session to focus it on | `conversation` node · palette |
| `Standarflow: Adopt Current Session` | One-click focus of a conversation on the workspace's current session | unfocused `conversation` node |
| `Standarflow: Clear Conversation Focus` | Drops a conversation's focus pointer | focused `conversation` node |
| `Standarflow: Rename Conversation` | Gives a conversation a human-friendly label | `conversation` node |
| `Standarflow: Kill Conversation Agent` | Stops the agent process behind a conversation | `conversation` node |
| `Standarflow: Kill Ghost Conversation Agents` | Stops every “ghost” agent — live but silent since it started | conversations root node |

## File references

| Command | What it does | Where |
| --- | --- | --- |
| `Standarflow: Attach File to Session` | Picks a file and attaches it with a role (`memory` / `note` / `attachment` / `source` / custom) and an optional description | palette · `session` node |
| `Standarflow: Import Memory Folder` | Walks a folder and attaches every file matching an extension (default `.md`) with role `memory` | palette · `session` node |
| `Standarflow: Claim File Reference` | Sets the file reference's `created_by` to this extension | `fileRef` node |
| `Standarflow: Detach File Reference` | Removes the file reference. **The file on disk is not touched.** | `fileRef` node |
| `Standarflow: Delete File Reference and Source` | Deletes the file on disk **and** detaches the reference. Double-confirmation. | `fileRef` node |

## Copy to clipboard

| Command | What it does | Where |
| --- | --- | --- |
| `Standarflow: Copy Session Reference` | Copies `group/path/slug` | `session` / `artefact` node |
| `Standarflow: Copy Session Slug` | Copies the slug | `session` / `artefact` node |
| `Standarflow: Copy Group Path` | Copies the group path | `group` · `session` / `artefact` node |
| `Standarflow: Copy File Path` | Copies the file reference's path | `fileRef` node |

## Wiring AI agents

| Command | What it does | Where |
| --- | --- | --- |
| `Standarflow: Generate .mcp.json` | Writes (or appends) a Standarflow MCP server entry into `${workspaceFolder}/.mcp.json`, so Claude Code / Cursor / any MCP-aware agent reads the same DB | palette |
| `Standarflow: Install Claude Code Hooks` | Runs `standarflow hooks install` to wire Claude Code hooks — pick **this workspace** or **all projects**. Every chat's activity then flows into standarflow. See [automation](./automation.md). | palette |
