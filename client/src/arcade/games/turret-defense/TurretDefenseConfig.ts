export const TD_CONFIG = {
  // Canvas
  FIELD_X: 50,
  FIELD_Y: 50,
  FIELD_WIDTH: 700,
  FIELD_HEIGHT: 400,
  CELL_SIZE: 32,

  // Path waypoints (normalized 0-1, scaled to field)
  PATH_WAYPOINTS: [
    { x: 0, y: 0.2 },
    { x: 0.35, y: 0.2 },
    { x: 0.35, y: 0.8 },
    { x: 0.65, y: 0.8 },
    { x: 0.65, y: 0.2 },
    { x: 1.0, y: 0.2 },
  ],

  // Visual
  PATH_COLOR: 0x2d333b,
  PATH_WIDTH: 28,
  PATH_BORDER_COLOR: 0x4a2a55,
  GRID_COLOR: 0x1a1e24,
  GRID_ALPHA: 0.3,

  TURRET_COLORS: {
    basic: 0x3fb950,
    splash: 0xd29922,
    slow: 0x56d4dd,
    sniper: 0xf85149,
  } as Record<string, number>,

  ENEMY_COLOR: 0xff6b6b,
  ENEMY_RADIUS: 6,
  BASE_COLOR: 0x3fb950,
  PROJECTILE_RADIUS: 3,
  PROJECTILE_SPEED: 400,

  // Timing
  SPAWN_INTERVAL_MS: 600,
  WAVE_DELAY_MS: 3000,
  INITIAL_PLACEMENT_MS: 8000,

  // Turret visuals
  TURRET_RADIUS: 10,
  RANGE_ALPHA: 0.08,
} as const;
