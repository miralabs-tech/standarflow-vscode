import { render } from "preact";
import { useEffect, useState } from "preact/hooks";
import { SessionView } from "./SessionView";
import { MdView } from "./MdView";
import type {
  HostToWebview,
  LinkPeer,
  ViewState,
  WebviewToHost,
} from "./types";
import "./styles.scss";

interface VsCodeApi {
  postMessage(msg: WebviewToHost): void;
}

declare global {
  function acquireVsCodeApi(): VsCodeApi;
}

const vscode = acquireVsCodeApi();

type InlineMdEntry =
  | { kind: "loading" }
  | { kind: "ok"; content: string }
  | { kind: "err"; message: string };

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

function basename(p: string): string {
  const idx = Math.max(p.lastIndexOf("/"), p.lastIndexOf("\\"));
  return idx >= 0 ? p.slice(idx + 1) : p;
}

function App() {
  const [stack, setStack] = useState<ViewState[]>([]);
  const [inlineMd, setInlineMd] = useState<Record<number, InlineMdEntry | undefined>>({});
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    const handler = (e: MessageEvent<HostToWebview>) => {
      const msg = e.data;
      setError(undefined);
      if (msg.type === "init") {
        // Replace whole stack with the initial session.
        setStack([{ kind: "session", data: msg.data }]);
      } else if (msg.type === "pushSessionData") {
        setStack((prev) => {
          // If the top is a session-loading placeholder for this target,
          // replace it. Otherwise push.
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
        // Drop any loading frame so the user goes back to a stable view.
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
    return <div class="session-view__loading">Loading…</div>;
  }

  const top = stack[stack.length - 1]!;
  const canGoBack = stack.length > 1;

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
    setStack((prev) => [
      ...prev,
      { kind: "md-loading", fileRefId, path },
    ]);
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
    <div class="session-shell">
      <nav class="session-shell__nav" aria-label="Webview navigation">
        <button
          type="button"
          class="session-view__btn session-view__btn--tiny"
          onClick={goBack}
          disabled={!canGoBack}
          aria-label="Back"
        >
          ← Back
        </button>
        {stack.length > 2 && (
          <button
            type="button"
            class="session-view__btn session-view__btn--tiny"
            onClick={goRoot}
            aria-label="Back to root"
          >
            ⤴ Root
          </button>
        )}
        <ol class="session-shell__crumbs">
          {stack.map((s, i) => (
            <li
              class={`session-shell__crumb${i === stack.length - 1 ? " session-shell__crumb--current" : ""}`}
              key={i}
            >
              {viewLabel(s)}
            </li>
          ))}
        </ol>
      </nav>

      {error && <div class="session-shell__error">{error}</div>}

      {top.kind === "session-loading" && (
        <div class="session-view__loading">Loading {top.groupPath}/{top.slug}…</div>
      )}
      {top.kind === "md-loading" && (
        <div class="session-view__loading">Loading {basename(top.path)}…</div>
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
      {top.kind === "md" && (
        <MdView data={top.data} onEditInVscode={editInVscode} />
      )}
    </div>
  );
}

const root = document.getElementById("root")!;
render(<App />, root);
