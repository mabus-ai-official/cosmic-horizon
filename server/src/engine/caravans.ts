import crypto from "crypto";
import { Server as SocketIOServer } from "socket.io";
import db from "../db/connection";
import { GAME_CONFIG } from "../config/game";
import { findShortestPath, type SectorEdge } from "./universe";
import { resolveCombatVolley, type CombatState } from "./combat";
import { adjustPlayerResource } from "./crafting";
import { awardXP } from "./progression";
import { notifyPlayer, notifySector } from "../ws/handlers";
import { incrementStat, logActivity, checkMilestones } from "./profile-stats";
import { settleCreditPlayer, settleResourceCredit } from "../chain/tx-queue";

/**
 * Get maximum trade route slots based on player level.
 */
export function getMaxRouteSlots(playerLevel: number): number {
  const levels = GAME_CONFIG.TRADE_ROUTE_SLOT_LEVELS;
  let maxSlots = 0;
  for (const [slots, requiredLevel] of Object.entries(levels)) {
    if (playerLevel >= requiredLevel) {
      maxSlots = Math.max(maxSlots, Number(slots));
    }
  }
  return maxSlots;
}

/**
 * Compute the shortest path between two sectors using BFS.
 * Returns null if no path or path exceeds MAX_PATH_LENGTH.
 */
export async function computeRoutePath(
  sourceSectorId: number,
  destSectorId: number,
): Promise<number[] | null> {
  const edgeRows = await db("sector_edges").select(
    "from_sector_id",
    "to_sector_id",
    "one_way",
  );

  const edgeMap = new Map<number, SectorEdge[]>();
  for (const row of edgeRows) {
    const from = row.from_sector_id;
    const to = row.to_sector_id;

    const fromList = edgeMap.get(from) || [];
    fromList.push({ from, to, oneWay: !!row.one_way });
    edgeMap.set(from, fromList);

    if (!row.one_way) {
      const toList = edgeMap.get(to) || [];
      if (!toList.some((e) => e.to === from)) {
        toList.push({ from: to, to: from, oneWay: false });
        edgeMap.set(to, toList);
      }
    }
  }

  const path = findShortestPath(
    edgeMap,
    sourceSectorId,
    destSectorId,
    GAME_CONFIG.TRADE_ROUTE_MAX_PATH_LENGTH,
  );
  if (!path || path.length - 1 > GAME_CONFIG.TRADE_ROUTE_MAX_PATH_LENGTH) {
    return null;
  }
  return path;
}

/**
 * Dispatch new caravans for active trade routes whose dispatch interval has elapsed.
 * Called every game tick.
 */
