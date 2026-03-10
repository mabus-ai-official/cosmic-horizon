import { useState } from "react";
import CollapsiblePanel from "./CollapsiblePanel";
import PixelSprite from "./PixelSprite";
import PixelScene from "./PixelScene";
import { buildCombatScene } from "../config/scenes/combat-scene";
import type { SectorState } from "../hooks/useGameState";

interface CombatViewProps {
  sector: SectorState | null;
  onFire: (targetPlayerId: string, energy: number) => void;
  onFlee: () => void;
  weaponEnergy: number;
  combatAnimation?: { attackerShipType: string; damage: number } | null;
  onCombatAnimationDone?: () => void;
  bare?: boolean;
}

export default function CombatView({
  sector,
  onFire,
  onFlee,
  weaponEnergy,
  combatAnimation,
  onCombatAnimationDone,
  bare,
}: CombatViewProps) {
  const [energy, setEnergy] = useState(10);
  const [target, setTarget] = useState<string>("");

  const players = sector?.players || [];

  const content =
    players.length === 0 ? (
      <div className="text-muted">No hostiles in sector</div>
    ) : (
      <>
        {combatAnimation && onCombatAnimationDone && (
          <PixelScene
            scene={buildCombatScene(
              combatAnimation.attackerShipType,
              combatAnimation.damage,
            )}
            renderMode="sidebar"
            onComplete={onCombatAnimationDone}
            width={280}
            height={180}
          />
        )}
        <div className="panel-subheader text-warning combat-subheader">
          <PixelSprite spriteKey="combat_crosshair" size={14} />
          Targets in sector
        </div>
        {players.map((p) => (
          <div
            key={p.id}
            className={`panel-row target-row ${target === p.id ? "selected" : ""}`}
            onClick={() => setTarget(p.id)}
          >
            {p.username}
          </div>
        ))}

        {target && (
          <div className="combat-controls">
            <div className="panel-row">
              <label>Energy:</label>
              <input
                type="number"
                min={1}
                max={weaponEnergy}
                value={energy}
                onChange={(e) =>
                  setEnergy(Math.max(1, parseInt(e.target.value) || 1))
                }
                className="qty-input"
              />
              <span className="text-muted">/ {weaponEnergy}</span>
            </div>
            <div className="combat-buttons">
              <button
                className="btn btn-fire"
                disabled={weaponEnergy <= 0}
                onClick={() => onFire(target, Math.min(energy, weaponEnergy))}
              >
                {weaponEnergy <= 0
                  ? "NO WEAPON ENERGY"
                  : `FIRE (${Math.min(energy, weaponEnergy)} energy)`}
              </button>
              <button className="btn btn-flee" onClick={onFlee}>
                FLEE
              </button>
            </div>
          </div>
        )}
      </>
    );

  if (bare) return <div className="panel-content">{content}</div>;
  return (
    <CollapsiblePanel title="COMBAT" className="panel-combat">
      {content}
    </CollapsiblePanel>
  );
}
