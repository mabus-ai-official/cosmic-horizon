type SocketOn = (
  event: string,
  handler: (...args: any[]) => void,
) => () => void;

export interface ArcadeSocketEvents {
  onChallenge?: (data: {
    challengeId: string;
    challengerName: string;
    gameType: string;
  }) => void;
  onChallengeResponse?: (data: {
    challengeId: string;
    accepted: boolean;
    sessionId?: string;
  }) => void;
  onSessionStart?: (data: {
    sessionId: string;
    opponent: { id: string | null; username: string };
    gameType: string;
    isPlayer1: boolean;
  }) => void;
  onRoundStart?: (data: {
    round: number;
    sweetSpotPositions: number[];
    barSpeed: number;
    effects: any[];
  }) => void;
  onOpponentScore?: (data: { round: number; score: number }) => void;
  onRoundComplete?: (data: {
    round: number;
    scores: { player1: number; player2: number };
    standings: { player1: number; player2: number };
  }) => void;
  onDrinkPhase?: (data: { menu: any[]; timeLimit: number }) => void;
  onGameComplete?: (data: {
    winnerId: string | null;
    finalScores: { player1: number; player2: number };
    forfeit?: boolean;
  }) => void;
}

export function setupArcadeListeners(
  on: SocketOn,
  handlers: ArcadeSocketEvents,
): () => void {
  const unsubs: (() => void)[] = [];

  if (handlers.onChallenge) {
    unsubs.push(on("arcade:challenge", handlers.onChallenge));
  }
  if (handlers.onChallengeResponse) {
    unsubs.push(on("arcade:challenge_response", handlers.onChallengeResponse));
  }
  if (handlers.onSessionStart) {
    unsubs.push(on("arcade:session_start", handlers.onSessionStart));
  }
  if (handlers.onRoundStart) {
    unsubs.push(on("arcade:round_start", handlers.onRoundStart));
  }
  if (handlers.onOpponentScore) {
    unsubs.push(on("arcade:opponent_score", handlers.onOpponentScore));
  }
  if (handlers.onRoundComplete) {
    unsubs.push(on("arcade:round_complete", handlers.onRoundComplete));
  }
  if (handlers.onDrinkPhase) {
    unsubs.push(on("arcade:drink_phase", handlers.onDrinkPhase));
  }
  if (handlers.onGameComplete) {
    unsubs.push(on("arcade:game_complete", handlers.onGameComplete));
  }

  return () => unsubs.forEach((u) => u());
}
