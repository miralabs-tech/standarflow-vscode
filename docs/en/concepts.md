[Français](../fr/concepts.md) · [↑ Documentation](../README.md)

# Concepts

Standarflow gives your AI work a memory. Everything lives in one small SQLite
file — `${workspaceFolder}/.standarflow/standarflow.db` by default — shared by
the VS Code extension, the `standarflow` CLI, and any MCP-aware agent. Every
row remembers which client wrote it.

Here are the seven words worth knowing.

## Group

A folder. It namespaces your sessions, and groups can nest — `backend`,
`backend/auth` — so you can sort work by project, topic or agent. Delete a
group and everything inside it goes with it.

## Session

The core unit — a working notebook on one topic. A title, a markdown body, a
kind, a status. Think of it as the write-up of a single working session: what
got done, what is left.

## Artefact

A session tucked inside another session. Use it for a decision, a memo or a
note that belongs to a bigger session. Same shape as a session — same
commands, same viewer — just nested.

## File reference

A pointer from a session to a real file in your project. It stores the path, a
role (`memory`, `note`, `attachment`, `source`, or your own) and an optional
description — never the file's content. The file stays the source of truth on
disk; detaching a reference never deletes it.

## Link

A typed arrow between two sessions: `continues`, `supersedes`, `references`,
`fixes`, `relates_to`, or a relation you name. Saving a session that
*continues* another draws a `continues` link and flips the older one to
`superseded` — so a chain of sessions reads back as a history.

## Conversation

An AI chat — a Claude Code or Cursor session — known by the stable id its
provider gives it. Standarflow learns about conversations from hook events:
when one started, when it was last active, whether its agent process is still
alive.

## Focus

A pin from a conversation to a session. While a conversation is focused, the
files it touches (reported by hooks) attach to that session on their own.
Focus is per conversation, so two chats in the same workspace never get in
each other's way.

---

## Two more things

**Status** — a session moves through a lifecycle: `active`, `completed`,
`superseded`, `archived`, `paused`. `superseded` is set for you when another
session continues it.

**Kind** — free text describing what a session *is*: `session` (the default),
`adr`, `note`, `memory`, `design`, `debug`, `spec`, or anything you like.

New here? The [README](../../README.md) quick start walks you through your
first group, session and hook setup in a couple of minutes.
