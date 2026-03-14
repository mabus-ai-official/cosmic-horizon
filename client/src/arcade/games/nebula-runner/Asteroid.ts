import Phaser from "phaser";
import { NR_CONFIG } from "./NebulaRunnerConfig";

export class Asteroid {
  private scene: Phaser.Scene;
  private body: Phaser.GameObjects.Image;

  public alive: boolean = true;
  public nearMissed: boolean = false;
  public radius: number;
  public speed: number;
  public hp: number;

  /** Texture keys by size index, with brown and grey variants */
  private static readonly TEXTURE_MAP: Record<number, string[]> = {
    0: ["nr_asteroid_small", "nr_asteroid_small2", "nr_asteroid_grey_small"],
    1: ["nr_asteroid_medium", "nr_asteroid_medium2", "nr_asteroid_grey_medium"],
    2: ["nr_asteroid_large", "nr_asteroid_grey_large"],
    3: ["nr_asteroid_large2", "nr_asteroid_grey_large"],
  };

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    radius: number,
    speed: number,
    rng: () => number,
  ) {
    this.scene = scene;
    this.radius = radius;
    this.speed = speed;
    this.hp = radius <= 16 ? 1 : radius <= 32 ? 2 : 3;

    // Determine size index from radius
    const sizeIndex = NR_CONFIG.ASTEROID_SIZES.indexOf(radius);
    const idx = sizeIndex >= 0 ? sizeIndex : 0;

    // Pick a random texture variant (consume rng calls to preserve determinism)
    const variants = Asteroid.TEXTURE_MAP[idx];
    // Consume 8 rng calls to maintain parity with the old jittered polygon vertices
    for (let i = 0; i < 8; i++) {
      rng();
    }
    const textureKey = variants[Math.floor(rng() * variants.length)];
    const diameter = radius * 2;

    this.body = scene.add
      .image(x, y, textureKey)
      .setOrigin(0.5, 0.5)
      .setDisplaySize(diameter, diameter)
      .setDepth(4);
  }

  get x(): number {
    return this.body.x;
  }

  get y(): number {
    return this.body.y;
  }

  update(delta: number): void {
    if (!this.alive) return;

    const dx = this.speed * (delta / 1000);
    this.body.x -= dx;

    if (this.body.x < -this.radius) {
      this.alive = false;
    }
  }

  /** Decrement HP and flash. Returns true if destroyed (hp <= 0). */
  hit(): boolean {
    this.hp--;
    if (this.hp <= 0) {
      this.alive = false;
      return true;
    }

    // Flash white briefly on hit
    this.body.setTint(0xffffff);
    this.scene.time.delayedCall(80, () => {
      if (this.body && this.body.active) {
        this.body.clearTint();
      }
    });
    return false;
  }

  destroy(): void {
    if (this.body) {
      this.body.destroy();
    }
  }
}
