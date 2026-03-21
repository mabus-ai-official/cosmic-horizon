/**
 * Planet World Engine — core simulation for top-down 2D planet exploration.
 *
 * Each planet instance runs one PlanetWorld. The world is chunk-based:
 * chunks generate procedurally using a seeded RNG (planet DB ID as seed).
 * Mob AI, combat, mining, and item pickup are all handled here.
 * State is broadcast at 20Hz to all connected players via socket.io.
 */

import {
  BiomeConfig,
  DifficultyTier,
  getBiomeConfig,
  getDifficultyTier,
} from "./planet-types-map";
import {
  EnemyDefinition,
  getEnemyPool,
  getElitePool,
  getBoss,
  scaleEnemyStats,
  LootEntry,
} from "./planet-enemies";
import { calculateSoulBonuses, xpForLevel } from "./planet-soul-tree";

// ── Constants ──────────────────────────────────────────────
export const TILE_SIZE = 32; // pixels per tile
export const CHUNK_SIZE = 16; // tiles per chunk edge
export const CHUNK_PX = CHUNK_SIZE * TILE_SIZE;
export const LANDING_PAD_RADIUS = 3; // tiles around pad center for extraction

// Tile type enum
export enum TileType {
  Grass = 0,
  Sand = 1,
  Stone = 2,
  Water = 3,
  Snow = 4,
  Ice = 5,
  Lava = 6,
  Crystal = 7,
  Ore = 8,
  Forest = 9,
  Ruins = 10,
  GasVent = 11,
  LandingPad = 12,
}

const TILE_WALKABLE: Record<TileType, boolean> = {
  [TileType.Grass]: true,
  [TileType.Sand]: true,
  [TileType.Stone]: true,
  [TileType.Water]: false,
  [TileType.Snow]: true,
  [TileType.Ice]: true,
  [TileType.Lava]: false,
  [TileType.Crystal]: false, // must mine
  [TileType.Ore]: false, // must mine
  [TileType.Forest]: true,
  [TileType.Ruins]: true,
  [TileType.GasVent]: false,
  [TileType.LandingPad]: true,
};

const TILE_MINEABLE: Record<TileType, boolean> = {
  [TileType.Grass]: false,
  [TileType.Sand]: false,
  [TileType.Stone]: false,
  [TileType.Water]: false,
  [TileType.Snow]: false,
  [TileType.Ice]: false,
  [TileType.Lava]: false,
  [TileType.Crystal]: true,
  [TileType.Ore]: true,
  [TileType.Forest]: false,
  [TileType.Ruins]: true,
  [TileType.GasVent]: false,
  [TileType.LandingPad]: false,
};

// ── Interfaces ─────────────────────────────────────────────

export interface Vec2 {
  x: number;
  y: number;
}

export interface WorldPlayer {
  id: string;
  name: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  level: number;
  role: string;
  facing: "up" | "down" | "left" | "right";
  attacking: boolean;
  mining: boolean;
  dead: boolean;
  spriteId: string;
  sessionLoot: SessionLootItem[];
  soulBonuses: Record<string, number>;
  deathSaveUsed: boolean;
  // stats derived from level + soul tree
  attack: number;
  defense: number;
  speed: number; // tiles per second
  attackSpeed: number;
  attackRange: number;
  attackCooldown: number; // ticks until next attack
  mineCooldown: number;
  skillCooldowns: number[]; // 4 slots
}

export interface WorldMob {
  id: string;
  definitionId: string;
  name: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  level: number;
  attack: number;
  defense: number;
  speed: number;
  aggroRange: number;
  attackRange: number;
  attackSpeed: number;
  attackCooldown: number;
  behavior: string;
  isElite: boolean;
  isBoss: boolean;
  spriteId: string;
  targetPlayerId: string | null;
  patrolOrigin: Vec2;
  patrolTarget: Vec2 | null;
  lootTable: LootEntry[];
  chunkKey: string;
  dead: boolean;
}

export interface WorldDrop {
  id: string;
  x: number;
  y: number;
  itemId: string;
  quantity: number;
  droppedAt: number; // tick number
  playerId: string | null; // who it's reserved for (killer), null = free
}

