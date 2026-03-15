export interface StoreItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: "deployable" | "equipment" | "consumable";
  /** Which deployable type this creates (if category is 'deployable') */
  deployableType?: string;
  /** Ship capability required to use this item */
  requiresCapability?: "canCarryMines" | "canCarryPgd" | "hasJumpDriveSlot";
}

export const STORE_ITEMS: StoreItem[] = [
  // Mines
  {
    id: "mine_halberd",
    name: "Halberd Mine",
    description:
      "Explodes on contact, dealing heavy damage to the first ship entering the sector.",
    price: 1500,
    category: "deployable",
    deployableType: "mine_halberd",
    requiresCapability: "canCarryMines",
  },
  {
    id: "mine_barnacle",
    name: "Barnacle Mine",
    description: "Attaches to a ship, draining engine energy over time.",
    price: 2000,
    category: "deployable",
    deployableType: "mine_barnacle",
    requiresCapability: "canCarryMines",
  },

  // Drones
  {
    id: "drone_offensive",
    name: "Offensive Drone",
    description: "Attacks hostile ships entering the sector.",
    price: 800,
    category: "deployable",
    deployableType: "drone_offensive",
  },
  {
    id: "drone_defensive",
    name: "Defensive Drone",
    description: "Protects your ships and planets in the sector.",
    price: 600,
    category: "deployable",
    deployableType: "drone_defensive",
  },
  {
    id: "drone_toll",
    name: "Toll Drone",
    description: "Charges passing ships a toll to traverse the sector.",
    price: 1000,
    category: "deployable",
    deployableType: "drone_toll",
  },

  // Buoy
  {
    id: "buoy",
    name: "Navigation Buoy",
    description:
      "Leaves a message visible to all players in the sector. Logs visitors.",
    price: 200,
    category: "deployable",
    deployableType: "buoy",
  },

  // Equipment
  {
    id: "pgd",
    name: "Planet Gravity Drive",
    description: "Allows your ship to tow planets between sectors.",
    price: 50000,
    category: "equipment",
    requiresCapability: "canCarryPgd",
  },
  {
    id: "jump_drive",
    name: "Jump Drive",
    description:
      "Enables instant travel to any explored sector (high energy cost).",
    price: 25000,
    category: "equipment",
    requiresCapability: "hasJumpDriveSlot",
  },
  {
    id: "planetary_scanner",
    name: "Planetary Scanner Upgrade",
    description: "Reveals planet details in adjacent sectors.",
    price: 8000,
    category: "equipment",
  },

  // Consumables
  {
    id: "probe",
    name: "Sector Probe",
    description: "Reveals contents of a non-adjacent sector.",
    price: 300,
    category: "consumable",
  },
  {
    id: "disruptor_torpedo",
    name: "Disruptor Torpedo",
    description: "Disables target ship engines for 5 minutes.",
    price: 3000,
    category: "consumable",
  },
  {
    id: "rache_device",
    name: "Rache Device",
    description:
      "Self-destruct device. Deals massive damage to all ships in sector when detonated.",
    price: 10000,
    category: "consumable",
  },
  {
    id: "cloaking_cell",
    name: "Cloaking Cell",
    description:
      "Single-use cloaking charge. Lasts until you fire weapons or dock.",
    price: 2000,
    category: "consumable",
  },
  {
    id: "fuel_cell",
    name: "Fuel Cell",
    description: "Restores 50 energy points.",
    price: 500,
    category: "consumable",
  },
  {
    id: "scanner_probe",
    name: "Planetary Scanner Probe",
    description:
      "Single-use probe that reveals detailed info about all planets in your current sector.",
    price: 2500,
    category: "consumable",
  },
  // Faction Questline Reward Items (not purchasable — awarded from missions)
  {
    id: "mycelial_scanner",
    name: "Mycelial Scanner",
    description:
      "Tuned to the Spore Network frequency. Increases scan range by 1 sector in all directions.",
    price: 0,
    category: "equipment",
  },
  {
    id: "tactical_override_module",
    name: "Tactical Override Module",
    description:
      "Iron Dominion combat firmware. Increases weapon damage by 15%.",
    price: 0,
    category: "equipment",
  },
  {
    id: "merchants_ledger",
    name: "Merchant's Ledger",
    description:
      "Traders Guild pricing algorithms. Improves buy/sell prices by 10%.",
    price: 0,
    category: "equipment",
  },
  {
    id: "cloaking_resonator",
    name: "Cloaking Resonator",
    description:
      "Shadow Syndicate stealth tech. Increases flee success chance by 25%.",
    price: 0,
    category: "equipment",
  },
];

export function getStoreItem(id: string): StoreItem | undefined {
  return STORE_ITEMS.find((item) => item.id === id);
}
