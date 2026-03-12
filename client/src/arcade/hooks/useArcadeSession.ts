import { useState, useEffect, useCallback, useRef } from "react";
import {
  startAIMatch,
  submitRoundResult,
  submitTurretResult,
  selectDrink,
  startRound,
  claimReward,
  challengePlayer,
  acceptChallenge,
  declineChallenge,
  getTokenBalance,
} from "../services/arcade-api";
import { setupArcadeListeners } from "../services/arcade-socket";

export type ArcadePhase =
  | "menu"
  | "matchmaking"
  | "playing"
  | "between_rounds"
  | "results"
  | "shop";

interface SessionState {
  sessionId: string | null;
  opponent: { id: string | null; username: string } | null;
  isPlayer1: boolean;
  round: number;
  maxRounds: number;
  myScore: number;
  opponentScore: number;
  winnerId: string | null;
  rewardClaimed: boolean;
  gameType: string;
}

interface RoundStartData {
  round: number;
  sweetSpotPositions?: number[];
  barSpeed?: number;
  roundConfig?: any;
  effects: any[];
}

interface PendingChallenge {
  challengeId: string;
  challengerName: string;
  gameType: string;
}

export function useArcadeSession(
  on: (event: string, handler: (...args: any[]) => void) => () => void,
  emit: (event: string, data: any) => void,
  _playerId: string | null,
) {
  const [phase, setPhase] = useState<ArcadePhase>("menu");
  const [session, setSession] = useState<SessionState>({
    sessionId: null,
    opponent: null,
    isPlayer1: true,
    round: 0,
    maxRounds: 3,
    myScore: 0,
    opponentScore: 0,
    winnerId: null,
    rewardClaimed: false,
    gameType: "asteroid_mining",
  });
  const [roundStart, setRoundStart] = useState<RoundStartData | null>(null);
  const [pendingChallenge, setPendingChallenge] =
    useState<PendingChallenge | null>(null);
  const [drinkMenu, setDrinkMenu] = useState<any[]>([]);
  const [roundResults, setRoundResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState(0);
  const challengeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load token balance on mount
  useEffect(() => {
    getTokenBalance()
      .then((r) => setTokenBalance(r.balance))
      .catch(() => {});
  }, []);

  // Socket listeners
  useEffect(() => {
    const cleanup = setupArcadeListeners(on, {
      onChallenge: (data) => {
        setPendingChallenge(data);
      },
      onChallengeResponse: (data) => {
        if (data.accepted && data.sessionId) {
          setSession((s) => ({ ...s, sessionId: data.sessionId! }));
          setPhase("playing");
        } else {
          setPhase("menu");
          setError("Challenge declined");
        }
        if (challengeTimerRef.current) {
          clearTimeout(challengeTimerRef.current);
          challengeTimerRef.current = null;
        }
      },
      onSessionStart: (data) => {
        setSession((s) => ({
          ...s,
          sessionId: data.sessionId,
          opponent: data.opponent,
          isPlayer1: data.isPlayer1,
          gameType: data.gameType,
        }));
        setPhase("playing");
        emit("arcade:ready", { sessionId: data.sessionId });
      },
      onRoundStart: (data) => {
        setRoundStart(data);
        setSession((s) => ({ ...s, round: data.round }));
        setPhase("playing");
      },
      onOpponentScore: () => {},
      onRoundComplete: (data) => {
        setRoundResults((prev) => [...prev, data]);
        setSession((s) => ({
          ...s,
          myScore: s.isPlayer1
            ? data.standings.player1
            : data.standings.player2,
          opponentScore: s.isPlayer1
            ? data.standings.player2
            : data.standings.player1,
        }));
      },
      onDrinkPhase: (data) => {
        setDrinkMenu(data.menu);
        setPhase("between_rounds");
      },
      onGameComplete: (data) => {
        setSession((s) => ({
          ...s,
          winnerId: data.winnerId,
          myScore: s.isPlayer1
            ? data.finalScores.player1
            : data.finalScores.player2,
          opponentScore: s.isPlayer1
            ? data.finalScores.player2
            : data.finalScores.player1,
        }));
        setPhase("results");
      },
    });

    return cleanup;
  }, [on, emit]);

  const handlePlayAI = useCallback(
    async (difficulty = "medium", gameType = "asteroid_mining") => {
      try {
        setError(null);
        console.log("[ARCADE] handlePlayAI args:", { difficulty, gameType });
        const result = await startAIMatch(gameType, difficulty);
        console.log("[ARCADE] startAIMatch result:", result);
        setSession((s) => ({
          ...s,
          sessionId: result.sessionId,
          opponent: result.opponent,
          isPlayer1: result.isPlayer1,
          gameType: result.gameType,
        }));
        setPhase("playing");
        emit("arcade:ready", { sessionId: result.sessionId });
        const roundData = await startRound(result.sessionId);
        console.log("[ARCADE] startRound result:", roundData);
        setRoundStart(roundData);
        setSession((s) => ({ ...s, round: roundData.round }));
      } catch (err: any) {
        setError(err.response?.data?.error || "Failed to start AI match");
      }
    },
    [emit],
  );

  const handleChallenge = useCallback(
    async (targetId: string, gameType = "asteroid_mining") => {
      try {
        setError(null);
        await challengePlayer(targetId, gameType);
        setPhase("matchmaking");
        challengeTimerRef.current = setTimeout(() => {
          setPhase("menu");
          setError("Challenge expired");
        }, 60000);
      } catch (err: any) {
        setError(err.response?.data?.error || "Failed to send challenge");
      }
    },
    [],
  );

  const handleAcceptChallenge = useCallback(async (challengeId: string) => {
    try {
      setError(null);
      await acceptChallenge(challengeId);
      setPendingChallenge(null);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to accept");
    }
  }, []);

  const handleDeclineChallenge = useCallback(async (challengeId: string) => {
    try {
      await declineChallenge(challengeId);
      setPendingChallenge(null);
    } catch {
      setPendingChallenge(null);
    }
  }, []);

  const handleSubmitHits = useCallback(
    async (hitTimings: number[]) => {
      if (!session.sessionId) return null;
      try {
        const result = await submitRoundResult(session.sessionId, hitTimings);
        if (result.gameComplete) {
          setSession((s) => ({
            ...s,
            myScore: result.myTotal,
            opponentScore: result.opponentTotal,
            winnerId: result.winnerId,
          }));
          setPhase("results");
        } else if (result.drinkMenu) {
          setDrinkMenu(result.drinkMenu);
          setSession((s) => ({
            ...s,
            myScore: result.myTotal,
            opponentScore: result.opponentTotal,
          }));
          setPhase("between_rounds");
        }
        return result;
      } catch (err: any) {
        setError(err.response?.data?.error || "Failed to submit round");
        return null;
      }
    },
    [session.sessionId],
  );

  const handleSubmitTurretResult = useCallback(
    async (turretResult: {
      wavesCompleted: number;
      enemiesKilled: number;
      baseHPRemaining: number;
    }) => {
      if (!session.sessionId) return null;
      try {
        const result = await submitTurretResult(
          session.sessionId,
          turretResult,
        );
        if (result.gameComplete) {
          setSession((s) => ({
            ...s,
            myScore: result.myTotal,
            opponentScore: result.opponentTotal,
            winnerId: result.winnerId,
          }));
          setPhase("results");
        } else if (result.drinkMenu) {
          setDrinkMenu(result.drinkMenu);
          setSession((s) => ({
            ...s,
            myScore: result.myTotal,
            opponentScore: result.opponentTotal,
          }));
          setPhase("between_rounds");
        }
        return result;
      } catch (err: any) {
        setError(err.response?.data?.error || "Failed to submit round");
        return null;
      }
    },
    [session.sessionId],
  );

  const handleSelectDrink = useCallback(
    async (drinkId: string) => {
      if (!session.sessionId) return;
      try {
        const result = await selectDrink(session.sessionId, drinkId);
        if (result.roundStart) {
          setRoundStart(result.roundStart);
          setSession((s) => ({ ...s, round: result.roundStart.round }));
          setPhase("playing");
        }
      } catch (err: any) {
        setError(err.response?.data?.error || "Failed to select drink");
      }
    },
    [session.sessionId],
  );

  const handleClaimReward = useCallback(async () => {
    if (!session.sessionId) return null;
    try {
      const result = await claimReward(session.sessionId);
      setSession((s) => ({ ...s, rewardClaimed: true }));
      if (result.tokens) {
        setTokenBalance((b) => b + result.tokens);
      }
      return result;
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to claim reward");
      return null;
    }
  }, [session.sessionId]);

  const handleRematch = useCallback(() => {
    setPhase("menu");
    setSession({
      sessionId: null,
      opponent: null,
      isPlayer1: true,
      round: 0,
      maxRounds: 3,
      myScore: 0,
      opponentScore: 0,
      winnerId: null,
      rewardClaimed: false,
      gameType: "asteroid_mining",
    });
    setRoundStart(null);
    setDrinkMenu([]);
    setRoundResults([]);
    setError(null);
  }, []);

  const handleOpenShop = useCallback(() => {
    setPhase("shop");
  }, []);

  const handleCloseShop = useCallback(() => {
    setPhase("menu");
  }, []);

  return {
    phase,
    session,
    roundStart,
    pendingChallenge,
    drinkMenu,
    roundResults,
    error,
    tokenBalance,
    setTokenBalance,
    handlePlayAI,
    handleChallenge,
    handleAcceptChallenge,
    handleDeclineChallenge,
    handleSubmitHits,
    handleSubmitTurretResult,
    handleSelectDrink,
    handleClaimReward,
    handleRematch,
    handleOpenShop,
    handleCloseShop,
  };
}
