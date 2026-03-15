import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Bilateral trade offers between players
  await knex.schema.createTable("trade_offers", (t) => {
    t.uuid("id").primary().defaultTo(knex.fn.uuid());
    t.uuid("sender_id").notNullable().references("id").inTable("players");
    t.uuid("recipient_id").notNullable().references("id").inTable("players");
    t.uuid("parent_offer_id")
      .nullable()
      .references("id")
      .inTable("trade_offers");
    t.string("status", 16).notNullable().defaultTo("pending");
    t.text("message").nullable();
    t.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    t.timestamp("expires_at").notNullable();
    t.timestamp("resolved_at").nullable();
    t.index("sender_id");
    t.index("recipient_id");
    t.index("parent_offer_id");
    t.index("status");
  });

  // Items on each side of a trade offer
  await knex.schema.createTable("trade_offer_items", (t) => {
    t.uuid("id").primary().defaultTo(knex.fn.uuid());
    t.uuid("offer_id")
      .notNullable()
      .references("id")
      .inTable("trade_offers")
      .onDelete("CASCADE");
    t.string("side", 16).notNullable(); // 'offered' or 'requested'
    t.string("item_type", 16).notNullable(); // credits, resource, cargo, tablet, planet, upgrade
    t.string("item_id", 64).nullable(); // resource_id, tablet id, planet id, upgrade inventory id
    t.integer("quantity").notNullable().defaultTo(1);
    t.json("metadata").nullable(); // display info
    t.index("offer_id");
  });

  // Player upgrade inventory — loose upgrades not installed on ships
  await knex.schema.createTable("player_upgrade_inventory", (t) => {
    t.uuid("id").primary().defaultTo(knex.fn.uuid());
    t.uuid("player_id")
      .notNullable()
      .references("id")
      .inTable("players")
      .onDelete("CASCADE");
    t.string("upgrade_type_id", 64)
      .notNullable()
      .references("id")
      .inTable("upgrade_types");
    t.timestamp("acquired_at").notNullable().defaultTo(knex.fn.now());
    t.index("player_id");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("trade_offer_items");
  await knex.schema.dropTableIfExists("trade_offers");
  await knex.schema.dropTableIfExists("player_upgrade_inventory");
}
