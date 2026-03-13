import Phaser from "phaser";
import { NR_CONFIG } from "./NebulaRunnerConfig";
import { NebulaRunnerUI } from "./NebulaRunnerUI";
import { Ship } from "./Ship";
import { Asteroid } from "./Asteroid";
import { Crystal } from "./Crystal";
import { createSeededRng } from "./SeededRng";

interface RoundConfig {
  seed: number;
  scrollSpeed: number;
  hitboxRadius: number;
  crystalMultiplier: number;
  obstacleDensity: number;
  roundDuration: number;
}

interface RoundStartData {
  round: number;
  roundConfig?: RoundConfig;
  effects?: unknown[];
}

interface RoundResult {
  crystalsCollected: number;
  distanceSurvived: number;
  nearMisses: number;
  livesRemaining: number;
  asteroidsDestroyed: number;
}

interface ParallaxStar {
  obj: Phaser.GameObjects.Arc;
  speed: number;
}

interface NebulaCloud {
  obj: Phaser.GameObjects.Rectangle;
  speed: number;
}

interface Projectile {
  obj: Phaser.GameObjects.Image;
  x: number;
  y: number;
  alive: boolean;
}

export class NebulaRunnerScene extends Phaser.Scene {
  private ship!: Ship;
  private asteroids: Asteroid[] = [];
  private crystals: Crystal[] = [];
  private ui!: NebulaRunnerUI;

  private rng!: () => number;
  private scrollSpeed: number = 200;
  private hitboxRadius: number = 10;
  private crystalMultiplier: number = 1;
  private obstacleDensity: number = 1;
  private roundDuration: number = NR_CONFIG.ROUND_DURATION_SEC;

  private timeRemaining: number = 0;
  private lives: number = 3;
  private score: number = 0;
  private crystalsCollected: number = 0;
  private nearMisses: number = 0;
  private distanceSurvived: number = 0;
  private roundActive: boolean = false;

  private asteroidTimer: number = 0;
  private crystalTimer: number = 0;
  private asteroidsDestroyed: number = 0;

  // Projectiles
  private projectiles: Projectile[] = [];
  private fireCooldown: number = 0;
  private spaceKey!: Phaser.Input.Keyboard.Key;

  private onRoundComplete: ((result: RoundResult) => void) | null = null;

  // Parallax layers
  private bgStars: ParallaxStar[] = [];
  private nebulaClouds: NebulaCloud[] = [];
  private bgTileSprite!: Phaser.GameObjects.TileSprite;

  // Keyboard
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor() {
    super({ key: "NebulaRunner" });
  }

  preload(): void {
    this.load.image("nr_ship", "/assets/arcade/nebula-runner/ship.png");
    this.load.image("nr_thrust", "/assets/arcade/nebula-runner/thrust.png");
    this.load.image("nr_laser", "/assets/arcade/nebula-runner/laser.png");
    this.load.image("nr_crystal", "/assets/arcade/nebula-runner/crystal.png");
    this.load.image("nr_bg", "/assets/arcade/nebula-runner/bg.png");
    this.load.image(
      "nr_asteroid_small",
      "/assets/arcade/nebula-runner/asteroid_small.png",
    );
    this.load.image(
      "nr_asteroid_small2",
      "/assets/arcade/nebula-runner/asteroid_small2.png",
    );
    this.load.image(
      "nr_asteroid_medium",
      "/assets/arcade/nebula-runner/asteroid_medium.png",
    );
    this.load.image(
      "nr_asteroid_medium2",
      "/assets/arcade/nebula-runner/asteroid_medium2.png",
    );
    this.load.image(
      "nr_asteroid_large",
      "/assets/arcade/nebula-runner/asteroid_large.png",
    );
    this.load.image(
      "nr_asteroid_large2",
      "/assets/arcade/nebula-runner/asteroid_large2.png",
    );
    this.load.image(
      "nr_asteroid_grey_small",
      "/assets/arcade/nebula-runner/asteroid_grey_small.png",
    );
    this.load.image(
      "nr_asteroid_grey_medium",
      "/assets/arcade/nebula-runner/asteroid_grey_medium.png",
    );
    this.load.image(
      "nr_asteroid_grey_large",
      "/assets/arcade/nebula-runner/asteroid_grey_large.png",
    );
  }

