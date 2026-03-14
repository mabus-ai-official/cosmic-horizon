import crypto from "crypto";
import db from "../db/connection";
import { GAME_CONFIG } from "../config/game";
import { PLANET_TYPES } from "../config/planet-types";
import { awardXP } from "./progression";
import { incrementStat, logActivity, checkMilestones } from "./profile-stats";
import { applyUpgradesToShip } from "./upgrades";
import { settleResourceCredit, settleResourceDebit } from "../chain/tx-queue";

// === Query helpers ===

export async function getPlayerResources(playerId: string) {
  return db("player_resources")
    .join(
      "resource_definitions",
      "player_resources.resource_id",
      "resource_definitions.id",
    )
    .where({ "player_resources.player_id": playerId })
    .where("player_resources.quantity", ">", 0)
    .whereNotIn("player_resources.resource_id", ["cyrillium", "food", "tech"])
    .select(
      "resource_definitions.id as resourceId",
      "resource_definitions.name",
      "player_resources.quantity",
      "resource_definitions.tier",
      "resource_definitions.category",
    );
}

export async function getPlanetResources(planetId: string) {
  return db("planet_resources")
    .join(
      "resource_definitions",
      "planet_resources.resource_id",
      "resource_definitions.id",
    )
    .where({ "planet_resources.planet_id": planetId })
    .where("planet_resources.stock", ">", 0)
    .select(
      "resource_definitions.id as resourceId",
      "resource_definitions.name",
      "planet_resources.stock",
      "resource_definitions.tier",
      "resource_definitions.category",
    );
}

export async function getAvailableRecipes(planetLevel: number) {
  const recipes = await db("recipes")
    .where("planet_level_required", "<=", planetLevel)
    .orderBy("tier")
    .orderBy("name");

  const result = [];
  for (const recipe of recipes) {
    const ingredients = await db("recipe_ingredients")
      .join(
        "resource_definitions",
        "recipe_ingredients.resource_id",
        "resource_definitions.id",
      )
      .where({ recipe_id: recipe.id })
      .select(
        "resource_definitions.id as resourceId",
        "resource_definitions.name",
        "recipe_ingredients.quantity",
      );

    result.push({
      id: recipe.id,
      name: recipe.name,
      description: recipe.description,
      outputResourceId: recipe.output_resource_id,
      outputItemType: recipe.output_item_type,
      outputItemId: recipe.output_item_id,
      outputQuantity: recipe.output_quantity,
      tier: recipe.tier,
      craftTimeMinutes: recipe.craft_time_minutes,
      planetLevelRequired: recipe.planet_level_required,
      creditsCost: recipe.credits_cost,
      ingredients,
    });
  }
  return result;
}

export async function getRefineryQueue(planetId: string) {
  const queue = await db("planet_refinery_queue")
    .join("recipes", "planet_refinery_queue.recipe_id", "recipes.id")
    .where({ "planet_refinery_queue.planet_id": planetId })
    .orderBy("planet_refinery_queue.started_at")
    .select(
      "planet_refinery_queue.id",
      "planet_refinery_queue.recipe_id as recipeId",
      "recipes.name as recipeName",
      "planet_refinery_queue.started_at as startedAt",
      "planet_refinery_queue.completes_at as completesAt",
      "planet_refinery_queue.batch_size as batchSize",
      "planet_refinery_queue.collected",
    );

  return queue.map((q) => ({
    ...q,
    ready: new Date(q.completesAt) <= new Date(),
  }));
}

export function getRefinerySlots(
  planetLevel: number,
  isFactory: boolean = false,
): number {
  let slots =
    GAME_CONFIG.CRAFTING_BASE_REFINERY_SLOTS +
    Math.max(0, planetLevel - GAME_CONFIG.CRAFTING_BONUS_SLOTS_ABOVE_LEVEL);
  if (isFactory) slots += GAME_CONFIG.SYNDICATE_FACTORY_BONUS_REFINERY_SLOTS;
  return slots;
}

// === Crafting actions ===

