import { useState, useEffect } from "react";
import {
  getAchievements,
  getRanks,
  getLeaderboard,
  getCombatLog,
  getRecipes,
  getTablets,
  equipTablet,
  unequipTablet,
  combineTablets,
  toggleAlliance,
} from "../services/api";

type Tab =
  | "achievements"
  | "leaderboard"
  | "combat"
  | "ranks"
  | "recipes"
  | "tablets";

const TABS: { id: Tab; label: string; color: string }[] = [
  { id: "achievements", label: "Achieve", color: "var(--green)" },
  { id: "leaderboard", label: "Leaders", color: "var(--yellow)" },
  { id: "combat", label: "Combat", color: "var(--red)" },
  { id: "ranks", label: "Ranks", color: "var(--purple)" },
  { id: "recipes", label: "Recipes", color: "var(--orange)" },
  { id: "tablets", label: "Tablets", color: "var(--cyan)" },
];

const LB_CATEGORIES = [
  "credits",
  "planets",
  "combat",
  "explored",
  "trade",
  "syndicate",
  "level",
];
const LB_COLORS: Record<string, string> = {
  credits: "var(--yellow)",
  planets: "var(--green)",
  combat: "var(--red)",
  explored: "var(--cyan)",
  trade: "var(--purple)",
  syndicate: "var(--magenta)",
  level: "var(--orange)",
};

const RARITY_COLORS: Record<string, string> = {
  common: "#aaa",
  uncommon: "var(--green)",
  rare: "var(--cyan)",
  epic: "var(--purple)",
  legendary: "var(--orange)",
  mythic: "var(--magenta)",
};

interface Props {
  refreshKey?: number;
  bare?: boolean;
  alliedPlayerIds?: string[];
  onAllianceChange?: () => void;
}

