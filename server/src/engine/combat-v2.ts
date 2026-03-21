/**
 * Combat V2 Engine — Pure math, no I/O. Fully testable.
 *
 * FTL/Void War-inspired simultaneous turn combat:
 * - Power allocation across 4 systems (shields, weapons, engines, sensors)
 * - Targeted subsystem attacks
 * - Weapon cooldowns
 * - Cascade failures when subsystems hit 0 HP
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type SubsystemType =
  | "shields"
  | "weapons"
  | "engines"
  | "sensors"
  | "life_support";

export interface SubsystemState {
  type: SubsystemType;
  currentHp: number;
  maxHp: number;
  isDisabled: boolean;
}

export interface WeaponState {
  slotIndex: number;
  weaponTypeId: string;
  damageBase: number;
  cooldownRounds: number;
  powerCost: number;
  accuracy: number;
  weaponClass: "energy" | "kinetic" | "missile";
  cooldownRemaining: number;
}

export interface CrewMember {
  id: string;
  name: string;
  role: "gunner" | "engineer" | "medic" | "pilot" | "tactician";
  skillLevel: number; // 1-5
  hp: number;
  maxHp: number;
  assignedStation: SubsystemType | null;
  status: "idle" | "stationed" | "injured" | "dead" | "boarding";
}

export type CombatHazard = "asteroid_field" | "nebula" | "solar_flare" | null;

export interface CombatPlayerState {
  playerId: string;
  shipId: string;
  hullHp: number;
  maxHullHp: number;
  reactorPower: number;
  maxReactorPower: number;
  subsystems: SubsystemState[];
  weapons: WeaponState[];
  crew: CrewMember[];
}

export interface PowerAllocation {
  shields: number;
  weapons: number;
  engines: number;
  sensors: number;
}

export interface CombatOrders {
  powerAllocation: PowerAllocation;
  targetSubsystem: SubsystemType;
  fireWeapons: number[]; // slot indices to fire
  flee?: boolean;
  repair?: SubsystemType; // Phase 3: spend power to repair a subsystem
  board?: boolean; // Phase 5: attempt boarding (requires enemy engines disabled)
  hack?: SubsystemType; // Phase 6: spend power to disable enemy subsystem for 1 round
}

export interface WeaponFireResult {
  slotIndex: number;
  weaponTypeId: string;
  hit: boolean;
  damage: number;
  targetSubsystem: SubsystemType;
  subsystemDamage: number;
  hullDamage: number;
}

export interface RoundResolutionSide {
  playerId: string;
  weaponResults: WeaponFireResult[];
  totalDamage: number;
  fleeAttempt: boolean;
  fleeSuccess: boolean;
  subsystemsDisabled: SubsystemType[];
  hullDamageDealt: number;
  repairResult?: { subsystem: SubsystemType; hpRestored: number };
  boardAttempt?: boolean;
  boardSuccess?: boolean;
  hackResult?: { targetSubsystem: SubsystemType; success: boolean };
  crewCasualties?: { name: string; role: string }[];
  hazardDamage?: number;
}

export interface RoundResolution {
  roundNumber: number;
  playerA: RoundResolutionSide;
  playerB: RoundResolutionSide;
  playerAState: CombatPlayerState;
  playerBState: CombatPlayerState;
  combatEnded: boolean;
  endReason?: "destroyed" | "fled" | "mutual_destruction" | "captured";
  destroyedPlayerId?: string;
  fledPlayerId?: string;
  capturedPlayerId?: string;
  hazard?: CombatHazard;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const LIFE_SUPPORT_BLEED_RATE = 0.05; // 5% hull per round when life support disabled
const WEAPONS_DISABLED_PENALTY = 0.5; // 50% damage reduction
const FLEE_BASE_CHANCE = 0.2;
const FLEE_ENGINE_POWER_WEIGHT = 0.4; // engine power fraction contributes to flee
const FLEE_ENGINE_HP_WEIGHT = 0.2; // engine subsystem health contributes to flee

// ─── Core Resolution ─────────────────────────────────────────────────────────

/**
 * Validate that power allocations sum to <= reactor power and are non-negative.
 */
