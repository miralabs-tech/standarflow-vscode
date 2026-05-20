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
  if (existing.mcpServers.standarflow) {
    return { kind: "already-present", path: mcpPath };
  }
  existing.mcpServers.standarflow = standarflowEntry;
  await vscode.workspace.fs.writeFile(
    fileUri,
    new TextEncoder().encode(`${JSON.stringify(existing, null, 2)}\n`),
  );
  return { kind: "added", path: mcpPath };
}
