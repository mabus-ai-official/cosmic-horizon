/** Shared types for the planet explorer canvas engine */

export interface Vec2 {
  x: number;
  y: number;
}

export interface WorldSnapshot {
  tick: number;
  players: SnapshotPlayer[];
  mobs: SnapshotMob[];
  drops: SnapshotDrop[];
  landingPad: Vec2;
}

export interface SnapshotPlayer {
  id: string;
  name: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  level: number;
  role: string;
  facing: string;
  attacking: boolean;
  mining: boolean;
  dead: boolean;
  spriteId: string;
}

export interface SnapshotMob {
  id: string;
  name: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  level: number;
  isElite: boolean;
  isBoss: boolean;
  spriteId: string;
}

export interface SnapshotDrop {
  id: string;
  x: number;
  y: number;
  itemId: string;
  quantity: number;
}

export interface ChunkData {
  key: string;
  cx: number;
  cy: number;
  tiles: number[][];
  heights: number[][];
}

export interface BiomeInfo {
  id: string;
  name: string;
  groundColor: string;
  accentColor: string;
  fogColor: string;
}

export interface InputFrame {
  dx: number;
  dy: number;
  attack: boolean;
  mine: boolean;
  skill: number; // 0-3, -1 = none
}

export interface WorldEvent {
  type: string;
  data: Record<string, unknown>;
}

export interface SessionLootItem {
  itemId: string;
  quantity: number;
}