export function validatePowerAllocation(
  alloc: PowerAllocation,
  maxReactorPower: number,
): boolean {
  const total = alloc.shields + alloc.weapons + alloc.engines + alloc.sensors;
  return (
    total <= maxReactorPower &&
    alloc.shields >= 0 &&
    alloc.weapons >= 0 &&
    alloc.engines >= 0 &&
    alloc.sensors >= 0
  );
}

/**
 * Calculate effective stat fractions from power allocation.
 * Each fraction is 0-1 representing what % of reactor is allocated to that system.
 */
function getPowerFractions(
  alloc: PowerAllocation,
  maxReactorPower: number,
): PowerAllocation {
  if (maxReactorPower <= 0) {
    return { shields: 0, weapons: 0, engines: 0, sensors: 0 };
  }
  return {
    shields: alloc.shields / maxReactorPower,
    weapons: alloc.weapons / maxReactorPower,
    engines: alloc.engines / maxReactorPower,
    sensors: alloc.sensors / maxReactorPower,
  };
}

/**
 * Get subsystem by type from a player state.
 */
function getSubsystem(
  state: CombatPlayerState,
  type: SubsystemType,
): SubsystemState | undefined {
  return state.subsystems.find((s) => s.type === type);
}

/**
 * Calculate shield absorption from power allocation and subsystem health.
 * Shields absorb damage proportional to power allocated * subsystem health fraction.
 */
function getShieldAbsorption(
  fractions: PowerAllocation,
  state: CombatPlayerState,
): number {
  const shieldSub = getSubsystem(state, "shields");
  if (!shieldSub || shieldSub.isDisabled) return 0;
  const healthFraction =
    shieldSub.maxHp > 0 ? shieldSub.currentHp / shieldSub.maxHp : 0;
  return fractions.shields * healthFraction;
}

/**
 * Calculate evasion chance from engine power and subsystem health.
 */
function getEvasionBonus(
  fractions: PowerAllocation,
  state: CombatPlayerState,
): number {
  const engineSub = getSubsystem(state, "engines");
  if (!engineSub || engineSub.isDisabled) return 0;
  const healthFraction =
    engineSub.maxHp > 0 ? engineSub.currentHp / engineSub.maxHp : 0;
  return fractions.engines * healthFraction * 0.3; // max 30% evasion bonus
}

/**
 * Calculate accuracy bonus from sensor power and subsystem health.
 */
function getAccuracyBonus(
  fractions: PowerAllocation,
  state: CombatPlayerState,
): number {
  const sensorSub = getSubsystem(state, "sensors");
  if (!sensorSub || sensorSub.isDisabled) return 0;
  const healthFraction =
    sensorSub.maxHp > 0 ? sensorSub.currentHp / sensorSub.maxHp : 0;
  return fractions.sensors * healthFraction * 0.15; // max 15% accuracy bonus
}

/**
 * Calculate weapon damage multiplier from power allocation and subsystem health.
 */
function getWeaponDamageMultiplier(
  fractions: PowerAllocation,
  state: CombatPlayerState,
): number {
  const weaponSub = getSubsystem(state, "weapons");
  const baseMult = weaponSub?.isDisabled ? WEAPONS_DISABLED_PENALTY : 1.0;
  // Power boost: up to +50% damage with full weapon power
  const powerBoost = fractions.weapons * 0.5;
  return baseMult * (1 + powerBoost);
}

/**
 * Process a single weapon firing against a target.
 * Returns the fire result and mutates the defender state in place.
 */
