import * as path from "node:path";
import * as vscode from "vscode";
import { registerCommands } from "./commands";
import { installClaudeHooks } from "./commands/hooks";
import { readConfig } from "./config";
import { generateMcpConfig } from "./mcpConfig";
import { StandarflowClient, type WorkspaceInfo } from "./mcpClient";
import { StandarflowStatusBar } from "./statusBar";
import { StandarflowTreeProvider } from "./treeProvider";
import { SessionWebviewHost } from "./webview/host";
import { probeWorkspace } from "./workspace";

let client: StandarflowClient | undefined;
let statusBar: StandarflowStatusBar | undefined;
let treeProvider: StandarflowTreeProvider | undefined;
let webviewHost: SessionWebviewHost | undefined;
let autoRefreshTimer: NodeJS.Timeout | undefined;
let lastInfo: WorkspaceInfo | undefined;
let extensionPath = "";
let dbWatchers: vscode.Disposable[] = [];
let syncDebounce: NodeJS.Timeout | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  extensionPath = context.extensionPath;
  statusBar = new StandarflowStatusBar();
  context.subscriptions.push(statusBar);

  treeProvider = new StandarflowTreeProvider(() => client);
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("standarflow.tree", treeProvider),
  );

  webviewHost = new SessionWebviewHost(context.extensionUri, () => client);
  context.subscriptions.push(webviewHost);

  context.subscriptions.push(
    vscode.commands.registerCommand("standarflow.openSettings", () => {
      void vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "standarflow",
      );
    }),
    vscode.commands.registerCommand("standarflow.reconnect", async () => {
      await disconnect();
      await connect();
    }),
    vscode.commands.registerCommand("standarflow.refreshTree", () => {
      treeProvider?.refresh();
    }),
    vscode.commands.registerCommand("standarflow.showWorkspaceInfo", async () => {
      if (!client) {
        void vscode.window.showWarningMessage(
          "Standarflow is not connected. Run \"Standarflow: Reconnect\".",
        );
        return;
      }
      try {
        const info = await client.workspaceInfo();
        lastInfo = info;
        statusBar?.set({ kind: "ready", info });
        void vscode.window.showInformationMessage(
          `DB ${info.db_path} · schema v${info.schema_version} · ${info.groups_count} groups · ${info.sessions_count} sessions · ${info.file_refs_count} file refs${info.first_run ? " · first run" : ""}`,
        );
      } catch (e) {
        void vscode.window.showErrorMessage(`standarflow: ${(e as Error).message}`);
      }
    }),
    vscode.commands.registerCommand(
      "standarflow.openSession",
      async (groupPath: string, slug: string) => {
        if (!webviewHost) return;
        await webviewHost.show(groupPath, slug);
      },
    ),
    vscode.commands.registerCommand("standarflow.disconnect", async () => {
      await disconnect();
      void vscode.window.showInformationMessage("Standarflow disconnected.");
    }),
    vscode.commands.registerCommand("standarflow.installClaudeHooks", async () => {
      const cfg = readConfig(extensionPath);
      await installClaudeHooks(cfg.binPath);
    }),
    vscode.commands.registerCommand("standarflow.generateMcpConfig", async () => {
      const folder = vscode.workspace.workspaceFolders?.[0];
      if (!folder) {
        void vscode.window.showWarningMessage(
          "Open a workspace folder first to generate .mcp.json.",
        );
        return;
      }
      const cfg = readConfig(extensionPath);
      try {
        const result = await generateMcpConfig(folder, cfg.binPath);
        switch (result.kind) {
          case "created":
            void vscode.window.showInformationMessage(
              `Created ${result.path} with standarflow entry.`,
            );
            break;
          case "added":
            void vscode.window.showInformationMessage(
              `Added standarflow entry to ${result.path}.`,
            );
            break;
          case "already-present":
            void vscode.window.showInformationMessage(
              `${result.path} already has a standarflow entry — left untouched.`,
            );
            break;
        }
      } catch (e) {
        void vscode.window.showErrorMessage(
          `standarflow: ${(e as Error).message}`,
        );
      }
    }),
    vscode.commands.registerCommand("standarflow.deleteDb", async () => {
      const cfg = readConfig(extensionPath);
      const confirm = await vscode.window.showWarningMessage(
        `Delete the standarflow database at ${cfg.dbPath}?`,
        {
          modal: true,
          detail:
            "All groups, sessions, artefacts, file_refs and links will be permanently lost. Files on disk that were referenced are NOT deleted.",
        },
        "Delete",
      );
      if (confirm !== "Delete") {
        return;
      }
      await disconnect();
      try {
        await deleteWithRetry(vscode.Uri.file(cfg.dbPath));
        await deleteSidecar(cfg.dbPath, "-wal");
        await deleteSidecar(cfg.dbPath, "-shm");
        await deleteSidecar(cfg.dbPath, "-journal");
        void vscode.window.showInformationMessage(
          "Standarflow database deleted. Reconnecting will create a fresh one.",
        );
        await connect();
      } catch (e) {
        void vscode.window.showErrorMessage(
          `Failed to delete database: ${(e as Error).message}`,
        );
        await connect();
      }
    }),
    vscode.workspace.onDidChangeConfiguration(async (e) => {
      if (e.affectsConfiguration("standarflow")) {
        await disconnect();
        await connect();
      }
    }),
  );

  registerCommands(context, {
    getClient: () => client,
    refreshTree: () => treeProvider?.refresh(),
    refreshFocus,
  });

  await connect();
}

