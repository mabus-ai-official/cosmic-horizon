import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import db from "../../db/connection";
import { notifyPlayer } from "../../ws/handlers";
import { ARCADE_CONFIG } from "./constants";
import { getDrinkMenu, resolveDrinkEffects } from "./drinks";
import { chooseAIDrink } from "./ai-opponent";
import {
  validateRoundScore,
  generateSweetSpotPositions,
  calculateBarSpeed,
} from "./validation";
import { generateAIHits, chooseAIDifficulty } from "./ai-opponent";
import {
  validateTurretDefenseScore,
  generateTurretRoundConfig,
} from "./turret-validation";
import { generateAITurretResult } from "./turret-ai";

const router = Router();

// Get session state
router.get("/session/:id", requireAuth, async (req, res) => {
  const session = await db("arcade_sessions")
    .where({ id: req.params.id })
    .first();

  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  const playerId = req.session.playerId!;
  const isPlayer1 = session.player1_id === playerId;
  const isPlayer2 = session.player2_id === playerId;
  if (!isPlayer1 && !isPlayer2) {
    return res.status(403).json({ error: "Not in this session" });
  }

  const opponent = session.player2_id
    ? await db("players")
        .where({ id: isPlayer1 ? session.player2_id : session.player1_id })
        .select("id", "username")
        .first()
    : { id: null, username: "AI Opponent" };

  res.json({
    id: session.id,
    gameType: session.game_type,
    status: session.status,
    round: session.round,
    maxRounds: session.max_rounds,
    myScore: isPlayer1 ? session.player1_score : session.player2_score,
    opponentScore: isPlayer1 ? session.player2_score : session.player1_score,
    opponent,
    isPlayer1,
    winnerId: session.winner_id,
    rewardClaimed: session.reward_claimed,
  });
});

// Submit round result
router.post("/session/:id/round-result", requireAuth, async (req, res) => {
  const playerId = req.session.playerId!;

  const session = await db("arcade_sessions")
    .where({ id: req.params.id })
    .first();

  if (!session || session.status !== "playing") {
    return res.status(400).json({ error: "Session not in playing state" });
  }

  const isPlayer1 = session.player1_id === playerId;
  const isPlayer2 = session.player2_id === playerId;
  if (!isPlayer1 && !isPlayer2) {
    return res.status(403).json({ error: "Not in this session" });
  }

  // Branch by game type
  if (session.game_type === "turret_defense") {
    return handleTurretDefenseResult(
      req,
      res,
      session,
      playerId,
      isPlayer1,
      isPlayer2,
    );
  }

  // Default: asteroid_mining
  return handleAsteroidMiningResult(
    req,
    res,
    session,
    playerId,
    isPlayer1,
    isPlayer2,
  );
});

