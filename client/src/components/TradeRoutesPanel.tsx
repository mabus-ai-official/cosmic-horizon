import { useState, useEffect, useCallback } from "react";
import {
  getTradeRoutes,
  deleteTradeRoute,
  toggleRouteFuel,
  pauseRoute,
  resumeRoute,
  renameRoute,
  batchRoutes,
  getRouteLogs,
  scoutCaravans,
  ransackCaravan,
  escortCaravan,
  createTradeRoute,
  getOwnedPlanets,
} from "../services/api";

// ---- Types ----

interface ActiveCaravan {
  id: string;
  currentSectorId: number;
  pathIndex: number;
  pathLength: number;
  foodCargo: number;
  isProtected: boolean;
  escorted: boolean;
  defenseHp: number;
  status: string;
}

interface TradeRoute {
  id: string;
  name: string | null;
  sourceType: string;
  sourceId: string;
  sourceSectorId: number;
  destPlanetId: string;
  destPlanetName: string;
  destSectorId: number;
  pathLength: number;
  foodPerCycle: number;
  creditCost: number;
  fuelPaid: boolean;
  status: string;
  createdAt: string;
  lastDispatchAt: string | null;
  totalFoodDelivered: number;
  totalCreditsSpent: number;
  deliveryCount: number;
  lastRansackedAt: string | null;
  activeCaravan: ActiveCaravan | null;
}

interface LogEntry {
  id: string;
  caravanId: string;
  eventType: string;
  actorId: string | null;
  sectorId: number | null;
  foodAmount: number | null;
  creditsAmount: number | null;
  createdAt: string;
}

interface ScoutResult {
  id: string;
  sectorId: number;
  foodCargo: number;
  defenseHp: number;
  ownerId: string;
  ownerName: string;
}

interface OwnedPlanet {
  id: string;
  name: string;
  sectorId: number;
}

type SubTab = "routes" | "create" | "logs" | "piracy";

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: "routes", label: "My Routes" },
  { key: "create", label: "Create" },
  { key: "logs", label: "Logs" },
  { key: "piracy", label: "Piracy" },
];

// ---- Main Component ----

interface Props {
  refreshKey?: number;
  onCommand: (cmd: string) => void;
  bare?: boolean;
  currentSectorId?: number | null;
  atStarMall?: boolean;
  activeOutpost?: string | null;
}

export default function TradeRoutesPanel({
  refreshKey,
  onCommand: _onCommand,
  bare,
  currentSectorId,
  atStarMall,
  activeOutpost,
}: Props) {
  const [tab, setTab] = useState<SubTab>("routes");
  const [routes, setRoutes] = useState<TradeRoute[]>([]);
  const [maxSlots, setMaxSlots] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    getTradeRoutes()
      .then(({ data }) => {
        setRoutes(data.routes || []);
        setMaxSlots(data.maxSlots || 0);
        setActiveCount(data.activeCount || 0);
        setError(null);
      })
      .catch(() => setError("Could not load trade routes"));
  }, []);

  useEffect(refresh, [refreshKey, refresh]);

  const tabBar = (
    <div className="group-panel-tabs" style={{ marginBottom: 6 }}>
      {SUB_TABS.map((t, i) => (
        <span key={t.key}>
          {i > 0 && (
            <span style={{ color: "#444", margin: "0 0.3rem" }}>|</span>
          )}
          <span
            onClick={() => setTab(t.key)}
            style={{
              cursor: "pointer",
              color: tab === t.key ? "var(--yellow)" : "var(--grey)",
              fontWeight: tab === t.key ? "bold" : "normal",
              fontSize: 13,
            }}
          >
            {tab === t.key ? `[${t.label}]` : t.label}
          </span>
        </span>
      ))}
    </div>
  );

  const content = (
    <>
      {tabBar}
      {error && (
        <div style={{ color: "var(--red)", fontSize: 13, marginBottom: 4 }}>
          {error}
        </div>
      )}
      {tab === "routes" && (
        <MyRoutesTab
          routes={routes}
          maxSlots={maxSlots}
          activeCount={activeCount}
          onRefresh={refresh}
          onError={setError}
        />
      )}
      {tab === "create" && (
        <CreateTab
          onRefresh={refresh}
          onError={setError}
          currentSectorId={currentSectorId}
          atStarMall={atStarMall}
          activeOutpost={activeOutpost}
        />
      )}
      {tab === "logs" && <LogsTab routes={routes} />}
      {tab === "piracy" && <PiracyTab onError={setError} />}
    </>
  );

  if (bare) return <div className="panel-content">{content}</div>;
  return <div className="panel-content">{content}</div>;
}

