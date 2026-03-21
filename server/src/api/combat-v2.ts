/**
 * Combat V2 API Routes
 *
 * POST /initiate       — Start a new combat session
 * POST /submit-orders  — Submit round orders
 * GET  /state          — Get current session state (reconnect/refresh)
 * POST /flee           — Shorthand for flee orders
 * POST /surrender      — Immediate loss
 */

import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { GAME_CONFIG } from "../config/game";
import db from "../db/connection";
import {
  createCombatSession,
  submitOrders,
  getCombatSessionState,
  surrender,
  loadCombatPlayerState,
} from "../engine/combat-v2-state";
import {
  validatePowerAllocation,
  type CombatOrders,
  type SubsystemType,
} from "../engine/combat-v2";

const router = Router();

const VALID_SUBSYSTEMS: SubsystemType[] = [
  "shields",
  "weapons",
  "engines",
  "sensors",
  "life_support",
];

/**
 * POST /initiate — Start a combat session against a target player.
 */
router.post("/initiate", requireAuth, async (req, res) => {
  try {
    const { targetPlayerId } = req.body;
    if (!targetPlayerId) {
      return res.status(400).json({ error: "Missing targetPlayerId" });
    }

    const player = await db("players")
      .where({ id: req.session.playerId! })
      .first();
    if (!player) return res.status(404).json({ error: "Player not found" });

    // Check if already in combat
    const existingSession = await db("combat_sessions")
      .where({ status: "active" })
      .where(function () {
        this.where({ attacker_id: player.id }).orWhere({
          defender_id: player.id,
        });
      })
      .first();
    if (existingSession) {
      return res.status(400).json({ error: "Already in combat" });
    }

    // Check target
    const target = await db("players").where({ id: targetPlayerId }).first();
    if (!target || target.current_sector_id !== player.current_sector_id) {
      return res.status(400).json({ error: "Target not in your sector" });
    }

    // Check target not already in combat
    const targetInCombat = await db("combat_sessions")
      .where({ status: "active" })
      .where(function () {
        this.where({ attacker_id: targetPlayerId }).orWhere({
          defender_id: targetPlayerId,
        });
      })
      .first();
    if (targetInCombat) {
      return res.status(400).json({ error: "Target is already in combat" });
    }

    // Protected sector check (allow mission NPCs)
    const sector = await db("sectors")
      .where({ id: player.current_sector_id })
      .first();
    if (
      (sector?.type === "protected" || sector?.type === "harmony_enforced") &&
      !target.spawned_by_mission_id
    ) {
      return res
        .status(400)
        .json({ error: "Combat not allowed in this sector" });
    }

    // Both need ships
    const attackerShip = await db("ships")
      .where({ id: player.current_ship_id })
      .first();
    const defenderShip = await db("ships")
      .where({ id: target.current_ship_id })
      .first();
    if (!attackerShip || !defenderShip) {
      return res.status(400).json({ error: "Both players must have ships" });
    }

    // DodgePod can't initiate combat
    if (attackerShip.ship_type_id === "dodge_pod") {
      return res
        .status(400)
        .json({ error: "Cannot initiate combat in a dodge pod" });
    }

    const io = req.app.get("io");

    const { sessionId, playerAState, playerBState } = await createCombatSession(
      player.id,
      targetPlayerId,
      player.current_sector_id,
      io,
    );

    // Emit session start to both players via their personal rooms
    if (io) {
      const sessionStartData = {
        sessionId,
        attackerId: player.id,
        attackerName: player.username,
        defenderId: targetPlayerId,
        defenderName: target.username,
        roundNumber: 1,
        deadline: new Date(Date.now() + 30_000).toISOString(),
        playerAState,
        playerBState,
      };
      io.to(`player:${player.id}`).emit(
        "combat-v2:session_start",
        sessionStartData,
      );
      io.to(`player:${targetPlayerId}`).emit(
        "combat-v2:session_start",
        sessionStartData,
      );
    }

    res.json({
      sessionId,
      playerState: playerAState,
      opponentState: playerBState,
      roundNumber: 1,
      deadline: new Date(Date.now() + 30_000).toISOString(),
    });
  } catch (err) {
    console.error("Combat V2 initiate error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /submit-orders — Submit combat orders for the current round.
 */
router.post("/submit-orders", requireAuth, async (req, res) => {
  try {
    const { sessionId, orders } = req.body;
    if (!sessionId || !orders) {
      return res.status(400).json({ error: "Missing sessionId or orders" });
    }

    // Validate orders structure
    const combatOrders = orders as CombatOrders;
    if (
      !combatOrders.powerAllocation ||
      typeof combatOrders.powerAllocation.shields !== "number" ||
      typeof combatOrders.powerAllocation.weapons !== "number" ||
      typeof combatOrders.powerAllocation.engines !== "number" ||
      typeof combatOrders.powerAllocation.sensors !== "number"
    ) {
      return res.status(400).json({ error: "Invalid power allocation" });
    }

    if (
      !combatOrders.targetSubsystem ||
      !VALID_SUBSYSTEMS.includes(combatOrders.targetSubsystem)
    ) {
      return res.status(400).json({ error: "Invalid target subsystem" });
    }

    if (!Array.isArray(combatOrders.fireWeapons)) {
      return res.status(400).json({ error: "fireWeapons must be an array" });
    }

    const io = req.app.get("io");
    const result = await submitOrders(
      sessionId,
      req.session.playerId!,
      combatOrders,
      io,
    );

    res.json(result);
  } catch (err: any) {
    console.error("Combat V2 submit-orders error:", err);
    res.status(400).json({ error: err.message || "Failed to submit orders" });
  }
});

/**
 * GET /state — Get current combat session state (for reconnect/refresh).
 */
router.get("/state", requireAuth, async (req, res) => {
  try {
    const state = await getCombatSessionState(req.session.playerId!);
    if (!state) {
      return res.json({ inCombat: false });
    }
    res.json({ inCombat: true, ...state });
  } catch (err) {
    console.error("Combat V2 state error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /flee — Shorthand for submitting flee orders.
 */
router.post("/flee", requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: "Missing sessionId" });
    }

    // Load player state to build flee orders
    const playerState = await loadCombatPlayerState(req.session.playerId!);
    if (!playerState) {
      return res.status(400).json({ error: "Could not load combat state" });
    }

    // Flee orders: all power to engines, no weapons fired
    const fleeOrders: CombatOrders = {
      powerAllocation: {
        shields: 0,
        weapons: 0,
        engines: playerState.maxReactorPower,
        sensors: 0,
      },
      targetSubsystem: "shields",
      fireWeapons: [],
      flee: true,
    };

    const io = req.app.get("io");
    const result = await submitOrders(
      sessionId,
      req.session.playerId!,
      fleeOrders,
      io,
    );

    res.json(result);
  } catch (err: any) {
    console.error("Combat V2 flee error:", err);
    res.status(400).json({ error: err.message || "Failed to flee" });
  }
});

/**
 * POST /surrender — Immediate loss.
 */
router.post("/surrender", requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: "Missing sessionId" });
    }

    const io = req.app.get("io");
    await surrender(sessionId, req.session.playerId!, io);

    res.json({ success: true, message: "You surrendered" });
  } catch (err: any) {
    console.error("Combat V2 surrender error:", err);
    res.status(400).json({ error: err.message || "Failed to surrender" });
  }
});

export default router;
