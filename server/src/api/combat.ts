import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { canAffordAction, deductEnergy, getActionCost } from "../engine/energy";
import {
  resolveCombatVolley,
  attemptFlee,
  CombatState,
} from "../engine/combat";
import { SHIP_TYPES } from "../config/ship-types";
import { getRace, RaceId } from "../config/races";
import { checkAndUpdateMissions } from "../services/mission-tracker";
import { applyUpgradesToShip } from "../engine/upgrades";
import { applyTabletBonuses, TabletBonuses } from "../engine/tablets";
import { awardXP, getPlayerLevelBonuses } from "../engine/progression";
import { checkAchievements } from "../engine/achievements";
import { updateDailyMissionProgress } from "./daily-missions";
import { GAME_CONFIG } from "../config/game";
import { pickFlavor } from "../config/flavor-text";
import { onCombatKill } from "../engine/npcs";
import db from "../db/connection";
import { sendPushToPlayer } from "../services/push";
import {
  incrementStat,
  logActivity,
  checkPersonalBest,
  checkMilestones,
} from "../engine/profile-stats";
import { syncPlayer } from "../ws/sync";
import { handleSectorChange, notifyPlayer } from "../ws/handlers";
import { isStoryNPC, cleanupDestroyedNPC } from "../engine/story-npcs";

const router = Router();

