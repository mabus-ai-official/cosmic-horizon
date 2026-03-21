/**
 * Main game loop — 60fps render, interpolates between 20Hz server snapshots.
 * Owns the canvas element and orchestrates all rendering subsystems.
 */

import { Camera } from "./camera";
import { TileMap } from "./tilemap";
import { SpriteRenderer } from "./sprites";
import { EffectsRenderer } from "./effects";
import type {
  WorldSnapshot,
  WorldEvent,
  ChunkData,
  BiomeInfo,
  SnapshotPlayer,
} from "./types";

const TILE_SIZE = 32;
const SERVER_TICK_MS = 50; // 20Hz

export interface GameLoopCallbacks {
  onDeath?: () => void;
  onRespawn?: () => void;
  onLevelUp?: (level: number) => void;
  onLootPickup?: (itemId: string, quantity: number) => void;
  onMobKill?: (mobName: string, xp: number, sp: number, gold: number) => void;
}

export class GameLoop {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private camera: Camera;
  private tilemap: TileMap;
  private sprites: SpriteRenderer;
  private effects: EffectsRenderer;

  private currentSnapshot: WorldSnapshot | null = null;
  private prevSnapshot: WorldSnapshot | null = null;
  private lastSnapshotTime = 0;

  private animFrame = 0;
  private running = false;
  private tick = 0;

  localPlayerId = "";
  callbacks: GameLoopCallbacks = {};

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Cannot get 2d context");
    this.ctx = ctx;

