import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('players', (t) => {
    t.string('matrix_user_id').nullable().unique();
    // Allow null password_hash for Matrix-only accounts
  });

  // Make password_hash nullable for Matrix-only accounts.
  // SQLite doesn't support ALTER COLUMN, so we handle this at the application level:
  // Matrix-registered players get a random unusable hash.
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('players', (t) => {
    t.dropColumn('matrix_user_id');
  });
}
