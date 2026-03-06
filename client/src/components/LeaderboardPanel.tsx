import { useState, useEffect } from "react";
import {
  getLeaderboardOverview,
  getLeaderboard,
  toggleAlliance,
} from "../services/api";

interface LeaderboardEntry {
  rank: number;
  playerId: string;
  username: string;
  score: number;
  isCurrentPlayer?: boolean;
}

interface CategoryOverview {
  category: string;
  topPlayer?: string;
  topScore?: number;
}

const CATEGORIES = [
  "credits",
  "planets",
  "combat",
  "explored",
  "trade",
  "syndicate",
  "level",
];

interface Props {
  refreshKey?: number;
  bare?: boolean;
  alliedPlayerIds?: string[];
  onAllianceChange?: () => void;
}

export default function LeaderboardPanel({
  refreshKey,
  bare,
  alliedPlayerIds = [],
  onAllianceChange,
}: Props) {
  const [category, setCategory] = useState("credits");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [, setOverview] = useState<CategoryOverview[]>([]);

  useEffect(() => {
    getLeaderboardOverview()
      .then(({ data }) =>
        setOverview(data.categories || data.leaderboards || []),
      )
      .catch(() => setOverview([]));
  }, [refreshKey]);

  useEffect(() => {
    getLeaderboard(category)
      .then(({ data }) => setEntries(data.entries || data.leaderboard || []))
      .catch(() => setEntries([]));
  }, [category, refreshKey]);

  const categoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      credits: "var(--yellow)",
      planets: "var(--green)",
      combat: "var(--red)",
      explored: "var(--cyan)",
      trade: "var(--purple)",
      syndicate: "var(--magenta)",
      level: "var(--orange)",
    };
    return colors[cat] || "var(--grey)";
  };

  const content = (
    <>
      <div className="group-panel-tabs" style={{ flexWrap: "wrap" }}>
        {CATEGORIES.map((cat, i) => (
          <span key={cat}>
            {i > 0 && (
              <span style={{ color: "#444", margin: "0 0.4rem" }}>|</span>
            )}
            <span
              onClick={() => setCategory(cat)}
              style={{
                cursor: "pointer",
                color: category === cat ? categoryColor(cat) : "#666",
                fontSize: 11,
                textTransform: "capitalize",
              }}
            >
              {category === cat ? `[${cat}]` : cat}
            </span>
          </span>
        ))}
      </div>

      <div
        className="panel-subheader"
        style={{ color: categoryColor(category), textTransform: "capitalize" }}
      >
        {category} Rankings
      </div>

      {entries.length === 0 ? (
        <div className="text-muted">No data available.</div>
      ) : (
        entries.map((e, i) => (
          <div
            key={e.playerId || i}
            className="panel-row"
            style={{
              justifyContent: "space-between",
              fontSize: 11,
              color: e.isCurrentPlayer ? categoryColor(category) : undefined,
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
                <span style={{ fontSize: 9, marginLeft: 4 }}>(you)</span>
              )}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {!e.isCurrentPlayer && (
                <button
                  className={`btn-sm btn-ally ${alliedPlayerIds.includes(e.playerId) ? "btn-ally--active" : ""}`}
                  style={{ fontSize: 8, padding: "1px 4px" }}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    toggleAlliance(e.playerId).then(() => onAllianceChange?.());
                  }}
                >
                  {alliedPlayerIds.includes(e.playerId) ? "ALLIED" : "ALLY"}
                </button>
              )}
              <span style={{ color: categoryColor(category) }}>
                {Number(e.score).toLocaleString()}
              </span>
            </span>
          </div>
        ))
      )}
    </>
  );

  if (bare) return <div className="panel-content">{content}</div>;
  return <div className="panel-content">{content}</div>;
}
