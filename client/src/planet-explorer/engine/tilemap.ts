/** Tile rendering with biome colors and height system */

import type { ChunkData, BiomeInfo } from "./types";
import { Camera } from "./camera";

const CHUNK_SIZE = 16;

// Tile type colors by biome — base colors are modified by biome palette
const TILE_COLORS: Record<number, string> = {
  0: "#3a6b35", // Grass
  1: "#c2955a", // Sand
  2: "#808080", // Stone
  3: "#2980b9", // Water
  4: "#dfe6e9", // Snow
  5: "#a8d8ea", // Ice
  6: "#e74c3c", // Lava
  7: "#9b59b6", // Crystal
  8: "#b87333", // Ore
  9: "#2d5016", // Forest
  10: "#6d4c41", // Ruins
  11: "#95a5a6", // Gas Vent
  12: "#f39c12", // Landing Pad
};

// Height shading offsets
const HEIGHT_SHADE = [0, -15, -30]; // darker at higher elevations

export class TileMap {
  private chunks = new Map<string, ChunkData>();
  biome: BiomeInfo | null = null;

  setBiome(biome: BiomeInfo): void {
    this.biome = biome;
  }

  setChunks(chunks: ChunkData[]): void {
    for (const chunk of chunks) {
      this.chunks.set(chunk.key, chunk);
    }
  }

  addChunk(chunk: ChunkData): void {
    this.chunks.set(chunk.key, chunk);
  }

  render(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    tileSize: number,
  ): void {
    const range = camera.getVisibleRange(tileSize);

    for (let wy = range.minY; wy <= range.maxY; wy++) {
      for (let wx = range.minX; wx <= range.maxX; wx++) {
        const cx = Math.floor(wx / CHUNK_SIZE);
        const cy = Math.floor(wy / CHUNK_SIZE);
        const key = `${cx},${cy}`;
        const chunk = this.chunks.get(key);
        if (!chunk) continue;

        const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        const ly = ((wy % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        const tile = chunk.tiles[ly]?.[lx];
        if (tile === undefined) continue;

        const height = chunk.heights[ly]?.[lx] ?? 0;
        const screen = camera.worldToScreen(wx, wy, tileSize);

        // Get base color
        let color = TILE_COLORS[tile] ?? "#333";

        // Apply height shading
        color = shadeColor(color, HEIGHT_SHADE[height] ?? 0);

        ctx.fillStyle = color;
        ctx.fillRect(
          Math.floor(screen.x),
          Math.floor(screen.y),
          tileSize + 1, // +1 to avoid gaps
          tileSize + 1,
        );

        // Landing pad marker
        if (tile === 12) {
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 1;
          ctx.strokeRect(
            Math.floor(screen.x) + 2,
            Math.floor(screen.y) + 2,
            tileSize - 4,
            tileSize - 4,
          );
        }
      }
    }
  }
}

function shadeColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  let r = (num >> 16) + amount;
  let g = ((num >> 8) & 0x00ff) + amount;
  let b = (num & 0x0000ff) + amount;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `rgb(${r},${g},${b})`;
}
