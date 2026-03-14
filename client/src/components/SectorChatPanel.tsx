import { useState, useCallback, useRef, useEffect } from "react";
import CollapsiblePanel from "./CollapsiblePanel";

export interface ChatMessage {
  id: number;
  senderName: string;
  message: string;
  isOwn: boolean;
  channel?: string;
  syndicateName?: string;
  fromDiscord?: boolean;
}

export type ChatChannel = "sector" | "galaxy" | "syndicate" | "alliance";

interface Props {
  messages: ChatMessage[];
  onSend: (message: string, channel: ChatChannel) => void;
  hasSyndicate?: boolean;
  hasAlliance?: boolean;
  bare?: boolean;
}

export default function SectorChatPanel({
  messages,
  onSend,
  hasSyndicate,
  hasAlliance,
  bare,
}: Props) {
  const [input, setInput] = useState("");
  const [channel, setChannel] = useState<ChatChannel>("sector");
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const msg = input.trim();
      if (!msg) return;
      onSend(msg, channel);
      setInput("");
    },
    [input, onSend, channel],
  );

  // Filter messages by current channel
  const channelMessages = messages.filter(
    (m) => (m.channel || "sector") === channel,
  );

  const channels: { key: ChatChannel; label: string; show: boolean }[] = [
    { key: "sector", label: "Sector", show: true },
    { key: "galaxy", label: "Galaxy", show: true },
    { key: "syndicate", label: "Syndicate", show: !!hasSyndicate },
    { key: "alliance", label: "Alliance", show: !!hasAlliance },
  ];

  const visibleChannels = channels.filter((c) => c.show);

  const channelColor = (ch: ChatChannel) => {
    if (ch === "sector") return "#0f0";
    if (ch === "syndicate") return "var(--magenta)";
    if (ch === "alliance") return "var(--cyan)";
    return "#666";
  };

  const content = (
    <>
      {visibleChannels.length > 1 && (
        <div className="chat-channel-selector">
          {visibleChannels.map((c, i) => (
            <span key={c.key}>
              {i > 0 && (
                <span style={{ color: "#333", margin: "0 4px" }}>|</span>
              )}
              <span
                onClick={() => setChannel(c.key)}
                className={channel === c.key ? "channel-active" : ""}
                style={{
                  cursor: "pointer",
                  color: channel === c.key ? channelColor(c.key) : "#555",
                  fontSize: 10,
                }}
              >
                {channel === c.key ? `[${c.label}]` : c.label}
              </span>
            </span>
          ))}
        </div>
      )}
      <div className="chat-messages" ref={listRef}>
        {channelMessages.length === 0 ? (
          <div className="text-muted">No messages yet</div>
        ) : (
          channelMessages.map((m) => (
            <div
              key={m.id}
              className={`chat-msg ${m.isOwn ? "chat-msg--own" : ""}`}
            >
              {m.syndicateName && (
                <span style={{ color: "var(--purple)", fontSize: 9 }}>
                  [{m.syndicateName}]{" "}
                </span>
              )}
              <span className="chat-msg__name">[{m.senderName}]</span>{" "}
              {m.message}
            </div>
          ))
        )}
      </div>
      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`${channel} message...`}
          maxLength={500}
        />
      </form>
    </>
  );

  if (bare) return <div className="panel-content">{content}</div>;
  return (
    <CollapsiblePanel title="CHAT" badge={messages.length || null}>
      {content}
    </CollapsiblePanel>
  );
}
