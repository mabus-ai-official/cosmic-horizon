/**
 * Weapons API — Phase 2: Buy, equip, unequip weapons at starmall dealer.
 */

import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import db from "../db/connection";
import { syncPlayer } from "../ws/sync";
import { checkAndUpdateMissions } from "../services/mission-tracker";
import { settleDebitPlayer } from "../chain/tx-queue";
import { isSettlementEnabled } from "../chain/config";

const router = Router();

/**
 * GET /dealer — List weapons available for purchase.
 */
router.get("/dealer", requireAuth, async (req, res) => {
  try {
    const player = await db("players")
      .where({ id: req.session.playerId! })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const sector = await db("sectors")
      .where({ id: player.current_sector_id })
      .first();
    if (!sector?.has_star_mall) {
      return res.status(400).json({ error: "Not at a Star Mall" });
    }

    const weaponTypes = await db("weapon_types").select("*");
    const ship = await db("ships")
      .where({ id: player.current_ship_id })
      .first();

    // Get player's current weapon slots
    const equippedWeapons = ship
      ? await db("weapon_slots").where({ ship_id: ship.id }).select("*")
      : [];

    // Get player's inventory
    const inventory = await db("player_weapons")
      .where({ player_id: player.id, equipped: false })
      .select("*");

    res.json({
      weapons: weaponTypes,
      equipped: equippedWeapons,
      inventory,
      credits: Number(player.credits),
      weaponSlots: ship?.weapon_slot_count ?? 0,
    });
  } catch (err) {
    console.error("Weapons dealer error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /buy/:weaponTypeId — Purchase a weapon.
 */
router.post("/buy/:weaponTypeId", requireAuth, async (req, res) => {
  try {
    const player = await db("players")
      .where({ id: req.session.playerId! })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const sector = await db("sectors")
      .where({ id: player.current_sector_id })
      .first();
    if (!sector?.has_star_mall) {
      return res.status(400).json({ error: "Not at a Star Mall" });
    }

    const weaponType = await db("weapon_types")
      .where({ id: req.params.weaponTypeId })
      .first();
    if (!weaponType) {
      return res.status(404).json({ error: "Weapon type not found" });
    }

    if (weaponType.price <= 0) {
      return res.status(400).json({ error: "This weapon cannot be purchased" });
    }

    if (Number(player.credits) < weaponType.price) {
      return res.status(400).json({ error: "Insufficient credits" });
    }

    // Deduct credits and add to inventory
    await db("players")
      .where({ id: player.id })
      .decrement("credits", weaponType.price);

    await db("player_weapons").insert({
      player_id: player.id,
      weapon_type_id: weaponType.id,
      equipped: false,
    });

    // Settlement
    if (isSettlementEnabled("store")) {
      settleDebitPlayer(player.id, weaponType.price, "store");
    }

    const io = req.app.get("io");
    if (io) syncPlayer(io, player.id, "sync:status");

    await checkAndUpdateMissions(
      player.id,
      "buy_item",
      { itemId: weaponType.id },
      io ?? undefined,
    );

    res.json({
      weaponTypeId: weaponType.id,
      name: weaponType.name,
      newCredits: Number(player.credits) - weaponType.price,
      message: `Purchased ${weaponType.name}`,
    });
  } catch (err) {
    console.error("Weapon buy error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /equip — Equip a weapon from inventory to a ship slot.
 */
router.post("/equip", requireAuth, async (req, res) => {
  try {
    const { playerWeaponId, slotIndex } = req.body;
    if (!playerWeaponId || slotIndex === undefined) {
      return res
        .status(400)
        .json({ error: "Missing playerWeaponId or slotIndex" });
    }

    const player = await db("players")
      .where({ id: req.session.playerId! })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const ship = await db("ships")
      .where({ id: player.current_ship_id })
      .first();
    if (!ship) return res.status(400).json({ error: "No active ship" });

    if (slotIndex < 0 || slotIndex >= ship.weapon_slot_count) {
      return res.status(400).json({ error: "Invalid slot index" });
    }

    const pw = await db("player_weapons")
      .where({ id: playerWeaponId, player_id: player.id })
      .first();
    if (!pw) return res.status(404).json({ error: "Weapon not found" });

    // Unequip whatever is in the target slot
    const existingSlot = await db("weapon_slots")
      .where({ ship_id: ship.id, slot_index: slotIndex })
      .first();

    if (existingSlot) {
      // If there's a player_weapon tracking the existing weapon, mark it unequipped
      await db("player_weapons")
        .where({
          player_id: player.id,
          equipped_on_ship_id: ship.id,
          equipped_slot_index: slotIndex,
          equipped: true,
        })
        .update({
          equipped: false,
          equipped_on_ship_id: null,
          equipped_slot_index: null,
        });

      // Update the slot to the new weapon
      await db("weapon_slots").where({ id: existingSlot.id }).update({
        weapon_type_id: pw.weapon_type_id,
        cooldown_remaining: 0,
      });
    } else {
      // Create new slot
      await db("weapon_slots").insert({
        ship_id: ship.id,
        weapon_type_id: pw.weapon_type_id,
        slot_index: slotIndex,
        cooldown_remaining: 0,
      });
    }

    // Mark the player weapon as equipped
    await db("player_weapons").where({ id: pw.id }).update({
      equipped: true,
      equipped_on_ship_id: ship.id,
      equipped_slot_index: slotIndex,
    });

    const io = req.app.get("io");
    if (io) syncPlayer(io, player.id, "sync:status");

    res.json({ success: true, message: "Weapon equipped" });
  } catch (err) {
    console.error("Weapon equip error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /unequip — Remove a weapon from a ship slot back to inventory.
 */
router.post("/unequip", requireAuth, async (req, res) => {
  try {
    const { slotIndex } = req.body;
    if (slotIndex === undefined) {
      return res.status(400).json({ error: "Missing slotIndex" });
    }

    const player = await db("players")
      .where({ id: req.session.playerId! })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const ship = await db("ships")
      .where({ id: player.current_ship_id })
      .first();
    if (!ship) return res.status(400).json({ error: "No active ship" });

    // Mark player_weapon as unequipped
    await db("player_weapons")
      .where({
        player_id: player.id,
        equipped_on_ship_id: ship.id,
        equipped_slot_index: slotIndex,
        equipped: true,
      })
      .update({
        equipped: false,
        equipped_on_ship_id: null,
        equipped_slot_index: null,
      });

    // Remove weapon slot — replace with pulse_laser (default)
    await db("weapon_slots")
      .where({ ship_id: ship.id, slot_index: slotIndex })
      .update({ weapon_type_id: "pulse_laser", cooldown_remaining: 0 });

    const io = req.app.get("io");
    if (io) syncPlayer(io, player.id, "sync:status");

    res.json({ success: true, message: "Weapon unequipped" });
  } catch (err) {
    console.error("Weapon unequip error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
