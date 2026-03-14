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

  // No in-game credits from arcade — only arcade tokens and minimal XP
  credits = 0;

  if (isDraw) {
    xp = Math.round((ARCADE_CONFIG.WINNER_XP + ARCADE_CONFIG.LOSER_XP) / 2);
    tokens = ARCADE_CONFIG.DRAW_TOKENS;
  } else if (isWinner) {
    xp = ARCADE_CONFIG.WINNER_XP;
    tokens = ARCADE_CONFIG.WINNER_TOKENS;
  } else {
    xp = ARCADE_CONFIG.LOSER_XP;
    tokens = ARCADE_CONFIG.LOSER_TOKENS;
  }

  // Solo mode: reduced rewards
  const roundData = JSON.parse(session.round_data || "{}");
  const isSolo = roundData.solo === true;

  if (isSolo) {
    if (session.game_type === "cargo_tetris") {
      const ct = ARCADE_CONFIG.CARGO_TETRIS;
      const p1Result = roundData.round_1?.player1Result;
      const linesCleared = p1Result?.linesCleared || 0;
      const level = Math.floor(linesCleared / ct.LINES_PER_LEVEL) + 1;
      tokens = level >= ct.SOLO_MIN_CREDITS_LEVEL ? 10 : 0;
    } else {
      tokens = 10;
    }
    xp = Math.round(ARCADE_CONFIG.WINNER_XP * 0.1);
  } else {
    // XP is 10% of base for all arcade (farmable but slow)
    xp = Math.round(xp * 0.1);
  }

  // AI matches give reduced token rewards
  if (isAI && !isSolo) {
    tokens = Math.round(tokens * ARCADE_CONFIG.AI_REWARD_MULTIPLIER);
  }

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
