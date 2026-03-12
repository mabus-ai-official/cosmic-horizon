export const ARCADE_CONFIG = {
  // Round settings
  MAX_ROUNDS: 3,
  HITS_PER_ROUND: 5,
  CHALLENGE_TIMEOUT_SEC: 60,
  DRINK_PHASE_SEC: 15,
  DISCONNECT_FORFEIT_SEC: 30,

  // Scanner bar
  BASE_BAR_SPEED: 2.5,
  MIN_BAR_SPEED: 1.5,
  MAX_BAR_SPEED: 4.0,

  // Sweet spot scoring
  PERFECT_THRESHOLD: 0.05,
  GOOD_THRESHOLD: 0.15,
  PERFECT_SCORE: 200,
  GOOD_BASE_SCORE: 50,
  GOOD_MAX_SCORE: 180,
  MISS_MAX_SCORE: 10,

  // Sweet spot sizes (fraction of bar width)
  BASE_SWEET_SPOT_WIDTH: 0.08,
  MIN_SWEET_SPOT_WIDTH: 0.04,
  MAX_SWEET_SPOT_WIDTH: 0.14,

  // Rewards
  WINNER_CREDITS: 500,
  WINNER_XP: 150,
  LOSER_CREDITS: 100,
  LOSER_XP: 50,
  AI_REWARD_MULTIPLIER: 0.5,

  // AI difficulty
  AI_DIFFICULTY: {
    easy: { accuracyMean: 0.2, accuracyStdDev: 0.15 },
    medium: { accuracyMean: 0.1, accuracyStdDev: 0.1 },
    hard: { accuracyMean: 0.05, accuracyStdDev: 0.06 },
  },

  // Drink effect magnitudes
  DRINK_EFFECTS: {
    speed_boost: 0.8,
    slow_down: 1.4,
    accuracy_up: 1.3,
    accuracy_down: 0.7,
    sabotage: 0.5,
    double_or_nothing: 2.0,
    phantom_count: 3,
  },
} as const;

export type GameType = "asteroid_mining";
export type SessionStatus = "lobby" | "playing" | "between_rounds" | "complete";
export type ChallengeStatus = "pending" | "accepted" | "declined" | "expired";
export type AIDifficulty = "easy" | "medium" | "hard";

export type DrinkEffectType =
  | "speed_boost"
  | "slow_down"
  | "accuracy_up"
  | "accuracy_down"
  | "sabotage"
  | "mirror"
  | "double_or_nothing"
  | "phantom_zone";

export interface DrinkEffect {
  type: DrinkEffectType;
  targetSelf: boolean;
  magnitude: number;
}

export interface RoundState {
  sweetSpotPositions: number[];
  barSpeed: number;
  player1Hits: number[];
  player2Hits: number[];
  player1Score: number;
  player2Score: number;
}
