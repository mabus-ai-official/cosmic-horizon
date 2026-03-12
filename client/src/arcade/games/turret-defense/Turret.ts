import Phaser from "phaser";
import { TD_CONFIG } from "./TurretDefenseConfig";
import { Projectile } from "./Projectile";
import type { Enemy } from "./Enemy";

export type TurretType = "basic" | "splash" | "slow" | "sniper";

interface TurretStats {
  cost: number;
  damage: number;
  range: number;
  fireRate: number;
  splashRadius?: number;
  slowFactor?: number;
}

export class Turret {
  private scene: Phaser.Scene;
  private body: Phaser.GameObjects.Arc;
  private rangeCircle: Phaser.GameObjects.Arc;
  private cooldown: number = 0;

  public type: TurretType;
  public stats: TurretStats;
  public gridX: number;
  public gridY: number;
  public x: number;
  public y: number;

  private enemies: Enemy[];
  private projectiles: Projectile[];

  constructor(
    scene: Phaser.Scene,
    gridX: number,
    gridY: number,
    worldX: number,
    worldY: number,
    type: TurretType,
    stats: TurretStats,
    enemies: Enemy[],
    projectiles: Projectile[],
  ) {
    this.scene = scene;
    this.gridX = gridX;
    this.gridY = gridY;
    this.x = worldX;
    this.y = worldY;
    this.type = type;
    this.stats = stats;
    this.enemies = enemies;
    this.projectiles = projectiles;

    const color = TD_CONFIG.TURRET_COLORS[type] || 0xffffff;

    this.body = scene.add
      .circle(worldX, worldY, TD_CONFIG.TURRET_RADIUS, color, 0.9)
      .setDepth(4)
      .setInteractive();

    // Inner marker for type
    const markerSize = 4;
    scene.add.circle(worldX, worldY, markerSize, 0x0a0e14, 0.6).setDepth(4);

    this.rangeCircle = scene.add
      .circle(worldX, worldY, stats.range, color, TD_CONFIG.RANGE_ALPHA)
      .setDepth(2)
      .setVisible(false);

    this.body.on("pointerover", () => this.rangeCircle.setVisible(true));
    this.body.on("pointerout", () => this.rangeCircle.setVisible(false));
  }

  update(delta: number): void {
    this.cooldown -= delta / 1000;
    if (this.cooldown > 0) return;

    // Find target: enemy farthest along path that's in range
    let target: Enemy | null = null;
    let bestProgress = -1;

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const dist = Phaser.Math.Distance.Between(
        this.x,
        this.y,
        enemy.x,
        enemy.y,
      );
      if (dist <= this.stats.range && enemy.pathProgress > bestProgress) {
        bestProgress = enemy.pathProgress;
        target = enemy;
      }
    }

    if (!target) return;

    this.cooldown = this.stats.fireRate;

    const color = TD_CONFIG.TURRET_COLORS[this.type] || 0xffffff;
    const proj = new Projectile(
      this.scene,
      this.x,
      this.y,
      target,
      this.stats.damage,
      color,
      this.enemies,
      this.stats.splashRadius || 0,
      this.stats.slowFactor || 0,
    );
    this.projectiles.push(proj);
  }

  destroy(): void {
    this.body.destroy();
    this.rangeCircle.destroy();
  }
}