// --- Asteroid Mining round result handler ---
async function handleAsteroidMiningResult(
  req: any,
  res: any,
  session: any,
  playerId: string,
  isPlayer1: boolean,
  isPlayer2: boolean,
) {
  const { hitTimings } = req.body;

  if (
    !Array.isArray(hitTimings) ||
    hitTimings.length !== ARCADE_CONFIG.HITS_PER_ROUND
  ) {
    return res
      .status(400)
      .json({ error: `Expected ${ARCADE_CONFIG.HITS_PER_ROUND} hit timings` });
  }

  const roundData = JSON.parse(session.round_data || "{}");
  const currentRound = roundData[`round_${session.round}`];
  if (!currentRound) {
    return res.status(400).json({ error: "No round data available" });
  }

  // Resolve drink effects
  const myDrinks = JSON.parse(
    isPlayer1 ? session.player1_drinks : session.player2_drinks,
  );
  const oppDrinks = JSON.parse(
    isPlayer1 ? session.player2_drinks : session.player1_drinks,
  );
  const { selfEffects, opponentEffects: effectsFromOpponent } =
    resolveDrinkEffects(myDrinks, oppDrinks);
  const { selfEffects: _, opponentEffects: effectsOnMe } = resolveDrinkEffects(
    oppDrinks,
    myDrinks,
  );

  const { totalScore, hits } = validateRoundScore(
    hitTimings,
    currentRound.sweetSpotPositions,
    selfEffects,
    [...effectsFromOpponent, ...effectsOnMe],
  );

  const hitKey = isPlayer1 ? "player1Hits" : "player2Hits";
  const scoreKey = isPlayer1 ? "player1Score" : "player2Score";
  currentRound[hitKey] = hitTimings;
  currentRound[scoreKey] = totalScore;
  roundData[`round_${session.round}`] = currentRound;

  const cumulativeKey = isPlayer1 ? "player1_score" : "player2_score";
  const newTotal =
    (isPlayer1 ? session.player1_score : session.player2_score) + totalScore;

  await db("arcade_sessions")
    .where({ id: session.id })
    .update({
      [cumulativeKey]: newTotal,
      round_data: JSON.stringify(roundData),
      updated_at: new Date().toISOString(),
    });

  const io = req.app.get("io");
  const isAI = !session.player2_id;

  if (isAI) {
    const aiDifficulty = roundData.aiDifficulty || "medium";
    const player = await db("players").where({ id: playerId }).first();
    const difficulty = chooseAIDifficulty(player?.level || 1);
    const aiHits = generateAIHits(
      currentRound.sweetSpotPositions,
      aiDifficulty || difficulty,
    );
    const aiDrinks = JSON.parse(session.player2_drinks);
    const { selfEffects: aiSelf } = resolveDrinkEffects(aiDrinks, myDrinks);
    const { totalScore: aiScore } = validateRoundScore(
      aiHits,
      currentRound.sweetSpotPositions,
      aiSelf,
      selfEffects,
    );

    currentRound.player2Hits = aiHits;
    currentRound.player2Score = aiScore;
    roundData[`round_${session.round}`] = currentRound;

    const aiNewTotal = session.player2_score + aiScore;
    const nextRound = session.round + 1;
    const isLastRound = nextRound > session.max_rounds;

    const updates: Record<string, any> = {
      player2_score: aiNewTotal,
      round_data: JSON.stringify(roundData),
      updated_at: new Date().toISOString(),
    };

    if (isLastRound) {
      updates.status = "complete";
      updates.winner_id =
        newTotal > aiNewTotal ? playerId : newTotal < aiNewTotal ? "ai" : null;
      updates.round = nextRound;
    } else {
      updates.status = "between_rounds";
      updates.round = nextRound;
    }

    await db("arcade_sessions").where({ id: session.id }).update(updates);

    if (isLastRound) {
      return res.json({
        roundScore: totalScore,
        hits,
        opponentRoundScore: aiScore,
        myTotal: newTotal,
        opponentTotal: aiNewTotal,
        gameComplete: true,
        winnerId: updates.winner_id,
      });
    }

    return res.json({
      roundScore: totalScore,
      hits,
      opponentRoundScore: aiScore,
      myTotal: newTotal,
      opponentTotal: aiNewTotal,
      gameComplete: false,
      drinkMenu: getDrinkMenu(),
    });
  }

  // PvP: check if both submitted
  const opponentHitKey = isPlayer1 ? "player2Hits" : "player1Hits";
  if (currentRound[opponentHitKey] && currentRound[opponentHitKey].length > 0) {
    const nextRound = session.round + 1;
    const isLastRound = nextRound > session.max_rounds;
    const oppScoreKey = isPlayer1 ? "player2Score" : "player1Score";

    const p1Total = isPlayer1
      ? newTotal
      : session.player1_score + (currentRound.player1Score || 0);
    const p2Total = isPlayer2
      ? newTotal
      : session.player2_score + (currentRound.player2Score || 0);

    const updates: Record<string, any> = {
      round_data: JSON.stringify(roundData),
      updated_at: new Date().toISOString(),
      round: nextRound,
    };

    if (isLastRound) {
      updates.status = "complete";
      updates.winner_id =
        p1Total > p2Total
          ? session.player1_id
          : p2Total > p1Total
            ? session.player2_id
            : null;
    } else {
      updates.status = "between_rounds";
    }

    await db("arcade_sessions").where({ id: session.id }).update(updates);

    const opponentId = isPlayer1 ? session.player2_id : session.player1_id;
    const roundComplete = {
      round: session.round,
      scores: {
        player1: currentRound.player1Score,
        player2: currentRound.player2Score,
      },
      standings: { player1: p1Total, player2: p2Total },
    };

    notifyPlayer(io, playerId, "arcade:round_complete", roundComplete);
    notifyPlayer(io, opponentId, "arcade:round_complete", roundComplete);

    if (isLastRound) {
      const gameComplete = {
        winnerId: updates.winner_id,
        finalScores: { player1: p1Total, player2: p2Total },
      };
      notifyPlayer(io, playerId, "arcade:game_complete", gameComplete);
      notifyPlayer(io, opponentId, "arcade:game_complete", gameComplete);
    } else {
      const menu = getDrinkMenu();
      notifyPlayer(io, playerId, "arcade:drink_phase", {
        menu,
        timeLimit: ARCADE_CONFIG.DRINK_PHASE_SEC,
      });
      notifyPlayer(io, opponentId, "arcade:drink_phase", {
        menu,
        timeLimit: ARCADE_CONFIG.DRINK_PHASE_SEC,
      });
    }
  } else {
    const opponentId = isPlayer1 ? session.player2_id : session.player1_id;
    notifyPlayer(io, opponentId, "arcade:opponent_score", {
      round: session.round,
      score: totalScore,
    });
  }

  res.json({ roundScore: totalScore, hits });
}

