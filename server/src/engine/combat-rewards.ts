/**
 * Combat Rewards — shared between old combat (api/combat.ts) and new combat-v2.
 * Handles: dodge pod spawn, bounty claims, cargo loot, combat log, XP,
 * settlement, notifications, mission progress, achievements, profile stats.
 */

import crypto from "crypto";
import db from "../db/connection";
import { GAME_CONFIG } from "../config/game";
import { awardXP, type XpAwardResult } from "./progression";
import { checkAchievements } from "./achievements";
import { checkAndUpdateMissions } from "../services/mission-tracker";
import { checkRandomEvents } from "./random-events";
import { updateDailyMissionProgress } from "../api/daily-missions";
import { applyUpgradesToShip } from "./upgrades";
import { onCombatKill } from "./npcs";
import { isStoryNPC, cleanupDestroyedNPC } from "./story-npcs";
import { sendPushToPlayer } from "../services/push";
import {
  incrementStat,
  logActivity,
  checkPersonalBest,
  checkMilestones,
} from "./profile-stats";
import { notifyPlayer } from "../ws/handlers";
import { enqueue, settleTransferBetweenPlayers } from "../chain/tx-queue";
import { isSettlementEnabled } from "../chain/config";
import type { Address } from "viem";
import type { Server as IOServer } from "socket.io";

export interface ShipDestructionResult {
  bountiesClaimed: { bountyId: string; reward: number }[];
  cargoLooted: { resource: string; amount: number }[];
  xpResult: XpAwardResult;
}

/**
 * Handle ship destruction aftermath — everything that happens when a ship is
 * destroyed in combat. Shared between v1 (fire route) and v2 (session resolution).
 *
 * @param attackerId - The player who destroyed the ship
 * @param defenderId - The player whose ship was destroyed
 * @param attackerShipId - Attacker's ship ID (for cargo looting)
 * @param defenderShipId - Defender's ship ID (being destroyed)
 * @param sectorId - Sector where combat occurred
 * @param io - Socket.IO server instance (can be null)
 */
