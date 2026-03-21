/**
 * CombatV2Modal — Full-screen FTL-style combat UI.
 *
 * Renders: header (round + timer), enemy display, power distribution sliders,
 * subsystem targeting, weapon bay, action bar, round log.
 */

import { useState, useEffect, useCallback } from "react";
import { useCombatV2, type SubsystemType } from "../hooks/useCombatV2";
import type { CommMessage } from "./CommScreen";
import "../styles/combat-v2.css";

interface Props {
  playerId: string;
  playerName: string;
  on: (event: string, handler: (...args: any[]) => void) => () => void;
  onClose: () => void;
  onCommMessage?: (msg: CommMessage) => void;
}

const SUBSYSTEM_LABELS: Record<SubsystemType, string> = {
  shields: "SHD",
  weapons: "WPN",
  engines: "ENG",
  sensors: "SNS",
  life_support: "LSP",
};

const SUBSYSTEM_FULL: Record<SubsystemType, string> = {
  shields: "Shields",
  weapons: "Weapons",
  engines: "Engines",
  sensors: "Sensors",
  life_support: "Life Sup.",
};

const POWER_SYSTEMS: {
  key: "shields" | "weapons" | "engines" | "sensors";
  label: string;
}[] = [
  { key: "shields", label: "Shields" },
  { key: "weapons", label: "Weapons" },
  { key: "engines", label: "Engines" },
  { key: "sensors", label: "Sensors" },
];

function hullColor(hp: number, max: number): string {
  const pct = max > 0 ? hp / max : 0;
  if (pct > 0.6) return "healthy";
  if (pct > 0.25) return "damaged";
  return "critical";
}

function subBarColor(hp: number, max: number): string {
  if (max === 0) return "var(--text-secondary)";
  const pct = hp / max;
  if (pct > 0.6) return "var(--green)";
  if (pct > 0.25) return "var(--yellow)";
  return "var(--red)";
}

