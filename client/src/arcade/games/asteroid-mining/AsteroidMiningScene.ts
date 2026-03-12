import Phaser from "phaser";
import { MINING_CONFIG } from "./AsteroidMiningConfig";
import { ScannerBar } from "./ScannerBar";
import { OreDeposit } from "./OreDeposit";
import { AsteroidMiningUI } from "./AsteroidMiningUI";

interface RoundStartData {
  round: number;
  sweetSpotPositions: number[];
  barSpeed: number;
  effects: any[];
}

export class AsteroidMiningScene extends Phaser.Scene {
  private scannerBar!: ScannerBar;
  private deposits: OreDeposit[] = [];
  private ui!: AsteroidMiningUI;
  private hitTimings: number[] = [];
  private hitCount: number = 0;
  private roundScore: number = 0;
  private roundActive: boolean = false;
  private roundData: RoundStartData | null = null;
  private onRoundComplete: ((timings: number[]) => void) | null = null;

  constructor() {
    super({ key: "AsteroidMining" });
  }

  create(): void {
    // Draw field background
    this.add
      .rectangle(
        MINING_CONFIG.FIELD_X + MINING_CONFIG.FIELD_WIDTH / 2,
        MINING_CONFIG.FIELD_Y + MINING_CONFIG.FIELD_HEIGHT / 2,
        MINING_CONFIG.FIELD_WIDTH,
        MINING_CONFIG.FIELD_HEIGHT,
        0x161b22,
        0.5,
      )
      .setDepth(0);

    // Draw field border
    const border = this.add.graphics();
    border.lineStyle(1, 0x4a2a55, 0.6);
    border.strokeRect(
      MINING_CONFIG.FIELD_X,
      MINING_CONFIG.FIELD_Y,
      MINING_CONFIG.FIELD_WIDTH,
      MINING_CONFIG.FIELD_HEIGHT,
    );
    border.setDepth(0);

    // Add some ambient particles (stars)
    for (let i = 0; i < 30; i++) {
      const x =
        MINING_CONFIG.FIELD_X + Math.random() * MINING_CONFIG.FIELD_WIDTH;
      const y =
        MINING_CONFIG.FIELD_Y + Math.random() * MINING_CONFIG.FIELD_HEIGHT;
      const star = this.add.circle(
        x,
        y,
        Math.random() * 1.5 + 0.5,
        0xffffff,
        0.3,
      );
      star.setDepth(0);
      this.tweens.add({
        targets: star,
        alpha: { from: 0.1, to: 0.4 },
        duration: 1000 + Math.random() * 2000,
        yoyo: true,
        repeat: -1,
      });
    }

    // UI
    this.ui = new AsteroidMiningUI(this);

    // Get round data from registry
    this.roundData = this.registry.get("roundStart") as RoundStartData;
    this.onRoundComplete = this.registry.get("onRoundComplete") as
      | ((timings: number[]) => void)
      | null;

    if (this.roundData) {
      this.startRound(this.roundData);
    }

    // Input
    this.input.keyboard?.on("keydown-SPACE", () => this.handleHit());
    this.input.on("pointerdown", () => this.handleHit());

    // Listen for new round events from React
    this.game.events.on("newRound", (data: RoundStartData) => {
      this.startRound(data);
    });
  }

  private startRound(data: RoundStartData): void {
    // Clear previous
    this.deposits.forEach((d) => d.destroy());
    this.deposits = [];
    this.hitTimings = [];
    this.hitCount = 0;
    this.roundScore = 0;
    this.roundActive = true;

    this.roundData = data;
    this.ui.updateScore(0);
    this.ui.updateHitCount(0);
    this.ui.hideInstruction();

    // Create scanner bar
    if (this.scannerBar) {
      this.scannerBar.destroy();
    }
    this.scannerBar = new ScannerBar(this, data.barSpeed);

    // Create ore deposits
    const sweetSpotWidth = 0.08; // base width
    for (const pos of data.sweetSpotPositions) {
      this.deposits.push(new OreDeposit(this, pos, sweetSpotWidth));
    }
  }

  private handleHit(): void {
    if (!this.roundActive || !this.scannerBar) return;
    if (this.hitCount >= MINING_CONFIG.HITS_PER_ROUND) return;

    const timing = this.scannerBar.getNormalizedPosition();
    this.hitTimings.push(timing);
    this.hitCount++;

    // Find nearest deposit for visual feedback
    const nearestDeposit = this.findNearestUnhitDeposit(timing);
    if (nearestDeposit) {
      const distance = Math.abs(timing - nearestDeposit.getPosition());
      const x = MINING_CONFIG.FIELD_X + timing * MINING_CONFIG.FIELD_WIDTH;
      const y = MINING_CONFIG.FIELD_Y + 60;

      if (distance < 0.03) {
        this.ui.showFloatingText(x, y, "PERFECT!", MINING_CONFIG.PERFECT_COLOR);
        this.roundScore += 200;
        this.flashScreen(0x3fb950);
      } else if (distance < 0.08) {
        this.ui.showFloatingText(x, y, "GOOD", MINING_CONFIG.GOOD_COLOR);
        this.roundScore += 100;
      } else {
        this.ui.showFloatingText(x, y, "MISS", MINING_CONFIG.MISS_COLOR);
      }
      nearestDeposit.markHit();
    } else {
      const x = MINING_CONFIG.FIELD_X + timing * MINING_CONFIG.FIELD_WIDTH;
      this.ui.showFloatingText(
        x,
        MINING_CONFIG.FIELD_Y + 60,
        "MISS",
        MINING_CONFIG.MISS_COLOR,
      );
    }

    // Hit marker line
    const hitLine = this.add.rectangle(
      MINING_CONFIG.FIELD_X + timing * MINING_CONFIG.FIELD_WIDTH,
      MINING_CONFIG.FIELD_Y + MINING_CONFIG.FIELD_HEIGHT / 2,
      2,
      MINING_CONFIG.DEPOSIT_HEIGHT,
      0xffffff,
      0.4,
    );
    hitLine.setDepth(4);
    this.tweens.add({
      targets: hitLine,
      alpha: 0,
      duration: 500,
      onComplete: () => hitLine.destroy(),
    });

    this.ui.updateScore(this.roundScore);
    this.ui.updateHitCount(this.hitCount);

    // Round complete
    if (this.hitCount >= MINING_CONFIG.HITS_PER_ROUND) {
      this.roundActive = false;
      this.scannerBar.stop();
      this.ui.showInstruction("ROUND COMPLETE");

      // Send timings to server (visual score is approximate; server computes real score)
      if (this.onRoundComplete) {
        this.onRoundComplete(this.hitTimings);
      }
    }
  }

  private findNearestUnhitDeposit(timing: number): OreDeposit | null {
    let nearest: OreDeposit | null = null;
    let minDist = Infinity;

    for (const deposit of this.deposits) {
      if (deposit.isHit()) continue;
      const dist = Math.abs(timing - deposit.getPosition());
      if (dist < minDist) {
        minDist = dist;
        nearest = deposit;
      }
    }

    return nearest;
  }

  private flashScreen(color: number): void {
    const flash = this.add
      .rectangle(400, 250, 800, 500, color, 0.1)
      .setDepth(50);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 200,
      onComplete: () => flash.destroy(),
    });
  }

  update(_time: number, delta: number): void {
    if (this.roundActive && this.scannerBar) {
      this.scannerBar.update(delta);
    }
  }
}