export async function dispatchCaravans(io: SocketIOServer): Promise<void> {
  const now = new Date();
  const intervalMs =
    GAME_CONFIG.TRADE_ROUTE_DISPATCH_INTERVAL_TICKS *
    GAME_CONFIG.TICK_INTERVAL_MS;

  const activeRoutes = await db("trade_routes").where({ status: "active" });

  for (const route of activeRoutes) {
    // Check dispatch interval
    if (route.last_dispatch_at) {
      const lastDispatch = new Date(route.last_dispatch_at);
      if (now.getTime() - lastDispatch.getTime() < intervalMs) continue;
    }

    // Check if route already has an in-transit caravan (one at a time)
    const existingCaravan = await db("caravans")
      .where({ trade_route_id: route.id, status: "in_transit" })
      .first();
    if (existingCaravan) continue;

    // Check owner can afford credits
    const owner = await db("players").where({ id: route.owner_id }).first();
    if (!owner) continue;

    if (owner.credits < route.credit_cost) {
      // Pause route + notify
      await db("trade_routes")
        .where({ id: route.id })
        .update({ status: "paused" });
      notifyPlayer(io, route.owner_id, "trade-route:paused", {
        routeId: route.id,
        reason: "Insufficient credits for dispatch",
      });
      continue;
    }

    // Deduct credits
    await db("players")
      .where({ id: route.owner_id })
      .update({
        credits: db.raw("credits - ?", [route.credit_cost]),
      });

    // Check fuel for protection
    let isProtected = 0;
    if (route.fuel_paid) {
      const fuelResource = await db("player_resources")
        .where({ player_id: route.owner_id, resource_id: "drift_fuel" })
        .first();
      if (
        fuelResource &&
        fuelResource.quantity >= GAME_CONFIG.TRADE_ROUTE_FUEL_COST
      ) {
        await adjustPlayerResource(
          route.owner_id,
          "drift_fuel",
          -GAME_CONFIG.TRADE_ROUTE_FUEL_COST,
        );
        isProtected = 1;
      }
      // If insufficient fuel, caravan dispatches but unprotected
    }

    const path: number[] = JSON.parse(route.path_json);
    const caravanId = crypto.randomUUID();

    await db("caravans").insert({
      id: caravanId,
      trade_route_id: route.id,
      owner_id: route.owner_id,
      current_sector_id: path[0],
      path_json: route.path_json,
      path_index: 0,
      food_cargo: route.food_per_cycle,
      is_protected: isProtected,
      defense_hp: GAME_CONFIG.CARAVAN_BASE_DEFENSE_HP,
      defense_ratio: GAME_CONFIG.CARAVAN_BASE_DEFENSE_RATIO,
      status: "in_transit",
      dispatched_at: now.toISOString(),
    });

    await db("trade_routes").where({ id: route.id }).update({
      last_dispatch_at: now.toISOString(),
    });

    // Log dispatched event
    await db("caravan_logs").insert({
      id: crypto.randomUUID(),
      caravan_id: caravanId,
      trade_route_id: route.id,
      event_type: "dispatched",
      sector_id: path[0],
      food_amount: route.food_per_cycle,
      credits_amount: route.credit_cost,
      created_at: now.toISOString(),
    });

    notifyPlayer(io, route.owner_id, "caravan:dispatched", {
      caravanId,
      routeId: route.id,
      isProtected: !!isProtected,
    });

    // Profile stats: dispatch
    incrementStat(route.owner_id, "caravans_dispatched", 1);
  }
}

/**
 * Process caravan movement — advance each in-transit caravan by 1 sector per tick.
 * Called every game tick.
 */
export async function processCaravans(io: SocketIOServer): Promise<void> {
  const caravans = await db("caravans").where({ status: "in_transit" });

  for (const caravan of caravans) {
    const path: number[] = JSON.parse(caravan.path_json);
    const newIndex = caravan.path_index + 1;

    if (newIndex >= path.length) {
      // Arrived at destination
      await handleCaravanArrival(io, caravan);
      continue;
    }

    const oldSectorId = caravan.current_sector_id;
    const newSectorId = path[newIndex];

    // Clear escort if caravan moved out of escort sector
    const updates: Record<string, any> = {
      path_index: newIndex,
      current_sector_id: newSectorId,
    };
    if (caravan.escort_player_id && caravan.escort_sector_id !== newSectorId) {
      updates.escort_player_id = null;
      updates.escort_sector_id = null;
    }

    await db("caravans").where({ id: caravan.id }).update(updates);

    // Notify sectors
    notifySector(io, oldSectorId, "caravan:left", {
      caravanId: caravan.id,
      sectorId: oldSectorId,
    });
    notifySector(io, newSectorId, "caravan:entered", {
      caravanId: caravan.id,
      ownerId: caravan.owner_id,
      foodCargo: caravan.food_cargo,
      isProtected: !!caravan.is_protected || !!caravan.escort_player_id,
      sectorId: newSectorId,
    });
  }
}

/**
 * Handle a caravan arriving at its destination.
 */
