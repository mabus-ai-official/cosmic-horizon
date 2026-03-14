import { useState, useEffect } from "react";
import { getPlayerProfile } from "../services/api";

interface Props {
  refreshKey?: number;
  bare?: boolean;
}

type Period = "7d" | "30d" | "allTime";
type Section =
  | "stats"
  | "milestones"
  | "activity"
  | "bests"
  | "achievements"
  | "factions";

const STAT_LABELS: Record<string, string> = {
  combat_kills: "Kills",
  combat_deaths: "Deaths",
  damage_dealt: "Damage Dealt",
  damage_taken: "Damage Taken",
  sectors_explored: "Sectors Explored",
  missions_completed: "Missions Completed",
  trades_completed: "Trades",
  trade_credits_earned: "Credits Earned",
  trade_credits_spent: "Credits Spent",
  items_crafted: "Items Crafted",
  resources_gathered: "Resources Gathered",
  planets_colonized: "Planets Colonized",
  food_deposited: "Food Deposited",
  caravans_dispatched: "Caravans Dispatched",
  caravans_delivered: "Caravans Delivered",
  caravans_ransacked: "Caravans Ransacked",
  caravans_lost: "Caravans Lost",
  caravans_escorted: "Caravans Escorted",
  bounties_placed: "Bounties Placed",
  bounties_claimed: "Bounties Claimed",
  credits_from_bounties: "Bounty Earnings",
  dodge_pod_uses: "Dodge Pod Uses",
  warp_gate_uses: "Warp Gate Uses",
  chat_messages_sent: "Chat Messages",
  energy_spent: "Energy Spent",
};

const KEY_STATS = [
  "combat_kills",
  "combat_deaths",
  "sectors_explored",
  "trades_completed",
  "trade_credits_earned",
  "items_crafted",
  "planets_colonized",
  "caravans_delivered",
  "missions_completed",
  "energy_spent",
];

const TIER_COLORS: Record<number, string> = {
  1: "#cd7f32",
  2: "#c0c0c0",
  3: "#ffd700",
};
const TIER_LABELS: Record<number, string> = {
  1: "BRONZE",
  2: "SILVER",
  3: "GOLD",
};

const SECTIONS: { id: Section; label: string; color: string }[] = [
  { id: "stats", label: "Stats", color: "var(--cyan)" },
  { id: "milestones", label: "Badges", color: "var(--yellow)" },
  { id: "activity", label: "Activity", color: "var(--green)" },
  { id: "bests", label: "Bests", color: "var(--orange)" },
  { id: "achievements", label: "Achieve", color: "var(--purple)" },
  { id: "factions", label: "Factions", color: "var(--magenta)" },
];

const EVENT_ICONS: Record<string, string> = {
  combat_kill: "\u2694",
  combat_death: "\u2620",
  trade: "\u25C6",
  craft: "\u2692",
  colonize: "\u2316",
  mission_complete: "\u2605",
  level_up: "\u25B2",
  bounty_placed: "\u25CE",
  bounty_claimed: "\u25C9",
  caravan_delivered: "\u25A0",
  caravan_ransacked: "\u2620",
  caravan_lost: "\u2717",
  caravan_escorted: "\u25D0",
  deposit_food: "\u25CB",
};

