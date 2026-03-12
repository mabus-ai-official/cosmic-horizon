import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("arcade_challenges", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("(lower(hex(randomblob(16))))"));
    t.uuid("challenger_id")
      .notNullable()
      .references("id")
      .inTable("players")
      .onDelete("CASCADE");
    t.uuid("target_id")
      .nullable()
      .references("id")
      .inTable("players")
      .onDelete("CASCADE");
    t.string("game_type", 32).notNullable().defaultTo("asteroid_mining");
    t.integer("sector_id").notNullable();
    t.string("status", 16).notNullable().defaultTo("pending");
    t.timestamp("expires_at").notNullable();
    t.timestamp("created_at").notNullable().defaultTo(knex.fn.now());

    t.index("challenger_id");
    t.index("target_id");
    t.index(["sector_id", "status"]);
  });

  await knex.schema.createTable("arcade_sessions", (t) => {
    t.uuid("id").primary().defaultTo(knex.raw("(lower(hex(randomblob(16))))"));
    t.string("game_type", 32).notNullable().defaultTo("asteroid_mining");
    t.uuid("player1_id")
      .notNullable()
      .references("id")
      .inTable("players")
      .onDelete("CASCADE");
    t.uuid("player2_id").nullable();
    t.integer("player1_score").notNullable().defaultTo(0);
    t.integer("player2_score").notNullable().defaultTo(0);
    t.integer("round").notNullable().defaultTo(0);
    t.integer("max_rounds").notNullable().defaultTo(3);
    t.string("status", 20).notNullable().defaultTo("lobby");
    t.uuid("winner_id").nullable();
    t.json("player1_drinks").notNullable().defaultTo("[]");
    t.json("player2_drinks").notNullable().defaultTo("[]");
    t.json("player1_effects").notNullable().defaultTo("[]");
    t.json("player2_effects").notNullable().defaultTo("[]");
    t.json("round_data").notNullable().defaultTo("{}");
    t.boolean("reward_claimed").notNullable().defaultTo(false);
    t.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    t.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());

    t.index("player1_id");
    t.index("player2_id");
    t.index("status");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("arcade_sessions");
  await knex.schema.dropTableIfExists("arcade_challenges");
}
