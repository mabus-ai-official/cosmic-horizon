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

  // Token rewards
  WINNER_TOKENS: 50,
  LOSER_TOKENS: 15,
  DRAW_TOKENS: 30,

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

  // Turret Defense
  TURRET_DEFENSE: {
    WAVES_PER_ROUND: 5,
    BASE_HP: 20,
    STARTING_CURRENCY: 300,
    KILL_REWARD: 10,
    WAVE_BONUS: 50,
    // Wave scaling
    BASE_ENEMY_COUNT: 5,
    ENEMY_COUNT_SCALE: 3,
    BASE_ENEMY_HP: 1,
    ENEMY_HP_SCALE: 0.5,
    BASE_ENEMY_SPEED: 1.0,
    ENEMY_SPEED_SCALE: 0.1,
    // Turret types
    TURRETS: {
      basic: { cost: 100, damage: 1, range: 120, fireRate: 1.0 },
      splash: {
        cost: 250,
        damage: 2,
        range: 100,
        fireRate: 1.5,
        splashRadius: 60,
      },
      slow: {
        cost: 200,
        damage: 0,
        range: 150,
        fireRate: 0.5,
        slowFactor: 0.5,
      },
      sniper: { cost: 400, damage: 5, range: 200, fireRate: 2.5 },
    },
    // Score calc
    SCORE_PER_KILL: 10,
    SCORE_PER_WAVE: 100,
    SCORE_PER_HP: 25,
  },

  // Nebula Runner
  NEBULA_RUNNER: {
    ROUND_DURATION_SEC: 30,
    BASE_SCROLL_SPEED: 200,
    MIN_SCROLL_SPEED: 120,
    MAX_SCROLL_SPEED: 350,
    SHIP_HITBOX_RADIUS: 12,
    MIN_HITBOX_RADIUS: 6,
    MAX_HITBOX_RADIUS: 24,
    LIVES: 3,
    BASE_OBSTACLE_INTERVAL: 0.8,
    MIN_OBSTACLE_INTERVAL: 0.3,
    ASTEROID_SIZES: [16, 24, 32, 40],
    ASTEROID_SPEED_VARIANCE: 0.3,
    CRYSTAL_INTERVAL: 1.2,
    CRYSTAL_VALUE: 50,
    DISTANCE_POINTS_PER_SEC: 10,
    NEAR_MISS_THRESHOLD: 8,
    NEAR_MISS_BONUS: 25,
    CRYSTAL_MULTIPLIER_DEFAULT: 1,
    MAX_CRYSTALS_PER_ROUND: 30,
    MAX_NEAR_MISSES_PER_ROUND: 50,
    KILL_BONUS: 75,
    MAX_ASTEROIDS_DESTROYED: 40,
  },

  // Cargo Tetris
  CARGO_TETRIS: {
    ROUND_DURATIONS: [120, 90, 60] as readonly number[],
    BOARD_WIDTH: 10,
    BOARD_HEIGHT: 20,
    BASE_DROP_INTERVAL: 800,
    MIN_DROP_INTERVAL: 100,
    MAX_DROP_INTERVAL: 2000,
    SPEED_INCREASE: 5,
    DROP_INTERVAL_RAMP: 50,
    POINTS_PER_LINE: 100,
    POINTS_PER_PIECE: 10,
    MAX_LINES_PER_ROUND: 40,
    MAX_PIECES_PER_ROUND: 80,
    // Solo level-based mode
    LINES_PER_LEVEL: 10,
    SOLO_LEVEL_DROP_RAMP: 60,
    SOLO_MIN_CREDITS_LEVEL: 5,
    SOLO_BASE_CREDITS: 50,
    SOLO_CREDITS_PER_LEVEL: 25,
  },
} as const;

export type GameType =
  | "asteroid_mining"
  | "turret_defense"
  | "nebula_runner"
  | "cargo_tetris";
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

export interface TurretDefenseResult {
  wavesCompleted: number;
  enemiesKilled: number;
  baseHPRemaining: number;
  score: number;
}

export interface TurretRoundConfig {
  waves: {
    enemyCount: number;
    enemyHP: number;
    enemySpeed: number;
  }[];
  startingCurrency: number;
  baseHP: number;
  turrets: typeof ARCADE_CONFIG.TURRET_DEFENSE.TURRETS;
}

export type TurretType = "basic" | "splash" | "slow" | "sniper";

export interface NebulaRunnerResult {
  crystalsCollected: number;
  distanceSurvived: number;
  nearMisses: number;
  livesRemaining: number;
  asteroidsDestroyed: number;
  score: number;
}

export interface NebulaRoundConfig {
  seed: number;
  scrollSpeed: number;
  hitboxRadius: number;
  crystalMultiplier: number;
  obstacleDensity: number;
  roundDuration: number;
}

export interface CargoTetrisResult {
  linesCleared: number;
  piecesPlaced: number;
  score: number;
}

export interface CargoTetrisRoundConfig {
  seed: number;
  dropInterval: number;
  speedIncrease: number;
  roundDuration: number;
}