async function handleCaravanArrival(
  io: SocketIOServer,
  caravan: any,
): Promise<void> {
  const now = new Date();

  // Get destination planet from route
  const route = await db("trade_routes")
    .where({ id: caravan.trade_route_id })
    .first();
  if (!route) return;

  // Deposit food on planet
  await db("planets")
    .where({ id: route.dest_planet_id })
    .increment("food_stock", caravan.food_cargo);

  // Mark caravan as arrived
  await db("caravans").where({ id: caravan.id }).update({
    status: "arrived",
    arrived_at: now.toISOString(),
  });

  // Log arrival
  await db("caravan_logs").insert({
    id: crypto.randomUUID(),
    caravan_id: caravan.id,
    trade_route_id: caravan.trade_route_id,
    event_type: "arrived",
    sector_id: caravan.current_sector_id,
    food_amount: caravan.food_cargo,
    created_at: now.toISOString(),
  });

  // Award XP
  await awardXP(caravan.owner_id, GAME_CONFIG.XP_CARAVAN_DELIVERY, "trade");

  // Notify owner
  const planet = await db("planets")
    .where({ id: route.dest_planet_id })
    .first();
  notifyPlayer(io, caravan.owner_id, "caravan:arrived", {
    caravanId: caravan.id,
    routeId: caravan.trade_route_id,
    planetName: planet?.name || "Unknown",
    foodDelivered: caravan.food_cargo,
  });

  // Profile stats: delivery
  incrementStat(caravan.owner_id, "caravans_delivered", 1);
  logActivity(
    caravan.owner_id,
    "caravan_delivered",
    `Caravan delivered ${caravan.food_cargo} food to ${planet?.name || "planet"}`,
    { foodDelivered: caravan.food_cargo },
  );
  checkMilestones(caravan.owner_id);
}

/**
 * Ransack an unprotected caravan. Attacker must be in same sector.
 */