// Fire volley at target (2 AP) — the core combat action. Builds full combat state
// from ship stats + upgrades + level bonuses + tablet bonuses + race modifiers,
// then delegates to the pure resolveCombatVolley() engine function. On kill:
// spawns a dodge pod for the defender (they lose their ship but not their account),
// claims any active bounties on the target, awards destroy XP, triggers faction
// infamy in NPC-controlled sectors, and sends a push notification. Story NPCs
// get special handling — no dodge pod, no combat log, cleanup after destruction.
router.post("/fire", requireAuth, async (req, res) => {
  try {
    const { targetPlayerId, energyToExpend } = req.body;
    if (!targetPlayerId || !energyToExpend || energyToExpend < 1) {
      return res.status(400).json({ error: "Missing or invalid fields" });
    }

    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    if (!canAffordAction(player.energy, "combat_volley")) {
      return res.status(400).json({
        error: "Not enough energy",
        cost: getActionCost("combat_volley"),
      });
    }

    // Check sector type allows combat
    const sector = await db("sectors")
      .where({ id: player.current_sector_id })
      .first();
    if (sector?.type === "protected" || sector?.type === "harmony_enforced") {
      return res
        .status(400)
        .json({ error: "Combat not allowed in this sector" });
    }

    const target = await db("players").where({ id: targetPlayerId }).first();
    if (!target || target.current_sector_id !== player.current_sector_id) {
      return res.status(400).json({ error: "Target not in your sector" });
    }

    const attackerShip = await db("ships")
      .where({ id: player.current_ship_id })
      .first();
    const defenderShip = await db("ships")
      .where({ id: target.current_ship_id })
      .first();
    if (!attackerShip || !defenderShip) {
      return res.status(400).json({ error: "Both players must have ships" });
    }

    const attackerType = SHIP_TYPES.find(
      (s) => s.id === attackerShip.ship_type_id,
    );
    const defenderType = SHIP_TYPES.find(
      (s) => s.id === defenderShip.ship_type_id,
    );
    if (!attackerType || !defenderType) {
      return res.status(500).json({ error: "Invalid ship type" });
    }

    const attackerRace = player.race ? getRace(player.race as RaceId) : null;
    const defenderRace = target.race ? getRace(target.race as RaceId) : null;

    // Load ship upgrades and level bonuses
    let attackerUpgrades = {
      weaponBonus: 0,
      engineBonus: 0,
      cargoBonus: 0,
      shieldBonus: 0,
    };
    let defenderUpgrades = {
      weaponBonus: 0,
      engineBonus: 0,
      cargoBonus: 0,
      shieldBonus: 0,
    };
    try {
      attackerUpgrades = await applyUpgradesToShip(attackerShip.id);
      defenderUpgrades = await applyUpgradesToShip(defenderShip.id);
    } catch {
      /* upgrades table may not exist yet */
    }

    const attackerLevelBonuses = await getPlayerLevelBonuses(player.id);
    const defenderLevelBonuses = await getPlayerLevelBonuses(target.id);

    const emptyTablets: TabletBonuses = {
      weaponBonus: 0,
      engineBonus: 0,
      cargoBonus: 0,
      shieldBonus: 0,
      fleeBonus: 0,
      xpMultiplier: 0,
    };
    let attackerTablets = emptyTablets;
    let defenderTablets = emptyTablets;
    try {
      attackerTablets = await applyTabletBonuses(player.id);
      defenderTablets = await applyTabletBonuses(target.id);
    } catch {
      /* tablets table may not exist yet */
    }

    const attackerState: CombatState = {
      weaponEnergy:
        attackerShip.weapon_energy +
        attackerUpgrades.weaponBonus +
        attackerLevelBonuses.weaponBonus +
        attackerTablets.weaponBonus,
      engineEnergy:
        attackerShip.engine_energy +
        attackerUpgrades.engineBonus +
        attackerLevelBonuses.engineBonus +
        attackerTablets.engineBonus,
      hullHp: attackerShip.hull_hp + attackerTablets.shieldBonus,
      attackRatio:
        attackerType.attackRatio * (1 + (attackerRace?.attackRatioBonus ?? 0)),
      defenseRatio:
        attackerType.defenseRatio *
        (1 + (attackerRace?.defenseRatioBonus ?? 0)),
    };
    const defenderState: CombatState = {
      weaponEnergy:
        defenderShip.weapon_energy +
        defenderUpgrades.weaponBonus +
        defenderLevelBonuses.weaponBonus +
        defenderTablets.weaponBonus,
      engineEnergy:
        defenderShip.engine_energy +
        defenderUpgrades.engineBonus +
        defenderLevelBonuses.engineBonus +
        defenderTablets.engineBonus,
      hullHp: defenderShip.hull_hp + defenderTablets.shieldBonus,
      attackRatio:
        defenderType.attackRatio * (1 + (defenderRace?.attackRatioBonus ?? 0)),
      defenseRatio:
        defenderType.defenseRatio *
        (1 + (defenderRace?.defenseRatioBonus ?? 0)),
    };

    const result = resolveCombatVolley(
      attackerState,
      defenderState,
      energyToExpend,
    );
    const newEnergy = deductEnergy(player.energy, "combat_volley");

    // Update attacker ship weapon energy
    await db("ships")
      .where({ id: attackerShip.id })
      .update({
        weapon_energy: attackerShip.weapon_energy - result.attackerEnergySpent,
      });

    // Update defender ship hull HP (weapon/engine energy unchanged by incoming damage)
    await db("ships").where({ id: defenderShip.id }).update({
      hull_hp: result.defenderHullHpRemaining,
    });

    // Update player energy
    await db("players").where({ id: player.id }).update({ energy: newEnergy });

    // Award combat XP for volley
    let xpResult = await awardXP(
      player.id,
      GAME_CONFIG.XP_COMBAT_VOLLEY,
      "combat",
    );

    // Check if target is a story NPC (needed early to skip stats/logs)
    const targetIsStoryNPC = await isStoryNPC(target.id);

    // Profile stats: damage (skip target stats for story NPCs)
    incrementStat(player.id, "damage_dealt", result.damageDealt);
    if (!targetIsStoryNPC) {
      incrementStat(target.id, "damage_taken", result.damageDealt);
    }
    incrementStat(player.id, "energy_spent", getActionCost("combat_volley"));
    checkPersonalBest(
      player.id,
      "highest_damage_single",
      result.damageDealt,
      `Hit ${target.username} for ${result.damageDealt} damage`,
    );

    let bountiesClaimed: { bountyId: string; reward: number }[] = [];

    if (result.defenderDestroyed) {
      if (!targetIsStoryNPC) {
        // Spawn dodge pod for defender
        const crypto = require("crypto");
        const podId = crypto.randomUUID();
        await db("ships").insert({
          id: podId,
          ship_type_id: "dodge_pod",
          owner_id: target.id,
          sector_id: target.current_sector_id,
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
          .where({ id: target.id })
          .update({ current_ship_id: podId });

        // Log combat
        await db("combat_logs").insert({
          id: crypto.randomUUID(),
          attacker_id: player.id,
          defender_id: target.id,
          sector_id: player.current_sector_id,
          energy_expended: result.attackerEnergySpent,
          damage_dealt: result.damageDealt,
          outcome: "ship_destroyed",
        });
      }

      // Story NPC cleanup — delete after all references are done
      if (targetIsStoryNPC) {
        await cleanupDestroyedNPC(target.id);
      }

      // Check and claim bounties on the destroyed player (skip for NPCs)
      const activeBounties = targetIsStoryNPC
        ? []
        : await db("bounties").where({
            target_player_id: target.id,
            active: true,
          });

      if (activeBounties.length > 0) {
        let totalBountyReward = 0;
        for (const bounty of activeBounties) {
          totalBountyReward += Number(bounty.reward);
          bountiesClaimed.push({
            bountyId: bounty.id,
            reward: Number(bounty.reward),
          });
          await db("bounties").where({ id: bounty.id }).update({
            active: false,
            claimed_by_id: player.id,
            claimed_at: new Date(),
          });
        }
        // Award bounty rewards to attacker
        await db("players")
          .where({ id: player.id })
          .increment("credits", totalBountyReward);

        // Profile stats: bounty claims
        incrementStat(player.id, "bounties_claimed", activeBounties.length);
        incrementStat(player.id, "credits_from_bounties", totalBountyReward);
        logActivity(
          player.id,
          "bounty_claimed",
          `Claimed ${activeBounties.length} bounty(ies) on ${target.username} for ${totalBountyReward} credits`,
        );
      }
    }

    // Mission progress: combat + destroy XP
    if (result.defenderDestroyed) {
      xpResult = await awardXP(
        player.id,
        GAME_CONFIG.XP_COMBAT_DESTROY,
        "combat",
      );
      const unlocked = await checkAchievements(player.id, "combat_destroy", {});
      const io = req.app.get("io");
      if (io) {
        for (const a of unlocked) {
          notifyPlayer(io, player.id, "achievement:unlocked", {
            name: a.name,
            description: a.description,
            xpReward: a.xpReward,
            creditReward: a.creditReward,
          });
        }
      }
      checkAndUpdateMissions(player.id, "combat_destroy", {}, io);
      updateDailyMissionProgress(player.id, "win_combat").catch(() => {});

      // Profile stats: kill/death (skip NPC-side stats — NPC is already deleted)
      incrementStat(player.id, "combat_kills", 1);
      if (!targetIsStoryNPC) {
        incrementStat(target.id, "combat_deaths", 1);
        incrementStat(target.id, "dodge_pod_uses", 1);
        logActivity(
          target.id,
          "combat_death",
          `Ship destroyed by ${player.username} in sector ${player.current_sector_id}`,
          { attackerId: player.id, sectorId: player.current_sector_id },
        );
      }
      logActivity(
        player.id,
        "combat_kill",
        `Destroyed ${target.username}'s ship in sector ${player.current_sector_id}`,
        { targetId: target.id, sectorId: player.current_sector_id },
      );
      checkMilestones(player.id);

      // Faction infamy for killing in a sector with NPC factions
      try {
        await onCombatKill(player.id, player.current_sector_id);
      } catch {
        /* non-critical */
      }
    }

    // Push notification to defender
    if (result.defenderDestroyed) {
      sendPushToPlayer(target.id, {
        title: "Ship Destroyed!",
        body: `${player.username} destroyed your ship in sector ${player.current_sector_id}`,
        type: "combat",
      });
    } else {
      sendPushToPlayer(target.id, {
        title: "Under Attack!",
        body: `${player.username} hit you for ${result.damageDealt} damage in sector ${player.current_sector_id}`,
        type: "combat",
      });
    }

    const shipAiRace = (player.race as RaceId) || "generic";
    const hitMsg = pickFlavor("combat_hit", shipAiRace, {
      damage: result.damageDealt,
    });
    const killMsg = result.defenderDestroyed
      ? pickFlavor("combat_kill", shipAiRace, { target: target.username })
      : undefined;

    res.json({
      damageDealt: result.damageDealt,
      attackerEnergySpent: result.attackerEnergySpent,
      defenderDestroyed: result.defenderDestroyed,
      defenderHullHpRemaining: result.defenderHullHpRemaining,
      energy: newEnergy,
      bountiesClaimed,
      xp: {
        awarded: xpResult.xpAwarded,
        total: xpResult.totalXp,
        level: xpResult.level,
        rank: xpResult.rank,
        levelUp: xpResult.levelUp,
      },
      message: hitMsg,
      killMessage: killMsg,
    });
  } catch (err) {
    console.error("Combat fire error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Attempt to flee — probability-based escape from combat. Flee chance increases
// with more attackers in the sector (design: more chaos = easier to slip away).
// On success, player is moved to a random adjacent sector. Tablet flee bonuses
// stack additively with the base chance, capped at 90% (always some risk).
router.post("/flee", requireAuth, async (req, res) => {
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    // Count attackers in sector (players with weapon energy > 0, excluding self)
    const attackersInSector = await db("players")
      .where({ current_sector_id: player.current_sector_id })
      .whereNot({ id: player.id })
      .count("id as count")
      .first();

    const numAttackers = Math.max(1, Number(attackersInSector?.count || 1));
    const rng = Math.random();
    const fleeResult = attemptFlee(numAttackers, rng);

    // Apply tablet flee bonus
    try {
      const playerTablets = await applyTabletBonuses(player.id);
      if (playerTablets.fleeBonus > 0) {
        fleeResult.fleeChance = Math.min(
          0.9,
          fleeResult.fleeChance + playerTablets.fleeBonus,
        );
        fleeResult.success = rng < fleeResult.fleeChance;
      }
    } catch {
      /* tablets table may not exist yet */
    }

    if (fleeResult.success) {
      // Move to random adjacent sector
      const edges = await db("sector_edges").where({
        from_sector_id: player.current_sector_id,
      });
      if (edges.length > 0) {
        const randomEdge = edges[Math.floor(Math.random() * edges.length)];
        await db("players").where({ id: player.id }).update({
          current_sector_id: randomEdge.to_sector_id,
          docked_at_outpost_id: null,
          landed_at_planet_id: null,
        });
        if (player.current_ship_id) {
          await db("ships").where({ id: player.current_ship_id }).update({
            sector_id: randomEdge.to_sector_id,
          });
        }

        // Multi-session sync: sector change + full refresh
        const io = req.app.get("io");
        if (io) {
          const excludeSocket = req.headers["x-socket-id"] as
            | string
            | undefined;
          handleSectorChange(
            io,
            player.id,
            player.current_sector_id,
            randomEdge.to_sector_id,
            player.username,
          );
          syncPlayer(io, player.id, "sync:full", excludeSocket);
        }
      }
    }

    const fleeRace = (player.race as RaceId) || "generic";
    res.json({
      success: fleeResult.success,
      fleeChance: fleeResult.fleeChance,
      message: pickFlavor(
        fleeResult.success ? "combat_flee_ok" : "combat_flee_fail",
        fleeRace,
      ),
    });
  } catch (err) {
    console.error("Flee error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
