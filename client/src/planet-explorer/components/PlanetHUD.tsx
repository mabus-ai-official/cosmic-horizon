/** HUD overlay — HP bar, level, gold, SP, skill cooldowns, session loot count */

import type { SessionLootItem } from "../engine/types";

interface PlanetHUDProps {
  hp: number;
  maxHp: number;
  level: number;
  xp: number;
  xpToNext: number;
  gold: number;
  sp: number;
  skillCooldowns: number[];
  sessionLoot: SessionLootItem[];
  nearPad: boolean;
}

export default function PlanetHUD({
  hp,
  maxHp,
  level,
  xp,
  xpToNext,
  gold,
  sp,
  skillCooldowns,
  sessionLoot,
  nearPad,
}: PlanetHUDProps) {
  const hpRatio = maxHp > 0 ? hp / maxHp : 0;
  const xpRatio = xpToNext > 0 ? xp / xpToNext : 0;
  const totalLoot = sessionLoot.reduce((acc, l) => acc + l.quantity, 0);

  return (
    <div className="planet-hud">
      {/* HP Bar */}
      <div className="planet-hud__hp">
        <div className="planet-hud__bar-bg">
          <div
            className="planet-hud__bar-fill planet-hud__bar-fill--hp"
            style={{ width: `${Math.max(0, hpRatio * 100)}%` }}
          />
        </div>
        <span className="planet-hud__bar-text">
          HP {hp}/{maxHp}
        </span>
      </div>

      {/* XP Bar */}
      <div className="planet-hud__xp">
        <div className="planet-hud__bar-bg planet-hud__bar-bg--small">
          <div
            className="planet-hud__bar-fill planet-hud__bar-fill--xp"
            style={{ width: `${Math.max(0, xpRatio * 100)}%` }}
          />
        </div>
        <span className="planet-hud__bar-text-small">
          Lv.{level} — {xp}/{xpToNext} XP
        </span>
      </div>

      {/* Stats row */}
      <div className="planet-hud__stats">
        <span className="planet-hud__stat">
          <span className="planet-hud__stat-icon">G</span> {gold}
        </span>
        <span className="planet-hud__stat">
          <span className="planet-hud__stat-icon">SP</span> {sp}
        </span>
        <span className="planet-hud__stat">
          <span className="planet-hud__stat-icon">L</span> {totalLoot}
        </span>
      </div>

      {/* Skill bar */}
      <div className="planet-hud__skills">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`planet-hud__skill ${skillCooldowns[i] > 0 ? "planet-hud__skill--cd" : ""}`}
          >
            <span className="planet-hud__skill-key">{i + 1}</span>
            {skillCooldowns[i] > 0 && (
              <span className="planet-hud__skill-cd">
                {Math.ceil(skillCooldowns[i] / 20)}s
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Extraction indicator */}
      {nearPad && (
        <div className="planet-hud__extract-ready">
          EXTRACTION READY — Press ESC to leave with loot
        </div>
      )}

      {/* Controls hint */}
      <div className="planet-hud__controls">
        WASD Move | SPACE Attack | E Mine | 1-4 Skills
      </div>
    </div>
  );
}
