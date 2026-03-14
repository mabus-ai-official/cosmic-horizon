import { GAME_CONFIG } from "../config/game";

export type ActionType =
  | "move"
  | "trade"
  | "combat_volley"
  | "deploy"
  | "planet_management"
  | "investigate"
  | "warp"
  | "harvest"
  | "salvage"
  | "ransack"
  | "escort"
  | "bombard";

const AP_COSTS: Record<ActionType, number> = {
  move: GAME_CONFIG.AP_COST_MOVE,
  trade: GAME_CONFIG.AP_COST_TRADE,
  combat_volley: GAME_CONFIG.AP_COST_COMBAT_VOLLEY,
  deploy: GAME_CONFIG.AP_COST_DEPLOY,
  planet_management: 0,
  investigate: GAME_CONFIG.AP_COST_INVESTIGATE,
  warp: GAME_CONFIG.AP_COST_WARP,
  harvest: GAME_CONFIG.AP_COST_HARVEST,
  salvage: GAME_CONFIG.AP_COST_SALVAGE,
  ransack: GAME_CONFIG.AP_COST_RANSACK,
  escort: GAME_CONFIG.AP_COST_ESCORT,
  bombard: GAME_CONFIG.AP_COST_BOMBARD,
};

/**
 * Calculate energy regeneration over elapsed time.
 * Energy is the universal action currency — every move, trade, and combat
 * volley costs AP. Regen is time-based (not turn-based) so offline players
 * still recover. The bonus multiplier comes from docking at outposts or
 * specific race perks, incentivizing strategic positioning during downtime.
 */
export function calculateEnergyRegen(
  currentEnergy: number,
  maxEnergy: number,
  minutesPassed: number,
  hasBonus: boolean,
): number {
  const rate = hasBonus
    ? GAME_CONFIG.ENERGY_REGEN_RATE * GAME_CONFIG.ENERGY_REGEN_BONUS_MULTIPLIER
    : GAME_CONFIG.ENERGY_REGEN_RATE;
  return Math.min(maxEnergy, currentEnergy + rate * minutesPassed);
}

/**
 * Check if the player has enough energy (AP) to perform an action.
 * Used as a guard before every energy-consuming operation. Planet management
 * is free (cost 0) to avoid punishing players for colony admin work.
 */
export function canAffordAction(
  currentEnergy: number,
  action: ActionType,
): boolean {
  return currentEnergy >= AP_COSTS[action];
}

/**
 * Deduct energy for an action. Caller must verify affordability first via
 * canAffordAction(). Returns the new energy value (does not clamp to zero
 * since the check should have already passed).
 */
export function deductEnergy(
  currentEnergy: number,
  action: ActionType,
): number {
  return currentEnergy - AP_COSTS[action];
}

/** Look up the AP cost for an action type. Used by API handlers to report
 * costs to the client for UI display and error messages. */
export function getActionCost(action: ActionType): number {
  return AP_COSTS[action];
}
