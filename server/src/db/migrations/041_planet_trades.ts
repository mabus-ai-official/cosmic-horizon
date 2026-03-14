import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("planet_trade_requests", (t) => {
    t.uuid("id").primary();
    t.uuid("sender_id")
      .notNullable()
      .references("id")
      .inTable("players")
      .onDelete("CASCADE");
    t.uuid("recipient_id")
      .notNullable()
      .references("id")
      .inTable("players")
      .onDelete("CASCADE");
    t.string("trade_type", 16).notNullable(); // 'resource' | 'planet'
    // For resource trades
    t.uuid("planet_id")
      .nullable()
      .references("id")
      .inTable("planets")
      .onDelete("CASCADE");
    t.string("resource_type", 64).nullable(); // 'cyrillium', 'food', 'tech', or resource_id
    t.integer("quantity").nullable();
    // For planet transfers
    t.uuid("transfer_planet_id")
      .nullable()
      .references("id")
      .inTable("planets")
      .onDelete("CASCADE");
    // Pricing
    t.integer("price").notNullable().defaultTo(0); // credits requested (0 = gift)
    t.string("status", 16).notNullable().defaultTo("pending"); // 'pending' | 'accepted' | 'rejected' | 'expired'
    t.timestamp("created_at").defaultTo(knex.fn.now());
    t.timestamp("expires_at").nullable();

    t.index("recipient_id");
    t.index("sender_id");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("planet_trade_requests");
}