export default function CombatV2Modal({
  playerId,
  playerName,
  on,
  onClose,
  onCommMessage,
}: Props) {
  const combat = useCombatV2({ playerId, on });
  const [battlePhase, setBattlePhase] = useState<
    "idle" | "firing" | "hit" | "done"
  >("idle");
  const [lastRoundDmg, setLastRoundDmg] = useState({
    yourDmg: 0,
    theirDmg: 0,
    yourHits: 0,
  });
  const [showResult, setShowResult] = useState(false);

  // Check for existing combat on mount
  useEffect(() => {
    combat.checkExistingCombat();
  }, []);

  // When a round resolves: play battle animation, send log to comm link
  useEffect(() => {
    if (combat.roundLog.length > 0) {
      const latest = combat.roundLog[combat.roundLog.length - 1];
      const r = latest.resolution;
      if (!r) return;

      const yourSide = r.playerA?.playerId === playerId ? r.playerA : r.playerB;
      const theirSide =
        r.playerA?.playerId === playerId ? r.playerB : r.playerA;
      const yourHits =
        yourSide?.weaponResults?.filter((w: any) => w.hit).length ?? 0;
      const yourDmg = yourSide?.totalDamage ?? 0;
      const theirDmg = theirSide?.totalDamage ?? 0;

      setLastRoundDmg({ yourDmg, theirDmg, yourHits });

      // Animated sequence: firing → hit → done
      setBattlePhase("firing");
      setTimeout(() => {
        setBattlePhase("hit");
        setTimeout(() => {
          setBattlePhase("done");

          if (onCommMessage) {
            onCommMessage({
              id: Date.now(),
              sender: "COMBAT",
              text:
                yourHits > 0
                  ? `Round ${latest.roundNumber}: ${yourHits} hits for ${yourDmg} damage. Took ${theirDmg} damage.`
                  : `Round ${latest.roundNumber}: All shots missed! Took ${theirDmg} damage.`,
              duration: 8000,
            });
          }

          if (combat.combatResult) {
            setTimeout(() => setShowResult(true), 800);
          }
          setTimeout(() => setBattlePhase("idle"), 1500);
        }, 1200);
      }, 800);
    }
  }, [combat.roundLog.length]);

  // If combat ends without animation (reconnect, surrender), show result immediately
  useEffect(() => {
    if (combat.combatResult && battlePhase === "idle") {
      setShowResult(true);
    }
  }, [combat.combatResult, battlePhase]);

  // ESC handler — only close if combat is over
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && combat.combatResult) {
        onClose();
      }
    },
    [combat.combatResult, onClose],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // If not in combat and no result, don't render
  if (!combat.inCombat && !combat.combatResult) return null;

  const opponent = combat.opponentState;
  const player = combat.playerState;
  const isVictory = combat.combatResult?.winnerId === playerId;
  const isDefeat =
    combat.combatResult?.destroyedPlayerId === playerId ||
    combat.combatResult?.capturedPlayerId === playerId;
  const isFled = combat.combatResult?.fledPlayerId === playerId;

  return (
    <div className="combat-v2-backdrop">
      <div className="combat-v2-modal" style={{ position: "relative" }}>
        {/* Header */}
        <div className="combat-v2-header">
          <div className="combat-v2-header-title">
            Combat — Round {combat.roundNumber}
            {combat.hazard && (
              <span
                style={{
                  marginLeft: "8px",
                  fontSize: "11px",
                  color: "var(--yellow)",
                }}
              >
                [
                {combat.hazard === "asteroid_field"
                  ? "Asteroid Field"
                  : combat.hazard === "nebula"
                    ? "Nebula"
                    : "Solar Flare"}
                ]
              </span>
            )}
          </div>
          <div className="combat-v2-status">
            {combat.submitted && (
              <span className="combat-v2-badge submitted">Orders Locked</span>
            )}
            {combat.opponentReady && (
              <span className="combat-v2-badge submitted">Enemy Ready</span>
            )}
            {!combat.submitted && !combat.combatResult && (
              <span className="combat-v2-badge waiting">Awaiting Orders</span>
            )}
          </div>
          <div
            className={`combat-v2-timer ${combat.countdown <= 10 ? "urgent" : "normal"}`}
          >
            {combat.countdown}s
          </div>
        </div>

        {/* Battle Scene Animation */}
        {battlePhase !== "idle" && (
          <div className={`combat-v2-battle-scene phase-${battlePhase}`}>
            {/* Starfield background */}
            <div className="battle-stars" />

            {/* Player ship (left) */}
            <div className="battle-ship battle-ship--player">
              <div className="battle-ship-body">&#9654;</div>
              {battlePhase === "firing" && (
                <>
                  <div className="battle-laser battle-laser--1" />
                  <div className="battle-laser battle-laser--2" />
                  {lastRoundDmg.yourHits > 2 && (
                    <div className="battle-laser battle-laser--3" />
                  )}
                </>
              )}
            </div>

            {/* Enemy ship (right) */}
            <div
              className={`battle-ship battle-ship--enemy ${battlePhase === "hit" ? "battle-hit" : ""}`}
            >
              <div className="battle-ship-body">&#9664;</div>
              {battlePhase === "hit" && (
                <>
                  <div className="battle-explosion" />
                  <div className="battle-sparks" />
                </>
              )}
              {battlePhase === "firing" && (
                <div className="battle-laser battle-laser--enemy" />
              )}
            </div>

            {/* Damage numbers */}
            {battlePhase === "hit" && lastRoundDmg.yourDmg > 0 && (
              <div className="battle-damage-number battle-damage--dealt">
                -{lastRoundDmg.yourDmg}
              </div>
            )}
            {battlePhase === "hit" && lastRoundDmg.theirDmg > 0 && (
              <div className="battle-damage-number battle-damage--taken">
                -{lastRoundDmg.theirDmg}
              </div>
            )}

            {/* Shield flash */}
            {battlePhase === "hit" && <div className="battle-shield-flash" />}
          </div>
        )}

        {/* Body */}
        <div className="combat-v2-body">
          {/* Enemy Display */}
          {opponent && (
            <div>
              <div className="combat-v2-section-label">Enemy</div>
              <div className="combat-v2-enemy">
                <div className="combat-v2-enemy-name">
                  {opponent.playerId === playerId ? playerName : "Opponent"}
                </div>
                <div className="combat-v2-hull-bar-container">
                  <div className="combat-v2-hull-bar">
                    <div
                      className={`combat-v2-hull-bar-fill ${hullColor(opponent.hullHp, opponent.maxHullHp)}`}
                      style={{
                        width: `${opponent.maxHullHp > 0 ? (opponent.hullHp / opponent.maxHullHp) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <div className="combat-v2-hull-label">
                    {opponent.hullHp} / {opponent.maxHullHp}
                  </div>
                </div>
              </div>
              {/* Enemy subsystems */}
              <div
                className="combat-v2-subsystems"
                style={{ marginTop: "6px" }}
              >
                {opponent.subsystems.map((sub) => (
                  <div
                    key={sub.type}
                    className={`combat-v2-subsystem ${combat.targetSubsystem === sub.type ? "selected" : ""} ${sub.isDisabled ? "disabled" : ""}`}
                    onClick={() => {
                      if (!sub.isDisabled && !combat.submitted) {
                        combat.setTargetSubsystem(sub.type);
                      }
                    }}
                  >
                    <div className="combat-v2-subsystem-label">
                      {SUBSYSTEM_LABELS[sub.type]}
                    </div>
                    <div className="combat-v2-subsystem-hp">
                      {sub.currentHp}/{sub.maxHp}
                    </div>
                    <div className="combat-v2-subsystem-bar">
                      <div
                        className="combat-v2-subsystem-bar-fill"
                        style={{
                          width: `${sub.maxHp > 0 ? (sub.currentHp / sub.maxHp) * 100 : 0}%`,
                          background: subBarColor(sub.currentHp, sub.maxHp),
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Player Status */}
          {player && (
            <div className="combat-v2-player-status">
              <div className="combat-v2-player-name">{playerName}</div>
              <div className="combat-v2-hull-bar-container">
                <div className="combat-v2-hull-bar">
                  <div
                    className={`combat-v2-hull-bar-fill ${hullColor(player.hullHp, player.maxHullHp)}`}
                    style={{
                      width: `${player.maxHullHp > 0 ? (player.hullHp / player.maxHullHp) * 100 : 0}%`,
                    }}
                  />
                </div>
                <div className="combat-v2-hull-label">
                  {player.hullHp} / {player.maxHullHp}
                </div>
              </div>
            </div>
          )}

          {/* Player subsystems (read-only) */}
          {player && (
            <div className="combat-v2-subsystems">
              {player.subsystems.map((sub) => (
                <div
                  key={sub.type}
                  className={`combat-v2-subsystem ${sub.isDisabled ? "disabled" : ""}`}
                  style={{ cursor: "default" }}
                >
                  <div className="combat-v2-subsystem-label">
                    {SUBSYSTEM_LABELS[sub.type]}
                  </div>
                  <div className="combat-v2-subsystem-hp">
                    {sub.currentHp}/{sub.maxHp}
                  </div>
                  <div className="combat-v2-subsystem-bar">
                    <div
                      className="combat-v2-subsystem-bar-fill"
                      style={{
                        width: `${sub.maxHp > 0 ? (sub.currentHp / sub.maxHp) * 100 : 0}%`,
                        background: subBarColor(sub.currentHp, sub.maxHp),
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Power Distribution */}
          {player && (
            <div className="combat-v2-power">
              <div className="combat-v2-power-header">
                <div className="combat-v2-section-label">
                  Power Distribution
                </div>
                <div
                  className={`combat-v2-power-remaining ${combat.powerRemaining < 0 ? "over" : "ok"}`}
                >
                  {combat.powerRemaining} / {combat.maxReactor} remaining
                </div>
              </div>
              {POWER_SYSTEMS.map(({ key, label }) => (
                <div key={key} className="combat-v2-power-row">
                  <div className="combat-v2-power-label">{label}</div>
                  <input
                    type="range"
                    className="combat-v2-power-slider"
                    min={0}
                    max={combat.maxReactor}
                    value={combat.powerAllocation[key]}
                    onChange={(e) =>
                      combat.setPower(key, parseInt(e.target.value))
                    }
                    disabled={combat.submitted}
                  />
                  <div className="combat-v2-power-value">
                    {combat.powerAllocation[key]}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Weapon Bay */}
          {player && player.weapons.length > 0 && (
            <div>
              <div className="combat-v2-section-label">Weapons</div>
              <div className="combat-v2-weapons">
                {player.weapons.map((w) => {
                  const onCooldown = w.cooldownRemaining > 0;
                  const isSelected = combat.selectedWeapons.includes(
                    w.slotIndex,
                  );
                  return (
                    <div
                      key={w.slotIndex}
                      className={`combat-v2-weapon ${isSelected ? "selected" : ""} ${onCooldown ? "on-cooldown" : ""}`}
                      onClick={() => {
                        if (!onCooldown && !combat.submitted) {
                          combat.toggleWeapon(w.slotIndex);
                        }
                      }}
                    >
                      <div className="combat-v2-weapon-name">
                        {w.weaponTypeId.replace(/_/g, " ")}
                      </div>
                      <div className="combat-v2-weapon-stats">
                        DMG {w.damageBase} | PWR {w.powerCost} | ACC{" "}
                        {Math.round(w.accuracy * 100)}%
                      </div>
                      {onCooldown && (
                        <div className="combat-v2-weapon-cooldown">
                          Cooldown: {w.cooldownRemaining} round
                          {w.cooldownRemaining > 1 ? "s" : ""}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Phase 3: Repair + Phase 6: Hack controls */}
          {player && !combat.submitted && !combat.combatResult && (
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {/* Repair */}
              <div style={{ flex: 1, minWidth: "120px" }}>
                <div className="combat-v2-section-label">Repair</div>
                <select
                  style={{
                    width: "100%",
                    fontSize: "11px",
                    padding: "4px",
                    background: "rgba(255,255,255,0.05)",
                    color: "var(--text-primary)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "3px",
                  }}
                  value={combat.repairTarget ?? ""}
                  onChange={(e) =>
                    combat.setRepairTarget(
                      (e.target.value as SubsystemType) || null,
                    )
                  }
                >
                  <option value="">None</option>
                  {player.subsystems
                    .filter((s) => s.currentHp < s.maxHp)
                    .map((s) => (
                      <option key={s.type} value={s.type}>
                        {SUBSYSTEM_FULL[s.type]} ({s.currentHp}/{s.maxHp})
                      </option>
                    ))}
                </select>
              </div>
              {/* Hack */}
              {opponent && (
                <div style={{ flex: 1, minWidth: "120px" }}>
                  <div className="combat-v2-section-label">Hack</div>
                  <select
                    style={{
                      width: "100%",
                      fontSize: "11px",
                      padding: "4px",
                      background: "rgba(255,255,255,0.05)",
                      color: "var(--text-primary)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: "3px",
                    }}
                    value={combat.hackTarget ?? ""}
                    onChange={(e) =>
                      combat.setHackTarget(
                        (e.target.value as SubsystemType) || null,
                      )
                    }
                  >
                    <option value="">None</option>
                    {opponent.subsystems
                      .filter((s) => !s.isDisabled)
                      .map((s) => (
                        <option key={s.type} value={s.type}>
                          {SUBSYSTEM_FULL[s.type]}
                        </option>
                      ))}
                  </select>
                </div>
              )}
              {/* Board (Phase 5) */}
              {opponent &&
                opponent.subsystems.find((s) => s.type === "engines")
                  ?.isDisabled && (
                  <div style={{ flex: 1, minWidth: "120px" }}>
                    <div className="combat-v2-section-label">Board</div>
                    <label
                      style={{
                        fontSize: "11px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        color: "var(--yellow)",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={combat.wantsToBoard}
                        onChange={(e) =>
                          combat.setWantsToBoard(e.target.checked)
                        }
                      />
                      Attempt Boarding
                    </label>
                  </div>
                )}
            </div>
          )}

          {/* Crew roster */}
          {player && player.crew && player.crew.length > 0 && (
            <div>
              <div className="combat-v2-section-label">Crew</div>
              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                {player.crew.map((c: any) => (
                  <div
                    key={c.id}
                    style={{
                      fontSize: "10px",
                      padding: "2px 6px",
                      borderRadius: "3px",
                      background:
                        c.status === "dead"
                          ? "rgba(248,81,73,0.15)"
                          : c.status === "injured"
                            ? "rgba(210,153,34,0.15)"
                            : "rgba(63,185,80,0.1)",
                      border: `1px solid ${c.status === "dead" ? "rgba(248,81,73,0.3)" : c.status === "injured" ? "rgba(210,153,34,0.3)" : "rgba(63,185,80,0.2)"}`,
                      color:
                        c.status === "dead"
                          ? "var(--red)"
                          : c.status === "injured"
                            ? "var(--yellow)"
                            : "var(--green)",
                    }}
                  >
                    {c.name} ({c.role}){" "}
                    {c.assignedStation ? `@ ${c.assignedStation}` : ""}{" "}
                    {c.status === "dead"
                      ? "KIA"
                      : c.status === "injured"
                        ? "INJ"
                        : ""}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Round Log */}
          {combat.roundLog.length > 0 && (
            <div>
              <div className="combat-v2-section-label">Combat Log</div>
              <div className="combat-v2-log">
                {combat.roundLog.map((entry) => (
                  <RoundLogEntry
                    key={entry.roundNumber}
                    entry={entry}
                    playerId={playerId}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Bar */}
        <div className="combat-v2-actions">
          <button
            className="combat-v2-btn submit"
            disabled={combat.submitted || !!combat.combatResult}
            onClick={combat.submitOrders}
          >
            {combat.submitted ? "Orders Locked" : "Submit Orders"}
          </button>
          <button
            className="combat-v2-btn flee"
            disabled={!!combat.combatResult}
            onClick={combat.flee}
          >
            Flee
          </button>
          <button
            className="combat-v2-btn surrender"
            disabled={!!combat.combatResult}
            onClick={combat.surrender}
          >
            Surrender
          </button>
        </div>

        {/* Result Overlay — delayed until battle scene finishes */}
        {showResult && combat.combatResult && (
          <div className="combat-v2-result">
            <div className="combat-v2-result-card">
              <div
                className={`combat-v2-result-title ${isVictory ? "victory" : isDefeat ? "defeat" : "fled"}`}
              >
                {isVictory
                  ? "Victory"
                  : isDefeat
                    ? "Ship Disabled"
                    : isFled
                      ? "Escaped"
                      : "Combat Over"}
              </div>
              <div className="combat-v2-result-msg">
                {isVictory && "Enemy ship destroyed."}
                {isDefeat &&
                  "Your ship has been disabled and towed to the nearest starmall for repairs."}
                {isFled && "You fled to an adjacent sector."}
                {!isVictory &&
                  !isDefeat &&
                  !isFled &&
                  combat.combatResult.endReason === "fled" &&
                  "Enemy escaped."}
              </div>
              <button className="combat-v2-result-close" onClick={onClose}>
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Round Log Entry ─────────────────────────────────────────────────────────

function RoundLogEntry({
  entry,
  playerId,
}: {
  entry: { roundNumber: number; resolution: any };
  playerId: string;
}) {
  const r = entry.resolution;
  if (!r) return null;

  const yourSide = r.playerA?.playerId === playerId ? r.playerA : r.playerB;
  const theirSide = r.playerA?.playerId === playerId ? r.playerB : r.playerA;

  const yourHits =
    yourSide?.weaponResults?.filter((w: any) => w.hit).length ?? 0;
  const yourDmg = yourSide?.totalDamage ?? 0;
  const theirHits =
    theirSide?.weaponResults?.filter((w: any) => w.hit).length ?? 0;
  const theirDmg = theirSide?.totalDamage ?? 0;

  return (
    <div className="combat-v2-log-entry">
      <strong>Round {entry.roundNumber}:</strong> You:{" "}
      <span className="hit">
        {yourHits} hits, {yourDmg} dmg
      </span>{" "}
      | Enemy:{" "}
      <span className="hit">
        {theirHits} hits, {theirDmg} dmg
      </span>
      {yourSide?.subsystemsDisabled?.length > 0 && (
        <span className="disabled">
          {" "}
          | Enemy systems down:{" "}
          {yourSide.subsystemsDisabled
            .map((s: SubsystemType) => SUBSYSTEM_FULL[s])
            .join(", ")}
        </span>
      )}
    </div>
  );
}
