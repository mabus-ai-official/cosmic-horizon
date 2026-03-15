import { useState, useEffect } from "react";
import CollapsiblePanel from "./CollapsiblePanel";
import PixelSprite from "./PixelSprite";
import AriaPanel from "./AriaPanel";
import {
  getSectorWarpGates,
  useWarpGate,
  getResourceEvents,
  getNearestStarMall,
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
  onWarpTo?: (sectorId: number, confirmed?: boolean) => void;
  onCommand?: (cmd: string) => void;
  onNPCClick?: (npcId: string) => void;
  onAlertClick?: (panel: string) => void;
  isDocked?: boolean;
  isLanded?: boolean;
  hasPlanets?: boolean;
  hasScanner?: boolean;
  hasStarMall?: boolean;
  onDock?: () => void;
  onUndock?: () => void;
  onLandClick?: () => void;
  onLiftoff?: () => void;
  exploredSectorIds?: number[];
  alliedPlayerIds?: string[];
  bare?: boolean;
  initialTab?: "helm" | "aria";
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
  hasScanner,
  hasStarMall,
  onDock,
  onUndock,
  onLandClick,
  onLiftoff,
  exploredSectorIds,
  alliedPlayerIds,
  bare,
  initialTab = "helm",
}: MapPanelProps) {
  const [activeTab, setActiveTab] = useState<"helm" | "aria">(initialTab);
  const [warpGates, setWarpGates] = useState<WarpGate[]>([]);
  const [warpTarget, setWarpTarget] = useState("");
  const [hoveredPlanet, setHoveredPlanet] = useState<string | null>(null);
  const [planetsExpanded, setPlanetsExpanded] = useState(false);
  const exploredSet = exploredSectorIds ? new Set(exploredSectorIds) : null;
  const [resourceEvents, setResourceEvents] = useState<ResourceEvent[]>([]);
  const [confirmWarp, setConfirmWarp] = useState(false);
  const [nearestMall, setNearestMall] = useState<{
    sectorId: number;
    distance: number;
    nextHop: number;
  } | null>(null);

  useEffect(() => {
    if (sector) {
      getSectorWarpGates()
        .then(({ data }) => setWarpGates(data.gates || data.warpGates || []))
        .catch(() => setWarpGates([]));
      getResourceEvents()
        .then(({ data }) => setResourceEvents(data.resourceEvents || []))
        .catch(() => setResourceEvents([]));
      if (!sector.hasStarMall) {
        getNearestStarMall()
          .then(({ data }) => setNearestMall(data))
          .catch(() => setNearestMall(null));
      } else {
        setNearestMall(null);
      }
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
    if (isNaN(num) || num <= 0) return;

    const isUnexplored = exploredSet && !exploredSet.has(num);

    // If target is unexplored and not yet confirmed, require confirmation
    if (isUnexplored && !confirmWarp) {
      setConfirmWarp(true);
      return;
    }

    const wasConfirmed = confirmWarp;
    setConfirmWarp(false);
    if (onWarpTo) {
      onWarpTo(num, wasConfirmed);
    } else {
      onMoveToSector(num);
    }
    setWarpTarget("");
  };

  const handleCancelWarp = () => {
    setConfirmWarp(false);
  };

  const tabBar = (
    <div className="group-panel-tabs">
      <span
        onClick={() => setActiveTab("helm")}
        style={{
          cursor: "pointer",
          color: activeTab === "helm" ? "#0f0" : "#666",
        }}
      >
        {activeTab === "helm" ? "[Helm]" : "Helm"}
      </span>
      <span style={{ color: "#444", margin: "0 0.5rem" }}>|</span>
      <span
        onClick={() => setActiveTab("aria")}
        style={{
          cursor: "pointer",
          color: activeTab === "aria" ? "#d29922" : "#666",
        }}
      >
        {activeTab === "aria" ? "[ARIA]" : "ARIA"}
      </span>
    </div>
  );

  if (!sector) {
    const body = activeTab === "aria" ? <AriaPanel bare /> : <div>No data</div>;
    if (bare)
      return (
        <div className="panel-content">
          {tabBar}
          {body}
        </div>
      );
    return (
      <CollapsiblePanel title="NAVIGATION">
        {tabBar}
        {body}
      </CollapsiblePanel>
    );
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
    <div className="panel-sections">
      {/* Dock / Undock / Liftoff — prominent station actions */}
      {(sector.outposts.length > 0 || hasStarMall) &&
        !isDocked &&
        !isLanded && (
          <button
            className="helm-dock-btn"
            data-tutorial="dock-btn"
            onClick={() => onDock?.()}
          >
            <span className="helm-dock-btn__icon">⚓</span>
            <span className="helm-dock-btn__text">DOCK AT STATION</span>
          </button>
        )}
      {isDocked && (
        <button
          className="helm-dock-btn helm-dock-btn--undock"
          data-tutorial="undock-btn"
          onClick={() => onUndock?.()}
        >
          <span className="helm-dock-btn__icon">↗</span>
          <span className="helm-dock-btn__text">UNDOCK</span>
        </button>
      )}
      {isLanded && (
        <button
          className="helm-dock-btn helm-dock-btn--liftoff"
          data-tutorial="liftoff-btn"
          onClick={() => onLiftoff?.()}
        >
          <span className="helm-dock-btn__icon">🚀</span>
          <span className="helm-dock-btn__text">LIFTOFF</span>
        </button>
      )}

      {/* Quick Actions */}
      <div className="action-buttons">
        {hasScanner && !isLanded && (
          <button
            className="helm-dock-btn"
            data-tutorial="scan-btn"
            onClick={() => onCommand?.("scan")}
          >
            <span className="helm-dock-btn__icon">{"\u{1F4E1}"}</span>
            <span className="helm-dock-btn__text">SCAN</span>
          </button>
        )}
        {hasPlanets && !isLanded && (
          <button className="helm-dock-btn" onClick={() => onLandClick?.()}>
            <span className="helm-dock-btn__icon">🌍</span>
            <span className="helm-dock-btn__text">PLANETS</span>
          </button>
        )}
      </div>

      {/* Warp Navigation */}
      {!isLanded && (
        <div className="panel-section panel-section--accent">
          <div className="panel-section__header">Warp Drive</div>
          <div className="helm-warp-row">
            <input
              className="helm-warp-input"
              type="text"
              value={warpTarget}
              onChange={(e) => {
                setWarpTarget(e.target.value);
                setConfirmWarp(false);
              }}
              placeholder="Sector #"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleWarpTo();
                if (e.key === "Escape") handleCancelWarp();
              }}
            />
            {confirmWarp ? (
              <>
                <button
                  className="helm-warp-btn helm-warp-btn--confirm"
                  onClick={handleWarpTo}
                >
                  CONFIRM
                </button>
                <button
                  className="helm-warp-btn helm-warp-btn--cancel"
                  onClick={handleCancelWarp}
                >
                  CANCEL
                </button>
              </>
            ) : (
              <button className="helm-warp-btn" onClick={handleWarpTo}>
                ENGAGE
              </button>
            )}
            {warpTarget &&
              !confirmWarp &&
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
          {confirmWarp && (
            <div
              style={{
                color: "var(--yellow)",
                fontSize: "0.75rem",
              }}
            >
              Sector {warpTarget} is unexplored. Unknown risks ahead — confirm
              warp?
            </div>
          )}
        </div>
      )}

      {/* Sector Info */}
      <div className="panel-section panel-section--accent">
        <div className="panel-section__header">Sector Info</div>
        <div className="panel-kv">
          <span className="panel-kv__label">Type</span>
          <span className={`panel-kv__value sector-type-${sector.type}`}>
            {sector.type}
          </span>
        </div>
        <div className="panel-kv">
          <span className="panel-kv__label">Region</span>
          <span className="panel-kv__value">{sector.regionId}</span>
        </div>
        {sector.hasStarMall && (
          <div className="panel-kv">
            <span className="panel-kv__label">Facility</span>
            <span className="panel-kv__value panel-kv__value--success">
              ★ Star Mall
            </span>
          </div>
        )}
        {!sector.hasStarMall && nearestMall && (
          <div
            className="panel-list-item panel-list-item--clickable"
            onClick={() => {
              setWarpTarget(String(nearestMall.sectorId));
              setConfirmWarp(false);
            }}
            title={`Warp to nearest Star Mall (Sector ${nearestMall.sectorId})`}
          >
            <span className="panel-list-item__dot panel-list-item__dot--warning" />
            <span style={{ color: "var(--yellow)", fontSize: "0.769rem" }}>
              Nearest Star Mall: Sector {nearestMall.sectorId} (
              {nearestMall.distance} hops)
            </span>
          </div>
        )}
      </div>

      {/* Sector Alerts */}
      {(hasResourceEvents ||
        variantPlanets.length > 0 ||
        npcs.length > 0 ||
        hasAlienCache) && (
        <div className="panel-section panel-section--warning">
          <div className="panel-section__header panel-section__header--warning">
            Alerts
          </div>
          {hasResourceEvents && (
            <div
              className="panel-list-item panel-list-item--clickable"
              onClick={() => onAlertClick?.("explore")}
            >
              <span className="panel-list-item__dot panel-list-item__dot--resource" />
              {resourceEvents.length} resource event
              {resourceEvents.length !== 1 ? "s" : ""} detected
            </div>
          )}
          {hasAlienCache && (
            <div
              className="panel-list-item panel-list-item--clickable"
              onClick={() => onAlertClick?.("explore")}
            >
              <span className="panel-list-item__dot panel-list-item__dot--danger" />
              <span style={{ color: "var(--red)" }}>
                Alien cache guardian active
              </span>
            </div>
          )}
          {variantPlanets.length > 0 && (
            <div
              className="panel-list-item panel-list-item--clickable"
              onClick={() => onAlertClick?.("planets")}
            >
              <span className="panel-list-item__dot panel-list-item__dot--special" />
              {variantPlanets.length} variant planet
              {variantPlanets.length !== 1 ? "s" : ""}
            </div>
          )}
          {npcs.length > 0 && (
            <div
              className="panel-list-item panel-list-item--clickable"
              onClick={() => {
                if (onNPCClick && npcs.length === 1) {
                  onNPCClick(npcs[0].id);
                } else if (onNPCClick) {
                  onNPCClick("");
                }
              }}
            >
              <span className="panel-list-item__dot panel-list-item__dot--npc" />
              {npcs.length} NPC{npcs.length !== 1 ? "s" : ""} present
            </div>
          )}
        </div>
      )}

      {/* Adjacent Sectors */}
      {!isLanded && (
        <div className="panel-section">
          <div className="panel-section__header panel-section__header--muted">
            Adjacent Sectors
          </div>
          <div className="panel-btn-grid">
            {sector.adjacentSectors.map((adj) => (
              <button
                key={adj.sectorId}
                className="sector-btn"
                data-tutorial="move-btn"
                onClick={() => onMoveToSector(adj.sectorId)}
                title={adj.oneWay ? "One-way route" : "Two-way route"}
              >
                {adj.sectorId}
                {adj.oneWay && " →"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Warp Gates */}
      {warpGates.length > 0 && (
        <div className="panel-section panel-section--special">
          <div className="panel-section__header panel-section__header--special">
            Warp Gates
          </div>
          <div className="panel-btn-grid">
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
        </div>
      )}

      {/* Players */}
      {sector.players.length > 0 && (
        <div className="panel-section panel-section--danger">
          <div className="panel-section__header panel-section__header--danger">
            Players ({sector.players.length})
          </div>
          {sector.players.map((p) => {
            const isAllied = alliedPlayerIds?.includes(p.id);
            return (
              <div key={p.id} className="panel-list-item">
                <span className="panel-list-item__dot panel-list-item__dot--warning" />
                <span style={{ color: "var(--yellow)" }}>{p.username}</span>
                {isAllied && (
                  <span
                    style={{
                      color: "var(--green)",
                      fontSize: "0.769rem",
                    }}
                  >
                    (allied)
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Outposts */}
      {sector.outposts.length > 0 && (
        <div className="panel-section">
          <div className="panel-section__header panel-section__header--muted">
            Outposts ({sector.outposts.length})
          </div>
          {sector.outposts.map((o) => (
            <div key={o.id} className="panel-list-item">
              <span className="panel-list-item__dot panel-list-item__dot--resource" />
              {o.name}
            </div>
          ))}
        </div>
      )}

      {/* Planets */}
      {sector.planets.length > 0 && (
        <div className="panel-section">
          <div
            className="panel-section__header panel-section__header--muted"
            style={{ cursor: "pointer", userSelect: "none" }}
            onClick={() => setPlanetsExpanded((v) => !v)}
          >
            <span
              style={{
                color: "var(--cyan)",
                marginRight: 4,
                fontSize: "0.769rem",
              }}
            >
              {planetsExpanded ? "▾" : "▸"}
            </span>
            Planets ({sector.planets.length})
          </div>
          {planetsExpanded &&
            sector.planets.map((p) => {
              const typeInfo = getPlanetTypeInfo(p.planetClass);
              return (
                <div
                  key={p.id}
                  className="panel-list-item panel-list-item--clickable map-planet-row"
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
        </div>
      )}
    </div>
  );

  const body = activeTab === "aria" ? <AriaPanel bare /> : content;

  if (bare)
    return (
      <div className="panel-content">
        {tabBar}
        {body}
      </div>
    );
  return (
    <CollapsiblePanel title={`NAVIGATION - Sector ${sector.sectorId}`}>
      {tabBar}
      {body}
    </CollapsiblePanel>
  );
}