function fireWeapon(
  weapon: WeaponState,
  damageMultiplier: number,
  accuracyBonus: number,
  defenderState: CombatPlayerState,
  defenderFractions: PowerAllocation,
  targetSubsystem: SubsystemType,
  rng: () => number,
): WeaponFireResult {
  const evasionBonus = getEvasionBonus(defenderFractions, defenderState);
  const shieldAbsorption = getShieldAbsorption(
    defenderFractions,
    defenderState,
  );

  // Accuracy check: base accuracy + sensor bonus - evasion
  const hitChance = Math.min(
    0.95,
    Math.max(0.1, weapon.accuracy + accuracyBonus - evasionBonus),
  );
  const hit = rng() < hitChance;

  if (!hit) {
    return {
      slotIndex: weapon.slotIndex,
      weaponTypeId: weapon.weaponTypeId,
      hit: false,
      damage: 0,
      targetSubsystem,
      subsystemDamage: 0,
      hullDamage: 0,
    };
  }

  // Raw damage with multiplier
  const rawDamage = Math.max(
    1,
    Math.round(weapon.damageBase * damageMultiplier),
  );

  // Shield absorption reduces damage (min 1 if hit lands)
  const absorbed = Math.round(rawDamage * shieldAbsorption);
  const afterShields = Math.max(1, rawDamage - absorbed);

  // Damage flows: targeted subsystem first, overflow to hull
  const targetSub = getSubsystem(defenderState, targetSubsystem);
  let subsystemDmg = 0;
  let hullDmg = 0;

  if (targetSub && !targetSub.isDisabled && targetSub.currentHp > 0) {
    subsystemDmg = Math.min(afterShields, targetSub.currentHp);
    targetSub.currentHp -= subsystemDmg;
    if (targetSub.currentHp <= 0) {
      targetSub.currentHp = 0;
      targetSub.isDisabled = true;
    }
    hullDmg = afterShields - subsystemDmg;
  } else {
    // Subsystem already disabled — all damage goes to hull
    hullDmg = afterShields;
  }

  if (hullDmg > 0) {
    defenderState.hullHp = Math.max(0, defenderState.hullHp - hullDmg);
  }

  return {
    slotIndex: weapon.slotIndex,
    weaponTypeId: weapon.weaponTypeId,
    hit: true,
    damage: afterShields,
    targetSubsystem,
    subsystemDamage: subsystemDmg,
    hullDamage: hullDmg,
  };
}

/**
 * Process one side's attacks for a round.
 * Mutates defenderState in place. Returns resolution data for that side.
 */
function processAttacks(
  attacker: CombatPlayerState,
  attackerOrders: CombatOrders,
  defender: CombatPlayerState,
  defenderOrders: CombatOrders,
  rng: () => number,
): RoundResolutionSide {
  const attackerFractions = getPowerFractions(
    attackerOrders.powerAllocation,
    attacker.maxReactorPower,
  );
  const defenderFractions = getPowerFractions(
    defenderOrders.powerAllocation,
    defender.maxReactorPower,
  );

  const damageMultiplier = getWeaponDamageMultiplier(
    attackerFractions,
    attacker,
  );
  const accuracyBonus = getAccuracyBonus(attackerFractions, attacker);

  const weaponResults: WeaponFireResult[] = [];
  let totalDamage = 0;
  let hullDamageDealt = 0;

  // Fire each selected weapon
  for (const slotIdx of attackerOrders.fireWeapons) {
    const weapon = attacker.weapons.find((w) => w.slotIndex === slotIdx);
    if (!weapon || weapon.cooldownRemaining > 0) continue;

    // Check power cost
    const powerAvailable =
      attackerOrders.powerAllocation.weapons >= weapon.powerCost;
    if (!powerAvailable) continue;

    const result = fireWeapon(
      weapon,
      damageMultiplier,
      accuracyBonus,
      defender,
      defenderFractions,
      attackerOrders.targetSubsystem,
      rng,
    );

    weaponResults.push(result);
    totalDamage += result.damage;
    hullDamageDealt += result.hullDamage;

    // Set cooldown
    weapon.cooldownRemaining = weapon.cooldownRounds;
  }

  // Check for newly disabled subsystems
  const subsystemsDisabled: SubsystemType[] = [];
  for (const sub of defender.subsystems) {
    if (sub.isDisabled && sub.currentHp <= 0) {
      subsystemsDisabled.push(sub.type);
    }
  }

  return {
    playerId: attacker.playerId,
    weaponResults,
    totalDamage,
    fleeAttempt: false,
    fleeSuccess: false,
    subsystemsDisabled,
    hullDamageDealt,
  };
}

/**
 * Attempt to flee. Chance based on engine power allocation and engine subsystem health.
 */
