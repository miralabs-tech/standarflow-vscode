import type { LinkOf, LinkPeer, LinkRow } from "../types";
import { Panel } from "./Panel";

interface Props {
  links: LinkOf;
  onNavigate: (peer: LinkPeer) => void;
}

export function LinksPanel({ links, onNavigate }: Props) {
  return (
    <Panel title="Links">
      {links.outgoing.length > 0 && (
        <div class="links__section">
          <h3 class="links__subtitle">Outgoing</h3>
          <ul class="list">
            {links.outgoing.map((link) => (
              <LinkItem
                key={`out-${link.from_id}-${link.to_id}-${link.relation}`}
                link={link}
                direction="outgoing"
                onNavigate={onNavigate}
              />
            ))}
          </ul>
        </div>
      )}
      {links.incoming.length > 0 && (
        <div class="links__section">
          <h3 class="links__subtitle">Incoming</h3>
          <ul class="list">
            {links.incoming.map((link) => (
              <LinkItem
                key={`in-${link.from_id}-${link.to_id}-${link.relation}`}
                link={link}
                direction="incoming"
                onNavigate={onNavigate}
              />
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

interface LinkItemProps {
  link: LinkRow;
  direction: "outgoing" | "incoming";
  onNavigate: (peer: LinkPeer) => void;
}

function LinkItem({ link, direction, onNavigate }: LinkItemProps) {
  const peerLabel = link.peer
    ? `${link.peer.group_path}/${link.peer.slug}`
    : `#${direction === "outgoing" ? link.to_id : link.from_id}`;
  const peerDesc = link.peer
    ? `${link.peer.kind} · ${link.peer.status}`
    : "(unresolved)";

  const body = (
    <>
      {direction === "incoming" && <span class="link__direction">→</span>}
      <code class="link__relation">{link.relation}</code>
      {direction === "outgoing" && <span class="link__direction">→</span>}
      <span class="link__target">
        <span class="link__target-slug">{peerLabel}</span>
        <span class="link__target-desc">{peerDesc}</span>
      </span>
    </>
  );

  if (link.peer) {
    const peer = link.peer;
    return (
      <li class="link">
        <button
          type="button"
          class="link__button"
          onClick={() => onNavigate(peer)}
          title={`Navigate to ${peerLabel}`}
        >
          {body}
        </button>
      </li>
    );
  }
  return <li class="link link--unresolved">{body}</li>;
}