export interface SessionLootItem {
  itemId: string;
  quantity: number;
}

export interface ChunkData {
  key: string;
  cx: number;
  cy: number;
  tiles: TileType[][]; // [y][x] within chunk
  heights: number[][]; // height map for visual depth
  mobs: string[]; // mob IDs in this chunk
  generated: boolean;
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

export interface InputFrame {
  dx: number; // -1, 0, 1
  dy: number; // -1, 0, 1
  attack: boolean;
  mine: boolean;
  skill: number; // 0-3, -1 = none
}

export interface WorldEvent {
  type: string;
  data: Record<string, unknown>;
  targetPlayerIds?: string[];
}

// ── Seeded RNG ─────────────────────────────────────────────

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function hashChunkSeed(baseSeed: number, cx: number, cy: number): number {
  return ((baseSeed * 73856093) ^ (cx * 19349663) ^ (cy * 83492791)) >>> 0;
}

// ── World Class ────────────────────────────────────────────

export class PlanetWorld {
  readonly planetId: string;
  readonly planetClass: string;
  readonly upgradeLevel: number;
  readonly biome: BiomeConfig;
  readonly difficulty: DifficultyTier;
  readonly baseSeed: number;
  readonly landingPad: Vec2;

  tick = 0;
  players = new Map<string, WorldPlayer>();
  mobs = new Map<string, WorldMob>();
  drops = new Map<string, WorldDrop>();
  chunks = new Map<string, ChunkData>();
  events: WorldEvent[] = [];

  private nextMobId = 0;
  private nextDropId = 0;

  constructor(
    planetId: string,
    planetClass: string,
    upgradeLevel: number,
    dbIdSeed: number,
  ) {
    this.planetId = planetId;
    this.planetClass = planetClass;
    this.upgradeLevel = upgradeLevel;
    this.biome = getBiomeConfig(planetClass);
    this.difficulty = getDifficultyTier(upgradeLevel);
    this.baseSeed = dbIdSeed;

    // Landing pad is always at chunk (0,0) center
    this.landingPad = {
      x: CHUNK_SIZE / 2,
      y: CHUNK_SIZE / 2,
    };

    // Generate the starting chunk
    this.getOrGenerateChunk(0, 0);
  }

  // ── Chunk Generation ───────────────────────────────────

  private chunkKey(cx: number, cy: number): string {
    return `${cx},${cy}`;
  }

  getOrGenerateChunk(cx: number, cy: number): ChunkData {
    const key = this.chunkKey(cx, cy);
    const existing = this.chunks.get(key);
    if (existing) return existing;

    const rng = seededRandom(hashChunkSeed(this.baseSeed, cx, cy));
    const tiles: TileType[][] = [];
    const heights: number[][] = [];

    // Build weighted tile array for this biome
    const weights = this.biome.tileWeights;
    const tilePool: TileType[] = [];
    const mapping: [string, TileType][] = [
      ["grass", TileType.Grass],
      ["sand", TileType.Sand],
      ["stone", TileType.Stone],
      ["water", TileType.Water],
      ["snow", TileType.Snow],
      ["ice", TileType.Ice],
      ["lava", TileType.Lava],
      ["crystal", TileType.Crystal],
      ["ore", TileType.Ore],
      ["forest", TileType.Forest],
      ["ruins", TileType.Ruins],
      ["gas_vent", TileType.GasVent],
    ];
    for (const [name, type] of mapping) {
      const w = weights[name as keyof typeof weights];
      for (let i = 0; i < w; i++) tilePool.push(type);
    }

    for (let y = 0; y < CHUNK_SIZE; y++) {
      tiles[y] = [];
      heights[y] = [];
      for (let x = 0; x < CHUNK_SIZE; x++) {
        // Landing pad override for chunk (0,0)
        if (
          cx === 0 &&
          cy === 0 &&
          Math.abs(x - this.landingPad.x) <= LANDING_PAD_RADIUS &&
          Math.abs(y - this.landingPad.y) <= LANDING_PAD_RADIUS
        ) {
          tiles[y][x] = TileType.LandingPad;
          heights[y][x] = 0;
          continue;
        }
        tiles[y][x] = tilePool[Math.floor(rng() * tilePool.length)];
        heights[y][x] = Math.floor(rng() * 3); // 0-2 height levels
      }
    }

    const chunk: ChunkData = {
      key,
      cx,
      cy,
      tiles,
      heights,
      mobs: [],
      generated: true,
    };
    this.chunks.set(key, chunk);

    // Spawn mobs for this chunk
    this.spawnChunkMobs(chunk, rng);

    return chunk;
  }