function attemptFleeV2(
  state: CombatPlayerState,
  orders: CombatOrders,
  rng: () => number,
): boolean {
  const fractions = getPowerFractions(
    orders.powerAllocation,
    state.maxReactorPower,
  );
  const engineSub = getSubsystem(state, "engines");

  // Can't flee with disabled engines
  if (!engineSub || engineSub.isDisabled) return false;

  const engineHealthFraction =
    engineSub.maxHp > 0 ? engineSub.currentHp / engineSub.maxHp : 0;
  const fleeChance = Math.min(
    0.85,
    FLEE_BASE_CHANCE +
      fractions.engines * FLEE_ENGINE_POWER_WEIGHT +
      engineHealthFraction * FLEE_ENGINE_HP_WEIGHT,
  );

  return rng() < fleeChance;
}

/**
 * Apply cascade failure effects (life support bleed).
 */
function applyLifeSupportBleed(state: CombatPlayerState): void {
  const lifeSub = getSubsystem(state, "life_support");
  if (lifeSub?.isDisabled) {
    const bleedDamage = Math.max(
      1,
      Math.round(state.maxHullHp * LIFE_SUPPORT_BLEED_RATE),
    );
    state.hullHp = Math.max(0, state.hullHp - bleedDamage);
  }
}

/**
 * Advance weapon cooldowns (decrement by 1 each round).
 */
function advanceCooldowns(weapons: WeaponState[]): void {
  for (const w of weapons) {
    if (w.cooldownRemaining > 0) {
      w.cooldownRemaining--;
    }
  }
}

// ─── Phase 3: Repair ─────────────────────────────────────────────────────────

const REPAIR_POWER_COST = 10;
const REPAIR_HP_PER_POWER = 3;

/**
 * Process a repair action. Costs power, restores subsystem HP.
 * Can only repair non-destroyed subsystems (disabled ones can be repaired back online).
 */
function processRepair(
  state: CombatPlayerState,
  orders: CombatOrders,
): { subsystem: SubsystemType; hpRestored: number } | undefined {
  if (!orders.repair) return undefined;

  const sub = getSubsystem(state, orders.repair);
  if (!sub || sub.currentHp >= sub.maxHp) return undefined;

  // Repair costs power from the weapons allocation (diverting resources)
  const powerAvailable = orders.powerAllocation.weapons;
  if (powerAvailable < REPAIR_POWER_COST) return undefined;

  // Crew bonus: engineer at the station boosts repair
  const engineer = state.crew.find(
    (c) =>
      c.assignedStation === orders.repair &&
      c.role === "engineer" &&
      c.status === "stationed",
  );
  const crewBonus = engineer ? engineer.skillLevel * 0.2 : 0;
  const repairAmount = Math.round(
    REPAIR_HP_PER_POWER * (REPAIR_POWER_COST / 5) * (1 + crewBonus),
  );

  const actualRepair = Math.min(repairAmount, sub.maxHp - sub.currentHp);
  sub.currentHp += actualRepair;

  // Re-enable if it was disabled
  if (sub.isDisabled && sub.currentHp > 0) {
    sub.isDisabled = false;
  }

  return { subsystem: orders.repair, hpRestored: actualRepair };
}

// ─── Phase 4: Crew Bonuses ──────────────────────────────────────────────────

const CREW_ROLE_BONUSES: Record<string, SubsystemType[]> = {
  gunner: ["weapons"],
  engineer: ["engines", "life_support"],
  medic: ["life_support"],
  pilot: ["engines", "sensors"],
  tactician: ["shields", "sensors"],
};

/**
 * Get crew manning bonus for a specific subsystem.
 * Returns a multiplier (e.g., 1.15 = 15% bonus).
 */
export function getCrewBonus(
  crew: CrewMember[],
  subsystem: SubsystemType,
): number {
  let bonus = 0;
  for (const c of crew) {
    if (
      c.assignedStation === subsystem &&
      c.status === "stationed" &&
      c.hp > 0
    ) {
      // Base bonus from skill level
      bonus += c.skillLevel * 0.05;
      // Extra bonus if role matches station
      const roleStations = CREW_ROLE_BONUSES[c.role] || [];
      if (roleStations.includes(subsystem)) {
        bonus += 0.05;
      }
    }
  }
  return 1 + bonus;
}

/**
 * Process crew damage when a subsystem is hit.
 * Crew at the damaged station take proportional damage.
 */
