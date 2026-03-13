import Phaser from "phaser";
import { TD_CONFIG } from "./TurretDefenseConfig";
import { Projectile } from "./Projectile";
import type { Enemy } from "./Enemy";

export type TurretType = "basic" | "splash" | "slow" | "sniper";

const TURRET_GUN_TEXTURES: Record<TurretType, string> = {
  basic: "td_turret_basic",
  splash: "td_turret_splash",
  slow: "td_turret_slow",
  sniper: "td_turret_sniper",
};

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
  private baseSprite: Phaser.GameObjects.Image;
  private gunSprite: Phaser.GameObjects.Image;
  private rangeCircle: Phaser.GameObjects.Arc;
  private hitArea: Phaser.GameObjects.Rectangle;
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

    // Base platform sprite
    this.baseSprite = scene.add
      .image(worldX, worldY, "td_turret_base")
      .setDisplaySize(24, 24)
      .setDepth(3);

    // Gun sprite on top — rotates to face enemies
    const gunTexture = TURRET_GUN_TEXTURES[type];
    this.gunSprite = scene.add
      .image(worldX, worldY, gunTexture)
      .setDisplaySize(24, 24)
      .setDepth(4);

    // Invisible hit area for hover interaction
    this.hitArea = scene.add
      .rectangle(worldX, worldY, 24, 24, 0x000000, 0)
      .setDepth(5)
      .setInteractive({ useHandCursor: true });

    // Range circle indicator (gameplay UI — keep as graphic)
    this.rangeCircle = scene.add
      .circle(worldX, worldY, stats.range, color, TD_CONFIG.RANGE_ALPHA)
      .setDepth(2)
      .setVisible(false);

    this.hitArea.on("pointerover", () => this.rangeCircle.setVisible(true));
    this.hitArea.on("pointerout", () => this.rangeCircle.setVisible(false));
  }

  update(delta: number): void {
    this.cooldown -= delta / 1000;

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

    // Rotate gun toward target (even while on cooldown for visual feedback)
    if (target) {
      const angle = Phaser.Math.Angle.Between(
        this.x,
        this.y,
        target.x,
        target.y,
      );
      this.gunSprite.setRotation(angle);
    }

    if (this.cooldown > 0 || !target) return;

    this.cooldown = this.stats.fireRate;

    const proj = new Projectile(
      this.scene,
      this.x,
      this.y,
      target,
      this.stats.damage,
      this.type,
      this.enemies,
      this.stats.splashRadius || 0,
      this.stats.slowFactor || 0,
    );
    this.projectiles.push(proj);
  }

  destroy(): void {
    this.baseSprite.destroy();
    this.gunSprite.destroy();
    this.hitArea.destroy();
    this.rangeCircle.destroy();
  }
}