  private spawnChunkMobs(chunk: ChunkData, rng: () => number): void {
    const count = this.difficulty.enemyDensity;
    const pool = getEnemyPool(Math.min(Math.floor(this.upgradeLevel / 2), 5));
    const elitePool = getElitePool(Math.floor(this.upgradeLevel / 2));

    for (let i = 0; i < count; i++) {
      // Pick a walkable tile
      let tx: number, ty: number;
      let attempts = 0;
      do {
        tx = Math.floor(rng() * CHUNK_SIZE);
        ty = Math.floor(rng() * CHUNK_SIZE);
        attempts++;
      } while (!TILE_WALKABLE[chunk.tiles[ty][tx]] && attempts < 20);

      if (attempts >= 20) continue;

      // Determine if elite or boss
      let def: EnemyDefinition;
      if (rng() < this.difficulty.bossSpawnChance) {
        def = getBoss();
      } else if (rng() < this.difficulty.eliteChance && elitePool.length > 0) {
        def = elitePool[Math.floor(rng() * elitePool.length)];
      } else {
        def = pool[Math.floor(rng() * pool.length)];
      }

      const level =
        this.difficulty.minEnemyLevel +
        Math.floor(
          rng() *
            (this.difficulty.maxEnemyLevel - this.difficulty.minEnemyLevel),
        );

      const scaled = scaleEnemyStats(def, level);
      const mobId = `mob_${this.nextMobId++}`;
      const worldX = chunk.cx * CHUNK_SIZE + tx;
      const worldY = chunk.cy * CHUNK_SIZE + ty;

      // Prefix enemy name with biome aesthetic
      const displayName = `${this.biome.enemyPrefix} ${def.name}`;

      const mob: WorldMob = {
        id: mobId,
        definitionId: def.id,
        name: displayName,
        x: worldX,
        y: worldY,
        hp: scaled.hp,
        maxHp: scaled.hp,
        level,
        attack: scaled.attack,
        defense: scaled.defense,
        speed: def.speed,
        aggroRange: def.aggroRange,
        attackRange: def.attackRange,
        attackSpeed: def.attackSpeed,
        attackCooldown: 0,
        behavior: def.behavior,
        isElite: def.isElite,
        isBoss: def.isBoss,
        spriteId: def.spriteId,
        targetPlayerId: null,
        patrolOrigin: { x: worldX, y: worldY },
        patrolTarget: null,
        lootTable: def.lootTable,
        chunkKey: chunk.key,
        dead: false,
      };

      this.mobs.set(mobId, mob);
      chunk.mobs.push(mobId);
    }
  }

  // ── Player Management ──────────────────────────────────

  addPlayer(
    id: string,
    name: string,
    level: number,
    role: string,
    hp: number,
    maxHp: number,
    soulNodes: Map<string, number>,
    spriteId?: string,
  ): WorldPlayer {
    const bonuses = calculateSoulBonuses(soulNodes);
    const baseAttack = 10 + level * 2 + (bonuses.attack ?? 0);
    const baseDefense = 5 + level + (bonuses.defense ?? 0);
    const baseSpeed = 3.0;
    const hpBonus = bonuses.maxHp ?? 0;

    const player: WorldPlayer = {
      id,
      name,
      x: this.landingPad.x,
      y: this.landingPad.y,
      hp: Math.min(hp, maxHp + hpBonus),
      maxHp: maxHp + hpBonus,
      level,
      role,
      facing: "down",
      attacking: false,
      mining: false,
      dead: false,
      spriteId: spriteId ?? "default_hero",
      sessionLoot: [],
      soulBonuses: bonuses,
      deathSaveUsed: false,
      attack: baseAttack,
      defense: baseDefense,
      speed: baseSpeed,
      attackSpeed: 1.0 + (bonuses.attackSpeed ?? 0),
      attackRange: role === "ranged" ? 5 : role === "mage" ? 4 : 1.5,
      attackCooldown: 0,
      mineCooldown: 0,
      skillCooldowns: [0, 0, 0, 0],
    };

    this.players.set(id, player);
    this.events.push({
      type: "player_joined",
      data: { playerId: id, name },
    });
    return player;
  }

