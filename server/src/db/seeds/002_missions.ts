import { Knex } from "knex";
import crypto from "crypto";

export async function seed(knex: Knex): Promise<void> {
  // Skip if daily/random mission templates already exist (don't wipe player data)
  const existing = await knex("mission_templates")
    .where({ source: "daily" })
    .orWhereNull("source")
    .count("* as c")
    .first();
  if (existing && Number(existing.c) > 0) return;

  const templates = [
    // Visit sector missions
    {
      title: "Scout Patrol",
      description: "Visit 3 new sectors to expand your star chart.",
      type: "visit_sector",
      difficulty: 1,
      objectives: { sectorsToVisit: 3 },
      reward_credits: 500,
      repeatable: true,
    },
    {
      title: "Deep Space Recon",
      description: "Explore 8 sectors in the outer regions.",
      type: "visit_sector",
      difficulty: 2,
      objectives: { sectorsToVisit: 8 },
      reward_credits: 1500,
      repeatable: true,
    },
    {
      title: "Galactic Cartographer",
      description: "Map 15 uncharted sectors.",
      type: "visit_sector",
      difficulty: 3,
      objectives: { sectorsToVisit: 15 },
      reward_credits: 3500,
      repeatable: true,
    },
    {
      title: "Edge Walker",
      description: "Traverse 25 sectors across the galaxy.",
      type: "visit_sector",
      difficulty: 4,
      objectives: { sectorsToVisit: 25 },
      reward_credits: 6000,
      repeatable: false,
    },

    // Trade missions
    {
      title: "Commodity Runner",
      description: "Trade 10 units of any commodity at outposts.",
      type: "trade_units",
      difficulty: 1,
      objectives: { unitsToTrade: 10 },
      reward_credits: 750,
      repeatable: true,
    },
    {
      title: "Merchant Marine",
      description: "Trade 50 units across the galaxy.",
      type: "trade_units",
      difficulty: 2,
      objectives: { unitsToTrade: 50 },
      reward_credits: 2500,
      repeatable: true,
    },
    {
      title: "Trade Baron",
      description: "Move 200 units of goods through the trade network.",
      type: "trade_units",
      difficulty: 3,
      objectives: { unitsToTrade: 200 },
      reward_credits: 7500,
      repeatable: true,
    },
    {
      title: "Galactic Tycoon",
      description:
        "Complete 500 units in trades to prove your economic dominance.",
      type: "trade_units",
      difficulty: 5,
      objectives: { unitsToTrade: 500 },
      reward_credits: 15000,
      repeatable: false,
    },

    // Deliver cargo missions
    {
      title: "Cyrillium Courier",
      description: "Sell 5 units of cyrillium at any outpost.",
      type: "deliver_cargo",
      difficulty: 1,
      objectives: { commodity: "cyrillium", quantity: 5 },
      reward_credits: 600,
      repeatable: true,
    },
    {
      title: "Food Supply Run",
      description: "Deliver 15 food units to an outpost.",
      type: "deliver_cargo",
      difficulty: 2,
      objectives: { commodity: "food", quantity: 15 },
      reward_credits: 1800,
      repeatable: true,
    },
    {
      title: "Tech Smuggler",
      description: "Move 10 tech components to an outpost buyer.",
      type: "deliver_cargo",
      difficulty: 2,
      objectives: { commodity: "tech", quantity: 10 },
      reward_credits: 2200,
      repeatable: true,
    },
    {
      title: "Bulk Hauler",
      description: "Deliver 50 cyrillium to feed the refineries.",
      type: "deliver_cargo",
      difficulty: 4,
      objectives: { commodity: "cyrillium", quantity: 50 },
      reward_credits: 8000,
      repeatable: false,
    },

    // Combat missions
    {
      title: "Bounty Hunter Apprentice",
      description: "Destroy 1 enemy ship in combat.",
      type: "destroy_ship",
      difficulty: 2,
      objectives: { shipsToDestroy: 1 },
      reward_credits: 2000,
      repeatable: true,
    },
    {
      title: "Pirate Hunter",
      description: "Destroy 3 ships to clean up the spacelanes.",
      type: "destroy_ship",
      difficulty: 3,
      objectives: { shipsToDestroy: 3 },
      reward_credits: 5000,
      repeatable: true,
    },
    {
      title: "Ace Pilot",
      description: "Destroy 5 enemy vessels to earn the Ace designation.",
      type: "destroy_ship",
      difficulty: 4,
      objectives: { shipsToDestroy: 5 },
      reward_credits: 10000,
      repeatable: false,
    },
    {
      title: "Warlord",
      description: "Destroy 10 ships and assert dominance.",
      type: "destroy_ship",
      difficulty: 5,
      objectives: { shipsToDestroy: 10 },
      reward_credits: 25000,
      repeatable: false,
    },

    // Colonize missions
    {
      title: "Colony Starter",
      description: "Deposit 10 colonists on one of your planets.",
      type: "colonize_planet",
      difficulty: 1,
      objectives: { colonistsToDeposit: 10 },
      reward_credits: 800,
      repeatable: true,
    },
    {
      title: "Population Drive",
      description: "Settle 50 colonists across your worlds.",
      type: "colonize_planet",
      difficulty: 2,
      objectives: { colonistsToDeposit: 50 },
      reward_credits: 3000,
      repeatable: true,
    },
    {
      title: "Colonial Governor",
      description: "Deposit 200 colonists to grow your empire.",
      type: "colonize_planet",
      difficulty: 3,
      objectives: { colonistsToDeposit: 200 },
      reward_credits: 8000,
      repeatable: false,
    },
    {
      title: "Terraformer",
      description: "Bring 500 colonists to your planets.",
      type: "colonize_planet",
      difficulty: 5,
      objectives: { colonistsToDeposit: 500 },
      reward_credits: 20000,
      repeatable: false,
    },

    // Scan missions
    {
      title: "Sensor Sweep",
      description: "Perform 2 sector scans.",
      type: "scan_sectors",
      difficulty: 1,
      objectives: { scansRequired: 2 },
      reward_credits: 400,
      repeatable: true,
    },
    {
      title: "Intelligence Gathering",
      description: "Complete 5 scans to build a tactical picture.",
      type: "scan_sectors",
      difficulty: 2,
      objectives: { scansRequired: 5 },
      reward_credits: 1200,
      repeatable: true,
    },
    {
      title: "Signal Analyst",
      description: "Perform 10 deep scans across the galaxy.",
      type: "scan_sectors",
      difficulty: 3,
      objectives: { scansRequired: 10 },
      reward_credits: 3000,
      repeatable: true,
    },
    {
      title: "Stellar Surveyor",
      description: "Execute 20 comprehensive sensor sweeps.",
      type: "scan_sectors",
      difficulty: 4,
      objectives: { scansRequired: 20 },
      reward_credits: 6000,
      repeatable: false,
    },
    {
      title: "Omniscient Observer",
      description: "Complete 50 scans to achieve sensor mastery.",
      type: "scan_sectors",
      difficulty: 5,
      objectives: { scansRequired: 50 },
      reward_credits: 12000,
      repeatable: false,
    },
  ];

  for (const t of templates) {
    await knex("mission_templates").insert({
      id: crypto.randomUUID(),
      title: t.title,
      description: t.description,
      type: t.type,
      difficulty: t.difficulty,
      objectives: JSON.stringify(t.objectives),
      reward_credits: t.reward_credits,
      reward_item_id: null,
      time_limit_minutes: null,
      min_player_level: 0,
      repeatable: t.repeatable,
    });
  }
}
