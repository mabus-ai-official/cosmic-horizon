export const MINING_CONFIG = {
  // Play area
  FIELD_X: 50,
  FIELD_Y: 80,
  FIELD_WIDTH: 700,
  FIELD_HEIGHT: 340,

  // Scanner bar
  BAR_WIDTH: 4,
  BAR_COLOR: 0x3fb950,
  BAR_GLOW_COLOR: 0x56d4dd,

  // Ore deposits (sweet spots)
  DEPOSIT_HEIGHT: 300,
  DEPOSIT_PERFECT_COLOR: 0x3fb950,
  DEPOSIT_GOOD_COLOR: 0xe847a0,
  DEPOSIT_PULSE_SPEED: 1500,

  // Feedback text
  PERFECT_COLOR: "#3fb950",
  GOOD_COLOR: "#d29922",
  MISS_COLOR: "#f85149",

  // Timing
  HIT_FEEDBACK_DURATION: 800,
  HITS_PER_ROUND: 5,
} as const;
