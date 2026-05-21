import { useState } from "preact/hooks";
import { basename, isMdPath } from "../lib/format";
import { renderMarkdown } from "../lib/markdown";
import type { FileRefRow, MdEntry } from "../types";
import { Button } from "./Button";
import { Panel } from "./Panel";

interface Props {
  files: FileRefRow[];
  mdByFileRefId: Record<number, MdEntry | undefined>;
  onNavigateMd: (fileRefId: number, path: string) => void;
  onEditInVscode: (path: string) => void;
  onReadInlineMd: (fileRefId: number) => void;
}

export function AttachedFilesPanel({
  files,
  mdByFileRefId,
  onNavigateMd,
  onEditInVscode,
  onReadInlineMd,
}: Props) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggle = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        if (!mdByFileRefId[id]) {
          onReadInlineMd(id);
        }
      }
      return next;
    });
  };

  return (
    <Panel title={`Attached files (${files.length})`}>
      <ul class="list">
        {files.map((file) => (
          <FileItem
            key={file.id}
            file={file}
            expanded={expanded.has(file.id)}
            mdEntry={mdByFileRefId[file.id]}
            onToggle={() => toggle(file.id)}
            onNavigateMd={onNavigateMd}
            onEditInVscode={onEditInVscode}
          />
        ))}
      </ul>
    </Panel>
  );
}

interface FileItemProps {
  file: FileRefRow;
  expanded: boolean;
  mdEntry: MdEntry | undefined;
  onToggle: () => void;
  onNavigateMd: (fileRefId: number, path: string) => void;
  onEditInVscode: (path: string) => void;
}

function FileItem({
  file,
  expanded,
  mdEntry,
  onToggle,
  onNavigateMd,
  onEditInVscode,
}: FileItemProps) {
  const isMd = isMdPath(file.path);

  return (
    <li class="file">
      <div class="file__row">
        <button
          type="button"
          class="file__button"
          onClick={() =>
            isMd ? onNavigateMd(file.id, file.path) : onEditInVscode(file.path)
          }
          title={
            isMd
              ? `Open ${basename(file.path)} in the viewer (use Edit to open in VSCode)`
              : file.path
          }
        >
          <span class="file__role">{file.role}</span>
          <span class="file__name">{basename(file.path)}</span>
          <span class="file__path">{file.path}</span>
          {file.created_by && <span class="file__client">{file.created_by}</span>}
        </button>
        <div class="file__actions">
          {isMd && (
            <Button size="tiny" onClick={onToggle}>
              {expanded ? "Hide" : "Preview"}
            </Button>
          )}
          <Button size="tiny" onClick={() => onEditInVscode(file.path)}>
            Edit
          </Button>
        </div>
      </div>
      {file.description && <div class="file__desc">{file.description}</div>}
      {isMd && expanded && (
        <div class="file__preview">
          {mdEntry?.kind === "loading" && <em>Loading…</em>}
          {mdEntry?.kind === "err" && (
            <div class="file__preview-error">
              Failed to read: {mdEntry.message}
            </div>
          )}
          {mdEntry?.kind === "ok" && (
            <div
              class="markdown"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(mdEntry.content) }}
            />
          )}
        </div>
      )}
    </li>
  );
}
