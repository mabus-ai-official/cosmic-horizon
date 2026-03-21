import { Knex } from "knex";

/**
 * Migration 069: Planet Explorer
 *
 * Ground character system for planet surface exploration.
 * Players get a persistent ground character (linked to CharacterNFT)
 * with separate level/skills/inventory for the top-down 2D action game.
 */
export async function up(knex: Knex): Promise<void> {
  // Ground character per player (1:1 with player)
  await knex.schema.createTable("planet_characters", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("(lower(hex(randomblob(16))))"));
    t.uuid("player_id")
      .notNullable()
      .references("id")
      .inTable("players")
      .onDelete("CASCADE");
    t.unique(["player_id"]);
    t.integer("level").notNullable().defaultTo(1);
    t.integer("xp").notNullable().defaultTo(0);
    t.integer("hp").notNullable().defaultTo(100);
    t.integer("max_hp").notNullable().defaultTo(100);
    t.integer("gold").notNullable().defaultTo(0);
    t.integer("sp").notNullable().defaultTo(0); // soul points
    t.string("role", 16).notNullable().defaultTo("melee"); // melee | ranged | mage
    t.string("hero_sprite", 64).nullable();
    t.string("pickaxe_id", 32).notNullable().defaultTo("wood_pickaxe");
    t.integer("pickaxe_durability").notNullable().defaultTo(100);
    t.json("skill_loadout").nullable(); // [slot1, slot2, slot3, slot4]
    t.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    t.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
  });

  // Soul tree progress — one row per unlocked node
  await knex.schema.createTable("planet_soul_tree", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("(lower(hex(randomblob(16))))"));
    t.uuid("player_id")
      .notNullable()
      .references("id")
      .inTable("players")
      .onDelete("CASCADE");
    t.string("node_id", 64).notNullable();
    t.integer("ranks").notNullable().defaultTo(1);
    t.unique(["player_id", "node_id"]);
  });

  // Ground character inventory (grid-based)
  await knex.schema.createTable("planet_inventory", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("(lower(hex(randomblob(16))))"));
    t.uuid("player_id")
      .notNullable()
      .references("id")
      .inTable("players")
      .onDelete("CASCADE");
    t.string("item_type", 64).notNullable();
    t.string("rarity", 16).notNullable().defaultTo("common"); // common | rare | epic | legendary
    t.string("slot", 16).nullable(); // weapon | armor | accessory | ring (if equipped)
    t.json("stats").nullable(); // { attack, defense, speed, ... }
    t.integer("grid_x").nullable();
    t.integer("grid_y").nullable();
    t.timestamp("obtained_at").notNullable().defaultTo(knex.fn.now());
  });

  // Extraction log for economy monitoring
  await knex.schema.createTable("planet_extraction_log", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("(lower(hex(randomblob(16))))"));
    t.uuid("player_id")
      .notNullable()
      .references("id")
      .inTable("players")
      .onDelete("CASCADE");
    t.uuid("planet_id").notNullable().references("id").inTable("planets");
    t.string("resource_type", 64).notNullable();
    t.integer("amount").notNullable();
    t.timestamp("extracted_at").notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("planet_extraction_log");
  await knex.schema.dropTableIfExists("planet_inventory");
  await knex.schema.dropTableIfExists("planet_soul_tree");
  await knex.schema.dropTableIfExists("planet_characters");
}