// --- Turret Defense round result handler ---
async function handleTurretDefenseResult(
  req: any,
  res: any,
  session: any,
  playerId: string,
  isPlayer1: boolean,
  isPlayer2: boolean,
) {
  const { turretResult } = req.body;

  if (
    !turretResult ||
    typeof turretResult.wavesCompleted !== "number" ||
    typeof turretResult.enemiesKilled !== "number" ||
    typeof turretResult.baseHPRemaining !== "number"
  ) {
    return res.status(400).json({ error: "Invalid turret defense result" });
  }

  const roundData = JSON.parse(session.round_data || "{}");
  const currentRound = roundData[`round_${session.round}`];
  if (!currentRound || !currentRound.roundConfig) {
    return res.status(400).json({ error: "No round data available" });
  }

  // Resolve drink effects
  const myDrinks = JSON.parse(
    isPlayer1 ? session.player1_drinks : session.player2_drinks,
  );
  const oppDrinks = JSON.parse(
    isPlayer1 ? session.player2_drinks : session.player1_drinks,
  );
  const { selfEffects } = resolveDrinkEffects(myDrinks, oppDrinks);
  const { opponentEffects: effectsOnMe } = resolveDrinkEffects(
    oppDrinks,
    myDrinks,
  );

  const { totalScore, validated } = validateTurretDefenseScore(
    turretResult,
    currentRound.roundConfig,
    selfEffects,
    effectsOnMe,
  );

  if (!validated) {
    return res.status(400).json({ error: "Invalid turret defense score" });
  }

  const scoreKey = isPlayer1 ? "player1Score" : "player2Score";
  const resultKey = isPlayer1 ? "player1Result" : "player2Result";
  currentRound[scoreKey] = totalScore;
  currentRound[resultKey] = turretResult;
  roundData[`round_${session.round}`] = currentRound;

  const cumulativeKey = isPlayer1 ? "player1_score" : "player2_score";
  const newTotal =
    (isPlayer1 ? session.player1_score : session.player2_score) + totalScore;

  await db("arcade_sessions")
    .where({ id: session.id })
    .update({
      [cumulativeKey]: newTotal,
      round_data: JSON.stringify(roundData),
      updated_at: new Date().toISOString(),
    });

  const io = req.app.get("io");
  const isAI = !session.player2_id;

  if (isAI) {
    const aiDifficulty = roundData.aiDifficulty || "medium";
    const aiResult = generateAITurretResult(
      currentRound.roundConfig,
      aiDifficulty,
    );
    const aiScore = aiResult.score;

    currentRound.player2Score = aiScore;
    currentRound.player2Result = aiResult;
    roundData[`round_${session.round}`] = currentRound;

    const aiNewTotal = session.player2_score + aiScore;
    const nextRound = session.round + 1;
    const isLastRound = nextRound > session.max_rounds;

    const updates: Record<string, any> = {
      player2_score: aiNewTotal,
      round_data: JSON.stringify(roundData),
      updated_at: new Date().toISOString(),
    };

    if (isLastRound) {
      updates.status = "complete";
      updates.winner_id =
        newTotal > aiNewTotal ? playerId : newTotal < aiNewTotal ? "ai" : null;
      updates.round = nextRound;
    } else {
      updates.status = "between_rounds";
      updates.round = nextRound;
    }

    await db("arcade_sessions").where({ id: session.id }).update(updates);

    if (isLastRound) {
      return res.json({
        roundScore: totalScore,
        turretResult,
        opponentRoundScore: aiScore,
        opponentResult: aiResult,
        myTotal: newTotal,
        opponentTotal: aiNewTotal,
        gameComplete: true,
        winnerId: updates.winner_id,
      });
    }

    return res.json({
      roundScore: totalScore,
      turretResult,
      opponentRoundScore: aiScore,
      opponentResult: aiResult,
      myTotal: newTotal,
      opponentTotal: aiNewTotal,
      gameComplete: false,
      drinkMenu: getDrinkMenu(),
    });
  }

  // PvP: check if both submitted
  const opponentResultKey = isPlayer1 ? "player2Result" : "player1Result";
  if (currentRound[opponentResultKey]) {
    const nextRound = session.round + 1;
    const isLastRound = nextRound > session.max_rounds;

    const p1Total = isPlayer1
      ? newTotal
      : session.player1_score + (currentRound.player1Score || 0);
    const p2Total = isPlayer2
      ? newTotal
      : session.player2_score + (currentRound.player2Score || 0);

    const updates: Record<string, any> = {
      round_data: JSON.stringify(roundData),
      updated_at: new Date().toISOString(),
      round: nextRound,
    };

    if (isLastRound) {
      updates.status = "complete";
      updates.winner_id =
        p1Total > p2Total
          ? session.player1_id
          : p2Total > p1Total
            ? session.player2_id
            : null;
    } else {
      updates.status = "between_rounds";
    }

    await db("arcade_sessions").where({ id: session.id }).update(updates);

    const opponentId = isPlayer1 ? session.player2_id : session.player1_id;
    const roundComplete = {
      round: session.round,
      scores: {
        player1: currentRound.player1Score,
        player2: currentRound.player2Score,
      },
      standings: { player1: p1Total, player2: p2Total },
    };

    notifyPlayer(io, playerId, "arcade:round_complete", roundComplete);
    notifyPlayer(io, opponentId, "arcade:round_complete", roundComplete);

    if (isLastRound) {
      const gameComplete = {
        winnerId: updates.winner_id,
        finalScores: { player1: p1Total, player2: p2Total },
      };
      notifyPlayer(io, playerId, "arcade:game_complete", gameComplete);
      notifyPlayer(io, opponentId, "arcade:game_complete", gameComplete);
    } else {
      const menu = getDrinkMenu();
      notifyPlayer(io, playerId, "arcade:drink_phase", {
        menu,
        timeLimit: ARCADE_CONFIG.DRINK_PHASE_SEC,
      });
      notifyPlayer(io, opponentId, "arcade:drink_phase", {
        menu,
        timeLimit: ARCADE_CONFIG.DRINK_PHASE_SEC,
      });
    }
  } else {
    const opponentId = isPlayer1 ? session.player2_id : session.player1_id;
    notifyPlayer(io, opponentId, "arcade:opponent_score", {
      round: session.round,
      score: totalScore,
    });
  }

  res.json({ roundScore: totalScore, turretResult });
}