  removePlayer(id: string): WorldPlayer | undefined {
    const player = this.players.get(id);
    if (player) {
      this.players.delete(id);
      this.events.push({
        type: "player_left",
        data: { playerId: id, name: player.name },
      });
    }
    return player;
  }

  // ── Input Processing ───────────────────────────────────

  processInput(playerId: string, input: InputFrame): void {
    const player = this.players.get(playerId);
    if (!player || player.dead) return;

    // Movement
    if (input.dx !== 0 || input.dy !== 0) {
      const moveSpeed = player.speed / 20; // tiles per tick at 20Hz
      const newX = player.x + input.dx * moveSpeed;
      const newY = player.y + input.dy * moveSpeed;

      // Update facing
      if (input.dx > 0) player.facing = "right";
      else if (input.dx < 0) player.facing = "left";
      else if (input.dy > 0) player.facing = "down";
      else if (input.dy < 0) player.facing = "up";

      // Check walkability at new position
      if (this.isTileWalkable(Math.floor(newX), Math.floor(newY))) {
        player.x = newX;
        player.y = newY;

        // Generate chunks around player
        this.ensureChunksAround(newX, newY);
      }
    }

    // Attack
    player.attacking = input.attack;
    if (input.attack && player.attackCooldown <= 0) {
      this.playerAttack(player);
      player.attackCooldown = Math.round(20 / player.attackSpeed);
    }

    // Mine
    player.mining = input.mine;
    if (input.mine && player.mineCooldown <= 0) {
      this.playerMine(player);
      const miningSpeedBonus = player.soulBonuses.miningSpeed ?? 0;
      player.mineCooldown = Math.round(20 * (1 - miningSpeedBonus));
    }

    // Skills
    if (input.skill >= 0 && input.skill < 4) {
      if (player.skillCooldowns[input.skill] <= 0) {
        this.playerUseSkill(player, input.skill);
      }
    }

    // Pickup drops
    this.checkDropPickup(player);
  }

  // ── Combat ─────────────────────────────────────────────

  private playerAttack(player: WorldPlayer): void {
    const range = player.attackRange;
    let hitCount = 0;
    const maxTargets = 1 + (player.soulBonuses.cleaveTargets ?? 0);

    for (const mob of this.mobs.values()) {
      if (mob.dead) continue;
      if (hitCount >= maxTargets) break;

      const dist = Math.hypot(mob.x - player.x, mob.y - player.y);
      if (dist > range) continue;

      // Damage calc
      let damage = Math.max(1, player.attack - mob.defense * 0.5);

      // Crit check
      const critChance = player.soulBonuses.critChance ?? 0;
      const critMult = 1.5 + (player.soulBonuses.critMultiplier ?? 0);
      const isCrit = Math.random() < critChance;
      if (isCrit) damage *= critMult;

      // Execute bonus (below 30% HP)
      if (mob.hp / mob.maxHp < 0.3) {
        damage *= 1 + (player.soulBonuses.executeDamage ?? 0);
      }

      damage = Math.round(damage);
      mob.hp -= damage;
      hitCount++;

      // Lifesteal
      const lifesteal = player.soulBonuses.lifesteal ?? 0;
      if (lifesteal > 0) {
        player.hp = Math.min(
          player.maxHp,
          player.hp + Math.round(damage * lifesteal),
        );
      }

      this.events.push({
        type: "damage",
        data: {
          targetId: mob.id,
          targetType: "mob",
          damage,
          isCrit,
          attackerId: player.id,
        },
        targetPlayerIds: [player.id],
      });

      if (mob.hp <= 0) {
        this.killMob(mob, player);
      }
    }
  }

