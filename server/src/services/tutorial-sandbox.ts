/**
 * Tutorial sandbox service.
 *
 * All handler functions are called from existing route guards when the player
 * is in the tutorial (req.inTutorial === true).  Virtual state is stored as
 * JSON on the players.tutorial_state column so the real game tables are
 * never touched during onboarding.
 */

import { Request, Response } from "express";
import {
  TUTORIAL_SECTORS,
  TutorialVirtualState,
  getTutorialSector,
  TutorialOutpost,
} from "../config/tutorial-sandbox";
import { calculatePrice, CommodityType } from "../engine/trading";
import { GAME_CONFIG } from "../config/game";
import { getRace, RaceId } from "../config/races";
import db from "../db/connection";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseTutorialState(req: Request): TutorialVirtualState {
  return (req as any).tutorialState as TutorialVirtualState;
}

async function persistState(
  playerId: string,
  state: TutorialVirtualState,
): Promise<void> {
  await db("players")
    .where({ id: playerId })
    .update({
      tutorial_state: JSON.stringify(state),
    });
}

function outpostPrices(outpost: TutorialOutpost) {
  return {
    cyrillium: {
      price: calculatePrice(
        "cyrillium",
        outpost.cyrillium.stock,
        outpost.cyrillium.capacity,
      ),
      stock: outpost.cyrillium.stock,
      capacity: outpost.cyrillium.capacity,
      mode: outpost.cyrillium.mode,
    },
    food: {
      price: calculatePrice("food", outpost.food.stock, outpost.food.capacity),
      stock: outpost.food.stock,
      capacity: outpost.food.capacity,
      mode: outpost.food.mode,
    },
    tech: {
      price: calculatePrice("tech", outpost.tech.stock, outpost.tech.capacity),
      stock: outpost.tech.stock,
      capacity: outpost.tech.capacity,
      mode: outpost.tech.mode,
    },
  };
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export async function handleTutorialStatus(req: Request, res: Response) {
  try {
    const state = parseTutorialState(req);
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    res.json({
      id: player.id,
      username: player.username,
      race: player.race,
      energy: state.energy,
      maxEnergy: state.maxEnergy,
      credits: state.credits,
      currentSectorId: state.currentSectorId,
      dockedAtOutpostId: state.dockedAtOutpostId || null,
      landedAtPlanetId: state.landedAtPlanetId || null,
      tutorialStep: player.tutorial_step || 0,
      tutorialCompleted: false,
      hasSeenIntro: !!player.has_seen_intro,
      hasSeenPostTutorial: false,
      currentShip: {
        id: "tutorial-ship",
        shipTypeId: "scout",
        hullHp: 100,
        maxHullHp: 100,
        weaponEnergy: 0,
        engineEnergy: 0,
        cargoHolds: state.cargoHolds,
        maxCargoHolds: state.maxCargoHolds,
        cyrilliumCargo: state.cyrilliumCargo,
        foodCargo: state.foodCargo,
        techCargo: state.techCargo,
        colonistsCargo: state.colonistsCargo,
      },
    });
  } catch (err) {
    console.error("Tutorial status error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function handleTutorialSector(req: Request, res: Response) {
  try {
    const state = parseTutorialState(req);
    const sector = getTutorialSector(state.currentSectorId);
    if (!sector)
      return res.status(404).json({ error: "Tutorial sector not found" });

    res.json({
      sectorId: sector.id,
      type: sector.type,
      regionId: sector.regionId,
      hasStarMall: sector.hasStarMall,
      adjacentSectors: sector.adjacentSectors.map((id) => ({
        sectorId: id,
        oneWay: false,
      })),
      players: [],
      outposts: sector.outpost
        ? [{ id: sector.outpost.id, name: sector.outpost.name }]
        : [],
      planets: (sector.planets || []).map((p) => ({
        id: p.id,
        name: p.name,
        planetClass: p.planetClass,
        ownerId: p.ownerId,
      })),
      deployables: [],
      events: [],
      warpGates: [],
    });
  } catch (err) {
    console.error("Tutorial sector error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function handleTutorialMove(req: Request, res: Response) {
  try {
    const state = parseTutorialState(req);
    const targetSectorId = parseInt(req.params.sectorId as string, 10);
    if (isNaN(targetSectorId))
      return res.status(400).json({ error: "Invalid sector ID" });

    const currentSector = getTutorialSector(state.currentSectorId);
    if (!currentSector)
      return res.status(400).json({ error: "Current tutorial sector invalid" });

    if (!currentSector.adjacentSectors.includes(targetSectorId)) {
      return res.status(400).json({ error: "Sector is not adjacent" });
    }

    const targetSector = getTutorialSector(targetSectorId);
    if (!targetSector)
      return res.status(400).json({ error: "Target sector not found" });

    // No energy cost during tutorial
    state.currentSectorId = targetSectorId;
    state.dockedAtOutpostId = null;
    if (!state.exploredSectors.includes(targetSectorId)) {
      state.exploredSectors.push(targetSectorId);
    }

    await persistState(req.session.playerId!, state);

    res.json({
      sectorId: targetSectorId,
      sectorType: targetSector.type,
      energy: state.energy,
      players: [],
      outposts: targetSector.outpost
        ? [{ id: targetSector.outpost.id, name: targetSector.outpost.name }]
        : [],
      planets: (targetSector.planets || []).map((p) => ({
        id: p.id,
        name: p.name,
        planetClass: p.planetClass,
        ownerId: p.ownerId,
      })),
    });
  } catch (err) {
    console.error("Tutorial move error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function handleTutorialMap(req: Request, res: Response) {
  try {
    const state = parseTutorialState(req);

    const sectors = state.exploredSectors
      .map((id) => getTutorialSector(id))
      .filter(Boolean)
      .map((s) => ({
        id: s!.id,
        type: s!.type,
        regionId: s!.regionId,
        hasStarMall: s!.hasStarMall,
      }));

    // Build edges between explored sectors
    const edges: { from: number; to: number; oneWay: boolean }[] = [];
    for (const id of state.exploredSectors) {
      const s = getTutorialSector(id);
      if (!s) continue;
      for (const adj of s.adjacentSectors) {
        if (state.exploredSectors.includes(adj)) {
          edges.push({ from: id, to: adj, oneWay: false });
        }
      }
    }

    res.json({
      currentSectorId: state.currentSectorId,
      sectors,
      edges,
    });
  } catch (err) {
    console.error("Tutorial map error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function handleTutorialOutpost(req: Request, res: Response) {
  try {
    const state = parseTutorialState(req);
    const outpostId = req.params.id as string;

    const sector = getTutorialSector(state.currentSectorId);
    if (!sector?.outpost || sector.outpost.id !== outpostId) {
      return res.status(400).json({ error: "Outpost is not in your sector" });
    }

    res.json({
      outpostId: sector.outpost.id,
      name: sector.outpost.name,
      treasury: sector.outpost.treasury,
      prices: outpostPrices(sector.outpost),
    });
  } catch (err) {
    console.error("Tutorial outpost error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function handleTutorialDock(req: Request, res: Response) {
  try {
    const state = parseTutorialState(req);
    const sector = getTutorialSector(state.currentSectorId);
    if (!sector?.outpost) {
      return res.status(400).json({ error: "No outpost in this sector" });
    }

    state.dockedAtOutpostId = sector.outpost.id;
    await persistState(req.session.playerId!, state);

    res.json({
      docked: true,
      outpostId: sector.outpost.id,
      name: sector.outpost.name,
      treasury: sector.outpost.treasury,
      prices: outpostPrices(sector.outpost),
    });
  } catch (err) {
    console.error("Tutorial dock error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function handleTutorialUndock(req: Request, res: Response) {
  try {
    const state = parseTutorialState(req);
    if (!state.dockedAtOutpostId) {
      return res.status(400).json({ error: "Not currently docked" });
    }

    state.dockedAtOutpostId = null;
    await persistState(req.session.playerId!, state);

    res.json({ undocked: true });
  } catch (err) {
    console.error("Tutorial undock error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function handleTutorialBuy(req: Request, res: Response) {
  try {
    const state = parseTutorialState(req);
    const { outpostId, commodity, quantity } = req.body;

    if (!outpostId || !commodity || !quantity || quantity < 1) {
      return res.status(400).json({ error: "Missing or invalid fields" });
    }
    if (!["cyrillium", "food", "tech"].includes(commodity)) {
      return res.status(400).json({ error: "Invalid commodity" });
    }

    const sector = getTutorialSector(state.currentSectorId);
    if (!sector?.outpost || sector.outpost.id !== outpostId) {
      return res.status(400).json({ error: "Outpost is not in your sector" });
    }

    const outpost = sector.outpost;
    const commData = outpost[commodity as CommodityType];
    if (commData.mode !== "sell") {
      return res
        .status(400)
        .json({ error: "Outpost does not sell this commodity" });
    }

    const currentCargo =
      state.cyrilliumCargo +
      state.foodCargo +
      state.techCargo +
      state.colonistsCargo;
    const freeSpace = state.maxCargoHolds - currentCargo;
    const availableStock = commData.stock;
    const maxBuyable = Math.min(quantity, freeSpace, availableStock);
    if (maxBuyable <= 0) {
      return res
        .status(400)
        .json({ error: "No cargo space or stock available" });
    }

    const pricePerUnit = calculatePrice(
      commodity as CommodityType,
      commData.stock,
      commData.capacity,
    );
    const totalCost = pricePerUnit * maxBuyable;

    if (totalCost > state.credits) {
      return res.status(400).json({ error: "Not enough credits" });
    }

    // Virtual buy — no energy cost
    state.credits -= totalCost;
    const cargoKey = `${commodity}Cargo` as keyof Pick<
      TutorialVirtualState,
      "cyrilliumCargo" | "foodCargo" | "techCargo"
    >;
    (state as any)[cargoKey] += maxBuyable;

    await persistState(req.session.playerId!, state);

    res.json({
      commodity,
      quantity: maxBuyable,
      pricePerUnit,
      totalCost,
      tradeBonus: 0,
      newCredits: state.credits,
      energy: state.energy,
    });
  } catch (err) {
    console.error("Tutorial buy error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function handleTutorialSell(req: Request, res: Response) {
  try {
    const state = parseTutorialState(req);
    const { outpostId, commodity, quantity } = req.body;

    if (!outpostId || !commodity || !quantity || quantity < 1) {
      return res.status(400).json({ error: "Missing or invalid fields" });
    }
    if (!["cyrillium", "food", "tech"].includes(commodity)) {
      return res.status(400).json({ error: "Invalid commodity" });
    }

    const sector = getTutorialSector(state.currentSectorId);
    if (!sector?.outpost || sector.outpost.id !== outpostId) {
      return res.status(400).json({ error: "Outpost is not in your sector" });
    }

    const outpost = sector.outpost;
    const commData = outpost[commodity as CommodityType];
    if (commData.mode !== "buy") {
      return res
        .status(400)
        .json({ error: "Outpost does not buy this commodity" });
    }

    const cargoKey = `${commodity}Cargo` as keyof Pick<
      TutorialVirtualState,
      "cyrilliumCargo" | "foodCargo" | "techCargo"
    >;
    const available = (state as any)[cargoKey] as number;
    if (available <= 0) {
      return res.status(400).json({ error: "No cargo of this type" });
    }

    const sellQuantity = Math.min(quantity, available);
    const pricePerUnit = calculatePrice(
      commodity as CommodityType,
      commData.stock,
      commData.capacity,
    );
    const totalRevenue = pricePerUnit * sellQuantity;

    // Virtual sell — no energy cost
    state.credits += totalRevenue;
    (state as any)[cargoKey] -= sellQuantity;

    await persistState(req.session.playerId!, state);

    res.json({
      commodity,
      quantity: sellQuantity,
      pricePerUnit,
      totalCost: totalRevenue,
      tradeBonus: 0,
      newCredits: state.credits,
      energy: state.energy,
    });
  } catch (err) {
    console.error("Tutorial sell error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function handleTutorialScan(req: Request, res: Response) {
  try {
    const state = parseTutorialState(req);
    const sector = getTutorialSector(state.currentSectorId);
    if (!sector)
      return res.status(400).json({ error: "Current sector invalid" });

    const scannedSectors = sector.adjacentSectors
      .map((id) => getTutorialSector(id))
      .filter(Boolean)
      .map((s) => ({
        id: s!.id,
        type: s!.type,
        planets: (s!.planets || []).map((p) => ({
          id: p.id,
          name: p.name,
          planetClass: p.planetClass,
          ownerId: p.ownerId,
        })),
        players: [],
      }));

    res.json({ scannedSectors });
  } catch (err) {
    console.error("Tutorial scan error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ---------------------------------------------------------------------------
// Land / Liftoff / Claim / Planet Info (tutorial sandbox)
// ---------------------------------------------------------------------------

export async function handleTutorialLand(req: Request, res: Response) {
  try {
    const state = parseTutorialState(req);
    const { planetId } = req.body;
    if (!planetId) return res.status(400).json({ error: "Missing planetId" });

    if (state.landedAtPlanetId)
      return res
        .status(400)
        .json({ error: "You must liftoff before landing on another planet" });

    const sector = getTutorialSector(state.currentSectorId);
    const planet = (sector?.planets || []).find((p) => p.id === planetId);
    if (!planet)
      return res.status(404).json({ error: "Planet not found in sector" });

    state.landedAtPlanetId = planetId;
    await persistState(req.session.playerId!, state);

    res.json({
      landed: true,
      planetId: planet.id,
      name: planet.name,
      planetClass: planet.planetClass,
      className: planet.planetClass,
      ownerId: planet.ownerId,
      upgradeLevel: 0,
    });
  } catch (err) {
    console.error("Tutorial land error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function handleTutorialLiftoff(req: Request, res: Response) {
  try {
    const state = parseTutorialState(req);
    if (!state.landedAtPlanetId)
      return res.status(400).json({ error: "You are not landed on a planet" });

    state.landedAtPlanetId = null;
    await persistState(req.session.playerId!, state);

    res.json({ liftedOff: true });
  } catch (err) {
    console.error("Tutorial liftoff error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function handleTutorialClaim(req: Request, res: Response) {
  try {
    const state = parseTutorialState(req);
    const planetId = req.params.id as string;

    const sector = getTutorialSector(state.currentSectorId);
    const planet = (sector?.planets || []).find((p) => p.id === planetId);
    if (!planet) return res.status(404).json({ error: "Planet not found" });

    if (state.landedAtPlanetId !== planetId) {
      return res
        .status(400)
        .json({ error: "You must land on the planet first" });
    }

    // Check virtual state, not the shared config object
    const alreadyClaimed =
      state.claimedPlanetIds?.includes(planetId) || planet.ownerId;
    if (alreadyClaimed)
      return res.status(400).json({ error: "Planet is already claimed" });

    // Mark as claimed in virtual state only (don't mutate shared config)
    if (!state.claimedPlanetIds) state.claimedPlanetIds = [];
    state.claimedPlanetIds.push(planetId);
    await persistState(req.session.playerId!, state);

    res.json({ claimed: true, planetId: planet.id, name: planet.name });
  } catch (err) {
    console.error("Tutorial claim error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function handleTutorialPlanetInfo(req: Request, res: Response) {
  try {
    const state = parseTutorialState(req);
    const planetId = req.params.id as string;

    // Search all tutorial sectors for the planet
    let planet = null;
    for (const s of Object.values(TUTORIAL_SECTORS)) {
      planet = (s.planets || []).find((p) => p.id === planetId) || null;
      if (planet) break;
    }
    if (!planet) return res.status(404).json({ error: "Planet not found" });

    const isClaimed = state.claimedPlanetIds?.includes(planetId);

    res.json({
      id: planet.id,
      name: planet.name,
      planetClass: planet.planetClass,
      ownerId: isClaimed ? req.session.playerId : planet.ownerId,
      upgradeLevel: 0,
      colonists: 0,
      cyrilliumStock: 0,
      foodStock: 0,
      techStock: 0,
      droneCount: 0,
      production: { cyrillium: 0, food: 0, tech: 0 },
      uniqueResources: [],
      refineryQueue: [],
      refinerySlots: 0,
      canUpgrade: false,
    });
  } catch (err) {
    console.error("Tutorial planet info error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function handleTutorialOwnedPlanets(req: Request, res: Response) {
  try {
    const state = parseTutorialState(req);
    const owned: any[] = [];
    for (const s of Object.values(TUTORIAL_SECTORS)) {
      for (const p of s.planets || []) {
        if (state.claimedPlanetIds?.includes(p.id)) {
          owned.push({
            id: p.id,
            name: p.name,
            planetClass: p.planetClass,
            sectorId: s.id,
            upgradeLevel: 0,
            colonists: 0,
            cyrilliumStock: 0,
            foodStock: 0,
            techStock: 0,
            droneCount: 0,
            happiness: 100,
            happinessTier: "content",
            foodConsumption: 0,
            racePopulations: [],
            production: { cyrillium: 0, tech: 0, drones: 0 },
          });
        }
      }
    }
    res.json({ planets: owned });
  } catch (err) {
    console.error("Tutorial owned planets error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function handleTutorialDiscoveredPlanets(
  req: Request,
  res: Response,
) {
  try {
    const state = parseTutorialState(req);
    const planets: any[] = [];
    for (const s of Object.values(TUTORIAL_SECTORS)) {
      if (!state.exploredSectors.includes(s.id)) continue;
      for (const p of s.planets || []) {
        const isClaimed = state.claimedPlanetIds?.includes(p.id);
        planets.push({
          id: p.id,
          name: p.name,
          planetClass: p.planetClass,
          sectorId: s.id,
          owned: isClaimed,
          ownerName: isClaimed ? "You" : null,
          upgradeLevel: 0,
          colonists: 0,
        });
      }
    }
    res.json({ planets });
  } catch (err) {
    console.error("Tutorial discovered planets error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

export async function resetPlayerForRealGame(
  playerId: string,
): Promise<{ newSectorId: number; newCredits: number }> {
  const player = await db("players").where({ id: playerId }).first();
  if (!player) throw new Error("Player not found");

  // Pick a random Star Mall sector
  const starMallSector = await db("sectors")
    .where({ has_star_mall: true })
    .orderByRaw("RANDOM()")
    .first();

  if (!starMallSector) throw new Error("No star mall sectors found");

  // Compute race defaults
  const raceConfig = player.race ? getRace(player.race as RaceId) : null;
  const startingCredits =
    GAME_CONFIG.STARTING_CREDITS + (raceConfig?.startingCreditsBonus ?? 0);
  const startingMaxEnergy =
    GAME_CONFIG.MAX_ENERGY + (raceConfig?.startingMaxEnergyBonus ?? 0);

  // Reset player to real-game defaults
  await db("players")
    .where({ id: playerId })
    .update({
      current_sector_id: starMallSector.id,
      credits: startingCredits,
      energy: startingMaxEnergy,
      max_energy: startingMaxEnergy,
      explored_sectors: JSON.stringify([starMallSector.id]),
      tutorial_state: null,
    });

  // Move active ship to the new sector and reset cargo
  if (player.current_ship_id) {
    await db("ships").where({ id: player.current_ship_id }).update({
      sector_id: starMallSector.id,
      cyrillium_cargo: 0,
      food_cargo: 0,
      tech_cargo: 0,
      colonist_cargo: 0,
    });
  }

  return { newSectorId: starMallSector.id, newCredits: startingCredits };
}
