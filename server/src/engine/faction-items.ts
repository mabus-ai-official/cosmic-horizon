/**
 * Faction reward item bonuses — checks player_story_flags for unique items
 * earned from completing faction questlines. These are permanent, player-level
 * bonuses that persist across ships.
 *
 * Items:
 *   has_mycelial_scanner  → +1 scan range (extra depth of adjacency)
 *   has_tactical_override → +15% weapon damage (attackRatio multiplier)
 *   has_merchants_ledger  → +10% trade price advantage (discount on buy, boost on sell)
 *   has_cloaking_resonator → +25% flee success chance (additive)
 */
import db from "../db/connection";

export interface FactionItemBonuses {
  scanRangeBonus: number; // extra adjacency depth (0 or 1)
  damageMultiplier: number; // e.g. 0.15 for +15%
  tradeMultiplier: number; // e.g. 0.10 for +10%
  fleeBonus: number; // e.g. 0.25 for +25%
}

const EMPTY: FactionItemBonuses = {
  scanRangeBonus: 0,
  damageMultiplier: 0,
  tradeMultiplier: 0,
  fleeBonus: 0,
};

const FLAG_MAP: {
  flag: string;
  key: keyof FactionItemBonuses;
  value: number;
}[] = [
  { flag: "has_mycelial_scanner", key: "scanRangeBonus", value: 1 },
  { flag: "has_tactical_override", key: "damageMultiplier", value: 0.15 },
  { flag: "has_merchants_ledger", key: "tradeMultiplier", value: 0.1 },
  { flag: "has_cloaking_resonator", key: "fleeBonus", value: 0.25 },
];

export async function getFactionItemBonuses(
  playerId: string,
): Promise<FactionItemBonuses> {
  const flags = await db("player_story_flags")
    .where({ player_id: playerId })
    .whereIn(
      "flag_key",
      FLAG_MAP.map((f) => f.flag),
    )
    .select("flag_key");

  if (flags.length === 0) return { ...EMPTY };

  const bonuses = { ...EMPTY };
  const flagSet = new Set(flags.map((f: any) => f.flag_key));

  for (const mapping of FLAG_MAP) {
    if (flagSet.has(mapping.flag)) {
      bonuses[mapping.key] = mapping.value;
    }
  }

  return bonuses;
}
