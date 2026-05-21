import { formatDate, shortId } from "../lib/format";
import type { Conversation, Participant } from "../types";
import { Panel } from "./Panel";

interface Props {
  participants: Participant[];
  conversations: Conversation[];
}

export function ConversationsPanel({ participants, conversations }: Props) {
  const convById = new Map(conversations.map((c) => [c.id, c]));

  return (
    <Panel title={`Conversations (${participants.length})`}>
      <ul class="list">
        {participants.map((p) => {
          const conv = convById.get(p.conversation_id);
          const label = conv
            ? `${conv.provider} · ${shortId(conv.provider_conversation_id)}`
            : `conv#${p.conversation_id}`;
          return (
            <li class="participant" key={p.id}>
              <span class="participant__label">{label}</span>
              <span class="participant__meta">
                {p.touch_count} touch{p.touch_count === 1 ? "" : "es"} · last{" "}
                {formatDate(p.last_touch_at)}
              </span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
