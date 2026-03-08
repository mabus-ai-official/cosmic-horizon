import crypto from "crypto";
import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  calculateProduction,
  calculateProductionLegacy,
  calculateFoodConsumption,
  canUpgrade,
} from "../engine/planets";
import { getHappinessTier, type RacePopulation } from "../engine/happiness";
import { checkAndUpdateMissions } from "../services/mission-tracker";
import { checkPrerequisite } from "../engine/missions";
import { applyUpgradesToShip } from "../engine/upgrades";
import { awardXP } from "../engine/progression";
import { checkAchievements } from "../engine/achievements";
import { GAME_CONFIG } from "../config/game";
import { PLANET_TYPES } from "../config/planet-types";
import { VALID_RACE_IDS } from "../config/races";
import { getRefineryQueue, getRefinerySlots } from "../engine/crafting";
import db from "../db/connection";
import {
  incrementStat,
  logActivity,
  checkMilestones,
} from "../engine/profile-stats";
import { pickFlavor } from "../config/flavor-text";
import type { RaceId } from "../config/races";
import {
  handleTutorialPlanetInfo,
  handleTutorialClaim,
  handleTutorialOwnedPlanets,
  handleTutorialDiscoveredPlanets,
} from "../services/tutorial-sandbox";

const router = Router();

/** Inline tutorial block for routes that shouldn't work during tutorial */
function tutorialBlock(req: any, res: any): boolean {
  if (req.inTutorial) {
    res
      .status(400)
      .json({ error: "Complete the tutorial first to access this feature." });
    return true;
  }
  return false;
}

/** Helper to load race populations for a planet */
async function loadRacePopulations(
  planetId: string,
  fallbackColonists: number,
): Promise<RacePopulation[]> {
  try {
    const pops = await db("planet_colonists")
      .where({ planet_id: planetId })
      .select("race", "count");
    if (pops.length > 0) return pops;
  } catch {
    /* table may not exist yet */
  }
  if (fallbackColonists > 0) {
    return [{ race: "unknown", count: fallbackColonists }];
  }
  return [];
}

