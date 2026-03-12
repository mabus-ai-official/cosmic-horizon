import { GAME_CONFIG } from "../config/game";

export interface DeployableState {
  type: string;
  powerLevel: number;
  health: number;
  ownerId: string;
}

export interface MineDetonationResult {
  triggered: boolean;
  damageDealt: number;
  mineDestroyed: boolean;
  type: string;
}

export interface DroneInteractionResult {
  attacked: boolean;
  damageDealt: number;
  droneDestroyed: boolean;
  tollCharged?: number;
}

/**
 * Calculate mine detonation damage when a ship enters a sector.
 * Two mine types create distinct tactical choices:
 * - Halberd: high burst damage, single-use (area denial / ambush)
 * - Barnacle: low initial damage but persists on hull, draining engine
 *   energy over time (pursuit prevention / economic warfare)
 * Damage scales linearly with powerLevel to reward investment.
 */
export function detonateMine(mine: DeployableState): MineDetonationResult {
  if (mine.type === "mine_halberd") {
    const baseDamage = 20 * mine.powerLevel;
    return {
      triggered: true,
      damageDealt: baseDamage,
      mineDestroyed: true,
      type: "mine_halberd",
    };
  }

  if (mine.type === "mine_barnacle") {
    // Barnacle mines drain engine energy over time; initial attach damage is lower
    const baseDamage = 5 * mine.powerLevel;
    return {
      triggered: true,
      damageDealt: baseDamage,
      mineDestroyed: false, // barnacles persist attached to ship
      type: "mine_barnacle",
    };
  }

  return {
    triggered: false,
    damageDealt: 0,
    mineDestroyed: false,
    type: mine.type,
  };
}

/**
 * Resolve drone interaction when a non-allied ship enters a sector with drones.
 * Three drone types serve different player strategies:
 * - Offensive: auto-attack intruders (sector defense)
 * - Toll: charge credits to pass (passive income from trade routes)
 * - Defensive: no entry effect — boosts allied defense during combat instead
 */
export function resolveDroneInteraction(
  drone: DeployableState,
  tollAmount: number | null,
): DroneInteractionResult {
  if (drone.type === "drone_offensive") {
    const damage = 10 * drone.powerLevel;
    return {
      attacked: true,
      damageDealt: damage,
      droneDestroyed: false,
    };
  }

  if (drone.type === "drone_toll") {
    return {
      attacked: false,
      damageDealt: 0,
      droneDestroyed: false,
      tollCharged: tollAmount ?? 100,
    };
  }

  // Defensive drones don't attack on entry, they boost defense for allies
  return { attacked: false, damageDealt: 0, droneDestroyed: false };
}

/**
 * Calculate Rache device detonation damage.
 * The Rache is a last-resort weapon — deals percentage-based AoE damage to
 * ALL ships in sector (including allies). Converts the ship's remaining weapon
 * energy into area damage via the config multiplier. Named after the German
 * word for "revenge" — it's designed to punish gankers at the cost of self-destruction.
 */
export function calculateRacheDamage(weaponEnergy: number): number {
  return Math.floor(weaponEnergy * GAME_CONFIG.RACHE_DAMAGE_MULTIPLIER);
}

/**
 * Apply barnacle mine drain effect per tick.
 * Returns engine energy to drain. The drain is modest (2 * powerLevel) so
 * barnacles are annoying rather than lethal — they slow ships by sapping
 * engine energy, making it harder to flee or warp. Counterplay: visit a
 * Star Mall to remove them (repair action).
 */
export function calculateBarnacleEngineDrain(powerLevel: number): number {
  return 2 * powerLevel;
}
