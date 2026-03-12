import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import db from "../../db/connection";
import { awardXP } from "../../engine/progression";
import { syncPlayer } from "../../ws/sync";
import { ARCADE_CONFIG } from "./constants";

const router = Router();

router.post("/session/:id/claim", requireAuth, async (req, res) => {
  const playerId = req.session.playerId!;
  const session = await db("arcade_sessions")
    .where({ id: req.params.id })
    .first();

  if (!session || session.status !== "complete") {
    return res.status(400).json({ error: "Game not complete" });
  }

  if (session.reward_claimed) {
    return res.status(400).json({ error: "Rewards already claimed" });
  }

  const isPlayer1 = session.player1_id === playerId;
  const isPlayer2 = session.player2_id === playerId;
  if (!isPlayer1 && !isPlayer2) {
    return res.status(403).json({ error: "Not in this session" });
  }

  const isAI = !session.player2_id;
  const isWinner = session.winner_id === playerId;
  const isDraw = !session.winner_id;

  let credits: number;
  let xp: number;
  let tokens: number;

  if (isDraw) {
    credits = Math.round(
      (ARCADE_CONFIG.WINNER_CREDITS + ARCADE_CONFIG.LOSER_CREDITS) / 2,
    );
    xp = Math.round((ARCADE_CONFIG.WINNER_XP + ARCADE_CONFIG.LOSER_XP) / 2);
    tokens = ARCADE_CONFIG.DRAW_TOKENS;
  } else if (isWinner) {
    credits = ARCADE_CONFIG.WINNER_CREDITS;
    xp = ARCADE_CONFIG.WINNER_XP;
    tokens = ARCADE_CONFIG.WINNER_TOKENS;
  } else {
    credits = ARCADE_CONFIG.LOSER_CREDITS;
    xp = ARCADE_CONFIG.LOSER_XP;
    tokens = ARCADE_CONFIG.LOSER_TOKENS;
  }

  // AI matches give reduced rewards
  if (isAI) {
    credits = Math.round(credits * ARCADE_CONFIG.AI_REWARD_MULTIPLIER);
    xp = Math.round(xp * ARCADE_CONFIG.AI_REWARD_MULTIPLIER);
    tokens = Math.round(tokens * ARCADE_CONFIG.AI_REWARD_MULTIPLIER);
  }

  await db("players").where({ id: playerId }).increment("credits", credits);
  await db("players")
    .where({ id: playerId })
    .increment("arcade_tokens", tokens);
  const xpResult = await awardXP(playerId, xp, "explore");

  await db("arcade_sessions").where({ id: session.id }).update({
    reward_claimed: true,
    tokens_awarded: tokens,
    updated_at: new Date().toISOString(),
  });

  const io = req.app.get("io");
  syncPlayer(io, playerId, "sync:status");

  res.json({
    credits,
    xp,
    tokens,
    totalXp: xpResult.totalXp,
    level: xpResult.level,
    levelUp: xpResult.levelUp || null,
  });
});

export default router;