// ---- My Routes Tab ----

function MyRoutesTab({
  routes,
  maxSlots,
  activeCount,
  onRefresh,
  onError,
}: {
  routes: TradeRoute[];
  maxSlots: number;
  activeCount: number;
  onRefresh: () => void;
  onError: (e: string | null) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDelete = async (id: string) => {
    try {
      await deleteTradeRoute(id);
      onRefresh();
    } catch (e: any) {
      onError(e.response?.data?.error || "Failed to delete");
    }
  };

  const handleToggleFuel = async (id: string, current: boolean) => {
    try {
      await toggleRouteFuel(id, !current);
      onRefresh();
    } catch (e: any) {
      onError(e.response?.data?.error || "Failed to toggle fuel");
    }
  };

  const handlePause = async (id: string) => {
    try {
      await pauseRoute(id);
      onRefresh();
    } catch (e: any) {
      onError(e.response?.data?.error || "Failed to pause");
    }
  };

  const handleResume = async (id: string) => {
    try {
      await resumeRoute(id);
      onRefresh();
    } catch (e: any) {
      onError(e.response?.data?.error || "Failed to resume");
    }
  };

  const handleBatch = async (action: "pause" | "resume") => {
    setLoading(true);
    try {
      await batchRoutes(action);
      onRefresh();
    } catch (e: any) {
      onError(e.response?.data?.error || `Failed to ${action} all`);
    }
    setLoading(false);
  };

  const handleRename = async (id: string) => {
    try {
      await renameRoute(id, nameInput);
      setEditingName(null);
      onRefresh();
    } catch (e: any) {
      onError(e.response?.data?.error || "Failed to rename");
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "active":
        return "var(--green)";
      case "paused":
        return "var(--yellow)";
      case "destroyed":
        return "var(--red)";
      default:
        return "var(--grey)";
    }
  };

  const hasActive = routes.some((r) => r.status === "active");
  const hasPaused = routes.some((r) => r.status === "paused");

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
        }}
      >
        <span className="text-muted" style={{ fontSize: 12 }}>
          {activeCount}/{maxSlots} slots
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          {hasActive && (
            <button
              className="btn-sm btn-sell"
              onClick={() => handleBatch("pause")}
              disabled={loading}
            >
              PAUSE ALL
            </button>
          )}
          {hasPaused && (
            <button
              className="btn-sm btn-buy"
              onClick={() => handleBatch("resume")}
              disabled={loading}
            >
              RESUME ALL
            </button>
          )}
        </div>
      </div>

      {routes.length === 0 ? (
        <div className="text-muted">No trade routes established.</div>
      ) : (
        routes.map((r) => {
          const isExpanded = expandedId === r.id;
          const recentRansack =
            r.lastRansackedAt &&
            Date.now() - new Date(r.lastRansackedAt).getTime() < 86400000;

          return (
            <div
              key={r.id}
              className="resource-event-item"
              onClick={() => setExpandedId(isExpanded ? null : r.id)}
              style={{ cursor: "pointer" }}
            >
              {/* Header row: name + status */}
              <div className="resource-event-item__header">
                <span className="resource-event-item__type">
                  {editingName === r.id ? (
                    <span
                      onClick={(e) => e.stopPropagation()}
                      style={{ display: "inline-flex", gap: 4 }}
                    >
                      <input
                        type="text"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        maxLength={40}
                        style={{
                          width: 140,
                          fontSize: 13,
                          background: "#111",
                          border: "1px solid #444",
                          color: "var(--text-primary)",
                          padding: "2px 6px",
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRename(r.id);
                          if (e.key === "Escape") setEditingName(null);
                        }}
                        autoFocus
                      />
                      <button
                        className="btn-sm btn-buy"
                        onClick={() => handleRename(r.id)}
                        style={{ padding: "0 6px" }}
                      >
                        OK
                      </button>
                    </span>
                  ) : (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingName(r.id);
                        setNameInput(r.name || "");
                      }}
                      title="Click to rename"
                    >
                      {r.name ||
                        `${r.sourceType === "star_mall" ? "Mall" : "Outpost"} → ${r.destPlanetName}`}
                    </span>
                  )}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {recentRansack && (
                    <span
                      style={{ color: "var(--red)", fontSize: 12 }}
                      title="Ransacked in last 24h"
                    >
                      !
                    </span>
                  )}
                  <span
                    style={{
                      color: statusColor(r.status),
                      fontSize: 12,
                      textTransform: "uppercase",
                    }}
                  >
                    {r.status}
                  </span>
                </span>
              </div>

              {/* Stats line */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  marginTop: 2,
                }}
              >
                <span>
                  {r.pathLength} hops · {r.foodPerCycle} food/cycle ·{" "}
                  {r.creditCost} cr/dispatch
                </span>
                <span
                  style={{
                    color: r.fuelPaid ? "var(--cyan)" : "var(--orange)",
                  }}
                >
                  {r.fuelPaid ? "FUELED" : "UNFUELED"}
                </span>
              </div>

              {/* Delivery stats */}
              {r.deliveryCount > 0 && (
                <div
                  style={{ fontSize: 12, color: "var(--grey)", marginTop: 2 }}
                >
                  {r.deliveryCount} deliveries · {r.totalFoodDelivered} food
                  total
                </div>
              )}

              {/* Caravan tracker */}
              {r.activeCaravan && (
                <div style={{ marginTop: 4 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                      marginBottom: 2,
                    }}
                  >
                    <span>
                      Caravan in transit ({r.activeCaravan.foodCargo} food)
                    </span>
                    <span>
                      Sector {r.activeCaravan.pathIndex + 1}/
                      {r.activeCaravan.pathLength}
                    </span>
                  </div>
                  <div className="guardian-hp-bar">
                    <div
                      className="guardian-hp-bar__fill"
                      style={{
                        width: `${Math.round(((r.activeCaravan.pathIndex + 1) / r.activeCaravan.pathLength) * 100)}%`,
                        background: r.activeCaravan.isProtected
                          ? "var(--cyan)"
                          : "var(--orange)",
                      }}
                    />
                  </div>
                  <div
                    style={{ fontSize: 11, color: "var(--grey)", marginTop: 2 }}
                  >
                    ETA: ~
                    {(r.activeCaravan.pathLength -
                      r.activeCaravan.pathIndex -
                      1) *
                      60}
                    s ·{" "}
                    {r.activeCaravan.isProtected ? (
                      <span style={{ color: "var(--cyan)" }}>PROTECTED</span>
                    ) : (
                      <span style={{ color: "var(--orange)" }}>UNESCORTED</span>
                    )}
                  </div>
                </div>
              )}

              {/* Expanded controls */}
              {isExpanded && (
                <div
                  style={{
                    marginTop: 8,
                    borderTop: "1px solid #333",
                    paddingTop: 6,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 4,
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      className="btn-sm btn-buy"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFuel(r.id, r.fuelPaid);
                      }}
                    >
                      {r.fuelPaid ? "DISABLE FUEL" : "ENABLE FUEL"}
                    </button>
                    {r.status === "active" && (
                      <button
                        className="btn-sm btn-sell"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePause(r.id);
                        }}
                      >
                        PAUSE
                      </button>
                    )}
                    {r.status === "paused" && (
                      <button
                        className="btn-sm btn-buy"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResume(r.id);
                        }}
                      >
                        RESUME
                      </button>
                    )}
                    <button
                      className="btn-sm btn-sell"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(r.id);
                      }}
                    >
                      DELETE
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </>
  );
}

