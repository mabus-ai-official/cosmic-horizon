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

export function canAffordAction(
  currentEnergy: number,
  action: ActionType,
): boolean {
  return currentEnergy >= AP_COSTS[action];
}

export function deductEnergy(
  currentEnergy: number,
  action: ActionType,
): number {
  return currentEnergy - AP_COSTS[action];
}

export function getActionCost(action: ActionType): number {
  return AP_COSTS[action];
}