export default function DatabankPanel({
  refreshKey,
  alliedPlayerIds = [],
  onAllianceChange,
}: Props) {
  const [tab, setTab] = useState<Tab>("achievements");

  // Achievements
  const [achData, setAchData] = useState<any>(null);
  const [achLoading, setAchLoading] = useState(false);

  // Leaderboard
  const [lbCategory, setLbCategory] = useState("credits");
  const [lbEntries, setLbEntries] = useState<any[]>([]);

  // Combat log
  const [combatLogs, setCombatLogs] = useState<any[]>([]);
  const [combatLoading, setCombatLoading] = useState(false);

  // Ranks
  const [ranksData, setRanksData] = useState<any>(null);

  // Recipes
  const [recipesData, setRecipesData] = useState<any>(null);

  // Tablets
  const [tabletsData, setTabletsData] = useState<any>(null);
  const [tabletBusy, setTabletBusy] = useState(false);
  const [tabletMsg, setTabletMsg] = useState("");
  const [selectedForCombine, setSelectedForCombine] = useState<string[]>([]);

  // Load data on tab change
  useEffect(() => {
    if (tab === "achievements" && !achData) {
      setAchLoading(true);
      getAchievements()
        .then(({ data }) => setAchData(data))
        .catch(() => setAchData({ earned: [], available: [] }))
        .finally(() => setAchLoading(false));
    }
    if (tab === "combat" && combatLogs.length === 0) {
      setCombatLoading(true);
      getCombatLog()
        .then(({ data }) => setCombatLogs(data.logs || []))
        .catch(() => setCombatLogs([]))
        .finally(() => setCombatLoading(false));
    }
    if (tab === "ranks" && !ranksData) {
      getRanks()
        .then(({ data }) => setRanksData(data))
        .catch(() => setRanksData({ ranks: [], shipGates: {} }));
    }
    if (tab === "recipes" && !recipesData) {
      getRecipes()
        .then(({ data }) => setRecipesData(data))
        .catch(() => setRecipesData({ grouped: {} }));
    }
    if (tab === "tablets" && !tabletsData) {
      loadTablets();
    }
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh current tab
  useEffect(() => {
    if (tab === "achievements") {
      getAchievements()
        .then(({ data }) => setAchData(data))
        .catch(() => {});
    } else if (tab === "combat") {
      getCombatLog()
        .then(({ data }) => setCombatLogs(data.logs || []))
        .catch(() => {});
    } else if (tab === "tablets") {
      loadTablets();
    }
  }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Leaderboard category
  useEffect(() => {
    if (tab === "leaderboard") {
      getLeaderboard(lbCategory)
        .then(({ data }) =>
          setLbEntries(data.entries || data.leaderboard || []),
        )
        .catch(() => setLbEntries([]));
    }
  }, [lbCategory, tab, refreshKey]);

  function loadTablets() {
    getTablets()
      .then(({ data }) => setTabletsData(data))
      .catch(() =>
        setTabletsData({
          tablets: [],
          equipped: [],
          slots: { unlocked: [] },
          storage: { max: 5 },
        }),
      );
  }

  const handleEquip = async (tabletId: string, slot: number) => {
    setTabletBusy(true);
    setTabletMsg("");
    try {
      await equipTablet(tabletId, slot);
      setTabletMsg("Equipped!");
      loadTablets();
    } catch (err: any) {
      setTabletMsg(err.response?.data?.error || "Failed to equip");
    } finally {
      setTabletBusy(false);
    }
  };

  const handleUnequip = async (slot: number) => {
    setTabletBusy(true);
    setTabletMsg("");
    try {
      await unequipTablet(slot);
      setTabletMsg("Unequipped.");
      loadTablets();
    } catch (err: any) {
      setTabletMsg(err.response?.data?.error || "Failed to unequip");
    } finally {
      setTabletBusy(false);
    }
  };

  const handleCombine = async () => {
    if (selectedForCombine.length < 3) return;
    setTabletBusy(true);
    setTabletMsg("");
    try {
      const { data } = await combineTablets(selectedForCombine);
      setTabletMsg(data.message || "Combined!");
      setSelectedForCombine([]);
      loadTablets();
    } catch (err: any) {
      setTabletMsg(err.response?.data?.error || "Failed to combine");
    } finally {
      setTabletBusy(false);
    }
  };

  const toggleCombineSelect = (id: string) => {
    setSelectedForCombine((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const parseEffects = (effects: any): string => {
    if (!effects) return "";
    if (typeof effects === "string") {
      try {
        const parsed = JSON.parse(effects);
        return Object.entries(parsed)
          .map(([k, v]) => `${k}: +${v}`)
          .join(", ");
      } catch {
        return effects;
      }
    }
    return Object.entries(effects)
      .map(([k, v]) => `${k}: +${v}`)
      .join(", ");
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      {/* Tab bar */}
      <div className="group-panel-tabs" style={{ padding: "6px 12px" }}>
        {TABS.map((t, i) => (
          <span key={t.id}>
            {i > 0 && (
              <span style={{ color: "#444", margin: "0 0.4rem" }}>|</span>
            )}
            <span
              onClick={() => setTab(t.id)}
              style={{
                cursor: "pointer",
                color: tab === t.id ? t.color : "#666",
                fontSize: 11,
              }}
            >
              {tab === t.id ? `[${t.label}]` : t.label}
            </span>
          </span>
        ))}
      </div>

      {/* Scrollable content */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          minHeight: 0,
          padding: "0 12px 12px",
        }}
      >
        <div className="panel-sections">
          {/* === ACHIEVEMENTS === */}
          {tab === "achievements" && (
            <>
              {achLoading && (
                <div className="text-muted">Loading achievements...</div>
              )}
              {achData && (
                <>
                  <div className="panel-section panel-section--accent">
                    <div className="panel-section__header">
                      EARNED (
                      {achData.totalEarned ?? achData.earned?.length ?? 0}/
                      {achData.totalVisible ?? "?"})
                    </div>
                    {achData.earned?.length > 0 ? (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                        }}
                      >
                        {achData.earned.map((a: any, i: number) => (
                          <div
                            key={a.id || i}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              padding: "4px 0",
                              borderBottom: "1px solid var(--border)",
                            }}
                          >
                            <span
                              style={{
                                fontSize: 18,
                                width: 24,
                                textAlign: "center",
                              }}
                            >
                              {a.icon || "\u2605"}
                            </span>
                            <div style={{ flex: 1 }}>
                              <div
                                style={{
                                  color: "var(--green)",
                                  fontWeight: "bold",
                                  fontSize: "0.846rem",
                                }}
                              >
                                {a.name}
                              </div>
                              <div
                                style={{
                                  color: "var(--text-muted)",
                                  fontSize: "0.75rem",
                                }}
                              >
                                {a.description}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-muted">
                        No achievements earned yet.
                      </div>
                    )}
                  </div>
                  {achData.available?.length > 0 && (
                    <div className="panel-section">
                      <div className="panel-section__header panel-section__header--muted">
                        LOCKED ({achData.available.length})
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                        }}
                      >
                        {achData.available.map((a: any, i: number) => (
                          <div
                            key={a.id || i}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              padding: "4px 0",
                              opacity: 0.5,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 18,
                                width: 24,
                                textAlign: "center",
                                color: "var(--text-muted)",
                              }}
                            >
                              ?
                            </span>
                            <div style={{ flex: 1 }}>
                              <div
                                style={{
                                  color: "var(--text-secondary)",
                                  fontWeight: "bold",
                                  fontSize: "0.846rem",
                                }}
                              >
                                {a.name}
                              </div>
                              <div
                                style={{
                                  color: "var(--text-muted)",
                                  fontSize: "0.75rem",
                                }}
                              >
                                {a.description}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* === LEADERBOARD === */}
          {tab === "leaderboard" && (
            <>
              <div className="group-panel-tabs" style={{ flexWrap: "wrap" }}>
                {LB_CATEGORIES.map((cat, i) => (
                  <span key={cat}>
                    {i > 0 && (
                      <span style={{ color: "#444", margin: "0 0.4rem" }}>
                        |
                      </span>
                    )}
                    <span
                      onClick={() => setLbCategory(cat)}
                      style={{
                        cursor: "pointer",
                        color:
                          lbCategory === cat
                            ? LB_COLORS[cat] || "var(--cyan)"
                            : "#666",
                        fontSize: 11,
                        textTransform: "capitalize",
                      }}
                    >
                      {lbCategory === cat ? `[${cat}]` : cat}
                    </span>
                  </span>
                ))}
              </div>
              <div
                className="panel-subheader"
                style={{
                  color: LB_COLORS[lbCategory],
                  textTransform: "capitalize",
                }}
              >
                {lbCategory} Rankings
              </div>
              {lbEntries.length === 0 ? (
                <div className="text-muted">No data available.</div>
              ) : (
                lbEntries.map((e: any, i: number) => (
                  <div
                    key={e.playerId || i}
                    className="panel-row"
                    style={{
                      justifyContent: "space-between",
                      fontSize: 12,
                      color: e.isCurrentPlayer
                        ? LB_COLORS[lbCategory]
                        : undefined,
                      fontWeight: e.isCurrentPlayer ? "bold" : undefined,
                    }}
                  >
                    <span>
                      <span
                        style={{
                          color: "#666",
                          marginRight: 6,
                          minWidth: 20,
                          display: "inline-block",
                        }}
                      >
                        {e.rank || i + 1}.
                      </span>
                      {e.username}
                      {e.isCurrentPlayer && (
                        <span style={{ fontSize: 10, marginLeft: 4 }}>
                          (you)
                        </span>
                      )}
                    </span>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      {!e.isCurrentPlayer && (
                        <button
                          className={`btn-sm btn-ally ${alliedPlayerIds.includes(e.playerId) ? "btn-ally--active" : ""}`}
                          style={{ fontSize: 9, padding: "1px 4px" }}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            toggleAlliance(e.playerId).then(() =>
                              onAllianceChange?.(),
                            );
                          }}
                        >
                          {alliedPlayerIds.includes(e.playerId)
                            ? "ALLIED"
                            : "ALLY"}
                        </button>
                      )}
                      <span style={{ color: LB_COLORS[lbCategory] }}>
                        {Number(e.score).toLocaleString()}
                      </span>
                    </span>
                  </div>
                ))
              )}
            </>
          )}

          {/* === COMBAT LOG === */}
          {tab === "combat" && (
            <div className="panel-section">
              <div
                className="panel-section__header"
                style={{ color: "var(--red)" }}
              >
                Recent Combat
              </div>
              {combatLoading && <div className="text-muted">Loading...</div>}
              {!combatLoading && combatLogs.length === 0 && (
                <div className="text-muted">No combat history.</div>
              )}
              {combatLogs.map((log: any, i: number) => {
                const won = log.outcome === "won";
                const fled = log.outcome === "flee";
                return (
                  <div
                    key={i}
                    className="panel-list-item"
                    style={{
                      borderBottom: "1px solid var(--border)",
                      paddingBottom: 4,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.846rem",
                      }}
                    >
                      <span>
                        <span style={{ color: "var(--cyan)" }}>
                          {log.attackerName}
                        </span>
                        {" \u2192 "}
                        <span style={{ color: "var(--orange)" }}>
                          {log.defenderName}
                        </span>
                      </span>
                      <span
                        style={{
                          color: won
                            ? "var(--green)"
                            : fled
                              ? "var(--yellow)"
                              : "var(--red)",
                          fontSize: "0.75rem",
                          textTransform: "uppercase",
                        }}
                      >
                        {log.outcome}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      <span>{log.damageDealt} dmg</span>
                      <span>Sector {log.sectorId}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* === RANKS === */}
          {tab === "ranks" && ranksData && (
            <>
              <div className="panel-section panel-section--special">
                <div className="panel-section__header panel-section__header--special">
                  Rank Progression
                </div>
                {(ranksData.ranks || []).map((r: any, i: number) => (
                  <div key={i} className="panel-kv">
                    <span className="panel-kv__label">
                      Lv {r.minLevel}–{r.maxLevel}
                    </span>
                    <span
                      className="panel-kv__value"
                      style={{ color: "var(--purple)" }}
                    >
                      {r.title}
                    </span>
                  </div>
                ))}
              </div>
              {ranksData.shipGates &&
                Object.keys(ranksData.shipGates).length > 0 && (
                  <div className="panel-section panel-section--warning">
                    <div className="panel-section__header panel-section__header--warning">
                      Ship Level Gates
                    </div>
                    {Object.entries(ranksData.shipGates).map(
                      ([ship, level]: [string, any]) => (
                        <div key={ship} className="panel-kv">
                          <span
                            className="panel-kv__label"
                            style={{ textTransform: "capitalize" }}
                          >
                            {ship}
                          </span>
                          <span className="panel-kv__value">Level {level}</span>
                        </div>
                      ),
                    )}
                  </div>
                )}
            </>
          )}

          {/* === RECIPES === */}
          {tab === "recipes" && recipesData && (
            <>
              {Object.entries(recipesData.grouped || {}).map(
                ([tier, recipes]: [string, any]) => (
                  <div key={tier} className="panel-section">
                    <div
                      className="panel-section__header"
                      style={{
                        color:
                          tier === "2"
                            ? "var(--green)"
                            : tier === "3"
                              ? "var(--cyan)"
                              : "var(--purple)",
                      }}
                    >
                      TIER {tier} RECIPES
                    </div>
                    {recipes.map((r: any) => (
                      <div
                        key={r.id}
                        style={{
                          padding: "4px 0",
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: "0.846rem",
                          }}
                        >
                          <span
                            style={{
                              color: "var(--text-primary)",
                              fontWeight: "bold",
                            }}
                          >
                            {r.name}
                          </span>
                          <span
                            style={{
                              color: "var(--yellow)",
                              fontSize: "0.75rem",
                            }}
                          >
                            {r.creditsCost} cr · {r.craftTimeMinutes}m
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--text-muted)",
                            marginTop: 2,
                          }}
                        >
                          {r.ingredients
                            ?.map((ing: any) => `${ing.quantity}x ${ing.name}`)
                            .join(" + ")}
                        </div>
                      </div>
                    ))}
                  </div>
                ),
              )}
              <div className="panel-section panel-section--accent">
                <div className="panel-section__header">TABLET COMBINATIONS</div>
                <div className="panel-kv">
                  <span className="panel-kv__label">3x Common</span>
                  <span
                    className="panel-kv__value"
                    style={{ color: RARITY_COLORS.uncommon }}
                  >
                    Uncommon (1,000 cr)
                  </span>
                </div>
                <div className="panel-kv">
                  <span className="panel-kv__label">3x Uncommon</span>
                  <span
                    className="panel-kv__value"
                    style={{ color: RARITY_COLORS.rare }}
                  >
                    Rare (5,000 cr)
                  </span>
                </div>
                <div className="panel-kv">
                  <span className="panel-kv__label">3x Rare</span>
                  <span
                    className="panel-kv__value"
                    style={{ color: RARITY_COLORS.epic }}
                  >
                    Epic (15,000 cr)
                  </span>
                </div>
                <div className="panel-kv">
                  <span className="panel-kv__label">3x Epic</span>
                  <span
                    className="panel-kv__value"
                    style={{ color: RARITY_COLORS.legendary }}
                  >
                    Legendary (50,000 cr)
                  </span>
                </div>
              </div>
            </>
          )}

          {/* === TABLETS === */}
          {tab === "tablets" && tabletsData && (
            <>
              {tabletMsg && (
                <div
                  style={{
                    color: tabletMsg.includes("Failed")
                      ? "var(--red)"
                      : "var(--green)",
                    fontSize: "0.8rem",
                    padding: "4px 0",
                  }}
                >
                  {tabletMsg}
                </div>
              )}

              {/* Equipped slots */}
              <div className="panel-section panel-section--accent">
                <div className="panel-section__header">EQUIPPED SLOTS</div>
                {[1, 2, 3].map((slot) => {
                  const unlocked = tabletsData.slots?.unlocked?.includes(slot);
                  const equipped = tabletsData.equipped?.find(
                    (t: any) => t.equippedSlot === slot,
                  );
                  return (
                    <div
                      key={slot}
                      className="panel-kv"
                      style={{ opacity: unlocked ? 1 : 0.4 }}
                    >
                      <span className="panel-kv__label">
                        Slot {slot}
                        {!unlocked && " (locked)"}
                      </span>
                      {equipped ? (
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <span
                            style={{
                              color:
                                RARITY_COLORS[equipped.rarity] ||
                                "var(--text-primary)",
                              fontWeight: "bold",
                              fontSize: "0.846rem",
                            }}
                          >
                            {equipped.name}
                          </span>
                          <button
                            className="btn-sm"
                            style={{ fontSize: 9, padding: "1px 5px" }}
                            disabled={tabletBusy}
                            onClick={() => handleUnequip(slot)}
                          >
                            REMOVE
                          </button>
                        </span>
                      ) : (
                        <span
                          className="panel-kv__value"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {unlocked ? "Empty" : "—"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Inventory */}
              <div className="panel-section">
                <div className="panel-section__header panel-section__header--muted">
                  INVENTORY ({tabletsData.tablets?.length || 0}/
                  {tabletsData.storage?.max || 5})
                </div>
                {(!tabletsData.tablets || tabletsData.tablets.length === 0) && (
                  <div className="text-muted">No tablets in storage.</div>
                )}
                {tabletsData.tablets?.map((t: any) => {
                  const isSelected = selectedForCombine.includes(t.id);
                  return (
                    <div
                      key={t.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "4px 0",
                        borderBottom: "1px solid var(--border)",
                        background: isSelected
                          ? "rgba(0,255,255,0.05)"
                          : undefined,
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            color:
                              RARITY_COLORS[t.rarity] || "var(--text-primary)",
                            fontWeight: "bold",
                            fontSize: "0.846rem",
                          }}
                        >
                          {t.name}
                          <span
                            style={{
                              fontSize: "0.65rem",
                              marginLeft: 6,
                              textTransform: "uppercase",
                              opacity: 0.7,
                            }}
                          >
                            [{t.rarity}]
                          </span>
                        </div>
                        <div
                          style={{
                            color: "var(--text-muted)",
                            fontSize: "0.75rem",
                          }}
                        >
                          {parseEffects(t.effects)}
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 4,
                          alignItems: "center",
                        }}
                      >
                        <button
                          className="btn-sm"
                          style={{ fontSize: 9, padding: "1px 5px" }}
                          disabled={tabletBusy}
                          onClick={() => toggleCombineSelect(t.id)}
                        >
                          {isSelected ? "DESEL" : "SEL"}
                        </button>
                        {tabletsData.slots?.unlocked?.map((slot: number) => {
                          const occupied = tabletsData.equipped?.find(
                            (e: any) => e.equippedSlot === slot,
                          );
                          if (occupied) return null;
                          return (
                            <button
                              key={slot}
                              className="btn-sm btn-primary"
                              style={{ fontSize: 9, padding: "1px 5px" }}
                              disabled={tabletBusy}
                              onClick={() => handleEquip(t.id, slot)}
                            >
                              S{slot}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Combine section */}
              {selectedForCombine.length > 0 && (
                <div className="panel-section panel-section--warning">
                  <div className="panel-section__header panel-section__header--warning">
                    COMBINE ({selectedForCombine.length}/3 selected)
                  </div>
                  <button
                    className="btn-sm btn-buy"
                    disabled={tabletBusy || selectedForCombine.length < 3}
                    onClick={handleCombine}
                  >
                    COMBINE TABLETS
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