export async function startCraft(
  playerId: string,
  planetId: string,
  recipeId: string,
  batchSize: number = 1,
) {
  if (batchSize < 1 || batchSize > GAME_CONFIG.CRAFTING_MAX_BATCH_SIZE) {
    throw new Error(
      `Batch size must be 1-${GAME_CONFIG.CRAFTING_MAX_BATCH_SIZE}`,
    );
  }

  const planet = await db("planets").where({ id: planetId }).first();
  if (!planet) throw new Error("Planet not found");
  if (planet.owner_id !== playerId)
    throw new Error("You do not own this planet");

  const player = await db("players").where({ id: playerId }).first();
  if (!player) throw new Error("Player not found");
  if (player.current_sector_id !== planet.sector_id) {
    throw new Error("You must be in the planet's sector");
  }

  const recipe = await db("recipes").where({ id: recipeId }).first();
  if (!recipe) throw new Error("Recipe not found");
  if (planet.upgrade_level < recipe.planet_level_required) {
    throw new Error(
      `Planet must be level ${recipe.planet_level_required} for this recipe`,
    );
  }

  // For timed recipes, check refinery slots
  if (recipe.craft_time_minutes > 0) {
    const activeQueue = await db("planet_refinery_queue")
      .where({ planet_id: planetId, collected: false })
      .count("id as count")
      .first();
    const usedSlots = Number(activeQueue?.count || 0);
    const maxSlots = getRefinerySlots(
      planet.upgrade_level,
      planet.is_syndicate_factory || false,
    );
    if (usedSlots >= maxSlots) {
      throw new Error(`All ${maxSlots} refinery slots are in use`);
    }
  }

  // Validate ingredients
  const ingredients = await db("recipe_ingredients").where({
    recipe_id: recipeId,
  });
  for (const ing of ingredients) {
    const playerRes = await db("player_resources")
      .where({ player_id: playerId, resource_id: ing.resource_id })
      .first();
    const available = playerRes?.quantity || 0;
    const needed = ing.quantity * batchSize;
    if (available < needed) {
      const resDef = await db("resource_definitions")
        .where({ id: ing.resource_id })
        .first();
      throw new Error(
        `Not enough ${resDef?.name || ing.resource_id} (need ${needed}, have ${available})`,
      );
    }
  }

  // Deduct ingredients
  for (const ing of ingredients) {
    const needed = ing.quantity * batchSize;
    await db("player_resources")
      .where({ player_id: playerId, resource_id: ing.resource_id })
      .decrement("quantity", needed);
  }

  // Deduct credits
  const totalCredits = recipe.credits_cost * batchSize;
  if (totalCredits > 0) {
    if (Number(player.credits) < totalCredits) {
      throw new Error(`Not enough credits (need ${totalCredits})`);
    }
    await db("players")
      .where({ id: playerId })
      .decrement("credits", totalCredits);
  }

  // Award XP
  const xpAmount =
    recipe.tier === 2
      ? GAME_CONFIG.XP_CRAFT_TIER2
      : recipe.tier === 3
        ? GAME_CONFIG.XP_CRAFT_TIER3
        : GAME_CONFIG.XP_CRAFT_TIER4;
  const xpResult = await awardXP(playerId, xpAmount * batchSize, "craft");

  // Profile stats: craft
  incrementStat(playerId, "items_crafted", batchSize);
  logActivity(playerId, "craft", `Crafted ${batchSize}x ${recipe.name}`, {
    recipeId,
    batchSize,
  });
  checkMilestones(playerId);

  if (recipe.craft_time_minutes > 0) {
    const now = new Date();
    const completesAt = new Date(
      now.getTime() + recipe.craft_time_minutes * batchSize * 60 * 1000,
    );
    const queueId = crypto.randomUUID();

    await db("planet_refinery_queue").insert({
      id: queueId,
      planet_id: planetId,
      recipe_id: recipeId,
      player_id: playerId,
      started_at: now.toISOString(),
      completes_at: completesAt.toISOString(),
      batch_size: batchSize,
      collected: false,
    });

    return {
      queued: true,
      queueId,
      recipeName: recipe.name,
      batchSize,
      completesAt: completesAt.toISOString(),
      creditsCost: totalCredits,
      xp: {
        awarded: xpResult.xpAwarded,
        total: xpResult.totalXp,
        level: xpResult.level,
        rank: xpResult.rank,
        levelUp: xpResult.levelUp,
      },
    };
  } else {
    const outputResult = await applyInstantOutput(playerId, recipe, batchSize);
    return {
      queued: false,
      recipeName: recipe.name,
      batchSize,
      output: outputResult,
      creditsCost: totalCredits,
      xp: {
        awarded: xpResult.xpAwarded,
        total: xpResult.totalXp,
        level: xpResult.level,
        rank: xpResult.rank,
        levelUp: xpResult.levelUp,
      },
    };
  }
}

