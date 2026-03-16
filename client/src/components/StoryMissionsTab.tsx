import { useState, useEffect, useCallback } from "react";
import {
  getStoryProgress,
  getStoryCurrent,
  acceptStoryMission,
  claimStoryMission,
  abandonStoryMission,
  submitStoryChoice,
} from "../services/api";
import {
  getNarrationUrl,
  CLAIM_TEXTS,
  getChoiceNarrationUrl,
} from "../config/narration-manifest";

const CHAPTER_TITLES: Record<number, string> = {
  1: "Call of Destiny",
  2: "The Vedic Enigma",
  3: "The Calvatian Odyssey",
  4: "The Shadow of War",
  5: "The Quest for Harmony",
  6: "Unveiling the Shadows",
  7: "A New Dawn",
  8: "Legacy of the Stars",
};

const CHAPTER_SIZES: Record<number, number> = {
  1: 8,
  2: 8,
  3: 8,
  4: 7,
  5: 8,
  6: 7,
  7: 7,
  8: 7,
};

const TOTAL_STORY_MISSIONS = 60;

// Compute first story_order of each chapter for overlay detection
const CHAPTER_START_ORDERS: Record<number, number> = {};
let _startOrder = 1;
for (let c = 1; c <= 8; c++) {
  CHAPTER_START_ORDERS[c] = _startOrder;
  _startOrder += CHAPTER_SIZES[c] || 0;
}

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
        const chapter = data.chapter || data.act || 1;
        const chapterTitle = CHAPTER_TITLES[chapter] || `Chapter ${chapter}`;

        const narrationUrl = getNarrationUrl(storyOrder, "accept");

        if (storyOrder === 1) {
          // Very first mission — epic intro
          onStoryEvent({
            type: "journey_begin",
            title: "THE AGARICALIS SAGA",
            subtitle: `Chapter 1: ${chapterTitle}`,
            body:
              data.loreText ||
              "The stars await, pilot. Your journey through the Cosmic Horizon begins now.",
            narrationUrl,
          });
        } else if (
          chapter > 1 &&
          storyOrder === CHAPTER_START_ORDERS[chapter]
        ) {
          // First mission of a new chapter
          onStoryEvent({
            type: "act_begin",
            act: chapter,
            title: `CHAPTER ${chapter}`,
            subtitle: chapterTitle,
            body:
              data.loreText || `A new chapter unfolds. ${chapterTitle} begins.`,
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
    // Capture mission info before the API call refreshes state
    const storyOrder = current?.mission?.storyOrder || 0;
    const missionTitle = current?.mission?.title || "";
    setBusy(true);
    setError("");
    try {
      const { data } = await claimStoryMission(missionId);
      refresh();
      onAction?.();

      // Fire narrated claim overlay (Act 1 missions get narration audio)
      if (onStoryEvent) {
        const narrationUrl = getNarrationUrl(storyOrder, "claim") ?? undefined;
        onStoryEvent({
          type: "mission_complete",
          title: "REWARD CLAIMED",
          subtitle: missionTitle,
          body:
            CLAIM_TEXTS[storyOrder] ||
            `+${data.creditsAwarded} cr  +${data.xpAwarded} XP`,
          narrationUrl,
        });

        // Enqueue codex overlay from HTTP response (avoids socket race condition)
        if (data.codex) {
          onStoryEvent({
            type: "lore_reveal",
            title: "CODEX ENTRY UNLOCKED",
            subtitle: data.codex.title,
            body: data.codex.content,
            narrationUrl:
              getNarrationUrl(data.codex.storyOrder, "codex") ?? undefined,
          });
        }
      }
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

  const chapter = progress.currentChapter || progress.currentAct || 1;
  const chapterTitle = CHAPTER_TITLES[chapter] || `Chapter ${chapter}`;
  const chapterSize = CHAPTER_SIZES[chapter] || 8;
  const chapterProgress =
    progress.missionsCompletedInChapter || progress.missionsCompletedInAct || 0;
  const totalCompleted = progress.totalStoryCompleted || 0;

  return (
    <div className="story-missions-tab">
      {/* Chapter Header */}
      <div className="story-act-header">
        <div className="story-act-title">
          CHAPTER {chapter}: {chapterTitle}
        </div>
        <div className="story-act-progress-row">
          <span className="story-act-count">
            {chapterProgress}/{chapterSize}
          </span>
          <div className="story-progress-bar">
            <div
              className="story-progress-fill"
              style={{ width: `${(chapterProgress / chapterSize) * 100}%` }}
            />
          </div>
        </div>
        <div className="text-muted" style={{ fontSize: "0.75em" }}>
          Total story progress: {totalCompleted}/{TOTAL_STORY_MISSIONS}
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

          {/* Phase Progress (multi-phase missions) */}
          {current.mission.phaseInfo && (
            <div className="story-phase-tracker" style={{ margin: "0.5rem 0" }}>
              <div
                style={{
                  fontSize: "0.8em",
                  color: "var(--cyan)",
                  marginBottom: "0.25rem",
                }}
              >
                Phase {current.mission.phaseInfo.currentPhase}/
                {current.mission.phaseInfo.totalPhases}
                {current.mission.phaseInfo.currentPhaseTitle && (
                  <span style={{ color: "var(--text)" }}>
                    {" "}
                    — {current.mission.phaseInfo.currentPhaseTitle}
                  </span>
                )}
              </div>
              <div
                className="story-progress-bar"
                style={{ height: "3px", marginBottom: "0.25rem" }}
              >
                <div
                  className="story-progress-fill"
                  style={{
                    width: `${((current.mission.phaseInfo.currentPhase - 1) / current.mission.phaseInfo.totalPhases) * 100}%`,
                    background: "var(--cyan)",
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: "4px", fontSize: "0.7em" }}>
                {current.mission.phaseInfo.phases?.map((p: any) => (
                  <span
                    key={p.order}
                    style={{
                      padding: "1px 6px",
                      borderRadius: "2px",
                      background: p.completed
                        ? "var(--green)"
                        : p.current
                          ? "var(--cyan)"
                          : "var(--bg-light)",
                      color:
                        p.completed || p.current
                          ? "var(--bg)"
                          : "var(--text-muted)",
                      fontWeight: p.current ? "bold" : "normal",
                    }}
                  >
                    {p.order}
                  </span>
                ))}
              </div>
              {current.mission.phaseInfo.currentPhaseDescription && (
                <div
                  style={{
                    fontSize: "0.75em",
                    color: "var(--text-muted)",
                    marginTop: "0.25rem",
                  }}
                >
                  {current.mission.phaseInfo.currentPhaseDescription}
                </div>
              )}
            </div>
          )}

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

          {/* Pending Choice */}
          {current.mission.pendingChoice && (
            <div
              style={{
                background: "rgba(86, 212, 221, 0.08)",
                border: "1px solid rgba(86, 212, 221, 0.3)",
                borderRadius: 6,
                padding: "8px 10px",
                marginTop: 6,
              }}
            >
              <div
                style={{
                  fontSize: "0.8em",
                  fontWeight: 700,
                  color: "var(--cyan)",
                  marginBottom: 4,
                }}
              >
                {current.mission.pendingChoice.title}
              </div>
              <div
                style={{
                  fontSize: "0.72em",
                  color: "var(--text-secondary)",
                  marginBottom: 6,
                }}
              >
                {current.mission.pendingChoice.body}
              </div>
              {current.mission.pendingChoice.options.map(
                (opt: { id: string; label: string; description: string }) => (
                  <button
                    key={opt.id}
                    className="btn-sm"
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      marginBottom: 4,
                      borderColor: "var(--cyan)",
                      color: "var(--cyan)",
                      fontSize: "0.72em",
                      padding: "6px 8px",
                    }}
                    disabled={busy}
                    onClick={() => {
                      const pc = current.mission.pendingChoice;
                      if (onStoryEvent) {
                        onStoryEvent({
                          type: "mission_choice",
                          title: pc.isPermanent ? "TURNING POINT" : "DECISION",
                          subtitle: pc.title,
                          body: pc.body,
                          narrationUrl:
                            getChoiceNarrationUrl(pc.choiceKey) || undefined,
                          colorScheme: "cyan",
                          isPermanent: pc.isPermanent,
                          actions: pc.options.map(
                            (o: { id: string; label: string }) => ({
                              id: `choice:${current.mission.missionId}:${pc.choiceId}:${o.id}`,
                              label: o.label,
                              variant: "primary",
                            }),
                          ),
                          onAction: (actionId: string) => {
                            const parts = actionId.split(":");
                            if (parts[0] === "choice" && parts.length === 4) {
                              const [, missionId, choiceId, optionId] = parts;
                              submitStoryChoice(missionId, choiceId, optionId)
                                .then(() => refresh())
                                .catch(() => {});
                            }
                          },
                        });
                      }
                    }}
                  >
                    <strong>{opt.label}</strong>
                    {opt.description && (
                      <span style={{ opacity: 0.7 }}> — {opt.description}</span>
                    )}
                  </button>
                ),
              )}
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
            {(current.mission.status === "active" ||
              current.mission.status === "awaiting_choice") && (
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
        totalCompleted >= TOTAL_STORY_MISSIONS && (
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
