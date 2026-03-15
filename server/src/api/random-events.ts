import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { acceptRandomEvent, declineRandomEvent } from "../engine/random-events";
import db from "../db/connection";
import { syncPlayer } from "../ws/sync";

const router = Router();

// Get player's triggered (pending) random events
router.get("/pending", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId!;

    const pending = await db("player_random_events")
      .join(
        "random_event_definitions",
        "player_random_events.event_id",
        "random_event_definitions.id",
      )
      .where({
        "player_random_events.player_id": playerId,
        "player_random_events.status": "triggered",
      })
      .select(
        "player_random_events.id as eventInstanceId",
        "random_event_definitions.event_key as eventKey",
        "random_event_definitions.title",
        "random_event_definitions.description",
        "random_event_definitions.rewards",
        "random_event_definitions.mission_template_id as missionTemplateId",
        "player_random_events.spawned_at as spawnedAt",
      )
      .orderBy("player_random_events.spawned_at", "desc");

    const events = pending.map((e: any) => ({
      ...e,
      rewards:
        typeof e.rewards === "string" ? JSON.parse(e.rewards) : e.rewards,
    }));

    res.json({ events });
  } catch (err) {
    console.error("Random events pending error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Accept a triggered random event
router.post("/accept/:eventInstanceId", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId!;
    const eventInstanceId = req.params.eventInstanceId as string;

    const result = await acceptRandomEvent(playerId, eventInstanceId);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    const io = req.app.get("io");
    const socketId = req.headers["x-socket-id"] as string | undefined;
    if (io) syncPlayer(io, playerId, "sync:status", socketId);

    res.json({
      accepted: true,
      missionId: result.missionId || null,
    });
  } catch (err) {
    console.error("Random event accept error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Decline a triggered random event
router.post("/decline/:eventInstanceId", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId!;
    const eventInstanceId = req.params.eventInstanceId as string;

    const result = await declineRandomEvent(playerId, eventInstanceId);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ declined: true });
  } catch (err) {
    console.error("Random event decline error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get event history
router.get("/history", requireAuth, async (req, res) => {
  try {
    const playerId = req.session.playerId!;

    const history = await db("player_random_events")
      .join(
        "random_event_definitions",
        "player_random_events.event_id",
        "random_event_definitions.id",
      )
      .where({ "player_random_events.player_id": playerId })
      .whereIn("player_random_events.status", [
        "accepted",
        "declined",
        "completed",
      ])
      .select(
        "player_random_events.id as eventInstanceId",
        "random_event_definitions.event_key as eventKey",
        "random_event_definitions.title",
        "player_random_events.status",
        "player_random_events.spawned_at as spawnedAt",
        "player_random_events.completed_at as completedAt",
      )
      .orderBy("player_random_events.spawned_at", "desc")
      .limit(50);

    res.json({ history });
  } catch (err) {
    console.error("Random events history error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
