export const CT_CONFIG = {
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 500,

  // Board
  CELL_SIZE: 22,
  BOARD_X: 140,
  BOARD_Y: 20,
  BOARD_WIDTH: 10,
  BOARD_HEIGHT: 20,

  // Piece colors
  COLORS: {
    I: 0x56d4dd, // cyan
    O: 0xd29922, // yellow
    T: 0xa371f7, // purple
    S: 0x3fb950, // green
    Z: 0xf85149, // red
    L: 0xd18616, // orange
    J: 0x388bfd, // blue
  } as Record<string, number>,

  // Piece textures (loaded in preload)
  PIECE_TEXTURES: {
    I: "ct_block_cyan",
    O: "ct_block_orange",
    T: "ct_block_purple",
    S: "ct_block_green",
    Z: "ct_block_red",
    L: "ct_block_orange",
    J: "ct_block_darkblue",
  } as Record<string, string>,

  // Sprite source size and derived scales
  SPRITE_SIZE: 40,
  CELL_SCALE: 22 / 40, // CELL_SIZE / SPRITE_SIZE = 0.55
  PREVIEW_SCALE: 18 / 40, // PREVIEW_CELL / SPRITE_SIZE = 0.45

  GHOST_ALPHA: 0.2,
  GRID_COLOR: 0x21262d,
  BORDER_COLOR: 0x30363d,

  // Preview area
  PREVIEW_X: 440,
  PREVIEW_Y: 60,
  PREVIEW_CELL: 18,
  PREVIEW_COUNT: 3,
  PREVIEW_GAP: 70,

  // Controls hint
  HINT_X: 440,
  HINT_Y: 320,

  // Lock delay
  LOCK_DELAY_MS: 500,

  // DAS (Delayed Auto Shift)
  DAS_INITIAL_MS: 170,
  DAS_REPEAT_MS: 50,

  // Timing
  ROUND_DURATION_SEC: 60,
  COUNTDOWN_SEC: 3,

  // Scoring
  POINTS_PER_LINE: 100,
  POINTS_PER_PIECE: 10,

  // Solo level-based mode
  LINES_PER_LEVEL: 10,
  SOLO_LEVEL_DROP_RAMP: 60,

  FONT: '"IBM Plex Mono", monospace',
} as const;