  private killMob(mob: WorldMob, killer: WorldPlayer): void {
    mob.dead = true;
    mob.hp = 0;

    const scaled = scaleEnemyStats(
      {
        baseHp: 0,
        baseAttack: 0,
        baseDefense: 0,
        xpReward: 0,
        goldReward: 0,
      } as any,
      mob.level,
    );
    // Use stored mob stats for XP/gold instead of re-scaling
    const xpMult = 1 + (killer.soulBonuses.xpGainMultiplier ?? 0);
    const spMult = 1 + (killer.soulBonuses.spGainMultiplier ?? 0);
    const lootMult =
      this.difficulty.lootMultiplier *
      (1 + (killer.soulBonuses.lootDropMultiplier ?? 0));

    // Award XP
    const baseXp = Math.round(10 * mob.level * 0.5);
    const xpGain = Math.round(baseXp * xpMult);

    // Award SP (1 per kill, sometimes 2 for elites/bosses)
    let spGain = Math.round(1 * spMult);
    if (mob.isElite) spGain = Math.round(3 * spMult);
    if (mob.isBoss) spGain = Math.round(10 * spMult);

    // Gold
    const goldGain = Math.round(mob.level * 2 * lootMult);

    this.events.push({
      type: "mob_killed",
      data: {
        mobId: mob.id,
        mobName: mob.name,
        killerId: killer.id,
        xp: xpGain,
        sp: spGain,
        gold: goldGain,
        isElite: mob.isElite,
        isBoss: mob.isBoss,
      },
      targetPlayerIds: [killer.id],
    });

    // Drop loot
    for (const entry of mob.lootTable) {
      if (Math.random() < entry.chance * lootMult) {
        const qty =
          entry.minQty +
          Math.floor(Math.random() * (entry.maxQty - entry.minQty + 1));
        this.spawnDrop(mob.x, mob.y, entry.itemId, qty, killer.id);
      }
    }

    // Planet unique resource drop chance from elites/bosses
    if ((mob.isElite || mob.isBoss) && Math.random() < 0.3) {
      this.spawnDrop(mob.x, mob.y, this.biome.uniqueResource.id, 1, killer.id);
    }
  }

  private mobAttack(mob: WorldMob, target: WorldPlayer): void {
    if (target.dead) return;

    const dodgeChance = target.soulBonuses.dodgeChance ?? 0;
    if (Math.random() < dodgeChance) {
      this.events.push({
        type: "dodge",
        data: { playerId: target.id, mobId: mob.id },
        targetPlayerIds: [target.id],
      });
      return;
    }

    let damage = Math.max(1, mob.attack - target.defense * 0.5);

    // Last Stand reduction
    if (target.hp / target.maxHp < 0.25) {
      damage *= 1 - (target.soulBonuses.lastStandReduction ?? 0);
    }

    damage = Math.round(damage);
    target.hp -= damage;

    // Thorns
    const thorns = target.soulBonuses.thornsDamage ?? 0;
    if (thorns > 0) {
      mob.hp -= thorns;
      if (mob.hp <= 0) this.killMob(mob, target);
    }

    this.events.push({
      type: "damage",
      data: {
        targetId: target.id,
        targetType: "player",
        damage,
        isCrit: false,
        attackerId: mob.id,
      },
      targetPlayerIds: [target.id],
    });

    if (target.hp <= 0) {
      this.playerDeath(target);
    }
  }

  private playerDeath(player: WorldPlayer): void {
    // Check death save (Undying soul node)
    if (!player.deathSaveUsed && (player.soulBonuses.deathSave ?? 0) > 0) {
      player.hp = 1;
      player.deathSaveUsed = true;
      this.events.push({
        type: "death_save",
        data: { playerId: player.id },
        targetPlayerIds: [player.id],
      });
      return;
    }

    player.dead = true;
    player.hp = 0;
    player.sessionLoot = []; // lose session loot on death

    this.events.push({
      type: "player_death",
      data: { playerId: player.id, name: player.name },
    });
  }

