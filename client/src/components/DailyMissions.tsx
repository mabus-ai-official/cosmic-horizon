import { useState, useEffect, useCallback } from "react";
import { getDailyMissions, claimDailyMission } from "../services/api";

interface DailyMission {
  id: string;
  type: string;
  description: string;
  target: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
  xpReward: number;
  creditReward: number;
}

interface DailyMissionsProps {
  refreshKey?: number;
  onClaim?: () => void;
}

export default function DailyMissions({
  refreshKey,
  onClaim,
}: DailyMissionsProps) {
  const [missions, setMissions] = useState<DailyMission[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    getDailyMissions()
      .then(({ data }) => setMissions(data.missions || []))
      .catch(() => setMissions([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, refreshKey]);

  const handleClaim = async (id: string) => {
    try {
      await claimDailyMission(id);
      refresh();
      onClaim?.();
    } catch {
      /* silent */
    }
  };

  if (loading) return <div className="daily-missions">Loading...</div>;
  if (missions.length === 0) return null;

  const allClaimed = missions.every((m) => m.claimed);

  return (
    <div className="daily-missions">
      <div className="daily-missions__header">
        DAILY MISSIONS
        {allClaimed && <span className="daily-missions__done">COMPLETE</span>}
      </div>
      {missions.map((m) => {
        const pct = Math.min(100, Math.round((m.progress / m.target) * 100));
        return (
          <div
            key={m.id}
            className={`daily-mission${m.claimed ? " daily-mission--claimed" : ""}`}
          >
            <div className="daily-mission__info">
              <span className="daily-mission__desc">{m.description}</span>
              <span className="daily-mission__reward">
                +{m.xpReward} XP, +{m.creditReward} cr
              </span>
            </div>
            <div className="daily-mission__bar-row">
              <div className="ctx-bar" style={{ flex: 1 }}>
                <div
                  className={`ctx-bar__fill ${m.completed ? "ctx-bar__fill--xp" : "ctx-bar__fill--energy"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="daily-mission__progress">
                {m.progress}/{m.target}
              </span>
            </div>
            {m.completed && !m.claimed && (
              <button
                className="daily-mission__claim"
                onClick={() => handleClaim(m.id)}
              >
                CLAIM
              </button>
            )}
            {m.claimed && (
              <span className="daily-mission__claimed-tag">CLAIMED</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
