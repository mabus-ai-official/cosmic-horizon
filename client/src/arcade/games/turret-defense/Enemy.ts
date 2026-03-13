import Phaser from "phaser";
import { TD_CONFIG } from "./TurretDefenseConfig";

interface Waypoint {
  x: number;
  y: number;
}

/** Pick enemy texture based on HP thresholds */
function getEnemyTexture(hp: number, speed: number): string {
  if (hp >= 200) return "td_enemy_boss";
  if (hp >= 80) return "td_enemy_heavy";
  if (speed >= 1.5) return "td_enemy_fast";
  return "td_enemy_basic";
}

export class Enemy {
  private scene: Phaser.Scene;
  private sprite: Phaser.GameObjects.Image;
  private hpBar: Phaser.GameObjects.Rectangle;
  private hpBarBg: Phaser.GameObjects.Rectangle;
  private slowTint: boolean = false;

  public hp: number;
  public maxHP: number;
  public speed: number;
  public value: number;
  public alive: boolean = true;
  public reachedEnd: boolean = false;

  private waypoints: Waypoint[];
  private waypointIndex: number = 0;
  private progress: number = 0; // 0-1 between current waypoints
  private slowTimer: number = 0;
  private baseSpeed: number;

  constructor(
    scene: Phaser.Scene,
    waypoints: Waypoint[],
    hp: number,
    speed: number,
    value: number,
  ) {
    this.scene = scene;
    this.waypoints = waypoints;
    this.hp = hp;
    this.maxHP = hp;
    this.speed = speed;
    this.baseSpeed = speed;
    this.value = value;

    const start = waypoints[0];
    const texture = getEnemyTexture(hp, speed);
    const spriteSize = hp >= 200 ? 18 : hp >= 80 ? 16 : 14;

    this.sprite = scene.add
      .image(start.x, start.y, texture)
      .setDisplaySize(spriteSize, spriteSize)
      .setDepth(5);

    // HP bar background
    this.hpBarBg = scene.add
      .rectangle(start.x, start.y - 14, 16, 3, 0x333333)
      .setDepth(6);

    // HP bar fill
    this.hpBar = scene.add
      .rectangle(start.x, start.y - 14, 16, 3, 0x3fb950)
      .setDepth(7);
  }

  get x(): number {
    return this.sprite.x;
  }

  get y(): number {
    return this.sprite.y;
  }

  /** Fraction of total path traversed (0=start, 1=end) */
  get pathProgress(): number {
    if (this.waypoints.length <= 1) return 0;
    return (this.waypointIndex + this.progress) / (this.waypoints.length - 1);
  }

  update(delta: number): void {
    if (!this.alive) return;

    // Tick slow timer
    if (this.slowTimer > 0) {
      this.slowTimer -= delta;
      if (this.slowTimer <= 0) {
        this.speed = this.baseSpeed;
        if (this.slowTint) {
          this.sprite.clearTint();
          this.slowTint = false;
        }
      }
    }

    if (this.waypointIndex >= this.waypoints.length - 1) {
      this.reachedEnd = true;
      this.alive = false;
      return;
    }

    const from = this.waypoints[this.waypointIndex];
    const to = this.waypoints[this.waypointIndex + 1];
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const segmentLen = Math.sqrt(dx * dx + dy * dy);

    // speed is in "field-widths per second" -- scale to pixels
    const pixelsPerSec = this.speed * TD_CONFIG.FIELD_WIDTH * 0.3;
    this.progress += (pixelsPerSec * delta) / 1000 / segmentLen;

    if (this.progress >= 1) {
      this.progress -= 1;
      this.waypointIndex++;
      if (this.waypointIndex >= this.waypoints.length - 1) {
        this.reachedEnd = true;
        this.alive = false;
        return;
      }
    }

    const curr = this.waypoints[this.waypointIndex];
    const next = this.waypoints[this.waypointIndex + 1];
    const cx = curr.x + (next.x - curr.x) * this.progress;
    const cy = curr.y + (next.y - curr.y) * this.progress;

    // Rotate sprite to face movement direction
    const moveDx = next.x - curr.x;
    const moveDy = next.y - curr.y;
    this.sprite.setRotation(Math.atan2(moveDy, moveDx));

    this.sprite.setPosition(cx, cy);
    this.hpBarBg.setPosition(cx, cy - 14);
    this.hpBar.setPosition(cx, cy - 14);
    this.hpBar.setDisplaySize(16 * (this.hp / this.maxHP), 3);
  }

  takeDamage(amount: number): void {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      this.deathAnimation();
    }
  }

  applySlow(factor: number, durationMs: number): void {
    this.speed = this.baseSpeed * factor;
    this.slowTimer = durationMs;
    this.sprite.setTint(0x56d4dd);
    this.slowTint = true;
  }

  private deathAnimation(): void {
    this.scene.tweens.add({
      targets: [this.sprite, this.hpBar, this.hpBarBg],
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 200,
      onComplete: () => this.destroy(),
    });
  }

  destroy(): void {
    this.sprite.destroy();
    this.hpBar.destroy();
    this.hpBarBg.destroy();
  }
}