function processCrewDamage(
  state: CombatPlayerState,
  subsystemType: SubsystemType,
  subsystemDamage: number,
  rng: () => number,
): { name: string; role: string }[] {
  const casualties: { name: string; role: string }[] = [];

  for (const c of state.crew) {
    if (c.assignedStation === subsystemType && c.status === "stationed") {
      // 30% chance of taking damage when station is hit
      if (rng() < 0.3) {
        const crewDmg = Math.round(subsystemDamage * 0.5);
        c.hp = Math.max(0, c.hp - crewDmg);
        if (c.hp <= 0) {
          c.status = "dead";
          casualties.push({ name: c.name, role: c.role });
        } else if (c.hp < c.maxHp * 0.3) {
          c.status = "injured";
          c.assignedStation = null;
        }
      }
    }
  }

  return casualties;
}

// ─── Phase 5: Boarding ──────────────────────────────────────────────────────

/**
 * Attempt boarding. Requires enemy engines to be disabled.
 * Resolves crew-vs-crew combat.
 */
function processBoarding(
  attacker: CombatPlayerState,
  defender: CombatPlayerState,
  rng: () => number,
): {
  success: boolean;
  attackerCasualties: string[];
  defenderCasualties: string[];
} {
  const engineSub = getSubsystem(defender, "engines");
  if (!engineSub?.isDisabled) {
    return { success: false, attackerCasualties: [], defenderCasualties: [] };
  }

  // Boarding crew: all non-injured/dead crew participate
  const attackerCrew = attacker.crew.filter(
    (c) => c.status !== "dead" && c.status !== "injured",
  );
  const defenderCrew = defender.crew.filter(
    (c) => c.status !== "dead" && c.status !== "injured",
  );

  if (attackerCrew.length === 0) {
    return { success: false, attackerCasualties: [], defenderCasualties: [] };
  }

  // Simple crew combat: sum of (hp * skill) for each side + randomness
  const attackerStrength =
    attackerCrew.reduce((s, c) => s + c.hp * c.skillLevel, 0) *
    (0.8 + rng() * 0.4);
  const defenderStrength =
    defenderCrew.reduce((s, c) => s + c.hp * c.skillLevel, 0) *
    (0.8 + rng() * 0.4);

  // If no defender crew, auto-win
  const success =
    defenderCrew.length === 0 || attackerStrength > defenderStrength;

  const attackerCasualties: string[] = [];
  const defenderCasualties: string[] = [];

  if (success) {
    // Defender crew defeated
    for (const c of defenderCrew) {
      c.hp = 0;
      c.status = "dead";
      defenderCasualties.push(c.name);
    }
    // Attacker loses some crew (proportional to strength ratio)
    const lossRatio =
      defenderCrew.length > 0
        ? Math.min(0.6, defenderStrength / (attackerStrength + 1))
        : 0;
    for (const c of attackerCrew) {
      if (rng() < lossRatio) {
        c.hp = 0;
        c.status = "dead";
        attackerCasualties.push(c.name);
      }
    }
  } else {
    // Boarding repelled — attacker crew takes heavy losses
    for (const c of attackerCrew) {
      if (rng() < 0.5) {
        c.hp = 0;
        c.status = "dead";
        attackerCasualties.push(c.name);
      }
    }
  }

  return { success, attackerCasualties, defenderCasualties };
}

// ─── Phase 6: Environment Hazards ───────────────────────────────────────────

const HAZARD_EFFECTS: Record<
  string,
  {
    hullDamageRange: [number, number];
    subsystemEffect?: SubsystemType;
  }
> = {
  asteroid_field: { hullDamageRange: [3, 12] },
  nebula: { hullDamageRange: [0, 0], subsystemEffect: "sensors" },
  solar_flare: { hullDamageRange: [5, 15] },
};

/**
 * Apply environment hazard effects to both combatants.
 */
