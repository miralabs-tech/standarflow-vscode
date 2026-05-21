[Français](../fr/automation.md) · [↑ Documentation](../README.md)

# Automation — let your AI agent feed standarflow

With Claude Code hooks installed, standarflow tracks your AI work on its own:
every chat becomes a **conversation**, and the files each turn touches are
recorded. Focus a conversation on a session and those file changes attach to
that session automatically — no manual bookkeeping.

> The hook setup below is Claude Code-specific. The standarflow side is
> provider-agnostic — `standarflow ingest` is the contract any harness can
> feed.

## 1. Install the hooks

Run **`Standarflow: Install Claude Code Hooks`** from the command palette and
pick a scope:

| Scope | Writes | Captures |
| --- | --- | --- |
| This workspace only | `.claude/settings.local.json` (git-ignored) | only this workspace |
| All projects | `~/.claude/settings.json` | every workspace on the machine |

The command runs `standarflow hooks install` under the hood. It is idempotent,
backs up the file it edits, and preserves any hooks you already have.

It wires hooks on six Claude Code events — `SessionStart`, `UserPromptSubmit`,
`PreToolUse`, `PostToolUse`, `Stop`, `SessionEnd` — all calling
`standarflow ingest`. The ingest pipeline records each conversation and the
file mutations it makes.

## 2. Focus a conversation on a session

Tracking only attaches file changes once a conversation is **focused** on a
session. Focus from either side of the tree:

| From | Command |
| --- | --- |
| A session / artefact | Right-click → **Focus a Conversation Here**, pick a live conversation |
| A conversation | Right-click → **Focus Conversation on Session…**, pick a session |
| A conversation with no focus yet | Right-click → **Adopt Current Session** — one click, no picker |

To unpin: right-click the conversation → **Clear Conversation Focus**.

Each chat is its own conversation, identified by the stable id its provider
gives it — so focus survives restarts, and two chats in the same workspace
never collide on one another's focus.

Without a focus the hooks still track conversations, but nothing attaches to a
session. They are safe to leave installed permanently.

## 3. Inspect the result

Open a session in the webview viewer (`Standarflow: Open Session`, or click it
in the tree):

- **Conversations** panel — the chats that worked in this session, with touch
  counts.
- **File changes** panel — the file mutations attributed to this session.
- **Attached files** panel — files attached to the session, with inline `.md`
  preview.

Hook installation currently targets Claude Code (`--provider claude-code`).
Any other harness that can run a command on its lifecycle events can feed
standarflow by calling `standarflow ingest` the same way.