  respawnPlayer(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player) return;
    player.dead = false;
    player.hp = player.maxHp;
    player.x = this.landingPad.x;
    player.y = this.landingPad.y;
    player.deathSaveUsed = false;

    this.events.push({
      type: "player_respawn",
      data: { playerId },
      targetPlayerIds: [playerId],
    });
  }

  // ── Mining ─────────────────────────────────────────────

  private playerMine(player: WorldPlayer): void {
    // Check facing tile
    const facingOffset = this.getFacingOffset(player.facing);
    const tx = Math.floor(player.x + facingOffset.x);
    const ty = Math.floor(player.y + facingOffset.y);

    const cx = Math.floor(tx / CHUNK_SIZE);
    const cy = Math.floor(ty / CHUNK_SIZE);
    const chunk = this.chunks.get(this.chunkKey(cx, cy));
    if (!chunk) return;

    const lx = ((tx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const ly = ((ty % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const tile = chunk.tiles[ly]?.[lx];
    if (tile === undefined || !TILE_MINEABLE[tile]) return;

    // Mine the tile — convert to walkable ground
    chunk.tiles[ly][lx] = TileType.Grass;

    // Determine resource
    let resourceId = "stone";
    let qty = 1;
    const doubleChance = player.soulBonuses.doubleOreChance ?? 0;
    const yieldMult = 1 + (player.soulBonuses.miningYieldAll ?? 0);

    if (tile === TileType.Crystal) {
      resourceId = "cyrillium";
      qty = Math.round((1 + Math.floor(Math.random() * 3)) * yieldMult);
    } else if (tile === TileType.Ore) {
      resourceId = "tech";
      qty = Math.round((2 + Math.floor(Math.random() * 4)) * yieldMult);
    } else if (tile === TileType.Ruins) {
      resourceId = this.biome.uniqueResource.id;
      qty = 1;
    }

    // Double yield check
    if (Math.random() < doubleChance) qty *= 2;

    // Rare resource bonus
    const rareChance = player.soulBonuses.rareResourceChance ?? 0;
    if (Math.random() < rareChance) {
      this.spawnDrop(tx, ty, this.biome.uniqueResource.id, 1, player.id);
    }

    // Gem find chance
    const gemChance = player.soulBonuses.gemFindChance ?? 0;
    if (Math.random() < gemChance) {
      this.spawnDrop(tx, ty, "gem", 1, player.id);
    }

    this.spawnDrop(tx, ty, resourceId, qty, player.id);

    this.events.push({
      type: "mined",
      data: { playerId: player.id, tx, ty, resourceId, qty },
      targetPlayerIds: [player.id],
    });
  }

  // ── Skills ─────────────────────────────────────────────

  private playerUseSkill(player: WorldPlayer, slot: number): void {
    // Skill system — placeholder for expansion
    const baseCooldown = 60; // 3 seconds at 20Hz
    const cdReduction = player.soulBonuses.cooldownReduction ?? 0;
    player.skillCooldowns[slot] = Math.round(baseCooldown * (1 - cdReduction));

    // AOE damage around player
    const skillDmgMult = 1 + (player.soulBonuses.skillDamageMultiplier ?? 0);
    const damage = Math.round(player.attack * 1.5 * skillDmgMult);
    const range = 3;

    for (const mob of this.mobs.values()) {
      if (mob.dead) continue;
      const dist = Math.hypot(mob.x - player.x, mob.y - player.y);
      if (dist <= range) {
        mob.hp -= damage;
        this.events.push({
          type: "damage",
          data: {
            targetId: mob.id,
            targetType: "mob",
            damage,
            isCrit: false,
            attackerId: player.id,
          },
        });
        if (mob.hp <= 0) this.killMob(mob, player);
      }
    }
  }

  // ── World Tick (20Hz) ──────────────────────────────────

  update(): { snapshot: WorldSnapshot; events: WorldEvent[] } {
    this.tick++;

    // Cooldown ticks
    for (const player of this.players.values()) {
      if (player.attackCooldown > 0) player.attackCooldown--;
      if (player.mineCooldown > 0) player.mineCooldown--;
      for (let i = 0; i < 4; i++) {
        if (player.skillCooldowns[i] > 0) player.skillCooldowns[i]--;
      }

      // HP regen
      if (!player.dead) {
        const regen = player.soulBonuses.hpRegen ?? 0;
        if (regen > 0 && this.tick % 20 === 0) {
          // heal every second
          player.hp = Math.min(player.maxHp, player.hp + regen);
        }
      }
    }

    // Mob AI
    this.updateMobAI();

    // Clean up old drops (60 seconds)
    for (const [id, drop] of this.drops) {
      if (this.tick - drop.droppedAt > 1200) {
        this.drops.delete(id);
      }
    }

    // Build snapshot
    const snapshot = this.buildSnapshot();
    const events = [...this.events];
    this.events = [];

    return { snapshot, events };
  }

  private updateMobAI(): void {
    for (const mob of this.mobs.values()) {
      if (mob.dead) continue;
      if (mob.attackCooldown > 0) mob.attackCooldown--;

      // Find closest player in aggro range
      let closestPlayer: WorldPlayer | null = null;
      let closestDist = Infinity;

      for (const player of this.players.values()) {
        if (player.dead) continue;
        const dist = Math.hypot(player.x - mob.x, player.y - mob.y);
        if (dist < mob.aggroRange && dist < closestDist) {
          closestDist = dist;
          closestPlayer = player;
        }
      }

      if (closestPlayer) {
        mob.targetPlayerId = closestPlayer.id;

        // Move toward player
        if (closestDist > mob.attackRange) {
          const dx = closestPlayer.x - mob.x;
          const dy = closestPlayer.y - mob.y;
          const len = Math.hypot(dx, dy);
          const moveSpeed = mob.speed / 20;
          const nx = mob.x + (dx / len) * moveSpeed;
          const ny = mob.y + (dy / len) * moveSpeed;
          if (this.isTileWalkable(Math.floor(nx), Math.floor(ny))) {
            mob.x = nx;
            mob.y = ny;
          }
        }

        // Attack if in range
        if (closestDist <= mob.attackRange && mob.attackCooldown <= 0) {
          this.mobAttack(mob, closestPlayer);
          mob.attackCooldown = Math.round(20 / mob.attackSpeed);
        }
      } else {
        mob.targetPlayerId = null;

        // Patrol behavior
        if (mob.behavior === "patrol") {
          if (
            !mob.patrolTarget ||
            Math.hypot(mob.x - mob.patrolTarget.x, mob.y - mob.patrolTarget.y) <
              0.5
          ) {
            // Pick new patrol target within 5 tiles of origin
            mob.patrolTarget = {
              x: mob.patrolOrigin.x + (Math.random() - 0.5) * 10,
              y: mob.patrolOrigin.y + (Math.random() - 0.5) * 10,
            };
          }
          const dx = mob.patrolTarget.x - mob.x;
          const dy = mob.patrolTarget.y - mob.y;
          const len = Math.hypot(dx, dy);
          if (len > 0.1) {
            const moveSpeed = (mob.speed * 0.5) / 20;
            mob.x += (dx / len) * moveSpeed;
            mob.y += (dy / len) * moveSpeed;
          }
        }
        // Guard: stay put. Swarm/ambush: handled differently when aggroed.
      }
    }
  }

  // ── Helpers ────────────────────────────────────────────

  private isTileWalkable(tx: number, ty: number): boolean {
    const cx = Math.floor(tx / CHUNK_SIZE);
    const cy = Math.floor(ty / CHUNK_SIZE);
    const chunk = this.chunks.get(this.chunkKey(cx, cy));
    if (!chunk) return false;

    const lx = ((tx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const ly = ((ty % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const tile = chunk.tiles[ly]?.[lx];
    return tile !== undefined && TILE_WALKABLE[tile];
  }

  private ensureChunksAround(x: number, y: number): void {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cy = Math.floor(y / CHUNK_SIZE);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        this.getOrGenerateChunk(cx + dx, cy + dy);
      }
    }
  }

  private getFacingOffset(facing: string): Vec2 {
    switch (facing) {
      case "up":
        return { x: 0, y: -1 };
      case "down":
        return { x: 0, y: 1 };
      case "left":
        return { x: -1, y: 0 };
      case "right":
        return { x: 1, y: 0 };
      default:
        return { x: 0, y: 1 };
    }
  }

  private spawnDrop(
    x: number,
    y: number,
    itemId: string,
    quantity: number,
    playerId: string | null,
  ): void {
    const id = `drop_${this.nextDropId++}`;
    this.drops.set(id, {
      id,
      x: x + (Math.random() - 0.5) * 0.5,
      y: y + (Math.random() - 0.5) * 0.5,
      itemId,
      quantity,
      droppedAt: this.tick,
      playerId,
    });
  }

  private checkDropPickup(player: WorldPlayer): void {
    for (const [id, drop] of this.drops) {
      // Only the killer can pick up for 5 seconds, then free for all
      if (drop.playerId && drop.playerId !== player.id) {
        if (this.tick - drop.droppedAt < 100) continue; // 5 seconds
      }

      const dist = Math.hypot(drop.x - player.x, drop.y - player.y);
      if (dist < 1.0) {
        // Add to session loot
        const existing = player.sessionLoot.find(
          (l) => l.itemId === drop.itemId,
        );
        if (existing) {
          existing.quantity += drop.quantity;
        } else {
          player.sessionLoot.push({
            itemId: drop.itemId,
            quantity: drop.quantity,
          });
        }

        this.drops.delete(id);

        this.events.push({
          type: "item_pickup",
          data: {
            playerId: player.id,
            itemId: drop.itemId,
            quantity: drop.quantity,
          },
          targetPlayerIds: [player.id],
        });
      }
    }
  }

  isNearLandingPad(playerId: string): boolean {
    const player = this.players.get(playerId);
    if (!player) return false;
    return (
      Math.abs(player.x - this.landingPad.x) <= LANDING_PAD_RADIUS &&
      Math.abs(player.y - this.landingPad.y) <= LANDING_PAD_RADIUS
    );
  }

  getChunksAroundPlayer(playerId: string, radius: number = 1): ChunkData[] {
    const player = this.players.get(playerId);
    if (!player) return [];
    const cx = Math.floor(player.x / CHUNK_SIZE);
    const cy = Math.floor(player.y / CHUNK_SIZE);
    const result: ChunkData[] = [];
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const chunk = this.getOrGenerateChunk(cx + dx, cy + dy);
        result.push(chunk);
      }
    }
    return result;
  }

  private buildSnapshot(): WorldSnapshot {
    const players: SnapshotPlayer[] = [];
    for (const p of this.players.values()) {
      players.push({
        id: p.id,
        name: p.name,
        x: p.x,
        y: p.y,
        hp: p.hp,
        maxHp: p.maxHp,
        level: p.level,
        role: p.role,
        facing: p.facing,
        attacking: p.attacking,
        mining: p.mining,
        dead: p.dead,
        spriteId: p.spriteId,
      });
    }

    // Only include mobs in chunks near any player
    const visibleMobs = new Set<string>();
    for (const p of this.players.values()) {
      const chunks = this.getChunksAroundPlayer(p.id, 2);
      for (const chunk of chunks) {
        for (const mobId of chunk.mobs) visibleMobs.add(mobId);
      }
    }

    const mobs: SnapshotMob[] = [];
    for (const mobId of visibleMobs) {
      const m = this.mobs.get(mobId);
      if (!m || m.dead) continue;
      mobs.push({
        id: m.id,
        name: m.name,
        x: m.x,
        y: m.y,
        hp: m.hp,
        maxHp: m.maxHp,
        level: m.level,
        isElite: m.isElite,
        isBoss: m.isBoss,
        spriteId: m.spriteId,
      });
    }

    const drops: SnapshotDrop[] = [];
    for (const d of this.drops.values()) {
      drops.push({
        id: d.id,
        x: d.x,
        y: d.y,
        itemId: d.itemId,
        quantity: d.quantity,
      });
    }

    return {
      tick: this.tick,
      players,
      mobs,
      drops,
      landingPad: this.landingPad,
    };
  }
}
