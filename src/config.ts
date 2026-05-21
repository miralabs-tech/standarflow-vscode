import { existsSync } from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

export interface StandarflowConfig {
  binPath: string;
  dbPath: string;
  autoRefreshMs: number;
}

export function readConfig(extensionPath: string): StandarflowConfig {
  const cfg = vscode.workspace.getConfiguration("standarflow");
  return {
    binPath: resolveBinPath(cfg.get<string>("binPath")?.trim() || "", extensionPath),
    dbPath: resolveDbPath(cfg.get<string>("dbPath")?.trim() || ""),
    autoRefreshMs: cfg.get<number>("autoRefreshMs") ?? 0,
  };
}

function resolveBinPath(raw: string, extensionPath: string): string {
  if (raw) {
    return raw;
  }
  const exe = process.platform === "win32" ? "standarflow.exe" : "standarflow";
  const bundled = path.join(extensionPath, "dist", "bin", exe);
  if (existsSync(bundled)) {
    return bundled;
  }
  return exe;
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
