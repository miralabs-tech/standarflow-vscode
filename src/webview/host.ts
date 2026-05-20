import * as vscode from "vscode";
import type {
  Conversation,
  FileChange,
  FileRefRow,
  LinkOf,
  Participant,
  SessionRow,
  StandarflowClient,
} from "../mcpClient";

interface WebviewInitData {
  groupPath: string;
  session: SessionRow;
  files: FileRefRow[];
  links: LinkOf;
  participants: Participant[];
  fileChanges: FileChange[];
  conversations: Conversation[];
}

interface IncomingMessage {
  type?: string;
  path?: unknown;
  bodyMd?: unknown;
  fileRefId?: unknown;
  groupPath?: unknown;
  slug?: unknown;
}

interface PanelEntry {
  panel: vscode.WebviewPanel;
  groupPath: string;
  sessionSlug: string;
}

export class SessionWebviewHost implements vscode.Disposable {
  private readonly panels = new Map<string, PanelEntry>();

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly clientGetter: () => StandarflowClient | undefined,
  ) {}

  async show(groupPath: string, sessionSlug: string): Promise<void> {
    const client = this.clientGetter();
    if (!client) {
      void vscode.window.showWarningMessage(
        "Standarflow is not connected. Run \"Standarflow: Reconnect\".",
      );
      return;
    }

    const key = `${groupPath}::${sessionSlug}`;
    const existing = this.panels.get(key);
    if (existing) {
      existing.panel.reveal();
      await this.refresh(existing.panel, client, groupPath, sessionSlug);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "standarflow.sessionView",
      `${groupPath}/${sessionSlug}`,
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this.extensionUri, "dist", "webview"),
        ],
      },
    );

    panel.webview.html = this.htmlFor(panel);
    panel.webview.onDidReceiveMessage(async (raw: IncomingMessage) => {
      const c = this.clientGetter();
      if (raw?.type === "ready") {
        if (c) {
          await this.refresh(panel, c, groupPath, sessionSlug);
        }
        return;
      }
      if (raw?.type === "openFile" && typeof raw.path === "string") {
        await vscode.commands.executeCommand(
          "vscode.open",
          vscode.Uri.file(raw.path),
        );
        return;
      }
      if (raw?.type === "editFile" && typeof raw.path === "string") {
        const doc = await vscode.workspace.openTextDocument(
          vscode.Uri.file(raw.path),
        );
        await vscode.window.showTextDocument(doc, { preview: false });
        return;
      }
      if (raw?.type === "saveBody" && typeof raw.bodyMd === "string") {
        if (!c) return;
        try {
          await c.sessionUpdate(groupPath, sessionSlug, { bodyMd: raw.bodyMd });
          void vscode.window.showInformationMessage(
            `Updated body of ${sessionSlug}.`,
          );
          await this.refresh(panel, c, groupPath, sessionSlug);
        } catch (e) {
          void vscode.window.showErrorMessage(
            `standarflow: ${(e as Error).message}`,
          );
        }
        return;
      }
      if (raw?.type === "readMd" && typeof raw.fileRefId === "number") {
        if (!c) return;
        try {
          const content = await c.fileRead(raw.fileRefId);
          void panel.webview.postMessage({
            type: "mdContent",
            fileRefId: raw.fileRefId,
            content,
          });
        } catch (e) {
          void panel.webview.postMessage({
            type: "mdError",
            fileRefId: raw.fileRefId,
            message: (e as Error).message,
          });
        }
        return;
      }
      if (
        raw?.type === "requestSession" &&
        typeof raw.groupPath === "string" &&
        typeof raw.slug === "string"
      ) {
        if (!c) return;
        const targetGroupPath = raw.groupPath;
        const targetSlug = raw.slug;
        try {
          const data = await loadSessionData(c, targetGroupPath, targetSlug);
          void panel.webview.postMessage({
            type: "pushSessionData",
            data,
          });
        } catch (e) {
          void panel.webview.postMessage({
            type: "navigationError",
            message: `Cannot load ${targetGroupPath}/${targetSlug}: ${(e as Error).message}`,
          });
        }
        return;
      }
      if (
        raw?.type === "requestMd" &&
        typeof raw.fileRefId === "number" &&
        typeof raw.path === "string"
      ) {
        if (!c) return;
        const fileRefId = raw.fileRefId;
        const targetPath = raw.path;
        try {
          const content = await c.fileRead(fileRefId);
          void panel.webview.postMessage({
            type: "pushMdData",
            data: { path: targetPath, fileRefId, content },
          });
        } catch (e) {
          void panel.webview.postMessage({
            type: "navigationError",
            message: `Cannot read ${targetPath}: ${(e as Error).message}`,
          });
        }
      }
    });

    panel.onDidDispose(() => {
      this.panels.delete(key);
    });

    this.panels.set(key, { panel, groupPath, sessionSlug });
  }

  /// Refresh every open panel from the DB. Used when an outside writer
  /// changes the DB and we want all viewers to catch up without a manual click.
  async refreshAll(): Promise<void> {
    const client = this.clientGetter();
    if (!client) return;
    await Promise.all(
      Array.from(this.panels.values()).map((entry) =>
        this.refresh(entry.panel, client, entry.groupPath, entry.sessionSlug),
      ),
    );
  }

  private async refresh(
    panel: vscode.WebviewPanel,
    client: StandarflowClient,
    groupPath: string,
    slug: string,
  ): Promise<void> {
    try {
      const data = await loadSessionData(client, groupPath, slug);
      void panel.webview.postMessage({ type: "init", data });
    } catch (e) {
      void vscode.window.showErrorMessage(
        `standarflow: ${(e as Error).message}`,
      );
    }
  }

  private htmlFor(panel: vscode.WebviewPanel): string {
    const webview = panel.webview;
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "dist", "webview", "main.js"),
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "dist", "webview", "main.css"),
    );
    const nonce = randomNonce();
    const csp = [
      "default-src 'none'",
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `font-src ${webview.cspSource}`,
      `img-src ${webview.cspSource} data:`,
      `script-src 'nonce-${nonce}'`,
    ].join("; ");

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<link rel="stylesheet" href="${styleUri}">
<title>Standarflow Session</title>
</head>
<body>
<div id="root"></div>
<script type="module" nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  dispose(): void {
    for (const entry of this.panels.values()) {
      entry.panel.dispose();
    }
    this.panels.clear();
  }
}

async function loadSessionData(
  client: StandarflowClient,
  groupPath: string,
  slug: string,
): Promise<WebviewInitData> {
  const session = await client.sessionGet(groupPath, { slug });
  const [files, links, participants, fileChanges, conversations] =
    await Promise.all([
      client.fileList(groupPath, slug),
      client.linkOf(session.id),
      client.sessionParticipants(session.id),
      client.sessionFileChanges(session.id, 100),
      client.conversationList(),
    ]);
  return { groupPath, session, files, links, participants, fileChanges, conversations };
}

function randomNonce(): string {
  const bytes = new Uint8Array(16);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
