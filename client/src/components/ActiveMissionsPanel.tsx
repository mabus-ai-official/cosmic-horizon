import { useState, useEffect } from "react";
import CollapsiblePanel from "./CollapsiblePanel";
import PixelSprite from "./PixelSprite";
import MissionBoardTab from "./MissionBoardTab";
import StoryMissionsTab from "./StoryMissionsTab";
import DailyMissions from "./DailyMissions";
import {
  getActiveMissions,
  getCompletedMissions,
  getStoryProgress,
  claimMission,
  abandonMission,
} from "../services/api";

interface MissionData {
  missionId: string;
  title: string;
  description?: string;
  type: string;
  progress: Record<string, number>;
  templateObjectives?: Record<string, number>;
  objectivesDetail?: Array<{ label: string; current: number; target: number }>;
  rewardCredits: number;
  claimStatus?: string;
}

interface CompletedMissionData {
  missionId: string;
  title: string;
  type: string;
  rewardCredits: number;
  completedAt: string;
}

interface Props {
  refreshKey?: number;
  atStarMall?: boolean;
  onAction?: () => void;
  onStoryEvent?: (data: any) => void;
  bare?: boolean;
}

type TabView = "story" | "daily" | "active" | "board" | "completed";

function progressSummary(
  type: string,
  progress: Record<string, number>,
): string {
  switch (type) {
    case "visit_sector":
      return `${progress.sectorsVisited || 0} sectors visited`;
    case "trade_units":
      return `${progress.unitsTraded || 0} units traded`;
    case "scan_sectors":
      return `${progress.scansCompleted || 0} scans`;
    case "destroy_ship":
      return `${progress.shipsDestroyed || 0} ships`;
    case "colonize_planet":
      return `${progress.colonistsDeposited || 0} colonists`;
    case "deliver_cargo":
      return `${progress.delivered || 0} delivered`;
    default:
      return JSON.stringify(progress);
  }
}

