import { basename } from "../lib/format";
import { renderMarkdown } from "../lib/markdown";
import type { MdViewData } from "../types";
import { Button } from "./Button";
import { Tag } from "./Tag";

interface Props {
  data: MdViewData;
  onEditInVscode: (path: string) => void;
}

export function MdView({ data, onEditInVscode }: Props) {
  return (
    <article class="view md-view">
      <header class="md-view__header">
        <div class="md-view__path">{data.path}</div>
        <h1 class="md-view__title">{basename(data.path)}</h1>
        <div class="md-view__meta">
          <Tag variant="kind">markdown</Tag>
          <Button size="tiny" onClick={() => onEditInVscode(data.path)}>
            Edit in VSCode editor
          </Button>
        </div>
      </header>
      <section
        class="markdown"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(data.content) }}
      />
    </article>
  );
}
