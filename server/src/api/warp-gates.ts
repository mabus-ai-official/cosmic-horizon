import { Router } from "express";
import crypto from "crypto";
import { requireAuth } from "../middleware/auth";
import { GAME_CONFIG } from "../config/game";
import { canAffordAction, deductEnergy } from "../engine/energy";
import { canBuildGate, calculateToll } from "../engine/warp-gates";
import db from "../db/connection";
import {
  incrementStat,
  logActivity,
  checkMilestones,
} from "../engine/profile-stats";
import { syncPlayer } from "../ws/sync";
import { handleSectorChange } from "../ws/handlers";
import { settleDebitPlayer } from "../chain/tx-queue";

const router = Router();

// Gates in current sector
router.get("/sector", requireAuth, async (req, res) => {
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const gates = await db("warp_gates")
      .where({ status: "active" })
      .where(function () {
        this.where({ sector_a_id: player.current_sector_id }).orWhere({
          sector_b_id: player.current_sector_id,
        });
      });

    res.json({
      gates: gates.map((g) => ({
        id: g.id,
        destinationSectorId:
          g.sector_a_id === player.current_sector_id
            ? g.sector_b_id
            : g.sector_a_id,
        tollAmount: g.toll_amount,
        syndicateFree: !!g.syndicate_free,
        syndicateId: g.syndicate_id,
      })),
    });
  } catch (err) {
    console.error("Warp gates sector error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Build a warp gate
router.post("/build", requireAuth, async (req, res) => {
  try {
    const { destinationSectorId } = req.body;
    if (!destinationSectorId)
      return res.status(400).json({ error: "Missing destination sector" });

    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    // Must be in a syndicate with officer+ rank
    const membership = await db("syndicate_members")
      .where({ player_id: player.id })
      .first();

    if (!membership)
      return res.status(400).json({ error: "Must be in a syndicate" });
    if (!["leader", "officer"].includes(membership.role)) {
      return res
        .status(400)
        .json({ error: "Must be syndicate officer or leader" });
    }

    // Check resources
    if (Number(player.credits) < GAME_CONFIG.WARP_GATE_COST_CREDITS) {
      return res.status(400).json({ error: "Not enough credits" });
    }

    // Check ship cargo for tech and cyrillium
    const ship = await db("ships")
      .where({ id: player.current_ship_id })
      .first();
    if (!ship) return res.status(400).json({ error: "No active ship" });

    if ((ship.tech_cargo || 0) < GAME_CONFIG.WARP_GATE_COST_TECH) {
      return res.status(400).json({
        error: `Need ${GAME_CONFIG.WARP_GATE_COST_TECH} tech in cargo`,
      });
    }
    if ((ship.cyrillium_cargo || 0) < GAME_CONFIG.WARP_GATE_COST_CYRILLIUM) {
      return res.status(400).json({
        error: `Need ${GAME_CONFIG.WARP_GATE_COST_CYRILLIUM} cyrillium in cargo`,
      });
    }

    const check = await canBuildGate(
      player.id,
      membership.syndicate_id,
      player.current_sector_id,
      parseInt(destinationSectorId),
    );
    if (!check.allowed) return res.status(400).json({ error: check.reason });

    // Deduct resources
    await db("players")
      .where({ id: player.id })
      .update({
        credits: Number(player.credits) - GAME_CONFIG.WARP_GATE_COST_CREDITS,
      });
    await settleDebitPlayer(
      player.id,
      GAME_CONFIG.WARP_GATE_COST_CREDITS,
      "store",
    );
    await db("ships")
      .where({ id: ship.id })
      .update({
        tech_cargo: (ship.tech_cargo || 0) - GAME_CONFIG.WARP_GATE_COST_TECH,
        cyrillium_cargo:
          (ship.cyrillium_cargo || 0) - GAME_CONFIG.WARP_GATE_COST_CYRILLIUM,
      });

    const gateId = crypto.randomUUID();
    await db("warp_gates").insert({
      id: gateId,
      sector_a_id: player.current_sector_id,
      sector_b_id: parseInt(destinationSectorId),
      syndicate_id: membership.syndicate_id,
      built_by_id: player.id,
      toll_amount: 0,
      syndicate_free: true,
      status: "active",
      health: 100,
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
      gateId,
      sectorA: player.current_sector_id,
      sectorB: parseInt(destinationSectorId),
      newCredits: Number(player.credits) - GAME_CONFIG.WARP_GATE_COST_CREDITS,
    });
  } catch (err) {
    console.error("Build warp gate error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Use a warp gate
router.post("/use/:gateId", requireAuth, async (req, res) => {
  try {
    const player = await db("players")
      .where({ id: req.session.playerId })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    if (player.docked_at_outpost_id)
      return res
        .status(400)
        .json({ error: "You must undock before traveling" });
    if (player.landed_at_planet_id)
      return res
        .status(400)
        .json({ error: "You must liftoff before traveling" });

    if (!canAffordAction(player.energy, "warp")) {
      return res.status(400).json({ error: "Not enough energy for warp" });
    }

    const gate = await db("warp_gates")
      .where({ id: req.params.gateId, status: "active" })
      .first();

    if (!gate) return res.status(404).json({ error: "Warp gate not found" });

    // Player must be at one end
    if (
      gate.sector_a_id !== player.current_sector_id &&
      gate.sector_b_id !== player.current_sector_id
    ) {
      return res.status(400).json({ error: "Not at this warp gate" });
    }

    const destinationSectorId =
      gate.sector_a_id === player.current_sector_id
        ? gate.sector_b_id
        : gate.sector_a_id;

    // Calculate toll
    const membership = await db("syndicate_members")
      .where({ player_id: player.id, syndicate_id: gate.syndicate_id })
      .first();

    const toll = calculateToll(
      gate.toll_amount,
      !!membership,
      !!gate.syndicate_free,
    );

    if (toll > 0 && Number(player.credits) < toll) {
      return res.status(400).json({ error: "Not enough credits for toll" });
    }

    const newEnergy = deductEnergy(player.energy, "warp");

    // Move player
    await db("players")
      .where({ id: player.id })
      .update({
        current_sector_id: destinationSectorId,
        energy: newEnergy,
        credits: Number(player.credits) - toll,
      });
    if (toll > 0) {
      await settleDebitPlayer(player.id, toll, "store");
    }

    // Move ship
    if (player.current_ship_id) {
      await db("ships").where({ id: player.current_ship_id }).update({
        sector_id: destinationSectorId,
      });
    }

    // Update explored sectors
    let explored: number[] = [];
    try {
      explored = JSON.parse(player.explored_sectors || "[]");
    } catch {
      explored = [];
    }
    const isNewSector = !explored.includes(destinationSectorId);
    if (isNewSector) {
      explored.push(destinationSectorId);
      await db("players")
        .where({ id: player.id })
        .update({
          explored_sectors: JSON.stringify(explored),
        });
    }

    // Log usage
    await db("warp_gate_usage").insert({
      id: crypto.randomUUID(),
      gate_id: gate.id,
      player_id: player.id,
      toll_paid: toll,
    });

    // Give toll to syndicate treasury if applicable
    if (toll > 0) {
      await db("syndicates")
        .where({ id: gate.syndicate_id })
        .increment("treasury", toll);
    }

    // Profile stats: warp gate use
    incrementStat(player.id, "warp_gate_uses", 1);
    if (isNewSector) {
      incrementStat(player.id, "sectors_explored", 1);
      checkMilestones(player.id);
    }

    // Multi-session sync: sector change + full refresh
    const io = req.app.get("io");
    if (io) {
      const excludeSocket = req.headers["x-socket-id"] as string | undefined;
      handleSectorChange(
        io,
        player.id,
        player.current_sector_id,
        destinationSectorId,
        player.username,
      );
      syncPlayer(io, player.id, "sync:full", excludeSocket);
    }

    res.json({
      destinationSectorId,
      tollPaid: toll,
      energy: newEnergy,
      newCredits: Number(player.credits) - toll,
    });
  } catch (err) {
    console.error("Use warp gate error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Set toll
router.post("/set-toll/:gateId", requireAuth, async (req, res) => {
  try {
    const { tollAmount } = req.body;
    if (tollAmount == null || tollAmount < 0) {
      return res.status(400).json({ error: "Invalid toll amount" });
    }

    const gate = await db("warp_gates")
      .where({ id: req.params.gateId, status: "active" })
      .first();
    if (!gate) return res.status(404).json({ error: "Warp gate not found" });

    // Must be syndicate officer+
    const membership = await db("syndicate_members")
      .where({
        player_id: req.session.playerId,
        syndicate_id: gate.syndicate_id,
      })
      .first();

    if (!membership || !["leader", "officer"].includes(membership.role)) {
      return res
        .status(403)
        .json({ error: "Must be syndicate officer or leader" });
    }

    await db("warp_gates").where({ id: gate.id }).update({
      toll_amount: tollAmount,
    });

    res.json({ gateId: gate.id, newToll: tollAmount });
  } catch (err) {
    console.error("Set toll error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// List syndicate gates
router.get("/syndicate", requireAuth, async (req, res) => {
  try {
    const membership = await db("syndicate_members")
      .where({ player_id: req.session.playerId })
      .first();

    if (!membership)
      return res.status(400).json({ error: "Not in a syndicate" });

    const gates = await db("warp_gates").where({
      syndicate_id: membership.syndicate_id,
      status: "active",
    });

    res.json({
      gates: gates.map((g) => ({
        id: g.id,
        sectorA: g.sector_a_id,
        sectorB: g.sector_b_id,
        tollAmount: g.toll_amount,
        syndicateFree: !!g.syndicate_free,
        health: g.health,
      })),
    });
  } catch (err) {
    console.error("Syndicate gates error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