function applyHazardEffects(
  state: CombatPlayerState,
  hazard: CombatHazard,
  rng: () => number,
): number {
  if (!hazard) return 0;

  const effect = HAZARD_EFFECTS[hazard];
  if (!effect) return 0;

  // Random hull damage
  const [min, max] = effect.hullDamageRange;
  const damage = min + Math.round(rng() * (max - min));
  if (damage > 0) {
    state.hullHp = Math.max(0, state.hullHp - damage);
  }

  // Subsystem debuff (sensors disabled in nebula)
  if (effect.subsystemEffect) {
    const sub = getSubsystem(state, effect.subsystemEffect);
    if (sub && !sub.isDisabled) {
      // Reduce effectiveness by 50% (halve current HP temporarily — restored after combat)
      sub.currentHp = Math.max(1, Math.round(sub.currentHp * 0.5));
    }
  }

  return damage;
}

/**
 * Process hacking action. Costs power, temporarily disables an enemy subsystem.
 */
function processHacking(
  attacker: CombatPlayerState,
  orders: CombatOrders,
  defender: CombatPlayerState,
  rng: () => number,
): { targetSubsystem: SubsystemType; success: boolean } | undefined {
  if (!orders.hack) return undefined;

  const HACK_POWER_COST = 15;
  const sensorPower = orders.powerAllocation.sensors;
  if (sensorPower < HACK_POWER_COST) return undefined;

  // Success chance based on sensor power + crew tactician
  const tactician = attacker.crew.find(
    (c) =>
      c.assignedStation === "sensors" &&
      c.role === "tactician" &&
      c.status === "stationed",
  );
  const baseChance = 0.4;
  const sensorBonus = (sensorPower / attacker.maxReactorPower) * 0.2;
  const crewBonus = tactician ? tactician.skillLevel * 0.05 : 0;
  const hackChance = Math.min(0.8, baseChance + sensorBonus + crewBonus);

  const success = rng() < hackChance;

  if (success) {
    const targetSub = getSubsystem(defender, orders.hack);
    if (targetSub && !targetSub.isDisabled) {
      // Temporarily disable for this round (will re-enable next round if HP > 0)
      targetSub.isDisabled = true;
    }
  }

  return { targetSubsystem: orders.hack, success };
}

// ─── Main Resolution ─────────────────────────────────────────────────────────

/**
 * Resolve a complete round of simultaneous combat.
 * Both sides' attacks are calculated from the START-of-round state,
 * then applied simultaneously. This prevents first-mover advantage.
 *
 * @param playerA - Player A's combat state (mutated in place)
 * @param ordersA - Player A's orders for this round
 * @param playerB - Player B's combat state (mutated in place)
 * @param ordersB - Player B's orders for this round
 * @param roundNumber - Current round number
 * @param rng - Random number generator (0-1), injectable for testing
 */
