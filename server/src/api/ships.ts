import { Router } from "express";
import crypto from "crypto";
import { requireAuth } from "../middleware/auth";
import { SHIP_TYPES } from "../config/ship-types";
import { canAccessShipType } from "../engine/progression";
import { GAME_CONFIG } from "../config/game";
import db from "../db/connection";
import { syncPlayer } from "../ws/sync";
import { enqueue, settleDebitPlayer } from "../chain/tx-queue";
import { isSettlementEnabled } from "../chain/config";
import type { Address } from "viem";
import { pickFlavor, outpostNpcRace } from "../config/flavor-text";
import type { RaceId } from "../config/races";
import { checkAndUpdateMissions } from "../services/mission-tracker";

const router = Router();

// List ships at current star mall
router.get("/dealer", requireAuth, async (req, res) => {
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const sector = await db("sectors")
      .where({ id: player.current_sector_id })
      .first();
    if (!sector?.has_star_mall) {
      return res.status(400).json({ error: "No star mall in this sector" });
    }

    // Get player level to show lock status
    const prog = await db("player_progression")
      .where({ player_id: player.id })
      .first();
    const playerLevel = prog?.level || 1;

    res.json({
      ships: SHIP_TYPES.filter((s) => s.id !== "dodge_pod").map((s) => {
        const requiredLevel = GAME_CONFIG.SHIP_LEVEL_GATES[s.id] || 0;
        return {
          id: s.id,
          name: s.name,
          description: s.description,
          price: s.price,
          baseWeaponEnergy: s.baseWeaponEnergy,
          baseCargoHolds: s.baseCargoHolds,
          baseEngineEnergy: s.baseEngineEnergy,
          attackRatio: s.attackRatio,
          defenseRatio: s.defenseRatio,
          canCloak: s.canCloak,
          canCarryMines: s.canCarryMines,
          hasJumpDriveSlot: s.hasJumpDriveSlot,
          hasPlanetaryScanner: s.hasPlanetaryScanner,
          requiredLevel,
          locked: playerLevel < requiredLevel,
        };
      }),
    });
  } catch (err) {
    console.error("Dealer error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Purchase a ship
router.post("/buy/:shipTypeId", requireAuth, async (req, res) => {
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
        .json({ error: "Must be at a star mall to buy ships" });
    }

    const shipType = SHIP_TYPES.find((s) => s.id === req.params.shipTypeId);
    if (!shipType) return res.status(404).json({ error: "Unknown ship type" });
    if (shipType.id === "dodge_pod")
      return res.status(400).json({ error: "Cannot purchase dodge pods" });

    if (Number(player.credits) < shipType.price) {
      return res.status(400).json({ error: "Not enough credits" });
    }

    // Check level gate
    const canAccess = await canAccessShipType(player.id, shipType.id);
    if (!canAccess) {
      const required = GAME_CONFIG.SHIP_LEVEL_GATES[shipType.id] || 0;
      return res
        .status(400)
        .json({ error: `Requires level ${required} to purchase this ship` });
    }

    const shipId = crypto.randomUUID();
    await db("ships").insert({
      id: shipId,
      ship_type_id: shipType.id,
      owner_id: player.id,
      sector_id: player.current_sector_id,
      weapon_energy: shipType.baseWeaponEnergy,
      max_weapon_energy: shipType.baseWeaponEnergy,
      engine_energy: shipType.baseEngineEnergy,
      max_engine_energy: shipType.baseEngineEnergy,
      cargo_holds: shipType.baseCargoHolds,
      max_cargo_holds: shipType.baseCargoHolds,
      hull_hp: shipType.baseHullHp,
      max_hull_hp: shipType.maxHullHp,
    });

    // Initialize combat V2 subsystems + weapons
    try {
      const { setupShipCombatData } = require("../engine/ship-setup");
      await setupShipCombatData(shipId, shipType.id);
    } catch {
      /* migration may not have run yet */
    }

    await db("players")
      .where({ id: player.id })
      .update({
        credits: Number(player.credits) - shipType.price,
        current_ship_id: shipId,
      });

    // Chain settlement: debit credits + mint new ShipNFT
    if (isSettlementEnabled("store") && player.member_contract_address) {
      await settleDebitPlayer(player.id, shipType.price, "store");
      enqueue({
        type: "mintShip",
        to: player.member_contract_address as Address,
        data: {
          shipType: shipType.id,
          hullHp: shipType.baseHullHp,
          maxHullHp: shipType.maxHullHp,
          weaponEnergy: shipType.baseWeaponEnergy,
          engineEnergy: shipType.baseEngineEnergy,
          cargoBays: shipType.baseCargoHolds,
          hasCloakDevice: false,
          hasRacheDevice: false,
          hasJumpDrive: false,
        },
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

    // Mission tracking: buy_ship
    checkAndUpdateMissions(
      player.id,
      "buy_ship",
      { shipTypeId: shipType.id },
      io,
    );

    res.json({
      shipId,
      shipType: shipType.id,
      newCredits: Number(player.credits) - shipType.price,
      message: pickFlavor("ship_buy", outpostNpcRace(sector!.id.toString()), {
        ship: shipType.name,
        price: shipType.price,
      }),
    });
  } catch (err) {
    console.error("Ship buy error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Switch active ship
router.post("/switch/:shipId", requireAuth, async (req, res) => {
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const ship = await db("ships")
      .where({ id: req.params.shipId, owner_id: player.id })
      .first();
    if (!ship)
      return res
        .status(404)
        .json({ error: "Ship not found or not owned by you" });
    if (ship.sector_id !== player.current_sector_id) {
      return res
        .status(400)
        .json({ error: "Ship is not in your current sector" });
    }

    await db("players")
      .where({ id: player.id })
      .update({ current_ship_id: ship.id });

    // Multi-session sync
    const io = req.app.get("io");
    if (io)
      syncPlayer(
        io,
        player.id,
        "sync:status",
        req.headers["x-socket-id"] as string | undefined,
      );

    res.json({ currentShipId: ship.id, shipType: ship.ship_type_id });
  } catch (err) {
    console.error("Ship switch error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Toggle cloaking
router.post("/cloak", requireAuth, async (req, res) => {
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const ship = await db("ships")
      .where({ id: player.current_ship_id })
      .first();
    if (!ship) return res.status(400).json({ error: "No active ship" });

    const shipType = SHIP_TYPES.find((s) => s.id === ship.ship_type_id);
    if (!shipType?.canCloak) {
      return res.status(400).json({ error: "Ship cannot cloak" });
    }

    const newCloaked = !ship.is_cloaked;
    await db("ships").where({ id: ship.id }).update({ is_cloaked: newCloaked });

    // Multi-session sync
    const io = req.app.get("io");
    if (io)
      syncPlayer(
        io,
        player.id,
        "sync:status",
        req.headers["x-socket-id"] as string | undefined,
      );

    const cloakRace = (player.race as RaceId) || "generic";
    res.json({
      cloaked: newCloaked,
      message: pickFlavor(newCloaked ? "cloak_on" : "cloak_off", cloakRace),
    });
  } catch (err) {
    console.error("Cloak error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Jettison cargo
router.post("/eject-cargo", requireAuth, async (req, res) => {
  try {
    const { commodity, quantity } = req.body;
    if (!commodity || !quantity || quantity < 1) {
      return res.status(400).json({ error: "Missing or invalid fields" });
    }
    if (!["cyrillium", "food", "tech", "colonist"].includes(commodity)) {
      return res.status(400).json({ error: "Invalid commodity" });
    }

    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const ship = await db("ships")
      .where({ id: player.current_ship_id })
      .first();
    if (!ship) return res.status(400).json({ error: "No active ship" });

    const cargoField = `${commodity}_cargo`;
    const current = ship[cargoField] || 0;
    const toEject = Math.min(quantity, current);
    if (toEject <= 0)
      return res.status(400).json({ error: "No cargo to eject" });

    await db("ships")
      .where({ id: ship.id })
      .update({ [cargoField]: current - toEject });

    // Multi-session sync
    const io = req.app.get("io");
    if (io)
      syncPlayer(
        io,
        player.id,
        "sync:status",
        req.headers["x-socket-id"] as string | undefined,
      );

    const ejectRace = (player.race as RaceId) || "generic";
    res.json({
      commodity,
      ejected: toEject,
      remaining: current - toEject,
      message: pickFlavor("cargo_eject", ejectRace, { item: commodity }),
    });
  } catch (err) {
    console.error("Eject cargo error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