async function applyInstantOutput(
  playerId: string,
  recipe: any,
  batchSize: number,
) {
  const totalQty = (recipe.output_quantity || 1) * batchSize;

  if (recipe.output_item_type === "resource" && recipe.output_resource_id) {
    await adjustPlayerResource(playerId, recipe.output_resource_id, totalQty);
    const resDef = await db("resource_definitions")
      .where({ id: recipe.output_resource_id })
      .first();
    return {
      type: "resource",
      name: resDef?.name || recipe.output_resource_id,
      quantity: totalQty,
    };
  }

  if (recipe.output_item_type === "tablet") {
    const rarityMap: Record<string, string> = {
      random_common: "common",
      random_uncommon: "uncommon",
      random_rare: "rare",
      random_epic: "epic",
    };
    const rarity = rarityMap[recipe.output_item_id] || "common";
    try {
      const { grantRandomTablet } = require("./tablets");
      const results = [];
      for (let i = 0; i < totalQty; i++) {
        const tabletResult = await grantRandomTablet(playerId, rarity);
        results.push(tabletResult);
      }
      return { type: "tablet", results };
    } catch {
      return { type: "tablet", error: "Tablet system unavailable" };
    }
  }

  if (recipe.output_item_type === "upgrade") {
    return {
      type: "upgrade",
      upgradeTypeId: recipe.output_item_id,
      name: recipe.name,
      quantity: totalQty,
    };
  }

  if (recipe.output_item_type === "consumable") {
    return {
      type: "consumable",
      itemId: recipe.output_item_id,
      name: recipe.name,
      quantity: totalQty,
    };
  }

  return { type: "unknown" };
}

export async function collectRefineryBatch(playerId: string, queueId: string) {
  const entry = await db("planet_refinery_queue")
    .join("recipes", "planet_refinery_queue.recipe_id", "recipes.id")
    .where({ "planet_refinery_queue.id": queueId })
    .select(
      "planet_refinery_queue.*",
      "recipes.name as recipe_name",
      "recipes.output_resource_id",
      "recipes.output_item_type",
      "recipes.output_item_id",
      "recipes.output_quantity",
    )
    .first();

  if (!entry) throw new Error("Queue entry not found");
  if (entry.collected) throw new Error("Already collected");

  const planet = await db("planets").where({ id: entry.planet_id }).first();
  if (!planet || planet.owner_id !== playerId) {
    throw new Error("You do not own this planet");
  }

  if (new Date(entry.completes_at) > new Date()) {
    throw new Error("Not ready yet");
  }

  await db("planet_refinery_queue")
    .where({ id: queueId })
    .update({ collected: true });

  const output = await applyInstantOutput(playerId, entry, entry.batch_size);
  const xpResult = await awardXP(
    playerId,
    GAME_CONFIG.XP_COLLECT_RESOURCES,
    "craft",
  );

  return {
    recipeName: entry.recipe_name,
    batchSize: entry.batch_size,
    output,
    xp: {
      awarded: xpResult.xpAwarded,
      total: xpResult.totalXp,
      level: xpResult.level,
      rank: xpResult.rank,
      levelUp: xpResult.levelUp,
    },
  };
}

export async function collectAllCompleted(playerId: string, planetId: string) {
  const planet = await db("planets").where({ id: planetId }).first();
  if (!planet || planet.owner_id !== playerId) {
    throw new Error("You do not own this planet");
  }

  const ready = await db("planet_refinery_queue")
    .where({ planet_id: planetId, collected: false })
    .where("completes_at", "<=", new Date().toISOString());

  const results = [];
  for (const entry of ready) {
    try {
      const result = await collectRefineryBatch(playerId, entry.id);
      results.push(result);
    } catch {
      /* skip individual failures */
    }
  }

  return { collected: results.length, results };
}

