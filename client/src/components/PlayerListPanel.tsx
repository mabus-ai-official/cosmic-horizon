import { useState } from "react";
import CollapsiblePanel from "./CollapsiblePanel";
import {
  toggleAlliance,
  acceptAlliance,
  rejectAlliance,
} from "../services/api";
import type { SectorState } from "../hooks/useGameState";

interface Props {
  sector: SectorState | null;
  onFire: (targetPlayerId: string, energy: number) => void;
  alliedPlayerIds?: string[];
  pendingAllianceIds?: { fromId: string; fromName: string }[];
  onAllianceChange?: () => void;
  bare?: boolean;
}

export default function PlayerListPanel({
  sector,
  onFire,
  alliedPlayerIds = [],
  pendingAllianceIds = [],
  onAllianceChange,
  bare,
}: Props) {
  const players = sector?.players || [];
  const [togglingAlly, setTogglingAlly] = useState<string | null>(null);
  const pendingFromIds = new Set(pendingAllianceIds.map((p) => p.fromId));

  const handleAllyToggle = async (playerId: string) => {
    setTogglingAlly(playerId);
    try {
      await toggleAlliance(playerId);
      onAllianceChange?.();
    } catch {
      /* silently fail */
    }
    setTogglingAlly(null);
  };

  const handleAccept = async (playerId: string) => {
    setTogglingAlly(playerId);
    try {
      await acceptAlliance(playerId);
      onAllianceChange?.();
    } catch {
      /* silently fail */
    }
    setTogglingAlly(null);
  };

  const handleReject = async (playerId: string) => {
    setTogglingAlly(playerId);
    try {
      await rejectAlliance(playerId);
      onAllianceChange?.();
    } catch {
      /* silently fail */
    }
    setTogglingAlly(null);
  };

  // Incoming requests from players NOT in current sector
  const offSectorPending = pendingAllianceIds.filter(
    (p) => !players.some((pl) => pl.id === p.fromId),
  );

  const content =
    players.length === 0 && offSectorPending.length === 0 ? (
      <div className="text-muted">No other players in sector</div>
    ) : (
      <>
        {offSectorPending.length > 0 && (
          <>
            <div className="panel-subheader" style={{ color: "var(--yellow)" }}>
              Incoming Alliance Requests
            </div>
            {offSectorPending.map((p) => (
              <div key={p.fromId} className="player-list-item">
                <span className="player-list-item__name">{p.fromName}</span>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <button
                    className="btn-sm btn-ally btn-ally--accept"
                    onClick={() => handleAccept(p.fromId)}
                    disabled={togglingAlly === p.fromId}
                  >
                    ACCEPT
                  </button>
                  <button
                    className="btn-sm btn-fire"
                    onClick={() => handleReject(p.fromId)}
                    disabled={togglingAlly === p.fromId}
                  >
                    DENY
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
        {players.map((p) => {
          const isAllied = alliedPlayerIds.includes(p.id);
          const hasPending = pendingFromIds.has(p.id);
          return (
            <div key={p.id} className="player-list-item">
              <span className="player-list-item__name">{p.username}</span>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {hasPending ? (
                  <>
                    <button
                      className="btn-sm btn-ally btn-ally--accept"
                      onClick={() => handleAccept(p.id)}
                      disabled={togglingAlly === p.id}
                    >
                      ACCEPT
                    </button>
                    <button
                      className="btn-sm btn-fire"
                      onClick={() => handleReject(p.id)}
                      disabled={togglingAlly === p.id}
                    >
                      DENY
                    </button>
                  </>
                ) : (
                  <button
                    className={`btn-sm btn-ally ${isAllied ? "btn-ally--active" : ""}`}
                    onClick={() => handleAllyToggle(p.id)}
                    disabled={togglingAlly === p.id}
                    title={isAllied ? "Cancel alliance" : "Request alliance"}
                  >
                    {isAllied ? "ALLIED" : "ALLY"}
                  </button>
                )}
                <button
                  className="btn-sm btn-fire"
                  onClick={() => onFire(p.id, 5)}
                  title="Quick attack (5 energy)"
                >
                  Fire
                </button>
              </div>
            </div>
          );
        })}
      </>
    );

  if (bare) return <div className="panel-content">{content}</div>;
  return (
    <CollapsiblePanel title="PLAYERS" badge={players.length || null}>
      {content}
    </CollapsiblePanel>
  );
}
