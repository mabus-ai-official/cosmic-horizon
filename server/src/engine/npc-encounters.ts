/**
 * npc-encounters.ts — Random NPC encounters during travel missions.
 *
 * When a player is on a mission with scan/move objectives and moves to a new
 * sector, there's an ~18% chance of triggering a temporary NPC encounter.
 * NPCs can offer intel, trade goods, faction rep, or items (including tablets).
 */

import db from "../db/connection";
import { notifyPlayer } from "../ws/handlers";
import { grantRandomTablet } from "./tablets";
import { GAME_CONFIG } from "../config/game";
import type { Server as SocketIOServer } from "socket.io";

const ENCOUNTER_CHANCE = 0.18;
const TABLET_DROP_CHANCE = 0.1;

/** Travel-type mission objective types that qualify for random encounters */
const TRAVEL_OBJECTIVES = new Set([
  "visit_sector",
  "scan_sectors",
  "explore",
  "move_to_sector",
  "patrol",
]);

interface NpcOffering {
  type: "buy_item" | "intel" | "faction_rep" | "item_gift";
  description: string;
  cost: number;
  commodity?: string;
  quantity?: number;
  factionId?: string;
  factionName?: string;
  fameAmount?: number;
}

type EncounterType = "intel" | "trader" | "faction" | "scavenger";

const NPC_TEMPLATES: {
  type: EncounterType;
  weight: number;
  names: string[];
  races: string[];
  flash: string;
}[] = [
  {
    type: "intel",
    weight: 3,
    names: [
      "Wandering Cartographer",
      "Frontier Scout",
      "Signal Analyst",
      "Retired Navigator",
    ],
    races: ["Vedic", "Muscarian"],
    flash: "encounter",
  },
  {
    type: "trader",
    weight: 3,
    names: [
      "Roaming Merchant",
      "Scrap Dealer",
      "Supply Runner",
      "Cargo Hauler",
    ],
    races: ["Tar'ri", "Muscarian"],
    flash: "trade",
  },
  {
    type: "faction",
    weight: 2,
    names: [
      "Faction Envoy",
      "Diplomatic Courier",
      "Cultural Attaché",
      "Goodwill Ambassador",
    ],
    races: ["Vedic", "Kalin", "Muscarian", "Tar'ri"],
    flash: "encounter",
  },
  {
    type: "scavenger",
    weight: 2,
    names: [
      "Salvage Drifter",
      "Debris Picker",
      "Wreck Hunter",
      "Junk Collector",
    ],
    races: ["Tar'ri", "Muscarian"],
    flash: "event",
  },
];

