import { useState, useEffect } from "react";
import CollapsiblePanel from "./CollapsiblePanel";
import DeployablesPanel from "./DeployablesPanel";
import {
  getSectorEvents,
  investigateEvent,
  getResourceEvents,
  harvestEvent,
  salvageEvent,
  attackGuardian,
  getSectorInfo,
  claimSector,
  nameSector,
  conquerSector,
  registerSectorFaction,
  getFactionReps,
} from "../services/api";

interface SectorEvent {
  id: string;
  eventType: string;
  description?: string;
  createdAt: string;
  expiresAt: string;
}

interface ResourceNode {
  resourceId: string;
  name: string;
  quantity: number;
  harvested: boolean;
}

interface ResourceEvent {
  id: string;
  eventType: string;
  resources: ResourceNode[];
  remainingNodes: number;
  totalValue: number;
  timeRemaining: number;
  expiresAt: string;
  guardianHp: number | null;
  claimedBy: string | null;
}

type LineType =
  | "info"
  | "success"
  | "error"
  | "warning"
  | "system"
  | "combat"
  | "trade";

interface SectorInfo {
  sectorName: string | null;
  owner: { name: string; type: "player" | "syndicate" } | null;
  isNpcStarmall: boolean;
  claimedAt: string | null;
  registeredFaction: { id: string; name: string } | null;
}

interface Props {
  refreshKey?: number;
  bare?: boolean;
  sectorId?: number | null;
  playerName?: string;
  hasNamingAuthority?: boolean;
  onAddLine?: (text: string, type?: LineType) => void;
  onRefreshStatus?: () => void;
}

type TabView = "events" | "resources" | "deployables" | "sector";

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return "expired";
  const mins = Math.floor(ms / 60000);
  const hrs = Math.floor(mins / 60);
  return hrs > 0 ? `${hrs}h ${mins % 60}m` : `${mins}m`;
}

function getTimeColor(ms: number): string {
  const mins = ms / 60000;
  if (mins < 15) return "var(--red)";
  if (mins < 60) return "var(--yellow)";
  return "var(--green)";
}

