import { Knex } from "knex";
import crypto from "crypto";
import { generateUniverse, SectorData, SectorEdge } from "./universe";
import {
  createRng,
  generateOutposts,
  generatePlanets,
  generateSeedPlanets,
} from "./sp-helpers";
import { GAME_CONFIG } from "../config/game";

// SP universe constants
const SP_TOTAL_SECTORS = 1000;
const SP_SEED = 1337;
const SP_NUM_OUTPOSTS = 40;
const SP_NUM_PLANETS = 60;
const SP_NUM_STAR_MALLS = 3;
const SP_NUM_NPCS = 15;

/**
 * Generate a complete single-player universe for a player.
 * Creates 1000 sectors with outposts, planets, star malls, and NPCs.
 * All SP sectors use IDs offset from the existing universe to avoid collisions.
 */
export async function generateSPUniverse(
  playerId: string,
  knex: Knex,
): Promise<{
  sectorOffset: number;
  startingSectorId: number;
}> {
  // 1. Find the current max sector ID to calculate offset
  const maxRow = await knex("sectors").max("id as maxId").first();
  const offset = (maxRow?.maxId || 0) + 1;

  // 2. Generate universe topology (same seed for all SP players → identical topology)
  const universe = generateUniverse(SP_TOTAL_SECTORS, SP_SEED);

  // 3. Remap sector IDs to offset range
  const sectorRows: {
    id: number;
    type: string;
    has_star_mall: boolean;
    has_seed_planet: boolean;
    region_id: number;
    universe: string;
    owner_id: string;
    sp_mall_locked: boolean;
  }[] = [];

  for (const [, sector] of universe.sectors) {
    sectorRows.push({
      id: offset + sector.id,
      type: sector.type,
      has_star_mall: sector.hasStarMall,
      has_seed_planet: sector.hasSeedPlanet,
      region_id: sector.regionId,
      universe: "sp",
      owner_id: playerId,
      sp_mall_locked: sector.hasStarMall, // All star malls start locked
    });
  }

  // Insert sectors in batches
  for (let i = 0; i < sectorRows.length; i += 500) {
    await knex("sectors").insert(sectorRows.slice(i, i + 500));
  }

  // 4. Insert remapped edges
  const edgeRows: {
    from_sector_id: number;
    to_sector_id: number;
    one_way: boolean;
  }[] = [];
  for (const [, edges] of universe.edges) {
    for (const edge of edges) {
      edgeRows.push({
        from_sector_id: offset + edge.from,
        to_sector_id: offset + edge.to,
        one_way: edge.oneWay,
      });
    }
  }

  for (let i = 0; i < edgeRows.length; i += 500) {
    await knex("sector_edges").insert(edgeRows.slice(i, i + 500));
  }

  // 5. Get all SP sector IDs and identify star malls / seed planets
  const allSPSectorIds = sectorRows.map((s) => s.id);
  const starMallSectorIds = sectorRows
    .filter((s) => s.has_star_mall)
    .map((s) => s.id);
  const seedPlanetSectorIds = sectorRows
    .filter((s) => s.has_seed_planet)
    .map((s) => s.id);

  // 6. Generate and insert outposts
  const rng = createRng(SP_SEED + 100); // Different sub-seed for outpost placement
  const outposts = generateOutposts(
    allSPSectorIds,
    starMallSectorIds,
    rng,
    SP_NUM_OUTPOSTS,
  );

  // Ensure star mall outposts sell at least one commodity
  for (const outpost of outposts) {
    if (starMallSectorIds.includes(outpost.sector_id)) {
      const sellsSomething =
        outpost.cyrillium_mode === "sell" ||
        outpost.food_mode === "sell" ||
        outpost.tech_mode === "sell";
      if (!sellsSomething) {
        outpost.food_mode = "sell";
        outpost.food_stock = 3000 + Math.floor(rng() * 5000);
      }
    }
  }

  // Ensure tutorial path: every star mall has adjacent outpost
  const outpostSectorSet = new Set(outposts.map((o) => o.sector_id));
  for (const mallSectorId of starMallSectorIds) {
    const neighbors = edgeRows
      .filter((e) => e.from_sector_id === mallSectorId)
      .map((e) => e.to_sector_id);
    const hasAdjacentOutpost = neighbors.some((n) => outpostSectorSet.has(n));

    if (!hasAdjacentOutpost && neighbors.length > 0) {
      const targetSector = neighbors[0];
      const nameIdx = outposts.length;
      const { OUTPOST_NAMES } = require("./sp-helpers");
      const name =
        `${OUTPOST_NAMES[nameIdx % OUTPOST_NAMES.length]} ${Math.floor(nameIdx / OUTPOST_NAMES.length) + 1}`.replace(
          / 1$/,
          "",
        );

      outposts.push({
        id: crypto.randomUUID(),
        name,
        sector_id: targetSector,
        sells_fuel: true,
        cyrillium_stock: 0,
        food_stock: Math.floor(rng() * 1500),
        tech_stock: 3000 + Math.floor(rng() * 5000),
        cyrillium_capacity: 10000,
        food_capacity: 10000,
        tech_capacity: 10000,
        cyrillium_mode: "none",
        food_mode: "buy",
        tech_mode: "sell",
        vedic_stock: 0,
        vedic_capacity: 10000,
        vedic_mode: "none",
        treasury: GAME_CONFIG.OUTPOST_BASE_TREASURY + Math.floor(rng() * 50000),
      });
      outpostSectorSet.add(targetSector);
    }
  }

  for (const outpost of outposts) {
    await knex("outposts").insert(outpost);
  }

  // 7. Generate and insert planets
  const planets = generatePlanets(allSPSectorIds, rng, SP_NUM_PLANETS);
  for (const planet of planets) {
    await knex("planets").insert(planet);
  }

  // 8. Generate seed planets
  const seedPlanets = generateSeedPlanets(seedPlanetSectorIds);
  for (const planet of seedPlanets) {
    await knex("planets").insert(planet);
  }

  // 9. Place NPCs at outpost/planet locations
  await placeSPNPCs(knex, outposts, planets, rng, SP_NUM_NPCS);

  // 10. Store offset on player and set tick time
  await knex("players").where({ id: playerId }).update({
    sp_sector_offset: offset,
    sp_last_tick_at: new Date().toISOString(),
  });

  // Return starting sector (first star mall)
  const startingSectorId = starMallSectorIds[0];

  return { sectorOffset: offset, startingSectorId };
}

