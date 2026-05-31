import * as path from "node:path";
import * as vscode from "vscode";

interface McpServerEntry {
  command?: string;
  args?: string[];
  type?: string;
  url?: string;
  env?: Record<string, string>;
}

interface McpConfig {
  mcpServers?: Record<string, McpServerEntry>;
}

export type GenerateOutcome =
  | { kind: "created"; path: string }
  | { kind: "added"; path: string }
  | { kind: "updated"; path: string; previousCommand?: string }
  | { kind: "already-present"; path: string };

export async function generateMcpConfig(
  workspaceFolder: vscode.WorkspaceFolder,
  binPath: string,
): Promise<GenerateOutcome> {
  const mcpPath = path.join(workspaceFolder.uri.fsPath, ".mcp.json");
  const fileUri = vscode.Uri.file(mcpPath);

  const standarflowEntry: McpServerEntry = {
    command: binPath,
    args: ["mcp"],
  };

  let existing: McpConfig | undefined;
  try {
    const raw = await vscode.workspace.fs.readFile(fileUri);
    const text = new TextDecoder().decode(raw);
    existing = text.trim() ? (JSON.parse(text) as McpConfig) : {};
  } catch {
    existing = undefined;
  }

  if (existing === undefined) {
    const next: McpConfig = { mcpServers: { standarflow: standarflowEntry } };
    await vscode.workspace.fs.writeFile(
      fileUri,
      new TextEncoder().encode(`${JSON.stringify(next, null, 2)}\n`),
    );
    return { kind: "created", path: mcpPath };
  }

  existing.mcpServers ??= {};
  const current = existing.mcpServers.standarflow;
  if (current && entryMatches(current, standarflowEntry)) {
    return { kind: "already-present", path: mcpPath };
  }
  const previousCommand = current?.command;
  existing.mcpServers.standarflow = standarflowEntry;
  await vscode.workspace.fs.writeFile(
    fileUri,
    new TextEncoder().encode(`${JSON.stringify(existing, null, 2)}\n`),
  );
  return current
    ? { kind: "updated", path: mcpPath, previousCommand }
    : { kind: "added", path: mcpPath };
}

// Silent sync at connect() time: only touches the file when the user has
// already opted in (file exists AND has a standarflow entry). Never creates
// the file or injects a standarflow entry into a workspace that didn't have one.
export async function syncMcpConfigIfPresent(
  workspaceFolder: vscode.WorkspaceFolder,
  binPath: string,
): Promise<GenerateOutcome | undefined> {
  const mcpPath = path.join(workspaceFolder.uri.fsPath, ".mcp.json");
  const fileUri = vscode.Uri.file(mcpPath);
  let existing: McpConfig | undefined;
  try {
    const raw = await vscode.workspace.fs.readFile(fileUri);
    const text = new TextDecoder().decode(raw);
    existing = text.trim() ? (JSON.parse(text) as McpConfig) : {};
  } catch {
    return undefined;
  }
  if (!existing.mcpServers?.standarflow) {
    return undefined;
  }
  return generateMcpConfig(workspaceFolder, binPath);
}

function entryMatches(a: McpServerEntry, b: McpServerEntry): boolean {
  return a.command === b.command && argsEqual(a.args, b.args);
}

function argsEqual(a: string[] | undefined, b: string[] | undefined): boolean {
  const aa = a ?? [];
  const bb = b ?? [];
  if (aa.length !== bb.length) return false;
  return aa.every((v, i) => v === bb[i]);
}
