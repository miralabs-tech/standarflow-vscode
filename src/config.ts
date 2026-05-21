import * as path from "node:path";
import * as vscode from "vscode";

export interface StandarflowConfig {
  binPath: string;
  dbPath: string;
  autoRefreshMs: number;
}

export function readConfig(): StandarflowConfig {
  const cfg = vscode.workspace.getConfiguration("standarflow");
  return {
    binPath: cfg.get<string>("binPath")?.trim() || "",
    dbPath: resolveDbPath(cfg.get<string>("dbPath")?.trim() || ""),
    autoRefreshMs: cfg.get<number>("autoRefreshMs") ?? 0,
  };
}

function resolveDbPath(raw: string): string {
  if (raw) {
    return raw;
  }
  const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!root) {
    throw new Error("standarflow: no workspace folder open and no standarflow.dbPath set");
  }
  return path.join(root, ".standarflow", "standarflow.db");
}
