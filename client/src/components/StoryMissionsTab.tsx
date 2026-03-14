import { useState, useEffect, useCallback } from "react";
import {
  getStoryProgress,
  getStoryCurrent,
  acceptStoryMission,
  claimStoryMission,
  abandonStoryMission,
} from "../services/api";
import { getNarrationUrl } from "../config/narration-manifest";

const ACT_TITLES: Record<number, string> = {
  1: "Call of Destiny",
  2: "The Rising Storm",
  3: "Quest for Harmony",
  4: "Legacy of the Stars",
};

const ACT_SIZES: Record<number, number> = { 1: 10, 2: 20, 3: 25, 4: 25 };

interface Props {
  refreshKey?: number;
  onAction?: () => void;
  onStoryEvent?: (data: any) => void;
}

export default function StoryMissionsTab({
  refreshKey,
  onAction,
  onStoryEvent,
}: Props) {
  const [progress, setProgress] = useState<any>(null);
  const [current, setCurrent] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [localRefresh, setLocalRefresh] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState("");
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);

  const refresh = useCallback(() => setLocalRefresh((k) => k + 1), []);

  useEffect(() => {
    getStoryProgress()
      .then(({ data }) => setProgress(data))
      .catch(() => setProgress(null));
    getStoryCurrent()
      .then(({ data }) => setCurrent(data))
      .catch(() => setCurrent(null));
  }, [refreshKey, localRefresh]);

  // Cooldown timer
  useEffect(() => {
    if (!progress?.actCooldownUntil) {
      setCooldownRemaining("");
      return;
    }
    const update = () => {
      const remaining =
        new Date(progress.actCooldownUntil).getTime() - Date.now();
      if (remaining <= 0) {
        setCooldownRemaining("");
        refresh();
        return;
      }
      const h = Math.floor(remaining / 3600000);
      const m = Math.floor((remaining % 3600000) / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      setCooldownRemaining(`${h}h ${m}m ${s}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [progress?.actCooldownUntil, refresh]);

  const handleAccept = async () => {
    setBusy(true);
    setError("");
    try {
      const { data } = await acceptStoryMission();
      refresh();
      onAction?.();

      // Fire overlay for mission acceptance
      if (onStoryEvent && data) {
        const storyOrder = data.storyOrder || 0;
        const act = data.act || 1;
        const actTitle = ACT_TITLES[act] || `Act ${act}`;

        const narrationUrl = getNarrationUrl(storyOrder, "accept");

        if (storyOrder === 1) {
          // Very first mission — epic intro
          onStoryEvent({
            type: "journey_begin",
            title: "THE AGARICALIS SAGA",
            subtitle: "Act 1: Call of Destiny",
            body:
              data.loreText ||
              "The stars await, pilot. Your journey through the Cosmic Horizon begins now.",
            narrationUrl,
          });
        } else if (
          storyOrder === 11 ||
          storyOrder === 31 ||
          storyOrder === 56
        ) {
          // First mission of Acts 2, 3, 4
          onStoryEvent({
            type: "act_begin",
            act,
            title: `ACT ${act}`,
            subtitle: actTitle,
            body: data.loreText || `A new chapter unfolds. ${actTitle} begins.`,
            narrationUrl,
          });
        } else {
          // Regular story mission accepted
          onStoryEvent({
            type: "mission_accept",
            title: "QUEST ACCEPTED",
            subtitle: `[${storyOrder}] ${data.title}`,
            body: data.loreText || data.description,
            narrationUrl,
          });
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to accept mission");
    } finally {
      setBusy(false);
    }
  };

  const handleClaim = async (missionId: string) => {
    setBusy(true);
    setError("");
    try {
      await claimStoryMission(missionId);
      refresh();
      onAction?.();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to claim mission");
    } finally {
      setBusy(false);
    }
  };

  const handleAbandon = async (missionId: string) => {
    setBusy(true);
    setError("");
    setShowAbandonConfirm(false);
    try {
      const { data } = await abandonStoryMission(missionId);
      refresh();
      onAction?.();
      if (data.showHints && data.hints?.length) {
        setError(`Hint: ${data.hints[0]}`);
      }
      if (data.difficultyReduced) {
        setError((prev) =>
          prev
            ? `${prev} | Objectives reduced for your next attempt.`
            : "Objectives will be reduced for your next attempt.",
        );
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to abandon mission");
    } finally {
      setBusy(false);
    }
  };

  if (!progress) {
    return <div className="text-muted">Loading story progress...</div>;
  }

  const act = progress.currentAct || 1;
  const actTitle = ACT_TITLES[act] || `Act ${act}`;
  const actSize = ACT_SIZES[act] || 10;
  const actProgress = progress.missionsCompletedInAct || 0;
  const totalCompleted = progress.totalStoryCompleted || 0;

  return (
    <div className="story-missions-tab">
      {/* Act Header */}
      <div className="story-act-header">
        <div className="story-act-title">
          ACT {act}: {actTitle}
        </div>
        <div className="story-act-progress-row">
          <span className="story-act-count">
            {actProgress}/{actSize}
          </span>
          <div className="story-progress-bar">
            <div
              className="story-progress-fill"
              style={{ width: `${(actProgress / actSize) * 100}%` }}
            />
          </div>
        </div>
        <div className="text-muted" style={{ fontSize: "0.75em" }}>
          Total story progress: {totalCompleted}/80
        </div>
      </div>

      {error && <div className="story-error">{error}</div>}

      {/* Cooldown */}
      {cooldownRemaining && (
        <div className="story-cooldown">
          <div className="story-cooldown-title">NEXT ACT UNLOCKS IN</div>
          <div className="story-cooldown-timer">{cooldownRemaining}</div>
          <div
            className="text-muted"
            style={{ fontSize: "0.75em", marginTop: "0.25rem" }}
          >
            While you wait: explore new sectors, tend your colonies, trade at
            outposts...
          </div>
        </div>
      )}

      {/* Active Mission */}
      {current?.active && current.mission && (
        <div className="story-mission-card">
          <div className="story-mission-title">
            [{current.mission.storyOrder}] {current.mission.title}
          </div>
          {current.mission.loreText && (
            <div className="story-lore-text">{current.mission.loreText}</div>
          )}
          <div className="story-mission-desc">
            {current.mission.description}
          </div>

          {/* Objectives */}
          {current.mission.objectivesDetail?.map((obj: any, i: number) => (
            <div key={i} className="story-objective">
              <div className="story-objective-label">
                {obj.complete ? "[x]" : "[ ]"} {obj.description}
              </div>
              <div className="story-progress-bar" style={{ height: "4px" }}>
                <div
                  className="story-progress-fill"
                  style={{
                    width: `${Math.min(100, (obj.current / obj.target) * 100)}%`,
                    background: obj.complete ? "var(--green)" : "var(--yellow)",
                  }}
                />
              </div>
              <div className="text-muted" style={{ fontSize: "0.7em" }}>
                {obj.current}/{obj.target}
              </div>
            </div>
          ))}

          {/* NPC Locations for combat missions */}
          {current.mission.npcLocations?.length > 0 && (
            <div
              className="story-npc-locations"
              style={{
                fontSize: "0.75em",
                color: "var(--orange)",
                marginTop: 4,
              }}
            >
              {(() => {
                const sectors = [
                  ...new Set(
                    current.mission.npcLocations.map((n: any) => n.sectorId),
                  ),
                ];
                const remaining = current.mission.npcLocations.length;
                return remaining > 0
                  ? `${remaining} hostile${remaining > 1 ? "s" : ""} remaining in Sector${sectors.length > 1 ? "s" : ""} ${sectors.join(", ")}`
                  : null;
              })()}
            </div>
          )}

          {/* Rewards */}
          <div className="story-rewards">
            +{current.mission.rewardCredits} cr | +{current.mission.rewardXp} XP
          </div>

          {/* Hints */}
          {current.mission.showHints && current.mission.hints?.length > 0 && (
            <div className="story-hints">
              {current.mission.hints.map((h: string, i: number) => (
                <div key={i} className="story-hint">
                  Hint: {h}
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="story-actions">
            {current.mission.claimStatus === "pending_claim" && (
              <button
                className="btn-sm btn-buy"
                disabled={busy}
                onClick={() => handleClaim(current.mission.missionId)}
              >
                {busy ? "..." : "CLAIM REWARD"}
              </button>
            )}
            {current.mission.status === "active" && (
              <>
                {showAbandonConfirm ? (
                  <div className="story-abandon-confirm">
                    <span className="text-muted">Abandon this quest?</span>
                    <button
                      className="btn-sm"
                      style={{ color: "var(--red)", borderColor: "var(--red)" }}
                      disabled={busy}
                      onClick={() => handleAbandon(current.mission.missionId)}
                    >
                      YES
                    </button>
                    <button
                      className="btn-sm"
                      onClick={() => setShowAbandonConfirm(false)}
                    >
                      NO
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn-sm"
                    style={{ color: "var(--red)", borderColor: "var(--red)" }}
                    onClick={() => setShowAbandonConfirm(true)}
                  >
                    ABANDON
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Next Mission (available to accept) */}
      {!current?.active && current?.next && !cooldownRemaining && (
        <div className="story-mission-card story-mission-next">
          <div className="story-mission-title">
            [{current.next.storyOrder}] {current.next.title}
          </div>
          <div className="story-mission-desc">{current.next.description}</div>
          <div className="story-rewards">
            +{current.next.rewardCredits} cr | +{current.next.rewardXp} XP
          </div>
          <div className="story-actions">
            <button
              className="btn-sm btn-buy"
              disabled={busy}
              onClick={handleAccept}
            >
              {busy ? "..." : "ACCEPT QUEST"}
            </button>
          </div>
        </div>
      )}

      {/* All done */}
      {!current?.active &&
        !current?.next &&
        !cooldownRemaining &&
        totalCompleted >= 80 && (
          <div
            className="text-muted"
            style={{ textAlign: "center", padding: "1rem" }}
          >
            You have completed the Agaricalis Saga. Your legacy echoes across
            the stars.
          </div>
        )}
    </div>
  );
}
