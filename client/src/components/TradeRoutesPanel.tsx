import { useState, useEffect } from "react";
import {
  getTradeRoutes,
  deleteTradeRoute,
  toggleRouteFuel,
  resumeRoute,
  getRouteLogs,
  scoutCaravans,
} from "../services/api";

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

interface Props {
  refreshKey?: number;
  onCommand: (cmd: string) => void;
  bare?: boolean;
}

export default function TradeRoutesPanel({
  refreshKey,
  onCommand: _onCommand,
  bare,
}: Props) {
  const [routes, setRoutes] = useState<TradeRoute[]>([]);
  const [maxSlots, setMaxSlots] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [playerLevel, setPlayerLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [scoutResults, setScoutResults] = useState<ScoutResult[] | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = () => {
    getTradeRoutes()
      .then(({ data }) => {
        setRoutes(data.routes || []);
        setMaxSlots(data.maxSlots || 0);
        setActiveCount(data.activeCount || 0);
        setPlayerLevel(data.playerLevel || 0);
        setError(null);
      })
      .catch(() => setError("Could not load trade routes"));
  };

  useEffect(refresh, [refreshKey]);

  useEffect(() => {
    if (expandedId) {
      getRouteLogs(expandedId)
        .then(({ data }) => setLogs(data.logs || []))
        .catch(() => setLogs([]));
    } else {
      setLogs([]);
    }
  }, [expandedId]);

  const handleDelete = async (id: string) => {
    try {
      await deleteTradeRoute(id);
      refresh();
    } catch (e: any) {
      setError(e.response?.data?.error || "Failed to delete");
    }
  };

  const handleToggleFuel = async (id: string, current: boolean) => {
    try {
      await toggleRouteFuel(id, !current);
      refresh();
    } catch (e: any) {
      setError(e.response?.data?.error || "Failed to toggle fuel");
    }
  };

  const handleResume = async (id: string) => {
    try {
      await resumeRoute(id);
      refresh();
    } catch (e: any) {
      setError(e.response?.data?.error || "Failed to resume");
    }
  };

  const handleScout = async () => {
    setLoading(true);
    try {
      const { data } = await scoutCaravans();
      setScoutResults(data.caravans || []);
    } catch (e: any) {
      setError(e.response?.data?.error || "Scout failed");
    }
    setLoading(false);
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

  const eventTypeLabel = (type: string) => {
    switch (type) {
      case "dispatched":
        return "Dispatched";
      case "arrived":
        return "Delivered";
      case "ransacked":
        return "Ransacked!";
      case "escorted":
        return "Escorted";
      default:
        return type;
    }
  };

  const content = (
    <>
      <div
        className="panel-subheader"
        style={{ display: "flex", justifyContent: "space-between" }}
      >
        <span>Trade Routes</span>
        <span className="text-muted" style={{ fontSize: 10 }}>
          {activeCount}/{maxSlots} slots (Lv.{playerLevel})
        </span>
      </div>

      {error && (
        <div style={{ color: "var(--red)", fontSize: 11, marginBottom: 4 }}>
          {error}
        </div>
      )}

      {routes.length === 0 ? (
        <div className="text-muted">No trade routes established.</div>
      ) : (
        routes.map((r) => (
          <div
            key={r.id}
            className="resource-event-item"
            onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
            style={{ cursor: "pointer" }}
          >
            <div className="resource-event-item__header">
              <span className="resource-event-item__type">
                {r.sourceType === "star_mall" ? "Mall" : "Outpost"} &rarr;{" "}
                {r.destPlanetName}
              </span>
              <span
                style={{
                  color: statusColor(r.status),
                  fontSize: 10,
                  textTransform: "uppercase",
                }}
              >
                {r.status}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 10,
                marginTop: 2,
              }}
            >
              <span>
                {r.pathLength} hops | {r.foodPerCycle} food | {r.creditCost} cr
              </span>
              <span
                style={{ color: r.fuelPaid ? "var(--cyan)" : "var(--orange)" }}
              >
                {r.fuelPaid ? "FUELED" : "UNFUELED"}
              </span>
            </div>

            {r.activeCaravan && (
              <div style={{ marginTop: 4 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 10,
                    marginBottom: 2,
                  }}
                >
                  <span>Caravan in transit</span>
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
              </div>
            )}

            {expandedId === r.id && (
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
                    marginBottom: 6,
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

                {logs.length > 0 && (
                  <>
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--grey)",
                        marginBottom: 2,
                      }}
                    >
                      Recent Events
                    </div>
                    {logs.slice(0, 5).map((l) => (
                      <div
                        key={l.id}
                        className="panel-row"
                        style={{
                          justifyContent: "space-between",
                          fontSize: 10,
                        }}
                      >
                        <span
                          style={{
                            color:
                              l.eventType === "ransacked"
                                ? "var(--red)"
                                : l.eventType === "arrived"
                                  ? "var(--green)"
                                  : "var(--grey)",
                          }}
                        >
                          {eventTypeLabel(l.eventType)}
                        </span>
                        <span className="text-muted">
                          {l.foodAmount ? `${l.foodAmount} food` : ""}
                          {l.sectorId ? ` S${l.sectorId}` : ""}
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        ))
      )}

      <div style={{ marginTop: 8 }}>
        <button
          className="btn-sm btn-buy"
          onClick={(e) => {
            e.stopPropagation();
            handleScout();
          }}
          disabled={loading}
          style={{ marginRight: 4 }}
        >
          {loading ? "SCANNING..." : "SCOUT CARAVANS"}
        </button>
      </div>

      {scoutResults !== null && (
        <div style={{ marginTop: 6 }}>
          <div className="panel-subheader">Scout Results</div>
          {scoutResults.length === 0 ? (
            <div className="text-muted">
              No unprotected caravans detected nearby.
            </div>
          ) : (
            scoutResults.map((c) => (
              <div
                key={c.id}
                className="panel-row"
                style={{ justifyContent: "space-between", fontSize: 11 }}
              >
                <span>
                  {c.ownerName}'s caravan (S{c.sectorId})
                </span>
                <span style={{ color: "var(--orange)" }}>
                  {c.foodCargo} food | {c.defenseHp} HP
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </>
  );

  if (bare) return <div className="panel-content">{content}</div>;
  return <div className="panel-content">{content}</div>;
}
