import { GAME_CONFIG } from "../config/game";

export interface CombatState {
  weaponEnergy: number;
  engineEnergy: number;
  hullHp: number;
  attackRatio: number;
  defenseRatio: number;
}

export interface CombatVolleyResult {
  damageDealt: number;
  attackerEnergySpent: number;
  defenderWeaponEnergyRemaining: number;
  defenderEngineEnergyRemaining: number;
  defenderHullHpRemaining: number;
  defenderDestroyed: boolean;
}

export interface FleeResult {
  success: boolean;
  fleeChance: number;
}

/**
 * Calculate raw damage from a single combat volley.
 * Damage scales linearly with energy spent, modified by the attacker/defender
 * ratio (ship class + race bonuses). Minimum 1 damage prevents zero-damage stalls.
 */
export function calculateDamage(
  energyExpended: number,
  attackRatio: number,
  defenseRatio: number,
): number {
  const effectiveRatio = attackRatio / defenseRatio;
  return Math.max(1, Math.round(energyExpended * effectiveRatio));
}

/**
 * Resolve one combat volley between attacker and defender.
 * Energy-proportional overkill refund: if the volley would deal more damage
 * than the defender has hull HP, the attacker only spends the proportional
 * energy needed. This prevents "wasting" a full volley on a nearly-dead ship.
 * Damage bypasses weapon/engine energy and hits hull directly — shields are
 * a separate system (tablet bonuses add to hull HP pool).
 */
export function resolveCombatVolley(
  attacker: CombatState,
  defender: CombatState,
  energyToExpend: number,
): CombatVolleyResult {
  const actualExpend = Math.min(energyToExpend, attacker.weaponEnergy);

  if (actualExpend === 0) {
    return {
      damageDealt: 0,
      attackerEnergySpent: 0,
      defenderWeaponEnergyRemaining: defender.weaponEnergy,
      defenderEngineEnergyRemaining: defender.engineEnergy,
      defenderHullHpRemaining: defender.hullHp,
      defenderDestroyed: false,
    };
  }

  const rawDamage = calculateDamage(
    actualExpend,
    attacker.attackRatio,
    defender.defenseRatio,
  );

  // Damage applies to hull HP directly
  const actualDamage = Math.min(rawDamage, defender.hullHp);

  // If overkill, attacker only spends proportional energy
  let attackerEnergySpent: number;
  if (rawDamage > defender.hullHp && actualExpend > 0) {
    attackerEnergySpent = Math.max(
      1,
      Math.ceil((defender.hullHp / rawDamage) * actualExpend),
    );
  } else {
    attackerEnergySpent = actualExpend;
  }

  const hullRemaining = Math.max(0, defender.hullHp - actualDamage);
  const destroyed = hullRemaining === 0;

  return {
    damageDealt: actualDamage,
    attackerEnergySpent,
    defenderWeaponEnergyRemaining: defender.weaponEnergy,
    defenderEngineEnergyRemaining: defender.engineEnergy,
    defenderHullHpRemaining: hullRemaining,
    defenderDestroyed: destroyed,
  };
}

/**
 * Attempt to flee from combat. Flee chance increases with more attackers
 * present in the sector (counterintuitive but intentional — more chaos = easier
 * to slip away). rngValue is injected for deterministic testing.
 * Capped at 90% to always leave some risk. Tablet flee bonuses are applied
 * by the caller after this returns.
 */
export function attemptFlee(
  numAttackers: number,
  rngValue: number, // 0-1, pass in for testability
): FleeResult {
  const fleeChance = Math.min(
    0.9,
    GAME_CONFIG.MIN_FLEE_CHANCE +
      (numAttackers - 1) * GAME_CONFIG.MULTI_SHIP_FLEE_BONUS,
  );
  return {
    success: rngValue < fleeChance,
    fleeChance,
  };
}