// === Planet resource production (called from game tick) ===

export async function producePlanetUniqueResources(planet: any) {
  const planetType = PLANET_TYPES[planet.planet_class];
  if (!planetType?.uniqueResources || !planet.owner_id || planet.colonists <= 0)
    return;

  const colonists = planet.colonists || 0;
  const idealPop = planetType.idealPopulation;
  const efficiency =
    colonists <= idealPop
      ? 1.0
      : Math.max(0.5, 1.0 - (colonists - idealPop) / idealPop);

  for (const res of planetType.uniqueResources) {
    const produced = Math.floor(
      res.rate *
        (colonists / 1000) *
        efficiency *
        GAME_CONFIG.CRAFTING_UNIQUE_RESOURCE_RATE,
    );
    if (produced <= 0) continue;

    const existing = await db("planet_resources")
      .where({ planet_id: planet.id, resource_id: res.id })
      .first();

    if (existing) {
      await db("planet_resources")
        .where({ planet_id: planet.id, resource_id: res.id })
        .increment("stock", produced);
    } else {
      await db("planet_resources").insert({
        planet_id: planet.id,
        resource_id: res.id,
        stock: produced,
      });
    }
  }
}

// === Collect planet resources ===

export async function collectPlanetResources(
  playerId: string,
  planetId: string,
) {
  const planet = await db("planets").where({ id: planetId }).first();
  if (!planet) throw new Error("Planet not found");
  if (planet.owner_id !== playerId)
    throw new Error("You do not own this planet");

  const player = await db("players").where({ id: playerId }).first();
  if (!player) throw new Error("Player not found");
  if (player.current_sector_id !== planet.sector_id) {
    throw new Error("You must be in the planet's sector");
  }

  // Get ship and cargo capacity
  const ship = await db("ships").where({ id: player.current_ship_id }).first();
  if (!ship) throw new Error("No active ship");

  const upgrades = await applyUpgradesToShip(ship.id);
  const maxCargo = ship.max_cargo_holds + upgrades.cargoBonus;
  const currentCargo =
    (ship.cyrillium_cargo || 0) +
    (ship.food_cargo || 0) +
    (ship.tech_cargo || 0) +
    (ship.colonist_cargo || 0);
  let freeSpace = maxCargo - currentCargo;

  const collected: { resourceId: string; name: string; quantity: number }[] =
    [];

  // Base commodities go into ship cargo (capacity-limited)
  const baseCommodities = [
    {
      field: "cyrillium_stock",
      cargoField: "cyrillium_cargo",
      resourceId: "cyrillium",
      name: "Cyrillium",
    },
    {
      field: "food_stock",
      cargoField: "food_cargo",
      resourceId: "food",
      name: "Food",
    },
    {
      field: "tech_stock",
      cargoField: "tech_cargo",
      resourceId: "tech",
      name: "Tech Components",
    },
  ];

  const planetUpdates: Record<string, number> = {};

  for (const commodity of baseCommodities) {
    const available = planet[commodity.field] || 0;
    if (available > 0 && freeSpace > 0) {
      const toLoad = Math.min(available, freeSpace);
      await db("ships")
        .where({ id: ship.id })
        .increment(commodity.cargoField, toLoad);
      planetUpdates[commodity.field] = available - toLoad;
      freeSpace -= toLoad;
      collected.push({
        resourceId: commodity.resourceId,
        name: commodity.name,
        quantity: toLoad,
      });
      // Chain settlement: credit resource token
      await settleResourceCredit(
        playerId,
        commodity.resourceId,
        toLoad,
        "trade",
      );
    } else {
      planetUpdates[commodity.field] = available;
    }
  }

  // Update planet stocks (only deduct what was loaded)
  await db("planets").where({ id: planetId }).update(planetUpdates);

  // Unique/crafted resources still go to player_resources (used for crafting, not cargo-limited)
  const planetResources = await db("planet_resources")
    .join(
      "resource_definitions",
      "planet_resources.resource_id",
      "resource_definitions.id",
    )
    .where({ "planet_resources.planet_id": planetId })
    .where("planet_resources.stock", ">", 0)
    .select(
      "planet_resources.resource_id",
      "resource_definitions.name",
      "planet_resources.stock",
    );

  for (const pr of planetResources) {
    await adjustPlayerResource(playerId, pr.resource_id, pr.stock);
    collected.push({
      resourceId: pr.resource_id,
      name: pr.name,
      quantity: pr.stock,
    });
  }

  await db("planet_resources")
    .where({ planet_id: planetId })
    .update({ stock: 0 });

  // Calculate remaining free space for client display
  const updatedShip = await db("ships").where({ id: ship.id }).first();
  const newCargo =
    (updatedShip.cyrillium_cargo || 0) +
    (updatedShip.food_cargo || 0) +
    (updatedShip.tech_cargo || 0) +
    (updatedShip.colonist_cargo || 0);

  // Only award XP if something was actually collected
  let xpResult: any = {
    xpAwarded: 0,
    totalXp: 0,
    level: 0,
    rank: "",
    levelUp: false,
  };
  if (collected.length > 0) {
    xpResult = await awardXP(
      playerId,
      GAME_CONFIG.XP_COLLECT_RESOURCES,
      "explore",
    );
  }

  return {
    collected,
    cargoUsed: newCargo,
    cargoMax: maxCargo,
    cargoFull: newCargo >= maxCargo,
    xp: {
      awarded: xpResult.xpAwarded,
      total: xpResult.totalXp,
      level: xpResult.level,
      rank: xpResult.rank,
      levelUp: xpResult.levelUp,
    },
  };
}

