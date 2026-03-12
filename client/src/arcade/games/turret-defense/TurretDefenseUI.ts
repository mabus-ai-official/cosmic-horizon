import Phaser from "phaser";
import { TD_CONFIG } from "./TurretDefenseConfig";
import type { TurretType } from "./Turret";

const FONT = '"IBM Plex Mono", monospace';

interface TurretDef {
  type: TurretType;
  cost: number;
  label: string;
}

const TURRET_PALETTE: TurretDef[] = [
  { type: "basic", cost: 100, label: "BASIC" },
  { type: "splash", cost: 250, label: "SPLASH" },
  { type: "slow", cost: 200, label: "SLOW" },
  { type: "sniper", cost: 400, label: "SNIPER" },
];

export class TurretDefenseUI {
  private scene: Phaser.Scene;
  private waveText: Phaser.GameObjects.Text;
  private currencyText: Phaser.GameObjects.Text;
  private hpText: Phaser.GameObjects.Text;
  private instructionText: Phaser.GameObjects.Text;
  private paletteItems: Phaser.GameObjects.Container[] = [];

  public selectedTurret: TurretType | null = null;
  private onTurretSelect: (type: TurretType | null) => void;

  constructor(
    scene: Phaser.Scene,
    onTurretSelect: (type: TurretType | null) => void,
  ) {
    this.scene = scene;
    this.onTurretSelect = onTurretSelect;

    this.waveText = scene.add
      .text(TD_CONFIG.FIELD_X, 10, "WAVE 0/5", {
        fontFamily: FONT,
        fontSize: "14px",
        color: "#56d4dd",
      })
      .setDepth(10);

    this.currencyText = scene.add
      .text(400, 10, "300", {
        fontFamily: FONT,
        fontSize: "14px",
        color: "#d29922",
      })
      .setOrigin(0.5, 0)
      .setDepth(10);

    this.hpText = scene.add
      .text(TD_CONFIG.FIELD_X + TD_CONFIG.FIELD_WIDTH, 10, "HP: 20", {
        fontFamily: FONT,
        fontSize: "14px",
        color: "#3fb950",
      })
      .setOrigin(1, 0)
      .setDepth(10);

    this.instructionText = scene.add
      .text(400, 30, "SELECT TURRET BELOW, CLICK GRID TO PLACE", {
        fontFamily: FONT,
        fontSize: "10px",
        color: "#8b949e",
      })
      .setOrigin(0.5, 0)
      .setDepth(10);

    // Build palette at bottom
    this.buildPalette();
  }

  private buildPalette(): void {
    const startX = 130;
    const y = 470;
    const spacing = 150;

    for (let i = 0; i < TURRET_PALETTE.length; i++) {
      const def = TURRET_PALETTE[i];
      const x = startX + i * spacing;
      const color = TD_CONFIG.TURRET_COLORS[def.type] || 0xffffff;

      const container = this.scene.add.container(x, y).setDepth(10);

      const bg = this.scene.add
        .rectangle(0, 0, 130, 28, 0x161b22, 0.8)
        .setStrokeStyle(1, 0x333333)
        .setInteractive({ useHandCursor: true });

      const icon = this.scene.add.circle(-45, 0, 6, color, 0.9);
      const label = this.scene.add.text(-32, -6, `${def.label} (${def.cost})`, {
        fontFamily: FONT,
        fontSize: "10px",
        color: "#ccc",
      });

      container.add([bg, icon, label]);

      bg.on("pointerdown", () => {
        if (this.selectedTurret === def.type) {
          this.selectedTurret = null;
          this.onTurretSelect(null);
          this.updatePaletteHighlight();
        } else {
          this.selectedTurret = def.type;
          this.onTurretSelect(def.type);
          this.updatePaletteHighlight();
        }
      });

      this.paletteItems.push(container);
    }
  }

  private updatePaletteHighlight(): void {
    for (let i = 0; i < TURRET_PALETTE.length; i++) {
      const bg = this.paletteItems[i].getAt(0) as Phaser.GameObjects.Rectangle;
      if (TURRET_PALETTE[i].type === this.selectedTurret) {
        const color = TD_CONFIG.TURRET_COLORS[TURRET_PALETTE[i].type];
        bg.setStrokeStyle(1, color);
      } else {
        bg.setStrokeStyle(1, 0x333333);
      }
    }
  }

  updateWave(current: number, total: number): void {
    this.waveText.setText(`WAVE ${current}/${total}`);
  }

  updateCurrency(amount: number): void {
    this.currencyText.setText(`${amount}`);
  }

  updateHP(hp: number, maxHP: number): void {
    const ratio = hp / maxHP;
    const color =
      ratio > 0.5 ? "#3fb950" : ratio > 0.25 ? "#d29922" : "#f85149";
    this.hpText.setText(`HP: ${hp}`).setColor(color);
  }

  showWaveIncoming(waveNum: number): void {
    const text = this.scene.add
      .text(400, 220, `WAVE ${waveNum} INCOMING`, {
        fontFamily: FONT,
        fontSize: "20px",
        fontStyle: "bold",
        color: "#f85149",
      })
      .setOrigin(0.5, 0.5)
      .setDepth(20);

    this.scene.tweens.add({
      targets: text,
      alpha: 0,
      y: 200,
      duration: 1500,
      onComplete: () => text.destroy(),
    });
  }

  showFloatingText(x: number, y: number, text: string, color: string): void {
    const floater = this.scene.add
      .text(x, y, text, {
        fontFamily: FONT,
        fontSize: "12px",
        fontStyle: "bold",
        color,
      })
      .setOrigin(0.5, 0.5)
      .setDepth(20);

    this.scene.tweens.add({
      targets: floater,
      y: y - 25,
      alpha: 0,
      duration: 600,
      onComplete: () => floater.destroy(),
    });
  }

  showInstruction(text: string): void {
    this.instructionText.setText(text).setVisible(true);
  }

  hideInstruction(): void {
    this.instructionText.setVisible(false);
  }

  destroy(): void {
    this.waveText.destroy();
    this.currencyText.destroy();
    this.hpText.destroy();
    this.instructionText.destroy();
    this.paletteItems.forEach((c) => c.destroy());
  }
}