export async function ransackCaravan(
  io: SocketIOServer,
  attackerId: string,
  caravanId: string,
): Promise<{
  success: boolean;
  error?: string;
  loot?: any;
  combatResult?: any;
}> {
  const caravan = await db("caravans").where({ id: caravanId }).first();
  if (!caravan) return { success: false, error: "Caravan not found" };
  if (caravan.status !== "in_transit")
    return { success: false, error: "Caravan is not in transit" };

  const attacker = await db("players").where({ id: attackerId }).first();
  if (!attacker) return { success: false, error: "Player not found" };

  if (caravan.owner_id === attackerId)
    return { success: false, error: "Cannot ransack your own caravan" };
  if (caravan.current_sector_id !== attacker.current_sector_id) {
    return { success: false, error: "Caravan is not in your sector" };
  }
  if (caravan.is_protected || caravan.escort_player_id) {
    return { success: false, error: "Caravan is protected" };
  }

  // Check pirate cooldown
  if (attacker.pirate_until && new Date(attacker.pirate_until) > new Date()) {
    return { success: false, error: "Pirate cooldown active" };
  }

  // Check sector allows combat (not protected/harmony_enforced)
  const sector = await db("sectors")
    .where({ id: caravan.current_sector_id })
    .first();
  if (
    sector &&
    (sector.type === "protected" || sector.type === "harmony_enforced")
  ) {
    return { success: false, error: "Combat not allowed in this sector" };
  }

  // Build attacker combat state from ship
  const ship = await db("ships")
    .where({ id: attacker.current_ship_id })
    .first();
  if (!ship) return { success: false, error: "No active ship" };

  const attackerState: CombatState = {
    weaponEnergy: ship.weapon_energy,
    engineEnergy: ship.engine_energy,
    hullHp: ship.hull_hp,
    attackRatio: 1.0,
    defenseRatio: 0.5,
  };

  const defenderState: CombatState = {
    weaponEnergy: 0,
    engineEnergy: 0,
    hullHp: caravan.defense_hp,
    attackRatio: 0,
    defenseRatio: caravan.defense_ratio,
  };

  // Combat roll — attacker expends all weapon energy
  const combatResult = resolveCombatVolley(
    attackerState,
    defenderState,
    ship.weapon_energy,
  );

  // Deduct weapon energy from attacker's ship
  await db("ships")
    .where({ id: ship.id })
    .update({
      weapon_energy: ship.weapon_energy - combatResult.attackerEnergySpent,
    });

  const now = new Date();

  if (!combatResult.defenderDestroyed) {
    // Caravan survived — update its HP
    await db("caravans").where({ id: caravan.id }).update({
      defense_hp: combatResult.defenderHullHpRemaining,
    });
    return {
      success: false,
      error: "Caravan defended itself",
      combatResult: {
        damageDealt: combatResult.damageDealt,
        caravanHpRemaining: combatResult.defenderHullHpRemaining,
      },
    };
  }

  // Caravan destroyed — loot
  const foodLoot = Math.floor(
    caravan.food_cargo * GAME_CONFIG.CARAVAN_RANSACK_FOOD_PERCENT,
  );
  const creditLoot = GAME_CONFIG.CARAVAN_RANSACK_CREDIT_REWARD;
  const fuelLoot = GAME_CONFIG.CARAVAN_RANSACK_FUEL_REWARD;

  // Add food to attacker's ship cargo
  await db("ships")
    .where({ id: ship.id })
    .update({
      food_cargo: db.raw("food_cargo + ?", [foodLoot]),
    });
  await settleResourceCredit(attackerId, "food", foodLoot, "combat");

  // Add credits to attacker
  await db("players")
    .where({ id: attackerId })
    .update({
      credits: db.raw("credits + ?", [creditLoot]),
    });
  await settleCreditPlayer(attackerId, creditLoot, "combat");

  // Add drift fuel
  await adjustPlayerResource(attackerId, "drift_fuel", fuelLoot);

  // Set pirate flag
  const pirateUntil = new Date(
    now.getTime() + GAME_CONFIG.PIRATE_COOLDOWN_HOURS * 3600000,
  );
  await db("players").where({ id: attackerId }).update({
    pirate_until: pirateUntil.toISOString(),
  });

  // Destroy caravan
  await db("caravans")
    .where({ id: caravan.id })
    .update({ status: "destroyed" });

  // Destroy the trade route
  await db("trade_routes")
    .where({ id: caravan.trade_route_id })
    .update({ status: "destroyed" });

  // Log ransack
  await db("caravan_logs").insert({
    id: crypto.randomUUID(),
    caravan_id: caravan.id,
    trade_route_id: caravan.trade_route_id,
    event_type: "ransacked",
    actor_id: attackerId,
    sector_id: caravan.current_sector_id,
    food_amount: foodLoot,
    credits_amount: creditLoot,
    details_json: JSON.stringify({ fuelLoot }),
    created_at: now.toISOString(),
  });

  // Award XP
  await awardXP(attackerId, GAME_CONFIG.XP_RANSACK_CARAVAN, "combat");

  // Notify route owner
  notifyPlayer(io, caravan.owner_id, "caravan:ransacked", {
    caravanId: caravan.id,
    routeId: caravan.trade_route_id,
    attackerName: attacker.username,
    sectorId: caravan.current_sector_id,
    foodLost: foodLoot,
  });

  // Notify sector
  notifySector(io, caravan.current_sector_id, "caravan:destroyed", {
    caravanId: caravan.id,
    sectorId: caravan.current_sector_id,
  });

  // Profile stats: ransack (attacker) and lost (victim)
  incrementStat(attackerId, "caravans_ransacked", 1);
  incrementStat(caravan.owner_id, "caravans_lost", 1);
  logActivity(
    attackerId,
    "caravan_ransacked",
    `Ransacked a caravan — looted ${foodLoot} food and ${creditLoot} credits`,
    { foodLoot, creditLoot },
  );
  logActivity(
    caravan.owner_id,
    "caravan_lost",
    `Caravan ransacked by ${attacker.username} in sector ${caravan.current_sector_id}`,
    { attackerId, sectorId: caravan.current_sector_id },
  );
  checkMilestones(attackerId);

  return {
    success: true,
    loot: { food: foodLoot, credits: creditLoot, driftFuel: fuelLoot },
    combatResult: {
      damageDealt: combatResult.damageDealt,
      caravanDestroyed: true,
    },
  };
}

/**
 * Escort an allied caravan (must be in same syndicate).
 */
