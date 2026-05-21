import { useState } from "preact/hooks";
import { renderMarkdown } from "../lib/markdown";
import { Button } from "./Button";

interface Props {
  bodyMd: string;
  onSave: (bodyMd: string) => void;
}

export function SessionBody({ bodyMd, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(bodyMd);

  if (!editing && draft !== bodyMd) {
    setDraft(bodyMd);
  }

  const startEdit = () => {
    setDraft(bodyMd);
    setEditing(true);
  };
  const cancelEdit = () => {
    setDraft(bodyMd);
    setEditing(false);
  };
  const saveEdit = () => {
    onSave(draft);
    setEditing(false);
  };

  return (
    <section class="session-body">
      <div class="session-body__toolbar">
        {editing ? (
          <>
            <Button variant="primary" onClick={saveEdit}>
              Save
            </Button>
            <Button onClick={cancelEdit}>Cancel</Button>
          </>
        ) : (
          <Button onClick={startEdit}>Edit body</Button>
        )}
      </div>
      {editing ? (
        <textarea
          class="session-body__editor"
          value={draft}
          onInput={(e) => setDraft((e.target as HTMLTextAreaElement).value)}
          rows={Math.max(12, draft.split("\n").length + 2)}
          spellcheck={false}
        />
      ) : (
        <div
          class="markdown"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(bodyMd) }}
        />
      )}
    </section>
  );
}
