import { useState, useEffect } from "react";
import CollapsiblePanel from "./CollapsiblePanel";
import PixelSprite from "./PixelSprite";
import {
  getSectorWarpGates,
  useWarpGate,
  getResourceEvents,
} from "../services/api";
import type { SectorState } from "../hooks/useGameState";
import { getPlanetTypeInfo } from "../config/planet-tooltips";

interface WarpGate {
  id: string;
  destinationSectorId: number;
  toll: number;
  ownerName?: string;
}

interface ResourceEvent {
  id: string;
  type: string;
  claimed?: boolean;
  guardian_hp?: number;
}

interface MapPanelProps {
  sector: SectorState | null;
  onMoveToSector: (sectorId: number) => void;
  onWarpTo?: (sectorId: number) => void;
  onCommand?: (cmd: string) => void;
  onNPCClick?: (npcId: string) => void;
  onAlertClick?: (panel: string) => void;
  isDocked?: boolean;
  isLanded?: boolean;
  hasPlanets?: boolean;
  onDock?: () => void;
  onUndock?: () => void;
  onLandClick?: () => void;
  onLiftoff?: () => void;
  exploredSectorIds?: number[];
  alliedPlayerIds?: string[];
  bare?: boolean;
}

export default function MapPanel({
  sector,
  onMoveToSector,
  onWarpTo,
  onCommand,
  onNPCClick,
  onAlertClick,
  isDocked,
  isLanded,
  hasPlanets,
  onDock,
  onUndock,
  onLandClick,
  onLiftoff,
  exploredSectorIds,
  alliedPlayerIds,
  bare,
}: MapPanelProps) {
  const [warpGates, setWarpGates] = useState<WarpGate[]>([]);
  const [warpTarget, setWarpTarget] = useState("");
  const [hoveredPlanet, setHoveredPlanet] = useState<string | null>(null);
  const [planetsExpanded, setPlanetsExpanded] = useState(false);
  const exploredSet = exploredSectorIds ? new Set(exploredSectorIds) : null;
  const [resourceEvents, setResourceEvents] = useState<ResourceEvent[]>([]);

  useEffect(() => {
    if (sector) {
      getSectorWarpGates()
        .then(({ data }) => setWarpGates(data.gates || data.warpGates || []))
        .catch(() => setWarpGates([]));
      getResourceEvents()
        .then(({ data }) => setResourceEvents(data.resourceEvents || []))
        .catch(() => setResourceEvents([]));
    }
  }, [sector?.sectorId]);

  const handleUseGate = async (gateId: string) => {
    try {
      await useWarpGate(gateId);
      if (onCommand) onCommand("look");
    } catch {
      /* silent */
    }
  };

  const handleWarpTo = () => {
    const num = parseInt(warpTarget, 10);
    if (!isNaN(num) && num > 0) {
      if (onWarpTo) {
        onWarpTo(num);
      } else {
        onMoveToSector(num);
      }
      setWarpTarget("");
    }
  };

  if (!sector) {
    const empty = <div>No data</div>;
    if (bare) return <div className="panel-content">{empty}</div>;
    return <CollapsiblePanel title="NAVIGATION">{empty}</CollapsiblePanel>;
  }

  const npcs = sector.npcs || [];
  const variantPlanets = sector.planets.filter(
    (p) => p.planetClass === "S" || p.planetClass === "G",
  );
  const hasResourceEvents = resourceEvents.length > 0;
  const hasAlienCache = resourceEvents.some(
    (e) =>
      e.type === "alien_cache" && e.guardian_hp != null && e.guardian_hp > 0,
  );

  const content = (
    <>
      {/* Quick Actions */}
      <div className="action-buttons" style={{ marginBottom: 6 }}>
        <button className="btn-action" onClick={() => onCommand?.("look")}>
          LOOK
        </button>
        {!isLanded && (
          <button className="btn-action" onClick={() => onCommand?.("scan")}>
            SCAN
          </button>
        )}
        {sector.outposts.length > 0 && !isDocked && !isLanded && (
          <button className="btn-action" onClick={() => onDock?.()}>
            DOCK
          </button>
        )}
        {isDocked && (
          <button className="btn-action" onClick={() => onUndock?.()}>
            UNDOCK
          </button>
        )}
        {isLanded && (
          <button
            className="btn-action"
            onClick={() => onLiftoff?.()}
            style={{ borderColor: "var(--yellow)", color: "var(--yellow)" }}
          >
            LIFTOFF
          </button>
        )}
        {hasPlanets && !isLanded && (
          <button
            className="btn-action"
            onClick={() => onLandClick?.()}
            style={{ borderColor: "var(--green)", color: "var(--green)" }}
          >
            PLANETS
          </button>
        )}
      </div>

      {/* Warp input */}
      {!isLanded && (
        <div className="nav-warp-row">
          <input
            className="nav-warp-input"
            type="text"
            value={warpTarget}
            onChange={(e) => setWarpTarget(e.target.value)}
            placeholder="Sector #"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleWarpTo();
            }}
          />
          <button className="btn-action" onClick={handleWarpTo}>
            WARP
          </button>
          {warpTarget &&
            (() => {
              const num = parseInt(warpTarget, 10);
              if (isNaN(num) || num <= 0 || !exploredSet) return null;
              const isExplored = exploredSet.has(num);
              return (
                <span
                  className={`warp-risk-icon warp-risk-icon--${isExplored ? "explored" : "unknown"}`}
                  title={
                    isExplored
                      ? "Explored sector"
                      : "Unexplored — proceed with caution"
                  }
                >
                  {isExplored ? "✓" : "⚠"}
                </span>
              );
            })()}
        </div>
      )}

      <div className="panel-row">
        <span className="panel-label">Type:</span>
        <span className={`sector-type-${sector.type}`}>{sector.type}</span>
      </div>
      <div className="panel-row">
        <span className="panel-label">Region:</span>
        <span>{sector.regionId}</span>
      </div>
      {sector.hasStarMall && (
        <div className="panel-row text-success">★ Star Mall Present</div>
      )}

      {/* Sector Alerts */}
      {(hasResourceEvents ||
        variantPlanets.length > 0 ||
        npcs.length > 0 ||
        hasAlienCache) && (
        <>
          <div className="panel-subheader" style={{ color: "var(--yellow)" }}>
            Sector Alerts
          </div>
          <div className="alert-items" style={{ padding: "0 0 4px" }}>
            {hasResourceEvents && (
              <div
                className="alert-item alert-item--resource"
                style={{ cursor: "pointer" }}
                onClick={() => onAlertClick?.("explore")}
              >
                {resourceEvents.length} resource event
                {resourceEvents.length !== 1 ? "s" : ""} detected
              </div>
            )}
            {hasAlienCache && (
              <div
                className="alert-item alert-item--danger"
                style={{ cursor: "pointer" }}
                onClick={() => onAlertClick?.("explore")}
              >
                Alien cache guardian active
              </div>
            )}
            {variantPlanets.length > 0 && (
              <div
                className="alert-item alert-item--special"
                style={{ cursor: "pointer" }}
                onClick={() => onAlertClick?.("planets")}
              >
                {variantPlanets.length} variant planet
                {variantPlanets.length !== 1 ? "s" : ""}
              </div>
            )}
            {npcs.length > 0 && (
              <div
                className="alert-item alert-item--npc"
                style={{ cursor: "pointer" }}
                onClick={() => {
                  if (onNPCClick && npcs.length === 1) {
                    onNPCClick(npcs[0].id);
                  } else if (onNPCClick) {
                    onNPCClick("");
                  }
                }}
              >
                {npcs.length} NPC{npcs.length !== 1 ? "s" : ""} present
              </div>
            )}
          </div>
        </>
      )}

      {!isLanded && (
        <>
          <div className="panel-subheader">Adjacent Sectors</div>
          <div className="adjacent-sectors">
            {sector.adjacentSectors.map((adj) => (
              <button
                key={adj.sectorId}
                className="sector-btn"
                onClick={() => onMoveToSector(adj.sectorId)}
                title={adj.oneWay ? "One-way route" : "Two-way route"}
              >
                {adj.sectorId}
                {adj.oneWay && " →"}
              </button>
            ))}
          </div>
        </>
      )}

      {warpGates.length > 0 && (
        <>
          <div className="panel-subheader" style={{ color: "var(--purple)" }}>
            Warp Gates
          </div>
          <div className="adjacent-sectors">
            {warpGates.map((g) => (
              <button
                key={g.id}
                className="sector-btn"
                onClick={() => handleUseGate(g.id)}
                title={g.toll > 0 ? `Toll: ${g.toll} cr` : "Free passage"}
                style={{ borderColor: "var(--purple)" }}
              >
                →{g.destinationSectorId}
                {g.toll > 0 && (
                  <span
                    style={{
                      fontSize: 9,
                      color: "var(--yellow)",
                      marginLeft: 2,
                    }}
                  >
                    {g.toll}cr
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )}

      {sector.players.length > 0 && (
        <>
          <div className="panel-subheader text-warning">
            Players ({sector.players.length})
          </div>
          {sector.players.map((p) => {
            const isAllied = alliedPlayerIds?.includes(p.id);
            return (
              <div key={p.id} className="panel-row text-warning">
                {p.username}
                {isAllied && (
                  <span
                    style={{
                      color: "var(--green)",
                      marginLeft: 6,
                      fontSize: "0.769rem",
                    }}
                  >
                    (allied)
                  </span>
                )}
              </div>
            );
          })}
        </>
      )}

      {sector.outposts.length > 0 && (
        <>
          <div className="panel-subheader">
            Outposts ({sector.outposts.length})
          </div>
          {sector.outposts.map((o) => (
            <div key={o.id} className="panel-row">
              {o.name}
            </div>
          ))}
        </>
      )}

      {sector.planets.length > 0 && (
        <>
          <div
            className="panel-subheader"
            style={{ cursor: "pointer", userSelect: "none" }}
            onClick={() => setPlanetsExpanded((v) => !v)}
          >
            <span style={{ color: "var(--cyan)", marginRight: 4 }}>
              {planetsExpanded ? "[-]" : "[+]"}
            </span>
            Planets ({sector.planets.length})
          </div>
          {planetsExpanded &&
            sector.planets.map((p) => {
              const typeInfo = getPlanetTypeInfo(p.planetClass);
              return (
                <div
                  key={p.id}
                  className="panel-row map-planet-row"
                  onMouseEnter={() => setHoveredPlanet(p.id)}
                  onMouseLeave={() => setHoveredPlanet(null)}
                >
                  <PixelSprite
                    spriteKey={`planet_${p.planetClass}`}
                    size={16}
                  />
                  <span>
                    {p.name} [{p.planetClass}]
                    {p.ownerId
                      ? " (claimed)"
                      : p.planetClass === "S"
                        ? " [seed world]"
                        : " (unclaimed)"}
                  </span>
                  {hoveredPlanet === p.id && typeInfo && (
                    <div className="planet-tooltip">
                      <div className="planet-tooltip__name">
                        {typeInfo.name}
                      </div>
                      <div className="planet-tooltip__row">
                        {typeInfo.description}
                      </div>
                      <div className="planet-tooltip__row">
                        Production: <span>{typeInfo.production}</span>
                      </div>
                      {typeInfo.uniqueResource && (
                        <div className="planet-tooltip__row">
                          Unique: <span>{typeInfo.uniqueResource}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </>
      )}
    </>
  );

  if (bare) return <div className="panel-content">{content}</div>;
  return (
    <CollapsiblePanel title={`NAVIGATION - Sector ${sector.sectorId}`}>
      {content}
    </CollapsiblePanel>
  );
}
