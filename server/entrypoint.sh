#!/bin/sh
set -e

echo "Running database migrations..."
node -e "
const knex = require('knex');
const path = require('path');
const db = knex({
  client: 'better-sqlite3',
  connection: { filename: path.join('/app', 'data', 'cosmic_horizon.sqlite') },
  useNullAsDefault: true,
});

async function run() {
  // knex_migrations tracks filenames with .ts extension from dev
  // but compiled migrations are .js — normalize the tracking table
  try {
    await db.raw(\"UPDATE knex_migrations SET name = REPLACE(name, '.ts', '.js')\");
  } catch (e) { /* table may not exist on first run */ }

  const [batch, migrations] = await db.migrate.latest({
    directory: path.join('/app', 'dist', 'db', 'migrations'),
  });
  if (migrations.length > 0) {
    console.log('Ran ' + migrations.length + ' migration(s) (batch ' + batch + '):');
    migrations.forEach(function(m) { console.log('  - ' + m); });
  } else {
    console.log('Database is up to date.');
  }
  await db.destroy();
}

run().catch(function(err) {
  console.error('Migration failed:', err);
  process.exit(1);
});
"

echo "Starting server..."
exec node dist/index.js