    this.camera = new Camera(canvas.width, canvas.height);
    this.tilemap = new TileMap();
    this.sprites = new SpriteRenderer();
    this.effects = new EffectsRenderer();
  }

  setBiome(biome: BiomeInfo): void {
    this.tilemap.setBiome(biome);
  }

  setChunks(chunks: ChunkData[]): void {
    this.tilemap.setChunks(chunks);
  }

  addChunk(chunk: ChunkData): void {
    this.tilemap.addChunk(chunk);
  }

  onSnapshot(snapshot: WorldSnapshot): void {
    this.prevSnapshot = this.currentSnapshot;
    this.currentSnapshot = snapshot;
    this.lastSnapshotTime = performance.now();
  }

  onEvent(event: WorldEvent): void {
    const data = event.data;
    switch (event.type) {
      case "damage": {
        // Find target position from current snapshot
        if (data.targetType === "mob" && this.currentSnapshot) {
          const mob = this.currentSnapshot.mobs.find(
            (m) => m.id === data.targetId,
          );
          if (mob) {
            this.effects.addDamageNumber(
              mob.x,
              mob.y,
              Number(data.damage),
              Boolean(data.isCrit),
            );
          }
        } else if (data.targetType === "player" && this.currentSnapshot) {
          const player = this.currentSnapshot.players.find(
            (p) => p.id === data.targetId,
          );
          if (player) {
            this.effects.addDamageNumber(
              player.x,
              player.y,
              Number(data.damage),
              false,
            );
          }
        }
        break;
      }
      case "mob_killed": {
        this.callbacks.onMobKill?.(
          String(data.mobName),
          Number(data.xp),
          Number(data.sp),
          Number(data.gold),
        );
        // Find mob position for death effect
        if (this.currentSnapshot) {
          // mob might already be removed from snapshot, use last known
          const mob = this.prevSnapshot?.mobs.find((m) => m.id === data.mobId);
          if (mob) this.effects.addDeathEffect(mob.x, mob.y);
        }
        break;
      }
      case "item_pickup": {
        this.callbacks.onLootPickup?.(
          String(data.itemId),
          Number(data.quantity),
        );
        break;
      }
      case "player_death": {
        if (data.playerId === this.localPlayerId) {
          this.callbacks.onDeath?.();
        }
        break;
      }
      case "player_respawn": {
        if (data.playerId === this.localPlayerId) {
          this.callbacks.onRespawn?.();
        }
        break;
      }
      case "death_save": {
        // Visual feedback for death save
        if (this.currentSnapshot) {
          const player = this.currentSnapshot.players.find(
            (p) => p.id === data.playerId,
          );
          if (player) {
            this.effects.addHealNumber(player.x, player.y, 0);
          }
        }
        break;
      }
      case "mined": {
        this.effects.addMineEffect(Number(data.tx), Number(data.ty));
        break;
      }
    }
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.loop();
  }

  stop(): void {
    this.running = false;
    if (this.animFrame) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = 0;
    }
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.camera.resize(width, height);
  }

  private loop = (): void => {
    if (!this.running) return;
    this.tick++;
    this.render();
    this.effects.update();
    this.animFrame = requestAnimationFrame(this.loop);
  };

  private render(): void {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!this.currentSnapshot) {
      ctx.fillStyle = "#111";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#888";
      ctx.font = "16px monospace";
      ctx.textAlign = "center";
      ctx.fillText("Connecting...", canvas.width / 2, canvas.height / 2);
      return;
    }

    // Interpolate local player position for smooth camera
    const localPlayer = this.getInterpolatedLocalPlayer();
    if (localPlayer) {
      this.camera.setTarget(localPlayer.x, localPlayer.y);
    }
    this.camera.update();

    // Render layers
    this.tilemap.render(ctx, this.camera, TILE_SIZE);

    // Drops (below sprites)
    this.sprites.renderDrops(
      ctx,
      this.currentSnapshot.drops,
      this.camera,
      TILE_SIZE,
      this.tick,
    );

    // Mobs
    this.sprites.renderMobs(
      ctx,
      this.currentSnapshot.mobs,
      this.camera,
      TILE_SIZE,
    );

    // Players
    this.sprites.renderPlayers(
      ctx,
      this.currentSnapshot.players,
      this.camera,
      TILE_SIZE,
      this.localPlayerId,
    );

    // Effects (on top)
    this.effects.render(ctx, this.camera, TILE_SIZE);

    // Landing pad indicator
    this.renderLandingPadIndicator();

    // Minimap
    this.renderMinimap();
  }

  private getInterpolatedLocalPlayer(): SnapshotPlayer | null {
    if (!this.currentSnapshot) return null;
    const current = this.currentSnapshot.players.find(
      (p) => p.id === this.localPlayerId,
    );
    if (!current) return null;

    if (!this.prevSnapshot) return current;
    const prev = this.prevSnapshot.players.find(
      (p) => p.id === this.localPlayerId,
    );
    if (!prev) return current;

    // Interpolate based on time since last snapshot
    const elapsed = performance.now() - this.lastSnapshotTime;
    const t = Math.min(1, elapsed / SERVER_TICK_MS);

    return {
      ...current,
      x: prev.x + (current.x - prev.x) * t,
      y: prev.y + (current.y - prev.y) * t,
    };
  }

  private renderLandingPadIndicator(): void {
    if (!this.currentSnapshot) return;
    const pad = this.currentSnapshot.landingPad;
    const screen = this.camera.worldToScreen(pad.x, pad.y, TILE_SIZE);

    // Pulsing circle
    const pulse = 0.5 + Math.sin(this.tick * 0.05) * 0.3;
    this.ctx.strokeStyle = `rgba(243,156,18,${pulse})`;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(screen.x, screen.y, 20, 0, Math.PI * 2);
    this.ctx.stroke();

    // Arrow pointing to pad if off-screen
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    const margin = 40;
    if (
      screen.x < -margin ||
      screen.x > this.canvas.width + margin ||
      screen.y < -margin ||
      screen.y > this.canvas.height + margin
    ) {
      const angle = Math.atan2(screen.y - cy, screen.x - cx);
      const edgeX = cx + Math.cos(angle) * (this.canvas.width / 2 - 30);
      const edgeY = cy + Math.sin(angle) * (this.canvas.height / 2 - 30);

      this.ctx.fillStyle = "#f39c12";
      this.ctx.beginPath();
      this.ctx.arc(edgeX, edgeY, 6, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = "#f39c12";
      this.ctx.font = "bold 10px monospace";
      this.ctx.textAlign = "center";
      this.ctx.fillText("PAD", edgeX, edgeY - 10);
    }
  }

  private renderMinimap(): void {
    if (!this.currentSnapshot) return;
    const size = 120;
    const padding = 10;
    const mx = this.canvas.width - size - padding;
    const my = padding;

    // Background
    this.ctx.fillStyle = "rgba(0,0,0,0.6)";
    this.ctx.fillRect(mx, my, size, size);
    this.ctx.strokeStyle = "rgba(255,255,255,0.3)";
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(mx, my, size, size);

    const scale = 0.5; // pixels per world tile on minimap
    const centerX = mx + size / 2;
    const centerY = my + size / 2;

    // Landing pad
    const pad = this.currentSnapshot.landingPad;
    const localPlayer = this.currentSnapshot.players.find(
      (p) => p.id === this.localPlayerId,
    );
    const offsetX = localPlayer ? localPlayer.x : 0;
    const offsetY = localPlayer ? localPlayer.y : 0;

    // Pad dot
    this.ctx.fillStyle = "#f39c12";
    this.ctx.fillRect(
      centerX + (pad.x - offsetX) * scale - 2,
      centerY + (pad.y - offsetY) * scale - 2,
      4,
      4,
    );

    // Mobs as red dots
    this.ctx.fillStyle = "#e53935";
    for (const m of this.currentSnapshot.mobs) {
      const mmx = centerX + (m.x - offsetX) * scale;
      const mmy = centerY + (m.y - offsetY) * scale;
      if (mmx >= mx && mmx <= mx + size && mmy >= my && mmy <= my + size) {
        this.ctx.fillRect(mmx - 1, mmy - 1, 2, 2);
      }
    }

    // Players as green/cyan dots
    for (const p of this.currentSnapshot.players) {
      this.ctx.fillStyle = p.id === this.localPlayerId ? "#00e5ff" : "#4caf50";
      const px = centerX + (p.x - offsetX) * scale;
      const py = centerY + (p.y - offsetY) * scale;
      if (px >= mx && px <= mx + size && py >= my && py <= my + size) {
        this.ctx.fillRect(px - 2, py - 2, 4, 4);
      }
    }
  }
}
