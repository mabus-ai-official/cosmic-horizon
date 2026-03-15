import crypto from "crypto";
import { Server as SocketIOServer } from "socket.io";
import db from "../db/connection";
import { GAME_CONFIG } from "../config/game";
import {
  calculateProduction,
  calculateColonistGrowth,
  calculateFoodConsumption,
} from "./planets";
import {
  calculateHappiness,
  calculateAverageAffinity,
  type RacePopulation,
} from "./happiness";
import { PLANET_TYPES } from "../config/planet-types";
import {
  processDecay,
  processDefenseDecay,
  isDeployableExpired,
} from "./decay";
import {
  notifyPlayer,
  notifySector,
  notifySyndicate,
  getConnectedPlayers,
} from "../ws/handlers";
import { syncPlayer } from "../ws/sync";
import { spawnSectorEvents, expireSectorEvents } from "./events";
import { refreshLeaderboardCache } from "./leaderboards";
import { producePlanetUniqueResources } from "./crafting";
import {
  spawnResourceEvents,
  expireResourceEvents,
  produceRarePlanetResources,
} from "./rare-spawns";
import {
  processFactoryProduction,
  checkAndCompleteProjects,
} from "./syndicate-economy";
import { processCaravans, dispatchCaravans } from "./caravans";

let tickInterval: ReturnType<typeof setInterval> | null = null;
let tickCount = 0;