export default function ProfilePanel({ refreshKey }: Props) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("allTime");
  const [section, setSection] = useState<Section>("stats");
  const [showAllStats, setShowAllStats] = useState(false);

  useEffect(() => {
    setLoading(true);
    getPlayerProfile()
      .then(({ data }) => setProfile(data))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  if (loading)
    return (
      <div className="text-muted" style={{ padding: "8px 12px" }}>
        Loading profile...
      </div>
    );
  if (!profile)
    return (
      <div style={{ padding: "8px 12px", color: "var(--red)" }}>
        Failed to load profile.
      </div>
    );

  const {
    player,
    stats,
    recentActivity,
    personalBests,
    milestones,
    achievements,
    factionRep,
  } = profile;
  const currentStats: Record<string, number> =
    period === "allTime"
      ? stats.allTime
      : period === "7d"
        ? stats.last7d
        : stats.last30d;
  const displayStats = showAllStats ? Object.keys(STAT_LABELS) : KEY_STATS;

  const fmt = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return String(n);
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
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
      {/* Header */}
      <div
        className="panel-section panel-section--accent"
        style={{ margin: "8px 12px 0", borderRadius: "6px" }}
      >
        <div className="panel-section__header">{player.username}</div>
        <div className="panel-kv">
          <span className="panel-kv__label">Race</span>
          <span className="panel-kv__value panel-kv__value--warning">
            {player.race?.toUpperCase()}
          </span>
        </div>
        <div className="panel-kv">
          <span className="panel-kv__label">Level</span>
          <span className="panel-kv__value">{player.level}</span>
        </div>
        <div className="panel-kv">
          <span className="panel-kv__label">Rank</span>
          <span className="panel-kv__value" style={{ color: "var(--purple)" }}>
            {player.rank}
          </span>
        </div>
        <div className="panel-kv">
          <span className="panel-kv__label">Credits</span>
          <span className="panel-kv__value panel-kv__value--success">
            {fmt(player.credits)} cr
          </span>
        </div>
        <div className="panel-kv">
          <span className="panel-kv__label">XP</span>
          <span className="panel-kv__value panel-kv__value--accent">
            {fmt(player.xp)}
          </span>
        </div>
      </div>

      {/* Section tabs — pipe style matching other panels */}
      <div className="group-panel-tabs" style={{ padding: "4px 12px" }}>
        {SECTIONS.map((s, i) => (
          <span key={s.id}>
            {i > 0 && (
              <span style={{ color: "var(--text-muted)", margin: "0 0.4rem" }}>
                |
              </span>
            )}
            <span
              onClick={() => setSection(s.id)}
              style={{
                cursor: "pointer",
                color: section === s.id ? s.color : "var(--text-secondary)",
                fontSize: 11,
              }}
            >
              {section === s.id ? `[${s.label}]` : s.label}
            </span>
          </span>
        ))}
      </div>

      {/* Scrollable content area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          minHeight: 0,
          padding: "0 12px 12px",
        }}
      >
        <div className="panel-sections">
          {/* Stats */}
          {section === "stats" && (
            <div className="panel-section">
              <div className="group-panel-tabs" style={{ marginBottom: "4px" }}>
                {(["allTime", "30d", "7d"] as Period[]).map((p, i) => {
                  const label =
                    p === "allTime" ? "All" : p === "30d" ? "30d" : "7d";
                  return (
                    <span key={p}>
                      {i > 0 && (
                        <span
                          style={{
                            color: "var(--text-muted)",
                            margin: "0 0.4rem",
                          }}
                        >
                          |
                        </span>
                      )}
                      <span
                        onClick={() => setPeriod(p)}
                        style={{
                          cursor: "pointer",
                          color:
                            period === p
                              ? "var(--cyan)"
                              : "var(--text-secondary)",
                          fontSize: 11,
                        }}
                      >
                        {period === p ? `[${label}]` : label}
                      </span>
                    </span>
                  );
                })}
              </div>
              {displayStats.map((key) => (
                <div key={key} className="panel-kv">
                  <span className="panel-kv__label">{STAT_LABELS[key]}</span>
                  <span className="panel-kv__value">
                    {fmt(currentStats[key] || 0)}
                  </span>
                </div>
              ))}
              <span
                onClick={() => setShowAllStats(!showAllStats)}
                style={{
                  cursor: "pointer",
                  color: "var(--cyan)",
                  fontSize: "0.8rem",
                  display: "inline-block",
                  marginTop: "6px",
                }}
              >
                {showAllStats ? "[- key stats]" : "[+ all stats]"}
              </span>
            </div>
          )}

          {/* Milestones */}
          {section === "milestones" && (
            <>
              {milestones.earned.length > 0 && (
                <div className="panel-section panel-section--accent">
                  <div className="panel-section__header">
                    EARNED ({milestones.earned.length})
                  </div>
                  <div
                    style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}
                  >
                    {milestones.earned.map((m: any) => (
                      <div
                        key={m.id}
                        title={`${m.description}\nEarned: ${new Date(m.earnedAt).toLocaleDateString()}`}
                        style={{
                          background: "var(--bg-secondary)",
                          border: `1px solid ${TIER_COLORS[m.tier] || "var(--border)"}`,
                          borderRadius: "3px",
                          padding: "5px 10px",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            color: TIER_COLORS[m.tier],
                            fontWeight: "bold",
                            fontSize: "0.8rem",
                          }}
                        >
                          {m.name}
                        </div>
                        <div
                          style={{
                            color: "var(--text-secondary)",
                            fontSize: "0.65rem",
                          }}
                        >
                          {TIER_LABELS[m.tier]}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {milestones.available.length > 0 && (
                <div className="panel-section">
                  <div className="panel-section__header panel-section__header--muted">
                    LOCKED ({milestones.available.length})
                  </div>
                  <div
                    style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}
                  >
                    {milestones.available.map((m: any) => {
                      const progress =
                        m.statKey && stats.allTime[m.statKey] !== undefined
                          ? Math.min(
                              100,
                              Math.floor(
                                (stats.allTime[m.statKey] / m.threshold) * 100,
                              ),
                            )
                          : 0;
                      return (
                        <div
                          key={m.id}
                          title={m.description}
                          style={{
                            background: "var(--bg-primary)",
                            border: "1px solid var(--border)",
                            borderRadius: "3px",
                            padding: "5px 10px",
                            textAlign: "center",
                            opacity: 0.6,
                          }}
                        >
                          <div
                            style={{
                              color: "var(--text-muted)",
                              fontWeight: "bold",
                              fontSize: "0.8rem",
                            }}
                          >
                            {m.name}
                          </div>
                          <div
                            style={{
                              color: "var(--text-muted)",
                              fontSize: "0.65rem",
                            }}
                          >
                            {TIER_LABELS[m.tier]} · {progress}%
                          </div>
                          {m.threshold && (
                            <div
                              style={{
                                background: "var(--bg-tertiary)",
                                borderRadius: "2px",
                                height: "2px",
                                marginTop: "3px",
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  width: `${progress}%`,
                                  height: "100%",
                                  background:
                                    TIER_COLORS[m.tier] || "var(--cyan)",
                                }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {milestones.earned.length === 0 &&
                milestones.available.length === 0 && (
                  <div className="text-muted">No milestones available yet.</div>
                )}
            </>
          )}

          {/* Activity */}
          {section === "activity" && (
            <div className="panel-section">
              <div
                className="panel-section__header"
                style={{ color: "var(--green)" }}
              >
                Recent Activity
              </div>
              {recentActivity.length === 0 ? (
                <div className="text-muted">No recent activity.</div>
              ) : (
                recentActivity.map((a: any, i: number) => (
                  <div key={i} className="panel-list-item">
                    <span
                      style={{
                        width: "16px",
                        textAlign: "center",
                        color: "var(--text-secondary)",
                        flexShrink: 0,
                      }}
                    >
                      {EVENT_ICONS[a.eventType] || "·"}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        color: "var(--text-primary)",
                        fontSize: "0.846rem",
                      }}
                    >
                      {a.description}
                    </span>
                    <span
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "0.7rem",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {timeAgo(a.createdAt)}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Personal Bests */}
          {section === "bests" && (
            <div className="panel-section panel-section--warning">
              <div className="panel-section__header panel-section__header--warning">
                Personal Bests
              </div>
              {personalBests.length === 0 ? (
                <div className="text-muted">
                  No personal bests recorded yet.
                </div>
              ) : (
                personalBests.map((b: any) => (
                  <div key={b.bestType} className="panel-kv">
                    <span
                      className="panel-kv__label"
                      style={{ flex: 1, minWidth: 0 }}
                    >
                      <span
                        className="panel-kv__value panel-kv__value--warning"
                        style={{
                          marginRight: 8,
                          minWidth: "40px",
                          display: "inline-block",
                        }}
                      >
                        {fmt(b.value)}
                      </span>
                      {b.description || b.bestType}
                    </span>
                    <span
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "0.7rem",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {timeAgo(b.achievedAt)}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Achievements */}
          {section === "achievements" && (
            <div className="panel-section panel-section--special">
              <div className="panel-section__header panel-section__header--special">
                Achievements
              </div>
              {achievements.length === 0 ? (
                <div className="text-muted">No achievements earned yet.</div>
              ) : (
                achievements.map((a: any) => (
                  <div
                    key={a.id}
                    className="panel-kv"
                    style={{ alignItems: "flex-start" }}
                  >
                    <span
                      className="panel-kv__label"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      <span
                        style={{
                          color: "var(--green)",
                          fontWeight: "bold",
                          fontSize: "0.846rem",
                        }}
                      >
                        {a.name}
                      </span>
                      <span
                        style={{
                          color: "var(--text-muted)",
                          fontSize: "0.7rem",
                        }}
                      >
                        {a.description}
                      </span>
                    </span>
                    <span
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "0.7rem",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {timeAgo(a.earnedAt)}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Factions */}
          {section === "factions" && (
            <div className="panel-section panel-section--accent">
              <div className="panel-section__header">Faction Reputation</div>
              {factionRep.length === 0 ? (
                <div className="text-muted">No faction reputation yet.</div>
              ) : (
                <>
                  <div
                    className="panel-kv"
                    style={{
                      borderBottom: "1px solid var(--border)",
                      paddingBottom: 4,
                    }}
                  >
                    <span className="panel-kv__label">Faction</span>
                    <span className="panel-kv__label">Fame / Infamy</span>
                  </div>
                  {factionRep.map((f: any) => (
                    <div key={f.factionId} className="panel-kv">
                      <span className="panel-kv__value">{f.factionName}</span>
                      <span>
                        <span style={{ color: "var(--green)" }}>
                          {fmt(f.fame)}
                        </span>{" "}
                        /{" "}
                        <span style={{ color: "var(--red)" }}>
                          {fmt(f.infamy)}
                        </span>
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