async function deleteWithRetry(
  uri: vscode.Uri,
  attempts = 8,
  delayMs = 150,
): Promise<void> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      await vscode.workspace.fs.delete(uri);
      return;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

async function deleteSidecar(dbPath: string, suffix: string): Promise<void> {
  try {
    await vscode.workspace.fs.delete(vscode.Uri.file(`${dbPath}${suffix}`));
  } catch {
    // ignore: sidecars only exist when SQLite was active
  }
}

function scheduleDbSync(): void {
  if (syncDebounce) clearTimeout(syncDebounce);
  syncDebounce = setTimeout(() => {
    syncDebounce = undefined;
    treeProvider?.refresh();
    void refreshFocus();
    void webviewHost?.refreshAll();
    if (client) {
      void client.workspaceInfo().then((info) => {
        lastInfo = info;
        statusBar?.set({ kind: "ready", info });
      });
    }
  }, 300);
}

function disposeDbWatchers(): void {
  for (const d of dbWatchers) {
    try {
      d.dispose();
    } catch {
      // ignore
    }
  }
  dbWatchers = [];
  if (syncDebounce) {
    clearTimeout(syncDebounce);
    syncDebounce = undefined;
  }
}

function installDbWatcher(dbPath: string): void {
  disposeDbWatchers();
  if (!dbPath) return;
  const dir = path.dirname(dbPath);
  const base = path.basename(dbPath);
  // Watch the main file and the WAL sidecar. SQLite in WAL mode bumps
  // `-wal` on every write; the main file is mutated on checkpoint.
  const dirUri = vscode.Uri.file(dir);
  const targets = [base, `${base}-wal`, `${base}-shm`];
  for (const t of targets) {
    const watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(dirUri, t),
    );
    watcher.onDidChange(scheduleDbSync);
    watcher.onDidCreate(scheduleDbSync);
    watcher.onDidDelete(scheduleDbSync);
    dbWatchers.push(watcher);
  }
}

async function refreshFocus(): Promise<void> {
  if (!client || !statusBar) return;
  try {
    const focuses = await client.focusList();
    // Count only focus rows whose conversation is still live — dead chats
    // keep their focus row in the DB as history but must not inflate the badge.
    statusBar.setFocusCount(focuses.filter((f) => f.is_live).length);
  } catch {
    // Older binaries don't expose focus_list yet — hide the item
    // instead of erroring out.
    statusBar.hideFocus();
  }
}

async function connect(): Promise<void> {
  if (!statusBar) {
    return;
  }
  statusBar.set({ kind: "connecting" });
  try {
    const cfg = readConfig(extensionPath);
    client = new StandarflowClient();
    await client.connect(cfg.binPath, cfg.dbPath);
    const info = await probeWorkspace(client);
    lastInfo = info;
    statusBar.set({ kind: "ready", info });
    await refreshFocus();
    treeProvider?.refresh();
    installDbWatcher(cfg.dbPath);
    scheduleAutoRefresh(cfg.autoRefreshMs);
  } catch (e) {
    const message = (e as Error).message;
    statusBar.set({ kind: "error", message });
    const action = await vscode.window.showErrorMessage(
      `Standarflow failed to start: ${message}`,
      "Open settings",
      "Retry",
    );
    if (action === "Open settings") {
      void vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "standarflow",
      );
    } else if (action === "Retry") {
      await connect();
    }
  }
}

function scheduleAutoRefresh(ms: number): void {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = undefined;
  }
  if (ms > 0 && client) {
    autoRefreshTimer = setInterval(() => {
      treeProvider?.refresh();
      void client?.workspaceInfo().then((info) => {
        lastInfo = info;
        statusBar?.set({ kind: "ready", info });
      });
      void refreshFocus();
    }, ms);
  }
}

async function disconnect(): Promise<void> {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = undefined;
  }
  disposeDbWatchers();
  await client?.dispose();
  client = undefined;
  lastInfo = undefined;
  statusBar?.set({ kind: "disconnected" });
  statusBar?.hideFocus();
  treeProvider?.refresh();
}

export async function deactivate(): Promise<void> {
  await disconnect();
}

export function _getLastInfo() {
  return lastInfo;
}