export async function gameTick(io: SocketIOServer): Promise<void> {
  const now = new Date();

  try {
    // 1. Regenerate energy for MP players only (SP players get energy via on-demand tick)
    await db("players")
      .where("energy", "<", db.ref("max_energy"))
      .where("game_mode", "multiplayer")
      .increment("energy", GAME_CONFIG.ENERGY_REGEN_RATE);

    // Cap energy at max
    await db("players")
      .whereRaw("energy > max_energy")
      .where("game_mode", "multiplayer")
      .update({ energy: db.ref("max_energy") });

    // Bonus regen for new players
    await db("players")
      .where("energy", "<", db.ref("max_energy"))
      .where("energy_regen_bonus_until", ">", now.toISOString())
      .where("game_mode", "multiplayer")
      .increment("energy", GAME_CONFIG.ENERGY_REGEN_RATE);

    // Cap again
    await db("players")
      .whereRaw("energy > max_energy")
      .where("game_mode", "multiplayer")
      .update({ energy: db.ref("max_energy") });

    // Expire Vedic max_energy bonus after the regen bonus period ends
    await db("players")
      .where({ race: "vedic", game_mode: "multiplayer" })
      .where("max_energy", ">", GAME_CONFIG.MAX_ENERGY)
      .where("energy_regen_bonus_until", "<=", now.toISOString())
      .update({ max_energy: GAME_CONFIG.MAX_ENERGY });

    // Cap energy at new max_energy after bonus expiry
    await db("players")
      .whereRaw("energy > max_energy")
      .where("game_mode", "multiplayer")
      .update({ energy: db.ref("max_energy") });

    // 1b. Recharge weapon energy for all active ships
    await db("ships")
      .whereRaw("weapon_energy < max_weapon_energy")
      .where("hull_hp", ">", 0)
      .increment("weapon_energy", GAME_CONFIG.WEAPON_RECHARGE_PER_TICK);
    // Cap at max
    await db("ships")
      .whereRaw("weapon_energy > max_weapon_energy")
      .update({ weapon_energy: db.raw("max_weapon_energy") });

    // 2. Planet production — MP planets only (SP planets processed via on-demand tick)
    const planetOwnerIds = new Set<string>();
    const planets = await db("planets")
      .whereNotNull("owner_id")
      .where("colonists", ">", 0)
      .whereIn("sector_id", db("sectors").where("universe", "mp").select("id"));

    for (const planet of planets) {
      const planetConfig = PLANET_TYPES[planet.planet_class];
      if (!planetConfig) continue;
      planetOwnerIds.add(planet.owner_id);

      // Load race populations for this planet
      let racePopulations: RacePopulation[] = [];
      try {
        racePopulations = await db("planet_colonists")
          .where({ planet_id: planet.id })
          .select("race", "count");
      } catch {
        /* table may not exist yet */
      }

      // If no race populations yet, use legacy mode
      if (racePopulations.length === 0) {
        racePopulations = [{ race: "unknown", count: planet.colonists }];
      }

      const totalColonists = racePopulations.reduce(
        (sum, rp) => sum + rp.count,
        0,
      );
      const avgAffinity = calculateAverageAffinity(
        racePopulations,
        planet.planet_class,
      );

      // Calculate happiness
      const foodConsumption = calculateFoodConsumption(
        planet.planet_class,
        totalColonists,
        planet.happiness || 50,
        planet.upgrade_level,
      );
      const newHappiness = calculateHappiness(planet.happiness || 50, {
        foodStock: planet.food_stock || 0,
        colonists: totalColonists,
        idealPopulation: planetConfig.idealPopulation,
        upgradeLevel: planet.upgrade_level,
        droneCount: planet.drone_count || 0,
        foodConsumptionRate: planetConfig.foodConsumptionRate,
        avgRaceAffinity: avgAffinity,
      });

      // Calculate production (no food output)
      const production = calculateProduction(
        planet.planet_class,
        racePopulations,
        newHappiness,
      );

      // Calculate growth & food consumption
      const growth = calculateColonistGrowth(
        planet.planet_class,
        totalColonists,
        newHappiness,
        planet.food_stock || 0,
        planet.upgrade_level,
      );

      await db("planets")
        .where({ id: planet.id })
        .update({
          cyrillium_stock: (planet.cyrillium_stock || 0) + production.cyrillium,
          food_stock: Math.max(
            0,
            (planet.food_stock || 0) +
              growth.foodProduced -
              growth.foodConsumed,
          ),
          tech_stock: (planet.tech_stock || 0) + production.tech,
          drone_count: (planet.drone_count || 0) + production.drones,
          colonists: growth.newColonists,
          happiness: newHappiness,
        });

      // Update planet_colonists proportionally if population changed
      if (
        growth.newColonists !== totalColonists &&
        racePopulations.length > 0 &&
        totalColonists > 0
      ) {
        const ratio = growth.newColonists / totalColonists;
        let assigned = 0;
        for (let i = 0; i < racePopulations.length; i++) {
          const rp = racePopulations[i];
          const newCount =
            i === racePopulations.length - 1
              ? growth.newColonists - assigned
              : Math.floor(rp.count * ratio);
          assigned += newCount;
          await db("planet_colonists")
            .where({ planet_id: planet.id, race: rp.race })
            .update({ count: Math.max(0, newCount) });
        }
      }

      // Insert production history row
      try {
        await db("planet_production_history").insert({
          id: crypto.randomUUID(),
          planet_id: planet.id,
          tick_at: now.toISOString(),
          cyrillium_produced: production.cyrillium,
          tech_produced: production.tech,
          drones_produced: production.drones,
          food_consumed: growth.foodConsumed,
          colonist_count: growth.newColonists,
          happiness: newHappiness,
        });
      } catch {
        /* table may not exist yet */
      }
    }

    // Notify planet owners of production updates
    for (const ownerId of planetOwnerIds) {
      syncPlayer(io, ownerId, "sync:status");
    }

    // 2b. Planet unique resource production
    try {
      for (const planet of planets) {
        await producePlanetUniqueResources(planet);
      }
    } catch {
      /* crafting tables may not exist yet */
    }

    // 2c. Rare planet ultra-rare resource production
    try {
      for (const planet of planets) {
        if (planet.variant && planet.rare_resource) {
          await produceRarePlanetResources(planet);
        }
      }
    } catch {
      /* rare spawns tables may not exist yet */
    }

    // 2d. Factory planet production → syndicate pool
    const factorySyndicateIds = new Set<string>();
    try {
      const factories = await db("planets")
        .where({ is_syndicate_factory: true })
        .whereNotNull("owner_id")
        .where("colonists", ">", 0);
      for (const factory of factories) {
        await processFactoryProduction(factory);
        if (factory.factory_syndicate_id) {
          factorySyndicateIds.add(factory.factory_syndicate_id);
        }
      }
      for (const syndicateId of factorySyndicateIds) {
        notifySyndicate(io, syndicateId, "syndicate:economy_update", {});
      }
    } catch {
      /* syndicate economy tables may not exist yet */
    }

    // 3. Decay - inactive MP player planets only
    const inactivePlayers = await db("players")
      .whereNotNull("last_login")
      .where("game_mode", "multiplayer")
      .whereRaw(`julianday('now') - julianday(last_login) > ?`, [
        GAME_CONFIG.DECAY_INACTIVE_THRESHOLD_HOURS / 24,
      ]);

    for (const inactivePlayer of inactivePlayers) {
      const lastLogin = new Date(inactivePlayer.last_login);
      const hoursInactive =
        (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60);

      const playerPlanets = await db("planets").where({
        owner_id: inactivePlayer.id,
      });
      for (const planet of playerPlanets) {
        const result = processDecay({
          colonists: planet.colonists || 0,
          hoursInactive,
          inactiveThresholdHours: GAME_CONFIG.DECAY_INACTIVE_THRESHOLD_HOURS,
        });
        if (result.decayed) {
          await db("planets")
            .where({ id: planet.id })
            .update({ colonists: result.newColonists });
        }
      }
    }

    // Defense energy drain on MP deployed defenses
    const planetsWithDrones = await db("planets")
      .where("drone_count", ">", 0)
      .whereIn("sector_id", db("sectors").where("universe", "mp").select("id"));
    for (const planet of planetsWithDrones) {
      const newDrones = processDefenseDecay(
        planet.drone_count,
        planet.drone_count * 2,
      );
      await db("planets")
        .where({ id: planet.id })
        .update({ drone_count: newDrones });
    }

    // Delete expired deployables
    const deployableExpiredSectors = new Set<number>();
    const deployables = await db("deployables").select("*");
    for (const dep of deployables) {
      if (
        isDeployableExpired(
          new Date(dep.created_at),
          new Date(dep.last_maintained_at || dep.created_at),
          now,
        )
      ) {
        deployableExpiredSectors.add(dep.sector_id);
        await db("deployables").where({ id: dep.id }).del();
      }
    }
    for (const sectorId of deployableExpiredSectors) {
      notifySector(io, sectorId, "sync:sector", {});
    }

    // Expire timed missions
    try {
      const expiringMissions = await db("player_missions")
        .where({ status: "active" })
        .whereNotNull("expires_at")
        .where("expires_at", "<", now.toISOString())
        .select("player_id");
      if (expiringMissions.length > 0) {
        await db("player_missions")
          .where({ status: "active" })
          .whereNotNull("expires_at")
          .where("expires_at", "<", now.toISOString())
          .update({ status: "failed" });
        const expiredPlayerIds = new Set(
          expiringMissions.map((m: any) => m.player_id),
        );
        for (const playerId of expiredPlayerIds) {
          syncPlayer(io, playerId, "sync:status");
          notifyPlayer(io, playerId, "notification", {
            type: "mission_expired",
            message: "A timed mission has expired.",
          });
        }
      }
    } catch {
      /* table may not exist yet */
    }

    // Sector events: spawn new events and expire old ones
    try {
      const spawnedSectors = await spawnSectorEvents();
      const expiredSectors = await expireSectorEvents();
      const eventSectors = new Set([...spawnedSectors, ...expiredSectors]);
      for (const sectorId of eventSectors) {
        notifySector(io, sectorId, "sync:sector", {});
      }
    } catch {
      /* table may not exist yet */
    }

    // Resource events: expire every tick, spawn wave every N ticks
    try {
      const expiredResSectors = await expireResourceEvents();
      let spawnedResSectors: number[] = [];
      if (tickCount % GAME_CONFIG.RARE_EVENT_SPAWN_INTERVAL_TICKS === 0) {
        spawnedResSectors = await spawnResourceEvents();
      }
      const resSectors = new Set([...expiredResSectors, ...spawnedResSectors]);
      for (const sectorId of resSectors) {
        notifySector(io, sectorId, "sync:sector", {});
      }
    } catch {
      /* table may not exist yet */
    }

    // Leaderboards: refresh cache every 5 ticks
    tickCount++;
    if (tickCount % 5 === 0) {
      try {
        await refreshLeaderboardCache();
      } catch {
        /* table may not exist yet */
      }
    }

    // Mega-project completion check every 10 ticks
    if (tickCount % 10 === 0) {
      try {
        const completedSyndicateIds = await checkAndCompleteProjects();
        for (const syndicateId of completedSyndicateIds) {
          notifySyndicate(io, syndicateId, "syndicate:project_completed", {});
        }
      } catch {
        /* syndicate economy tables may not exist yet */
      }
    }

    // Caravan movement + dispatch
    try {
      await processCaravans(io);
      await dispatchCaravans(io);
    } catch {
      /* trade route tables may not exist yet */
    }

    // Pirate flag expiry
    try {
      const expiringPirates = await db("players")
        .whereNotNull("pirate_until")
        .where("pirate_until", "<", now.toISOString())
        .select("id");
      if (expiringPirates.length > 0) {
        await db("players")
          .whereNotNull("pirate_until")
          .where("pirate_until", "<", now.toISOString())
          .update({ pirate_until: null });
        for (const p of expiringPirates) {
          syncPlayer(io, p.id, "sync:status");
        }
      }
    } catch {
      /* column may not exist yet */
    }

    // Story act cooldown expiry
    try {
      const expiredCooldowns = await db("players")
        .whereNotNull("act_cooldown_until")
        .where("act_cooldown_until", "<=", now.toISOString())
        .select("id");
      for (const p of expiredCooldowns) {
        await db("players")
          .where({ id: p.id })
          .update({ act_cooldown_until: null });
        notifyPlayer(io, p.id, "story:act_unlocked", {
          message: "The next act of your journey awaits, pilot.",
        });
      }
    } catch {
      /* column may not exist yet */
    }

    // Clean up old daily stats (retain 31 days)
    try {
      const cutoffDate = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      await db("player_stats_daily").where("stat_date", "<", cutoffDate).del();
    } catch {
      /* table may not exist yet */
    }

    // Clean up old activity logs (retain 500 per player)
    try {
      await db.raw(`
        DELETE FROM player_activity_log WHERE id IN (
          SELECT pal.id FROM player_activity_log pal
          WHERE (SELECT COUNT(*) FROM player_activity_log pal2
                 WHERE pal2.player_id = pal.player_id AND pal2.created_at > pal.created_at) >= 500
        )
      `);
    } catch {
      /* table may not exist yet */
    }

    // Production history cleanup every 60 ticks
    if (tickCount % GAME_CONFIG.PRODUCTION_HISTORY_CLEANUP_INTERVAL === 0) {
      try {
        const cutoff = new Date(
          now.getTime() -
            GAME_CONFIG.PRODUCTION_HISTORY_RETENTION_TICKS * 60000,
        );
        await db("planet_production_history")
          .where("tick_at", "<", cutoff.toISOString())
          .del();
      } catch {
        /* table may not exist yet */
      }
    }

    // 4. Outpost economy - inject treasury (MP outposts only)
    await db("outposts")
      .whereIn("sector_id", db("sectors").where("universe", "mp").select("id"))
      .increment("treasury", GAME_CONFIG.OUTPOST_TREASURY_INJECTION);

    // 5. Emit energy updates to connected MP players
    const connectedPlayers = getConnectedPlayers();
    for (const [, playerId] of connectedPlayers) {
      const player = await db("players")
        .where({ id: playerId, game_mode: "multiplayer" })
        .select("energy", "max_energy", "current_ship_id")
        .first();
      if (player) {
        let weaponEnergy: number | undefined;
        let maxWeaponEnergy: number | undefined;
        if (player.current_ship_id) {
          const ship = await db("ships")
            .where({ id: player.current_ship_id })
            .select("weapon_energy", "max_weapon_energy")
            .first();
          if (ship) {
            weaponEnergy = ship.weapon_energy;
            maxWeaponEnergy = ship.max_weapon_energy;
          }
        }
        notifyPlayer(io, playerId, "energy:update", {
          energy: player.energy,
          maxEnergy: player.max_energy,
          weaponEnergy,
          maxWeaponEnergy,
        });
      }
    }
  } catch (err) {
    console.error("Game tick error:", err);
  }
}

export function startGameTick(io: SocketIOServer): void {
  if (tickInterval) return;
  tickInterval = setInterval(() => gameTick(io), GAME_CONFIG.TICK_INTERVAL_MS);
  console.log(`Game tick started (${GAME_CONFIG.TICK_INTERVAL_MS}ms interval)`);
}

export function stopGameTick(): void {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
    console.log("Game tick stopped");
  }
}
