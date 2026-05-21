import { basename, formatDate } from "../lib/format";
import type { FileChange } from "../types";
import { Panel } from "./Panel";

interface Props {
  fileChanges: FileChange[];
}

export function FileChangesPanel({ fileChanges }: Props) {
  return (
    <Panel title={`File changes (${fileChanges.length})`}>
      <ul class="list">
        {fileChanges.map((c) => (
          <li class="change" key={c.id}>
            <code class="change__op">{c.op}</code>
            <span class="change__name">{basename(c.file_path)}</span>
            {c.tool_name && <span class="change__tool">{c.tool_name}</span>}
            <span class="change__time">{formatDate(c.ts)}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
