import db from "../db/connection";
import { GAME_CONFIG } from "../config/game";
import {
  levelForXp,
  xpForLevel,
  getRankTitle,
  getLevelUpBonusStat,
} from "../config/progression";
import { logActivity } from "./profile-stats";

export interface LevelUpResult {
  levelsGained: number;
  oldLevel: number;
  newLevel: number;
  newRank: string;
  bonuses: { maxEnergy: number; cargo: number; weapon: number; engine: number };
}

export interface XpAwardResult {
  xpAwarded: number;
  totalXp: number;
  level: number;
  rank: string;
  levelUp: LevelUpResult | null;
}

/**
 * Award XP to a player. Handles level-up, stat bonuses, and DB updates.
 * Safe to call from any handler — errors are caught internally for non-critical paths.
 */
export async function awardXP(
  playerId: string,
  amount: number,
  source: "combat" | "mission" | "trade" | "explore" | "craft",
): Promise<XpAwardResult> {
  if (amount <= 0) return getPlayerProgress(playerId);

  let prog = await db("player_progression")
    .where({ player_id: playerId })
    .first();

  // Auto-create if missing (handles players created before migration)
  if (!prog) {
    await db("player_progression").insert({
      player_id: playerId,
      level: 1,
      xp: 0,
      total_combat_xp: 0,
      total_mission_xp: 0,
      total_trade_xp: 0,
      total_explore_xp: 0,
    });
    prog = {
      player_id: playerId,
      level: 1,
      xp: 0,
      total_combat_xp: 0,
      total_mission_xp: 0,
      total_trade_xp: 0,
      total_explore_xp: 0,
    };
  }

  const oldLevel = prog.level;
  const newXp = Number(prog.xp) + amount;
  const newLevel = Math.min(GAME_CONFIG.MAX_LEVEL, levelForXp(newXp));

  const sourceField = `total_${source}_xp`;
  const updateData: Record<string, any> = {
    xp: newXp,
    level: newLevel,
    [sourceField]: Number(prog[sourceField] || 0) + amount,
  };

  let levelUp: LevelUpResult | null = null;

  if (newLevel > oldLevel) {
    updateData.last_level_up = new Date().toISOString();
    levelUp = await applyLevelUpBonuses(playerId, oldLevel, newLevel);

    // Profile: log level-up activity
    logActivity(
      playerId,
      "level_up",
      `Reached level ${newLevel} — ${getRankTitle(newLevel)}`,
      { oldLevel, newLevel, rank: getRankTitle(newLevel) },
    );
  }

  await db("player_progression")
    .where({ player_id: playerId })
    .update(updateData);

  return {
    xpAwarded: amount,
    totalXp: newXp,
    level: newLevel,
    rank: getRankTitle(newLevel),
    levelUp,
  };
}

async function applyLevelUpBonuses(
  playerId: string,
  oldLevel: number,
  newLevel: number,
): Promise<LevelUpResult> {
  let maxEnergyGain = 0;
  let cargoGain = 0;
  let weaponGain = 0;
  let engineGain = 0;

  for (let lvl = oldLevel + 1; lvl <= newLevel; lvl++) {
    maxEnergyGain += GAME_CONFIG.LEVEL_UP_MAX_ENERGY_BONUS;
    const stat = getLevelUpBonusStat(lvl);
    switch (stat) {
      case "cargo":
        cargoGain++;
        break;
      case "weapon":
        weaponGain++;
        break;
      case "engine":
        engineGain++;
        break;
    }
  }

  // Apply max_energy bonus permanently
  if (maxEnergyGain > 0) {
    await db("players")
      .where({ id: playerId })
      .increment("max_energy", maxEnergyGain);
    await db("players")
      .where({ id: playerId })
      .increment("energy", maxEnergyGain);
  }

  return {
    levelsGained: newLevel - oldLevel,
    oldLevel,
    newLevel,
    newRank: getRankTitle(newLevel),
    bonuses: {
      maxEnergy: maxEnergyGain,
      cargo: cargoGain,
      weapon: weaponGain,
      engine: engineGain,
    },
  };
}

/** Read-only progress fetch for status/profile endpoints. */
export async function getPlayerProgress(
  playerId: string,
): Promise<XpAwardResult> {
  let prog = await db("player_progression")
    .where({ player_id: playerId })
    .first();
  if (!prog) {
    await db("player_progression").insert({
      player_id: playerId,
      level: 1,
      xp: 0,
      total_combat_xp: 0,
      total_mission_xp: 0,
      total_trade_xp: 0,
      total_explore_xp: 0,
    });
    prog = { level: 1, xp: 0 };
  }
  return {
    xpAwarded: 0,
    totalXp: Number(prog.xp),
    level: prog.level,
    rank: getRankTitle(prog.level),
    levelUp: null,
  };
}

/**
 * Compute cumulative level bonuses for a player's current level.
 * Analogous to applyUpgradesToShip() — called alongside it in status and combat.
 * Every level grants a flat max energy bonus. Additionally, each level grants
 * one of cargo/weapon/engine in a rotating pattern (determined by getLevelUpBonusStat).
 * These bonuses stack with ship upgrades and tablet bonuses for the final combat stats.
 */
export async function getPlayerLevelBonuses(playerId: string): Promise<{
  maxEnergyBonus: number;
  cargoBonus: number;
  weaponBonus: number;
  engineBonus: number;
}> {
  const prog = await db("player_progression")
    .where({ player_id: playerId })
    .first();
  const level = prog?.level || 1;

  let maxEnergyBonus = 0;
  let cargoBonus = 0;
  let weaponBonus = 0;
  let engineBonus = 0;

  for (let lvl = 2; lvl <= level; lvl++) {
    maxEnergyBonus += GAME_CONFIG.LEVEL_UP_MAX_ENERGY_BONUS;
    const stat = getLevelUpBonusStat(lvl);
    switch (stat) {
      case "cargo":
        cargoBonus++;
        break;
      case "weapon":
        weaponBonus++;
        break;
      case "engine":
        engineBonus++;
        break;
    }
  }

  return { maxEnergyBonus, cargoBonus, weaponBonus, engineBonus };
}

/**
 * Check if player meets level requirement for a ship type.
 * Ship gates prevent new players from immediately buying the best ships.
 * Gates are defined in GAME_CONFIG.SHIP_LEVEL_GATES — if a ship type isn't
 * listed, it's available to everyone (starter ships, dodge pods).
 */
export async function canAccessShipType(
  playerId: string,
  shipTypeId: string,
): Promise<boolean> {
  const gates = GAME_CONFIG.SHIP_LEVEL_GATES;
  const requiredLevel = gates[shipTypeId];
  if (!requiredLevel) return true;

  const prog = await db("player_progression")
    .where({ player_id: playerId })
    .first();
  return (prog?.level || 1) >= requiredLevel;
}
