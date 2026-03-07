import { useEffect, useState, useRef } from "react";
import { getDailyMissions } from "../services/api";

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

interface DailyMissionsOverlayProps {
  onOpenMissions: () => void;
  onToastReminder?: (message: string) => void;
}

const STORAGE_KEY = "coho_daily_missions_date";

const REMINDER_LINES = [
  "Your daily orders are standing by, Commander.",
  "Unclaimed missions expire at midnight UTC. Don't leave credits on the table.",
  "The galaxy doesn't wait — daily objectives await your attention.",
  "Incoming transmission: daily missions ready for review, pilot.",
  "Fuel up, suit up — daily missions won't complete themselves.",
  "HQ reminds you: outstanding daily missions remain unclaimed.",
];

function getTodayKey() {
  return new Date().toISOString().slice(0, 10); // "2026-03-07"
}

export default function DailyMissionsOverlay({
  onOpenMissions,
  onToastReminder,
}: DailyMissionsOverlayProps) {
  const [show, setShow] = useState(false);
  const [missions, setMissions] = useState<DailyMission[]>([]);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    const today = getTodayKey();
    const lastShown = localStorage.getItem(STORAGE_KEY);
    const alreadyShownToday = lastShown === today;

    getDailyMissions()
      .then(({ data }) => {
        const m: DailyMission[] = data.missions || [];
        const hasUnclaimed = m.some((mi) => !mi.claimed);
        if (m.length === 0 || !hasUnclaimed) return;

        if (!alreadyShownToday) {
          // First visit today — show full overlay
          setMissions(m);
          setShow(true);
          localStorage.setItem(STORAGE_KEY, today);
        } else {
          // Already shown today — show a toast reminder
          const line =
            REMINDER_LINES[Math.floor(Math.random() * REMINDER_LINES.length)];
          onToastReminder?.(line);
        }
      })
      .catch(() => {});
  }, [onToastReminder]);

  const handleDismiss = () => setShow(false);

  const handleViewMissions = () => {
    setShow(false);
    onOpenMissions();
  };

  if (!show || missions.length === 0) return null;

  const completed = missions.filter((m) => m.completed && !m.claimed).length;
  const totalXp = missions.reduce((s, m) => s + m.xpReward, 0);
  const totalCredits = missions.reduce((s, m) => s + m.creditReward, 0);

  return (
    <div className="daily-overlay" onClick={handleDismiss}>
      <div
        className="daily-overlay__content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="daily-overlay__burst" />
        <div className="daily-overlay__title">DAILY MISSIONS</div>
        <div className="daily-overlay__subtitle">
          {completed > 0
            ? `${completed} ready to claim!`
            : "New objectives available"}
        </div>

        <div className="daily-overlay__list">
          {missions.map((m) => {
            const pct = Math.min(
              100,
              Math.round((m.progress / m.target) * 100),
            );
            return (
              <div
                key={m.id}
                className={`daily-overlay__mission${m.claimed ? " daily-overlay__mission--claimed" : m.completed ? " daily-overlay__mission--complete" : ""}`}
              >
                <div className="daily-overlay__mission-desc">
                  {m.claimed ? "\u2713 " : m.completed ? "\u2605 " : ""}
                  {m.description}
                </div>
                <div className="daily-overlay__mission-bar">
                  <div
                    className="daily-overlay__mission-fill"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="daily-overlay__mission-meta">
                  <span>
                    {m.progress}/{m.target}
                  </span>
                  <span>
                    +{m.xpReward} XP, +{m.creditReward} cr
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="daily-overlay__totals">
          Total: +{totalXp} XP, +{totalCredits} cr
        </div>

        <button className="daily-overlay__btn" onClick={handleViewMissions}>
          VIEW MISSIONS [I]
        </button>
        <div className="daily-overlay__hint">Click anywhere to dismiss</div>
      </div>
    </div>
  );
}
