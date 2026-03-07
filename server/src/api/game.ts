import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { canAffordAction, deductEnergy, getActionCost } from "../engine/energy";
import { checkAndUpdateMissions } from "../services/mission-tracker";
import { applyUpgradesToShip } from "../engine/upgrades";
import {
  awardXP,
  getPlayerProgress,
  getPlayerLevelBonuses,
} from "../engine/progression";
import { checkAchievements } from "../engine/achievements";
import { GAME_CONFIG } from "../config/game";
import { getNPCsInSector, getUnencounteredNPCsInSector } from "../engine/npcs";
import {
  getResourceEventsInSector,
  getResourceEventsInSectors,
} from "../engine/rare-spawns";
import { PLANET_TYPES } from "../config/planet-types";
import { findShortestPath, type SectorEdge } from "../engine/universe";
import { checkPrerequisite } from "../engine/missions";
import {
  handleTutorialStatus,
  handleTutorialSector,
  handleTutorialMove,
  handleTutorialMap,
  handleTutorialScan,
  handleTutorialLand,
  handleTutorialLiftoff,
} from "../services/tutorial-sandbox";
import db from "../db/connection";
import {
  incrementStat,
  logActivity,
  checkMilestones,
} from "../engine/profile-stats";
import { syncPlayer } from "../ws/sync";
import { handleSectorChange } from "../ws/handlers";
import { pickFlavor, outpostNpcRace } from "../config/flavor-text";
import type { RaceId } from "../config/races";
import { updateDailyMissionProgress } from "./daily-missions";

const router = Router();

