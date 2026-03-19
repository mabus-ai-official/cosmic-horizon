import { useState, useEffect } from "react";
import CollapsiblePanel from "./CollapsiblePanel";
import PlanetAnalytics from "./PlanetAnalytics";
import { getPlanetTypeInfo } from "../config/planet-tooltips";
import {
  getOwnedPlanets,
  getDiscoveredPlanets,
  getPlanet,
  collectPlanetResources,
  collectAllRefinery,
  collectRefinery,
  upgradePlanet,
  colonizePlanet,
  collectColonists,
  claimPlanet,
  useScanner,
  namePlanet,
  depositFood,
  depositColonists,
  fortifyPlanet,
} from "../services/api";

interface RacePopulation {
  race: string;
  count: number;
}

interface PlanetData {
  id: string;
  name: string;
  planetClass: string;
  sectorId: number;
  upgradeLevel: number;
  colonists: number;
  cyrilliumStock: number;
  foodStock: number;
  techStock: number;
  droneCount: number;
  happiness: number;
  happinessTier: string;
  foodConsumption: number;
  racePopulations: RacePopulation[];
  production: { cyrillium: number; tech: number; drones: number };
  canUpgrade?: boolean;
}

interface DiscoveredPlanetData {
  id: string;
  name: string;
  planetClass: string;
  sectorId: number;
  owned: boolean;
  ownerName: string | null;
  upgradeLevel: number;
  colonists: number;
  cyrilliumStock?: number;
  foodStock?: number;
  techStock?: number;
}

interface Props {
  refreshKey?: number;
  currentSectorId?: number | null;
  hasNamingAuthority?: boolean;
  hasTransporter?: boolean;
  playerRace?: string | null;
  shipFoodCargo?: number;
  colonistsByRace?: { race: string; count: number }[];
  onAction?: () => void;
  onCommand?: (cmd: string) => void;
  onAdvanceTutorial?: (action: string) => void;
  onLand?: (planetId: string) => void;
  onLiftoff?: () => void;
  onWarpTo?: (sectorId: number) => void;
  landedAtPlanetId?: string | null;
  bare?: boolean;
  limitTabs?: ("sector" | "owned" | "discovered" | "analytics")[];
}

const CLASS_LABELS: Record<string, string> = {
  H: "Habitable",
  D: "Desert",
  O: "Ocean",
  A: "Arctic",
  F: "Forest",
  V: "Volcanic",
  G: "Gas Giant",
  S: "Seed World",
};

const RACE_LABELS: Record<string, string> = {
  muscarian: "Muscarian",
  vedic: "Vedic",
  kalin: "Kalin",
  tarri: "Tar'ri",
};

const HAPPINESS_COLORS: Record<string, string> = {
  miserable: "#f44",
  unhappy: "#f80",
  content: "#ff0",
  happy: "#8f8",
  thriving: "#0ff",
};

const VALID_RACES = ["muscarian", "vedic", "kalin", "tarri"];

// Planet affinities per race (from server config) — used to show best race per planet class
const PLANET_AFFINITIES: Record<string, Record<string, number>> = {
  muscarian: { H: 1.2, D: 0.8, O: 1.1, A: 1.0, F: 1.1, V: 0.7, G: 0.9 },
  vedic: { H: 1.0, D: 1.0, O: 0.9, A: 1.2, F: 1.1, V: 0.8, G: 1.1 },
  kalin: { H: 0.9, D: 1.2, O: 0.8, A: 1.0, F: 1.1, V: 1.2, G: 1.0 },
  tarri: { H: 1.1, D: 0.9, O: 1.2, A: 0.9, F: 0.8, V: 1.0, G: 1.1 },
};

function getBestRace(
  planetClass: string,
): { race: string; multiplier: number } | null {
  let best: { race: string; multiplier: number } | null = null;
  for (const [race, affinities] of Object.entries(PLANET_AFFINITIES)) {
    const mult = affinities[planetClass] ?? 1.0;
    if (!best || mult > best.multiplier) best = { race, multiplier: mult };
  }
  return best;
}

type TabView = "sector" | "owned" | "discovered" | "analytics";

