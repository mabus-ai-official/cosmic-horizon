import Phaser from "phaser";
import { TD_CONFIG } from "./TurretDefenseConfig";
import type { Enemy } from "./Enemy";

export class Projectile {
  private scene: Phaser.Scene;
  private circle: Phaser.GameObjects.Arc;
  public alive: boolean = true;

  private target: Enemy;
  private damage: number;
  private splashRadius: number;
  private slowFactor: number;
  private color: number;
  private enemies: Enemy[];

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    target: Enemy,
    damage: number,
    color: number,
    enemies: Enemy[],
    splashRadius: number = 0,
    slowFactor: number = 0,
  ) {
    this.scene = scene;
    this.target = target;
    this.damage = damage;
    this.splashRadius = splashRadius;
    this.slowFactor = slowFactor;
    this.color = color;
    this.enemies = enemies;

    this.circle = scene.add
      .circle(x, y, TD_CONFIG.PROJECTILE_RADIUS, color)
      .setDepth(8);
  }

  update(delta: number): void {
    if (!this.alive) return;

    // If target died, just hit its last known position
    const tx = this.target.alive ? this.target.x : this.target.x;
    const ty = this.target.alive ? this.target.y : this.target.y;

    const dx = tx - this.circle.x;
    const dy = ty - this.circle.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Arrived at target
    if (dist < 6) {
      this.onArrival();
      return;
    }

    // Move toward target
    const step = (TD_CONFIG.PROJECTILE_SPEED * delta) / 1000;
    const ratio = Math.min(step / dist, 1);
    this.circle.x += dx * ratio;
    this.circle.y += dy * ratio;
  }

  private onArrival(): void {
    if (!this.alive) return;
    this.alive = false;

    if (this.splashRadius > 0) {
      // AoE damage — hit all enemies in splash radius
      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;
        const dist = Phaser.Math.Distance.Between(
          this.circle.x,
          this.circle.y,
          enemy.x,
          enemy.y,
        );
        if (dist <= this.splashRadius) {
          enemy.takeDamage(this.damage);
        }
      }
      // Splash visual
      const splash = this.scene.add
        .circle(
          this.circle.x,
          this.circle.y,
          this.splashRadius,
          this.color,
          0.2,
        )
        .setDepth(7);
      this.scene.tweens.add({
        targets: splash,
        alpha: 0,
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 200,
        onComplete: () => splash.destroy(),
      });
    } else if (this.slowFactor > 0) {
      // Slow — apply to target directly
      if (this.target.alive) {
        this.target.applySlow(this.slowFactor, 2000);
      }
    } else {
      // Single target — guaranteed hit
      if (this.target.alive) {
        this.target.takeDamage(this.damage);
      }
    }

    this.destroy();
  }

  destroy(): void {
    this.alive = false;
    this.circle.destroy();
  }
}
