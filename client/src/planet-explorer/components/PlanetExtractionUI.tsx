/** Shows collected session loot and extraction point indicator */

import type { SessionLootItem } from "../engine/types";

interface PlanetExtractionUIProps {
  sessionLoot: SessionLootItem[];
  nearPad: boolean;
  onExtract: () => void;
}

const ITEM_NAMES: Record<string, string> = {
  tech: "Tech",
  cyrillium: "Cyrillium",
  scrap_metal: "Scrap Metal",
  circuit_board: "Circuit Board",
  power_core: "Power Core",
  nano_fiber: "Nano Fiber",
  rare_alloy: "Rare Alloy",
  data_crystal: "Data Crystal",
  ancient_blueprint: "Ancient Blueprint",
  core_fragment: "Core Fragment",
  legendary_component: "Legendary Component",
  elite_circuit: "Elite Circuit",
  venom_sac: "Venom Sac",
  targeting_chip: "Targeting Chip",
  gem: "Gem",
  stone: "Stone",
  biocrystal: "Biocrystal",
  sunstone: "Sunstone",
  deepcoral: "Deepcoral",
  cryolith: "Cryolith",
  glacium: "Glacium",
  pyrethium: "Pyrethium",
  stormglass: "Stormglass",
  primordial_shard: "Primordial Shard",
};

export default function PlanetExtractionUI({
  sessionLoot,
  nearPad,
  onExtract,
}: PlanetExtractionUIProps) {
  if (sessionLoot.length === 0) return null;

  return (
    <div className="planet-extraction">
      <div className="planet-extraction__title">SESSION LOOT</div>
      <div className="planet-extraction__list">
        {sessionLoot.map((item, i) => (
          <div key={i} className="planet-extraction__item">
            <span className="planet-extraction__item-name">
              {ITEM_NAMES[item.itemId] ?? item.itemId}
            </span>
            <span className="planet-extraction__item-qty">
              x{item.quantity}
            </span>
          </div>
        ))}
      </div>
      {nearPad && (
        <button className="planet-extraction__extract-btn" onClick={onExtract}>
          EXTRACT TO SHIP
        </button>
      )}
      {!nearPad && (
        <div className="planet-extraction__hint">
          Return to landing pad to extract
        </div>
      )}
    </div>
  );
}