// Select a drink between rounds
router.post("/session/:id/drink", requireAuth, async (req, res) => {
  const playerId = req.session.playerId!;
  const { drinkId } = req.body;

  if (!drinkId) {
    return res.status(400).json({ error: "drinkId required" });
  }

  const session = await db("arcade_sessions")
    .where({ id: req.params.id })
    .first();

  if (!session || session.status !== "between_rounds") {
    return res.status(400).json({ error: "Not in drink phase" });
  }

  const isPlayer1 = session.player1_id === playerId;
  if (!isPlayer1 && session.player2_id !== playerId) {
    return res.status(403).json({ error: "Not in this session" });
  }

  const drinksKey = isPlayer1 ? "player1_drinks" : "player2_drinks";
  const currentDrinks = JSON.parse(
    isPlayer1 ? session.player1_drinks : session.player2_drinks,
  );
  currentDrinks.push(drinkId);

  await db("arcade_sessions")
    .where({ id: session.id })
    .update({
      [drinksKey]: JSON.stringify(currentDrinks),
      updated_at: new Date().toISOString(),
    });

  // For AI matches, pick AI drink and start next round
  const isAI = !session.player2_id;
  if (isAI) {
    const aiDrink = chooseAIDrink();
    const aiDrinks = JSON.parse(session.player2_drinks);
    aiDrinks.push(aiDrink);

    const { selfEffects: p1Self } = resolveDrinkEffects(
      currentDrinks,
      aiDrinks,
    );
    const { selfEffects: p2Self, opponentEffects: p2OnP1 } =
      resolveDrinkEffects(aiDrinks, currentDrinks);

    const roundData = JSON.parse(session.round_data || "{}");

    if (session.game_type === "turret_defense") {
      const roundConfig = generateTurretRoundConfig(session.round, p1Self, [
        ...p2Self,
        ...p2OnP1,
      ]);

      roundData[`round_${session.round}`] = {
        roundConfig,
        player1Score: 0,
        player2Score: 0,
      };

      await db("arcade_sessions")
        .where({ id: session.id })
        .update({
          player2_drinks: JSON.stringify(aiDrinks),
          status: "playing",
          round_data: JSON.stringify(roundData),
          updated_at: new Date().toISOString(),
        });

      return res.json({
        ok: true,
        roundStart: {
          round: session.round,
          roundConfig,
          effects: p1Self,
        },
      });
    }

    // Asteroid mining
    const sweetSpotPositions = generateSweetSpotPositions(
      ARCADE_CONFIG.HITS_PER_ROUND,
    );
    const barSpeed = calculateBarSpeed(p1Self, [...p2Self, ...p2OnP1]);

    roundData[`round_${session.round}`] = {
      sweetSpotPositions,
      barSpeed,
      player1Hits: [],
      player2Hits: [],
      player1Score: 0,
      player2Score: 0,
    };

    await db("arcade_sessions")
      .where({ id: session.id })
      .update({
        player2_drinks: JSON.stringify(aiDrinks),
        status: "playing",
        round_data: JSON.stringify(roundData),
        updated_at: new Date().toISOString(),
      });

    return res.json({
      ok: true,
      roundStart: {
        round: session.round,
        sweetSpotPositions,
        barSpeed,
        effects: p1Self,
      },
    });
  }

  res.json({ ok: true });
});