// ---- Create Tab ----

function CreateTab({
  onRefresh,
  onError,
  currentSectorId,
  atStarMall,
  activeOutpost,
}: {
  onRefresh: () => void;
  onError: (e: string | null) => void;
  currentSectorId?: number | null;
  atStarMall?: boolean;
  activeOutpost?: string | null;
}) {
  const [planets, setPlanets] = useState<OwnedPlanet[]>([]);
  const [destPlanetId, setDestPlanetId] = useState("");
  const [fuelPaid, setFuelPaid] = useState(false);
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    getOwnedPlanets()
      .then(({ data }) => {
        const list = (data.planets || data || []).map((p: any) => ({
          id: p.id,
          name: p.name || `Planet ${p.id.slice(0, 6)}`,
          sectorId: p.sectorId || p.sector_id,
        }));
        setPlanets(list);
        if (list.length > 0 && !destPlanetId) setDestPlanetId(list[0].id);
      })
      .catch(() => setPlanets([]));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async () => {
    if (!destPlanetId) return;
    setCreating(true);
    setResult(null);
    onError(null);
    try {
      const sourceType = atStarMall ? "star_mall" : "outpost";
      const sourceId = atStarMall
        ? String(currentSectorId ?? 0)
        : (activeOutpost ?? "");
      const { data } = await createTradeRoute(
        sourceType,
        sourceId,
        destPlanetId,
        fuelPaid,
      );
      setResult(
        `Route created! ${data.pathLength} hops, ${data.creditCostPerDispatch} cr/dispatch`,
      );
      onRefresh();
    } catch (e: any) {
      onError(e.response?.data?.error || "Failed to create route");
    }
    setCreating(false);
  };

  return (
    <>
      <div className="panel-subheader">New Trade Route</div>
      <div className="text-muted" style={{ fontSize: 12, marginBottom: 6 }}>
        Caravans carry food from your current starmall/outpost to an owned
        planet. Setup costs 5,000 credits.
      </div>

      <div style={{ marginBottom: 6 }}>
        <label style={{ fontSize: 12, color: "var(--grey)", display: "block" }}>
          DESTINATION PLANET
        </label>
        {planets.length === 0 ? (
          <div className="text-muted" style={{ fontSize: 12 }}>
            No owned planets. Claim a planet first.
          </div>
        ) : (
          <select
            value={destPlanetId}
            onChange={(e) => setDestPlanetId(e.target.value)}
            style={{
              width: "100%",
              fontSize: 13,
              background: "#111",
              border: "1px solid #444",
              color: "var(--text-primary)",
              padding: "4px 6px",
            }}
          >
            {planets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (Sector {p.sectorId})
              </option>
            ))}
          </select>
        )}
      </div>

      <div style={{ marginBottom: 8 }}>
        <label
          style={{
            fontSize: 12,
            color: "var(--grey)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <input
            type="checkbox"
            checked={fuelPaid}
            onChange={(e) => setFuelPaid(e.target.checked)}
          />
          FUEL PROTECTION (extra cost, reduces ransack chance)
        </label>
      </div>

      {result && (
        <div style={{ color: "var(--green)", fontSize: 12, marginBottom: 4 }}>
          {result}
        </div>
      )}

      <button
        className="btn-sm btn-buy"
        onClick={handleCreate}
        disabled={creating || planets.length === 0}
      >
        {creating ? "CREATING..." : "CREATE ROUTE"}
      </button>
    </>
  );
}

