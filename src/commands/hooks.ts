import { execFile } from "node:child_process";
import * as vscode from "vscode";

function runCli(binPath: string, args: string[]): Promise<string> {
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

/// Install the standarflow ingest hooks into the user's Claude Code settings
/// by running `standarflow hooks install`. Idempotent and backed up by the CLI.
export async function installClaudeHooks(binPath: string): Promise<void> {
  const confirm = await vscode.window.showInformationMessage(
    "Install standarflow ingest hooks into ~/.claude/settings.json?",
    {
      modal: true,
      detail:
        "Adds SessionStart / UserPromptSubmit / PreToolUse / PostToolUse / Stop / SessionEnd hooks that pipe events to `standarflow ingest`. Existing hooks are preserved; a backup is written. Re-running is a no-op.",
    },
    "Install",
  );
  if (confirm !== "Install") return;
  try {
    const out = await runCli(binPath, ["hooks", "install", "--provider", "claude-code"]);
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
