import Phaser from "phaser";
import { TD_CONFIG } from "./TurretDefenseConfig";
import { TurretDefenseUI } from "./TurretDefenseUI";
import { Enemy } from "./Enemy";
import { Turret, type TurretType } from "./Turret";
import { Projectile } from "./Projectile";

interface WaveConfig {
  enemyCount: number;
  enemyHP: number;
  enemySpeed: number;
}

interface RoundConfig {
  waves: WaveConfig[];
  startingCurrency: number;
  baseHP: number;
  turrets: Record<
    string,
    {
      cost: number;
      damage: number;
      range: number;
      fireRate: number;
      splashRadius?: number;
      slowFactor?: number;
    }
  >;
}

interface RoundStartData {
  round: number;
  roundConfig?: RoundConfig;
  effects?: any[];
}

export class TurretDefenseScene extends Phaser.Scene {
  private ui!: TurretDefenseUI;
  private enemies: Enemy[] = [];
  private turrets: Turret[] = [];
  private projectiles: Projectile[] = [];

  private roundConfig: RoundConfig | null = null;
  private onRoundComplete: ((result: any) => void) | null = null;

  private currency: number = 0;
  private baseHP: number = 0;
  private maxBaseHP: number = 0;
  private currentWave: number = 0;
  private totalWaves: number = 0;
  private enemiesKilled: number = 0;
  private wavesCompleted: number = 0;

  // Spawning state
  private spawnQueue: WaveConfig | null = null;
  private spawnCount: number = 0;
  private spawnTotal: number = 0;
  private spawnTimer: number = 0;
  private waveDelayTimer: number = 0;
  private waveActive: boolean = false;
  private roundActive: boolean = false;

  // Placement
  private selectedTurretType: TurretType | null = null;
  private placementPreview: Phaser.GameObjects.Arc | null = null;
  private rangePreview: Phaser.GameObjects.Arc | null = null;

  // Path / grid data
  private worldWaypoints: { x: number; y: number }[] = [];
  private validCells: Set<string> = new Set();
  private occupiedCells: Set<string> = new Set();

  constructor() {
    super({ key: "TurretDefense" });
  }

