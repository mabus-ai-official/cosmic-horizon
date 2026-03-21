/** Player-centered camera with smooth following */

import type { Vec2 } from "./types";

export class Camera {
  x = 0;
  y = 0;
  private targetX = 0;
  private targetY = 0;
  private smoothing = 0.1;

  width: number;
  height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  setTarget(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
  }

  update(): void {
    this.x += (this.targetX - this.x) * this.smoothing;
    this.y += (this.targetY - this.y) * this.smoothing;
  }

  /** Convert world coordinates to screen coordinates */
  worldToScreen(wx: number, wy: number, tileSize: number): Vec2 {
    return {
      x: (wx - this.x) * tileSize + this.width / 2,
      y: (wy - this.y) * tileSize + this.height / 2,
    };
  }

  /** Convert screen coordinates to world coordinates */
  screenToWorld(sx: number, sy: number, tileSize: number): Vec2 {
    return {
      x: (sx - this.width / 2) / tileSize + this.x,
      y: (sy - this.height / 2) / tileSize + this.y,
    };
  }

  /** Get visible tile range */
  getVisibleRange(tileSize: number): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } {
    const halfW = this.width / 2 / tileSize;
    const halfH = this.height / 2 / tileSize;
    return {
      minX: Math.floor(this.x - halfW) - 1,
      maxX: Math.ceil(this.x + halfW) + 1,
      minY: Math.floor(this.y - halfH) - 1,
      maxY: Math.ceil(this.y + halfH) + 1,
    };
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }
}
