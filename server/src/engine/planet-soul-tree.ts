/**
 * Soul tree node definitions for the planet explorer ground character.
 * Players spend Soul Points (SP) earned from kills/mining to unlock passive bonuses.
 * Tree has 4 branches: Combat, Mining, Survival, Arcane.
 */

export interface SoulTreeNode {
  id: string;
  name: string;
  branch: "combat" | "mining" | "survival" | "arcane";
  description: string;
  maxRanks: number;
  costPerRank: number; // SP per rank
  requires: string[]; // prerequisite node IDs
  bonuses: NodeBonus[];
  tier: number; // 0 = root, 1-4 = depth
}

export interface NodeBonus {
  stat: string;
  valuePerRank: number;
  type: "flat" | "percent";
}

export const SOUL_TREE_NODES: SoulTreeNode[] = [
  // === COMBAT BRANCH ===
  {
    id: "c_power",
    name: "Raw Power",
    branch: "combat",
    description: "Increase base attack damage",
    maxRanks: 5,
    costPerRank: 1,
    requires: [],
    bonuses: [{ stat: "attack", valuePerRank: 3, type: "flat" }],
    tier: 0,
  },
  {
    id: "c_speed",
    name: "Swift Strikes",
    branch: "combat",
    description: "Increase attack speed",
    maxRanks: 5,
    costPerRank: 1,
    requires: [],
    bonuses: [{ stat: "attackSpeed", valuePerRank: 0.05, type: "flat" }],
    tier: 0,
  },
  {
    id: "c_crit",
    name: "Precision",
    branch: "combat",
    description: "Increase critical hit chance",
    maxRanks: 5,
    costPerRank: 2,
    requires: ["c_power"],
    bonuses: [{ stat: "critChance", valuePerRank: 0.03, type: "flat" }],
    tier: 1,
  },
  {
    id: "c_crit_dmg",
    name: "Devastation",
    branch: "combat",
    description: "Increase critical hit damage multiplier",
    maxRanks: 3,
    costPerRank: 3,
    requires: ["c_crit"],
    bonuses: [{ stat: "critMultiplier", valuePerRank: 0.2, type: "flat" }],
    tier: 2,
  },
  {
    id: "c_lifesteal",
    name: "Siphon",
    branch: "combat",
    description: "Heal for a percentage of damage dealt",
    maxRanks: 3,
    costPerRank: 3,
    requires: ["c_speed"],
    bonuses: [{ stat: "lifesteal", valuePerRank: 0.03, type: "flat" }],
    tier: 2,
  },
  {
    id: "c_aoe",
    name: "Cleave",
    branch: "combat",
    description: "Attacks hit additional nearby enemies",
    maxRanks: 3,
    costPerRank: 4,
    requires: ["c_crit_dmg", "c_lifesteal"],
    bonuses: [{ stat: "cleaveTargets", valuePerRank: 1, type: "flat" }],
    tier: 3,
  },
  {
    id: "c_execute",
    name: "Executioner",
    branch: "combat",
    description: "Deal bonus damage to enemies below 30% HP",
    maxRanks: 2,
    costPerRank: 5,
    requires: ["c_aoe"],
    bonuses: [{ stat: "executeDamage", valuePerRank: 0.15, type: "percent" }],
    tier: 4,
  },

  // === MINING BRANCH ===
  {
    id: "m_speed",
    name: "Quick Hands",
    branch: "mining",
    description: "Mine faster",
    maxRanks: 5,
    costPerRank: 1,
    requires: [],
    bonuses: [{ stat: "miningSpeed", valuePerRank: 0.1, type: "percent" }],
    tier: 0,
  },
  {
    id: "m_yield",
    name: "Rich Veins",
    branch: "mining",
    description: "Chance for double ore yield",
    maxRanks: 5,
    costPerRank: 1,
    requires: [],
    bonuses: [{ stat: "doubleOreChance", valuePerRank: 0.05, type: "flat" }],
    tier: 0,
  },
  {
    id: "m_durability",
    name: "Tempered Tools",
    branch: "mining",
    description: "Reduce pickaxe durability loss",
    maxRanks: 5,
    costPerRank: 2,
    requires: ["m_speed"],
    bonuses: [
      { stat: "durabilityReduction", valuePerRank: 0.1, type: "percent" },
    ],
    tier: 1,
  },
  {
    id: "m_rare",
    name: "Prospector",
    branch: "mining",
    description: "Increase rare resource drop chance",
    maxRanks: 3,
    costPerRank: 3,
    requires: ["m_yield"],
    bonuses: [{ stat: "rareResourceChance", valuePerRank: 0.05, type: "flat" }],
    tier: 2,
  },
  {
    id: "m_gem",
    name: "Gem Finder",
    branch: "mining",
    description: "Chance to find gems when mining any tile",
    maxRanks: 3,
    costPerRank: 4,
    requires: ["m_rare", "m_durability"],
    bonuses: [{ stat: "gemFindChance", valuePerRank: 0.03, type: "flat" }],
    tier: 3,
  },
  {
    id: "m_master",
    name: "Master Miner",
    branch: "mining",
    description: "All mining yields increased",
    maxRanks: 2,
    costPerRank: 5,
    requires: ["m_gem"],
    bonuses: [{ stat: "miningYieldAll", valuePerRank: 0.2, type: "percent" }],
    tier: 4,
  },

  // === SURVIVAL BRANCH ===
  {
    id: "s_hp",
    name: "Vitality",
    branch: "survival",
    description: "Increase maximum HP",
    maxRanks: 5,
    costPerRank: 1,
    requires: [],
    bonuses: [{ stat: "maxHp", valuePerRank: 15, type: "flat" }],
    tier: 0,
  },
  {
    id: "s_defense",
    name: "Iron Skin",
    branch: "survival",
    description: "Increase defense",
    maxRanks: 5,
    costPerRank: 1,
    requires: [],
    bonuses: [{ stat: "defense", valuePerRank: 3, type: "flat" }],
    tier: 0,
  },
  {
    id: "s_regen",
    name: "Regeneration",
    branch: "survival",
    description: "Passively regenerate HP over time",
    maxRanks: 5,
    costPerRank: 2,
    requires: ["s_hp"],
    bonuses: [{ stat: "hpRegen", valuePerRank: 1, type: "flat" }],
    tier: 1,
  },
  {
    id: "s_dodge",
    name: "Evasion",
    branch: "survival",
    description: "Chance to dodge attacks",
    maxRanks: 5,
    costPerRank: 2,
    requires: ["s_defense"],
    bonuses: [{ stat: "dodgeChance", valuePerRank: 0.03, type: "flat" }],
    tier: 1,
  },
  {
    id: "s_thorns",
    name: "Thorns",
    branch: "survival",
    description: "Reflect damage back to attackers",
    maxRanks: 3,
    costPerRank: 3,
    requires: ["s_defense"],
    bonuses: [{ stat: "thornsDamage", valuePerRank: 5, type: "flat" }],
    tier: 2,
  },
  {
    id: "s_laststand",
    name: "Last Stand",
    branch: "survival",
    description: "Gain damage reduction when below 25% HP",
    maxRanks: 3,
    costPerRank: 4,
    requires: ["s_regen", "s_dodge"],
    bonuses: [
      { stat: "lastStandReduction", valuePerRank: 0.1, type: "percent" },
    ],
    tier: 3,
  },
  {
    id: "s_immortal",
    name: "Undying",
    branch: "survival",
    description: "Once per session, survive a killing blow with 1 HP",
    maxRanks: 1,
    costPerRank: 8,
    requires: ["s_laststand"],
    bonuses: [{ stat: "deathSave", valuePerRank: 1, type: "flat" }],
    tier: 4,
  },

  // === ARCANE BRANCH ===
  {
    id: "a_sp_gain",
    name: "Soul Harvest",
    branch: "arcane",
    description: "Earn more SP from kills",
    maxRanks: 5,
    costPerRank: 1,
    requires: [],
    bonuses: [{ stat: "spGainMultiplier", valuePerRank: 0.1, type: "percent" }],
    tier: 0,
  },
  {
    id: "a_xp_gain",
    name: "Wisdom",
    branch: "arcane",
    description: "Earn more XP from all sources",
    maxRanks: 5,
    costPerRank: 1,
    requires: [],
    bonuses: [
      { stat: "xpGainMultiplier", valuePerRank: 0.08, type: "percent" },
    ],
    tier: 0,
  },
  {
    id: "a_loot",
    name: "Fortune",
    branch: "arcane",
    description: "Increase item drop rates",
    maxRanks: 5,
    costPerRank: 2,
    requires: ["a_sp_gain"],
    bonuses: [
      { stat: "lootDropMultiplier", valuePerRank: 0.08, type: "percent" },
    ],
    tier: 1,
  },
  {
    id: "a_cooldown",
    name: "Haste",
    branch: "arcane",
    description: "Reduce skill cooldowns",
    maxRanks: 5,
    costPerRank: 2,
    requires: ["a_xp_gain"],
    bonuses: [
      { stat: "cooldownReduction", valuePerRank: 0.05, type: "percent" },
    ],
    tier: 1,
  },
  {
    id: "a_skill_dmg",
    name: "Amplify",
    branch: "arcane",
    description: "Increase skill damage",
    maxRanks: 3,
    costPerRank: 3,
    requires: ["a_cooldown"],
    bonuses: [
      { stat: "skillDamageMultiplier", valuePerRank: 0.12, type: "percent" },
    ],
    tier: 2,
  },
  {
    id: "a_aura",
    name: "Soul Aura",
    branch: "arcane",
    description: "Nearby allies gain bonus attack and defense",
    maxRanks: 3,
    costPerRank: 4,
    requires: ["a_loot", "a_skill_dmg"],
    bonuses: [{ stat: "auraBonus", valuePerRank: 5, type: "flat" }],
    tier: 3,
  },
  {
    id: "a_transcend",
    name: "Transcendence",
    branch: "arcane",
    description: "All bonuses from this tree increased by 10%",
    maxRanks: 2,
    costPerRank: 6,
    requires: ["a_aura"],
    bonuses: [{ stat: "arcaneAmplifier", valuePerRank: 0.1, type: "percent" }],
    tier: 4,
  },
];

