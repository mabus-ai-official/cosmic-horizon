/** Death overlay — respawn at landing pad */

interface PlanetDeathScreenProps {
  onRespawn: () => void;
  lootLost: number; // count of items lost
}

export default function PlanetDeathScreen({
  onRespawn,
  lootLost,
}: PlanetDeathScreenProps) {
  return (
    <div className="planet-death">
      <div className="planet-death__content">
        <div className="planet-death__title">YOU DIED</div>
        <div className="planet-death__subtitle">
          Your automaton adversaries have destroyed your ground unit.
        </div>
        {lootLost > 0 && (
          <div className="planet-death__loot-lost">{lootLost} items lost</div>
        )}
        <button className="planet-death__respawn" onClick={onRespawn}>
          RESPAWN AT LANDING PAD
        </button>
        <div className="planet-death__hint">
          Session loot is lost on death. Reach the landing pad to extract
          safely.
        </div>
      </div>
    </div>
  );
}