export default function PlanetsPanel({
  refreshKey,
  currentSectorId,
  hasNamingAuthority,
  hasTransporter,
  playerRace,
  shipFoodCargo,
  colonistsByRace,
  onAction,
  onCommand: _onCommand,
  onAdvanceTutorial,
  onLand,
  onLiftoff,
  onWarpTo,
  landedAtPlanetId,
  bare,
  limitTabs,
}: Props) {
  const [planets, setPlanets] = useState<PlanetData[]>([]);
  const [discovered, setDiscovered] = useState<DiscoveredPlanetData[]>([]);
  const [tab, setTab] = useState<TabView>("sector");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [planetDetail, setPlanetDetail] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [colonizeQty, setColonizeQty] = useState<Record<string, number>>({});
  const [colonizeRace, setColonizeRace] = useState<Record<string, string>>({});
  const [collectColonistQty, setCollectColonistQty] = useState<
    Record<string, number>
  >({});
  const [collectColonistRace, setCollectColonistRace] = useState<
    Record<string, string>
  >({});
  const [depositFoodQty, setDepositFoodQty] = useState<Record<string, number>>(
    {},
  );
  const [depositColonistQty, setDepositColonistQty] = useState<
    Record<string, number>
  >({});
  const [depositColonistRace, setDepositColonistRace] = useState<
    Record<string, string>
  >({});
  const [renameInput, setRenameInput] = useState<Record<string, string>>({});
  const [scanResults, setScanResults] = useState<any[] | null>(null);
  const [scanning, setScanning] = useState(false);
  const [localRefreshKey, setLocalRefreshKey] = useState(0);
  const [hoveredPlanetId, setHoveredPlanetId] = useState<string | null>(null);
  const [fortifyType, setFortifyType] = useState<Record<string, string>>({});
  const [fortifyAmt, setFortifyAmt] = useState<Record<string, number>>({});
  // bombardEnergy, defenseData, combatResult — reserved for warfare feature

  const refresh = () => setLocalRefreshKey((k) => k + 1);

  // Default race for selectors
  const defaultRace =
    playerRace && VALID_RACES.includes(playerRace) ? playerRace : "muscarian";

  useEffect(() => {
    getOwnedPlanets()
      .then(({ data }) => setPlanets(data.planets || []))
      .catch(() => setPlanets([]));
  }, [refreshKey, localRefreshKey]);

  useEffect(() => {
    if (tab === "discovered" || tab === "sector") {
      getDiscoveredPlanets()
        .then(({ data }) => setDiscovered(data.planets || []))
        .catch(() => setDiscovered([]));
    }
  }, [tab, refreshKey, localRefreshKey]);

  useEffect(() => {
    if (expandedId) {
      getPlanet(expandedId)
        .then(({ data }) => setPlanetDetail(data))
        .catch(() => setPlanetDetail(null));
    } else {
      setPlanetDetail(null);
    }
  }, [expandedId, localRefreshKey]);

  const handleCollect = async (planetId: string) => {
    setBusy(planetId + "-collect");
    setError("");
    try {
      const { data } = await collectPlanetResources(planetId);
      await collectAllRefinery(planetId).catch(() => {});
      refresh();
      onAction?.();
      if (data.collected?.length > 0) {
        const summary = data.collected
          .map((c: any) => `${c.quantity} ${c.name}`)
          .join(", ");
        if (data.cargoFull) {
          setError(
            `Loaded: ${summary}. Cargo full (${data.cargoUsed}/${data.cargoMax})! Sell at an outpost to make room.`,
          );
        } else {
          setError(
            `Loaded: ${summary}. Cargo: ${data.cargoUsed}/${data.cargoMax}`,
          );
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Collection failed");
    } finally {
      setBusy(null);
    }
  };

  const handleUpgrade = async (planetId: string) => {
    setBusy(planetId + "-upgrade");
    setError("");
    try {
      await upgradePlanet(planetId);
      refresh();
      onAction?.();
    } catch (err: any) {
      setError(err.response?.data?.error || "Upgrade failed");
    } finally {
      setBusy(null);
    }
  };

  const handleColonize = async (planetId: string) => {
    const qty = colonizeQty[planetId] || 10;
    const race = colonizeRace[planetId] || defaultRace;
    setBusy(planetId + "-colonize");
    setError("");
    try {
      await colonizePlanet(planetId, qty, race);
      refresh();
      onAction?.();
    } catch (err: any) {
      setError(err.response?.data?.error || "Colonization failed");
    } finally {
      setBusy(null);
    }
  };

  const handleClaim = async (planetId: string) => {
    setBusy(planetId + "-claim");
    setError("");
    try {
      await claimPlanet(planetId);
      refresh();
      onAction?.();
      onAdvanceTutorial?.("claim");
    } catch (err: any) {
      setError(err.response?.data?.error || "Claim failed");
    } finally {
      setBusy(null);
    }
  };

  const handleCollectColonists = async (planetId: string) => {
    const qty = collectColonistQty[planetId] || 10;
    const race = collectColonistRace[planetId] || defaultRace;
    setBusy(planetId + "-collectcol");
    setError("");
    try {
      await collectColonists(planetId, qty, race);
      refresh();
      onAction?.();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to collect colonists");
    } finally {
      setBusy(null);
    }
  };

  const handleDepositFood = async (planetId: string) => {
    const qty = depositFoodQty[planetId] || 10;
    setBusy(planetId + "-depositfood");
    setError("");
    try {
      await depositFood(planetId, qty);
      refresh();
      onAction?.();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to deposit food");
    } finally {
      setBusy(null);
    }
  };

  const handleDepositColonists = async (planetId: string) => {
    const qty = depositColonistQty[planetId] || 10;
    const race = depositColonistRace[planetId] || defaultRace;
    setBusy(planetId + "-depositcol");
    setError("");
    try {
      await depositColonists(planetId, qty, race);
      refresh();
      onAction?.();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to deposit colonists");
    } finally {
      setBusy(null);
    }
  };

  const handleRename = async (planetId: string) => {
    const newName = renameInput[planetId]?.trim();
    if (!newName) return;
    setBusy(planetId + "-rename");
    setError("");
    try {
      await namePlanet(planetId, newName);
      setRenameInput((prev) => ({ ...prev, [planetId]: "" }));
      refresh();
      onAction?.();
    } catch (err: any) {
      setError(err.response?.data?.error || "Rename failed");
    } finally {
      setBusy(null);
    }
  };

  const handleScan = async () => {
    setScanning(true);
    setError("");
    try {
      const { data } = await useScanner();
      setScanResults(data.planets || []);
    } catch (err: any) {
      setError(err.response?.data?.error || "Scanner failed");
    } finally {
      setScanning(false);
    }
  };

  const handleFortify = async (planetId: string) => {
    const type = fortifyType[planetId] || "shield";
    const amount = fortifyAmt[planetId] || 1;
    setBusy(planetId + "-fortify");
    setError("");
    try {
      await fortifyPlanet(planetId, type, amount);
      refresh();
      onAction?.();
    } catch (err: any) {
      setError(err.response?.data?.error || "Fortify failed");
    } finally {
      setBusy(null);
    }
  };

  // handleBombard / handleScanDefenses — reserved for warfare feature

  const raceSelect = (
    planetId: string,
    value: string,
    setter: React.Dispatch<React.SetStateAction<Record<string, string>>>,
  ) => (
    <select
      value={value}
      onChange={(e) =>
        setter((prev) => ({ ...prev, [planetId]: e.target.value }))
      }
      style={{
        background: "#111",
        border: "1px solid #333",
        color: "#ccc",
        padding: "2px 4px",
        fontSize: 10,
        width: 90,
      }}
    >
      {VALID_RACES.map((r) => (
        <option key={r} value={r}>
          {RACE_LABELS[r] || r}
        </option>
      ))}
    </select>
  );

  const sectorPlanets = discovered.filter(
    (p) => p.sectorId === currentSectorId,
  );

  const allTabs: { key: TabView; label: string }[] = [
    { key: "sector", label: "Sector" },
    { key: "owned", label: "Owned" },
    { key: "discovered", label: "Discovered" },
    { key: "analytics", label: "Analytics" },
  ];
  const visibleTabs = limitTabs
    ? allTabs.filter((t) => limitTabs.includes(t.key))
    : allTabs;

  const tabBar = (
    <div className="group-panel-tabs">
      {visibleTabs.map((t, i) => (
        <span key={t.key}>
          {i > 0 && (
            <span style={{ color: "#444", margin: "0 0.5rem" }}>|</span>
          )}
          <span
            onClick={() => setTab(t.key)}
            style={{
              cursor: "pointer",
              color: tab === t.key ? "#0f0" : "#666",
            }}
          >
            {tab === t.key ? `[${t.label}]` : t.label}
          </span>
        </span>
      ))}
    </div>
  );

  const ownedContent =
    planets.length === 0 ? (
      <div className="text-muted">
        No planets owned. Use "claim" at a sector with unclaimed planets.
      </div>
    ) : (
      <>
        {error && <div className="mall-error">{error}</div>}
        {planets.map((p) => {
          const inSector =
            currentSectorId != null && p.sectorId === currentSectorId;
          const expanded = expandedId === p.id;
          const happinessColor = HAPPINESS_COLORS[p.happinessTier] || "#888";
          const ticksOfFood =
            p.foodConsumption > 0
              ? Math.floor(p.foodStock / p.foodConsumption)
              : 999;
          const foodColor =
            ticksOfFood > 20 ? "#8f8" : ticksOfFood > 5 ? "#ff0" : "#f44";
          const hasShipFood = (shipFoodCargo || 0) > 0;
          const bestRace =
            p.planetClass !== "S" ? getBestRace(p.planetClass) : null;
          return (
            <div key={p.id} className="planet-panel-item">
              <div
                className="planet-panel-item__header"
                style={{ cursor: "pointer" }}
                onClick={() => setExpandedId(expanded ? null : p.id)}
              >
                <span className="planet-panel-item__name">
                  <span style={{ color: "var(--cyan)", fontWeight: "bold" }}>
                    {expanded ? "[-]" : "[+]"}
                  </span>{" "}
                  {p.name}
                  <span
                    style={{
                      color: happinessColor,
                      fontSize: "0.8rem",
                      marginLeft: 8,
                    }}
                  >
                    Lv.{p.upgradeLevel}
                  </span>
                </span>
                <span
                  className="planet-panel-item__class"
                  style={{ position: "relative", cursor: "help" }}
                  onMouseEnter={(e) => {
                    e.stopPropagation();
                    setHoveredPlanetId(p.id);
                  }}
                  onMouseLeave={() => setHoveredPlanetId(null)}
                >
                  [{p.planetClass}] {CLASS_LABELS[p.planetClass] || ""}
                  {hoveredPlanetId === p.id &&
                    (() => {
                      const ti = getPlanetTypeInfo(p.planetClass);
                      return ti ? (
                        <div className="planet-tooltip">
                          <div className="planet-tooltip__name">{ti.name}</div>
                          <div className="planet-tooltip__row">
                            {ti.description}
                          </div>
                          <div className="planet-tooltip__row">
                            Production: <span>{ti.production}</span>
                          </div>
                          {ti.uniqueResource && (
                            <div className="planet-tooltip__row">
                              Unique: <span>{ti.uniqueResource}</span>
                            </div>
                          )}
                        </div>
                      ) : null;
                    })()}
                </span>
              </div>

              {expanded && (
                <>
                  {/* Status section */}
                  <div className="planet-section">
                    <div className="planet-stat-grid">
                      <div className="planet-stat">
                        <span className="planet-stat__label">Sector</span>
                        <span className="planet-stat__value">{p.sectorId}</span>
                      </div>
                      <div className="planet-stat">
                        <span className="planet-stat__label">Colonists</span>
                        <span className="planet-stat__value">
                          {p.colonists.toLocaleString()}
                        </span>
                      </div>
                      <div className="planet-stat">
                        <span className="planet-stat__label">Happiness</span>
                        <span
                          className="planet-stat__value"
                          style={{ color: happinessColor }}
                        >
                          {p.happinessTier} ({Math.round(p.happiness)})
                        </span>
                      </div>
                      {bestRace && (
                        <div className="planet-stat">
                          <span className="planet-stat__label">Best Race</span>
                          <span
                            className="planet-stat__value"
                            style={{ color: "var(--cyan)" }}
                          >
                            {RACE_LABELS[bestRace.race] || bestRace.race} (
                            {Math.round(bestRace.multiplier * 100)}%)
                          </span>
                        </div>
                      )}
                    </div>
                    {p.racePopulations && p.racePopulations.length > 0 && (
                      <div className="planet-pop-breakdown">
                        {p.racePopulations.map((rp) => (
                          <span key={rp.race} className="planet-pop-tag">
                            {RACE_LABELS[rp.race] || rp.race}:{" "}
                            {rp.count.toLocaleString()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Resources section */}
                  <div className="planet-section">
                    <div className="planet-section__label">Resources</div>
                    <div className="planet-resource-bars">
                      <div className="planet-resource">
                        <span
                          className="planet-resource__name"
                          style={{ color: "var(--magenta)" }}
                        >
                          CYR
                        </span>
                        <span className="planet-resource__value">
                          {p.cyrilliumStock}
                        </span>
                        <span
                          className="planet-resource__rate"
                          style={{ color: "var(--green)" }}
                        >
                          +{p.production.cyrillium}/tick
                        </span>
                      </div>
                      <div className="planet-resource">
                        <span
                          className="planet-resource__name"
                          style={{ color: foodColor }}
                        >
                          FOOD
                        </span>
                        <span
                          className="planet-resource__value"
                          style={{ color: foodColor }}
                        >
                          {p.foodStock}
                        </span>
                        <span
                          className="planet-resource__rate"
                          style={{
                            color:
                              p.foodConsumption > 0
                                ? "var(--orange)"
                                : "var(--comment)",
                          }}
                        >
                          {p.foodConsumption > 0
                            ? `-${p.foodConsumption}/tick`
                            : "self-sustaining"}
                        </span>
                      </div>
                      <div className="planet-resource">
                        <span
                          className="planet-resource__name"
                          style={{ color: "var(--cyan)" }}
                        >
                          TECH
                        </span>
                        <span className="planet-resource__value">
                          {p.techStock}
                        </span>
                        <span
                          className="planet-resource__rate"
                          style={{ color: "var(--green)" }}
                        >
                          +{p.production.tech}/tick
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="planet-actions">
                    <button
                      className="btn-sm btn-buy"
                      disabled={busy === p.id + "-collect"}
                      onClick={() => handleCollect(p.id)}
                    >
                      {busy === p.id + "-collect" ? "..." : "LOAD CARGO"}
                    </button>
                    <button
                      className="btn-sm btn-primary"
                      disabled={busy === p.id + "-upgrade"}
                      onClick={() => handleUpgrade(p.id)}
                    >
                      {busy === p.id + "-upgrade" ? "..." : "UPGRADE"}
                    </button>
                    {!inSector && onWarpTo && (
                      <button
                        className="btn-sm"
                        onClick={() => onWarpTo(p.sectorId)}
                        style={{
                          color: "var(--magenta)",
                          borderColor: "var(--magenta)",
                        }}
                      >
                        WARP
                      </button>
                    )}
                    {inSector && landedAtPlanetId === p.id && onLiftoff && (
                      <button
                        className="btn-sm"
                        onClick={() => onLiftoff()}
                        style={{
                          color: "var(--yellow)",
                          borderColor: "var(--yellow)",
                        }}
                      >
                        LIFTOFF
                      </button>
                    )}
                    {inSector && landedAtPlanetId !== p.id && onLand && (
                      <button
                        className="btn-sm"
                        onClick={() => onLand(p.id)}
                        style={{
                          color: "var(--green)",
                          borderColor: "var(--green)",
                        }}
                      >
                        LAND
                      </button>
                    )}
                    {inSector &&
                      (landedAtPlanetId === p.id || hasTransporter) && (
                        <span className="planet-colonize-group">
                          <input
                            type="number"
                            className="qty-input"
                            min={1}
                            value={colonizeQty[p.id] || 10}
                            onChange={(e) =>
                              setColonizeQty((prev) => ({
                                ...prev,
                                [p.id]: Math.max(
                                  1,
                                  parseInt(e.target.value) || 1,
                                ),
                              }))
                            }
                            style={{ width: "48px" }}
                          />
                          {raceSelect(
                            p.id,
                            colonizeRace[p.id] || defaultRace,
                            setColonizeRace,
                          )}
                          <button
                            className="btn-sm"
                            disabled={busy === p.id + "-colonize"}
                            onClick={() => handleColonize(p.id)}
                            style={{
                              color: "var(--cyan)",
                              borderColor: "var(--cyan)",
                            }}
                          >
                            {busy === p.id + "-colonize" ? "..." : "COLONIZE"}
                          </button>
                        </span>
                      )}
                    {inSector &&
                      (landedAtPlanetId === p.id || hasTransporter) &&
                      hasShipFood &&
                      p.planetClass !== "S" && (
                        <span className="planet-colonize-group">
                          <input
                            type="number"
                            className="qty-input"
                            min={1}
                            value={depositFoodQty[p.id] || 10}
                            onChange={(e) =>
                              setDepositFoodQty((prev) => ({
                                ...prev,
                                [p.id]: Math.max(
                                  1,
                                  parseInt(e.target.value) || 1,
                                ),
                              }))
                            }
                            style={{ width: "48px" }}
                          />
                          <button
                            className="btn-sm"
                            disabled={busy === p.id + "-depositfood"}
                            onClick={() => handleDepositFood(p.id)}
                            style={{
                              color: "var(--green)",
                              borderColor: "var(--green)",
                            }}
                          >
                            {busy === p.id + "-depositfood"
                              ? "..."
                              : "DEPOSIT FOOD"}
                          </button>
                        </span>
                      )}
                    {inSector &&
                      p.colonists > 0 &&
                      (landedAtPlanetId === p.id || hasTransporter) && (
                        <span className="planet-colonize-group">
                          <input
                            type="number"
                            className="qty-input"
                            min={1}
                            value={collectColonistQty[p.id] || 10}
                            onChange={(e) =>
                              setCollectColonistQty((prev) => ({
                                ...prev,
                                [p.id]: Math.max(
                                  1,
                                  parseInt(e.target.value) || 1,
                                ),
                              }))
                            }
                            style={{ width: "48px" }}
                          />
                          {raceSelect(
                            p.id,
                            collectColonistRace[p.id] || defaultRace,
                            setCollectColonistRace,
                          )}
                          <button
                            className="btn-sm"
                            disabled={busy === p.id + "-collectcol"}
                            onClick={() => handleCollectColonists(p.id)}
                            style={{
                              color: "var(--orange)",
                              borderColor: "var(--orange)",
                            }}
                          >
                            {busy === p.id + "-collectcol"
                              ? "..."
                              : "WITHDRAW COLONISTS"}
                          </button>
                        </span>
                      )}
                    {inSector &&
                      p.planetClass === "S" &&
                      (landedAtPlanetId === p.id || hasTransporter) &&
                      colonistsByRace &&
                      colonistsByRace.some((r) => r.count > 0) && (
                        <span className="planet-colonize-group">
                          <input
                            type="number"
                            className="qty-input"
                            min={1}
                            value={depositColonistQty[p.id] || 10}
                            onChange={(e) =>
                              setDepositColonistQty((prev) => ({
                                ...prev,
                                [p.id]: Math.max(
                                  1,
                                  parseInt(e.target.value) || 1,
                                ),
                              }))
                            }
                            style={{ width: "48px" }}
                          />
                          {raceSelect(
                            p.id,
                            depositColonistRace[p.id] || defaultRace,
                            setDepositColonistRace,
                          )}
                          <button
                            className="btn-sm"
                            disabled={busy === p.id + "-depositcol"}
                            onClick={() => handleDepositColonists(p.id)}
                            style={{
                              color: "var(--cyan)",
                              borderColor: "var(--cyan)",
                            }}
                          >
                            {busy === p.id + "-depositcol"
                              ? "..."
                              : "DEPOSIT COLONISTS"}
                          </button>
                        </span>
                      )}
                  </div>

                  {planetDetail && (
                    <div className="planet-detail-expanded">
                      {planetDetail.refineryQueue?.length > 0 && (
                        <div className="planet-refinery">
                          <span className="panel-subheader">
                            Refinery Queue
                          </span>
                          {planetDetail.refineryQueue.map((q: any) => (
                            <div key={q.id} className="refinery-item">
                              <span>
                                {q.recipeName || q.recipeId} — {q.status}
                              </span>
                              {q.status === "ready" && (
                                <button
                                  className="btn-sm btn-buy"
                                  onClick={() => {
                                    collectRefinery(q.id).then(() => {
                                      refresh();
                                      onAction?.();
                                    });
                                  }}
                                >
                                  COLLECT
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {planetDetail.uniqueResources?.length > 0 && (
                        <div className="planet-unique">
                          <span className="panel-subheader">
                            Unique Resources
                          </span>
                          {planetDetail.uniqueResources.map((r: any) => (
                            <div
                              key={r.id || r.name}
                              className="text-muted"
                              style={{ fontSize: "11px" }}
                            >
                              {r.name}: {r.quantity}
                            </div>
                          ))}
                        </div>
                      )}
                      {hasNamingAuthority && (
                        <div style={{ marginTop: 6 }}>
                          <div
                            style={{
                              display: "flex",
                              gap: 4,
                              alignItems: "center",
                            }}
                          >
                            <input
                              type="text"
                              value={renameInput[p.id] || ""}
                              onChange={(e) =>
                                setRenameInput((prev) => ({
                                  ...prev,
                                  [p.id]: e.target.value,
                                }))
                              }
                              placeholder="New planet name"
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
                              onClick={() => handleRename(p.id)}
                              disabled={
                                busy === p.id + "-rename" ||
                                !renameInput[p.id]?.trim()
                              }
                            >
                              {busy === p.id + "-rename" ? "..." : "RENAME"}
                            </button>
                          </div>
                        </div>
                      )}
                      <div className="planet-combat-section">
                        <div
                          style={{
                            fontSize: 10,
                            color: "var(--orange)",
                            textTransform: "uppercase",
                            letterSpacing: 1,
                            marginBottom: 6,
                          }}
                        >
                          Fortify Defenses
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            alignItems: "center",
                            flexWrap: "wrap",
                          }}
                        >
                          <select
                            value={fortifyType[p.id] || "shield"}
                            onChange={(e) =>
                              setFortifyType((prev) => ({
                                ...prev,
                                [p.id]: e.target.value,
                              }))
                            }
                            style={{
                              background: "#111",
                              border: "1px solid #333",
                              color: "#ccc",
                              padding: "2px 4px",
                              fontSize: 10,
                              width: 80,
                            }}
                          >
                            <option value="shield">Shield</option>
                            <option value="cannon">Cannon</option>
                            <option value="drone">Drone</option>
                          </select>
                          <input
                            type="number"
                            className="qty-input"
                            min={1}
                            value={fortifyAmt[p.id] || 1}
                            onChange={(e) =>
                              setFortifyAmt((prev) => ({
                                ...prev,
                                [p.id]: Math.max(
                                  1,
                                  parseInt(e.target.value) || 1,
                                ),
                              }))
                            }
                            style={{ width: "48px" }}
                          />
                          <button
                            className="btn-sm"
                            disabled={busy === p.id + "-fortify"}
                            onClick={() => handleFortify(p.id)}
                            style={{
                              color: "var(--orange)",
                              borderColor: "var(--orange)",
                            }}
                          >
                            {busy === p.id + "-fortify" ? "..." : "FORTIFY"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </>
    );

  const renderDiscoveredPlanet = (p: DiscoveredPlanetData) => {
    const tag = p.owned
      ? " [YOURS]"
      : p.ownerName
        ? ` (${p.ownerName})`
        : p.planetClass === "S"
          ? " [seed world]"
          : " *unclaimed*";
    const tagColor = p.owned
      ? "#0f0"
      : p.ownerName
        ? "#f80"
        : p.planetClass === "S"
          ? "#56d4dd"
          : "#888";
    const inSector = currentSectorId != null && p.sectorId === currentSectorId;
    const canClaim =
      !p.owned && !p.ownerName && inSector && p.planetClass !== "S";
    const bestRace = p.planetClass !== "S" ? getBestRace(p.planetClass) : null;
    return (
      <div key={p.id} className="planet-panel-item">
        <div className="planet-panel-item__header">
          <span className="planet-panel-item__name">{p.name}</span>
          <span
            className="planet-panel-item__class"
            style={{ position: "relative", cursor: "help" }}
            onMouseEnter={() => setHoveredPlanetId(p.id)}
            onMouseLeave={() => setHoveredPlanetId(null)}
          >
            [{p.planetClass}] {CLASS_LABELS[p.planetClass] || ""}
            {hoveredPlanetId === p.id &&
              (() => {
                const ti = getPlanetTypeInfo(p.planetClass);
                return ti ? (
                  <div className="planet-tooltip">
                    <div className="planet-tooltip__name">{ti.name}</div>
                    <div className="planet-tooltip__row">{ti.description}</div>
                    <div className="planet-tooltip__row">
                      Production: <span>{ti.production}</span>
                    </div>
                    {ti.uniqueResource && (
                      <div className="planet-tooltip__row">
                        Unique: <span>{ti.uniqueResource}</span>
                      </div>
                    )}
                  </div>
                ) : null;
              })()}
          </span>
          <span
            style={{
              color: tagColor,
              marginLeft: "0.5rem",
              fontSize: "0.85em",
            }}
          >
            {tag}
          </span>
        </div>
        <div
          className="planet-panel-item__details"
          style={{
            display: "flex",
            gap: "8px",
            fontSize: "0.85em",
            color: "var(--text-secondary)",
            flexWrap: "wrap",
          }}
        >
          <span>Sector {p.sectorId}</span>
          <span>Level {p.upgradeLevel}</span>
          <span>{p.colonists.toLocaleString()} colonists</span>
          {bestRace && (
            <span style={{ color: "var(--cyan)" }}>
              Best: {RACE_LABELS[bestRace.race] || bestRace.race} (
              {Math.round(bestRace.multiplier * 100)}%)
            </span>
          )}
        </div>
        {p.owned && p.cyrilliumStock != null && (
          <div
            className="planet-panel-item__stocks"
            style={{
              display: "flex",
              gap: "8px",
              fontSize: "0.85em",
              color: "var(--text-secondary)",
            }}
          >
            <span title="Cyrillium">Cyr: {p.cyrilliumStock}</span>
            <span title="Food">Food: {p.foodStock}</span>
            <span title="Tech">Tech: {p.techStock}</span>
          </div>
        )}
        <div className="planet-actions">
          {inSector && landedAtPlanetId === p.id && onLiftoff && (
            <button
              className="btn-sm"
              onClick={() => onLiftoff()}
              style={{
                color: "var(--yellow)",
                borderColor: "var(--yellow)",
              }}
            >
              LIFTOFF
            </button>
          )}
          {inSector && landedAtPlanetId !== p.id && onLand && (
            <button
              className="btn-sm"
              onClick={() => onLand(p.id)}
              style={{
                color: "var(--green)",
                borderColor: "var(--green)",
              }}
            >
              LAND
            </button>
          )}
          {canClaim && (
            <button
              className="btn-sm btn-buy"
              disabled={busy === p.id + "-claim"}
              onClick={() => handleClaim(p.id)}
            >
              {busy === p.id + "-claim" ? "..." : "CLAIM"}
            </button>
          )}
          {inSector &&
            p.colonists > 0 &&
            (p.planetClass === "S" || p.owned) &&
            (landedAtPlanetId === p.id || hasTransporter) && (
              <span className="planet-colonize-group">
                <input
                  type="number"
                  className="qty-input"
                  min={1}
                  value={collectColonistQty[p.id] || 10}
                  onChange={(e) =>
                    setCollectColonistQty((prev) => ({
                      ...prev,
                      [p.id]: Math.max(1, parseInt(e.target.value) || 1),
                    }))
                  }
                  style={{ width: "48px" }}
                />
                {raceSelect(
                  p.id,
                  collectColonistRace[p.id] || defaultRace,
                  setCollectColonistRace,
                )}
                <button
                  className="btn-sm"
                  disabled={busy === p.id + "-collectcol"}
                  onClick={() => handleCollectColonists(p.id)}
                  style={{
                    color: "var(--orange)",
                    borderColor: "var(--orange)",
                  }}
                >
                  {busy === p.id + "-collectcol" ? "..." : "WITHDRAW COLONISTS"}
                </button>
              </span>
            )}
          {inSector &&
            (p.planetClass === "S" || p.owned) &&
            (landedAtPlanetId === p.id || hasTransporter) &&
            colonistsByRace &&
            colonistsByRace.some((r) => r.count > 0) && (
              <span className="planet-colonize-group">
                <input
                  type="number"
                  className="qty-input"
                  min={1}
                  value={depositColonistQty[p.id] || 10}
                  onChange={(e) =>
                    setDepositColonistQty((prev) => ({
                      ...prev,
                      [p.id]: Math.max(1, parseInt(e.target.value) || 1),
                    }))
                  }
                  style={{ width: "48px" }}
                />
                {raceSelect(
                  p.id,
                  depositColonistRace[p.id] || defaultRace,
                  setDepositColonistRace,
                )}
                <button
                  className="btn-sm"
                  disabled={busy === p.id + "-depositcol"}
                  onClick={() => handleDepositColonists(p.id)}
                  style={{
                    color: "var(--cyan)",
                    borderColor: "var(--cyan)",
                  }}
                >
                  {busy === p.id + "-depositcol" ? "..." : "DEPOSIT COLONISTS"}
                </button>
              </span>
            )}
        </div>
      </div>
    );
  };

  const discoveredContent = (
    <>
      <div style={{ marginBottom: 8 }}>
        <button
          className="btn-sm btn-primary"
          onClick={handleScan}
          disabled={scanning}
          title="Use a Planetary Scanner Probe to reveal detailed planet info"
        >
          {scanning ? "SCANNING..." : "SCAN SECTOR"}
        </button>
      </div>
      {error && <div className="mall-error">{error}</div>}
      {scanResults && scanResults.length > 0 && (
        <div
          style={{
            marginBottom: 8,
            padding: 6,
            background: "var(--bg-tertiary)",
            border: "1px solid var(--cyan)",
            borderRadius: 4,
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: "var(--cyan)",
              marginBottom: 4,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Scanner Results
          </div>
          {scanResults.map((p: any) => (
            <div
              key={p.id}
              style={{
                fontSize: 11,
                marginBottom: 4,
                paddingBottom: 4,
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div>
                <span style={{ color: "var(--text-primary)" }}>{p.name}</span>{" "}
                <span style={{ color: "var(--cyan)" }}>[{p.planetClass}]</span>
              </div>
              <div style={{ color: "var(--text-secondary)" }}>
                Owner:{" "}
                {p.ownerName ||
                  (p.planetClass === "S" ? "Seed World" : "Unclaimed")}{" "}
                | Lv.{p.upgradeLevel} | {p.colonists} colonists
              </div>
              {(p.cannonEnergy > 0 || p.shieldEnergy > 0 || p.drones > 0) && (
                <div style={{ color: "var(--orange)" }}>
                  Defenses:{" "}
                  {p.cannonEnergy > 0 ? `Cannon:${p.cannonEnergy} ` : ""}
                  {p.shieldEnergy > 0 ? `Shield:${p.shieldEnergy} ` : ""}
                  {p.drones > 0 ? `Drones:${p.drones}` : ""}
                </div>
              )}
              {p.resources && p.resources.length > 0 && (
                <div style={{ color: "var(--green)" }}>
                  Resources:{" "}
                  {p.resources
                    .map((r: any) => `${r.name}:${r.stock}`)
                    .join(", ")}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {discovered.length === 0 ? (
        <div className="text-muted">
          No planets discovered yet. Explore sectors to find planets.
        </div>
      ) : (
        <>
          {error && !scanResults && <div className="mall-error">{error}</div>}
          {discovered.map((p) => renderDiscoveredPlanet(p))}
        </>
      )}
    </>
  );

  // Sector tab reuses discovered planet rendering, filtered to current sector
  const sectorContent = (
    <>
      {error && <div className="mall-error">{error}</div>}
      {sectorPlanets.length === 0 ? (
        <div className="text-muted">No planets in this sector.</div>
      ) : (
        sectorPlanets.map((p) => renderDiscoveredPlanet(p))
      )}
    </>
  );

  const content = (
    <>
      {tabBar}
      {tab === "sector" && sectorContent}
      {tab === "owned" && ownedContent}
      {tab === "discovered" && discoveredContent}
      {tab === "analytics" && <PlanetAnalytics planets={planets} />}
    </>
  );

  if (bare) return <div className="panel-content">{content}</div>;
  return (
    <CollapsiblePanel
      title="PLANETS"
      badge={
        tab === "owned" ? planets.length || null : discovered.length || null
      }
    >
      {content}
    </CollapsiblePanel>
  );
}
