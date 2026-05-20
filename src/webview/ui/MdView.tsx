import MarkdownIt from "markdown-it";
import type { MdViewData } from "./types";

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });

function basename(p: string): string {
  const idx = Math.max(p.lastIndexOf("/"), p.lastIndexOf("\\"));
  return idx >= 0 ? p.slice(idx + 1) : p;
}

interface Props {
  data: MdViewData;
  onEditInVscode: (path: string) => void;
}

export function MdView({ data, onEditInVscode }: Props) {
  return (
    <article class="session-view md-view">
      <header class="session-view__header">
        <div class="session-view__path">{data.path}</div>
        <h1 class="session-view__title">{basename(data.path)}</h1>
        <div class="session-view__meta">
          <span class="session-view__tag session-view__tag--kind">markdown</span>
          <button
            type="button"
            class="session-view__btn session-view__btn--tiny"
            onClick={() => onEditInVscode(data.path)}
          >
            Edit in VSCode editor
          </button>
        </div>
      </header>
      <section
        class="session-view__body"
        dangerouslySetInnerHTML={{ __html: md.render(data.content) }}
      />
    </article>
  );
}