// ---- Logs Tab ----

function LogsTab({ routes }: { routes: TradeRoute[] }) {
  const [selectedRouteId, setSelectedRouteId] = useState<string>("all");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedRouteId === "all") {
      // Load logs for all routes
      if (routes.length === 0) {
        setLogs([]);
        return;
      }
      setLoading(true);
      Promise.all(
        routes.map((r) =>
          getRouteLogs(r.id)
            .then(({ data }) => data.logs || [])
            .catch(() => []),
        ),
      ).then((allLogs) => {
        const merged = allLogs
          .flat()
          .sort(
            (a: LogEntry, b: LogEntry) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )
          .slice(0, 50);
        setLogs(merged);
        setLoading(false);
      });
    } else {
      setLoading(true);
      getRouteLogs(selectedRouteId)
        .then(({ data }) => setLogs(data.logs || []))
        .catch(() => setLogs([]))
        .finally(() => setLoading(false));
    }
  }, [selectedRouteId, routes]);

  const eventColor = (type: string) => {
    switch (type) {
      case "arrived":
        return "var(--green)";
      case "ransacked":
        return "var(--red)";
      case "escorted":
        return "var(--cyan)";
      case "dispatched":
      default:
        return "var(--grey)";
    }
  };

  const eventLabel = (type: string) => {
    switch (type) {
      case "arrived":
        return "Delivered";
      case "ransacked":
        return "Ransacked";
      case "escorted":
        return "Escorted";
      case "dispatched":
        return "Dispatched";
      default:
        return type;
    }
  };

  return (
    <>
      <div style={{ marginBottom: 6 }}>
        <select
          value={selectedRouteId}
          onChange={(e) => setSelectedRouteId(e.target.value)}
          style={{
            width: "100%",
            fontSize: 13,
            background: "#111",
            border: "1px solid #444",
            color: "var(--text-primary)",
            padding: "4px 6px",
          }}
        >
          <option value="all">All Routes</option>
          {routes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name ||
                `${r.sourceType === "star_mall" ? "Mall" : "Outpost"} → ${r.destPlanetName}`}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-muted">Loading logs...</div>
      ) : logs.length === 0 ? (
        <div className="text-muted">No events recorded.</div>
      ) : (
        logs.map((l) => (
          <div
            key={l.id}
            className="panel-row"
            style={{ justifyContent: "space-between", fontSize: 12 }}
          >
            <span style={{ color: eventColor(l.eventType) }}>
              {eventLabel(l.eventType)}
            </span>
            <span className="text-muted">
              {l.foodAmount ? `${l.foodAmount} food` : ""}
              {l.sectorId ? ` S${l.sectorId}` : ""}
              {" · "}
              {new Date(l.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        ))
      )}
    </>
  );
}