export function resolveRound(
  playerA: CombatPlayerState,
  ordersA: CombatOrders,
  playerB: CombatPlayerState,
  ordersB: CombatOrders,
  roundNumber: number,
  rng: () => number = Math.random,
  hazard: CombatHazard = null,
): RoundResolution {
  // Handle flee attempts first
  let aFleeAttempt = !!ordersA.flee;
  let bFleeAttempt = !!ordersB.flee;
  let aFleeSuccess = false;
  let bFleeSuccess = false;

  if (aFleeAttempt) {
    aFleeSuccess = attemptFleeV2(playerA, ordersA, rng);
  }
  if (bFleeAttempt) {
    bFleeSuccess = attemptFleeV2(playerB, ordersB, rng);
  }

  // If someone flees successfully, skip combat
  if (aFleeSuccess || bFleeSuccess) {
    return {
      roundNumber,
      playerA: {
        playerId: playerA.playerId,
        weaponResults: [],
        totalDamage: 0,
        fleeAttempt: aFleeAttempt,
        fleeSuccess: aFleeSuccess,
        subsystemsDisabled: [],
        hullDamageDealt: 0,
      },
      playerB: {
        playerId: playerB.playerId,
        weaponResults: [],
        totalDamage: 0,
        fleeAttempt: bFleeAttempt,
        fleeSuccess: bFleeSuccess,
        subsystemsDisabled: [],
        hullDamageDealt: 0,
      },
      playerAState: playerA,
      playerBState: playerB,
      combatEnded: true,
      endReason: "fled",
      fledPlayerId: aFleeSuccess ? playerA.playerId : playerB.playerId,
      hazard,
    };
  }

  // Phase 5: Handle boarding attempts
  let aBoardAttempt = !!ordersA.board;
  let bBoardAttempt = !!ordersB.board;
  let aBoardSuccess = false;
  let bBoardSuccess = false;
  let capturedPlayerId: string | undefined;

  if (aBoardAttempt) {
    const result = processBoarding(playerA, playerB, rng);
    aBoardSuccess = result.success;
    if (aBoardSuccess) {
      capturedPlayerId = playerB.playerId;
    }
  }
  if (bBoardAttempt && !capturedPlayerId) {
    const result = processBoarding(playerB, playerA, rng);
    bBoardSuccess = result.success;
    if (bBoardSuccess) {
      capturedPlayerId = playerA.playerId;
    }
  }

  if (capturedPlayerId) {
    return {
      roundNumber,
      playerA: {
        playerId: playerA.playerId,
        weaponResults: [],
        totalDamage: 0,
        fleeAttempt: false,
        fleeSuccess: false,
        subsystemsDisabled: [],
        hullDamageDealt: 0,
        boardAttempt: aBoardAttempt,
        boardSuccess: aBoardSuccess,
      },
      playerB: {
        playerId: playerB.playerId,
        weaponResults: [],
        totalDamage: 0,
        fleeAttempt: false,
        fleeSuccess: false,
        subsystemsDisabled: [],
        hullDamageDealt: 0,
        boardAttempt: bBoardAttempt,
        boardSuccess: bBoardSuccess,
      },
      playerAState: playerA,
      playerBState: playerB,
      combatEnded: true,
      endReason: "captured",
      capturedPlayerId,
      hazard,
    };
  }

  // Phase 3: Process repairs (before combat damage)
  const aRepairResult = processRepair(playerA, ordersA);
  const bRepairResult = processRepair(playerB, ordersB);

  // Phase 6: Process hacking (before combat damage)
  const aHackResult = processHacking(playerA, ordersA, playerB, rng);
  const bHackResult = processHacking(playerB, ordersB, playerA, rng);

  // Deep clone defender states for simultaneous resolution
  const bStateForAAttack = structuredClone(playerB);
  const aStateForBAttack = structuredClone(playerA);

  // Process A's attacks against B
  const sideA = processAttacks(
    playerA,
    ordersA,
    bStateForAAttack,
    ordersB,
    rng,
  );
  // Process B's attacks against A
  const sideB = processAttacks(
    playerB,
    ordersB,
    aStateForBAttack,
    ordersA,
    rng,
  );

  // Apply damage simultaneously
  playerA.hullHp = aStateForBAttack.hullHp;
  playerA.subsystems = aStateForBAttack.subsystems;
  playerB.hullHp = bStateForAAttack.hullHp;
  playerB.subsystems = bStateForAAttack.subsystems;

  // Phase 4: Process crew damage from subsystem hits
  const aCasualties: { name: string; role: string }[] = [];
  const bCasualties: { name: string; role: string }[] = [];
  for (const wr of sideB.weaponResults) {
    if (wr.hit && wr.subsystemDamage > 0) {
      aCasualties.push(
        ...processCrewDamage(
          playerA,
          wr.targetSubsystem,
          wr.subsystemDamage,
          rng,
        ),
      );
    }
  }
  for (const wr of sideA.weaponResults) {
    if (wr.hit && wr.subsystemDamage > 0) {
      bCasualties.push(
        ...processCrewDamage(
          playerB,
          wr.targetSubsystem,
          wr.subsystemDamage,
          rng,
        ),
      );
    }
  }

  // Phase 6: Apply environment hazards
  let aHazardDmg = 0;
  let bHazardDmg = 0;
  if (hazard) {
    aHazardDmg = applyHazardEffects(playerA, hazard, rng);
    bHazardDmg = applyHazardEffects(playerB, hazard, rng);
  }

  // Apply life support bleed
  applyLifeSupportBleed(playerA);
  applyLifeSupportBleed(playerB);

  // Advance weapon cooldowns
  advanceCooldowns(playerA.weapons);
  advanceCooldowns(playerB.weapons);

  // Re-enable hacked subsystems (hack only lasts 1 round)
  for (const sub of playerA.subsystems) {
    if (sub.isDisabled && sub.currentHp > 0) sub.isDisabled = false;
  }
  for (const sub of playerB.subsystems) {
    if (sub.isDisabled && sub.currentHp > 0) sub.isDisabled = false;
  }

  // Update side results
  sideA.fleeAttempt = aFleeAttempt;
  sideA.fleeSuccess = aFleeSuccess;
  sideA.repairResult = aRepairResult;
  sideA.hackResult = aHackResult;
  sideA.boardAttempt = aBoardAttempt;
  sideA.boardSuccess = aBoardSuccess;
  sideA.crewCasualties = bCasualties; // B's crew casualties from A's attacks
  sideA.hazardDamage = aHazardDmg;

  sideB.fleeAttempt = bFleeAttempt;
  sideB.fleeSuccess = bFleeSuccess;
  sideB.repairResult = bRepairResult;
  sideB.hackResult = bHackResult;
  sideB.boardAttempt = bBoardAttempt;
  sideB.boardSuccess = bBoardSuccess;
  sideB.crewCasualties = aCasualties; // A's crew casualties from B's attacks
  sideB.hazardDamage = bHazardDmg;

  // Recalculate disabled subsystems
  sideA.subsystemsDisabled = playerB.subsystems
    .filter((s) => s.isDisabled)
    .map((s) => s.type);
  sideB.subsystemsDisabled = playerA.subsystems
    .filter((s) => s.isDisabled)
    .map((s) => s.type);

  // Check end conditions
  const aDestroyed = playerA.hullHp <= 0;
  const bDestroyed = playerB.hullHp <= 0;

  let combatEnded = false;
  let endReason: RoundResolution["endReason"];
  let destroyedPlayerId: string | undefined;

  if (aDestroyed && bDestroyed) {
    combatEnded = true;
    endReason = "mutual_destruction";
  } else if (aDestroyed) {
    combatEnded = true;
    endReason = "destroyed";
    destroyedPlayerId = playerA.playerId;
  } else if (bDestroyed) {
    combatEnded = true;
    endReason = "destroyed";
    destroyedPlayerId = playerB.playerId;
  }

  return {
    roundNumber,
    playerA: sideA,
    playerB: sideB,
    playerAState: playerA,
    playerBState: playerB,
    combatEnded,
    endReason,
    destroyedPlayerId,
    fledPlayerId: undefined,
    hazard,
  };
}

