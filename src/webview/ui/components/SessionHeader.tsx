import { formatDate } from "../lib/format";
import type { SessionRow } from "../types";
import { Tag } from "./Tag";

interface Props {
  groupPath: string;
  session: SessionRow;
}

export function SessionHeader({ groupPath, session }: Props) {
  const wasUpdated =
    session.updated_at > session.created_at ||
    session.updated_by !== session.created_by;

  return (
    <header class="session-header">
      <div class="session-header__path">{groupPath}</div>
      <h1 class="session-header__title">{session.slug}</h1>
      <div class="session-header__meta">
        <Tag variant="status" status={session.status}>
          {session.status}
        </Tag>
        <Tag variant="kind">{session.kind}</Tag>
        {session.created_by && <Tag variant="client">by {session.created_by}</Tag>}
        <Tag variant="time">{formatDate(session.created_at)}</Tag>
        {wasUpdated && (
          <Tag variant="updated">
            updated {formatDate(session.updated_at)}
            {session.updated_by && session.updated_by !== session.created_by
              ? ` · ${session.updated_by}`
              : ""}
          </Tag>
        )}
      </div>
    </header>
  );
}