// ---- Piracy Tab ----

function PiracyTab({ onError }: { onError: (e: string | null) => void }) {
  const [scoutResults, setScoutResults] = useState<ScoutResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const handleScout = async () => {
    setLoading(true);
    onError(null);
    setActionMsg(null);
    try {
      const { data } = await scoutCaravans();
      setScoutResults(data.caravans || []);
    } catch (e: any) {
      onError(e.response?.data?.error || "Scout failed");
    }
    setLoading(false);
  };

  const handleRansack = async (caravanId: string) => {
    setActionLoading(caravanId);
    setActionMsg(null);
    try {
      const { data } = await ransackCaravan(caravanId);
      if (data.loot) {
        setActionMsg(`Ransacked! Looted ${data.loot.food || 0} food`);
      } else {
        setActionMsg("Ransack successful!");
      }
      // Refresh scout results
      handleScout();
    } catch (e: any) {
      onError(e.response?.data?.error || "Ransack failed");
    }
    setActionLoading(null);
  };

  const handleEscort = async (caravanId: string) => {
    setActionLoading(caravanId);
    setActionMsg(null);
    try {
      await escortCaravan(caravanId);
      setActionMsg("Caravan escorted successfully!");
      handleScout();
    } catch (e: any) {
      onError(e.response?.data?.error || "Escort failed");
    }
    setActionLoading(null);
  };

  return (
    <>
      <div className="text-muted" style={{ fontSize: 12, marginBottom: 6 }}>
        Scout for nearby caravans. Ransack unprotected ones (2 AP) or escort
        allied caravans (2 AP).
      </div>

      <button
        className="btn-sm btn-buy"
        onClick={handleScout}
        disabled={loading}
        style={{ marginBottom: 8 }}
      >
        {loading ? "SCANNING..." : "SCOUT CARAVANS (1 AP)"}
      </button>

      {actionMsg && (
        <div style={{ color: "var(--green)", fontSize: 12, marginBottom: 4 }}>
          {actionMsg}
        </div>
      )}

      {scoutResults !== null && (
        <>
          {scoutResults.length === 0 ? (
            <div className="text-muted">
              No unprotected caravans detected nearby.
            </div>
          ) : (
            scoutResults.map((c) => (
              <div
                key={c.id}
                className="resource-event-item"
                style={{ cursor: "default" }}
              >
                <div
                  className="resource-event-item__header"
                  style={{ marginBottom: 4 }}
                >
                  <span className="resource-event-item__type">
                    {c.ownerName}'s caravan
                  </span>
                  <span style={{ color: "var(--orange)", fontSize: 12 }}>
                    S{c.sectorId}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: 12,
                  }}
                >
                  <span>
                    {c.foodCargo} food · {c.defenseHp} HP
                  </span>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      className="btn-sm btn-sell"
                      onClick={() => handleRansack(c.id)}
                      disabled={actionLoading === c.id}
                    >
                      {actionLoading === c.id ? "..." : "RANSACK (2 AP)"}
                    </button>
                    <button
                      className="btn-sm btn-buy"
                      onClick={() => handleEscort(c.id)}
                      disabled={actionLoading === c.id}
                    >
                      {actionLoading === c.id ? "..." : "ESCORT (2 AP)"}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </>
      )}
    </>
  );
}
