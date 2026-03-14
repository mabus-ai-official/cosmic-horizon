import { GAME_CONFIG } from "../config/game";

export interface DecayInput {
  colonists: number;
  hoursInactive: number;
  inactiveThresholdHours: number;
}

export interface DecayResult {
  newColonists: number;
  decayed: boolean;
}

/**
 * Process colonist decay for an inactive player's planets.
 * Decay kicks in only after the inactivity threshold (grace period for
 * offline players). Once active, colonists decay proportionally to days
 * inactive — capped at 1 day's worth per tick to prevent total wipeout.
 * This mechanic encourages regular play without being punitive for short breaks.
 */
export function processDecay(input: DecayInput): DecayResult {
  if (input.hoursInactive < input.inactiveThresholdHours) {
    return { newColonists: input.colonists, decayed: false };
  }

  const daysInactive =
    (input.hoursInactive - input.inactiveThresholdHours) / 24;
  const decayFactor =
    1 - GAME_CONFIG.DECAY_COLONIST_RATE * Math.min(daysInactive, 1);
  const newColonists = Math.max(0, Math.floor(input.colonists * decayFactor));

  return {
    newColonists,
    decayed: newColonists < input.colonists,
  };
}

/**
 * Drain planetary defense energy each tick. Defenses deplete over time
 * even without combat — players must actively maintain them. Drain is
 * proportional to max energy so larger installations decay faster,
 * creating a cost/benefit tradeoff for heavy fortification.
 */
export function processDefenseDecay(
  currentEnergy: number,
  maxEnergy: number,
): number {
  const drain = Math.ceil(maxEnergy * GAME_CONFIG.DECAY_DEFENSE_DRAIN_RATE);
  return Math.max(0, currentEnergy - drain);
}

/**
 * Check whether a deployable (mine, drone, etc.) has expired.
 * Expiration is based on time since last maintenance, not deployment date —
 * players can extend a deployable's life by visiting and maintaining it.
 * This is the authoritative version; the duplicate in deployables.ts was removed.
 */
export function isDeployableExpired(
  deployedAt: Date,
  lastMaintainedAt: Date,
  now: Date = new Date(),
): boolean {
  const lifetimeMs = GAME_CONFIG.DEPLOYABLE_LIFETIME_DAYS * 24 * 60 * 60 * 1000;
  return now.getTime() - lastMaintainedAt.getTime() > lifetimeMs;
}