  create(): void {
    // Tiled space background
    this.bgTileSprite = this.add
      .tileSprite(
        NR_CONFIG.FIELD_WIDTH / 2,
        NR_CONFIG.FIELD_HEIGHT / 2,
        NR_CONFIG.FIELD_WIDTH,
        NR_CONFIG.FIELD_HEIGHT,
        "nr_bg",
      )
      .setDepth(0);

    // Parallax stars
    this.bgStars = [];
    for (let i = 0; i < NR_CONFIG.BG_STAR_COUNT; i++) {
      const x = Math.random() * NR_CONFIG.FIELD_WIDTH;
      const y = Math.random() * NR_CONFIG.FIELD_HEIGHT;
      const size = 0.5 + Math.random() * 2;
      const brightness = 0.2 + Math.random() * 0.5;
      const starColors = [0xffffff, 0xaaaacc, 0x8899bb, 0xccccff];
      const color = starColors[Math.floor(Math.random() * starColors.length)];
      const speed = NR_CONFIG.BG_STAR_SPEED * (0.5 + Math.random() * 1.0);

      const obj = this.add.circle(x, y, size, color, brightness).setDepth(1);

      this.bgStars.push({ obj, speed });
    }

    // Nebula clouds (soft ellipses using overlapping circles)
    this.nebulaClouds = [];
    const nebulaColors = [0x6633aa, 0x334499, 0x553388, 0x224477];
    for (let i = 0; i < 4; i++) {
      const x =
        NR_CONFIG.FIELD_WIDTH * 0.25 + Math.random() * NR_CONFIG.FIELD_WIDTH;
      const y = 50 + Math.random() * (NR_CONFIG.FIELD_HEIGHT - 100);
      const color = nebulaColors[i % nebulaColors.length];
      const speed = NR_CONFIG.MID_NEBULA_SPEED * (0.8 + Math.random() * 0.4);
      const radius = 60 + Math.random() * 80;

      // Draw soft cloud using layered circles with decreasing alpha
      const gfx = this.add.graphics().setDepth(1);
      gfx.fillStyle(color, 0.04);
      gfx.fillEllipse(0, 0, radius * 2.5, radius * 1.4);
      gfx.fillStyle(color, 0.06);
      gfx.fillEllipse(0, 0, radius * 1.6, radius * 1.0);
      gfx.fillStyle(color, 0.05);
      gfx.fillEllipse(0, 0, radius * 1.0, radius * 0.7);
      gfx.setPosition(x, y);

      this.nebulaClouds.push({ obj: gfx as any, speed });
    }

    // UI
    this.ui = new NebulaRunnerUI(this);

    // Get round data from registry
    const roundStart = this.registry.get("roundStart") as
      | RoundStartData
      | undefined;
    this.onRoundComplete = this.registry.get("onRoundComplete") as
      | ((result: RoundResult) => void)
      | null;

    if (roundStart?.roundConfig) {
      this.startRound(roundStart);
    }

    // Mouse tracking
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (this.ship) {
        this.ship.targetY = pointer.y;
        this.ship.targetX = Phaser.Math.Clamp(
          pointer.x,
          NR_CONFIG.SHIP_MIN_X,
          NR_CONFIG.SHIP_MAX_X,
        );
      }
    });

    // Keyboard
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.spaceKey = this.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.SPACE,
      );
    }

    // Listen for new round events
    this.game.events.on("newRound", (data: RoundStartData) => {
      this.startRound(data);
    });
  }

  private startRound(data: RoundStartData): void {
    if (!data.roundConfig) return;

    const cfg = data.roundConfig;
    this.scrollSpeed = cfg.scrollSpeed;
    this.hitboxRadius = cfg.hitboxRadius;
    this.crystalMultiplier = cfg.crystalMultiplier;
    this.obstacleDensity = cfg.obstacleDensity;
    this.roundDuration = cfg.roundDuration;

    // Initialize RNG
    this.rng = createSeededRng(cfg.seed);

    // Clear previous entities
    this.asteroids.forEach((a) => a.destroy());
    this.asteroids.length = 0;
    this.crystals.forEach((c) => c.destroy());
    this.crystals.length = 0;

    // Create ship
    if (this.ship) {
      this.ship.destroy();
    }
    this.ship = new Ship(
      this,
      NR_CONFIG.SHIP_X,
      NR_CONFIG.FIELD_HEIGHT / 2,
      this.hitboxRadius,
    );

    // Clear projectiles
    this.projectiles.forEach((p) => p.obj.destroy());
    this.projectiles.length = 0;
    this.fireCooldown = 0;

    // Reset state
    this.score = 0;
    this.crystalsCollected = 0;
    this.nearMisses = 0;
    this.distanceSurvived = 0;
    this.asteroidsDestroyed = 0;
    this.lives = 3;
    this.timeRemaining = this.roundDuration;
    this.roundActive = false;

    // Initialize spawn timers using rng
    this.asteroidTimer =
      NR_CONFIG.BASE_OBSTACLE_INTERVAL *
      (1 / this.obstacleDensity) *
      (0.5 + this.rng());
    this.crystalTimer = NR_CONFIG.CRYSTAL_INTERVAL * (0.5 + this.rng());

    // Update UI
    this.ui.updateScore(0);
    this.ui.updateTime(this.roundDuration);
    this.ui.updateLives(this.lives);
    this.ui.updateCrystals(0);

    // Countdown 3-2-1
    this.startCountdown();
  }

  private startCountdown(): void {
    for (let i = 0; i < NR_CONFIG.COUNTDOWN_SEC; i++) {
      const count = NR_CONFIG.COUNTDOWN_SEC - i;
      this.time.delayedCall(i * 1000, () => {
        this.ui.showInstruction(`${count}`);
      });
    }

    this.time.delayedCall(NR_CONFIG.COUNTDOWN_SEC * 1000, () => {
      this.ui.hideInstruction();
      this.roundActive = true;
    });
  }

  update(_time: number, delta: number): void {
    // Update parallax always
    this.updateParallax(delta);

    if (!this.roundActive) return;

    // Keyboard input
    if (this.cursors && this.ship) {
      const keySpeed = 400;
      const dt = delta / 1000;
      if (this.cursors.up.isDown) {
        this.ship.targetY -= keySpeed * dt;
      }
      if (this.cursors.down.isDown) {
        this.ship.targetY += keySpeed * dt;
      }
      this.ship.targetY = Phaser.Math.Clamp(
        this.ship.targetY,
        20,
        NR_CONFIG.FIELD_HEIGHT - 20,
      );

      // Left/right movement
      if (this.cursors.left.isDown) {
        this.ship.targetX -= NR_CONFIG.SHIP_SPEED_X * dt;
      }
      if (this.cursors.right.isDown) {
        this.ship.targetX += NR_CONFIG.SHIP_SPEED_X * dt;
      }
      this.ship.targetX = Phaser.Math.Clamp(
        this.ship.targetX,
        NR_CONFIG.SHIP_MIN_X,
        NR_CONFIG.SHIP_MAX_X,
      );

      // Shooting
      this.fireCooldown = Math.max(0, this.fireCooldown - delta);
      if (
        this.spaceKey &&
        Phaser.Input.Keyboard.JustDown(this.spaceKey) &&
        this.fireCooldown <= 0
      ) {
        this.fireProjectile();
        this.fireCooldown = NR_CONFIG.FIRE_COOLDOWN_MS;
      }
    }

    // Update ship
    this.ship.update(delta);

    // Tick timer
    this.timeRemaining -= delta / 1000;
    this.ui.updateTime(this.timeRemaining);
    if (this.timeRemaining <= 0) {
      this.completeRound();
      return;
    }

    // Spawn asteroids
    this.asteroidTimer -= delta / 1000;
    if (this.asteroidTimer <= 0) {
      this.spawnAsteroid();
    }

    // Spawn crystals
    this.crystalTimer -= delta / 1000;
    if (this.crystalTimer <= 0) {
      this.spawnCrystal();
    }

    // Update all asteroids
    for (const asteroid of this.asteroids) {
      asteroid.update(delta);
    }

    // Update all crystals
    for (const crystal of this.crystals) {
      crystal.update(delta, this.scrollSpeed);
    }

    // Collision detection: asteroids
    this.checkAsteroidCollisions();

    // Collision detection: crystals
    this.checkCrystalCollisions();

    // Update projectiles
    this.updateProjectiles(delta);

    // Collision detection: projectiles vs asteroids
    this.checkProjectileCollisions();

    // Clean up dead asteroids (in-place splice)
    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      if (!this.asteroids[i].alive) {
        this.asteroids[i].destroy();
        this.asteroids.splice(i, 1);
      }
    }

    // Clean up dead crystals (in-place splice)
    for (let i = this.crystals.length - 1; i >= 0; i--) {
      if (!this.crystals[i].alive) {
        if (!this.crystals[i].collected) {
          this.crystals[i].destroy();
        }
        this.crystals.splice(i, 1);
      }
    }

    // Update continuous score
    this.distanceSurvived = this.roundDuration - this.timeRemaining;
    this.score =
      this.crystalsCollected *
        NR_CONFIG.CRYSTAL_VALUE *
        this.crystalMultiplier +
      this.distanceSurvived * NR_CONFIG.DISTANCE_POINTS_PER_SEC +
      this.nearMisses * NR_CONFIG.NEAR_MISS_BONUS +
      this.asteroidsDestroyed * NR_CONFIG.KILL_BONUS;

    this.ui.updateScore(this.score);
  }

  private updateParallax(delta: number): void {
    const dt = delta / 1000;

    // Scroll the tiled background
    if (this.bgTileSprite) {
      this.bgTileSprite.tilePositionX += this.scrollSpeed * 0.2 * dt;
    }

    for (const star of this.bgStars) {
      star.obj.x -= this.scrollSpeed * star.speed * dt;
      if (star.obj.x < -5) {
        star.obj.x = NR_CONFIG.FIELD_WIDTH + 5;
        star.obj.y = Math.random() * NR_CONFIG.FIELD_HEIGHT;
      }
    }

    for (const cloud of this.nebulaClouds) {
      cloud.obj.x -= this.scrollSpeed * cloud.speed * dt;
      if (cloud.obj.x < -200) {
        cloud.obj.x = NR_CONFIG.FIELD_WIDTH + 200;
        cloud.obj.y = 50 + Math.random() * (NR_CONFIG.FIELD_HEIGHT - 100);
      }
    }
  }

  private spawnAsteroid(): void {
    // RNG calls in FIXED ORDER: y, sizeIndex, speedVariance, nextInterval
    const y = 30 + this.rng() * (NR_CONFIG.FIELD_HEIGHT - 60);
    const sizeIndex = Math.floor(this.rng() * NR_CONFIG.ASTEROID_SIZES.length);
    const radius = NR_CONFIG.ASTEROID_SIZES[sizeIndex];
    const speedVariance =
      (this.rng() - 0.5) *
      2 *
      NR_CONFIG.ASTEROID_SPEED_VARIANCE *
      this.scrollSpeed;

    const asteroid = new Asteroid(
      this,
      NR_CONFIG.FIELD_WIDTH + radius,
      y,
      radius,
      this.scrollSpeed + speedVariance,
      this.rng,
    );
    this.asteroids.push(asteroid);

    // Reset timer
    this.asteroidTimer =
      NR_CONFIG.BASE_OBSTACLE_INTERVAL *
      (1 / this.obstacleDensity) *
      (0.5 + this.rng());
  }

  private spawnCrystal(): void {
    // RNG calls in FIXED ORDER: y, nextInterval
    const y = 30 + this.rng() * (NR_CONFIG.FIELD_HEIGHT - 60);

    const crystal = new Crystal(this, NR_CONFIG.FIELD_WIDTH + 20, y);
    this.crystals.push(crystal);

    // Reset timer
    this.crystalTimer = NR_CONFIG.CRYSTAL_INTERVAL * (0.5 + this.rng());
  }

  private checkAsteroidCollisions(): void {
    for (const asteroid of this.asteroids) {
      if (!asteroid.alive) continue;

      const dx = this.ship.x - asteroid.x;
      const dy = this.ship.y - asteroid.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.hitboxRadius + asteroid.radius) {
        // Direct hit
        if (!this.ship.isInvulnerable) {
          this.ship.hit();
          this.lives--;
          this.ui.updateLives(this.lives);
          this.ui.showFloatingText(
            this.ship.x,
            this.ship.y - 20,
            "HIT!",
            "#f85149",
          );

          // Flash screen red overlay
          const overlay = this.add
            .rectangle(
              NR_CONFIG.FIELD_WIDTH / 2,
              NR_CONFIG.FIELD_HEIGHT / 2,
              NR_CONFIG.FIELD_WIDTH,
              NR_CONFIG.FIELD_HEIGHT,
              0xf85149,
              0.2,
            )
            .setDepth(15);

          this.tweens.add({
            targets: overlay,
            alpha: 0,
            duration: 300,
            onComplete: () => overlay.destroy(),
          });

          if (this.lives <= 0) {
            this.completeRound();
            return;
          }
        }
      } else if (
        dist <
          this.hitboxRadius + asteroid.radius + NR_CONFIG.NEAR_MISS_THRESHOLD &&
        !asteroid.nearMissed
      ) {
        // Near miss
        asteroid.nearMissed = true;
        this.nearMisses++;
        this.score += NR_CONFIG.NEAR_MISS_BONUS;
        this.ui.showFloatingText(
          this.ship.x,
          this.ship.y - 20,
          "NEAR MISS!",
          "#d29922",
        );

        // Gold ring effect around ship
        const ring = this.add
          .circle(
            this.ship.x,
            this.ship.y,
            this.hitboxRadius + 12,
            NR_CONFIG.NEAR_MISS_RING_COLOR,
            0,
          )
          .setStrokeStyle(2, NR_CONFIG.NEAR_MISS_RING_COLOR, 0.8)
          .setDepth(8);

        this.tweens.add({
          targets: ring,
          scaleX: 2,
          scaleY: 2,
          alpha: 0,
          duration: 400,
          onComplete: () => ring.destroy(),
        });
      }
    }
  }

  private checkCrystalCollisions(): void {
    for (const crystal of this.crystals) {
      if (!crystal.alive || crystal.collected) continue;

      const dx = this.ship.x - crystal.x;
      const dy = this.ship.y - crystal.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.hitboxRadius + NR_CONFIG.CRYSTAL_SIZE) {
        crystal.collect();
        this.crystalsCollected++;
        const value = Math.floor(
          NR_CONFIG.CRYSTAL_VALUE * this.crystalMultiplier,
        );
        this.ui.updateCrystals(this.crystalsCollected);
        this.ui.showFloatingText(
          crystal.x,
          crystal.y - 10,
          `+${value}`,
          "#d29922",
        );
      }
    }
  }

  private fireProjectile(): void {
    const proj = this.add
      .image(this.ship.x + NR_CONFIG.SHIP_WIDTH / 2, this.ship.y, "nr_laser")
      .setOrigin(0.5, 0.5)
      .setDisplaySize(16, 6)
      .setDepth(7);

    this.projectiles.push({
      obj: proj,
      x: proj.x,
      y: proj.y,
      alive: true,
    });
  }

  private updateProjectiles(delta: number): void {
    const speed =
      this.scrollSpeed * NR_CONFIG.PROJECTILE_SPEED_MULT * (delta / 1000);

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (!p.alive) {
        p.obj.destroy();
        this.projectiles.splice(i, 1);
        continue;
      }

      p.x += speed;
      p.obj.x = p.x;

      // Off screen
      if (p.x > NR_CONFIG.FIELD_WIDTH + 10) {
        p.alive = false;
        p.obj.destroy();
        this.projectiles.splice(i, 1);
      }
    }
  }

  private checkProjectileCollisions(): void {
    for (const proj of this.projectiles) {
      if (!proj.alive) continue;

      for (const asteroid of this.asteroids) {
        if (!asteroid.alive) continue;

        const dx = proj.x - asteroid.x;
        const dy = proj.y - asteroid.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < asteroid.radius) {
          const destroyed = asteroid.hit();

          if (destroyed) {
            this.asteroidsDestroyed++;
            this.ui.showFloatingText(
              asteroid.x,
              asteroid.y - 10,
              `+${NR_CONFIG.KILL_BONUS}`,
              "#56d4dd",
            );
          }

          // Destroy the projectile
          proj.alive = false;
          break;
        }
      }
    }
  }

  private completeRound(): void {
    this.roundActive = false;

    // Final score
    this.distanceSurvived =
      this.roundDuration - Math.max(0, this.timeRemaining);
    this.score =
      this.crystalsCollected *
        NR_CONFIG.CRYSTAL_VALUE *
        this.crystalMultiplier +
      this.distanceSurvived * NR_CONFIG.DISTANCE_POINTS_PER_SEC +
      this.nearMisses * NR_CONFIG.NEAR_MISS_BONUS +
      this.asteroidsDestroyed * NR_CONFIG.KILL_BONUS;

    this.ui.updateScore(this.score);
    this.ui.showInstruction("ROUND COMPLETE");

    if (this.onRoundComplete) {
      this.onRoundComplete({
        crystalsCollected: this.crystalsCollected,
        distanceSurvived: this.distanceSurvived,
        nearMisses: this.nearMisses,
        livesRemaining: this.lives,
        asteroidsDestroyed: this.asteroidsDestroyed,
      });
    }
  }
}
