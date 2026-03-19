import { useState } from "react";
import CombatView from "./CombatView";
import CombatLogPanel from "./CombatLogPanel";
import type { SectorState } from "../hooks/useGameState";

interface Props {
  sector: SectorState | null;
  onFire: (targetPlayerId: string, energy: number) => void;
  onFlee: () => void;
  weaponEnergy: number;
  combatAnimation?: { attackerShipType: string; damage: number } | null;
  onCombatAnimationDone?: () => void;
  playerName?: string;
  refreshKey?: number;
  bare?: boolean;
}

type TabView = "targeting" | "log";

export default function CombatGroupPanel({
  sector,
  onFire,
  onFlee,
  weaponEnergy,
  combatAnimation,
  onCombatAnimationDone,
  playerName,
  refreshKey,
  bare,
}: Props) {
  const [tab, setTab] = useState<TabView>("targeting");

  const tabBar = (
    <div className="group-panel-tabs">
      <span
        onClick={() => setTab("targeting")}
        style={{
          cursor: "pointer",
          color: tab === "targeting" ? "#0f0" : "#666",
        }}
      >
        {tab === "targeting" ? "[Targeting]" : "Targeting"}
      </span>
      <span style={{ color: "#444", margin: "0 0.5rem" }}>|</span>
      <span
        onClick={() => setTab("log")}
        style={{ cursor: "pointer", color: tab === "log" ? "#0f0" : "#666" }}
      >
        {tab === "log" ? "[Log]" : "Log"}
      </span>
    </div>
  );

  const content = (
    <div className="panel-sections">
      {tabBar}
      {tab === "targeting" && (
        <CombatView
          sector={sector}
          onFire={onFire}
          onFlee={onFlee}
          weaponEnergy={weaponEnergy}
          combatAnimation={combatAnimation}
          onCombatAnimationDone={onCombatAnimationDone}
          bare
        />
      )}
      {tab === "log" && (
        <CombatLogPanel playerName={playerName} refreshKey={refreshKey} bare />
      )}
    </div>
  );

  if (bare) return <div className="panel-content">{content}</div>;
  return <div className="panel-content">{content}</div>;
}