  create(): void {
    // Field background
    this.add
      .rectangle(
        TD_CONFIG.FIELD_X + TD_CONFIG.FIELD_WIDTH / 2,
        TD_CONFIG.FIELD_Y + TD_CONFIG.FIELD_HEIGHT / 2,
        TD_CONFIG.FIELD_WIDTH,
        TD_CONFIG.FIELD_HEIGHT,
        0x161b22,
        0.5,
      )
      .setDepth(0);

    // Compute world-space waypoints
    this.worldWaypoints = TD_CONFIG.PATH_WAYPOINTS.map((wp) => ({
      x: TD_CONFIG.FIELD_X + wp.x * TD_CONFIG.FIELD_WIDTH,
      y: TD_CONFIG.FIELD_Y + wp.y * TD_CONFIG.FIELD_HEIGHT,
    }));

    // Draw path
    this.drawPath();

    // Compute valid placement cells (adjacent to path)
    this.computeValidCells();

    // Draw grid on valid cells
    this.drawGrid();

    // UI
    this.ui = new TurretDefenseUI(this, (type) => {
      this.selectedTurretType = type;
      this.updatePlacementPreview();
    });

    // Get round data
    const roundStart = this.registry.get("roundStart") as RoundStartData;
    this.onRoundComplete = this.registry.get("onRoundComplete") as
      | ((result: any) => void)
      | null;

    console.log("[TD] create() roundStart:", JSON.stringify(roundStart));
    console.log("[TD] onRoundComplete:", !!this.onRoundComplete);

    if (roundStart?.roundConfig) {
      console.log("[TD] calling startRound");
      this.startRound(roundStart);
    } else {
      console.warn("[TD] no roundConfig in roundStart, game won't start");
    }

    // Click to place turret
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.handlePlacement(pointer.x, pointer.y);
    });

    // Move preview with cursor
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      this.updatePlacementPreview(pointer.x, pointer.y);
    });

    // Listen for new round events
    this.game.events.on("newRound", (data: RoundStartData) => {
      console.log("[TD] newRound event:", JSON.stringify(data));
      this.startRound(data);
    });
  }

  private drawPath(): void {
    const graphics = this.add.graphics().setDepth(1);
    graphics.lineStyle(TD_CONFIG.PATH_WIDTH, TD_CONFIG.PATH_COLOR, 0.8);
    graphics.beginPath();
    const wp = this.worldWaypoints;
    graphics.moveTo(wp[0].x, wp[0].y);
    for (let i = 1; i < wp.length; i++) {
      graphics.lineTo(wp[i].x, wp[i].y);
    }
    graphics.strokePath();

    // Path border
    graphics.lineStyle(
      TD_CONFIG.PATH_WIDTH + 4,
      TD_CONFIG.PATH_BORDER_COLOR,
      0.2,
    );
    graphics.beginPath();
    graphics.moveTo(wp[0].x, wp[0].y);
    for (let i = 1; i < wp.length; i++) {
      graphics.lineTo(wp[i].x, wp[i].y);
    }
    graphics.strokePath();

    // Base indicator at end
    const end = wp[wp.length - 1];
    this.add.circle(end.x, end.y, 12, TD_CONFIG.BASE_COLOR, 0.3).setDepth(1);
    this.add.circle(end.x, end.y, 6, TD_CONFIG.BASE_COLOR, 0.6).setDepth(1);
  }

  private computeValidCells(): void {
    const cs = TD_CONFIG.CELL_SIZE;
    const cols = Math.floor(TD_CONFIG.FIELD_WIDTH / cs);
    const rows = Math.floor(TD_CONFIG.FIELD_HEIGHT / cs);

    // Mark cells that the path passes through
    const pathCells = new Set<string>();
    for (let i = 0; i < this.worldWaypoints.length - 1; i++) {
      const from = this.worldWaypoints[i];
      const to = this.worldWaypoints[i + 1];
      const steps = Math.ceil(
        Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y) / (cs / 2),
      );
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const px = from.x + (to.x - from.x) * t;
        const py = from.y + (to.y - from.y) * t;
        const col = Math.floor((px - TD_CONFIG.FIELD_X) / cs);
        const row = Math.floor((py - TD_CONFIG.FIELD_Y) / cs);
        if (col >= 0 && col < cols && row >= 0 && row < rows) {
          pathCells.add(`${col},${row}`);
        }
      }
    }

    // Valid cells are those adjacent to path but not ON path
    for (const key of pathCells) {
      const [col, row] = key.split(",").map(Number);
      for (let dc = -1; dc <= 1; dc++) {
        for (let dr = -1; dr <= 1; dr++) {
          if (dc === 0 && dr === 0) continue;
          const nc = col + dc;
          const nr = row + dr;
          if (nc >= 0 && nc < cols && nr >= 0 && nr < rows) {
            const nk = `${nc},${nr}`;
            if (!pathCells.has(nk)) {
              this.validCells.add(nk);
            }
          }
        }
      }
    }
  }

  private drawGrid(): void {
    const cs = TD_CONFIG.CELL_SIZE;
    const graphics = this.add.graphics().setDepth(0);
    graphics.lineStyle(1, TD_CONFIG.GRID_COLOR, TD_CONFIG.GRID_ALPHA);

    for (const key of this.validCells) {
      const [col, row] = key.split(",").map(Number);
      const x = TD_CONFIG.FIELD_X + col * cs;
      const y = TD_CONFIG.FIELD_Y + row * cs;
      graphics.strokeRect(x, y, cs, cs);
    }
  }

  private startRound(data: RoundStartData): void {
    if (!data.roundConfig) return;

    // Clear previous state (clear in-place to preserve array references)
    this.enemies.forEach((e) => e.destroy());
    this.enemies.length = 0;
    this.turrets.forEach((t) => t.destroy());
    this.turrets.length = 0;
    this.projectiles.forEach((p) => p.destroy());
    this.projectiles.length = 0;
    this.occupiedCells.clear();

    this.roundConfig = data.roundConfig;
    this.currency = data.roundConfig.startingCurrency;
    this.baseHP = data.roundConfig.baseHP;
    this.maxBaseHP = data.roundConfig.baseHP;
    this.currentWave = 0;
    this.totalWaves = data.roundConfig.waves.length;
    this.enemiesKilled = 0;
    this.wavesCompleted = 0;
    this.roundActive = true;

    this.ui.updateCurrency(this.currency);
    this.ui.updateHP(this.baseHP, this.maxBaseHP);
    this.ui.updateWave(0, this.totalWaves);

    // Give player time to place turrets before first wave
    this.waveDelayTimer = TD_CONFIG.INITIAL_PLACEMENT_MS;
    this.waveActive = false;
    this.startCountdown();
  }

  private startNextWave(): void {
    if (!this.roundConfig) return;
    if (this.currentWave >= this.totalWaves) {
      this.completeRound();
      return;
    }

    const waveConfig = this.roundConfig.waves[this.currentWave];
    this.currentWave++;

    this.ui.updateWave(this.currentWave, this.totalWaves);
    this.ui.showWaveIncoming(this.currentWave);
    this.ui.hideInstruction();

    this.spawnQueue = waveConfig;
    this.spawnCount = 0;
    this.spawnTotal = waveConfig.enemyCount;
    this.spawnTimer = 0;
    this.waveActive = true;
  }

  private handlePlacement(px: number, py: number): void {
    if (!this.roundActive || !this.selectedTurretType || !this.roundConfig) {
      console.log("[TD] placement blocked:", {
        roundActive: this.roundActive,
        selectedType: this.selectedTurretType,
        hasConfig: !!this.roundConfig,
      });
      return;
    }

    const cs = TD_CONFIG.CELL_SIZE;
    const col = Math.floor((px - TD_CONFIG.FIELD_X) / cs);
    const row = Math.floor((py - TD_CONFIG.FIELD_Y) / cs);
    const key = `${col},${row}`;

    if (!this.validCells.has(key) || this.occupiedCells.has(key)) return;

    const turretDef = this.roundConfig.turrets[this.selectedTurretType];
    if (!turretDef || this.currency < turretDef.cost) return;

    this.currency -= turretDef.cost;
    this.ui.updateCurrency(this.currency);
    this.occupiedCells.add(key);

    const worldX = TD_CONFIG.FIELD_X + col * cs + cs / 2;
    const worldY = TD_CONFIG.FIELD_Y + row * cs + cs / 2;

    const turret = new Turret(
      this,
      col,
      row,
      worldX,
      worldY,
      this.selectedTurretType,
      turretDef,
      this.enemies,
      this.projectiles,
    );
    this.turrets.push(turret);
  }

  private updatePlacementPreview(px?: number, py?: number): void {
    if (this.placementPreview) {
      this.placementPreview.destroy();
      this.placementPreview = null;
    }
    if (this.rangePreview) {
      this.rangePreview.destroy();
      this.rangePreview = null;
    }

    if (
      !this.selectedTurretType ||
      !this.roundConfig ||
      px === undefined ||
      py === undefined
    )
      return;

    const cs = TD_CONFIG.CELL_SIZE;
    const col = Math.floor((px - TD_CONFIG.FIELD_X) / cs);
    const row = Math.floor((py - TD_CONFIG.FIELD_Y) / cs);
    const key = `${col},${row}`;

    if (!this.validCells.has(key)) return;

    const worldX = TD_CONFIG.FIELD_X + col * cs + cs / 2;
    const worldY = TD_CONFIG.FIELD_Y + row * cs + cs / 2;
    const color = TD_CONFIG.TURRET_COLORS[this.selectedTurretType] || 0xffffff;
    const canPlace = !this.occupiedCells.has(key);
    const alpha = canPlace ? 0.4 : 0.15;

    this.placementPreview = this.add
      .circle(worldX, worldY, TD_CONFIG.TURRET_RADIUS, color, alpha)
      .setDepth(9);

    const turretDef = this.roundConfig.turrets[this.selectedTurretType];
    if (turretDef) {
      this.rangePreview = this.add
        .circle(worldX, worldY, turretDef.range, color, 0.06)
        .setDepth(9);
    }
  }

  private completeRound(): void {
    this.roundActive = false;
    this.ui.showInstruction("ROUND COMPLETE");

    if (this.onRoundComplete) {
      this.onRoundComplete({
        wavesCompleted: this.wavesCompleted,
        enemiesKilled: this.enemiesKilled,
        baseHPRemaining: this.baseHP,
      });
    }
  }

  private startCountdown(): void {
    const totalSec = Math.ceil(TD_CONFIG.INITIAL_PLACEMENT_MS / 1000);
    for (let i = 0; i < totalSec; i++) {
      const sec = totalSec - i;
      this.time.delayedCall(i * 1000, () => {
        if (sec > 3) {
          this.ui.showInstruction(`PLACE TURRETS — WAVE 1 IN ${sec}s`);
        } else {
          this.ui.showInstruction(`WAVE 1 IN ${sec}...`);
        }
      });
    }
  }

  update(_time: number, delta: number): void {
    if (!this.roundActive) return;

    // Wave delay before first/next wave
    if (!this.waveActive && this.waveDelayTimer > 0) {
      this.waveDelayTimer -= delta;
      if (this.waveDelayTimer <= 0) {
        this.startNextWave();
      }
      // Still update existing turrets/enemies while waiting
      this.updateEntities(delta);
      return;
    }

    // Spawning
    if (this.spawnQueue && this.spawnCount < this.spawnTotal) {
      this.spawnTimer -= delta;
      if (this.spawnTimer <= 0) {
        this.spawnEnemy(this.spawnQueue);
        this.spawnCount++;
        this.spawnTimer = TD_CONFIG.SPAWN_INTERVAL_MS;
      }
    }

    this.updateEntities(delta);

    // Check wave complete (all spawned + all dead/reached end)
    if (
      this.waveActive &&
      this.spawnCount >= this.spawnTotal &&
      this.enemies.every((e) => !e.alive)
    ) {
      this.waveActive = false;
      this.wavesCompleted++;

      // Wave bonus currency
      this.currency += 50;
      this.ui.updateCurrency(this.currency);

      if (this.currentWave >= this.totalWaves) {
        this.completeRound();
      } else {
        this.waveDelayTimer = TD_CONFIG.WAVE_DELAY_MS;
        this.ui.showInstruction("PLACE MORE TURRETS...");
      }
    }

    // Base destroyed
    if (this.baseHP <= 0) {
      this.baseHP = 0;
      this.ui.updateHP(0, this.maxBaseHP);
      this.completeRound();
    }
  }

  private updateEntities(delta: number): void {
    // Update enemies
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      enemy.update(delta);

      if (enemy.reachedEnd) {
        this.baseHP = Math.max(0, this.baseHP - 1);
        this.ui.updateHP(this.baseHP, this.maxBaseHP);
      }
    }

    // Check for killed enemies (award currency)
    for (const enemy of this.enemies) {
      if (!enemy.alive && !enemy.reachedEnd && enemy.hp <= 0) {
        this.enemiesKilled++;
        this.currency += enemy.value;
        this.ui.updateCurrency(this.currency);
        this.ui.showFloatingText(
          enemy.x,
          enemy.y,
          `+${enemy.value}`,
          "#d29922",
        );
        // Mark as processed by zeroing value
        enemy.value = 0;
      }
    }

    // Clean up dead enemies (in-place to preserve array references held by Turrets/Projectiles)
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (!this.enemies[i].alive) {
        this.enemies.splice(i, 1);
      }
    }

    // Update turrets
    for (const turret of this.turrets) {
      turret.update(delta);
    }

    // Update projectiles (homing movement)
    for (const projectile of this.projectiles) {
      projectile.update(delta);
    }

    // Clean up dead projectiles (in-place to preserve array reference)
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      if (!this.projectiles[i].alive) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  private spawnEnemy(waveConfig: WaveConfig): void {
    const enemy = new Enemy(
      this,
      this.worldWaypoints,
      waveConfig.enemyHP,
      waveConfig.enemySpeed,
      10, // kill reward (value)
    );
    this.enemies.push(enemy);
  }
}