const NODE_MAP = new Map(SOUL_TREE_NODES.map((n) => [n.id, n]));

export function getSoulTreeNode(nodeId: string): SoulTreeNode | undefined {
  return NODE_MAP.get(nodeId);
}

/** Check if a player can unlock/upgrade a node given their current tree state */
export function canUnlockNode(
  nodeId: string,
  currentNodes: Map<string, number>,
  availableSP: number,
): { ok: boolean; reason?: string } {
  const node = NODE_MAP.get(nodeId);
  if (!node) return { ok: false, reason: "Unknown node" };

  const currentRanks = currentNodes.get(nodeId) ?? 0;
  if (currentRanks >= node.maxRanks)
    return { ok: false, reason: "Already max rank" };

  if (node.costPerRank > availableSP)
    return { ok: false, reason: "Not enough SP" };

  for (const reqId of node.requires) {
    const reqRanks = currentNodes.get(reqId) ?? 0;
    if (reqRanks === 0)
      return { ok: false, reason: `Requires ${NODE_MAP.get(reqId)?.name}` };
  }

  return { ok: true };
}

/** Calculate total stat bonuses from a player's soul tree state */
export function calculateSoulBonuses(
  currentNodes: Map<string, number>,
): Record<string, number> {
  const bonuses: Record<string, number> = {};
  for (const [nodeId, ranks] of currentNodes) {
    const node = NODE_MAP.get(nodeId);
    if (!node) continue;
    for (const bonus of node.bonuses) {
      const key = bonus.stat;
      bonuses[key] = (bonuses[key] ?? 0) + bonus.valuePerRank * ranks;
    }
  }
  // Apply arcane amplifier if present
  const amp = bonuses["arcaneAmplifier"] ?? 0;
  if (amp > 0) {
    for (const [nodeId, ranks] of currentNodes) {
      const node = NODE_MAP.get(nodeId);
      if (!node || node.branch !== "arcane" || node.id === "a_transcend")
        continue;
      for (const bonus of node.bonuses) {
        bonuses[bonus.stat] += bonus.valuePerRank * ranks * amp;
      }
    }
  }
  return bonuses;
}

/** XP required for next level (exponential curve) */
export function xpForLevel(level: number): number {
  return Math.round(100 * Math.pow(1.15, level - 1));
}
