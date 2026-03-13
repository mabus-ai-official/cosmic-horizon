import Phaser from "phaser";
import { TD_CONFIG } from "./TurretDefenseConfig";
import type { Enemy } from "./Enemy";
import type { TurretType } from "./Turret";

const PROJECTILE_TEXTURES: Record<TurretType, string> = {
  basic: "td_projectile_basic",
  splash: "td_projectile_splash",
  slow: "td_projectile_slow",
  sniper: "td_projectile_sniper",
};

export class Projectile {
  private scene: Phaser.Scene;
  private sprite: Phaser.GameObjects.Image;
  public alive: boolean = true;

  private target: Enemy;
  private damage: number;
  private splashRadius: number;
  private slowFactor: number;
  private enemies: Enemy[];

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    target: Enemy,
    damage: number,
    turretType: TurretType,
    enemies: Enemy[],
    splashRadius: number = 0,
    slowFactor: number = 0,
  ) {
    this.scene = scene;
    this.target = target;
    this.damage = damage;
    this.splashRadius = splashRadius;
    this.slowFactor = slowFactor;
    this.enemies = enemies;

    const texture = PROJECTILE_TEXTURES[turretType];
    this.sprite = scene.add
      .image(x, y, texture)
      .setDisplaySize(10, 10)
      .setDepth(8);

    // Point projectile toward target initially
    const angle = Phaser.Math.Angle.Between(x, y, target.x, target.y);
    this.sprite.setRotation(angle);
  }

  update(delta: number): void {
    if (!this.alive) return;

    // If target died, just hit its last known position
    const tx = this.target.x;
    const ty = this.target.y;

    const dx = tx - this.sprite.x;
    const dy = ty - this.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Arrived at target
    if (dist < 6) {
      this.onArrival();
      return;
    }

    // Move toward target
    const step = (TD_CONFIG.PROJECTILE_SPEED * delta) / 1000;
    const ratio = Math.min(step / dist, 1);
    this.sprite.x += dx * ratio;
    this.sprite.y += dy * ratio;

    // Rotate to face travel direction
    const angle = Math.atan2(dy, dx);
    this.sprite.setRotation(angle);
  }

  private onArrival(): void {
    if (!this.alive) return;
    this.alive = false;

    if (this.splashRadius > 0) {
      // AoE damage -- hit all enemies in splash radius
      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;
        const dist = Phaser.Math.Distance.Between(
          this.sprite.x,
          this.sprite.y,
          enemy.x,
          enemy.y,
        );
        if (dist <= this.splashRadius) {
          enemy.takeDamage(this.damage);
        }
      }
      // Explosion sprite effect
      const explosion = this.scene.add
        .image(this.sprite.x, this.sprite.y, "td_explosion")
        .setDisplaySize(this.splashRadius * 2, this.splashRadius * 2)
        .setAlpha(0.7)
        .setDepth(7);
      this.scene.tweens.add({
        targets: explosion,
        alpha: 0,
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 250,
        onComplete: () => explosion.destroy(),
      });
    } else if (this.slowFactor > 0) {
      // Slow -- apply to target directly + damage
      if (this.target.alive) {
        this.target.takeDamage(this.damage);
        this.target.applySlow(this.slowFactor, 2000);
      }
    } else {
      // Single target -- guaranteed hit
      if (this.target.alive) {
        this.target.takeDamage(this.damage);
      }
    }

    this.destroy();
  }

  destroy(): void {
    this.alive = false;
    this.sprite.destroy();
  }
}
