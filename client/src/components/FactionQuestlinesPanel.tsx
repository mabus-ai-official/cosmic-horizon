import { useState, useEffect } from "react";
import CollapsiblePanel from "./CollapsiblePanel";
import {
  getFactionQuestlines,
  getFactionMissionCurrent,
  acceptFactionMission,
  claimFactionMission,
  abandonFactionMission,
} from "../services/api";

interface QuestlineMission {
  templateId: string;
  title: string;
  description: string;
  questlineOrder: number;
  rewardCredits: number;
  rewardXp: number;
  hasPhases: boolean;
  completed: boolean;
  active: boolean;
  locked: boolean;
}

interface Questline {
  questline: string;
  missions: QuestlineMission[];
  completedCount: number;
  totalCount: number;
  nextAvailable: {
    templateId: string;
    title: string;
    questlineOrder: number;
  } | null;
  isActive: boolean;
}

interface ActiveMission {
  missionId: string;
  templateId: string;
  title: string;
  description: string;
  type: string;
  questline: string;
  questlineOrder: number;
  status: string;
  claimStatus: string;
  rewardCredits: number;
  rewardXp: number;
  objectivesDetail: any[];
  phaseInfo: any | null;
}

const QUESTLINE_NAMES: Record<string, string> = {
  mycorrhizal_network: "Mycorrhizal Network",
  iron_dominion: "Iron Dominion",
  traders_guild: "Traders Guild",
  shadow_syndicate: "Shadow Syndicate",
  independent: "Independent",
};

const QUESTLINE_ICONS: Record<string, string> = {
  mycorrhizal_network: "🍄",
  iron_dominion: "⚔️",
  traders_guild: "💰",
  shadow_syndicate: "🗡️",
  independent: "🌟",
};

const QUESTLINE_COLORS: Record<string, string> = {
  mycorrhizal_network: "#3fb950",
  iron_dominion: "#f85149",
  traders_guild: "#f0883e",
  shadow_syndicate: "#8b5cf6",
  independent: "#58a6ff",
};

interface Props {
  refreshKey?: number;
  onAction?: () => void;
  bare?: boolean;
}

