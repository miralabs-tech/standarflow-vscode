# Data model

```
group
 ├─ group (nested, ON DELETE CASCADE)
 └─ session
     ├─ session (artefact — parent_session_id, ON DELETE CASCADE)
     ├─ file_ref (ON DELETE CASCADE)
     └─ session_link (from_id / to_id, ON DELETE CASCADE on either side)
```

Standarflow is intentionally small. Five tables, one SQLite file, no servers.

## `groups`

Namespaces for sessions. A group has a `slug`, a display `name`, an optional `parent_id` (groups can nest, e.g. `backend/auth`), and `created_at` / `created_by`.

- Unique by `slug` at the root, and by `(parent_id, slug)` for nested groups.
- Deleting a group cascades to nested groups, sessions, artefacts, file_refs and links.

## `sessions`

The fundamental row. A `session` is a temporal container — typically a markdown body that describes what was done in a single working session.

| Column | Notes |
| --- | --- |
| `id` | primary key |
| `group_id` | FK → `groups.id` (cascading) |
| `parent_session_id` | nullable FK → `sessions.id`. When set, the row is an **artefact** of its parent (nested in the tree). |
| `slug` | unique within the group |
| `body_md` | the markdown body |
| `kind` | free text: `session` (default), `adr`, `note`, `memory`, `design`, `debug`, `spec`, … |
| `status` | `active` / `superseded` / `archived` (CHECK constraint) |
| `created_at`, `created_by` | wall time + MCP client name from `initialize` |
| `updated_at`, `updated_by` | bumped on every `session_update` call (added in V3) |

Artefacts are just sessions with a non-null `parent_session_id`. There’s no separate table — that keeps the schema small and the queries straightforward.

## `file_refs`

External-file pointers attached to a session. They store the canonical path (not the content), so the file stays the source of truth on disk.

| Column | Notes |
| --- | --- |
| `id` | primary key |
| `session_id` | FK → `sessions.id` (cascading) |
| `path` | canonical absolute path |
| `role` | `memory` / `note` / `attachment` / `source` / custom |
| `description` | optional |
| `created_at`, `created_by` | wall time + MCP client name |

Unique by `(session_id, path)` — attaching the same path again upserts the role / description / created_by.

`Detach` removes the row only. `Delete with source` removes the file on disk *and* detaches.

## `session_links`

Typed edges between two sessions.

| Column | Notes |
| --- | --- |
| `(from_id, to_id, relation)` | composite primary key |
| `relation` | `continues` / `supersedes` / `references` / `fixes` / `relates_to` / custom |

`continues` is special-cased by `session_save`: when you save a session with `continues_slug = X`, the new session gets a `continues` link to the previous one, and the previous one’s `status` flips to `superseded`. The chain is walkable both ways.

## `usage_stats`

An internal table for the binary’s own telemetry. Not surfaced in the extension.

## Why this shape

- **Sessions reused as artefacts**: keeps one table, one set of MCP tools, one webview renderer.
- **`status` enum**: explicit lifecycle replaces a soft-delete boolean and lets `latest_in_group` skip superseded rows naturally.
- **`created_by` everywhere**: lets multiple clients share a workspace without stepping on each other; combined with `Claim`, ownership can be transferred when a row outlives the client that wrote it.
- **`updated_at` / `updated_by` on sessions only**: rows that mutate are sessions; groups, links and file_refs are mostly write-once (the file_ref `claim` operation is the exception, but ownership transfer doesn’t deserve its own audit column).

## Schema migration history

| Version | Adds |
| --- | --- |
| **V1** | `schema_meta`, `groups`, `sessions`, `session_links`, `file_refs`, `usage_stats` + indices |
| **V2** | `created_by` columns on `groups`, `sessions`, `file_refs` + partial indices |
| **V3** | `updated_at`, `updated_by` on `sessions` (backfilled from `created_*`) + indices |
