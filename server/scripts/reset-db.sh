#!/bin/bash
# Reset the Cosmic Horizon database for blockchain-only mode
# Deletes the SQLite file so migrations + seeds run fresh on next server start.
# All player data will come from new registrations through the blockchain flow.

set -e

DB_PATH="$(dirname "$0")/../data/cosmic_horizon.sqlite"

if [ -f "$DB_PATH" ]; then
  echo "Removing existing database: $DB_PATH"
  rm "$DB_PATH"
  echo "Database deleted. Restart the server to run migrations + seeds."
else
  echo "No database found at $DB_PATH — nothing to delete."
fi

echo ""
echo "Next steps:"
echo "  1. Make sure anvil is running with freshly deployed contracts"
echo "  2. Set CHAIN_ENABLED=true (or leave default)"
echo "  3. Start the server — migrations, seeds, indexer, and tx-queue will initialize"
echo "  4. Register a new player — chain identity will be created automatically"