// === Utility ===

export async function adjustPlayerResource(
  playerId: string,
  resourceId: string,
  amount: number,
) {
  const existing = await db("player_resources")
    .where({ player_id: playerId, resource_id: resourceId })
    .first();

  if (existing) {
    const newQty = Math.max(0, existing.quantity + amount);
    await db("player_resources")
      .where({ player_id: playerId, resource_id: resourceId })
      .update({ quantity: newQty });
  } else if (amount > 0) {
    await db("player_resources").insert({
      player_id: playerId,
      resource_id: resourceId,
      quantity: amount,
    });
  }

  // Chain settlement for known ERC-20 resources (cyrillium, food, tech, drift_fuel)
  try {
    if (amount > 0) {
      await settleResourceCredit(playerId, resourceId, amount, "trade");
    } else if (amount < 0) {
      await settleResourceDebit(
        playerId,
        resourceId,
        Math.abs(amount),
        "trade",
      );
    }
  } catch {
    /* chain sync failure is non-critical */
  }

  // Check for recipe discovery when gaining resources
  if (amount > 0) {
    try {
      await checkRecipeDiscovery(playerId, resourceId);
    } catch {
      /* non-critical */
    }
  }
}

/**
 * Check if acquiring a resource unlocks any new recipes for the player.
 * Called from all resource-acquisition paths.
 */
export async function checkRecipeDiscovery(
  playerId: string,
  resourceId: string,
): Promise<string[]> {
  try {
    // Find all recipes that use this resource as an ingredient
    const recipesUsingResource = await db("recipe_ingredients")
      .where({ resource_id: resourceId })
      .select("recipe_id");

    if (recipesUsingResource.length === 0) return [];

    const recipeIds = recipesUsingResource.map((r) => r.recipe_id);

    // Find which of these the player hasn't discovered yet
    const alreadyDiscovered = await db("player_discovered_recipes")
      .where({ player_id: playerId })
      .whereIn("recipe_id", recipeIds)
      .select("recipe_id");

    const discoveredSet = new Set(alreadyDiscovered.map((r) => r.recipe_id));
    const newRecipeIds = recipeIds.filter((id) => !discoveredSet.has(id));

    if (newRecipeIds.length === 0) return [];

    // Insert newly discovered recipes
    const now = new Date().toISOString();
    await db("player_discovered_recipes").insert(
      newRecipeIds.map((recipeId) => ({
        player_id: playerId,
        recipe_id: recipeId,
        discovered_at: now,
      })),
    );

    // Get recipe names for notification
    const recipes = await db("recipes")
      .whereIn("id", newRecipeIds)
      .select("name");
    return recipes.map((r) => r.name);
  } catch (err) {
    console.error("Recipe discovery check error:", err);
    return [];
  }
}