// Start the next round (both players ready)
router.post("/session/:id/start-round", requireAuth, async (req, res) => {
  const playerId = req.session.playerId!;
  const session = await db("arcade_sessions")
    .where({ id: req.params.id })
    .first();

  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  if (session.status !== "lobby" && session.status !== "between_rounds") {
    return res
      .status(400)
      .json({ error: "Cannot start round in current state" });
  }

  const isPlayer1 = session.player1_id === playerId;
  if (!isPlayer1 && session.player2_id !== playerId) {
    return res.status(403).json({ error: "Not in this session" });
  }

  const p1Drinks = JSON.parse(session.player1_drinks);
  const p2Drinks = JSON.parse(session.player2_drinks);
  const { selfEffects: p1Self } = resolveDrinkEffects(p1Drinks, p2Drinks);
  const { selfEffects: p2Self } = resolveDrinkEffects(p2Drinks, p1Drinks);
  const { opponentEffects: p2OnP1 } = resolveDrinkEffects(p2Drinks, p1Drinks);
  const { opponentEffects: p1OnP2 } = resolveDrinkEffects(p1Drinks, p2Drinks);

  const round = session.round || 1;
  const roundData = JSON.parse(session.round_data || "{}");
  const io = req.app.get("io");

  if (session.game_type === "turret_defense") {
    const p1RoundConfig = generateTurretRoundConfig(round, p1Self, [
      ...p2Self,
      ...p2OnP1,
    ]);
    const p2RoundConfig = generateTurretRoundConfig(round, p2Self, [
      ...p1Self,
      ...p1OnP2,
    ]);

    // Store canonical config (p1's perspective for storage)
    roundData[`round_${round}`] = {
      roundConfig: p1RoundConfig,
      player1Score: 0,
      player2Score: 0,
    };

    await db("arcade_sessions")
      .where({ id: session.id })
      .update({
        status: "playing",
        round: round,
        round_data: JSON.stringify(roundData),
        updated_at: new Date().toISOString(),
      });

    notifyPlayer(io, session.player1_id, "arcade:round_start", {
      round,
      roundConfig: p1RoundConfig,
      effects: p1Self,
    });

    if (session.player2_id) {
      notifyPlayer(io, session.player2_id, "arcade:round_start", {
        round,
        roundConfig: p2RoundConfig,
        effects: p2Self,
      });
    }

    return res.json({
      round,
      roundConfig: isPlayer1 ? p1RoundConfig : p2RoundConfig,
    });
  }

  // Asteroid mining
  const sweetSpotPositions = generateSweetSpotPositions(
    ARCADE_CONFIG.HITS_PER_ROUND,
  );

  roundData[`round_${round}`] = {
    sweetSpotPositions,
    barSpeed: ARCADE_CONFIG.BASE_BAR_SPEED,
    player1Hits: [],
    player2Hits: [],
    player1Score: 0,
    player2Score: 0,
  };

  await db("arcade_sessions")
    .where({ id: session.id })
    .update({
      status: "playing",
      round: round,
      round_data: JSON.stringify(roundData),
      updated_at: new Date().toISOString(),
    });

  const p1BarSpeed = calculateBarSpeed(p1Self, p2OnP1);
  const p2BarSpeed = calculateBarSpeed(p2Self, p1OnP2);

  notifyPlayer(io, session.player1_id, "arcade:round_start", {
    round,
    sweetSpotPositions,
    barSpeed: p1BarSpeed,
    effects: p1Self,
  });

  if (session.player2_id) {
    notifyPlayer(io, session.player2_id, "arcade:round_start", {
      round,
      sweetSpotPositions,
      barSpeed: p2BarSpeed,
      effects: p2Self,
    });
  }

  res.json({
    round,
    sweetSpotPositions,
    barSpeed: isPlayer1 ? p1BarSpeed : p2BarSpeed,
  });
});

export default router;
