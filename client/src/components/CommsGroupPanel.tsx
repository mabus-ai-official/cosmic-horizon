import { useState } from "react";
import SectorChatPanel, {
  type ChatMessage,
  type ChatChannel,
} from "./SectorChatPanel";
import LeaderboardPanel from "./LeaderboardPanel";
import MailPanel from "./MailPanel";

interface Props {
  messages: ChatMessage[];
  onSend: (message: string, channel: ChatChannel) => void;
  refreshKey?: number;
  onAction?: () => void;
  hasSyndicate?: boolean;
  hasAlliance?: boolean;
  alliedPlayerIds?: string[];
  onAllianceChange?: () => void;
  bare?: boolean;
}

type TabView = "chat" | "mail" | "rankings";

export default function CommsGroupPanel({
  messages,
  onSend,
  refreshKey,
  onAction,
  hasSyndicate,
  hasAlliance,
  alliedPlayerIds,
  onAllianceChange,
  bare,
}: Props) {
  const [tab, setTab] = useState<TabView>("chat");

  const tabBar = (
    <div className="group-panel-tabs">
      <span
        onClick={() => setTab("chat")}
        style={{ cursor: "pointer", color: tab === "chat" ? "#0f0" : "#666" }}
      >
        {tab === "chat" ? "[Chat]" : "Chat"}
      </span>
      <span style={{ color: "#444", margin: "0 0.5rem" }}>|</span>
      <span
        onClick={() => setTab("mail")}
        style={{ cursor: "pointer", color: tab === "mail" ? "#0f0" : "#666" }}
      >
        {tab === "mail" ? "[Mail]" : "Mail"}
      </span>
      <span style={{ color: "#444", margin: "0 0.5rem" }}>|</span>
      <span
        onClick={() => setTab("rankings")}
        style={{
          cursor: "pointer",
          color: tab === "rankings" ? "#0f0" : "#666",
        }}
      >
        {tab === "rankings" ? "[Rankings]" : "Rankings"}
      </span>
    </div>
  );

  const content = (
    <div className="panel-sections">
      {tabBar}
      <div className="panel-section">
        {tab === "chat" && (
          <SectorChatPanel
            messages={messages}
            onSend={onSend}
            hasSyndicate={hasSyndicate}
            hasAlliance={hasAlliance}
            bare
          />
        )}
        {tab === "mail" && (
          <MailPanel refreshKey={refreshKey} onAction={onAction} />
        )}
        {tab === "rankings" && (
          <LeaderboardPanel
            refreshKey={refreshKey}
            alliedPlayerIds={alliedPlayerIds}
            onAllianceChange={onAllianceChange}
            bare
          />
        )}
      </div>
    </div>
  );

  if (bare) return <div className="panel-content">{content}</div>;
  return <div className="panel-content">{content}</div>;
}
