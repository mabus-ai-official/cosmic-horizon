export interface VendorItem {
  id: string;
  name: string;
  description: string;
  price: number;
  requiredFactionId: string;
  requiredFame: number;
}

export const RACE_VENDOR_ITEMS: Record<string, VendorItem[]> = {
  race_muscarian: [
    {
      id: "spore_communicator",
      name: "Spore Communicator",
      description:
        "Mycelial relay device that lets you contact any NPC remotely, regardless of sector.",
      price: 3500,
      requiredFactionId: "race_muscarian",
      requiredFame: 25,
    },
    {
      id: "spore_shield",
      name: "Spore Shield Module",
      description: "Organic shield that regenerates slowly over time.",
      price: 5000,
      requiredFactionId: "race_muscarian",
      requiredFame: 50,
    },
    {
      id: "mycelial_nav",
      name: "Mycelial Navigator",
      description: "Reveals hidden paths between sectors.",
      price: 8000,
      requiredFactionId: "race_muscarian",
      requiredFame: 100,
    },
  ],
  race_vedic: [
    {
      id: "crystal_lens",
      name: "Crystal Focus Lens",
      description: "Increases weapon accuracy by 15%.",
      price: 6000,
      requiredFactionId: "race_vedic",
      requiredFame: 50,
    },
    {
      id: "resonance_amp",
      name: "Resonance Amplifier",
      description: "Boosts scanner range and detail.",
      price: 10000,
      requiredFactionId: "race_vedic",
      requiredFame: 100,
    },
  ],
  race_kalin: [
    {
      id: "mineral_plating",
      name: "Mineral Hull Plating",
      description: "Adds 25% hull HP bonus.",
      price: 7000,
      requiredFactionId: "race_kalin",
      requiredFame: 50,
    },
    {
      id: "siege_cannon",
      name: "Kalin Siege Cannon",
      description: "Devastating weapon with slow fire rate.",
      price: 15000,
      requiredFactionId: "race_kalin",
      requiredFame: 100,
    },
  ],
  race_tarri: [
    {
      id: "stealth_coating",
      name: "Tarri Stealth Coating",
      description: "Reduces detection range by 30%.",
      price: 5500,
      requiredFactionId: "race_tarri",
      requiredFame: 50,
    },
    {
      id: "cargo_optimizer",
      name: "Cargo Optimizer",
      description: "Increases cargo capacity by 20%.",
      price: 9000,
      requiredFactionId: "race_tarri",
      requiredFame: 100,
    },
  ],
};

export const NPC_TYPE_VENDOR_ITEMS: Record<string, VendorItem[]> = {
  smuggler: [
    {
      id: "contraband_scanner",
      name: "Contraband Scanner",
      description: "Detects hidden cargo compartments on nearby ships.",
      price: 4000,
      requiredFactionId: "shadow_syndicate",
      requiredFame: 30,
    },
    {
      id: "forged_manifest",
      name: "Forged Manifest",
      description: "Reduces chance of cargo inspection at outposts.",
      price: 6000,
      requiredFactionId: "shadow_syndicate",
      requiredFame: 60,
    },
  ],
  bounty_hunter: [
    {
      id: "tracking_module",
      name: "Tracking Module",
      description: "Reveals the sector of a targeted player.",
      price: 5000,
      requiredFactionId: "frontier_rangers",
      requiredFame: 40,
    },
  ],
  mechanic: [
    {
      id: "field_repair_kit",
      name: "Field Repair Kit",
      description: "Restores 15% hull in the field without docking.",
      price: 3000,
      requiredFactionId: "traders_guild",
      requiredFame: 20,
    },
    {
      id: "overcharge_capacitor",
      name: "Overcharge Capacitor",
      description: "Temporarily boosts weapon damage by 25% for one volley.",
      price: 7000,
      requiredFactionId: "traders_guild",
      requiredFame: 50,
    },
  ],
};

export const FACTION_TO_RACE_MAP: Record<string, string> = {
  shadow_syndicate: "race_muscarian",
  traders_guild: "race_kalin",
  frontier_rangers: "race_vedic",
  cosmic_scholars: "race_tarri",
  independent: "race_tarri",
};

/**
 * Get vendor items for an NPC based on their race, faction, and title.
 */
export function getVendorItemsForNPC(npc: {
  race?: string | null;
  faction_id?: string | null;
  title?: string | null;
}): VendorItem[] {
  const items: VendorItem[] = [];

  // Race-based items (ambassador or race faction NPCs)
  const npcRaceFaction = npc.race ? `race_${npc.race}` : null;
  const factionKey =
    npcRaceFaction && RACE_VENDOR_ITEMS[npcRaceFaction]
      ? npcRaceFaction
      : npc.faction_id && FACTION_TO_RACE_MAP[npc.faction_id]
        ? FACTION_TO_RACE_MAP[npc.faction_id]
        : null;

  if (factionKey && RACE_VENDOR_ITEMS[factionKey]) {
    items.push(...RACE_VENDOR_ITEMS[factionKey]);
  }

  // NPC-type-based items
  const title = (npc.title || "").toLowerCase();
  for (const [npcType, typeItems] of Object.entries(NPC_TYPE_VENDOR_ITEMS)) {
    if (title.includes(npcType)) {
      items.push(...typeItems);
    }
  }

  return items;
}

export function getAllVendorItems(): VendorItem[] {
  return [
    ...Object.values(RACE_VENDOR_ITEMS).flat(),
    ...Object.values(NPC_TYPE_VENDOR_ITEMS).flat(),
  ];
}
