import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { canAffordAction, deductEnergy, getActionCost } from "../engine/energy";
import { applyUpgradesToShip } from "../engine/upgrades";
import { awardXP } from "../engine/progression";
import { checkAchievements } from "../engine/achievements";
import { GAME_CONFIG } from "../config/game";
import { SHIP_TYPES } from "../config/ship-types";
import { getRace, RaceId } from "../config/races";
import db from "../db/connection";
import {
  incrementStat,
  logActivity,
  checkMilestones,
} from "../engine/profile-stats";
import { notifyPlayer } from "../ws/handlers";
import { syncPlayer } from "../ws/sync";

const router = Router();

// Bombard a planet from orbit (3 AP)
// Flow: shield → cannon (fires back) → drones → conquest
router.post("/bombard", requireAuth, async (req, res) => {
  try {
    const { planetId, energyToExpend } = req.body;
    if (!planetId || !energyToExpend || energyToExpend < 1) {
      return res.status(400).json({ error: "Missing or invalid fields" });
    }

    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    if (!canAffordAction(player.energy, "bombard")) {
      return res.status(400).json({
        error: "Not enough energy",
        cost: getActionCost("bombard"),
      });
    }

    // Must be in same sector as planet
    const planet = await db("planets").where({ id: planetId }).first();
    if (!planet) return res.status(404).json({ error: "Planet not found" });
    if (planet.sector_id !== player.current_sector_id) {
      return res.status(400).json({ error: "Planet is not in your sector" });
    }

    // Can't bombard own planet
    if (planet.owner_id === player.id) {
      return res
        .status(400)
        .json({ error: "You cannot bombard your own planet" });
    }

    // Can't bombard unclaimed planets
    if (!planet.owner_id) {
      return res
        .status(400)
        .json({ error: "Planet is unclaimed — use 'claim' instead" });
    }

    // Check sector type
    const sector = await db("sectors")
      .where({ id: player.current_sector_id })
      .first();
    if (sector?.type === "protected" || sector?.type === "harmony_enforced") {
      return res
        .status(400)
        .json({ error: "Combat not allowed in this sector" });
    }

    // Check alliance — can't bombard ally's planet
    const alliance = await db("alliances")
      .where(function () {
        this.where({ player1_id: player.id, player2_id: planet.owner_id });
      })
      .orWhere(function () {
        this.where({ player1_id: planet.owner_id, player2_id: player.id });
      })
      .where({ status: "active" })
      .first();
    if (alliance) {
      return res
        .status(400)
        .json({ error: "Cannot bombard an allied player's planet" });
    }

    // Get attacker ship
    const ship = await db("ships")
      .where({ id: player.current_ship_id })
      .first();
    if (!ship) return res.status(400).json({ error: "No active ship" });

    const shipType = SHIP_TYPES.find((s) => s.id === ship.ship_type_id);
    if (!shipType) return res.status(500).json({ error: "Invalid ship type" });

    const upgrades = await applyUpgradesToShip(ship.id);
    const totalWeaponEnergy = ship.weapon_energy + upgrades.weaponBonus;
    const actualExpend = Math.min(energyToExpend, totalWeaponEnergy);
    if (actualExpend <= 0) {
      return res.status(400).json({ error: "No weapon energy available" });
    }

    const attackerRace = player.race ? getRace(player.race as RaceId) : null;
    const attackBonus = 1 + (attackerRace?.attackRatioBonus ?? 0);

    // --- Bombardment resolution ---
    let remainingDamage = Math.round(
      actualExpend * shipType.attackRatio * attackBonus,
    );
    let shieldDamage = 0;
    let cannonDamage = 0;
    let dronesDestroyed = 0;
    let returnFireDamage = 0;
    let conquered = false;

    let newShieldEnergy = planet.shield_energy || 0;
    let newCannonEnergy = planet.cannon_energy || 0;
    let newDroneCount = planet.drone_count || 0;

    // Phase 1: Shield
    if (newShieldEnergy > 0 && remainingDamage > 0) {
      const dmg = Math.round(
        remainingDamage * GAME_CONFIG.BOMBARD_SHIELD_DAMAGE_RATIO,
      );
      shieldDamage = Math.min(dmg, newShieldEnergy);
      newShieldEnergy -= shieldDamage;
      remainingDamage -= Math.ceil(
        shieldDamage / GAME_CONFIG.BOMBARD_SHIELD_DAMAGE_RATIO,
      );
    }

    // Phase 2: Cannon (fires back!)
    if (newCannonEnergy > 0 && remainingDamage > 0) {
      // Cannon return fire
      returnFireDamage = Math.round(
        (planet.cannon_shot_power || 10) * GAME_CONFIG.CANNON_RETURN_FIRE_RATIO,
      );

      const dmg = Math.round(
        remainingDamage * GAME_CONFIG.BOMBARD_CANNON_DAMAGE_RATIO,
      );
      cannonDamage = Math.min(dmg, newCannonEnergy);
      newCannonEnergy -= cannonDamage;
      remainingDamage -= Math.ceil(
        cannonDamage / GAME_CONFIG.BOMBARD_CANNON_DAMAGE_RATIO,
      );
    }

    // Phase 3: Drones
    if (newDroneCount > 0 && remainingDamage > 0) {
      const dmg = Math.round(
        remainingDamage * GAME_CONFIG.BOMBARD_DRONE_DAMAGE_RATIO,
      );
      dronesDestroyed = Math.min(Math.floor(dmg / 2), newDroneCount); // each drone ~2 hp
      newDroneCount -= dronesDestroyed;
    }

    // Check conquest: all defenses at 0
    if (newShieldEnergy <= 0 && newCannonEnergy <= 0 && newDroneCount <= 0) {
      conquered = true;
    }

    // Update planet defenses
    const planetUpdate: Record<string, any> = {
      shield_energy: Math.max(0, newShieldEnergy),
      cannon_energy: Math.max(0, newCannonEnergy),
      drone_count: Math.max(0, newDroneCount),
    };
    if (conquered) {
      planetUpdate.owner_id = player.id;
      // Happiness drops on conquest
      planetUpdate.happiness = Math.max(0, (planet.happiness ?? 50) - 30);
    }
    await db("planets").where({ id: planet.id }).update(planetUpdate);

    // Deduct weapon energy from ship
    const newWeaponEnergy = Math.max(0, ship.weapon_energy - actualExpend);
    await db("ships").where({ id: ship.id }).update({
      weapon_energy: newWeaponEnergy,
    });

    // Apply return fire damage to attacker ship
    let attackerHullRemaining = ship.hull_hp;
    let attackerDestroyed = false;
    if (returnFireDamage > 0) {
      attackerHullRemaining = Math.max(0, ship.hull_hp - returnFireDamage);
      await db("ships").where({ id: ship.id }).update({
        hull_hp: attackerHullRemaining,
      });
      if (attackerHullRemaining <= 0) {
        attackerDestroyed = true;
        // Spawn dodge pod
        const crypto = require("crypto");
        const podId = crypto.randomUUID();
        await db("ships").insert({
          id: podId,
          ship_type_id: "dodge_pod",
          owner_id: player.id,
          sector_id: player.current_sector_id,
          weapon_energy: 0,
          max_weapon_energy: 0,
          engine_energy: 20,
          max_engine_energy: 20,
          cargo_holds: 0,
          max_cargo_holds: 0,
          hull_hp: 10,
          max_hull_hp: 10,
        });
        await db("players")
          .where({ id: player.id })
          .update({ current_ship_id: podId });
      }
    }

    // Deduct player AP
    const newEnergy = deductEnergy(player.energy, "bombard");
    await db("players").where({ id: player.id }).update({ energy: newEnergy });

    // XP
    let xpResult = await awardXP(
      player.id,
      GAME_CONFIG.XP_BOMBARD_VOLLEY,
      "combat",
    );
    if (conquered) {
      xpResult = await awardXP(
        player.id,
        GAME_CONFIG.XP_CONQUER_PLANET,
        "combat",
      );
      const achUnlocked = await checkAchievements(
        player.id,
        "conquer_planet",
        {},
      );
      const io = req.app.get("io");
      if (io) {
        for (const a of achUnlocked) {
          notifyPlayer(io, player.id, "achievement:unlocked", {
            name: a.name,
            description: a.description,
            xpReward: a.xpReward,
            creditReward: a.creditReward,
          });
        }
      }
    }

    // Profile stats
    incrementStat(player.id, "planets_bombarded", 1);
    if (conquered) {
      incrementStat(player.id, "planets_conquered", 1);
      logActivity(
        player.id,
        "conquer_planet",
        `Conquered ${planet.name} in sector ${planet.sector_id}`,
        { planetId: planet.id },
      );
    }
    checkMilestones(player.id);

    // WebSocket notification to planet owner
    const io = req.app.get("io");
    if (io && planet.owner_id) {
      const ownerSocketIds = io.sockets.adapter.rooms.get(
        `player:${planet.owner_id}`,
      );
      if (ownerSocketIds) {
        const msg = conquered
          ? `${player.username} has conquered your planet ${planet.name}!`
          : `${player.username} is bombarding your planet ${planet.name}! Shield: ${Math.max(0, newShieldEnergy)}, Cannons: ${Math.max(0, newCannonEnergy)}, Drones: ${Math.max(0, newDroneCount)}`;
        io.to(`player:${planet.owner_id}`).emit("notification", {
          type: conquered ? "planet:conquered" : "planet:bombarded",
          message: msg,
        });
      }

      // Sync attacker status
      syncPlayer(
        io,
        player.id,
        "sync:status",
        req.headers["x-socket-id"] as string | undefined,
      );
    }

    res.json({
      shieldDamage,
      cannonDamage,
      dronesDestroyed,
      returnFireDamage,
      attackerHullRemaining,
      attackerDestroyed,
      conquered,
      planetDefenses: {
        shieldEnergy: Math.max(0, newShieldEnergy),
        cannonEnergy: Math.max(0, newCannonEnergy),
        droneCount: Math.max(0, newDroneCount),
      },
      energy: newEnergy,
      weaponEnergy: newWeaponEnergy,
      xp: {
        awarded: xpResult.xpAwarded,
        total: xpResult.totalXp,
        level: xpResult.level,
        rank: xpResult.rank,
        levelUp: xpResult.levelUp,
      },
    });
  } catch (err) {
    console.error("Bombard error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Fortify a planet's defenses (owner only)
router.post("/fortify", requireAuth, async (req, res) => {
  try {
    const { planetId, type, amount } = req.body;
    if (!planetId || !type || !amount || amount < 1) {
      return res.status(400).json({ error: "Missing or invalid fields" });
    }
    if (!["shield", "cannon", "drone"].includes(type)) {
      return res
        .status(400)
        .json({ error: "Type must be shield, cannon, or drone" });
    }

    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const planet = await db("planets").where({ id: planetId }).first();
    if (!planet) return res.status(404).json({ error: "Planet not found" });
    if (planet.owner_id !== player.id) {
      return res.status(400).json({ error: "You do not own this planet" });
    }
    if (planet.sector_id !== player.current_sector_id) {
      return res.status(400).json({ error: "Planet is not in your sector" });
    }

    // Calculate cost
    let costPerUnit: number;
    switch (type) {
      case "shield":
        costPerUnit = GAME_CONFIG.FORTIFY_SHIELD_COST_PER_UNIT;
        break;
      case "cannon":
        costPerUnit = GAME_CONFIG.FORTIFY_CANNON_COST_PER_UNIT;
        break;
      case "drone":
        costPerUnit = GAME_CONFIG.FORTIFY_DRONE_COST_PER_UNIT;
        break;
      default:
        return res.status(400).json({ error: "Invalid type" });
    }

    // Also require tech from planet stock
    const techCostPerUnit = type === "drone" ? 2 : 1;
    const maxByTech = Math.floor((planet.tech_stock || 0) / techCostPerUnit);
    const maxByCredits = Math.floor(Number(player.credits) / costPerUnit);
    const actualAmount = Math.min(amount, maxByCredits, maxByTech);

    if (actualAmount <= 0) {
      return res.status(400).json({
        error: "Not enough credits or tech stock on planet",
      });
    }

    const totalCost = costPerUnit * actualAmount;
    const totalTech = techCostPerUnit * actualAmount;

    // Apply fortification
    const update: Record<string, any> = {
      tech_stock: (planet.tech_stock || 0) - totalTech,
    };
    switch (type) {
      case "shield":
        update.shield_energy = (planet.shield_energy || 0) + actualAmount;
        update.shield_max_energy = Math.max(
          planet.shield_max_energy || 0,
          (planet.shield_energy || 0) + actualAmount,
        );
        break;
      case "cannon":
        update.cannon_energy = (planet.cannon_energy || 0) + actualAmount;
        update.cannon_max_energy = Math.max(
          planet.cannon_max_energy || 0,
          (planet.cannon_energy || 0) + actualAmount,
        );
        break;
      case "drone":
        update.drone_count = (planet.drone_count || 0) + actualAmount;
        break;
    }

    await db("planets").where({ id: planet.id }).update(update);
    await db("players")
      .where({ id: player.id })
      .update({ credits: Number(player.credits) - totalCost });

    res.json({
      type,
      added: actualAmount,
      creditsCost: totalCost,
      techCost: totalTech,
      newCredits: Number(player.credits) - totalCost,
      planetDefenses: {
        shieldEnergy:
          type === "shield"
            ? (planet.shield_energy || 0) + actualAmount
            : planet.shield_energy || 0,
        cannonEnergy:
          type === "cannon"
            ? (planet.cannon_energy || 0) + actualAmount
            : planet.cannon_energy || 0,
        droneCount:
          type === "drone"
            ? (planet.drone_count || 0) + actualAmount
            : planet.drone_count || 0,
      },
    });
  } catch (err) {
    console.error("Fortify error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get planet defenses (any player can scan defenses of planets in their sector)
router.get("/defenses/:planetId", requireAuth, async (req, res) => {
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const planet = await db("planets")
      .where({ id: req.params.planetId })
      .first();
    if (!planet) return res.status(404).json({ error: "Planet not found" });
    if (planet.sector_id !== player.current_sector_id) {
      return res.status(400).json({ error: "Planet is not in your sector" });
    }

    const isOwner = planet.owner_id === player.id;
    const ownerName = planet.owner_id
      ? (
          await db("players")
            .where({ id: planet.owner_id })
            .select("username")
            .first()
        )?.username || "Unknown"
      : null;

    res.json({
      planetId: planet.id,
      name: planet.name,
      ownerId: planet.owner_id,
      ownerName,
      isOwner,
      defenses: {
        shieldEnergy: planet.shield_energy || 0,
        shieldMaxEnergy: planet.shield_max_energy || 0,
        cannonEnergy: planet.cannon_energy || 0,
        cannonMaxEnergy: planet.cannon_max_energy || 0,
        cannonShotPower: planet.cannon_shot_power || 10,
        droneCount: planet.drone_count || 0,
        droneMode: planet.drone_mode || null,
      },
    });
  } catch (err) {
    console.error("Planet defenses error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
