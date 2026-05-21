import { render } from "preact";
import { useEffect, useState } from "preact/hooks";
import { MdView } from "./components/MdView";
import { NavBar } from "./components/NavBar";
import { SessionView } from "./components/SessionView";
import { basename } from "./lib/format";
import type {
  HostToWebview,
  LinkPeer,
  MdEntry,
  ViewState,
  WebviewToHost,
} from "./types";
import "./styles/index.scss";

interface VsCodeApi {
  postMessage(msg: WebviewToHost): void;
}

declare global {
  function acquireVsCodeApi(): VsCodeApi;
}

const vscode = acquireVsCodeApi();

function viewLabel(v: ViewState): string {
  switch (v.kind) {
    case "session":
      return `${v.data.groupPath}/${v.data.session.slug}`;
    case "session-loading":
      return `${v.groupPath}/${v.slug}…`;
    case "md":
      return basename(v.data.path);
    case "md-loading":
      return `${basename(v.path)}…`;
  }
}

function App() {
  const [stack, setStack] = useState<ViewState[]>([]);
  const [inlineMd, setInlineMd] = useState<Record<number, MdEntry | undefined>>({});
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    const handler = (e: MessageEvent<HostToWebview>) => {
      const msg = e.data;
      setError(undefined);
      if (msg.type === "init") {
        setStack([{ kind: "session", data: msg.data }]);
      } else if (msg.type === "pushSessionData") {
        setStack((prev) => {
          const top = prev[prev.length - 1];
          if (
            top?.kind === "session-loading" &&
            top.groupPath === msg.data.groupPath &&
            top.slug === msg.data.session.slug
          ) {
            return [...prev.slice(0, -1), { kind: "session", data: msg.data }];
          }
          return [...prev, { kind: "session", data: msg.data }];
        });
      } else if (msg.type === "pushMdData") {
        setStack((prev) => {
          const top = prev[prev.length - 1];
          if (top?.kind === "md-loading" && top.fileRefId === msg.data.fileRefId) {
            return [...prev.slice(0, -1), { kind: "md", data: msg.data }];
          }
          return [...prev, { kind: "md", data: msg.data }];
        });
      } else if (msg.type === "mdContent") {
        setInlineMd((prev) => ({
          ...prev,
          [msg.fileRefId]: { kind: "ok", content: msg.content },
        }));
      } else if (msg.type === "mdError") {
        setInlineMd((prev) => ({
          ...prev,
          [msg.fileRefId]: { kind: "err", message: msg.message },
        }));
      } else if (msg.type === "navigationError") {
        setError(msg.message);
        setStack((prev) => {
          const top = prev[prev.length - 1];
          if (top?.kind === "session-loading" || top?.kind === "md-loading") {
            return prev.slice(0, -1);
          }
          return prev;
        });
      }
    };
    window.addEventListener("message", handler);
    vscode.postMessage({ type: "ready" });
    return () => window.removeEventListener("message", handler);
  }, []);

  if (stack.length === 0) {
    return <div class="loading">Loading…</div>;
  }

  const top = stack[stack.length - 1]!;

  const goBack = () => setStack((prev) => prev.slice(0, -1));
  const goRoot = () => setStack((prev) => (prev.length > 1 ? [prev[0]!] : prev));

  const navigateSession = (peer: LinkPeer) => {
    setStack((prev) => [
      ...prev,
      { kind: "session-loading", groupPath: peer.group_path, slug: peer.slug },
    ]);
    vscode.postMessage({
      type: "requestSession",
      groupPath: peer.group_path,
      slug: peer.slug,
    });
  };

  const navigateMd = (fileRefId: number, path: string) => {
    setStack((prev) => [...prev, { kind: "md-loading", fileRefId, path }]);
    vscode.postMessage({ type: "requestMd", fileRefId, path });
  };

  const readInlineMd = (fileRefId: number) => {
    setInlineMd((prev) => ({ ...prev, [fileRefId]: { kind: "loading" } }));
    vscode.postMessage({ type: "readMd", fileRefId });
  };

  const editInVscode = (path: string) =>
    vscode.postMessage({ type: "editFile", path });

  const saveBody = (bodyMd: string) =>
    vscode.postMessage({ type: "saveBody", bodyMd });

  return (
    <div class="shell">
      <NavBar
        crumbs={stack.map(viewLabel)}
        canGoBack={stack.length > 1}
        canGoRoot={stack.length > 2}
        onBack={goBack}
        onRoot={goRoot}
      />
      {error && <div class="shell__error">{error}</div>}
      {top.kind === "session-loading" && (
        <div class="loading">
          Loading {top.groupPath}/{top.slug}…
        </div>
      )}
      {top.kind === "md-loading" && (
        <div class="loading">Loading {basename(top.path)}…</div>
      )}
      {top.kind === "session" && (
        <SessionView
          data={top.data}
          mdByFileRefId={inlineMd}
          onNavigateSession={navigateSession}
          onNavigateMd={navigateMd}
          onEditInVscode={editInVscode}
          onReadInlineMd={readInlineMd}
          onSaveBody={saveBody}
        />
      )}
      {top.kind === "md" && <MdView data={top.data} onEditInVscode={editInVscode} />}
    </div>
  );
}

const root = document.getElementById("root")!;
render(<App />, root);