export default function ActiveMissionsPanel({
  refreshKey,
  atStarMall = false,
  onAction,
  onStoryEvent,
  bare,
}: Props) {
  const [missions, setMissions] = useState<MissionData[]>([]);
  const [completed, setCompleted] = useState<CompletedMissionData[]>([]);
  const [tab, setTab] = useState<TabView>("story");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [localRefresh, setLocalRefresh] = useState(0);
  const [act1Complete, setAct1Complete] = useState<boolean | null>(null);

  const refresh = () => setLocalRefresh((k) => k + 1);

  useEffect(() => {
    getActiveMissions()
      .then(({ data }) => setMissions(data.missions || []))
      .catch(() => setMissions([]));
    getStoryProgress()
      .then(({ data }) => {
        setAct1Complete((data.totalStoryCompleted || 0) >= 10);
      })
      .catch(() => setAct1Complete(null));
  }, [refreshKey, localRefresh]);

  useEffect(() => {
    if (tab === "completed") {
      getCompletedMissions()
        .then(({ data }) => setCompleted(data.missions || []))
        .catch(() => setCompleted([]));
    }
  }, [tab, refreshKey, localRefresh]);

  const handleClaim = async (missionId: string) => {
    setBusy(missionId + "-claim");
    setError("");
    try {
      await claimMission(missionId);
      refresh();
      onAction?.();
    } catch (err: any) {
      setError(err.response?.data?.error || "Claim failed");
    } finally {
      setBusy(null);
    }
  };

  const handleAbandon = async (missionId: string) => {
    setBusy(missionId + "-abandon");
    setError("");
    try {
      await abandonMission(missionId);
      refresh();
      onAction?.();
    } catch (err: any) {
      setError(err.response?.data?.error || "Abandon failed");
    } finally {
      setBusy(null);
    }
  };

  const tabBar = (
    <div className="group-panel-tabs">
      <span
        onClick={() => setTab("story")}
        style={{
          cursor: "pointer",
          color: tab === "story" ? "#d29922" : "#666",
        }}
      >
        {tab === "story" ? "[Story]" : "Story"}
      </span>
      <span style={{ color: "#444", margin: "0 0.5rem" }}>|</span>
      <span
        onClick={() => setTab("daily")}
        style={{
          cursor: "pointer",
          color: tab === "daily" ? "#0f0" : "#666",
        }}
      >
        {tab === "daily" ? "[Daily]" : "Daily"}
      </span>
      <span style={{ color: "#444", margin: "0 0.5rem" }}>|</span>
      <span
        onClick={() => setTab("active")}
        style={{ cursor: "pointer", color: tab === "active" ? "#0f0" : "#666" }}
      >
        {tab === "active" ? "[Active]" : "Active"}
      </span>
      <span style={{ color: "#444", margin: "0 0.5rem" }}>|</span>
      <span
        onClick={() => setTab("board")}
        style={{ cursor: "pointer", color: tab === "board" ? "#0f0" : "#666" }}
      >
        {tab === "board" ? "[Board]" : "Board"}
      </span>
      <span style={{ color: "#444", margin: "0 0.5rem" }}>|</span>
      <span
        onClick={() => setTab("completed")}
        style={{
          cursor: "pointer",
          color: tab === "completed" ? "#0f0" : "#666",
        }}
      >
        {tab === "completed" ? "[Completed]" : "Completed"}
      </span>
    </div>
  );

  const activeContent =
    missions.length === 0 ? (
      <div className="panel-section">
        <div className="text-muted">No active missions</div>
      </div>
    ) : (
      <div className="panel-section panel-section--accent">
        <div className="panel-section__header">Active ({missions.length})</div>
        {error && <div className="mall-error">{error}</div>}
        {missions.map((m) => (
          <div key={m.missionId} className="mission-item">
            <div className="mission-item__title">
              <PixelSprite spriteKey={`mission_${m.type}`} size={12} />
              {m.title}
            </div>
            {m.description && (
              <div className="mission-item__desc">{m.description}</div>
            )}
            <div className="mission-item__progress">
              {progressSummary(m.type, m.progress)}
              <span className="mission-item__reward">
                +{m.rewardCredits} cr
              </span>
            </div>
            <div className="mission-item__actions">
              {m.claimStatus === "pending_claim" && (
                <button
                  className="btn-sm btn-buy"
                  disabled={busy === m.missionId + "-claim"}
                  onClick={() => handleClaim(m.missionId)}
                >
                  {busy === m.missionId + "-claim" ? "..." : "CLAIM REWARD"}
                </button>
              )}
              <button
                className="btn-sm"
                disabled={busy === m.missionId + "-abandon"}
                onClick={() => handleAbandon(m.missionId)}
                style={{ color: "var(--red)", borderColor: "var(--red)" }}
              >
                {busy === m.missionId + "-abandon" ? "..." : "ABANDON"}
              </button>
            </div>
          </div>
        ))}
      </div>
    );

  const completedContent =
    completed.length === 0 ? (
      <div className="panel-section">
        <div className="text-muted">No completed missions.</div>
      </div>
    ) : (
      <div className="panel-section panel-section--special">
        <div className="panel-section__header panel-section__header--special">
          Completed ({completed.length})
        </div>
        {completed.map((m) => (
          <div key={m.missionId} className="mission-item">
            <div className="mission-item__title">{m.title}</div>
            <div className="mission-item__progress">
              <span className="text-muted">
                {new Date(m.completedAt).toLocaleDateString()}
              </span>
              <span className="mission-item__reward">
                +{m.rewardCredits} cr
              </span>
            </div>
          </div>
        ))}
      </div>
    );

  const content = (
    <div className="panel-sections">
      {tabBar}
      {tab === "story" && (
        <StoryMissionsTab
          refreshKey={localRefresh + (refreshKey || 0)}
          onAction={() => {
            refresh();
            onAction?.();
          }}
          onStoryEvent={onStoryEvent}
        />
      )}
      {tab === "daily" && (
        <DailyMissions
          refreshKey={localRefresh + (refreshKey || 0)}
          onClaim={() => {
            refresh();
            onAction?.();
          }}
        />
      )}
      {tab === "active" && activeContent}
      {tab === "board" &&
        (act1Complete === false ? (
          <div className="panel-section panel-section--warning">
            <div className="panel-section__header panel-section__header--warning">
              Locked
            </div>
            <div className="text-muted">
              Complete Act 1 to unlock the mission board.
            </div>
          </div>
        ) : (
          <MissionBoardTab
            atStarMall={atStarMall}
            onAction={() => {
              refresh();
              onAction?.();
            }}
          />
        ))}
      {tab === "completed" && completedContent}
    </div>
  );

  if (bare) return <div className="panel-content">{content}</div>;
  return (
    <CollapsiblePanel title="MISSIONS" badge={missions.length || null}>
      {content}
    </CollapsiblePanel>
  );
}
