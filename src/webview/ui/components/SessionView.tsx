import type { LinkPeer, MdEntry, SessionViewData } from "../types";
import { AttachedFilesPanel } from "./AttachedFilesPanel";
import { ConversationsPanel } from "./ConversationsPanel";
import { FileChangesPanel } from "./FileChangesPanel";
import { LinksPanel } from "./LinksPanel";
import { SessionBody } from "./SessionBody";
import { SessionHeader } from "./SessionHeader";

interface Props {
  data: SessionViewData;
  mdByFileRefId: Record<number, MdEntry | undefined>;
  onNavigateSession: (peer: LinkPeer) => void;
  onNavigateMd: (fileRefId: number, path: string) => void;
  onEditInVscode: (path: string) => void;
  onReadInlineMd: (fileRefId: number) => void;
  onSaveBody: (bodyMd: string) => void;
}

export function SessionView({
  data,
  mdByFileRefId,
  onNavigateSession,
  onNavigateMd,
  onEditInVscode,
  onReadInlineMd,
  onSaveBody,
}: Props) {
  const { groupPath, session, files, links, participants, fileChanges, conversations } =
    data;
  const hasLinks = links.outgoing.length > 0 || links.incoming.length > 0;

  return (
    <article class="view">
      <SessionHeader groupPath={groupPath} session={session} />
      <SessionBody bodyMd={session.body_md} onSave={onSaveBody} />
      {files.length > 0 && (
        <AttachedFilesPanel
          files={files}
          mdByFileRefId={mdByFileRefId}
          onNavigateMd={onNavigateMd}
          onEditInVscode={onEditInVscode}
          onReadInlineMd={onReadInlineMd}
        />
      )}
      {hasLinks && <LinksPanel links={links} onNavigate={onNavigateSession} />}
      {participants.length > 0 && (
        <ConversationsPanel
          participants={participants}
          conversations={conversations}
        />
      )}
      {fileChanges.length > 0 && <FileChangesPanel fileChanges={fileChanges} />}
    </article>
  );
}
