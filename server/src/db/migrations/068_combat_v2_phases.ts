import { Knex } from "knex";

/**
 * Migration 068: Combat V2 Phases 2-6
 *
 * Phase 2: Weapon inventory (player-owned weapons for purchase/swap)
 * Phase 4: Crew system (crew_members, crew_stations)
 * Phase 6: Sector combat hazards
 */
export async function up(knex: Knex): Promise<void> {
  // -- Phase 2: Player weapon inventory --
  // Weapons the player owns but may not have equipped
  await knex.schema.createTable("player_weapons", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("(lower(hex(randomblob(16))))"));
    t.uuid("player_id")
      .notNullable()
      .references("id")
      .inTable("players")
      .onDelete("CASCADE");
    t.string("weapon_type_id", 32)
      .notNullable()
      .references("id")
      .inTable("weapon_types");
    t.boolean("equipped").notNullable().defaultTo(false);
    t.uuid("equipped_on_ship_id").nullable();
    t.integer("equipped_slot_index").nullable();
    t.timestamp("purchased_at").notNullable().defaultTo(knex.fn.now());
  });

  // -- Phase 4: Crew system --
  await knex.schema.createTable("crew_members", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("(lower(hex(randomblob(16))))"));
    t.uuid("player_id")
      .notNullable()
      .references("id")
      .inTable("players")
      .onDelete("CASCADE");
    t.string("name", 64).notNullable();
    t.string("role", 32).notNullable(); // gunner|engineer|medic|pilot|tactician
    t.integer("skill_level").notNullable().defaultTo(1); // 1-5
    t.integer("hp").notNullable().defaultTo(100);
    t.integer("max_hp").notNullable().defaultTo(100);
    t.string("status", 16).notNullable().defaultTo("idle"); // idle|stationed|injured|dead|boarding
    t.string("assigned_station", 16).nullable(); // shields|weapons|engines|sensors|life_support
    t.integer("morale").notNullable().defaultTo(75); // 0-100
    t.integer("xp").notNullable().defaultTo(0);
    t.timestamp("hired_at").notNullable().defaultTo(knex.fn.now());
  });

  // Crew available for hire at starmalls
  await knex.schema.createTable("crew_for_hire", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("(lower(hex(randomblob(16))))"));
    t.integer("sector_id").notNullable().references("id").inTable("sectors");
    t.string("name", 64).notNullable();
    t.string("role", 32).notNullable();
    t.integer("skill_level").notNullable().defaultTo(1);
    t.integer("hire_cost").notNullable();
    t.timestamp("available_until").nullable();
  });

  // -- Phase 6: Sector combat environment types --
  await knex.raw(
    `ALTER TABLE sectors ADD COLUMN combat_hazard TEXT DEFAULT NULL`,
  );
  // combat_hazard values: asteroid_field | nebula | solar_flare | null

  // Seed some sector hazards (10% of sectors get hazards)
  const sectors = await knex("sectors")
    .select("id")
    .orderByRaw("RANDOM()")
    .limit(500);
  const hazards = ["asteroid_field", "nebula", "solar_flare"];
  for (const sector of sectors) {
    const hazard = hazards[Math.floor(Math.random() * hazards.length)];
    await knex("sectors")
      .where({ id: sector.id })
      .update({ combat_hazard: hazard });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("crew_for_hire");
  await knex.schema.dropTableIfExists("crew_members");
  await knex.schema.dropTableIfExists("player_weapons");
}