// List planets owned by the player
router.get("/owned", requireAuth, async (req, res) => {
  if (req.inTutorial) return handleTutorialOwnedPlanets(req, res);
  try {
    const planets = await db("planets")
      .where({ owner_id: req.session.playerId })
      .orderBy("created_at");

    // Load unique resources for all owned planets
    let planetResourceMap: Record<
      string,
      { id: string; name: string; stock: number }[]
    > = {};
    try {
      const allPlanetIds = planets.map((p: any) => p.id);
      if (allPlanetIds.length > 0) {
        const planetRes = await db("planet_resources")
          .join(
            "resource_definitions",
            "planet_resources.resource_id",
            "resource_definitions.id",
          )
          .whereIn("planet_resources.planet_id", allPlanetIds)
          .where("planet_resources.stock", ">", 0)
          .select(
            "planet_resources.planet_id",
            "resource_definitions.id",
            "resource_definitions.name",
            "planet_resources.stock",
          );
        for (const pr of planetRes) {
          if (!planetResourceMap[pr.planet_id])
            planetResourceMap[pr.planet_id] = [];
          planetResourceMap[pr.planet_id].push({
            id: pr.id,
            name: pr.name,
            stock: pr.stock,
          });
        }
      }
    } catch {
      /* crafting tables may not exist yet */
    }

    // Load refinery queue counts
    let queueCountMap: Record<string, number> = {};
    try {
      const allPlanetIds = planets.map((p: any) => p.id);
      if (allPlanetIds.length > 0) {
        const queueCounts = await db("planet_refinery_queue")
          .whereIn("planet_id", allPlanetIds)
          .where({ collected: false })
          .groupBy("planet_id")
          .select("planet_id")
          .count("id as count");
        for (const qc of queueCounts) {
          queueCountMap[qc.planet_id as string] = Number(qc.count);
        }
      }
    } catch {
      /* crafting tables may not exist yet */
    }

    // Load race populations for all owned planets
    let racePopMap: Record<string, RacePopulation[]> = {};
    try {
      const allPlanetIds = planets.map((p: any) => p.id);
      if (allPlanetIds.length > 0) {
        const allPops = await db("planet_colonists")
          .whereIn("planet_id", allPlanetIds)
          .select("planet_id", "race", "count");
        for (const pop of allPops) {
          if (!racePopMap[pop.planet_id]) racePopMap[pop.planet_id] = [];
          racePopMap[pop.planet_id].push({ race: pop.race, count: pop.count });
        }
      }
    } catch {
      /* table may not exist yet */
    }

    const result = planets.map((p: any) => {
      const racePops =
        racePopMap[p.id] ||
        (p.colonists > 0 ? [{ race: "unknown", count: p.colonists }] : []);
      const happiness = p.happiness ?? 50;
      const production = calculateProduction(
        p.planet_class,
        racePops,
        happiness,
      );
      const foodConsumption = calculateFoodConsumption(
        p.planet_class,
        p.colonists || 0,
        happiness,
        p.upgrade_level,
      );
      const tier = getHappinessTier(happiness);
      const pType = PLANET_TYPES[p.planet_class];
      return {
        id: p.id,
        name: p.name,
        planetClass: p.planet_class,
        sectorId: p.sector_id,
        upgradeLevel: p.upgrade_level,
        colonists: p.colonists || 0,
        cyrilliumStock: p.cyrillium_stock || 0,
        foodStock: p.food_stock || 0,
        techStock: p.tech_stock || 0,
        droneCount: p.drone_count || 0,
        happiness,
        happinessTier: tier.name,
        foodConsumption,
        racePopulations: racePops.filter((rp) => rp.count > 0),
        production,
        uniqueResources: planetResourceMap[p.id] || [],
        refineryQueueCount: queueCountMap[p.id] || 0,
        variant: p.variant || null,
        variantName: p.variant
          ? pType?.rareVariant?.variantName || p.variant
          : null,
        rareResource: p.variant
          ? pType?.rareVariant?.ultraRareResource?.name || p.rare_resource
          : null,
      };
    });

    res.json({ planets: result });
  } catch (err) {
    console.error("Owned planets error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// List all discovered planets (in explored sectors)
router.get("/discovered", requireAuth, async (req, res) => {
  if (req.inTutorial) return handleTutorialDiscoveredPlanets(req, res);
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    let explored: number[] = [];
    try {
      explored = JSON.parse(player.explored_sectors || "[]");
    } catch {
      explored = [];
    }

    if (explored.length === 0) return res.json({ planets: [] });

    const planets = await db("planets")
      .whereIn("planets.sector_id", explored)
      .leftJoin("players as owner", "planets.owner_id", "owner.id")
      .select(
        "planets.id",
        "planets.name",
        "planets.planet_class",
        "planets.sector_id",
        "planets.owner_id",
        "planets.upgrade_level",
        "planets.colonists",
        "planets.cyrillium_stock",
        "planets.food_stock",
        "planets.tech_stock",
        "owner.username as ownerName",
      );

    const result = planets.map((p: any) => ({
      id: p.id,
      name: p.name,
      planetClass: p.planet_class,
      sectorId: p.sector_id,
      owned: p.owner_id === player.id,
      ownerName: p.owner_id === player.id ? "You" : p.ownerName || null,
      upgradeLevel: p.upgrade_level,
      colonists: p.colonists || 0,
      ...(p.owner_id === player.id
        ? {
            cyrilliumStock: p.cyrillium_stock || 0,
            foodStock: p.food_stock || 0,
            techStock: p.tech_stock || 0,
          }
        : {}),
    }));

    res.json({ planets: result });
  } catch (err) {
    console.error("Discovered planets error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Planet details
router.get("/:id", requireAuth, async (req, res) => {
  if (req.inTutorial) return handleTutorialPlanetInfo(req, res);
  try {
    const planet = await db("planets").where({ id: req.params.id }).first();
    if (!planet) return res.status(404).json({ error: "Planet not found" });

    const racePops = await loadRacePopulations(
      planet.id,
      planet.colonists || 0,
    );
    const happiness = planet.happiness ?? 50;
    const production = calculateProduction(
      planet.planet_class,
      racePops,
      happiness,
    );
    const foodConsumption = calculateFoodConsumption(
      planet.planet_class,
      planet.colonists || 0,
      happiness,
      planet.upgrade_level,
    );
    const tier = getHappinessTier(happiness);

    // Load unique resources and refinery for owned planets
    let uniqueResources: any[] = [];
    let refineryQueue: any[] = [];
    let refinerySlots = 0;
    if (planet.owner_id === req.session.playerId) {
      try {
        const planetRes = await db("planet_resources")
          .join(
            "resource_definitions",
            "planet_resources.resource_id",
            "resource_definitions.id",
          )
          .where({ "planet_resources.planet_id": planet.id })
          .where("planet_resources.stock", ">", 0)
          .select(
            "resource_definitions.id",
            "resource_definitions.name",
            "planet_resources.stock",
          );
        uniqueResources = planetRes;
        refineryQueue = await getRefineryQueue(planet.id);
        refinerySlots = getRefinerySlots(planet.upgrade_level);
      } catch {
        /* crafting tables may not exist yet */
      }
    }

    const planetType = PLANET_TYPES[planet.planet_class];

    res.json({
      id: planet.id,
      name: planet.name,
      planetClass: planet.planet_class,
      sectorId: planet.sector_id,
      ownerId: planet.owner_id,
      upgradeLevel: planet.upgrade_level,
      colonists: planet.colonists,
      cyrilliumStock: planet.cyrillium_stock,
      foodStock: planet.food_stock,
      techStock: planet.tech_stock,
      droneCount: planet.drone_count,
      happiness,
      happinessTier: tier.name,
      foodConsumption,
      racePopulations: racePops.filter((rp) => rp.count > 0),
      production,
      uniqueResources,
      refineryQueue,
      refinerySlots,
      variant: planet.variant || null,
      variantName: planet.variant
        ? planetType?.rareVariant?.variantName || planet.variant
        : null,
      rareResource: planet.variant
        ? planetType?.rareVariant?.ultraRareResource?.name ||
          planet.rare_resource
        : null,
      canUpgrade:
        planet.owner_id === req.session.playerId
          ? canUpgrade({
              upgradeLevel: planet.upgrade_level,
              colonists: planet.colonists || 0,
              cyrilliumStock: planet.cyrillium_stock || 0,
              foodStock: planet.food_stock || 0,
              techStock: planet.tech_stock || 0,
              ownerCredits: 0,
            })
          : false,
    });
  } catch (err) {
    console.error("Planet detail error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Deposit food from ship to planet
router.post("/:id/deposit-food", requireAuth, async (req, res) => {
  if (tutorialBlock(req, res)) return;
  try {
    const { quantity } = req.body;
    if (!quantity || quantity < 1)
      return res.status(400).json({ error: "Invalid quantity" });

    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const planet = await db("planets").where({ id: req.params.id }).first();
    if (!planet) return res.status(404).json({ error: "Planet not found" });
    if (planet.owner_id !== player.id) {
      return res.status(400).json({ error: "You do not own this planet" });
    }
    if (planet.sector_id !== player.current_sector_id) {
      return res.status(400).json({ error: "Planet is not in your sector" });
    }

    // Must be landed or have transporter
    if (player.landed_at_planet_id !== req.params.id) {
      const hasTransporter = await db("game_events")
        .where({
          player_id: player.id,
          event_type: "item:mycelial_transporter",
          read: false,
        })
        .first();
      if (!hasTransporter) {
        return res.status(400).json({
          error:
            "You must land on the planet first, or acquire a Mycelial Transporter",
        });
      }
    }

    const ship = await db("ships")
      .where({ id: player.current_ship_id })
      .first();
    if (!ship) return res.status(400).json({ error: "No active ship" });

    const available = ship.food_cargo || 0;
    const toDeposit = Math.min(quantity, available);
    if (toDeposit <= 0)
      return res.status(400).json({ error: "No food on ship" });

    await db("ships")
      .where({ id: ship.id })
      .update({
        food_cargo: available - toDeposit,
      });
    await db("planets")
      .where({ id: planet.id })
      .update({
        food_stock: (planet.food_stock || 0) + toDeposit,
      });

    // Profile stats: food deposit
    incrementStat(player.id, "food_deposited", toDeposit);
    logActivity(
      player.id,
      "deposit_food",
      `Deposited ${toDeposit} food on ${planet.name}`,
      { planetId: planet.id, amount: toDeposit },
    );

    res.json({
      deposited: toDeposit,
      planetFoodStock: (planet.food_stock || 0) + toDeposit,
      shipFoodCargo: available - toDeposit,
    });
  } catch (err) {
    console.error("Deposit food error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Name a planet
router.post("/:id/name", requireAuth, async (req, res) => {
  if (tutorialBlock(req, res)) return;
  try {
    const { name } = req.body;
    if (
      !name ||
      typeof name !== "string" ||
      name.trim().length < 3 ||
      name.trim().length > 32
    ) {
      return res.status(400).json({ error: "Name must be 3-32 characters" });
    }

    const planet = await db("planets").where({ id: req.params.id }).first();
    if (!planet) return res.status(404).json({ error: "Planet not found" });

    const playerId = req.session.playerId!;
    if (planet.owner_id !== playerId) {
      return res.status(403).json({ error: "You do not own this planet" });
    }

    // Check naming authority (Stellar Census mission)
    const hasAuthority = await checkPrerequisite(
      playerId,
      GAME_CONFIG.NAMING_CONVENTION_MISSION_ID,
    );
    if (!hasAuthority) {
      return res.status(403).json({
        error:
          "Complete the 'Stellar Census' mission to unlock naming authority",
      });
    }

    await db("planets").where({ id: planet.id }).update({ name: name.trim() });
    res.json({ success: true, name: name.trim() });
  } catch (err) {
    console.error("Planet name error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Claim unclaimed planet
router.post("/:id/claim", requireAuth, async (req, res) => {
  if (req.inTutorial) return handleTutorialClaim(req, res);
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const planet = await db("planets").where({ id: req.params.id }).first();
    if (!planet) return res.status(404).json({ error: "Planet not found" });
    if (planet.sector_id !== player.current_sector_id) {
      return res.status(400).json({ error: "Planet is not in your sector" });
    }
    if (planet.planet_class === "S") {
      return res.status(400).json({
        error: "Seed planets cannot be claimed — they belong to the galaxy",
      });
    }
    if (planet.owner_id) {
      return res.status(400).json({ error: "Planet already claimed" });
    }

    await db("planets").where({ id: planet.id }).update({
      owner_id: player.id,
    });

    // Award XP for claiming a planet
    const xpResult = await awardXP(
      player.id,
      GAME_CONFIG.XP_CLAIM_PLANET,
      "explore",
    );
    await checkAchievements(player.id, "claim_planet", {});

    const claimRace = (player.race as RaceId) || "generic";
    res.json({
      planetId: planet.id,
      ownerId: player.id,
      xp: {
        awarded: xpResult.xpAwarded,
        total: xpResult.totalXp,
        level: xpResult.level,
        rank: xpResult.rank,
        levelUp: xpResult.levelUp,
      },
      message: pickFlavor("planet_claim", claimRace, { planet: planet.name }),
    });
  } catch (err) {
    console.error("Claim error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Deposit colonists from ship to planet (race-aware)
router.post("/:id/colonize", requireAuth, async (req, res) => {
  if (tutorialBlock(req, res)) return;
  try {
    const { quantity, race } = req.body;
    if (!quantity || quantity < 1)
      return res.status(400).json({ error: "Invalid quantity" });
    if (!race || !VALID_RACE_IDS.includes(race)) {
      return res.status(400).json({
        error: "Invalid race. Must be one of: " + VALID_RACE_IDS.join(", "),
      });
    }

    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const planet = await db("planets").where({ id: req.params.id }).first();
    if (!planet) return res.status(404).json({ error: "Planet not found" });
    if (planet.sector_id !== player.current_sector_id) {
      return res.status(400).json({ error: "Planet is not in your sector" });
    }
    if (planet.owner_id !== player.id) {
      return res.status(400).json({ error: "You do not own this planet" });
    }

    // Must be landed on the planet, or have a Mycelial Transporter
    if (player.landed_at_planet_id !== req.params.id) {
      const hasTransporter = await db("game_events")
        .where({
          player_id: player.id,
          event_type: "item:mycelial_transporter",
          read: false,
        })
        .first();
      if (!hasTransporter) {
        return res.status(400).json({
          error:
            "You must land on the planet first, or acquire a Mycelial Transporter",
        });
      }
    }

    const ship = await db("ships")
      .where({ id: player.current_ship_id })
      .first();
    if (!ship) return res.status(400).json({ error: "No active ship" });

    // Check ship_colonists for this race
    let shipRaceRow: any = null;
    try {
      shipRaceRow = await db("ship_colonists")
        .where({ ship_id: ship.id, race })
        .first();
    } catch {
      /* table may not exist yet */
    }

    const raceAvailable = shipRaceRow?.count || 0;
    const totalAvailable = ship.colonist_cargo || 0;
    const toDeposit = Math.min(quantity, raceAvailable || totalAvailable);
    if (toDeposit <= 0)
      return res.status(400).json({ error: `No ${race} colonists on ship` });

    // Deduct from ship_colonists
    if (shipRaceRow) {
      await db("ship_colonists")
        .where({ ship_id: ship.id, race })
        .update({ count: Math.max(0, raceAvailable - toDeposit) });
    }

    // Update denormalized ship total
    await db("ships")
      .where({ id: ship.id })
      .update({
        colonist_cargo: Math.max(0, totalAvailable - toDeposit),
      });

    // Add to planet_colonists
    const existingPlanetRace = await db("planet_colonists")
      .where({ planet_id: planet.id, race })
      .first();
    if (existingPlanetRace) {
      await db("planet_colonists")
        .where({ planet_id: planet.id, race })
        .increment("count", toDeposit);
    } else {
      await db("planet_colonists").insert({
        id: crypto.randomUUID(),
        planet_id: planet.id,
        race,
        count: toDeposit,
      });
    }

    // Update denormalized planet total
    await db("planets")
      .where({ id: planet.id })
      .update({
        colonists: (planet.colonists || 0) + toDeposit,
      });

    // Mission progress: colonize
    checkAndUpdateMissions(player.id, "colonize", { quantity: toDeposit });

    // Award XP for colonizing
    const xpResult = await awardXP(
      player.id,
      toDeposit * GAME_CONFIG.XP_COLONIZE,
      "explore",
    );

    // Profile stats: colonize
    incrementStat(player.id, "planets_colonized", 1);
    logActivity(
      player.id,
      "colonize",
      `Colonized ${planet.name} with ${toDeposit} ${race} colonists`,
      { planetId: planet.id, race, count: toDeposit },
    );
    checkMilestones(player.id);

    const colonizeRace = (player.race as RaceId) || "generic";
    res.json({
      deposited: toDeposit,
      race,
      planetColonists: (planet.colonists || 0) + toDeposit,
      shipColonists: Math.max(0, totalAvailable - toDeposit),
      xp: {
        awarded: xpResult.xpAwarded,
        total: xpResult.totalXp,
        level: xpResult.level,
        rank: xpResult.rank,
        levelUp: xpResult.levelUp,
      },
      message: pickFlavor("colonize", colonizeRace, {
        planet: planet.name,
        quantity: toDeposit,
      }),
    });
  } catch (err) {
    console.error("Colonize error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Collect colonists from seed planet (race selection)
router.post("/:id/collect-colonists", requireAuth, async (req, res) => {
  if (tutorialBlock(req, res)) return;
  try {
    const { quantity, race } = req.body;
    if (!quantity || quantity < 1)
      return res.status(400).json({ error: "Invalid quantity" });
    if (!race || !VALID_RACE_IDS.includes(race)) {
      return res.status(400).json({
        error: "Invalid race. Must be one of: " + VALID_RACE_IDS.join(", "),
      });
    }

    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const planet = await db("planets").where({ id: req.params.id }).first();
    if (!planet) return res.status(404).json({ error: "Planet not found" });
    if (planet.planet_class !== "S" && planet.owner_id !== player.id) {
      return res.status(400).json({ error: "You do not own this planet" });
    }
    if (planet.sector_id !== player.current_sector_id) {
      return res.status(400).json({ error: "Planet is not in your sector" });
    }

    // Must be landed or have transporter
    if (player.landed_at_planet_id !== req.params.id) {
      const hasTransporter = await db("game_events")
        .where({
          player_id: player.id,
          event_type: "item:mycelial_transporter",
          read: false,
        })
        .first();
      if (!hasTransporter) {
        return res.status(400).json({
          error:
            "You must land on the planet first, or acquire a Mycelial Transporter",
        });
      }
    }

    const ship = await db("ships")
      .where({ id: player.current_ship_id })
      .first();
    if (!ship) return res.status(400).json({ error: "No active ship" });

    const upgrades = await applyUpgradesToShip(ship.id);
    const currentCargo =
      (ship.cyrillium_cargo || 0) +
      (ship.food_cargo || 0) +
      (ship.tech_cargo || 0) +
      (ship.colonist_cargo || 0);
    const freeSpace = ship.max_cargo_holds + upgrades.cargoBonus - currentCargo;

    let available: number;
    if (planet.planet_class === "S") {
      // Seed worlds: raceless colonists, use total
      available = planet.colonists || 0;
    } else {
      // Owned planets: check specific race population
      const racePop = await db("planet_colonists")
        .where({ planet_id: planet.id, race })
        .first();
      available = racePop?.count || 0;
    }

    const toCollect = Math.min(quantity, available, freeSpace);
    if (toCollect <= 0)
      return res.status(400).json({
        error: "No colonists of that race available or no cargo space",
      });

    // Deduct from planet
    await db("planets")
      .where({ id: planet.id })
      .update({
        colonists: Math.max(0, (planet.colonists || 0) - toCollect),
      });
    if (planet.planet_class !== "S") {
      // Also deduct from planet_colonists race row
      await db("planet_colonists")
        .where({ planet_id: planet.id, race })
        .update({ count: Math.max(0, available - toCollect) });
    }

    // Add to ship_colonists as chosen race
    const existingShipRace = await db("ship_colonists")
      .where({ ship_id: ship.id, race })
      .first();
    if (existingShipRace) {
      await db("ship_colonists")
        .where({ ship_id: ship.id, race })
        .increment("count", toCollect);
    } else {
      await db("ship_colonists").insert({
        id: crypto.randomUUID(),
        ship_id: ship.id,
        race,
        count: toCollect,
      });
    }

    // Update denormalized ship total
    await db("ships")
      .where({ id: ship.id })
      .update({
        colonist_cargo: (ship.colonist_cargo || 0) + toCollect,
      });

    res.json({
      collected: toCollect,
      race,
      planetColonists: available - toCollect,
      shipColonists: (ship.colonist_cargo || 0) + toCollect,
    });
  } catch (err) {
    console.error("Collect colonists error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Deposit colonists into a seed planet
router.post("/:id/deposit-colonists", requireAuth, async (req, res) => {
  if (tutorialBlock(req, res)) return;
  try {
    const { quantity, race } = req.body;
    if (!quantity || quantity < 1)
      return res.status(400).json({ error: "Invalid quantity" });
    if (!race || !VALID_RACE_IDS.includes(race)) {
      return res.status(400).json({
        error: "Invalid race. Must be one of: " + VALID_RACE_IDS.join(", "),
      });
    }

    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const planet = await db("planets").where({ id: req.params.id }).first();
    if (!planet) return res.status(404).json({ error: "Planet not found" });
    if (planet.planet_class !== "S") {
      return res
        .status(400)
        .json({ error: "Can only deposit colonists into seed planets" });
    }
    if (planet.sector_id !== player.current_sector_id) {
      return res.status(400).json({ error: "Planet is not in your sector" });
    }

    // Must be landed or have transporter
    if (player.landed_at_planet_id !== req.params.id) {
      const hasTransporter = await db("game_events")
        .where({
          player_id: player.id,
          event_type: "item:mycelial_transporter",
          read: false,
        })
        .first();
      if (!hasTransporter) {
        return res.status(400).json({
          error:
            "You must land on the planet first, or acquire a Mycelial Transporter",
        });
      }
    }

    const ship = await db("ships")
      .where({ id: player.current_ship_id })
      .first();
    if (!ship) return res.status(400).json({ error: "No active ship" });

    // Check ship_colonists for this race
    const shipRaceRow = await db("ship_colonists")
      .where({ ship_id: ship.id, race })
      .first();
    const raceAvailable = shipRaceRow?.count || 0;
    const toDeposit = Math.min(quantity, raceAvailable);
    if (toDeposit <= 0)
      return res.status(400).json({ error: `No ${race} colonists on ship` });

    // Deduct from ship
    await db("ship_colonists")
      .where({ ship_id: ship.id, race })
      .update({ count: raceAvailable - toDeposit });
    await db("ships")
      .where({ id: ship.id })
      .update({
        colonist_cargo: Math.max(0, (ship.colonist_cargo || 0) - toDeposit),
      });

    // Add to seed planet (raceless total)
    await db("planets")
      .where({ id: planet.id })
      .update({
        colonists: (planet.colonists || 0) + toDeposit,
      });

    res.json({
      deposited: toDeposit,
      race,
      planetColonists: (planet.colonists || 0) + toDeposit,
      shipColonists: Math.max(0, (ship.colonist_cargo || 0) - toDeposit),
    });
  } catch (err) {
    console.error("Deposit colonists error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Production history
router.get("/:id/production-history", requireAuth, async (req, res) => {
  if (tutorialBlock(req, res)) return;
  try {
    const planet = await db("planets").where({ id: req.params.id }).first();
    if (!planet) return res.status(404).json({ error: "Planet not found" });
    if (planet.owner_id !== req.session.playerId) {
      return res.status(403).json({ error: "You do not own this planet" });
    }

    const hours = Math.min(
      168,
      Math.max(1, parseInt(req.query.hours as string) || 24),
    );
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    const history = await db("planet_production_history")
      .where({ planet_id: planet.id })
      .where("tick_at", ">", cutoff.toISOString())
      .orderBy("tick_at", "asc")
      .select("*");

    // Sample if too many entries
    let sampled = history;
    if (history.length > 200) {
      const step = Math.ceil(history.length / 200);
      sampled = history.filter((_: any, i: number) => i % step === 0);
    }

    res.json({
      planetId: planet.id,
      hours,
      history: sampled.map((h: any) => ({
        tickAt: h.tick_at,
        cyrilliumProduced: h.cyrillium_produced,
        techProduced: h.tech_produced,
        dronesProduced: h.drones_produced,
        foodConsumed: h.food_consumed,
        colonistCount: h.colonist_count,
        happiness: h.happiness,
      })),
    });
  } catch (err) {
    console.error("Production history error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Upgrade planet
router.post("/:id/upgrade", requireAuth, async (req, res) => {
  if (tutorialBlock(req, res)) return;
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const planet = await db("planets").where({ id: req.params.id }).first();
    if (!planet) return res.status(404).json({ error: "Planet not found" });
    if (planet.owner_id !== player.id) {
      return res.status(400).json({ error: "You do not own this planet" });
    }

    const { UPGRADE_REQUIREMENTS } = require("../config/planet-types");
    const nextLevel = planet.upgrade_level + 1;
    const req_ = UPGRADE_REQUIREMENTS[nextLevel];
    if (!req_)
      return res.status(400).json({ error: "Planet is already at max level" });

    if (
      !canUpgrade({
        upgradeLevel: planet.upgrade_level,
        colonists: planet.colonists || 0,
        cyrilliumStock: planet.cyrillium_stock || 0,
        foodStock: planet.food_stock || 0,
        techStock: planet.tech_stock || 0,
        ownerCredits: Number(player.credits),
      })
    ) {
      return res
        .status(400)
        .json({ error: "Upgrade requirements not met", requirements: req_ });
    }

    // Deduct resources
    await db("planets")
      .where({ id: planet.id })
      .update({
        upgrade_level: nextLevel,
        cyrillium_stock: (planet.cyrillium_stock || 0) - req_.cyrillium,
        food_stock: (planet.food_stock || 0) - req_.food,
        tech_stock: (planet.tech_stock || 0) - req_.tech,
      });
    await db("players")
      .where({ id: player.id })
      .update({
        credits: Number(player.credits) - req_.credits,
      });

    res.json({
      planetId: planet.id,
      newLevel: nextLevel,
      newCredits: Number(player.credits) - req_.credits,
    });
  } catch (err) {
    console.error("Upgrade error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