/**
 * Place a subset of NPCs into the SP universe at outpost locations.
 */
async function placeSPNPCs(
  knex: Knex,
  outposts: { id: string; sector_id: number; name: string }[],
  planets: { id: string; sector_id: number; name: string }[],
  rng: () => number,
  count: number,
): Promise<void> {
  const SP_NPC_DEFS = [
    {
      name: "Vex Ironhide",
      title: "Bartender",
      race: "muscarian",
      faction_id: "traders_guild",
      services: ["info", "trade"],
    },
    {
      name: "Mira Dustwalker",
      title: "Bartender",
      race: "tarri",
      faction_id: "independent",
      services: ["info"],
    },
    {
      name: "Zek Thornspore",
      title: "Arms Dealer",
      race: "muscarian",
      faction_id: "shadow_syndicate",
      services: ["trade"],
    },
    {
      name: "Lyris Starweaver",
      title: "Navigator",
      race: "vedic",
      faction_id: "cosmic_scholars",
      services: ["info"],
    },
    {
      name: "Korr Ashborn",
      title: "Bounty Hunter",
      race: "kalin",
      faction_id: "frontier_rangers",
      services: ["quest"],
    },
    {
      name: "Nym Quicksilver",
      title: "Smuggler",
      race: "tarri",
      faction_id: "shadow_syndicate",
      services: ["trade", "info"],
    },
    {
      name: "Sage Voidwhisper",
      title: "Scholar",
      race: "vedic",
      faction_id: "cosmic_scholars",
      services: ["info"],
    },
    {
      name: "Grak Steelwall",
      title: "Mercenary",
      race: "kalin",
      faction_id: "independent",
      services: ["quest"],
    },
    {
      name: "Tova Embermoss",
      title: "Medic",
      race: "muscarian",
      faction_id: "frontier_rangers",
      services: ["info"],
    },
    {
      name: "Xel Driftborne",
      title: "Trader",
      race: "tarri",
      faction_id: "traders_guild",
      services: ["trade"],
    },
    {
      name: "Oren Glacius",
      title: "Miner",
      race: "kalin",
      faction_id: "independent",
      services: ["trade"],
    },
    {
      name: "Asha Mindflow",
      title: "Mystic",
      race: "vedic",
      faction_id: "cosmic_scholars",
      services: ["info"],
    },
    {
      name: "Rex Cargopaw",
      title: "Dock Chief",
      race: "muscarian",
      faction_id: "traders_guild",
      services: ["info", "trade"],
    },
    {
      name: "Fen Nightshade",
      title: "Informant",
      race: "tarri",
      faction_id: "shadow_syndicate",
      services: ["info"],
    },
    {
      name: "Bolg Ironfist",
      title: "Guard Captain",
      race: "kalin",
      faction_id: "frontier_rangers",
      services: ["quest"],
    },
  ];

  const npcsToPlace = SP_NPC_DEFS.slice(0, count);

  for (let i = 0; i < npcsToPlace.length; i++) {
    const def = npcsToPlace[i];
    const outpost = outposts[i % outposts.length];

    await knex("npc_definitions").insert({
      id: crypto.randomUUID(),
      name: `${def.name}`,
      title: def.title,
      race: def.race,
      faction_id: def.faction_id,
      location_type: "outpost",
      location_id: outpost.id,
      sector_id: outpost.sector_id,
      services: JSON.stringify(def.services),
      is_key_npc: false,
      sprite_config: JSON.stringify({ spriteId: `npc_${def.race}` }),
      first_encounter: JSON.stringify({
        greeting: `A ${def.race} ${def.title.toLowerCase()} eyes you from across the room.`,
        description: `${def.name} is a ${def.title.toLowerCase()} operating out of ${outpost.name}.`,
        sceneHint: "outpost_interior",
      }),
      dialogue_tree: JSON.stringify({
        root: {
          text: `Welcome, spacer. I'm ${def.name}. What brings you to ${outpost.name}?`,
          options: [
            { label: "Tell me about this area.", next: "info" },
            { label: "Goodbye.", next: null },
          ],
        },
        info: {
          text: "This frontier is full of opportunity if you know where to look. Keep exploring and you'll find what you need.",
          options: [{ label: "Thanks for the tip.", next: null }],
          effects: { reputation: 1 },
        },
      }),
    });
  }
}
