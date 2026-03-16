import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { STORE_ITEMS, getStoreItem } from "../config/store-items";
import { SHIP_TYPES } from "../config/ship-types";
import { GAME_CONFIG } from "../config/game";
import { calculateRacheDamage } from "../engine/deployables";
import db from "../db/connection";
import { syncPlayer } from "../ws/sync";
import { handleSectorChange, notifyPlayer } from "../ws/handlers";
import { sendPushToPlayer } from "../services/push";
import {
  enqueue,
  settleDebitPlayer,
  settleUpdateShip,
} from "../chain/tx-queue";
import { isSettlementEnabled } from "../chain/config";
import type { Address } from "viem";
import { pickFlavor, outpostNpcRace } from "../config/flavor-text";
import type { RaceId } from "../config/races";
import { checkAndUpdateMissions } from "../services/mission-tracker";

const router = Router();

// List all store items
router.get("/catalog", requireAuth, async (req, res) => {
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const sector = await db("sectors")
      .where({ id: player.current_sector_id })
      .first();
    if (!sector?.has_star_mall) {
      return res
        .status(400)
        .json({ error: "Must be at a star mall to browse the store" });
    }

    // Show all items with availability flags based on player's current ship
    const ship = await db("ships")
      .where({ id: player.current_ship_id })
      .first();
    const shipType = ship
      ? SHIP_TYPES.find((s) => s.id === ship.ship_type_id)
      : null;

    const items = STORE_ITEMS.filter((item) => {
      // Hide items the player's ship can't use
      if (item.requiresCapability && shipType) {
        const capMap: Record<string, boolean> = {
          canCarryMines: shipType.canCarryMines,
          canCarryPgd: shipType.canCarryPgd,
          hasJumpDriveSlot: shipType.hasJumpDriveSlot,
        };
        if (!capMap[item.requiresCapability]) return false;
      }
      // Hide equipment already installed
      if (item.id === "jump_drive" && ship?.has_jump_drive) return false;
      if (item.id === "planetary_scanner" && ship?.has_planetary_scanner)
        return false;
      return true;
    }).map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      canUse: true,
      reason: "",
    }));

    res.json({ items, credits: Number(player.credits) });
  } catch (err) {
    console.error("Store catalog error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Purchase a store item (consumable or equipment)
router.post("/buy/:itemId", requireAuth, async (req, res) => {
  try {
    const item = getStoreItem(req.params.itemId as string);
    if (!item) return res.status(404).json({ error: "Unknown item" });

    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const sector = await db("sectors")
      .where({ id: player.current_sector_id })
      .first();
    if (!sector?.has_star_mall) {
      return res
        .status(400)
        .json({ error: "Must be at a star mall to buy items" });
    }

    if (Number(player.credits) < item.price) {
      return res.status(400).json({ error: "Not enough credits" });
    }

    const ship = await db("ships")
      .where({ id: player.current_ship_id })
      .first();
    if (!ship) return res.status(400).json({ error: "No active ship" });

    // Check capability requirement
    if (item.requiresCapability) {
      const shipType = SHIP_TYPES.find((s) => s.id === ship.ship_type_id);
      const capMap: Record<string, boolean> = {
        canCarryMines: shipType?.canCarryMines ?? false,
        canCarryPgd: shipType?.canCarryPgd ?? false,
        hasJumpDriveSlot: shipType?.hasJumpDriveSlot ?? false,
      };
      if (!capMap[item.requiresCapability]) {
        return res
          .status(400)
          .json({ error: `Ship lacks capability: ${item.requiresCapability}` });
      }
    }

    // Handle equipment installation
    if (item.category === "equipment") {
      if (item.id === "jump_drive") {
        if (ship.has_jump_drive) {
          return res
            .status(400)
            .json({ error: "Ship already has a jump drive" });
        }
        await db("ships")
          .where({ id: ship.id })
          .update({ has_jump_drive: true });
        await settleUpdateShip(ship.id);
      }
      if (item.id === "planetary_scanner") {
        if (ship.has_planetary_scanner) {
          return res
            .status(400)
            .json({ error: "Ship already has a planetary scanner" });
        }
        await db("ships")
          .where({ id: ship.id })
          .update({ has_planetary_scanner: true });
        await settleUpdateShip(ship.id);
      }
    }

    // Handle consumable items - use immediately or add to inventory
    if (item.category === "consumable") {
      if (item.id === "fuel_cell") {
        const newEnergy = Math.min(player.energy + 50, player.max_energy);
        await db("players")
          .where({ id: player.id })
          .update({
            credits: Number(player.credits) - item.price,
            energy: newEnergy,
          });
        await settleDebitPlayer(player.id, item.price, "store");
        // Multi-session sync
        const io = req.app.get("io");
        if (io)
          syncPlayer(
            io,
            player.id,
            "sync:status",
            req.headers["x-socket-id"] as string | undefined,
          );
        return res.json({
          item: item.id,
          used: true,
          newCredits: Number(player.credits) - item.price,
          newEnergy,
        });
      }
    }

    // Store consumables and deployables in inventory for later use
    if (item.category === "consumable" || item.category === "deployable") {
      const crypto = require("crypto");
      await db("game_events").insert({
        id: crypto.randomUUID(),
        player_id: player.id,
        event_type: `item:${item.id}`,
        data: JSON.stringify({ itemId: item.id, purchasedAt: new Date() }),
        read: false,
      });
    }

    await db("players")
      .where({ id: player.id })
      .update({
        credits: Number(player.credits) - item.price,
      });

    // Chain settlement: debit credits for purchase
    if (isSettlementEnabled("store") && player.member_contract_address) {
      enqueue({
        type: "debitMember",
        memberAddress: player.member_contract_address as Address,
        resource: "credits",
        amount: BigInt(item.price) * 10n ** 18n,
      });
    }

    // Multi-session sync
    const io = req.app.get("io");
    if (io)
      syncPlayer(
        io,
        player.id,
        "sync:status",
        req.headers["x-socket-id"] as string | undefined,
      );

    // Mission tracking: buy_item
    checkAndUpdateMissions(
      player.id,
      "buy_item",
      { itemId: item.id, category: item.category },
      io,
    );

    res.json({
      item: item.id,
      name: item.name,
      category: item.category,
      newCredits: Number(player.credits) - item.price,
      message: pickFlavor("store_buy", outpostNpcRace(sector!.id.toString()), {
        item: item.name,
        price: item.price,
      }),
    });
  } catch (err) {
    console.error("Store buy error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Use a consumable item from inventory
router.post("/use/:itemId", requireAuth, async (req, res) => {
  try {
    const item = getStoreItem(req.params.itemId as string);
    if (!item || item.category !== "consumable") {
      return res.status(400).json({ error: "Invalid consumable item" });
    }

    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    // Find unused item in player's inventory
    const inventoryItem = await db("game_events")
      .where({
        player_id: player.id,
        event_type: `item:${item.id}`,
        read: false,
      })
      .first();

    if (!inventoryItem) {
      return res.status(400).json({ error: "You do not have this item" });
    }

    // Mark as used
    await db("game_events")
      .where({ id: inventoryItem.id })
      .update({ read: true });

    let effect: Record<string, any> = { item: item.id, used: true };

    if (item.id === "probe") {
      const { sectorId } = req.body;
      if (!sectorId)
        return res.status(400).json({ error: "Sector ID required for probe" });

      const sectorContents = await db("sectors")
        .where({ id: sectorId })
        .first();
      if (!sectorContents)
        return res.status(400).json({ error: "Invalid sector" });

      const players = await db("players")
        .where({ current_sector_id: sectorId })
        .select("username");
      const outposts = await db("outposts")
        .where({ sector_id: sectorId })
        .select("name");
      const planets = await db("planets")
        .where({ sector_id: sectorId })
        .select("name", "planet_class");

      effect = {
        ...effect,
        sectorId,
        sectorType: sectorContents.type,
        players: players.map((p) => p.username),
        outposts: outposts.map((o) => o.name),
        planets: planets.map((p) => ({ name: p.name, class: p.planet_class })),
      };
    }

    if (item.id === "fuel_cell") {
      const newEnergy = Math.min(player.energy + 50, player.max_energy);
      await db("players")
        .where({ id: player.id })
        .update({ energy: newEnergy });
      effect.newEnergy = newEnergy;
    }

    if (item.id === "disruptor_torpedo") {
      const { targetPlayerId } = req.body;
      if (!targetPlayerId) {
        // Un-consume — restore the item
        await db("game_events")
          .where({ id: inventoryItem.id })
          .update({ read: false });
        return res
          .status(400)
          .json({ error: "Target player required for torpedo" });
      }

      const target = await db("players").where({ id: targetPlayerId }).first();
      if (!target || target.current_sector_id !== player.current_sector_id) {
        await db("game_events")
          .where({ id: inventoryItem.id })
          .update({ read: false });
        return res.status(400).json({ error: "Target not in your sector" });
      }

      const targetShip = await db("ships")
        .where({ id: target.current_ship_id })
        .first();
      if (!targetShip) {
        await db("game_events")
          .where({ id: inventoryItem.id })
          .update({ read: false });
        return res.status(400).json({ error: "Target has no ship" });
      }

      // Check sector allows combat
      const sector = await db("sectors")
        .where({ id: player.current_sector_id })
        .first();
      if (sector?.type === "protected" || sector?.type === "harmony_enforced") {
        await db("game_events")
          .where({ id: inventoryItem.id })
          .update({ read: false });
        return res
          .status(400)
          .json({ error: "Cannot use weapons in this sector" });
      }

      const disabledUntil = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      await db("ships")
        .where({ id: targetShip.id })
        .update({ engines_disabled_until: disabledUntil });

      // Notify the target
      const io = req.app.get("io");
      if (io) {
        notifyPlayer(io, target.id, "notification", {
          type: "warning",
          message: `${player.username} hit you with a Disruptor Torpedo! Engines disabled for 5 minutes.`,
        });
        syncPlayer(io, target.id, "sync:status");
      }

      sendPushToPlayer(target.id, {
        title: "Engines Disabled!",
        body: `${player.username} hit you with a Disruptor Torpedo! Engines disabled for 5 minutes.`,
        type: "combat",
      });

      const torpedoRace = (player.race as RaceId) || "generic";
      effect = {
        ...effect,
        targetPlayer: target.username,
        disabledUntil,
        message: pickFlavor("combat_hit", torpedoRace, { damage: 0 }),
      };
    }

    if (item.id === "cloaking_cell") {
      const ship = await db("ships")
        .where({ id: player.current_ship_id })
        .first();
      if (!ship) {
        await db("game_events")
          .where({ id: inventoryItem.id })
          .update({ read: false });
        return res.status(400).json({ error: "No active ship" });
      }
      if (ship.is_cloaked) {
        await db("game_events")
          .where({ id: inventoryItem.id })
          .update({ read: false });
        return res.status(400).json({ error: "Ship is already cloaked" });
      }

      await db("ships").where({ id: ship.id }).update({ is_cloaked: true });

      const cloakRace = (player.race as RaceId) || "generic";
      effect = {
        ...effect,
        cloaked: true,
        message: pickFlavor("cloak_on", cloakRace),
      };
    }

    if (item.id === "rache_device") {
      const ship = await db("ships")
        .where({ id: player.current_ship_id })
        .first();
      if (!ship) {
        await db("game_events")
          .where({ id: inventoryItem.id })
          .update({ read: false });
        return res.status(400).json({ error: "No active ship" });
      }

      // Check sector allows combat
      const sector = await db("sectors")
        .where({ id: player.current_sector_id })
        .first();
      if (sector?.type === "protected" || sector?.type === "harmony_enforced") {
        await db("game_events")
          .where({ id: inventoryItem.id })
          .update({ read: false });
        return res
          .status(400)
          .json({ error: "Cannot detonate in this sector" });
      }

      const damage = calculateRacheDamage(ship.weapon_energy);

      // Deal damage to ALL other ships in sector
      const shipsInSector = await db("ships")
        .where({ sector_id: player.current_sector_id, is_destroyed: false })
        .whereNot({ id: ship.id });

      const shipsHit: {
        player: string;
        damage: number;
        destroyed: boolean;
      }[] = [];
      const io = req.app.get("io");

      for (const s of shipsInSector) {
        const newHp = Math.max(0, (s.hull_hp || 0) - damage);
        const destroyed = newHp <= 0;
        await db("ships")
          .where({ id: s.id })
          .update({ hull_hp: newHp, is_destroyed: destroyed || undefined });

        const owner = await db("players")
          .where({ current_ship_id: s.id })
          .first();
        if (owner) {
          shipsHit.push({
            player: owner.username,
            damage,
            destroyed,
          });

          if (destroyed) {
            // Spawn dodge pod for destroyed player
            const crypto = require("crypto");
            const podId = crypto.randomUUID();
            await db("ships").insert({
              id: podId,
              ship_type_id: "dodge_pod",
              owner_id: owner.id,
              sector_id: owner.current_sector_id,
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
              .where({ id: owner.id })
              .update({ current_ship_id: podId });
          }

          // Notify each affected player
          if (io) {
            notifyPlayer(io, owner.id, "notification", {
              type: "combat",
              message: destroyed
                ? `${player.username} detonated a Rache Device! Your ship was destroyed!`
                : `${player.username} detonated a Rache Device! ${damage} damage to your ship!`,
            });
            syncPlayer(io, owner.id, "sync:status");
          }

          sendPushToPlayer(owner.id, {
            title: "Rache Device Detonated!",
            body: destroyed
              ? `${player.username} detonated a Rache Device and destroyed your ship!`
              : `${player.username} detonated a Rache Device! ${damage} damage!`,
            type: "combat",
          });
        }
      }

      // Destroy the player's own ship (self-destruct)
      await db("ships")
        .where({ id: ship.id })
        .update({ hull_hp: 0, is_destroyed: true });

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

      effect = {
        ...effect,
        damage,
        shipsHit,
        selfDestroyed: true,
        message: `Rache device detonated! ${damage} damage to ${shipsHit.length} ship(s). Your ship was destroyed.`,
      };
    }

    if (item.id === "scanner_probe") {
      const planets = await db("planets").where({
        sector_id: player.current_sector_id,
      });

      const detailedPlanets = [];
      for (const planet of planets) {
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

        let ownerName = null;
        if (planet.owner_id) {
          const owner = await db("players")
            .where({ id: planet.owner_id })
            .first();
          ownerName = owner?.username || null;
        }

        detailedPlanets.push({
          name: planet.name,
          class: planet.planet_class,
          population: planet.population || 0,
          owner: ownerName,
          resources: planetResources.map((r: any) => ({
            name: r.name,
            stock: r.stock,
          })),
        });
      }

      effect = {
        ...effect,
        planets: detailedPlanets,
        message:
          detailedPlanets.length > 0
            ? `Scanner probe reveals ${detailedPlanets.length} planet(s) in this sector.`
            : "Scanner probe found no planets in this sector.",
      };
    }

    // Multi-session sync
    const io = req.app.get("io");
    if (io)
      syncPlayer(
        io,
        player.id,
        "sync:status",
        req.headers["x-socket-id"] as string | undefined,
      );

    res.json(effect);
  } catch (err) {
    console.error("Use item error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// View player's inventory (consumables + deployables, with quantities)
router.get("/inventory", requireAuth, async (req, res) => {
  try {
    const items = await db("game_events")
      .where({ player_id: req.session.playerId, read: false })
      .andWhere("event_type", "like", "item:%")
      .select("event_type")
      .count("* as count")
      .groupBy("event_type");

    const inventory = items
      .map((row: any) => {
        const itemId = row.event_type.replace("item:", "");
        const storeItem = getStoreItem(itemId);
        if (!storeItem) return null; // Hide items without working handlers
        return {
          itemId,
          name: storeItem.name,
          category: storeItem.category,
          quantity: Number(row.count),
        };
      })
      .filter(Boolean);

    // Also include equipped equipment from current ship
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    const equipped: { name: string; itemId: string }[] = [];
    if (player?.current_ship_id) {
      const ship = await db("ships")
        .where({ id: player.current_ship_id })
        .first();
      if (ship?.has_jump_drive)
        equipped.push({ name: "Jump Drive", itemId: "jump_drive" });
    }

    res.json({ inventory, equipped });
  } catch (err) {
    console.error("Inventory error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Buy fuel (available at outposts that sell fuel)
router.post("/refuel", requireAuth, async (req, res) => {
  try {
    const { quantity } = req.body;
    const amount = Math.min(quantity || 50, 200);

    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    // Check if at an outpost or star mall that sells fuel
    const outpost = await db("outposts")
      .where({ sector_id: player.current_sector_id, sells_fuel: true })
      .first();
    const sector = await db("sectors")
      .where({ id: player.current_sector_id })
      .first();

    if (!outpost && !sector?.has_star_mall) {
      return res
        .status(400)
        .json({ error: "No fuel available at this location" });
    }

    const costPerUnit = 10; // credits per energy point
    const totalCost = amount * costPerUnit;

    if (Number(player.credits) < totalCost) {
      return res.status(400).json({ error: "Not enough credits" });
    }

    const newEnergy = Math.min(player.energy + amount, player.max_energy);
    const actualRefueled = newEnergy - player.energy;
    const actualCost = actualRefueled * costPerUnit;

    await db("players")
      .where({ id: player.id })
      .update({
        credits: Number(player.credits) - actualCost,
        energy: newEnergy,
      });
    await settleDebitPlayer(player.id, actualCost, "store");

    // Multi-session sync
    const io = req.app.get("io");
    if (io)
      syncPlayer(
        io,
        player.id,
        "sync:status",
        req.headers["x-socket-id"] as string | undefined,
      );

    const refuelRace = outpost
      ? outpostNpcRace(outpost.id)
      : outpostNpcRace(sector!.id.toString());
    res.json({
      refueled: actualRefueled,
      newEnergy,
      cost: actualCost,
      newCredits: Number(player.credits) - actualCost,
      message: pickFlavor("refuel", refuelRace, {
        amount: actualRefueled,
        cost: actualCost,
      }),
    });
  } catch (err) {
    console.error("Refuel error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
