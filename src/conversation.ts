import type { Conversation } from "./mcpClient";

/// A conversation turns "ghost" once its agent process has stayed live but
/// silent — exactly one hook event ever, i.e. first_seen == last_seen — for
/// longer than this. A real chat fires a second event the moment it is used,
/// so only a process that opened and was never touched trips the threshold.
const GHOST_SILENT_SECONDS = 300;

/// A live agent process with no activity since its SessionStart — a stray
/// Claude Code agent (e.g. one a VSCode reload spawned and abandoned), safe
/// to kill. The threshold keeps a freshly opened, not-yet-used chat — which
/// looks identical until its first event — from being mistaken for one.
export function isGhost(c: Conversation): boolean {
  if (!c.is_live || c.ended_at !== null) return false;
  if (c.first_seen_at !== c.last_seen_at) return false;
  return Date.now() / 1000 - c.last_seen_at > GHOST_SILENT_SECONDS;
}
