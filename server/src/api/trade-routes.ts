import { Router } from "express";
import crypto from "crypto";
import { requireAuth } from "../middleware/auth";
import { canAffordAction, deductEnergy } from "../engine/energy";
import { awardXP, getPlayerProgress } from "../engine/progression";
import { GAME_CONFIG } from "../config/game";
import {
  getMaxRouteSlots,
  computeRoutePath,
  ransackCaravan,
  escortCaravan,
  scoutCaravans,
} from "../engine/caravans";
import db from "../db/connection";
import { syncPlayer } from "../ws/sync";
import { settleDebitPlayer } from "../chain/tx-queue";

const router = Router();

// List player's trade routes + active caravans + slot info
router.get("/", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId!;
    const progress = await getPlayerProgress(playerId);

    const routes = await db("trade_routes")
      .where({ owner_id: playerId })
      .whereNot({ status: "destroyed" });

    // Get active caravans for each route
    const routeIds = routes.map((r) => r.id);
    const caravans =
      routeIds.length > 0
        ? await db("caravans")
            .whereIn("trade_route_id", routeIds)
            .where({ status: "in_transit" })
        : [];

    const caravansByRoute = new Map<string, any>();
    for (const c of caravans) {
      caravansByRoute.set(c.trade_route_id, c);
    }

    // Get planet names for destinations
    const planetIds = [...new Set(routes.map((r) => r.dest_planet_id))];
    const planets =
      planetIds.length > 0
        ? await db("planets").whereIn("id", planetIds).select("id", "name")
        : [];
    const planetMap = new Map(planets.map((p) => [p.id, p.name]));

    const maxSlots = getMaxRouteSlots(progress.level);
    const activeCount = routes.filter((r) => r.status === "active").length;

    // Aggregate delivery stats per route from caravan_logs
    const statsRows =
      routeIds.length > 0
        ? await db("caravan_logs")
            .whereIn("trade_route_id", routeIds)
            .groupBy("trade_route_id")
            .select(
              "trade_route_id",
              db.raw(
                "SUM(CASE WHEN event_type = 'arrived' THEN COALESCE(food_amount, 0) ELSE 0 END) as total_food",
              ),
              db.raw(
                "SUM(CASE WHEN event_type = 'arrived' THEN COALESCE(credits_amount, 0) ELSE 0 END) as total_credits",
              ),
              db.raw(
                "SUM(CASE WHEN event_type = 'arrived' THEN 1 ELSE 0 END) as delivery_count",
              ),
              db.raw(
                "MAX(CASE WHEN event_type = 'ransacked' THEN created_at ELSE NULL END) as last_ransacked_at",
              ),
            )
        : [];

    const statsMap = new Map<
      string,
      {
        totalFood: number;
        totalCredits: number;
        deliveryCount: number;
        lastRansackedAt: string | null;
      }
    >();
    for (const s of statsRows) {
      statsMap.set(s.trade_route_id, {
        totalFood: Number(s.total_food) || 0,
        totalCredits: Number(s.total_credits) || 0,
        deliveryCount: Number(s.delivery_count) || 0,
        lastRansackedAt: s.last_ransacked_at || null,
      });
    }

    res.json({
      maxSlots,
      activeCount,
      playerLevel: progress.level,
      routes: routes.map((r) => {
        const caravan = caravansByRoute.get(r.id);
        const path = JSON.parse(r.path_json);
        const stats = statsMap.get(r.id);
        return {
          id: r.id,
          name: r.name || null,
          sourceType: r.source_type,
          sourceId: r.source_id,
          sourceSectorId: r.source_sector_id,
          destPlanetId: r.dest_planet_id,
          destPlanetName: planetMap.get(r.dest_planet_id) || "Unknown",
          destSectorId: r.dest_sector_id,
          pathLength: r.path_length,
          foodPerCycle: r.food_per_cycle,
          creditCost: r.credit_cost,
          fuelPaid: !!r.fuel_paid,
          status: r.status,
          createdAt: r.created_at,
          lastDispatchAt: r.last_dispatch_at,
          totalFoodDelivered: stats?.totalFood ?? 0,
          totalCreditsSpent: stats?.totalCredits ?? 0,
          deliveryCount: stats?.deliveryCount ?? 0,
          lastRansackedAt: stats?.lastRansackedAt ?? null,
          activeCaravan: caravan
            ? {
                id: caravan.id,
                currentSectorId: caravan.current_sector_id,
                pathIndex: caravan.path_index,
                pathLength: path.length,
                foodCargo: caravan.food_cargo,
                isProtected: !!caravan.is_protected,
                escorted: !!caravan.escort_player_id,
                defenseHp: caravan.defense_hp,
                status: caravan.status,
              }
            : null,
        };
      }),
    });
  } catch (err) {
    console.error("Trade routes list error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create a new trade route
router.post("/", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId!;
    const { sourceType, sourceId, destPlanetId, fuelPaid } = req.body;

    if (!sourceType || !sourceId || !destPlanetId) {
      return res.status(400).json({
        error: "Missing required fields: sourceType, sourceId, destPlanetId",
      });
    }

    if (!["outpost", "star_mall"].includes(sourceType)) {
      return res
        .status(400)
        .json({ error: "sourceType must be outpost or star_mall" });
    }

    const player = await db("players").where({ id: playerId }).first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    // Check slot availability
    const progress = await getPlayerProgress(playerId);
    const maxSlots = getMaxRouteSlots(progress.level);
    const activeRoutes = await db("trade_routes")
      .where({ owner_id: playerId, status: "active" })
      .count("* as count")
      .first();
    const activeCount = Number(activeRoutes?.count || 0);

    if (activeCount >= maxSlots) {
      return res.status(400).json({
        error: `No available route slots. You have ${activeCount}/${maxSlots} active routes.`,
        maxSlots,
        activeCount,
      });
    }

    // Check player owns destination planet
    const destPlanet = await db("planets").where({ id: destPlanetId }).first();
    if (!destPlanet)
      return res.status(404).json({ error: "Destination planet not found" });
    if (destPlanet.owner_id !== playerId) {
      return res
        .status(400)
        .json({ error: "You do not own the destination planet" });
    }

    // Validate source
    let sourceSectorId: number;
    if (sourceType === "outpost") {
      const outpost = await db("outposts").where({ id: sourceId }).first();
      if (!outpost)
        return res.status(404).json({ error: "Source outpost not found" });
      sourceSectorId = outpost.sector_id;
    } else {
      // star_mall — sourceId is sector id
      const sectorId = parseInt(sourceId, 10);
      if (isNaN(sectorId))
        return res.status(400).json({ error: "Invalid star mall sector ID" });
      const sector = await db("sectors")
        .where({ id: sectorId, has_star_mall: true })
        .first();
      if (!sector)
        return res.status(404).json({ error: "Star mall sector not found" });
      sourceSectorId = sectorId;
    }

    // Check for existing active route to same planet
    const existingRoute = await db("trade_routes")
      .where({
        owner_id: playerId,
        dest_planet_id: destPlanetId,
        status: "active",
      })
      .first();
    if (existingRoute) {
      return res
        .status(400)
        .json({ error: "You already have an active route to this planet" });
    }

    // Check credits
    if (player.credits < GAME_CONFIG.TRADE_ROUTE_SETUP_COST) {
      return res.status(400).json({
        error: `Not enough credits. Setup costs ${GAME_CONFIG.TRADE_ROUTE_SETUP_COST}`,
        required: GAME_CONFIG.TRADE_ROUTE_SETUP_COST,
        have: player.credits,
      });
    }

    // Compute path
    const path = await computeRoutePath(sourceSectorId, destPlanet.sector_id);
    if (!path) {
      return res.status(400).json({
        error: `No route found or route exceeds max length of ${GAME_CONFIG.TRADE_ROUTE_MAX_PATH_LENGTH} sectors`,
      });
    }

    // Deduct setup cost
    await db("players")
      .where({ id: playerId })
      .update({
        credits: db.raw("credits - ?", [GAME_CONFIG.TRADE_ROUTE_SETUP_COST]),
      });
    await settleDebitPlayer(
      playerId,
      GAME_CONFIG.TRADE_ROUTE_SETUP_COST,
      "trade",
    );

    const now = new Date().toISOString();
    const routeId = crypto.randomUUID();

    await db("trade_routes").insert({
      id: routeId,
      owner_id: playerId,
      source_type: sourceType,
      source_id: sourceId,
      source_sector_id: sourceSectorId,
      dest_planet_id: destPlanetId,
      dest_sector_id: destPlanet.sector_id,
      path_json: JSON.stringify(path),
      path_length: path.length - 1,
      food_per_cycle: GAME_CONFIG.TRADE_ROUTE_FOOD_PER_CYCLE,
      credit_cost: GAME_CONFIG.TRADE_ROUTE_MAINTENANCE_COST,
      fuel_paid: fuelPaid ? 1 : 0,
      status: "active",
      created_at: now,
    });

    // Award XP
    await awardXP(playerId, GAME_CONFIG.XP_ESTABLISH_TRADE_ROUTE, "trade");

    // Multi-session sync
    const io = req.app.get("io");
    if (io)
      syncPlayer(
        io,
        playerId,
        "sync:status",
        req.headers["x-socket-id"] as string | undefined,
      );

    res.json({
      success: true,
      routeId,
      pathLength: path.length - 1,
      path,
      setupCost: GAME_CONFIG.TRADE_ROUTE_SETUP_COST,
      creditCostPerDispatch: GAME_CONFIG.TRADE_ROUTE_MAINTENANCE_COST,
      foodPerCycle: GAME_CONFIG.TRADE_ROUTE_FOOD_PER_CYCLE,
    });
  } catch (err) {
    console.error("Create trade route error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete/destroy a trade route
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId!;
    const route = await db("trade_routes")
      .where({ id: req.params.id, owner_id: playerId })
      .first();
    if (!route) return res.status(404).json({ error: "Trade route not found" });

    // Destroy any in-transit caravans
    await db("caravans")
      .where({ trade_route_id: route.id, status: "in_transit" })
      .update({ status: "destroyed" });

    await db("trade_routes")
      .where({ id: route.id })
      .update({ status: "destroyed" });

    res.json({ success: true });
  } catch (err) {
    console.error("Delete trade route error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update route — toggle fuel, rename
router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId!;
    const { fuelPaid, name } = req.body;
    if (fuelPaid === undefined && name === undefined)
      return res
        .status(400)
        .json({ error: "Provide fuelPaid and/or name field" });

    const route = await db("trade_routes")
      .where({ id: req.params.id, owner_id: playerId })
      .first();
    if (!route) return res.status(404).json({ error: "Trade route not found" });

    const updates: Record<string, any> = {};
    if (fuelPaid !== undefined) updates.fuel_paid = fuelPaid ? 1 : 0;
    if (name !== undefined) {
      if (name && name.length > 40) {
        return res
          .status(400)
          .json({ error: "Name must be 40 characters or less" });
      }
      updates.name = name || null;
    }

    await db("trade_routes").where({ id: route.id }).update(updates);

    res.json({
      success: true,
      fuelPaid: fuelPaid !== undefined ? !!fuelPaid : !!route.fuel_paid,
      name: name !== undefined ? name || null : route.name,
    });
  } catch (err) {
    console.error("Update trade route error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Pause an active route
router.post("/:id/pause", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId!;
    const route = await db("trade_routes")
      .where({ id: req.params.id, owner_id: playerId })
      .first();
    if (!route) return res.status(404).json({ error: "Trade route not found" });
    if (route.status !== "active")
      return res.status(400).json({ error: "Route is not active" });

    await db("trade_routes")
      .where({ id: route.id })
      .update({ status: "paused" });

    res.json({ success: true });
  } catch (err) {
    console.error("Pause trade route error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Batch pause/resume all routes for a player
router.post("/batch", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId!;
    const { action } = req.body;

    if (!action || !["pause", "resume"].includes(action)) {
      return res
        .status(400)
        .json({ error: 'action must be "pause" or "resume"' });
    }

    const fromStatus = action === "pause" ? "active" : "paused";
    const toStatus = action === "pause" ? "paused" : "active";

    const count = await db("trade_routes")
      .where({ owner_id: playerId, status: fromStatus })
      .update({ status: toStatus });

    res.json({ success: true, affected: count });
  } catch (err) {
    console.error("Batch trade routes error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Resume a paused route
router.post("/:id/resume", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId!;
    const route = await db("trade_routes")
      .where({ id: req.params.id, owner_id: playerId })
      .first();
    if (!route) return res.status(404).json({ error: "Trade route not found" });
    if (route.status !== "paused")
      return res.status(400).json({ error: "Route is not paused" });

    await db("trade_routes")
      .where({ id: route.id })
      .update({ status: "active" });

    res.json({ success: true });
  } catch (err) {
    console.error("Resume trade route error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get caravans in player's current sector
router.get("/caravans", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId!;
    const player = await db("players").where({ id: playerId }).first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const caravans = await db("caravans")
      .join("players", "caravans.owner_id", "players.id")
      .where("caravans.current_sector_id", player.current_sector_id)
      .where("caravans.status", "in_transit")
      .select(
        "caravans.id",
        "caravans.owner_id as ownerId",
        "players.username as ownerName",
        "caravans.food_cargo as foodCargo",
        "caravans.is_protected as isProtected",
        "caravans.escort_player_id as escortPlayerId",
        "caravans.defense_hp as defenseHp",
      );

    res.json({
      caravans: caravans.map((c) => ({
        ...c,
        isProtected: !!c.isProtected || !!c.escortPlayerId,
      })),
    });
  } catch (err) {
    console.error("Sector caravans error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Ransack an unprotected caravan (2 AP)
router.post("/ransack", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId!;
    const { caravanId } = req.body;
    if (!caravanId) return res.status(400).json({ error: "Missing caravanId" });

    const player = await db("players").where({ id: playerId }).first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    if (!canAffordAction(player.energy, "ransack")) {
      return res.status(400).json({ error: "Not enough energy", cost: 2 });
    }

    const io = req.app.get("io");
    const result = await ransackCaravan(io, playerId, caravanId);

    if (!result.success) {
      // Still deduct energy for the attempt
      const newEnergy = deductEnergy(player.energy, "ransack");
      await db("players").where({ id: playerId }).update({ energy: newEnergy });
      return res.status(400).json({
        error: result.error,
        energy: newEnergy,
        combatResult: result.combatResult,
      });
    }

    const newEnergy = deductEnergy(player.energy, "ransack");
    await db("players").where({ id: playerId }).update({ energy: newEnergy });

    // Multi-session sync
    if (io)
      syncPlayer(
        io,
        playerId,
        "sync:status",
        req.headers["x-socket-id"] as string | undefined,
      );

    res.json({
      success: true,
      energy: newEnergy,
      loot: result.loot,
      combatResult: result.combatResult,
    });
  } catch (err) {
    console.error("Ransack error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Escort an allied caravan (2 AP)
router.post("/escort", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId!;
    const { caravanId } = req.body;
    if (!caravanId) return res.status(400).json({ error: "Missing caravanId" });

    const player = await db("players").where({ id: playerId }).first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    if (!canAffordAction(player.energy, "escort")) {
      return res.status(400).json({ error: "Not enough energy", cost: 2 });
    }

    const io = req.app.get("io");
    const result = await escortCaravan(io, playerId, caravanId);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    const newEnergy = deductEnergy(player.energy, "escort");
    await db("players").where({ id: playerId }).update({ energy: newEnergy });

    // Multi-session sync
    if (io)
      syncPlayer(
        io,
        playerId,
        "sync:status",
        req.headers["x-socket-id"] as string | undefined,
      );

    res.json({ success: true, energy: newEnergy });
  } catch (err) {
    console.error("Escort error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get caravan event logs for a route
router.get("/:routeId/logs", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId!;

    // Verify ownership
    const route = await db("trade_routes")
      .where({ id: req.params.routeId, owner_id: playerId })
      .first();
    if (!route) return res.status(404).json({ error: "Trade route not found" });

    const logs = await db("caravan_logs")
      .where({ trade_route_id: req.params.routeId })
      .orderBy("created_at", "desc")
      .limit(50);

    res.json({
      logs: logs.map((l) => ({
        id: l.id,
        caravanId: l.caravan_id,
        eventType: l.event_type,
        actorId: l.actor_id,
        sectorId: l.sector_id,
        foodAmount: l.food_amount,
        creditsAmount: l.credits_amount,
        details: l.details_json ? JSON.parse(l.details_json) : null,
        createdAt: l.created_at,
      })),
    });
  } catch (err) {
    console.error("Route logs error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Scout for unprotected caravans in range (1 AP)
router.post("/scout", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId!;
    const player = await db("players").where({ id: playerId }).first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    if (!canAffordAction(player.energy, "move")) {
      // 1 AP same as move
      return res.status(400).json({ error: "Not enough energy", cost: 1 });
    }

    const newEnergy = deductEnergy(player.energy, "move");
    await db("players").where({ id: playerId }).update({ energy: newEnergy });

    const result = await scoutCaravans(playerId);

    res.json({
      energy: newEnergy,
      caravans: result.caravans,
    });
  } catch (err) {
    console.error("Scout caravans error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
