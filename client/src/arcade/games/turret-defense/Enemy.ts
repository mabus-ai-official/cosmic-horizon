import Phaser from "phaser";
import { TD_CONFIG } from "./TurretDefenseConfig";

interface Waypoint {
  x: number;
  y: number;
}

export class Enemy {
  private scene: Phaser.Scene;
  private circle: Phaser.GameObjects.Arc;
  private hpBar: Phaser.GameObjects.Rectangle;
  private hpBarBg: Phaser.GameObjects.Rectangle;

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
    this.circle = scene.add
      .circle(start.x, start.y, TD_CONFIG.ENEMY_RADIUS, TD_CONFIG.ENEMY_COLOR)
      .setDepth(5);

    // HP bar background
    this.hpBarBg = scene.add
      .rectangle(start.x, start.y - 12, 16, 3, 0x333333)
      .setDepth(6);

    // HP bar fill
    this.hpBar = scene.add
      .rectangle(start.x, start.y - 12, 16, 3, 0x3fb950)
      .setDepth(7);
  }

  get x(): number {
    return this.circle.x;
  }

  get y(): number {
    return this.circle.y;
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
        this.circle.setFillStyle(TD_CONFIG.ENEMY_COLOR);
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

    // speed is in "field-widths per second" — scale to pixels
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

    this.circle.setPosition(cx, cy);
    this.hpBarBg.setPosition(cx, cy - 12);
    this.hpBar.setPosition(cx, cy - 12);
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
    this.circle.setFillStyle(0x56d4dd);
  }

  private deathAnimation(): void {
    this.scene.tweens.add({
      targets: [this.circle, this.hpBar, this.hpBarBg],
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 200,
      onComplete: () => this.destroy(),
    });
  }

  destroy(): void {
    this.circle.destroy();
    this.hpBar.destroy();
    this.hpBarBg.destroy();
  }
}
