import { useState, useEffect } from "react";
import PlayerListPanel from "./PlayerListPanel";
import { NPCList, ContactsList } from "./NPCsPanel";
import type { SectorState } from "../hooks/useGameState";

interface Props {
  sector: SectorState | null;
  onFire: (targetPlayerId: string, energy: number) => void;
  refreshKey?: number;
  bare?: boolean;
  onCommand?: (cmd: string) => void;
  alliedPlayerIds?: string[];
  pendingAllianceIds?: { fromId: string; fromName: string }[];
  onAllianceChange?: () => void;
  initialTab?: "players" | "npcs" | "contacts";
  autoTalkNpcId?: string | null;
}

type TabView = "players" | "npcs" | "contacts";

export default function CrewGroupPanel({
  sector,
  onFire,
  refreshKey,
  bare,
  onCommand,
  alliedPlayerIds,
  pendingAllianceIds,
  onAllianceChange,
  initialTab,
  autoTalkNpcId,
}: Props) {
  const [tab, setTab] = useState<TabView>(initialTab || "players");

  // Respond to external tab switch requests
  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);

  const tabBar = (
    <div className="group-panel-tabs">
      <span
        onClick={() => setTab("players")}
        style={{
          cursor: "pointer",
          color: tab === "players" ? "#0f0" : "#666",
        }}
      >
        {tab === "players" ? "[Players]" : "Players"}
      </span>
      <span style={{ color: "#444", margin: "0 0.5rem" }}>|</span>
      <span
        onClick={() => setTab("npcs")}
        style={{ cursor: "pointer", color: tab === "npcs" ? "#0f0" : "#666" }}
      >
        {tab === "npcs" ? "[NPCs]" : "NPCs"}
      </span>
      <span style={{ color: "#444", margin: "0 0.5rem" }}>|</span>
      <span
        onClick={() => setTab("contacts")}
        style={{
          cursor: "pointer",
          color: tab === "contacts" ? "#0f0" : "#666",
        }}
      >
        {tab === "contacts" ? "[Contacts]" : "Contacts"}
      </span>
    </div>
  );

  const content = (
    <div className="panel-sections">
      {tabBar}
      {tab === "players" && (
        <PlayerListPanel
          sector={sector}
          onFire={onFire}
          alliedPlayerIds={alliedPlayerIds}
          pendingAllianceIds={pendingAllianceIds}
          onAllianceChange={onAllianceChange}
          bare
        />
      )}
      {tab === "npcs" && (
        <NPCList
          sector={sector}
          onCommand={onCommand}
          autoTalkNpcId={autoTalkNpcId}
        />
      )}
      {tab === "contacts" && <ContactsList refreshKey={refreshKey} />}
    </div>
  );

  if (bare) return <div className="panel-content">{content}</div>;
  return <div className="panel-content">{content}</div>;
}
