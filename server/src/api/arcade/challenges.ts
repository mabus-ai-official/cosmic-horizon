import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import db from "../../db/connection";
import { notifyPlayer } from "../../ws/handlers";
import { ARCADE_CONFIG } from "./constants";

const router = Router();

// Challenge another player (must be in same sector)
router.post("/challenge", requireAuth, async (req, res) => {
  const playerId = req.session.playerId!;
  const { targetId, gameType = "asteroid_mining" } = req.body;

  if (!targetId) {
    return res.status(400).json({ error: "targetId required" });
  }

  const player = await db("players").where({ id: playerId }).first();
  const target = await db("players").where({ id: targetId }).first();
  if (!player || !target) {
    return res.status(404).json({ error: "Player not found" });
  }

  if (player.current_sector_id !== target.current_sector_id) {
    return res.status(400).json({ error: "Must be in the same sector" });
  }

  // Expire old pending challenges from this player
  await db("arcade_challenges")
    .where({ challenger_id: playerId, status: "pending" })
    .update({ status: "expired" });

  const expiresAt = new Date(
    Date.now() + ARCADE_CONFIG.CHALLENGE_TIMEOUT_SEC * 1000,
  );

  const [challenge] = await db("arcade_challenges")
    .insert({
      challenger_id: playerId,
      target_id: targetId,
      game_type: gameType,
      sector_id: player.current_sector_id,
      status: "pending",
      expires_at: expiresAt.toISOString(),
    })
    .returning("*");

  const io = req.app.get("io");
  notifyPlayer(io, targetId, "arcade:challenge", {
    challengeId: challenge.id,
    challengerName: player.username,
    gameType,
  });

  res.json({ challengeId: challenge.id, expiresAt: expiresAt.toISOString() });
});

// Accept a challenge
router.post("/challenge/:id/accept", requireAuth, async (req, res) => {
  const playerId = req.session.playerId!;
  const challenge = await db("arcade_challenges")
    .where({ id: req.params.id, target_id: playerId, status: "pending" })
    .first();

  if (!challenge) {
    return res.status(404).json({ error: "Challenge not found or expired" });
  }

  if (new Date(challenge.expires_at) < new Date()) {
    await db("arcade_challenges")
      .where({ id: challenge.id })
      .update({ status: "expired" });
    return res.status(400).json({ error: "Challenge expired" });
  }

  await db("arcade_challenges")
    .where({ id: challenge.id })
    .update({ status: "accepted" });

  // Create session
  const [session] = await db("arcade_sessions")
    .insert({
      game_type: challenge.game_type,
      player1_id: challenge.challenger_id,
      player2_id: playerId,
      status: "lobby",
    })
    .returning("*");

  const io = req.app.get("io");
  const challenger = await db("players")
    .where({ id: challenge.challenger_id })
    .first();
  const target = await db("players").where({ id: playerId }).first();

  notifyPlayer(io, challenge.challenger_id, "arcade:challenge_response", {
    challengeId: challenge.id,
    accepted: true,
    sessionId: session.id,
  });

  notifyPlayer(io, playerId, "arcade:challenge_response", {
    challengeId: challenge.id,
    accepted: true,
    sessionId: session.id,
  });

  // Notify both of session start
  notifyPlayer(io, challenge.challenger_id, "arcade:session_start", {
    sessionId: session.id,
    opponent: { id: playerId, username: target?.username },
    gameType: challenge.game_type,
    isPlayer1: true,
  });

  notifyPlayer(io, playerId, "arcade:session_start", {
    sessionId: session.id,
    opponent: {
      id: challenge.challenger_id,
      username: challenger?.username,
    },
    gameType: challenge.game_type,
    isPlayer1: false,
  });

  res.json({ sessionId: session.id });
});

// Decline a challenge
router.post("/challenge/:id/decline", requireAuth, async (req, res) => {
  const playerId = req.session.playerId!;
  const challenge = await db("arcade_challenges")
    .where({ id: req.params.id, target_id: playerId, status: "pending" })
    .first();

  if (!challenge) {
    return res.status(404).json({ error: "Challenge not found" });
  }

  await db("arcade_challenges")
    .where({ id: challenge.id })
    .update({ status: "declined" });

  const io = req.app.get("io");
  notifyPlayer(io, challenge.challenger_id, "arcade:challenge_response", {
    challengeId: challenge.id,
    accepted: false,
  });

  res.json({ ok: true });
});

// Start AI match
router.post("/challenge/ai", requireAuth, async (req, res) => {
  const playerId = req.session.playerId!;
  const { gameType = "asteroid_mining", difficulty = "medium" } = req.body;

  const player = await db("players").where({ id: playerId }).first();
  if (!player) {
    return res.status(404).json({ error: "Player not found" });
  }

  const [session] = await db("arcade_sessions")
    .insert({
      game_type: gameType,
      player1_id: playerId,
      player2_id: null,
      status: "lobby",
      round_data: JSON.stringify({ aiDifficulty: difficulty }),
    })
    .returning("*");

  res.json({
    sessionId: session.id,
    opponent: { id: null, username: "AI Opponent" },
    gameType,
    isPlayer1: true,
  });
});

export default router;