export async function handleShipDestruction(
  attackerId: string,
  defenderId: string,
  attackerShipId: string,
  defenderShipId: string,
  sectorId: number,
  io: IOServer | null,
): Promise<ShipDestructionResult> {
  const attacker = await db("players").where({ id: attackerId }).first();
  const defender = await db("players").where({ id: defenderId }).first();
  if (!attacker || !defender) {
    return {
      bountiesClaimed: [],
      cargoLooted: [],
      xpResult: {
        xpAwarded: 0,
        totalXp: 0,
        level: 1,
        rank: "Ensign",
        levelUp: null,
      },
    };
  }

  const defenderShip = await db("ships").where({ id: defenderShipId }).first();
  const targetIsStoryNPC = await isStoryNPC(defenderId);
  const targetIsRealPlayer = !targetIsStoryNPC;

  if (targetIsStoryNPC) {
    // ─── NPC destruction: full cleanup ───
    await cleanupDestroyedNPC(defenderId);
  } else if (targetIsRealPlayer) {
    // ─── PvP: ship disabled, not destroyed ───
    // Ship goes to nearest starmall for repair (keeps upgrades, weapons, subsystems)
    // Player gets a temporary dodge pod and is teleported to that starmall

    // Find nearest starmall sector
    const nearestStarmall = await db("sectors")
      .where({ has_star_mall: true })
      .select("id")
      .orderByRaw("ABS(id - ?) ASC", [sectorId])
      .first();

    const repairSectorId = nearestStarmall?.id ?? sectorId;

    // Disable ship: hull 0, mark for repair, move to starmall garage
    await db("ships").where({ id: defenderShipId }).update({
      hull_hp: 0,
      sector_id: null,
      stored_at_star_mall_sector: repairSectorId,
    });

    // Reset subsystems to disabled
    try {
      await db("ship_subsystems")
        .where({ ship_id: defenderShipId })
        .update({ current_hp: 0, is_disabled: true });
    } catch {
      /* table may not exist */
    }

    // Give player a temporary dodge pod
    const podId = crypto.randomUUID();
    await db("ships").insert({
      id: podId,
      ship_type_id: "dodge_pod",
      owner_id: defenderId,
      sector_id: repairSectorId,
      weapon_energy: 0,
      max_weapon_energy: 0,
      engine_energy: 20,
      max_engine_energy: 20,
      cargo_holds: 0,
      max_cargo_holds: 0,
      hull_hp: 10,
      max_hull_hp: 10,
    });

    try {
      const { setupShipCombatData } = require("./ship-setup");
      await setupShipCombatData(podId, "dodge_pod");
    } catch {
      /* migration may not have run yet */
    }

    // Move player to starmall sector with dodge pod
    await db("players").where({ id: defenderId }).update({
      current_sector_id: repairSectorId,
      current_ship_id: podId,
      docked_at_outpost_id: null,
      landed_at_planet_id: null,
    });

    // Log combat
    await db("combat_logs").insert({
      id: crypto.randomUUID(),
      attacker_id: attackerId,
      defender_id: defenderId,
      sector_id: sectorId,
      energy_expended: 0,
      damage_dealt: 0,
      outcome: "ship_disabled",
    });
  }

  // Bounty claims (skip for NPCs)
  let bountiesClaimed: { bountyId: string; reward: number }[] = [];
  const activeBounties = targetIsStoryNPC
    ? []
    : await db("bounties").where({
        target_player_id: defenderId,
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
        claimed_by_id: attackerId,
        claimed_at: new Date(),
      });
    }
    await db("players")
      .where({ id: attackerId })
      .increment("credits", totalBountyReward);

    incrementStat(attackerId, "bounties_claimed", activeBounties.length);
    incrementStat(attackerId, "credits_from_bounties", totalBountyReward);
    logActivity(
      attackerId,
      "bounty_claimed",
      `Claimed ${activeBounties.length} bounty(ies) on ${defender.username} for ${totalBountyReward} credits`,
    );
  }

  // Cargo loot: 50% for PvP, 100% for NPC kills
  let cargoLooted: { resource: string; amount: number }[] = [];
  const lootFraction = targetIsRealPlayer ? 0.5 : 1.0;

  if (!targetIsStoryNPC && defenderShip) {
    const attackerUpgradesForCargo = await applyUpgradesToShip(attackerShipId);
    const freshAttackerShip = await db("ships")
      .where({ id: attackerShipId })
      .first();
    if (freshAttackerShip) {
      const maxCargo =
        freshAttackerShip.max_cargo_holds + attackerUpgradesForCargo.cargoBonus;
      const currentCargo =
        (freshAttackerShip.cyrillium_cargo || 0) +
        (freshAttackerShip.food_cargo || 0) +
        (freshAttackerShip.tech_cargo || 0) +
        (freshAttackerShip.colonist_cargo || 0);
      let freeSpace = maxCargo - currentCargo;

      const lootResources = [
        { cargo: "cyrillium_cargo", resource: "cyrillium" },
        { cargo: "food_cargo", resource: "food" },
        { cargo: "tech_cargo", resource: "tech" },
      ];

      for (const lr of lootResources) {
        const available = defenderShip[lr.cargo] || 0;
        if (available > 0 && freeSpace > 0) {
          const toLoot = Math.min(
            Math.floor(available * lootFraction),
            freeSpace,
          );
          if (toLoot > 0) {
            await db("ships")
              .where({ id: attackerShipId })
              .increment(lr.cargo, toLoot);
            // Deduct from loser's ship
            await db("ships")
              .where({ id: defenderShipId })
              .decrement(lr.cargo, toLoot);
            freeSpace -= toLoot;
            cargoLooted.push({ resource: lr.resource, amount: toLoot });
          }
        }
      }

      if (cargoLooted.length > 0) {
        const lootSummary = cargoLooted
          .map((l) => `${l.amount} ${l.resource}`)
          .join(", ");
        logActivity(
          attackerId,
          "combat_loot",
          `Salvaged ${lootSummary} from ${defender.username}'s wreckage`,
        );
        incrementStat(
          attackerId,
          "cargo_looted",
          cargoLooted.reduce((s, l) => s + l.amount, 0),
        );
      }
    }
  }

  // Chain settlement (only destroy NFT for NPC kills — PvP ships are disabled, not destroyed)
  if (isSettlementEnabled("combat")) {
    if (targetIsStoryNPC) {
      const destroyedShip = await db("ships")
        .where({ id: defenderShipId })
        .first();
      if (destroyedShip?.chain_token_id != null) {
        enqueue({
          type: "destroyShip",
          tokenId: BigInt(destroyedShip.chain_token_id),
        });
      }
    }
    if (bountiesClaimed.length > 0 && attacker.member_contract_address) {
      const totalReward = bountiesClaimed.reduce((sum, b) => sum + b.reward, 0);
      enqueue({
        type: "creditMember",
        memberAddress: attacker.member_contract_address as Address,
        resource: "credits",
        amount: BigInt(totalReward) * 10n ** 18n,
      });
    }
    for (const loot of cargoLooted) {
      await settleTransferBetweenPlayers(
        defenderId,
        attackerId,
        loot.resource,
        loot.amount,
        "combat",
      );
    }
  }

  // XP + achievements
  const xpResult = await awardXP(
    attackerId,
    GAME_CONFIG.XP_COMBAT_DESTROY,
    "combat",
  );
  let unlocked: any[] = [];
  try {
    unlocked = await checkAchievements(attackerId, "combat_destroy", {});
  } catch {
    /* achievement tables may not exist */
  }
  if (io) {
    for (const a of unlocked) {
      notifyPlayer(io, attackerId, "achievement:unlocked", {
        name: a.name,
        description: a.description,
        xpReward: a.xpReward,
        creditReward: a.creditReward,
      });
    }
  }

  // Mission progress + events
  await checkAndUpdateMissions(
    attackerId,
    "combat_destroy",
    { targetId: defenderId },
    io ?? undefined,
  );
  checkRandomEvents(attackerId, "combat_destroy", {}, io ?? undefined);
  updateDailyMissionProgress(attackerId, "win_combat").catch(() => {});

  // Profile stats
  incrementStat(attackerId, "combat_kills", 1);
  if (targetIsRealPlayer) {
    incrementStat(defenderId, "combat_deaths", 1);
    logActivity(
      defenderId,
      "combat_defeat",
      `Ship disabled by ${attacker.username} in sector ${sectorId}. Towed to nearest starmall for repairs.`,
      { attackerId, sectorId },
    );
  }
  logActivity(
    attackerId,
    "combat_kill",
    `Destroyed ${defender.username}'s ship in sector ${sectorId}`,
    { targetId: defenderId, sectorId },
  );
  checkMilestones(attackerId);

  // Faction infamy
  try {
    await onCombatKill(attackerId, sectorId);
  } catch {
    /* non-critical */
  }

  // Push notification
  if (targetIsRealPlayer) {
    sendPushToPlayer(defenderId, {
      title: "Ship Disabled!",
      body: `${attacker.username} disabled your ship in sector ${sectorId}. Your ship has been towed to the nearest starmall for repairs.`,
      type: "combat",
    });
  } else {
    sendPushToPlayer(defenderId, {
      title: "Ship Destroyed!",
      body: `${attacker.username} destroyed your ship in sector ${sectorId}`,
      type: "combat",
    });
  }

  return { bountiesClaimed, cargoLooted, xpResult };
}