export default function FactionQuestlinesPanel({
  refreshKey,
  onAction,
  bare,
}: Props) {
  const [questlines, setQuestlines] = useState<Questline[]>([]);
  const [activeMission, setActiveMission] = useState<ActiveMission | null>(
    null,
  );
  const [expandedQuestline, setExpandedQuestline] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([getFactionQuestlines(), getFactionMissionCurrent()])
      .then(([qlRes, curRes]) => {
        setQuestlines(qlRes.data.questlines || []);
        if (curRes.data.active) {
          setActiveMission(curRes.data.mission);
        } else {
          setActiveMission(null);
        }
      })
      .catch(() => setError("Failed to load faction questlines"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [refreshKey]);

  const handleAccept = async (templateId: string) => {
    try {
      await acceptFactionMission(templateId);
      loadData();
      onAction?.();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to accept mission");
    }
  };

  const handleClaim = async (missionId: string) => {
    try {
      await claimFactionMission(missionId);
      loadData();
      onAction?.();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to claim mission");
    }
  };

  const handleAbandon = async (missionId: string) => {
    try {
      await abandonFactionMission(missionId);
      loadData();
      onAction?.();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to abandon mission");
    }
  };

  const content = (
    <div className="panel-sections">
      {/* Active faction mission */}
      {activeMission && (
        <div className="panel-section panel-section--special">
          <div
            className="panel-section__header panel-section__header--special"
            style={{
              borderLeft: `3px solid ${QUESTLINE_COLORS[activeMission.questline] || "#58a6ff"}`,
            }}
          >
            {QUESTLINE_ICONS[activeMission.questline] || "📜"} Active:{" "}
            {activeMission.title}
          </div>
          <div style={{ padding: "8px 12px" }}>
            <div
              style={{
                color: "#8b949e",
                fontSize: "12px",
                marginBottom: "6px",
              }}
            >
              {QUESTLINE_NAMES[activeMission.questline] ||
                activeMission.questline}{" "}
              — Mission {activeMission.questlineOrder}
            </div>
            <div
              style={{
                color: "#c9d1d9",
                fontSize: "12px",
                marginBottom: "8px",
              }}
            >
              {activeMission.description}
            </div>

            {/* Phase tracker */}
            {activeMission.phaseInfo && (
              <div style={{ marginBottom: "8px" }}>
                <div
                  style={{
                    display: "flex",
                    gap: "4px",
                    marginBottom: "4px",
                  }}
                >
                  {activeMission.phaseInfo.phases.map((p: any) => (
                    <div
                      key={p.order}
                      style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "11px",
                        fontWeight: "bold",
                        background: p.completed
                          ? "#238636"
                          : p.current
                            ? "#1f6feb"
                            : "#21262d",
                        color: p.completed || p.current ? "#fff" : "#484f58",
                        border: p.current
                          ? "2px solid #58a6ff"
                          : "1px solid #30363d",
                      }}
                    >
                      {p.completed ? "✓" : p.order}
                    </div>
                  ))}
                </div>
                {activeMission.phaseInfo.currentPhaseTitle && (
                  <div style={{ color: "#58a6ff", fontSize: "11px" }}>
                    Phase {activeMission.phaseInfo.currentPhase}:{" "}
                    {activeMission.phaseInfo.currentPhaseTitle}
                  </div>
                )}
              </div>
            )}

            {/* Objectives */}
            {activeMission.objectivesDetail?.length > 0 && (
              <div style={{ marginBottom: "8px" }}>
                {activeMission.objectivesDetail.map((obj: any, i: number) => (
                  <div
                    key={i}
                    style={{
                      fontSize: "11px",
                      color: obj.completed ? "#238636" : "#8b949e",
                      padding: "2px 0",
                    }}
                  >
                    {obj.completed ? "✓" : "○"} {obj.description}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: "6px" }}>
              {activeMission.status === "completed" &&
                activeMission.claimStatus === "pending_claim" && (
                  <button
                    className="btn btn--primary btn--sm"
                    onClick={() => handleClaim(activeMission.missionId)}
                  >
                    Claim Rewards
                  </button>
                )}
              {activeMission.status === "active" && (
                <button
                  className="btn btn--danger btn--sm"
                  onClick={() => handleAbandon(activeMission.missionId)}
                >
                  Abandon
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: "8px 12px",
            color: "#f85149",
            fontSize: "12px",
          }}
        >
          {error}
        </div>
      )}

      {loading && !questlines.length && (
        <div style={{ padding: "16px", color: "#8b949e", textAlign: "center" }}>
          Loading questlines...
        </div>
      )}

      {/* Questline list */}
      {questlines.map((ql) => {
        const isExpanded = expandedQuestline === ql.questline;
        const color = QUESTLINE_COLORS[ql.questline] || "#58a6ff";
        const icon = QUESTLINE_ICONS[ql.questline] || "📜";
        const name = QUESTLINE_NAMES[ql.questline] || ql.questline;
        const progressPct =
          ql.totalCount > 0
            ? Math.round((ql.completedCount / ql.totalCount) * 100)
            : 0;

        return (
          <div key={ql.questline} className="panel-section">
            <div
              className="panel-section__header"
              style={{
                cursor: "pointer",
                borderLeft: `3px solid ${color}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
              onClick={() =>
                setExpandedQuestline(isExpanded ? null : ql.questline)
              }
            >
              <span>
                {icon} {name}
              </span>
              <span style={{ fontSize: "11px", color: "#8b949e" }}>
                {ql.completedCount}/{ql.totalCount} {isExpanded ? "▲" : "▼"}
              </span>
            </div>

            {isExpanded && (
              <div style={{ padding: "4px 0" }}>
                {/* Progress bar */}
                <div
                  style={{
                    margin: "4px 12px 8px",
                    height: "4px",
                    background: "#21262d",
                    borderRadius: "2px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${progressPct}%`,
                      height: "100%",
                      background: color,
                      borderRadius: "2px",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>

                {ql.missions.map((m) => (
                  <div
                    key={m.templateId}
                    style={{
                      padding: "6px 12px",
                      borderBottom: "1px solid #21262d",
                      opacity: m.locked && !m.active ? 0.5 : 1,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <span
                          style={{
                            fontSize: "12px",
                            color: m.completed
                              ? "#238636"
                              : m.active
                                ? "#58a6ff"
                                : "#c9d1d9",
                            fontWeight: m.active ? "bold" : "normal",
                          }}
                        >
                          {m.completed ? "✓ " : m.active ? "► " : ""}
                          {m.questlineOrder}. {m.title}
                        </span>
                        {m.hasPhases && (
                          <span
                            style={{
                              fontSize: "10px",
                              color: "#484f58",
                              marginLeft: "6px",
                            }}
                          >
                            [multi-phase]
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "10px", color: "#484f58" }}>
                        {m.rewardCredits > 0 && `${m.rewardCredits}cr `}
                        {m.rewardXp > 0 && `${m.rewardXp}xp`}
                      </div>
                    </div>
                    {!m.locked && !m.completed && !m.active && (
                      <div style={{ marginTop: "4px" }}>
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#8b949e",
                            marginBottom: "4px",
                          }}
                        >
                          {m.description}
                        </div>
                        {!activeMission && (
                          <button
                            className="btn btn--primary btn--sm"
                            onClick={() => handleAccept(m.templateId)}
                          >
                            Accept
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {!loading && questlines.length === 0 && (
        <div style={{ padding: "16px", color: "#8b949e", textAlign: "center" }}>
          No faction questlines available yet. Increase your reputation with
          factions to unlock their questlines.
        </div>
      )}
    </div>
  );

  if (bare) return content;
  return (
    <CollapsiblePanel title="FACTION QUESTLINES" defaultOpen>
      {content}
    </CollapsiblePanel>
  );
}