export async function escortCaravan(
  io: SocketIOServer,
  escortPlayerId: string,
  caravanId: string,
): Promise<{ success: boolean; error?: string }> {
  const caravan = await db("caravans").where({ id: caravanId }).first();
  if (!caravan) return { success: false, error: "Caravan not found" };
  if (caravan.status !== "in_transit")
    return { success: false, error: "Caravan is not in transit" };

  const escort = await db("players").where({ id: escortPlayerId }).first();
  if (!escort) return { success: false, error: "Player not found" };

  if (caravan.current_sector_id !== escort.current_sector_id) {
    return { success: false, error: "Caravan is not in your sector" };
  }

  if (caravan.is_protected) {
    return { success: false, error: "Caravan is already fuel-protected" };
  }

  if (caravan.escort_player_id) {
    return { success: false, error: "Caravan is already being escorted" };
  }

  // Check same syndicate
  const owner = await db("players").where({ id: caravan.owner_id }).first();
  if (!owner) return { success: false, error: "Caravan owner not found" };

  let escortSyndicate: any = null;
  let ownerSyndicate: any = null;
  try {
    escortSyndicate = await db("syndicate_members")
      .where({ player_id: escortPlayerId })
      .first();
    ownerSyndicate = await db("syndicate_members")
      .where({ player_id: caravan.owner_id })
      .first();
  } catch {
    /* table may not exist yet */
  }

  if (
    !escortSyndicate ||
    !ownerSyndicate ||
    escortSyndicate.syndicate_id !== ownerSyndicate.syndicate_id
  ) {
    return {
      success: false,
      error: "Must be in the same syndicate as the caravan owner",
    };
  }

  // Apply escort
  await db("caravans").where({ id: caravan.id }).update({
    escort_player_id: escortPlayerId,
    escort_sector_id: caravan.current_sector_id,
  });

  const now = new Date();

  // Log escort
  await db("caravan_logs").insert({
    id: crypto.randomUUID(),
    caravan_id: caravan.id,
    trade_route_id: caravan.trade_route_id,
    event_type: "escorted",
    actor_id: escortPlayerId,
    sector_id: caravan.current_sector_id,
    created_at: now.toISOString(),
  });

  // Award XP
  await awardXP(escortPlayerId, GAME_CONFIG.XP_ESCORT_CARAVAN, "trade");

  // Notify owner
  notifyPlayer(io, caravan.owner_id, "caravan:escorted", {
    caravanId: caravan.id,
    escortName: escort.username,
    sectorId: caravan.current_sector_id,
  });

  // Profile stats: escort
  incrementStat(escortPlayerId, "caravans_escorted", 1);
  logActivity(
    escortPlayerId,
    "caravan_escorted",
    `Escorted a caravan in sector ${caravan.current_sector_id}`,
  );
  checkMilestones(escortPlayerId);

  return { success: true };
}

/**
 * Scout for unprotected caravans within range of player's sector.
 */
export async function scoutCaravans(
  playerId: string,
): Promise<{ caravans: any[] }> {
  const player = await db("players").where({ id: playerId }).first();
  if (!player) return { caravans: [] };

  let range = GAME_CONFIG.SCOUT_CARAVAN_RANGE;
  if (player.race === "tarri") {
    range += GAME_CONFIG.TARRI_SCOUT_BONUS_RANGE;
  }

  // BFS from player's current sector up to range
  const edgeRows = await db("sector_edges").select(
    "from_sector_id",
    "to_sector_id",
    "one_way",
  );

  const edgeMap = new Map<number, number[]>();
  for (const row of edgeRows) {
    const fromList = edgeMap.get(row.from_sector_id) || [];
    fromList.push(row.to_sector_id);
    edgeMap.set(row.from_sector_id, fromList);

    if (!row.one_way) {
      const toList = edgeMap.get(row.to_sector_id) || [];
      toList.push(row.from_sector_id);
      edgeMap.set(row.to_sector_id, toList);
    }
  }

  const visited = new Set<number>();
  const queue: Array<{ sector: number; depth: number }> = [
    { sector: player.current_sector_id, depth: 0 },
  ];
  visited.add(player.current_sector_id);

  const sectorsInRange: number[] = [];

  while (queue.length > 0) {
    const { sector, depth } = queue.shift()!;
    sectorsInRange.push(sector);

    if (depth < range) {
      const neighbors = edgeMap.get(sector) || [];
      for (const n of neighbors) {
        if (!visited.has(n)) {
          visited.add(n);
          queue.push({ sector: n, depth: depth + 1 });
        }
      }
    }
  }

  // Query unprotected caravans in those sectors
  const caravans = await db("caravans")
    .join("players", "caravans.owner_id", "players.id")
    .where("caravans.status", "in_transit")
    .where("caravans.is_protected", 0)
    .whereNull("caravans.escort_player_id")
    .whereIn("caravans.current_sector_id", sectorsInRange)
    .select(
      "caravans.id",
      "caravans.current_sector_id as sectorId",
      "caravans.food_cargo as foodCargo",
      "caravans.defense_hp as defenseHp",
      "caravans.owner_id as ownerId",
      "players.username as ownerName",
    );

  return { caravans };
}
