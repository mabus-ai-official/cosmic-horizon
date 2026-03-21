import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // -- weapon_types: config table for weapon definitions --
  await knex.schema.createTable("weapon_types", (t) => {
    t.string("id", 32).primary();
    t.string("name").notNullable();
    t.text("description");
    t.integer("damage_base").notNullable();
    t.integer("cooldown_rounds").notNullable().defaultTo(1);
    t.integer("power_cost").notNullable();
    t.float("accuracy").notNullable().defaultTo(0.9);
    t.string("weapon_class", 16).notNullable(); // energy | kinetic | missile
    t.integer("price").notNullable().defaultTo(0);
  });

  // -- ship_subsystems: per-ship subsystem health pools (5 per ship) --
  await knex.schema.createTable("ship_subsystems", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("(lower(hex(randomblob(16))))"));
    t.uuid("ship_id")
      .notNullable()
      .references("id")
      .inTable("ships")
      .onDelete("CASCADE");
    t.string("subsystem_type", 16).notNullable(); // shields|weapons|engines|sensors|life_support
    t.integer("current_hp").notNullable();
    t.integer("max_hp").notNullable();
    t.boolean("is_disabled").notNullable().defaultTo(false);
    t.unique(["ship_id", "subsystem_type"]);
  });

  // -- weapon_slots: weapons installed on a ship --
  await knex.schema.createTable("weapon_slots", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("(lower(hex(randomblob(16))))"));
    t.uuid("ship_id")
      .notNullable()
      .references("id")
      .inTable("ships")
      .onDelete("CASCADE");
    t.string("weapon_type_id", 32)
      .notNullable()
      .references("id")
      .inTable("weapon_types");
    t.integer("slot_index").notNullable();
    t.integer("cooldown_remaining").notNullable().defaultTo(0);
    t.unique(["ship_id", "slot_index"]);
  });

  // -- combat_sessions: active combat engagements --
  await knex.schema.createTable("combat_sessions", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("(lower(hex(randomblob(16))))"));
    t.uuid("attacker_id").notNullable().references("id").inTable("players");
    t.uuid("defender_id").notNullable().references("id").inTable("players");
    t.integer("sector_id").notNullable().references("id").inTable("sectors");
    t.string("status", 16).notNullable().defaultTo("active"); // active|resolved|fled|destroyed
    t.integer("current_round").notNullable().defaultTo(1);
    t.timestamp("round_deadline").nullable();
    t.uuid("winner_id").nullable();
    t.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    t.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
  });

  // -- combat_rounds: per-round orders and resolution --
  await knex.schema.createTable("combat_rounds", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("(lower(hex(randomblob(16))))"));
    t.uuid("session_id")
      .notNullable()
      .references("id")
      .inTable("combat_sessions")
      .onDelete("CASCADE");
    t.integer("round_number").notNullable();
    t.uuid("player_a_id").notNullable().references("id").inTable("players");
    t.uuid("player_b_id").notNullable().references("id").inTable("players");
    t.json("player_a_orders").nullable();
    t.json("player_b_orders").nullable();
    t.timestamp("player_a_submitted_at").nullable();
    t.timestamp("player_b_submitted_at").nullable();
    t.boolean("resolved").notNullable().defaultTo(false);
    t.json("resolution_data").nullable();
    t.unique(["session_id", "round_number"]);
  });

  // -- Alter ship_types: add reactor + subsystem baselines --
  await knex.raw(
    `ALTER TABLE ship_types ADD COLUMN base_reactor_power INTEGER NOT NULL DEFAULT 30`,
  );
  await knex.raw(
    `ALTER TABLE ship_types ADD COLUMN max_reactor_power INTEGER NOT NULL DEFAULT 30`,
  );
  await knex.raw(
    `ALTER TABLE ship_types ADD COLUMN base_shield_hp INTEGER NOT NULL DEFAULT 25`,
  );
  await knex.raw(
    `ALTER TABLE ship_types ADD COLUMN base_weapon_hp INTEGER NOT NULL DEFAULT 20`,
  );
  await knex.raw(
    `ALTER TABLE ship_types ADD COLUMN base_engine_hp INTEGER NOT NULL DEFAULT 30`,
  );
  await knex.raw(
    `ALTER TABLE ship_types ADD COLUMN base_sensor_hp INTEGER NOT NULL DEFAULT 15`,
  );
  await knex.raw(
    `ALTER TABLE ship_types ADD COLUMN base_life_support_hp INTEGER NOT NULL DEFAULT 15`,
  );
  await knex.raw(
    `ALTER TABLE ship_types ADD COLUMN weapon_slot_count INTEGER NOT NULL DEFAULT 1`,
  );

  // -- Alter ships: add reactor + weapon_slot_count --
  await knex.raw(
    `ALTER TABLE ships ADD COLUMN reactor_power INTEGER NOT NULL DEFAULT 30`,
  );
  await knex.raw(
    `ALTER TABLE ships ADD COLUMN max_reactor_power INTEGER NOT NULL DEFAULT 30`,
  );
  await knex.raw(
    `ALTER TABLE ships ADD COLUMN weapon_slot_count INTEGER NOT NULL DEFAULT 1`,
  );

  // -- Seed weapon_types --
  await knex("weapon_types").insert([
    {
      id: "pulse_laser",
      name: "Pulse Laser",
      description: "Standard energy weapon. Reliable and efficient.",
      damage_base: 8,
      cooldown_rounds: 1,
      power_cost: 5,
      accuracy: 0.9,
      weapon_class: "energy",
      price: 0,
    },
    {
      id: "beam_cannon",
      name: "Beam Cannon",
      description: "Focused energy beam. High damage, moderate cooldown.",
      damage_base: 15,
      cooldown_rounds: 2,
      power_cost: 10,
      accuracy: 0.85,
      weapon_class: "energy",
      price: 5000,
    },
    {
      id: "heavy_cannon",
      name: "Heavy Cannon",
      description:
        "Kinetic projectile weapon. Devastating damage, slow to reload.",
      damage_base: 30,
      cooldown_rounds: 3,
      power_cost: 18,
      accuracy: 0.75,
      weapon_class: "kinetic",
      price: 15000,
    },
    {
      id: "missile_pod",
      name: "Missile Pod",
      description: "Guided missiles. High damage but can be intercepted.",
      damage_base: 25,
      cooldown_rounds: 3,
      power_cost: 12,
      accuracy: 0.7,
      weapon_class: "missile",
      price: 12000,
    },
    {
      id: "point_defense",
      name: "Point Defense",
      description:
        "Rapid-fire anti-missile system. Low damage but very accurate.",
      damage_base: 5,
      cooldown_rounds: 1,
      power_cost: 3,
      accuracy: 0.95,
      weapon_class: "energy",
      price: 3000,
    },
    {
      id: "railgun",
      name: "Railgun",
      description:
        "Electromagnetic accelerator. Extreme damage, long cooldown.",
      damage_base: 40,
      cooldown_rounds: 4,
      power_cost: 25,
      accuracy: 0.65,
      weapon_class: "kinetic",
      price: 30000,
    },
  ]);

  // -- Backfill ship_types with reactor/subsystem values --
  const shipTypeStats: Record<
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

  for (const [shipTypeId, stats] of Object.entries(shipTypeStats)) {
    await knex("ship_types").where({ id: shipTypeId }).update({
      base_reactor_power: stats.reactor,
      max_reactor_power: stats.reactor,
      base_shield_hp: stats.shield,
      base_weapon_hp: stats.weapon,
      base_engine_hp: stats.engine,
      base_sensor_hp: stats.sensor,
      base_life_support_hp: stats.life,
      weapon_slot_count: stats.slots,
    });
  }

  // -- Backfill ships: set reactor + weapon_slot_count from their ship_type --
  const allShips = await knex("ships").select("id", "ship_type_id");
  for (const ship of allShips) {
    const stats = shipTypeStats[ship.ship_type_id];
    if (stats) {
      await knex("ships").where({ id: ship.id }).update({
        reactor_power: stats.reactor,
        max_reactor_power: stats.reactor,
        weapon_slot_count: stats.slots,
      });
    }
  }

  // -- Create ship_subsystems rows for all existing ships --
  const subsystemTypes = [
    "shields",
    "weapons",
    "engines",
    "sensors",
    "life_support",
  ] as const;
  const subsystemMap: Record<string, keyof (typeof shipTypeStats)[string]> = {
    shields: "shield",
    weapons: "weapon",
    engines: "engine",
    sensors: "sensor",
    life_support: "life",
  };

  for (const ship of allShips) {
    const stats = shipTypeStats[ship.ship_type_id];
    if (!stats) continue;

    for (const sub of subsystemTypes) {
      const hp = stats[subsystemMap[sub]];
      await knex("ship_subsystems").insert({
        ship_id: ship.id,
        subsystem_type: sub,
        current_hp: hp,
        max_hp: hp,
        is_disabled: false,
      });
    }
  }

  // -- Equip all existing ships with pulse_laser(s) matching their weapon_slot_count --
  for (const ship of allShips) {
    const stats = shipTypeStats[ship.ship_type_id];
    if (!stats || stats.slots === 0) continue;

    for (let i = 0; i < stats.slots; i++) {
      await knex("weapon_slots").insert({
        ship_id: ship.id,
        weapon_type_id: "pulse_laser",
        slot_index: i,
        cooldown_remaining: 0,
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("combat_rounds");
  await knex.schema.dropTableIfExists("combat_sessions");
  await knex.schema.dropTableIfExists("weapon_slots");
  await knex.schema.dropTableIfExists("ship_subsystems");
  await knex.schema.dropTableIfExists("weapon_types");

  // SQLite doesn't support DROP COLUMN cleanly, use raw pragma workaround
  // For production (Postgres) these would work:
  // ALTER TABLE ship_types DROP COLUMN base_reactor_power, etc.
  // For now, leave the columns — down() is best-effort
}
