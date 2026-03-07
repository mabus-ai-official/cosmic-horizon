import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("daily_missions", (t) => {
    t.string("id", 36).primary();
    t.string("player_id", 36)
      .notNullable()
      .references("id")
      .inTable("players")
      .onDelete("CASCADE");
    t.string("mission_type", 32).notNullable(); // visit_sectors, win_combat, trade_value, scan_sectors, dock_outpost
    t.string("description").notNullable();
    t.integer("target").notNullable(); // e.g., 3 sectors, 1 combat win
    t.integer("progress").notNullable().defaultTo(0);
    t.boolean("completed").notNullable().defaultTo(false);
    t.boolean("claimed").notNullable().defaultTo(false);
    t.integer("xp_reward").notNullable().defaultTo(0);
    t.integer("credit_reward").notNullable().defaultTo(0);
    t.string("date", 10).notNullable(); // YYYY-MM-DD
    t.timestamp("created_at").defaultTo(knex.fn.now());
    t.index(["player_id", "date"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("daily_missions");
}