export default function ExplorePanel({
  refreshKey,
  bare,
  sectorId,
  playerName,
  hasNamingAuthority,
  onAddLine,
  onRefreshStatus,
}: Props) {
  const [tab, setTab] = useState<TabView>("events");
  const [events, setEvents] = useState<SectorEvent[]>([]);
  const [resourceEvents, setResourceEvents] = useState<ResourceEvent[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  // Sector tab state
  const [sectorInfo, setSectorInfo] = useState<SectorInfo | null>(null);
  const [sectorNameInput, setSectorNameInput] = useState("");
  const [sectorBusy, setSectorBusy] = useState(false);
  const [sectorError, setSectorError] = useState<string | null>(null);
  const [claimType, setClaimType] = useState<"player" | "syndicate">("player");
  const [selectedFaction, setSelectedFaction] = useState("");
  const [factions, setFactions] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    getSectorEvents()
      .then(({ data }) => setEvents(data.events || []))
      .catch(() => setEvents([]));
  }, [refreshKey]);

  useEffect(() => {
    if (tab === "resources") {
      getResourceEvents()
        .then(({ data }) => setResourceEvents(data.resourceEvents || []))
        .catch(() => setResourceEvents([]));
    }
  }, [tab, refreshKey]);

  const fetchSectorInfo = async () => {
    if (!sectorId) return;
    try {
      const { data } = await getSectorInfo(sectorId);
      setSectorInfo(data);
      setSectorError(null);
    } catch {
      setSectorInfo(null);
      setSectorError("Failed to load sector info.");
    }
  };

  useEffect(() => {
    if (tab === "sector" && sectorId) {
      fetchSectorInfo();
      getFactionReps()
        .then(({ data }) => setFactions(data.factions || []))
        .catch(() => setFactions([]));
    }
  }, [tab, sectorId, refreshKey]);

  const handleClaimSector = async () => {
    if (!sectorId) return;
    setSectorBusy(true);
    setSectorError(null);
    try {
      await claimSector(sectorId, claimType);
      onAddLine?.(`Sector claimed as ${claimType}!`, "success");
      onRefreshStatus?.();
      await fetchSectorInfo();
    } catch (err: any) {
      const msg = err.response?.data?.error || "Claim failed";
      setSectorError(msg);
      onAddLine?.(msg, "error");
    } finally {
      setSectorBusy(false);
    }
  };

  const handleNameSector = async () => {
    if (!sectorId || !sectorNameInput.trim()) return;
    setSectorBusy(true);
    setSectorError(null);
    try {
      await nameSector(sectorId, sectorNameInput.trim());
      onAddLine?.(`Sector renamed to "${sectorNameInput.trim()}"`, "success");
      onRefreshStatus?.();
      await fetchSectorInfo();
      setSectorNameInput("");
    } catch (err: any) {
      const msg = err.response?.data?.error || "Rename failed";
      setSectorError(msg);
      onAddLine?.(msg, "error");
    } finally {
      setSectorBusy(false);
    }
  };

  const handleConquerSector = async () => {
    if (!sectorId) return;
    setSectorBusy(true);
    setSectorError(null);
    try {
      await conquerSector(sectorId);
      onAddLine?.("Sector conquered!", "success");
      onRefreshStatus?.();
      await fetchSectorInfo();
    } catch (err: any) {
      const msg = err.response?.data?.error || "Conquest failed";
      setSectorError(msg);
      onAddLine?.(msg, "error");
    } finally {
      setSectorBusy(false);
    }
  };

  const handleRegisterFaction = async () => {
    if (!sectorId || !selectedFaction) return;
    setSectorBusy(true);
    setSectorError(null);
    try {
      const { data } = await registerSectorFaction(sectorId, selectedFaction);
      onAddLine?.(`${data.message} (+${data.fameAwarded} fame)`, "success");
      onRefreshStatus?.();
      await fetchSectorInfo();
    } catch (err: any) {
      const msg = err.response?.data?.error || "Registration failed";
      setSectorError(msg);
      onAddLine?.(msg, "error");
    } finally {
      setSectorBusy(false);
    }
  };

  const handleInvestigate = async (eventId: string) => {
    setBusy(eventId);
    setResult(null);
    try {
      const { data } = await investigateEvent(eventId);
      setResult(data.message || "Investigated.");
      const res = await getSectorEvents();
      setEvents(res.data.events || []);
    } catch {
      setResult("Failed to investigate.");
    } finally {
      setBusy(null);
    }
  };

  const handleHarvest = async (eventId: string, nodeIndex: number) => {
    setBusy(`${eventId}-${nodeIndex}`);
    try {
      const { data: hData } = await harvestEvent(eventId, nodeIndex);
      if (hData.resource) {
        const msg = `Harvested ${hData.resource.name} x${hData.resource.quantity}`;
        setResult(msg);
        onAddLine?.(msg, "success");
        if (hData.remainingNodes > 0) {
          onAddLine?.(`${hData.remainingNodes} nodes remaining`, "info");
        } else {
          onAddLine?.("Event depleted", "info");
        }
      }
      onRefreshStatus?.();
      const { data } = await getResourceEvents();
      setResourceEvents(data.resourceEvents || []);
    } catch (err: any) {
      const msg = err.response?.data?.error || "Harvest failed";
      setResult(msg);
      onAddLine?.(msg, "error");
    } finally {
      setBusy(null);
    }
  };

  const handleSalvage = async (eventId: string) => {
    setBusy(eventId);
    try {
      const { data: sData } = await salvageEvent(eventId);
      onAddLine?.("=== DERELICT SALVAGED ===", "system");
      if (sData.credits > 0) {
        onAddLine?.(`Credits: +${sData.credits.toLocaleString()}`, "trade");
      }
      if (sData.resources?.length > 0) {
        for (const r of sData.resources) {
          onAddLine?.(`${r.name} x${r.quantity} added to resources`, "trade");
        }
      }
      if (sData.tabletDrop) {
        onAddLine?.(
          `Tablet found: ${sData.tabletDrop.name} (${sData.tabletDrop.rarity})!`,
          "success",
        );
      }
      const parts: string[] = [];
      if (sData.credits > 0)
        parts.push(`+${sData.credits.toLocaleString()} cr`);
      if (sData.resources?.length > 0)
        parts.push(
          sData.resources
            .map((r: any) => `${r.name} x${r.quantity}`)
            .join(", "),
        );
      setResult(`Salvaged: ${parts.join(" | ") || "nothing"}`);
      onRefreshStatus?.();
      const { data } = await getResourceEvents();
      setResourceEvents(data.resourceEvents || []);
    } catch (err: any) {
      const msg = err.response?.data?.error || "Salvage failed";
      setResult(msg);
      onAddLine?.(msg, "error");
    } finally {
      setBusy(null);
    }
  };

  const handleAttack = async (eventId: string) => {
    setBusy(eventId);
    try {
      const { data: aData } = await attackGuardian(eventId);
      onAddLine?.(
        `You attack the guardian! Damage dealt: ${aData.damageDealt}`,
        "combat",
      );
      if (aData.damageTaken > 0)
        onAddLine?.(`Damage taken: ${aData.damageTaken}`, "warning");
      if (aData.defeated) {
        onAddLine?.("=== GUARDIAN DEFEATED ===", "success");
        if (aData.loot?.resources?.length > 0) {
          for (const r of aData.loot.resources) {
            onAddLine?.(`Loot: ${r.name} x${r.quantity}`, "trade");
          }
        }
        setResult("Guardian defeated!");
      } else {
        setResult(`Guardian HP: ${aData.remainingHp}/50`);
      }
      onRefreshStatus?.();
      const { data } = await getResourceEvents();
      setResourceEvents(data.resourceEvents || []);
    } catch (err: any) {
      const msg = err.response?.data?.error || "Attack failed";
      setResult(msg);
      onAddLine?.(msg, "error");
    } finally {
      setBusy(null);
    }
  };

  const tabBar = (
    <div className="group-panel-tabs">
      <span
        onClick={() => setTab("events")}
        style={{ cursor: "pointer", color: tab === "events" ? "#0f0" : "#666" }}
      >
        {tab === "events" ? "[Events]" : "Events"}
      </span>
      <span style={{ color: "#444", margin: "0 0.5rem" }}>|</span>
      <span
        onClick={() => setTab("resources")}
        style={{
          cursor: "pointer",
          color: tab === "resources" ? "#0f0" : "#666",
        }}
      >
        {tab === "resources" ? "[Resources]" : "Resources"}
      </span>
      <span style={{ color: "#444", margin: "0 0.5rem" }}>|</span>
      <span
        onClick={() => setTab("deployables")}
        style={{
          cursor: "pointer",
          color: tab === "deployables" ? "#0f0" : "#666",
        }}
      >
        {tab === "deployables" ? "[Deployables]" : "Deployables"}
      </span>
      <span style={{ color: "#444", margin: "0 0.5rem" }}>|</span>
      <span
        onClick={() => setTab("sector")}
        style={{ cursor: "pointer", color: tab === "sector" ? "#0f0" : "#666" }}
      >
        {tab === "sector" ? "[Sector]" : "Sector"}
      </span>
    </div>
  );

  const eventsContent =
    events.length === 0 ? (
      <div className="text-muted">No events in this sector.</div>
    ) : (
      <>
        {result && (
          <div
            style={{ color: "var(--cyan)", fontSize: "11px", marginBottom: 8 }}
          >
            {result}
          </div>
        )}
        {events.map((ev) => {
          const remaining = new Date(ev.expiresAt).getTime() - Date.now();
          return (
            <div key={ev.id} className="resource-event-item">
              <div className="resource-event-item__header">
                <span className="resource-event-item__type">
                  {ev.eventType}
                </span>
                <span
                  className="resource-event-item__time"
                  style={{ color: getTimeColor(remaining) }}
                >
                  {formatTimeRemaining(remaining)}
                </span>
              </div>
              {ev.description && (
                <div className="resource-event-item__details">
                  {ev.description}
                </div>
              )}
              <button
                className="btn-sm btn-buy"
                onClick={() => handleInvestigate(ev.id)}
                disabled={busy === ev.id}
              >
                {busy === ev.id ? "..." : "INVESTIGATE"}
              </button>
            </div>
          );
        })}
      </>
    );

  const resourcesContent =
    resourceEvents.length === 0 ? (
      <div className="text-muted">No resource events in this sector.</div>
    ) : (
      <>
        {result && (
          <div
            style={{ color: "var(--cyan)", fontSize: "11px", marginBottom: 8 }}
          >
            {result}
          </div>
        )}
        {resourceEvents.map((ev) => {
          const remaining =
            ev.timeRemaining > 0
              ? ev.timeRemaining
              : Math.max(0, new Date(ev.expiresAt).getTime() - Date.now());
          const typeClass = `resource-event-item__type--${ev.eventType}`;
          return (
            <div key={ev.id} className="resource-event-item">
              <div className="resource-event-item__header">
                <span className={`resource-event-item__type ${typeClass}`}>
                  {ev.eventType.replace("_", " ").toUpperCase()}
                </span>
                <span
                  className="resource-event-item__time"
                  style={{ color: getTimeColor(remaining) }}
                >
                  {formatTimeRemaining(remaining)}
                </span>
              </div>

              {ev.eventType === "asteroid_field" && ev.resources && (
                <div className="resource-event-item__nodes">
                  {ev.resources.map((node, idx) => (
                    <button
                      key={idx}
                      className="btn-sm btn-buy"
                      onClick={() => handleHarvest(ev.id, idx)}
                      disabled={node.harvested || busy === `${ev.id}-${idx}`}
                    >
                      {node.harvested ? "Done" : `Harvest ${node.name}`}
                    </button>
                  ))}
                </div>
              )}

              {ev.eventType === "derelict" && (
                <div style={{ marginTop: 4 }}>
                  {ev.claimedBy ? (
                    <span className="text-muted" style={{ fontSize: 11 }}>
                      Already claimed
                    </span>
                  ) : (
                    <button
                      className="btn-sm btn-buy"
                      onClick={() => handleSalvage(ev.id)}
                      disabled={busy === ev.id}
                    >
                      {busy === ev.id ? "..." : "SALVAGE"}
                    </button>
                  )}
                </div>
              )}

              {ev.eventType === "anomaly" && (
                <div style={{ marginTop: 4 }}>
                  <button
                    className="btn-sm btn-buy"
                    onClick={() => handleHarvest(ev.id, 0)}
                    disabled={busy === `${ev.id}-0`}
                  >
                    {busy === `${ev.id}-0` ? "..." : "HARVEST"}
                  </button>
                </div>
              )}

              {ev.eventType === "alien_cache" && (
                <div style={{ marginTop: 4 }}>
                  {ev.guardianHp != null && ev.guardianHp > 0 ? (
                    <>
                      <div className="guardian-hp-bar">
                        <div
                          className="guardian-hp-bar__fill"
                          style={{ width: `${(ev.guardianHp / 50) * 100}%` }}
                        />
                      </div>
                      <div className="resource-event-item__details">
                        Guardian HP: {ev.guardianHp}/50
                      </div>
                      <button
                        className="btn-sm btn-fire"
                        onClick={() => handleAttack(ev.id)}
                        disabled={busy === ev.id}
                      >
                        {busy === ev.id ? "..." : "ATTACK"}
                      </button>
                    </>
                  ) : ev.claimedBy ? (
                    <div className="text-muted" style={{ fontSize: 11 }}>
                      Already claimed
                    </div>
                  ) : (
                    <div
                      className="resource-event-item__details"
                      style={{ color: "var(--green)" }}
                    >
                      Guardian defeated — claim available
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </>
    );

  const isClaimedByMe =
    sectorInfo?.owner?.type === "player" &&
    sectorInfo?.owner?.name === playerName;
  const isClaimed = !!sectorInfo?.owner;

  const sectorContent = !sectorId ? (
    <div className="text-muted">No sector data available.</div>
  ) : !sectorInfo ? (
    sectorError ? (
      <div style={{ color: "var(--red)", fontSize: 11 }}>{sectorError}</div>
    ) : (
      <div className="text-muted">Loading sector info...</div>
    )
  ) : (
    <div style={{ fontSize: 12 }}>
      {sectorError && (
        <div style={{ color: "var(--red)", fontSize: 11, marginBottom: 8 }}>
          {sectorError}
        </div>
      )}

      {/* Sector name */}
      {sectorInfo.sectorName && (
        <div
          style={{ color: "var(--cyan)", fontWeight: "bold", marginBottom: 6 }}
        >
          {sectorInfo.sectorName}
        </div>
      )}

      {/* Claim status */}
      <div style={{ marginBottom: 8, color: "#aaa" }}>
        {sectorInfo.isNpcStarmall ? (
          <span style={{ color: "var(--yellow)" }}>
            NPC Star Mall (cannot be claimed)
          </span>
        ) : sectorInfo.owner?.type === "player" ? (
          <span>
            Claimed by{" "}
            <span style={{ color: "var(--green)" }}>
              {sectorInfo.owner.name}
            </span>
          </span>
        ) : sectorInfo.owner?.type === "syndicate" ? (
          <span>
            Claimed by syndicate:{" "}
            <span style={{ color: "var(--magenta)" }}>
              {sectorInfo.owner.name}
            </span>
          </span>
        ) : (
          <span style={{ color: "#666" }}>Unclaimed</span>
        )}
      </div>

      {/* Registered faction */}
      {sectorInfo.registeredFaction && (
        <div style={{ fontSize: 11, color: "var(--cyan)", marginBottom: 8 }}>
          Faction: {sectorInfo.registeredFaction.name}
        </div>
      )}

      {/* Claimed at date */}
      {sectorInfo.claimedAt && (
        <div style={{ fontSize: 10, color: "#555", marginBottom: 8 }}>
          Claimed: {new Date(sectorInfo.claimedAt).toLocaleDateString()}
        </div>
      )}

      {/* Unclaimed and not NPC: show claim controls */}
      {!isClaimed && !sectorInfo.isNpcStarmall && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ marginBottom: 4 }}>
            <label
              style={{
                cursor: "pointer",
                marginRight: 12,
                color: claimType === "player" ? "var(--green)" : "#666",
              }}
            >
              <input
                type="radio"
                name="claimType"
                checked={claimType === "player"}
                onChange={() => setClaimType("player")}
                style={{ marginRight: 4 }}
              />
              Player
            </label>
            <label
              style={{
                cursor: "pointer",
                color: claimType === "syndicate" ? "var(--magenta)" : "#666",
              }}
            >
              <input
                type="radio"
                name="claimType"
                checked={claimType === "syndicate"}
                onChange={() => setClaimType("syndicate")}
                style={{ marginRight: 4 }}
              />
              Syndicate
            </label>
          </div>
          <button
            className="btn-sm btn-buy"
            onClick={handleClaimSector}
            disabled={sectorBusy}
          >
            {sectorBusy ? "..." : "CLAIM SECTOR"}
          </button>
        </div>
      )}

      {/* Claimed by current player: rename controls */}
      {isClaimedByMe && !hasNamingAuthority && (
        <div style={{ marginBottom: 8, fontSize: 11, color: "#888" }}>
          Complete 'Stellar Census' to unlock naming
        </div>
      )}
      {isClaimedByMe && hasNamingAuthority && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <input
              type="text"
              value={sectorNameInput}
              onChange={(e) => setSectorNameInput(e.target.value)}
              placeholder="New sector name"
              maxLength={32}
              style={{
                background: "#111",
                border: "1px solid #333",
                color: "#ccc",
                padding: "2px 6px",
                fontSize: 11,
                flex: 1,
              }}
            />
            <button
              className="btn-sm btn-buy"
              onClick={handleNameSector}
              disabled={sectorBusy || !sectorNameInput.trim()}
            >
              {sectorBusy ? "..." : "RENAME"}
            </button>
          </div>
        </div>
      )}

      {/* Claimed by another player: conquer controls */}
      {isClaimed && !isClaimedByMe && !sectorInfo.isNpcStarmall && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ color: "var(--red)", fontSize: 10, marginBottom: 4 }}>
            Warning: Conquering a sector will provoke hostility from the current
            owner.
          </div>
          <button
            className="btn-sm btn-fire"
            onClick={handleConquerSector}
            disabled={sectorBusy}
          >
            {sectorBusy ? "..." : "CONQUER SECTOR"}
          </button>
        </div>
      )}

      {/* Faction registration — only for owned sectors without a faction */}
      {isClaimedByMe &&
        !sectorInfo.registeredFaction &&
        factions.length > 0 && (
          <div
            style={{
              marginBottom: 8,
              borderTop: "1px solid #333",
              paddingTop: 8,
            }}
          >
            <div style={{ fontSize: 11, color: "#aaa", marginBottom: 4 }}>
              Register with a faction for fame and privileges:
            </div>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <select
                value={selectedFaction}
                onChange={(e) => setSelectedFaction(e.target.value)}
                style={{
                  background: "#111",
                  border: "1px solid #333",
                  color: "#ccc",
                  padding: "2px 6px",
                  fontSize: 11,
                  flex: 1,
                }}
              >
                <option value="">Select faction...</option>
                {factions.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
              <button
                className="btn-sm btn-buy"
                onClick={handleRegisterFaction}
                disabled={sectorBusy || !selectedFaction}
              >
                {sectorBusy ? "..." : "REGISTER"}
              </button>
            </div>
          </div>
        )}
    </div>
  );

  const content = (
    <>
      {tabBar}
      {tab === "events" && eventsContent}
      {tab === "resources" && resourcesContent}
      {tab === "deployables" && (
        <DeployablesPanel refreshKey={refreshKey} bare />
      )}
      {tab === "sector" && sectorContent}
    </>
  );

  if (bare) return <div className="panel-content">{content}</div>;
  return <CollapsiblePanel title="EXPLORE">{content}</CollapsiblePanel>;
}
