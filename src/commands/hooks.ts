import { execFile } from "node:child_process";
import * as vscode from "vscode";

export function runCli(binPath: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(binPath, args, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(stderr.trim() || err.message));
        return;
      }
      resolve(stdout || stderr || "");
    });
  });
}

type ScopePick = vscode.QuickPickItem & { scope: "user" | "project-local" };

/// Install the standarflow ingest hooks by running `standarflow hooks install`.
/// The user picks the scope; project-local is offered first so it is the
/// default highlight. Idempotent and backed up by the CLI.
export async function installClaudeHooks(binPath: string): Promise<void> {
  const folder = vscode.workspace.workspaceFolders?.[0];

  const items: ScopePick[] = [];
  if (folder) {
    items.push({
      label: "$(folder) This workspace only",
      detail: `Writes ${folder.name}/.claude/settings.local.json — git-ignored, captures only this workspace`,
      scope: "project-local",
    });
  }
  items.push({
    label: "$(globe) All projects (global)",
    detail: "Writes ~/.claude/settings.json — captures every workspace on this machine",
    scope: "user",
  });

  const pick = await vscode.window.showQuickPick(items, {
    title: "Install standarflow ingest hooks",
    placeHolder:
      "SessionStart / UserPromptSubmit / PreToolUse / PostToolUse / Stop / SessionEnd → standarflow ingest",
  });
  if (!pick) return;

  const args = ["hooks", "install", "--provider", "claude-code", "--scope", pick.scope];
  if (pick.scope === "project-local" && folder) {
    args.push("--root", folder.uri.fsPath);
  }

  try {
    const out = await runCli(binPath, args);
    const doc = await vscode.workspace.openTextDocument({
      content: out.trim(),
      language: "plaintext",
    });
    await vscode.window.showTextDocument(doc, { preview: true });
    void vscode.window.showInformationMessage(
      "Standarflow Claude Code hooks installed.",
    );
  } catch (e) {
    void vscode.window.showErrorMessage(`standarflow: ${(e as Error).message}`);
  }
}