// ─── NPC AI ──────────────────────────────────────────────────────────────────

/**
 * Generate simple NPC combat orders.
 * - 40% weapons, 30% shields, 20% engines, 10% sensors
 * - Target lowest-HP subsystem on the opponent
 * - Fire all ready weapons
 */
export function generateNPCOrders(
  npcState: CombatPlayerState,
  opponentState: CombatPlayerState,
): CombatOrders {
  const reactor = npcState.maxReactorPower;

  const powerAllocation: PowerAllocation = {
    weapons: Math.round(reactor * 0.4),
    shields: Math.round(reactor * 0.3),
    engines: Math.round(reactor * 0.2),
    sensors:
      reactor -
      Math.round(reactor * 0.4) -
      Math.round(reactor * 0.3) -
      Math.round(reactor * 0.2),
  };

  // Target the lowest-HP non-disabled subsystem
  const validTargets = opponentState.subsystems
    .filter((s) => !s.isDisabled && s.currentHp > 0)
    .sort((a, b) => a.currentHp - b.currentHp);

  const targetSubsystem: SubsystemType =
    validTargets.length > 0 ? validTargets[0].type : "shields";

  // Fire all ready weapons
  const fireWeapons = npcState.weapons
    .filter((w) => w.cooldownRemaining === 0)
    .map((w) => w.slotIndex);

  return {
    powerAllocation,
    targetSubsystem,
    fireWeapons,
    flee: false,
  };
}

/**
 * Generate default defensive orders (used when timer expires).
 * All power to shields, no weapons fired.
 */
export function generateDefaultOrders(state: CombatPlayerState): CombatOrders {
  return {
    powerAllocation: {
      shields: state.maxReactorPower,
      weapons: 0,
      engines: 0,
      sensors: 0,
    },
    targetSubsystem: "shields",
    fireWeapons: [],
    flee: false,
  };
}
