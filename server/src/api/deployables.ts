import { Router } from "express";
import crypto from "crypto";
import { requireAuth } from "../middleware/auth";
import { canAffordAction, deductEnergy } from "../engine/energy";
import { SHIP_TYPES } from "../config/ship-types";
import { getStoreItem } from "../config/store-items";
import db from "../db/connection";
import { syncPlayer } from "../ws/sync";
import { settleDebitPlayer } from "../chain/tx-queue";
import { checkAndUpdateMissions } from "../services/mission-tracker";

const router = Router();

// Deploy a mine, drone, or buoy in current sector
router.post("/deploy", requireAuth, async (req, res) => {
  try {
    const { itemId, tollAmount, buoyMessage } = req.body;
    if (!itemId) return res.status(400).json({ error: "Item ID required" });

    const item = getStoreItem(itemId);
    if (!item || item.category !== "deployable") {
      return res.status(400).json({ error: "Invalid deployable item" });
    }

    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    if (!canAffordAction(player.energy, "deploy")) {
      return res.status(400).json({ error: "Not enough energy" });
    }

    // Check sector type
    const sector = await db("sectors")
      .where({ id: player.current_sector_id })
      .first();
    if (sector?.type === "protected") {
      return res
        .status(400)
        .json({ error: "Cannot deploy in protected sectors" });
    }

    // Check ship capability
    const ship = await db("ships")
      .where({ id: player.current_ship_id })
      .first();
    if (!ship) return res.status(400).json({ error: "No active ship" });

    if (item.requiresCapability) {
      const shipType = SHIP_TYPES.find((s) => s.id === ship.ship_type_id);
      if (!shipType)
        return res.status(500).json({ error: "Invalid ship type" });

      const capMap: Record<string, boolean> = {
        canCarryMines: shipType.canCarryMines,
        canCarryPgd: shipType.canCarryPgd,
        hasJumpDriveSlot: shipType.hasJumpDriveSlot,
      };
      if (!capMap[item.requiresCapability]) {
        return res
          .status(400)
          .json({ error: `Ship lacks capability: ${item.requiresCapability}` });
      }
    }

    // Check ship's drone limit for drone types
    if (item.deployableType?.startsWith("drone_")) {
      const shipType = SHIP_TYPES.find((s) => s.id === ship.ship_type_id);
      const existingDrones = await db("deployables")
        .where({ owner_id: player.id })
        .andWhere("type", "like", "drone_%")
        .count("* as count")
        .first();
      if (Number(existingDrones?.count) >= (shipType?.maxDrones ?? 0)) {
        return res.status(400).json({ error: "Maximum drone limit reached" });
      }
    }

    // Check if player has this item in inventory (purchased from store)
    const inventoryItem = await db("game_events")
      .where({
        player_id: player.id,
        event_type: `item:${itemId}`,
        read: false,
      })
      .first();

    if (!inventoryItem) {
      // Fallback: allow direct purchase if not in inventory
      if (Number(player.credits) < item.price) {
        return res.status(400).json({
          error:
            "Not enough credits. Buy from store first or ensure sufficient credits.",
        });
      }
    }

    const newEnergy = deductEnergy(player.energy, "deploy");
    const deployableId = crypto.randomUUID();
    const now = new Date();

    await db("deployables").insert({
      id: deployableId,
      owner_id: player.id,
      sector_id: player.current_sector_id,
      type: item.deployableType,
      power_level: 1,
      toll_amount:
        item.deployableType === "drone_toll" ? (tollAmount ?? 100) : null,
      buoy_message: item.deployableType === "buoy" ? (buoyMessage ?? "") : null,
      buoy_log: item.deployableType === "buoy" ? JSON.stringify([]) : null,
      health: 100,
      deployed_at: now,
      last_maintained_at: now,
    });

    if (inventoryItem) {
      // Consume from inventory
      await db("game_events")
        .where({ id: inventoryItem.id })
        .update({ read: true });
      await db("players")
        .where({ id: player.id })
        .update({ energy: newEnergy });
    } else {
      // Direct purchase (backwards compat)
      await db("players")
        .where({ id: player.id })
        .update({
          credits: Number(player.credits) - item.price,
          energy: newEnergy,
        });
      await settleDebitPlayer(player.id, item.price, "store");
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

    // Mission tracking: deploy_item
    checkAndUpdateMissions(
      player.id,
      "deploy_item",
      { itemType: item.deployableType, sectorId: player.current_sector_id },
      io,
    );

    res.json({
      deployableId,
      type: item.deployableType,
      sectorId: player.current_sector_id,
      newCredits: inventoryItem
        ? Number(player.credits)
        : Number(player.credits) - item.price,
      energy: newEnergy,
    });
  } catch (err) {
    console.error("Deploy error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// List deployables in current sector
router.get("/sector", requireAuth, async (req, res) => {
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const deployables = await db("deployables")
      .where({ sector_id: player.current_sector_id })
      .leftJoin("players", "deployables.owner_id", "players.id")
      .select(
        "deployables.id",
        "deployables.type",
        "deployables.power_level as powerLevel",
        "deployables.health",
        "deployables.toll_amount as tollAmount",
        "deployables.buoy_message as buoyMessage",
        "deployables.deployed_at as deployedAt",
        "players.username as ownerName",
        "deployables.owner_id as ownerId",
      );

    res.json({ sectorId: player.current_sector_id, deployables });
  } catch (err) {
    console.error("List deployables error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// List player's own deployables across all sectors
router.get("/mine", requireAuth, async (req, res) => {
  try {
    const deployables = await db("deployables")
      .where({ owner_id: req.session.playerId })
      .select(
        "id",
        "type",
        "sector_id as sectorId",
        "power_level as powerLevel",
        "health",
        "toll_amount as tollAmount",
        "deployed_at as deployedAt",
      );

    res.json({ deployables });
  } catch (err) {
    console.error("My deployables error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Remove (recall) a deployable
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const deployable = await db("deployables")
      .where({ id: req.params.id })
      .first();
    if (!deployable)
      return res.status(404).json({ error: "Deployable not found" });
    if (deployable.owner_id !== req.session.playerId) {
      return res.status(403).json({ error: "Not your deployable" });
    }

    await db("deployables").where({ id: req.params.id }).del();

    // Multi-session sync
    const io = req.app.get("io");
    if (io)
      syncPlayer(
        io,
        req.session.playerId!,
        "sync:status",
        req.headers["x-socket-id"] as string | undefined,
      );

    res.json({ removed: req.params.id });
  } catch (err) {
    console.error("Remove deployable error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Maintain a deployable (reset expiry timer)
router.post("/:id/maintain", requireAuth, async (req, res) => {
  try {
    const deployable = await db("deployables")
      .where({ id: req.params.id })
      .first();
    if (!deployable)
      return res.status(404).json({ error: "Deployable not found" });
    if (deployable.owner_id !== req.session.playerId) {
      return res.status(403).json({ error: "Not your deployable" });
    }

    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });
    if (player.current_sector_id !== deployable.sector_id) {
      return res
        .status(400)
        .json({ error: "Must be in same sector to maintain" });
    }

    await db("deployables").where({ id: req.params.id }).update({
      last_maintained_at: new Date(),
      health: 100,
    });

    // Multi-session sync
    const io = req.app.get("io");
    if (io)
      syncPlayer(
        io,
        req.session.playerId!,
        "sync:status",
        req.headers["x-socket-id"] as string | undefined,
      );

    res.json({ maintained: req.params.id, health: 100 });
  } catch (err) {
    console.error("Maintain deployable error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