function pickTemplate(): (typeof NPC_TEMPLATES)[0] {
  const totalWeight = NPC_TEMPLATES.reduce((s, t) => s + t.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const t of NPC_TEMPLATES) {
    roll -= t.weight;
    if (roll <= 0) return t;
  }
  return NPC_TEMPLATES[0];
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function buildOffering(
  type: EncounterType,
  playerId: string,
  sectorId: number,
): Promise<NpcOffering> {
  switch (type) {
    case "intel": {
      // Find a random outpost the player hasn't visited and give its location
      const playerRow = await db("players")
        .where({ id: playerId })
        .select("explored_sectors")
        .first();
      const exploredIds: number[] = JSON.parse(
        playerRow?.explored_sectors || "[]",
      );
      const outpostQuery = db("outposts").orderByRaw("RANDOM()");
      if (exploredIds.length > 0) {
        outpostQuery.whereNotIn("sector_id", exploredIds);
      }
      const outpost = await outpostQuery.first();
      const desc = outpost
        ? `I know about an outpost in Sector ${outpost.sector_id} — ${outpost.name}. Interested?`
        : "I've mapped some quiet routes through this region. Could save you some energy.";
      return {
        type: "intel",
        description: desc,
        cost: 50 + Math.floor(Math.random() * 100),
      };
    }
    case "trader": {
      const commodities = ["cyrillium", "food", "tech"];
      const commodity = pickRandom(commodities);
      const quantity = 3 + Math.floor(Math.random() * 8);
      const basePrice =
        commodity === "cyrillium"
          ? GAME_CONFIG.BASE_CYRILLIUM_PRICE
          : commodity === "food"
            ? 8
            : 15;
      const cost = Math.floor(basePrice * quantity * 1.3);
      return {
        type: "buy_item",
        description: `I've got ${quantity} units of ${commodity} if you're interested. Fair price.`,
        cost,
        commodity,
        quantity,
      };
    }
    case "faction": {
      const factions: { id: string; name: string }[] = await db(
        "factions",
      ).select("id", "name");
      const faction = pickRandom(factions);
      const fameAmount = 5 + Math.floor(Math.random() * 10);
      const cost = fameAmount * 15;
      return {
        type: "faction_rep",
        description: `I can put in a good word for you with the ${faction.name}. A small donation helps.`,
        cost,
        factionId: faction.id,
        factionName: faction.name,
        fameAmount,
      };
    }
    case "scavenger": {
      const items = ["Salvaged Components", "Sensor Fragment", "Hull Plating"];
      const item = pickRandom(items);
      return {
        type: "item_gift",
        description: `Found this floating in the debris — ${item}. Yours for a small fee.`,
        cost: 25 + Math.floor(Math.random() * 75),
      };
    }
  }
}

/**
 * Check if a random NPC encounter should trigger on sector move.
 * Only fires when player has an active mission with travel-type objectives.
 */
export async function checkRandomNPCEncounter(
  playerId: string,
  sectorId: number,
  io?: SocketIOServer,
): Promise<void> {
  if (!io) return;

  // Roll for encounter
  if (Math.random() > ENCOUNTER_CHANCE) return;

  // Check if player has any active mission with a travel-type objective
  const activeMissions = await db("player_missions")
    .join(
      "mission_templates",
      "player_missions.template_id",
      "mission_templates.id",
    )
    .where({ "player_missions.player_id": playerId })
    .whereIn("player_missions.status", ["active", "in_progress"])
    .select(
      "mission_templates.type",
      "mission_templates.has_phases",
      "player_missions.current_phase",
      "player_missions.template_id",
    );

  // Check mission types or current phase objectives
  let hasTravelMission = false;
  for (const m of activeMissions) {
    if (TRAVEL_OBJECTIVES.has(m.type)) {
      hasTravelMission = true;
      break;
    }
    // Check phased missions — current phase might be a travel objective
    if (m.has_phases && m.current_phase) {
      const phase = await db("mission_phases")
        .where({
          template_id: m.template_id,
          phase_order: m.current_phase,
        })
        .first();
      if (phase && TRAVEL_OBJECTIVES.has(phase.objective_type)) {
        hasTravelMission = true;
        break;
      }
    }
  }

  if (!hasTravelMission) return;

  const template = pickTemplate();
  const npcName = pickRandom(template.names);
  const npcRace = pickRandom(template.races);
  const offering = await buildOffering(template.type, playerId, sectorId);

  // Check for tablet drop (10%)
  let tabletDrop: { name: string; rarity: string } | null = null;
  if (Math.random() < TABLET_DROP_CHANCE) {
    const result = await grantRandomTablet(playerId);
    if (result?.name) {
      tabletDrop = { name: result.name, rarity: result.rarity ?? "common" };
    }
  }

  notifyPlayer(io, playerId, "npc:random_encounter", {
    npcName,
    npcRace,
    encounterType: template.type,
    flash: template.flash,
    sectorId,
    offering,
    tabletDrop,
  });
}

/**
 * Handle purchasing from a random NPC encounter.
 */
export async function handleNPCEncounterPurchase(
  playerId: string,
  offering: NpcOffering,
  io?: SocketIOServer,
): Promise<{ success: boolean; error?: string }> {
  const player = await db("players").where({ id: playerId }).first();
  if (!player) return { success: false, error: "Player not found" };
  if (Number(player.credits) < offering.cost) {
    return { success: false, error: "Not enough credits" };
  }

  // Deduct credits
  await db("players")
    .where({ id: playerId })
    .update({ credits: Number(player.credits) - offering.cost });

  switch (offering.type) {
    case "buy_item": {
      if (offering.commodity && offering.quantity) {
        const ship = await db("ships")
          .where({ id: player.current_ship_id })
          .first();
        if (!ship) return { success: false, error: "No ship" };
        const col = `${offering.commodity}_cargo`;
        const current = Number(ship[col] || 0);
        const maxCargo = Number(ship.max_cargo_holds);
        const totalCargo =
          Number(ship.cyrillium_cargo) +
          Number(ship.food_cargo) +
          Number(ship.tech_cargo) +
          Number(ship.colonists_cargo);
        const space = maxCargo - totalCargo;
        const qty = Math.min(offering.quantity, space);
        if (qty > 0) {
          await db("ships").where({ id: ship.id }).increment(col, qty);
        }
      }
      break;
    }
    case "intel": {
      // Intel is informational — credits deducted is the value
      break;
    }
    case "faction_rep": {
      if (offering.factionId && offering.fameAmount) {
        const existing = await db("player_faction_rep")
          .where({ player_id: playerId, faction_id: offering.factionId })
          .first();
        if (existing) {
          await db("player_faction_rep")
            .where({ player_id: playerId, faction_id: offering.factionId })
            .update({
              fame: Math.min(100, Number(existing.fame) + offering.fameAmount),
            });
        } else {
          await db("player_faction_rep").insert({
            player_id: playerId,
            faction_id: offering.factionId,
            fame: offering.fameAmount,
            infamy: 0,
          });
        }
      }
      break;
    }
    case "item_gift": {
      // Small item — credits deducted is the value, no inventory effect
      break;
    }
  }

  if (io) {
    const { syncPlayer } = require("../ws/sync");
    syncPlayer(io, playerId, "sync:status");
  }

  return { success: true };
}