// Player status
router.get("/status", requireAuth, async (req, res) => {
  if (req.inTutorial) return handleTutorialStatus(req, res);
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const ship = player.current_ship_id
      ? await db("ships").where({ id: player.current_ship_id }).first()
      : null;

    const upgrades = ship ? await applyUpgradesToShip(ship.id) : null;
    const progress = await getPlayerProgress(player.id);
    const levelBonuses = await getPlayerLevelBonuses(player.id);

    // Check naming authority
    const hasNamingAuthority = await checkPrerequisite(
      player.id,
      GAME_CONFIG.NAMING_CONVENTION_MISSION_ID,
    );

    // Check for Mycelial Transporter item
    const transporterItem = await db("game_events")
      .where({
        player_id: player.id,
        event_type: "item:mycelial_transporter",
        read: false,
      })
      .first();
    const hasTransporter = !!transporterItem;

    // SP mission summary
    let spMissions: { completed: number; total: number } | undefined;
    if (player.game_mode === "singleplayer") {
      const spCompleted = await db("player_missions")
        .join(
          "mission_templates",
          "player_missions.template_id",
          "mission_templates.id",
        )
        .where({
          "player_missions.player_id": player.id,
          "mission_templates.source": "singleplayer",
          "player_missions.status": "completed",
        })
        .count("* as count")
        .first();
      const spTotal = await db("mission_templates")
        .where({ source: "singleplayer" })
        .count("* as count")
        .first();
      spMissions = {
        completed: Number(spCompleted?.count || 0),
        total: Number(spTotal?.count || 0),
      };
    }

    // Load colonists by race for current ship
    let colonistsByRace: { race: string; count: number }[] = [];
    if (ship) {
      try {
        colonistsByRace = await db("ship_colonists")
          .where({ ship_id: ship.id })
          .where("count", ">", 0)
          .select("race", "count");
      } catch {
        /* table may not exist yet */
      }
    }

    res.json({
      id: player.id,
      username: player.username,
      race: player.race,
      gameMode: player.game_mode || "multiplayer",
      energy: player.energy,
      maxEnergy: player.max_energy,
      credits: Number(player.credits),
      currentSectorId: player.current_sector_id,
      tutorialStep: player.tutorial_step || 0,
      tutorialCompleted: !!player.tutorial_completed,
      hasSeenIntro: !!player.has_seen_intro,
      hasSeenPostTutorial: !!player.has_seen_post_tutorial,
      hasNamingAuthority,
      hasTransporter,
      walletAddress: player.wallet_address || null,
      dockedAtOutpostId: player.docked_at_outpost_id || null,
      landedAtPlanetId: player.landed_at_planet_id || null,
      pirateUntil: player.pirate_until || null,
      isPirate: !!(
        player.pirate_until && new Date(player.pirate_until) > new Date()
      ),
      level: progress.level,
      rank: progress.rank,
      xp: progress.totalXp,
      loginStreak: player.login_streak || 0,
      spMissions,
      currentShip: ship
        ? {
            id: ship.id,
            shipTypeId: ship.ship_type_id,
            weaponEnergy:
              ship.weapon_energy +
              (upgrades?.weaponBonus ?? 0) +
              levelBonuses.weaponBonus,
            engineEnergy:
              ship.engine_energy +
              (upgrades?.engineBonus ?? 0) +
              levelBonuses.engineBonus,
            hullHp: ship.hull_hp,
            maxHullHp: ship.max_hull_hp,
            cargoHolds: ship.cargo_holds,
            maxCargoHolds:
              ship.max_cargo_holds +
              (upgrades?.cargoBonus ?? 0) +
              levelBonuses.cargoBonus,
            cyrilliumCargo: ship.cyrillium_cargo,
            foodCargo: ship.food_cargo,
            techCargo: ship.tech_cargo,
            colonistsCargo: ship.colonist_cargo,
            colonistsByRace,
          }
        : null,
    });
  } catch (err) {
    console.error("Status error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Move to adjacent sector
router.post("/move/:sectorId", requireAuth, async (req, res) => {
  if (req.inTutorial) return handleTutorialMove(req, res);
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const targetSectorId = parseInt(req.params.sectorId as string, 10);
    if (isNaN(targetSectorId))
      return res.status(400).json({ error: "Invalid sector ID" });

    if (player.docked_at_outpost_id)
      return res
        .status(400)
        .json({ error: "You must undock before traveling" });
    if (player.landed_at_planet_id)
      return res
        .status(400)
        .json({ error: "You must liftoff before traveling" });

    if (!canAffordAction(player.energy, "move")) {
      return res
        .status(400)
        .json({ error: "Not enough energy", cost: getActionCost("move") });
    }

    // SP: validate target sector belongs to player's SP universe
    if (player.game_mode === "singleplayer") {
      const targetSector = await db("sectors")
        .where({ id: targetSectorId })
        .first();
      if (!targetSector || targetSector.owner_id !== player.id) {
        return res
          .status(400)
          .json({ error: "Sector is not in your universe" });
      }
    }

    // Check adjacency
    const edge = await db("sector_edges")
      .where({
        from_sector_id: player.current_sector_id,
        to_sector_id: targetSectorId,
      })
      .first();

    if (!edge) {
      return res.status(400).json({ error: "Sector is not adjacent" });
    }

    const newEnergy = deductEnergy(player.energy, "move");

    // Update explored sectors
    let explored: number[] = [];
    try {
      explored = JSON.parse(player.explored_sectors || "[]");
    } catch {
      explored = [];
    }
    const isNewSector = !explored.includes(targetSectorId);
    if (isNewSector) {
      explored.push(targetSectorId);
    }

    await db("players")
      .where({ id: player.id })
      .update({
        current_sector_id: targetSectorId,
        energy: newEnergy,
        explored_sectors: JSON.stringify(explored),
        docked_at_outpost_id: null,
        landed_at_planet_id: null,
      });

    // Move active ship too
    if (player.current_ship_id) {
      await db("ships")
        .where({ id: player.current_ship_id })
        .update({ sector_id: targetSectorId });
    }

    // Get sector contents
    const sector = await db("sectors").where({ id: targetSectorId }).first();
    const playersInSector = await db("players")
      .where({ current_sector_id: targetSectorId })
      .whereNot({ id: player.id })
      .select("id", "username");
    const outpostsInSector = await db("outposts").where({
      sector_id: targetSectorId,
    });
    const planetsInSector = await db("planets").where({
      sector_id: targetSectorId,
    });

    // 5% meteor damage chance at outpost sectors
    let meteorDamage = 0;
    if (
      outpostsInSector.length > 0 &&
      Math.random() < 0.05 &&
      player.current_ship_id
    ) {
      meteorDamage = 1 + Math.floor(Math.random() * 5); // 1-5 damage
      const ship = await db("ships")
        .where({ id: player.current_ship_id })
        .first();
      if (ship) {
        const newHull = Math.max(1, ship.hull_hp - meteorDamage);
        meteorDamage = ship.hull_hp - newHull; // actual damage after clamping
        await db("ships").where({ id: ship.id }).update({ hull_hp: newHull });
      }
    }

    // Mission progress: move
    checkAndUpdateMissions(player.id, "move", { sectorId: targetSectorId });
    updateDailyMissionProgress(player.id, "visit_sectors").catch(() => {});

    // Award explore XP for new sector discovery
    let xpResult = null;
    if (isNewSector) {
      xpResult = await awardXP(
        player.id,
        GAME_CONFIG.XP_EXPLORE_NEW_SECTOR,
        "explore",
      );
      await checkAchievements(player.id, "explore", {
        sectorId: targetSectorId,
        explored,
      });

      // Profile stats: new sector
      incrementStat(player.id, "sectors_explored", 1);
      checkMilestones(player.id);
    }

    // Profile stats: energy spent on move
    incrementStat(player.id, "energy_spent", getActionCost("move"));

    // NPCs in target sector
    let npcs: any[] = [];
    let npcEncounters: any[] = [];
    try {
      npcs = await getNPCsInSector(targetSectorId, player.id);
      npcEncounters = (
        await getUnencounteredNPCsInSector(targetSectorId, player.id)
      ).slice(0, 1);
    } catch {
      /* table may not exist yet */
    }

    // Multi-session sync: sector change + full refresh
    const io = req.app.get("io");
    if (io) {
      const excludeSocket = req.headers["x-socket-id"] as string | undefined;
      handleSectorChange(
        io,
        player.id,
        player.current_sector_id,
        targetSectorId,
        player.username,
      );
      syncPlayer(io, player.id, "sync:full", excludeSocket);
    }

    res.json({
      sectorId: targetSectorId,
      sectorType: sector?.type,
      energy: newEnergy,
      players: playersInSector,
      outposts: outpostsInSector.map((o) => ({ id: o.id, name: o.name })),
      planets: planetsInSector.map((p) => ({
        id: p.id,
        name: p.name,
        ownerId: p.owner_id,
      })),
      meteorDamage,
      xp: xpResult
        ? {
            awarded: xpResult.xpAwarded,
            total: xpResult.totalXp,
            level: xpResult.level,
            rank: xpResult.rank,
            levelUp: xpResult.levelUp,
          }
        : undefined,
      npcs: npcs.map((n) => ({
        id: n.id,
        name: n.name,
        title: n.title,
        race: n.race,
        encountered: n.encountered,
      })),
      npcEncounters,
    });
  } catch (err) {
    console.error("Move error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Warp-to: auto-path to a distant sector, costing 1 energy per hop
router.post("/warp-to/:sectorId", requireAuth, async (req, res) => {
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const targetSectorId = parseInt(req.params.sectorId as string, 10);
    if (isNaN(targetSectorId))
      return res.status(400).json({ error: "Invalid sector ID" });

    if (player.docked_at_outpost_id)
      return res
        .status(400)
        .json({ error: "You must undock before traveling" });
    if (player.landed_at_planet_id)
      return res
        .status(400)
        .json({ error: "You must liftoff before traveling" });

    if (player.current_sector_id === targetSectorId) {
      return res.status(400).json({ error: "Already in that sector" });
    }

    // Verify target sector exists
    const targetSector = await db("sectors")
      .where({ id: targetSectorId })
      .first();
    if (!targetSector)
      return res.status(404).json({ error: "Sector not found" });

    // SP: validate target sector belongs to player's universe
    if (
      player.game_mode === "singleplayer" &&
      targetSector.owner_id !== player.id
    ) {
      return res.status(400).json({ error: "Sector is not in your universe" });
    }

    // Build edge map from database for pathfinding
    const edgeQuery =
      player.game_mode === "singleplayer"
        ? db("sector_edges")
            .join("sectors", "sector_edges.from_sector_id", "sectors.id")
            .where("sectors.owner_id", player.id)
            .select(
              "sector_edges.from_sector_id",
              "sector_edges.to_sector_id",
              "sector_edges.one_way",
            )
        : db("sector_edges").select(
            "from_sector_id",
            "to_sector_id",
            "one_way",
          );

    const edgeRows = await edgeQuery;
    const edgeMap = new Map<number, SectorEdge[]>();
    for (const row of edgeRows) {
      const from = row.from_sector_id;
      const to = row.to_sector_id;
      const fromList = edgeMap.get(from) || [];
      fromList.push({ from, to, oneWay: !!row.one_way });
      edgeMap.set(from, fromList);
      // Add reverse edge for non-one-way
      if (!row.one_way) {
        const toList = edgeMap.get(to) || [];
        if (!toList.some((e) => e.to === from)) {
          toList.push({ from: to, to: from, oneWay: false });
          edgeMap.set(to, toList);
        }
      }
    }

    // Find shortest path
    const path = findShortestPath(
      edgeMap,
      player.current_sector_id,
      targetSectorId,
    );
    if (!path) {
      return res.status(400).json({ error: "No route to that sector" });
    }

    // path includes starting sector; hops = path.length - 1
    const hops = path.length - 1;
    const costPerHop = getActionCost("move");
    const totalCost = hops * costPerHop;

    if (player.energy < totalCost) {
      const affordable = Math.floor(player.energy / costPerHop);
      return res.status(400).json({
        error: `Not enough energy. Route is ${hops} hops (${totalCost} energy), you have ${player.energy}`,
        hops,
        totalCost,
        affordable,
        path,
      });
    }

    // Move hop-by-hop: update explored sectors along the way
    let explored: number[] = [];
    try {
      explored = JSON.parse(player.explored_sectors || "[]");
    } catch {
      explored = [];
    }

    const newSectors: number[] = [];
    for (let i = 1; i < path.length; i++) {
      if (!explored.includes(path[i])) {
        explored.push(path[i]);
        newSectors.push(path[i]);
      }
    }

    const newEnergy = player.energy - totalCost;

    await db("players")
      .where({ id: player.id })
      .update({
        current_sector_id: targetSectorId,
        energy: newEnergy,
        explored_sectors: JSON.stringify(explored),
        docked_at_outpost_id: null,
        landed_at_planet_id: null,
      });

    // Move active ship
    if (player.current_ship_id) {
      await db("ships")
        .where({ id: player.current_ship_id })
        .update({ sector_id: targetSectorId });
    }

    // Award XP for new sectors discovered along the way
    let xpResult = null;
    if (newSectors.length > 0) {
      xpResult = await awardXP(
        player.id,
        GAME_CONFIG.XP_EXPLORE_NEW_SECTOR * newSectors.length,
        "explore",
      );
      for (const sid of newSectors) {
        await checkAchievements(player.id, "explore", {
          sectorId: sid,
          explored,
        });
      }

      // Profile stats: new sectors
      incrementStat(player.id, "sectors_explored", newSectors.length);
      checkMilestones(player.id);
    }

    // Profile stats: energy spent on warp
    incrementStat(player.id, "energy_spent", totalCost);

    // Mission progress for each hop
    for (let i = 1; i < path.length; i++) {
      checkAndUpdateMissions(player.id, "move", { sectorId: path[i] });
    }

    // Get destination sector contents
    const sector = await db("sectors").where({ id: targetSectorId }).first();
    const playersInSector = await db("players")
      .where({ current_sector_id: targetSectorId })
      .whereNot({ id: player.id })
      .select("id", "username");
    const outpostsInSector = await db("outposts").where({
      sector_id: targetSectorId,
    });
    const planetsInSector = await db("planets").where({
      sector_id: targetSectorId,
    });

    let npcs: any[] = [];
    try {
      npcs = await getNPCsInSector(targetSectorId, player.id);
    } catch {
      /* table may not exist yet */
    }

    // Multi-session sync: sector change + full refresh
    const io = req.app.get("io");
    if (io) {
      const excludeSocket = req.headers["x-socket-id"] as string | undefined;
      handleSectorChange(
        io,
        player.id,
        player.current_sector_id,
        targetSectorId,
        player.username,
      );
      syncPlayer(io, player.id, "sync:full", excludeSocket);
    }

    res.json({
      sectorId: targetSectorId,
      sectorType: sector?.type,
      energy: newEnergy,
      hops,
      energyCost: totalCost,
      path,
      newSectorsDiscovered: newSectors.length,
      players: playersInSector,
      outposts: outpostsInSector.map((o: any) => ({ id: o.id, name: o.name })),
      planets: planetsInSector.map((p: any) => ({
        id: p.id,
        name: p.name,
        ownerId: p.owner_id,
      })),
      xp: xpResult
        ? {
            awarded: xpResult.xpAwarded,
            total: xpResult.totalXp,
            level: xpResult.level,
            rank: xpResult.rank,
            levelUp: xpResult.levelUp,
          }
        : undefined,
      npcs: npcs.map((n: any) => ({
        id: n.id,
        name: n.name,
        title: n.title,
        race: n.race,
        encountered: n.encountered,
      })),
    });
  } catch (err) {
    console.error("Warp-to error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Current sector contents
router.get("/sector", requireAuth, async (req, res) => {
  if (req.inTutorial) return handleTutorialSector(req, res);
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const sectorId = player.current_sector_id;
    const sector = await db("sectors").where({ id: sectorId }).first();
    const edges = await db("sector_edges").where({ from_sector_id: sectorId });
    const playersInSector = await db("players")
      .where({ current_sector_id: sectorId })
      .whereNot({ id: player.id })
      .select("id", "username");
    const outpostsInSector = await db("outposts").where({
      sector_id: sectorId,
    });
    const planetsInSector = await db("planets").where({ sector_id: sectorId });
    const deployablesInSector = await db("deployables").where({
      sector_id: sectorId,
    });

    // Sector events
    let events: any[] = [];
    try {
      events = await db("sector_events")
        .where({ sector_id: sectorId, status: "active" })
        .select("id", "event_type", "created_at", "expires_at");
    } catch {
      /* table may not exist yet */
    }

    // Warp gates
    let warpGates: any[] = [];
    try {
      const gates = await db("warp_gates")
        .where(function () {
          this.where({ sector_a_id: sectorId }).orWhere({
            sector_b_id: sectorId,
          });
        })
        .where({ status: "active" });
      warpGates = gates.map((g) => ({
        id: g.id,
        destinationSectorId:
          g.sector_a_id === sectorId ? g.sector_b_id : g.sector_a_id,
        tollAmount: g.toll_amount,
        syndicateFree: !!g.syndicate_free,
        syndicateId: g.syndicate_id,
      }));
    } catch {
      /* table may not exist yet */
    }

    // NPCs
    let npcsInSector: any[] = [];
    try {
      npcsInSector = await getNPCsInSector(sectorId, player.id);
    } catch {
      /* table may not exist yet */
    }

    // Resource events
    let resourceEvents: any[] = [];
    try {
      resourceEvents = await getResourceEventsInSector(sectorId);
    } catch {
      /* table may not exist yet */
    }

    // Caravans in sector
    let caravansInSector: any[] = [];
    try {
      caravansInSector = await db("caravans")
        .join("players", "caravans.owner_id", "players.id")
        .where("caravans.current_sector_id", sectorId)
        .where("caravans.status", "in_transit")
        .select(
          "caravans.id",
          "caravans.owner_id",
          "players.username as owner_name",
          "caravans.food_cargo",
          "caravans.is_protected",
          "caravans.escort_player_id",
          "caravans.defense_hp",
        );
    } catch {
      /* table may not exist yet */
    }

    res.json({
      sectorId,
      type: sector?.type,
      regionId: sector?.region_id,
      hasStarMall: sector?.has_star_mall,
      spMallLocked: sector?.sp_mall_locked || false,
      adjacentSectors: edges.map((e) => ({
        sectorId: e.to_sector_id,
        oneWay: e.one_way,
      })),
      players: playersInSector,
      outposts: outpostsInSector.map((o) => ({ id: o.id, name: o.name })),
      planets: planetsInSector.map((p) => {
        const base: any = {
          id: p.id,
          name: p.name,
          planetClass: p.planet_class,
          ownerId: p.owner_id,
          upgradeLevel: p.upgrade_level,
        };
        if (p.variant) {
          const planetType = PLANET_TYPES[p.planet_class];
          base.variant = p.variant;
          base.variantName = planetType?.rareVariant?.variantName || p.variant;
          base.rareResource =
            planetType?.rareVariant?.ultraRareResource?.name || p.rare_resource;
        }
        return base;
      }),
      deployables: deployablesInSector.map((d) => ({
        id: d.id,
        type: d.type,
        ownerId: d.owner_id,
      })),
      events: events.map((e) => ({ id: e.id, eventType: e.event_type })),
      warpGates,
      npcs: npcsInSector.map((n) => ({
        id: n.id,
        name: n.name,
        title: n.title,
        race: n.race,
        encountered: n.encountered,
      })),
      resourceEvents: resourceEvents.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        resources: e.resources,
        remainingNodes: e.remainingNodes,
        expiresAt: e.expiresAt,
        guardianHp: e.guardianHp,
        claimedBy: e.claimedBy,
      })),
      caravans: caravansInSector.map((c) => ({
        id: c.id,
        ownerId: c.owner_id,
        ownerName: c.owner_name,
        foodCargo: c.food_cargo,
        isProtected: !!c.is_protected || !!c.escort_player_id,
        defenseHp: c.defense_hp,
      })),
    });
  } catch (err) {
    console.error("Sector error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Player's explored map
router.get("/map", requireAuth, async (req, res) => {
  if (req.inTutorial) return handleTutorialMap(req, res);
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

    const sectors =
      explored.length > 0
        ? await db("sectors")
            .whereIn("id", explored)
            .select("id", "type", "region_id", "has_star_mall")
        : [];

    const edges =
      explored.length > 0
        ? await db("sector_edges")
            .whereIn("from_sector_id", explored)
            .whereIn("to_sector_id", explored)
        : [];

    // Count outposts and planets per explored sector
    const outpostCounts =
      explored.length > 0
        ? await db("outposts")
            .select("sector_id")
            .count("id as count")
            .whereIn("sector_id", explored)
            .groupBy("sector_id")
        : [];
    const planetCounts =
      explored.length > 0
        ? await db("planets")
            .select("sector_id")
            .count("id as count")
            .whereIn("sector_id", explored)
            .groupBy("sector_id")
        : [];
    const outpostCountMap = new Map(
      outpostCounts.map((r: any) => [r.sector_id, Number(r.count)]),
    );
    const planetCountMap = new Map(
      planetCounts.map((r: any) => [r.sector_id, Number(r.count)]),
    );

    // NPC counts per sector
    const npcCounts =
      explored.length > 0
        ? await db("npc_definitions")
            .select("sector_id")
            .count("id as count")
            .whereIn("sector_id", explored)
            .groupBy("sector_id")
        : [];
    const npcCountMap = new Map(
      npcCounts.map((r: any) => [r.sector_id, Number(r.count)]),
    );

    // Planet names per sector
    const planetRows =
      explored.length > 0
        ? await db("planets")
            .select("sector_id", "name")
            .whereIn("sector_id", explored)
        : [];
    const planetNameMap = new Map<number, string[]>();
    for (const r of planetRows) {
      if (!planetNameMap.has(r.sector_id)) planetNameMap.set(r.sector_id, []);
      planetNameMap.get(r.sector_id)!.push(r.name);
    }

    // Outpost names per sector
    const outpostRows =
      explored.length > 0
        ? await db("outposts")
            .select("sector_id", "name")
            .whereIn("sector_id", explored)
        : [];
    const outpostNameMap = new Map<number, string[]>();
    for (const r of outpostRows) {
      if (!outpostNameMap.has(r.sector_id)) outpostNameMap.set(r.sector_id, []);
      outpostNameMap.get(r.sector_id)!.push(r.name);
    }

    // Get sector ownership data (sector_name, claimed_by, is_npc_starmall)
    let sectorOwnerData = new Map<
      number,
      {
        sectorName: string | null;
        owner: { name: string; type: "player" | "syndicate" } | null;
        isNpcStarmall: boolean;
      }
    >();
    if (explored.length > 0) {
      try {
        const sectorDetails = await db("sectors")
          .leftJoin("players", "sectors.claimed_by_player_id", "players.id")
          .leftJoin(
            "syndicates",
            "sectors.claimed_by_syndicate_id",
            "syndicates.id",
          )
          .whereIn("sectors.id", explored)
          .select(
            "sectors.id",
            "sectors.sector_name",
            "sectors.is_npc_starmall",
            "sectors.claimed_by_player_id",
            "sectors.claimed_by_syndicate_id",
            "players.username as player_name",
            "syndicates.name as syndicate_name",
          );
        for (const sd of sectorDetails) {
          let owner: { name: string; type: "player" | "syndicate" } | null =
            null;
          if (sd.claimed_by_player_id && sd.player_name) {
            owner = { name: sd.player_name, type: "player" };
          } else if (sd.claimed_by_syndicate_id && sd.syndicate_name) {
            owner = { name: sd.syndicate_name, type: "syndicate" };
          }
          sectorOwnerData.set(sd.id, {
            sectorName: sd.sector_name,
            owner,
            isNpcStarmall: !!sd.is_npc_starmall,
          });
        }
      } catch {
        /* columns may not exist yet */
      }
    }

    res.json({
      currentSectorId: player.current_sector_id,
      sectors: sectors.map((s) => ({
        id: s.id,
        type: s.type,
        regionId: s.region_id,
        hasStarMall: s.has_star_mall,
        hasOutposts: (outpostCountMap.get(s.id) || 0) > 0,
        hasPlanets: (planetCountMap.get(s.id) || 0) > 0,
        outpostCount: outpostCountMap.get(s.id) || 0,
        planetCount: planetCountMap.get(s.id) || 0,
        sectorName: sectorOwnerData.get(s.id)?.sectorName || null,
        owner: sectorOwnerData.get(s.id)?.owner || null,
        isNpcStarmall: sectorOwnerData.get(s.id)?.isNpcStarmall || false,
        npcCount: npcCountMap.get(s.id) || 0,
        planetNames: planetNameMap.get(s.id) || [],
        outpostNames: outpostNameMap.get(s.id) || [],
      })),
      edges: edges.map((e) => ({
        from: e.from_sector_id,
        to: e.to_sector_id,
        oneWay: e.one_way,
      })),
    });
  } catch (err) {
    console.error("Map error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Scan adjacent sectors (requires planetary scanner)
router.post("/scan", requireAuth, async (req, res) => {
  if (req.inTutorial) return handleTutorialScan(req, res);
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const ship = player.current_ship_id
      ? await db("ships").where({ id: player.current_ship_id }).first()
      : null;

    if (!ship) return res.status(400).json({ error: "No active ship" });

    // Check if ship type has scanner
    const { SHIP_TYPES } = require("../config/ship-types");
    const shipType = SHIP_TYPES.find((s: any) => s.id === ship.ship_type_id);
    if (!shipType?.hasPlanetaryScanner) {
      return res
        .status(400)
        .json({ error: "Ship does not have a planetary scanner" });
    }

    const edges = await db("sector_edges").where({
      from_sector_id: player.current_sector_id,
    });
    const adjacentIds = edges.map((e) => e.to_sector_id);

    const adjacentSectors = await db("sectors").whereIn("id", adjacentIds);
    const adjacentPlanets =
      adjacentIds.length > 0
        ? await db("planets").whereIn("sector_id", adjacentIds)
        : [];
    const adjacentPlayers =
      adjacentIds.length > 0
        ? await db("players")
            .whereIn("current_sector_id", adjacentIds)
            .select("id", "username", "current_sector_id")
        : [];

    // Mission progress: scan
    checkAndUpdateMissions(player.id, "scan", {});
    updateDailyMissionProgress(player.id, "scan_sectors").catch(() => {});

    // Resource events in scanned sectors (current + adjacent)
    let scannedResourceEvents: any[] = [];
    try {
      const allSectorIds = [player.current_sector_id, ...adjacentIds];
      scannedResourceEvents = await getResourceEventsInSectors(allSectorIds);
    } catch {
      /* table may not exist yet */
    }

    res.json({
      scannedSectors: adjacentSectors.map((s) => ({
        id: s.id,
        type: s.type,
        planets: adjacentPlanets
          .filter((p) => p.sector_id === s.id)
          .map((p) => {
            const base: any = {
              id: p.id,
              name: p.name,
              planetClass: p.planet_class,
              ownerId: p.owner_id,
            };
            if (p.variant) {
              const planetType = PLANET_TYPES[p.planet_class];
              base.variant = p.variant;
              base.variantName =
                planetType?.rareVariant?.variantName || p.variant;
            }
            return base;
          }),
        players: adjacentPlayers
          .filter((p) => p.current_sector_id === s.id)
          .map((p) => ({
            id: p.id,
            username: p.username,
          })),
        resourceEvents: scannedResourceEvents
          .filter((e) => e.sectorId === s.id)
          .map((e) => ({
            id: e.id,
            eventType: e.eventType,
            remainingNodes: e.remainingNodes,
            totalValue: e.totalValue,
            expiresAt: e.expiresAt,
            guardianHp: e.guardianHp,
          })),
      })),
    });
  } catch (err) {
    console.error("Scan error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Use planetary scanner probe to reveal detailed planet info in current sector
router.post("/use-scanner", requireAuth, async (req, res) => {
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    // Check for scanner probe in inventory (stored as game_events)
    const scannerItem = await db("game_events")
      .where({
        player_id: player.id,
        event_type: "item:scanner_probe",
        read: false,
      })
      .first();

    if (!scannerItem) {
      return res.status(400).json({
        error:
          "No Planetary Scanner Probe in inventory. Buy one at a Star Mall.",
      });
    }

    // Consume one scanner probe (mark event as read)
    await db("game_events")
      .where({ id: scannerItem.id })
      .update({ read: true });

    // Get detailed info for all planets in current sector
    const planets = await db("planets").where({
      sector_id: player.current_sector_id,
    });

    const detailedPlanets = [];
    for (const planet of planets) {
      // Get planet resources
      let planetResources: any[] = [];
      try {
        planetResources = await db("planet_resources")
          .join(
            "resource_definitions",
            "planet_resources.resource_id",
            "resource_definitions.id",
          )
          .where({ "planet_resources.planet_id": planet.id })
          .where("planet_resources.stock", ">", 0)
          .select("resource_definitions.name", "planet_resources.stock");
      } catch {
        /* table may not exist */
      }

      // Get owner name if owned
      let ownerName = null;
      if (planet.owner_id) {
        const owner = await db("players")
          .where({ id: planet.owner_id })
          .first();
        ownerName = owner?.username || null;
      }

      detailedPlanets.push({
        id: planet.id,
        name: planet.name,
        planetClass: planet.planet_class,
        sectorId: planet.sector_id,
        ownerName,
        owned: planet.owner_id === player.id,
        upgradeLevel: planet.upgrade_level,
        colonists: planet.colonists,
        drones: planet.drones || 0,
        cannonEnergy: planet.cannon_energy || 0,
        shieldEnergy: planet.shield_energy || 0,
        cyrilliumStock: planet.cyrillium_stock || 0,
        foodStock: planet.food_stock || 0,
        techStock: planet.tech_stock || 0,
        resources: planetResources,
      });
    }

    res.json({
      scanned: true,
      sectorId: player.current_sector_id,
      planets: detailedPlanets,
    });
  } catch (err) {
    console.error("Use scanner error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Dock at outpost
router.post("/dock", requireAuth, async (req, res) => {
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    // SP: check if Star Mall is locked
    if (player.game_mode === "singleplayer") {
      const currentSector = await db("sectors")
        .where({ id: player.current_sector_id })
        .first();
      if (currentSector?.has_star_mall && currentSector?.sp_mall_locked) {
        return res
          .status(400)
          .json({ error: "Complete more missions to unlock this Star Mall" });
      }
    }

    const outposts = await db("outposts").where({
      sector_id: player.current_sector_id,
    });
    if (outposts.length === 0) {
      return res.status(400).json({ error: "No outpost in this sector" });
    }

    const outpost = outposts[0];
    await db("players").where({ id: player.id }).update({
      docked_at_outpost_id: outpost.id,
    });

    // Return outpost trade data
    const { calculatePrice } = require("../engine/trading");
    const prices = {
      cyrillium: {
        price: calculatePrice(
          "cyrillium",
          outpost.cyrillium_stock,
          outpost.cyrillium_capacity,
        ),
        stock: outpost.cyrillium_stock,
        capacity: outpost.cyrillium_capacity,
        mode: outpost.cyrillium_mode,
      },
      food: {
        price: calculatePrice(
          "food",
          outpost.food_stock,
          outpost.food_capacity,
        ),
        stock: outpost.food_stock,
        capacity: outpost.food_capacity,
        mode: outpost.food_mode,
      },
      tech: {
        price: calculatePrice(
          "tech",
          outpost.tech_stock,
          outpost.tech_capacity,
        ),
        stock: outpost.tech_stock,
        capacity: outpost.tech_capacity,
        mode: outpost.tech_mode,
      },
    };

    updateDailyMissionProgress(player.id, "dock_outpost").catch(() => {});

    // Multi-session sync
    const io = req.app.get("io");
    if (io)
      syncPlayer(
        io,
        player.id,
        "sync:status",
        req.headers["x-socket-id"] as string | undefined,
      );

    res.json({
      docked: true,
      outpostId: outpost.id,
      name: outpost.name,
      treasury: outpost.treasury,
      prices,
      message: pickFlavor("dock", outpostNpcRace(outpost.id), {
        name: outpost.name,
      }),
    });
  } catch (err) {
    console.error("Dock error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Undock from outpost
router.post("/undock", requireAuth, async (req, res) => {
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    if (!player.docked_at_outpost_id) {
      return res.status(400).json({ error: "Not currently docked" });
    }

    const undockOutpost = await db("outposts")
      .where({ id: player.docked_at_outpost_id })
      .first();

    await db("players").where({ id: player.id }).update({
      docked_at_outpost_id: null,
    });

    // Multi-session sync
    const io = req.app.get("io");
    if (io)
      syncPlayer(
        io,
        player.id,
        "sync:status",
        req.headers["x-socket-id"] as string | undefined,
      );

    res.json({
      undocked: true,
      message: undockOutpost
        ? pickFlavor("undock", outpostNpcRace(undockOutpost.id), {
            name: undockOutpost.name,
          })
        : undefined,
    });
  } catch (err) {
    console.error("Undock error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Mark intro as seen
router.post("/seen-intro", requireAuth, async (req, res) => {
  try {
    await db("players")
      .where({ id: req.session.playerId })
      .update({ has_seen_intro: true });
    res.json({ success: true });
  } catch (err) {
    console.error("Seen intro error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Mark post-tutorial lore as seen
router.post("/seen-post-tutorial", requireAuth, async (req, res) => {
  try {
    await db("players")
      .where({ id: req.session.playerId })
      .update({ has_seen_post_tutorial: true });
    res.json({ success: true });
  } catch (err) {
    console.error("Seen post-tutorial error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Transition from single player to multiplayer
router.post("/transition-to-mp", requireAuth, async (req, res) => {
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    if (player.game_mode !== "singleplayer") {
      return res.status(400).json({ error: "Already in multiplayer mode" });
    }

    const force = req.body.force === true;

    // Check if all 20 SP missions are complete (unless forced)
    if (!force) {
      const spCompleted = await db("player_missions")
        .join(
          "mission_templates",
          "player_missions.template_id",
          "mission_templates.id",
        )
        .where({
          "player_missions.player_id": player.id,
          "mission_templates.source": "singleplayer",
          "player_missions.status": "completed",
        })
        .count("* as count")
        .first();
      const spTotal = await db("mission_templates")
        .where({ source: "singleplayer" })
        .count("* as count")
        .first();

      if (Number(spCompleted?.count || 0) < Number(spTotal?.count || 0)) {
        return res.status(400).json({
          error:
            "Complete all single player missions first, or use --force to transition early",
          completed: Number(spCompleted?.count || 0),
          total: Number(spTotal?.count || 0),
        });
      }
    }

    // Find a random MP star mall for the new starting location
    const mpStarMall = await db("sectors")
      .where({ has_star_mall: true, universe: "mp" })
      .orderByRaw("RANDOM()")
      .first();

    if (!mpStarMall) {
      return res
        .status(500)
        .json({ error: "Multiplayer universe not available" });
    }

    // Clean up SP universe data
    const spSectors = await db("sectors")
      .where({ owner_id: player.id, universe: "sp" })
      .select("id");
    const spSectorIds = spSectors.map((s: any) => s.id);

    if (spSectorIds.length > 0) {
      // Delete SP-specific data (order matters for FKs)
      await db("outposts").whereIn("sector_id", spSectorIds).del();
      await db("planets").whereIn("sector_id", spSectorIds).del();
      await db("npc_definitions").whereIn("sector_id", spSectorIds).del();
      await db("sector_edges").whereIn("from_sector_id", spSectorIds).del();
      await db("sector_edges").whereIn("to_sector_id", spSectorIds).del();
      await db("sectors").whereIn("id", spSectorIds).del();
    }

    // Delete SP missions
    await db("player_missions")
      .where({ player_id: player.id })
      .whereIn(
        "template_id",
        db("mission_templates").where({ source: "singleplayer" }).select("id"),
      )
      .del();

    // Update player to MP mode
    await db("players")
      .where({ id: player.id })
      .update({
        game_mode: "multiplayer",
        sp_sector_offset: null,
        sp_last_tick_at: null,
        current_sector_id: mpStarMall.id,
        explored_sectors: JSON.stringify([mpStarMall.id]),
        docked_at_outpost_id: null,
        landed_at_planet_id: null,
      });

    // Move active ship to MP sector
    if (player.current_ship_id) {
      await db("ships").where({ id: player.current_ship_id }).update({
        sector_id: mpStarMall.id,
      });
    }

    res.json({
      success: true,
      message: "Welcome to multiplayer! You have been placed at a Star Mall.",
      newSectorId: mpStarMall.id,
    });
  } catch (err) {
    console.error("Transition to MP error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Transition from multiplayer to single player
router.post("/transition-to-sp", requireAuth, async (req, res) => {
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    if (player.game_mode === "singleplayer") {
      return res.status(400).json({ error: "Already in single player mode" });
    }

    // Generate a fresh SP universe
    const { generateSPUniverse } = await import("../engine/sp-universe");
    const { assignInitialSPMissions } =
      await import("../db/seeds/011_sp_missions");

    const spResult = await generateSPUniverse(player.id, db);
    const startingSectorId = spResult.startingSectorId;

    // Assign SP missions
    await assignInitialSPMissions(player.id, db);

    // Update player to SP mode
    await db("players")
      .where({ id: player.id })
      .update({
        game_mode: "singleplayer",
        current_sector_id: startingSectorId,
        explored_sectors: JSON.stringify([startingSectorId]),
        docked_at_outpost_id: null,
        landed_at_planet_id: null,
      });

    // Move active ship to SP sector
    if (player.current_ship_id) {
      await db("ships").where({ id: player.current_ship_id }).update({
        sector_id: startingSectorId,
      });
    }

    res.json({
      success: true,
      message:
        "Welcome to single player! A fresh 1000-sector universe has been generated for you.",
      newSectorId: startingSectorId,
    });
  } catch (err) {
    console.error("Transition to SP error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Land on a planet in the current sector
router.post("/land", requireAuth, async (req, res) => {
  if (req.inTutorial) return handleTutorialLand(req, res);
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const { planetId } = req.body;
    if (!planetId) return res.status(400).json({ error: "Missing planetId" });

    const planet = await db("planets").where({ id: planetId }).first();
    if (!planet) return res.status(404).json({ error: "Planet not found" });

    if (planet.sector_id !== player.current_sector_id) {
      return res
        .status(400)
        .json({ error: "Planet is not in your current sector" });
    }

    if (player.landed_at_planet_id) {
      return res
        .status(400)
        .json({ error: "You must liftoff before landing on another planet" });
    }

    await db("players").where({ id: player.id }).update({
      landed_at_planet_id: planetId,
      docked_at_outpost_id: null,
    });

    updateDailyMissionProgress(player.id, "land_planet").catch(() => {});

    const planetType = PLANET_TYPES[planet.planet_class];

    // Multi-session sync
    const io = req.app.get("io");
    if (io)
      syncPlayer(
        io,
        player.id,
        "sync:status",
        req.headers["x-socket-id"] as string | undefined,
      );

    const landRace = (player.race as RaceId) || "generic";
    res.json({
      landed: true,
      planetId: planet.id,
      name: planet.name,
      planetClass: planet.planet_class,
      className: planetType?.name || planet.planet_class,
      ownerId: planet.owner_id || null,
      upgradeLevel: planet.upgrade_level,
      message: pickFlavor("land", landRace, { planet: planet.name }),
    });
  } catch (err) {
    console.error("Land error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Liftoff from a planet
router.post("/liftoff", requireAuth, async (req, res) => {
  if (req.inTutorial) return handleTutorialLiftoff(req, res);
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    if (!player.landed_at_planet_id) {
      return res
        .status(400)
        .json({ error: "Not currently landed on a planet" });
    }

    await db("players").where({ id: player.id }).update({
      landed_at_planet_id: null,
    });

    // Multi-session sync
    const io = req.app.get("io");
    if (io)
      syncPlayer(
        io,
        player.id,
        "sync:status",
        req.headers["x-socket-id"] as string | undefined,
      );

    const liftRace = (player.race as RaceId) || "generic";
    const landedPlanet = await db("planets")
      .where({ id: player.landed_at_planet_id })
      .first();
    res.json({
      lifted: true,
      message: landedPlanet
        ? pickFlavor("liftoff", liftRace, { planet: landedPlanet.name })
        : undefined,
    });
  } catch (err) {
    console.error("Liftoff error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
