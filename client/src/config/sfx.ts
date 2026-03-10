// Sound effect definitions — all CC0 from Kenney.nl
// Each key maps to a game action, with one or more file variants

export interface SfxDef {
  src: string[]; // multiple variants for randomization
  volume: number; // 0-1 base volume
}

const SFX_BASE = "/audio/sfx/";

const sfx = (files: string[], volume = 0.5): SfxDef => ({
  src: files.map((f) => `${SFX_BASE}${f}`),
  volume,
});

// ── UI ──────────────────────────────────────────────
export const SFX = {
  click: sfx(["click.ogg"], 0.3),
  select: sfx(["select.ogg"], 0.3),
  tab_switch: sfx(["tab_switch.ogg"], 0.3),
  panel_open: sfx(["panel_open.ogg"], 0.3),
  panel_close: sfx(["panel_close.ogg"], 0.3),
  confirm: sfx(["confirm.ogg"], 0.5),
  success: sfx(["success.ogg"], 0.5),
  error: sfx(["error.ogg"], 0.4),
  denied: sfx(["denied.ogg"], 0.4),
  notification: sfx(["notification.ogg"], 0.4),
  toast: sfx(["toast.ogg"], 0.4),
  alert: sfx(["alert.ogg"], 0.5),
  tick: sfx(["tick.ogg"], 0.2),
  scroll: sfx(["scroll.ogg"], 0.2),

  // ── Navigation ──────────────────────────────────────
  warp: sfx(["warp.ogg"], 0.5),
  dock: sfx(["dock.ogg"], 0.5),
  undock: sfx(["undock.ogg"], 0.5),
  thruster: sfx(["thruster.ogg"], 0.4),
  scan: sfx(["scan.ogg"], 0.4),

  // ── Combat ──────────────────────────────────────────
  laser_fire: sfx(["laser_fire_1.ogg", "laser_fire_2.ogg"], 0.5),
  laser_heavy: sfx(["laser_heavy.ogg"], 0.5),
  laser_retro: sfx(["laser_retro.ogg"], 0.5),
  hit: sfx(["hit_1.ogg", "hit_2.ogg", "hit_3.ogg"], 0.5),
  explosion: sfx(["explosion_1.ogg", "explosion_2.ogg"], 0.6),
  explosion_deep: sfx(["explosion_deep.ogg"], 0.6),
  shield: sfx(["shield.ogg"], 0.4),
  shield_down: sfx(["shield_down.ogg"], 0.5),

  // ── Economy / Missions ─────────────────────────────
  trade: sfx(["trade.ogg"], 0.4),
  cargo_load: sfx(["cargo_load.ogg"], 0.4),
  level_up: sfx(["level_up.ogg"], 0.6),
  quest: sfx(["quest.ogg"], 0.5),
} as const;

export type SfxId = keyof typeof SFX;
