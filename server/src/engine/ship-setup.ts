/**
 * Ship Setup — creates combat V2 subsystems and weapon slots for a new ship.
 * Called from: ship purchase (api/ships.ts), dodge pod spawn (combat-rewards.ts),
 * NPC spawning (story-npcs.ts), and anywhere else a ship is created.
 */

import db from "../db/connection";

/** Subsystem + reactor baselines per ship type — matches migration 067 */
const SHIP_COMBAT_STATS: Record<
  string,
  {
    reactor: number;
    shield: number;
    weapon: number;
    engine: number;
    sensor: number;
    life: number;
    slots: number;
  }
> = {
  dodge_pod: {
    reactor: 5,
    shield: 0,
    weapon: 0,
    engine: 10,
    sensor: 5,
    life: 5,
    slots: 0,
  },
  scout: {
    reactor: 30,
    shield: 25,
    weapon: 20,
    engine: 30,
    sensor: 15,
    life: 15,
    slots: 2,
  },
  freighter: {
    reactor: 25,
    shield: 35,
    weapon: 15,
    engine: 25,
    sensor: 10,
    life: 20,
    slots: 1,
  },
  corvette: {
    reactor: 50,
    shield: 40,
    weapon: 35,
    engine: 30,
    sensor: 20,
    life: 20,
    slots: 3,
  },
  cruiser: {
    reactor: 70,
    shield: 60,
    weapon: 50,
    engine: 40,
    sensor: 30,
    life: 25,
    slots: 4,
  },
  battleship: {
    reactor: 90,
    shield: 75,
    weapon: 65,
    engine: 35,
    sensor: 25,
    life: 25,
    slots: 5,
  },
  stealth: {
    reactor: 35,
    shield: 15,
    weapon: 20,
    engine: 35,
    sensor: 40,
    life: 15,
    slots: 2,
  },
  colony_ship: {
    reactor: 20,
    shield: 30,
    weapon: 10,
    engine: 20,
    sensor: 10,
    life: 30,
    slots: 1,
  },
};

/**
 * Initialize combat V2 data for a newly created ship.
 * Sets reactor power, creates subsystem rows, and equips default weapons (pulse lasers).
 *
 * @param shipId - The ship's UUID
 * @param shipTypeId - The ship type (e.g., "scout", "battleship")
 * @param hpFraction - Optional HP fraction for scaling (1.0 = full, used for NPCs)
 */
export async function setupShipCombatData(
  shipId: string,
  shipTypeId: string,
  hpFraction: number = 1.0,
): Promise<void> {
  const stats = SHIP_COMBAT_STATS[shipTypeId];
  if (!stats) return;

  // Update reactor power and weapon slot count on the ship
  await db("ships").where({ id: shipId }).update({
    reactor_power: stats.reactor,
    max_reactor_power: stats.reactor,
    weapon_slot_count: stats.slots,
  });

  // Create subsystem rows
  const subsystems = [
    { type: "shields", hp: stats.shield },
    { type: "weapons", hp: stats.weapon },
    { type: "engines", hp: stats.engine },
    { type: "sensors", hp: stats.sensor },
    { type: "life_support", hp: stats.life },
  ];

  for (const sub of subsystems) {
    const scaledHp = Math.max(0, Math.round(sub.hp * hpFraction));
    await db("ship_subsystems").insert({
      ship_id: shipId,
      subsystem_type: sub.type,
      current_hp: scaledHp,
      max_hp: sub.hp,
      is_disabled: scaledHp <= 0,
    });
  }

  // Equip default weapons (pulse lasers)
  for (let i = 0; i < stats.slots; i++) {
    await db("weapon_slots").insert({
      ship_id: shipId,
      weapon_type_id: "pulse_laser",
      slot_index: i,
      cooldown_remaining: 0,
    });
  }
}
