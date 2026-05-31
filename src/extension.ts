import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import * as vscode from "vscode";
import { showActionsMenu } from "./actionsMenu";
import { ensureBinary, updateBinary } from "./binaryManager";
import { registerCommands } from "./commands";
import { installClaudeHooks, runCli } from "./commands/hooks";
import { readConfig } from "./config";
import { generateMcpConfig, syncMcpConfigIfPresent } from "./mcpConfig";
import { StandarflowClient, type WorkspaceInfo } from "./mcpClient";
import { StandarflowStatusBar } from "./statusBar";
import { StandarflowTreeProvider, type TreeNode } from "./treeProvider";
import { SessionWebviewHost } from "./webview/host";
import { probeWorkspace } from "./workspace";

let client: StandarflowClient | undefined;
let statusBar: StandarflowStatusBar | undefined;
let treeProvider: StandarflowTreeProvider | undefined;
let treeView: vscode.TreeView<TreeNode> | undefined;
let webviewHost: SessionWebviewHost | undefined;
let autoRefreshTimer: NodeJS.Timeout | undefined;
let lastInfo: WorkspaceInfo | undefined;
let extensionContext: vscode.ExtensionContext | undefined;
let dbWatchers: vscode.Disposable[] = [];
let syncDebounce: NodeJS.Timeout | undefined;
let lastSyncTs = 0;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  extensionContext = context;
  statusBar = new StandarflowStatusBar();
  context.subscriptions.push(statusBar);

  treeProvider = new StandarflowTreeProvider(() => client);
  treeView = vscode.window.createTreeView("standarflow.tree", {
    treeDataProvider: treeProvider,
    showCollapseAll: true,
  });
  context.subscriptions.push(treeView);
  void vscode.commands.executeCommand(
    "setContext",
    "standarflow.hideSuperseded",
    false,
  );

  webviewHost = new SessionWebviewHost(context.extensionUri, () => client);
  context.subscriptions.push(webviewHost);

  context.subscriptions.push(
    vscode.commands.registerCommand("standarflow.showActions", () =>
      showActionsMenu(),
    ),
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
    vscode.commands.registerCommand("standarflow.revealCurrentSession", () =>
      revealCurrentSession(),
    ),
    vscode.commands.registerCommand("standarflow.hideSuperseded", () => {
      setHideSuperseded(true);
    }),
    vscode.commands.registerCommand("standarflow.showSuperseded", () => {
      setHideSuperseded(false);
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
      await installClaudeHooks(await ensureBinary(context, readConfig().binPath));
    }),
    vscode.commands.registerCommand("standarflow.updateCli", async () => {
      if (readConfig().binPath) {
        void vscode.window.showInformationMessage(
          'A custom "standarflow.binPath" is set — the managed CLI binary is not used.',
        );
        return;
      }
      try {
        const { version, updated } = await updateBinary(context);
        if (updated) {
          void vscode.window.showInformationMessage(
            `Standarflow CLI updated to ${version}. Reconnecting…`,
          );
          await disconnect();
          await connect();
        } else {
          void vscode.window.showInformationMessage(
            `Standarflow CLI is already up to date (${version}).`,
          );
        }
      } catch (e) {
        void vscode.window.showErrorMessage(`standarflow: ${(e as Error).message}`);
      }
    }),
    vscode.commands.registerCommand("standarflow.generateMcpConfig", async () => {
      const folder = vscode.workspace.workspaceFolders?.[0];
      if (!folder) {
        void vscode.window.showWarningMessage(
          "Open a workspace folder first to generate .mcp.json.",
        );
        return;
      }
      try {
        const binPath = await ensureBinary(context, readConfig().binPath);
        const result = await generateMcpConfig(folder, binPath);
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
          case "updated":
            void vscode.window.showInformationMessage(
              `Updated standarflow entry in ${result.path} (was ${result.previousCommand ?? "<unset>"}).`,
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
      const cfg = readConfig();
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
    void applyDbChanges();
  }, 300);
}

/// React to a DB write: ask the server what changed since the last sync and
/// refresh only the affected parts of the tree. A no-op when nothing changed —
/// that is what keeps idle WAL touches from flooding the UI with reloads.
async function applyDbChanges(): Promise<void> {
  if (!client) return;
  const changes = await client.changesSince(lastSyncTs).catch(() => null);
  if (!changes) {
    // Older binary without changes_since, or a transient error — fall back to
    // a full refresh so the tree never silently drifts.
    treeProvider?.refresh();
    void refreshFocus();
    return;
  }
  // Re-query from 1s before `now`: a change landing in the same second as
  // this sync would otherwise be lost to the server's strict `> ts` test.
  lastSyncTs = changes.now - 1;

  const structural = changes.groups || changes.sessions.length > 0;
  if (structural) {
    treeProvider?.refresh();
    void webviewHost?.refreshAll();
    if (client) {
      void client.workspaceInfo().then((info) => {
        lastInfo = info;
        statusBar?.set({ kind: "ready", info });
      });
    }
  } else {
    for (const id of changes.file_change_sessions) {
      treeProvider?.refreshSession(id);
    }
    if (changes.file_change_sessions.length > 0) {
      void webviewHost?.refreshAll();
    }
    if (changes.conversations) treeProvider?.refreshConversations();
  }
  if (changes.conversations) void refreshFocus();
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

function setHideSuperseded(hide: boolean): void {
  if (!treeProvider) return;
  treeProvider.hideSuperseded = hide;
  void vscode.commands.executeCommand(
    "setContext",
    "standarflow.hideSuperseded",
    hide,
  );
  treeProvider.refresh();
}

async function revealCurrentSession(): Promise<void> {
  if (!client || !treeView) {
    void vscode.window.showWarningMessage(
      'Standarflow is not connected. Run "Standarflow: Reconnect".',
    );
    return;
  }
  try {
    const info = await client.workspaceInfo();
    if (
      info.current_session_id === null ||
      !info.current_session_group_path ||
      !info.current_session_slug
    ) {
      void vscode.window.showInformationMessage(
        "No current session yet — focus a session to set it.",
      );
      return;
    }
    const session = await client.sessionGet(info.current_session_group_path, {
      slug: info.current_session_slug,
    });
    await treeView.reveal(
      {
        kind: "session",
        groupPath: info.current_session_group_path,
        session,
        isCurrent: true,
      },
      { select: true, focus: true, expand: true },
    );
  } catch (e) {
    void vscode.window.showErrorMessage(`standarflow: ${(e as Error).message}`);
  }
}

async function syncMcpEntriesAcrossWorkspaces(binPath: string): Promise<void> {
  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    try {
      await syncMcpConfigIfPresent(folder, binPath);
    } catch {
      // Silent: a malformed .mcp.json shouldn't block the connect path.
    }
  }
}

const HOOK_MARKER = "ingest --provider claude-code";

async function fileContainsMarker(filePath: string, marker: string): Promise<boolean> {
  try {
    const text = await fs.readFile(filePath, "utf-8");
    return text.includes(marker);
  } catch {
    return false;
  }
}

// Re-runs `standarflow hooks install` against every scope where the marker is
// already wired, refreshing the embedded exe path. Skips scopes the user never
// opted into so we never create settings files behind their back.
async function syncHookCommandsIfPresent(binPath: string): Promise<void> {
  const userSettings = path.join(os.homedir(), ".claude", "settings.json");
  if (await fileContainsMarker(userSettings, HOOK_MARKER)) {
    try {
      await runCli(binPath, ["hooks", "install", "--provider", "claude-code", "--scope", "user"]);
    } catch {
      // Silent: a stale binary should be reported via the MCP connect failure path.
    }
  }
  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    const localSettings = path.join(folder.uri.fsPath, ".claude", "settings.local.json");
    if (!(await fileContainsMarker(localSettings, HOOK_MARKER))) {
      continue;
    }
    try {
      await runCli(binPath, [
        "hooks",
        "install",
        "--provider",
        "claude-code",
        "--scope",
        "project-local",
        "--root",
        folder.uri.fsPath,
      ]);
    } catch {
      // Silent (same reason as above).
    }
  }
}

async function connect(): Promise<void> {
  if (!statusBar || !extensionContext) {
    return;
  }
  statusBar.set({ kind: "connecting" });
  try {
    const cfg = readConfig();
    const binPath = await ensureBinary(extensionContext, cfg.binPath);
    await syncMcpEntriesAcrossWorkspaces(binPath);
    await syncHookCommandsIfPresent(binPath);
    client = new StandarflowClient();
    await client.connect(binPath, cfg.dbPath);
    const info = await probeWorkspace(client);
    lastInfo = info;
    statusBar.set({ kind: "ready", info });
    await refreshFocus();
    treeProvider?.refresh();
    lastSyncTs = Math.floor(Date.now() / 1000);
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
