/** Damage numbers, skill VFX, particles */

import { Camera } from "./camera";

interface DamageNumber {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number; // ticks remaining
  vy: number; // float-up velocity
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
}

export class EffectsRenderer {
  private damageNumbers: DamageNumber[] = [];
  private particles: Particle[] = [];

  addDamageNumber(x: number, y: number, damage: number, isCrit: boolean): void {
    this.damageNumbers.push({
      x,
      y,
      text: isCrit ? `${damage}!` : `${damage}`,
      color: isCrit ? "#ffeb3b" : "#fff",
      life: 40, // 2 seconds at 20 fps
      vy: -1.5,
    });
  }

  addHealNumber(x: number, y: number, amount: number): void {
    this.damageNumbers.push({
      x,
      y,
      text: `+${amount}`,
      color: "#4caf50",
      life: 30,
      vy: -1.2,
    });
  }

  addItemPickup(x: number, y: number, name: string): void {
    this.damageNumbers.push({
      x,
      y,
      text: `+${name}`,
      color: "#ffd700",
      life: 40,
      vy: -1.0,
    });
  }

  addDeathEffect(x: number, y: number): void {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * 2,
        vy: Math.sin(angle) * 2,
        color: "#f44336",
        size: 3,
        life: 30,
      });
    }
  }

  addMineEffect(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3 - 1,
        color: "#b87333",
        size: 2,
        life: 20,
      });
    }
  }

  update(): void {
    // Update damage numbers
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const dn = this.damageNumbers[i];
      dn.y += dn.vy * 0.05;
      dn.life--;
      if (dn.life <= 0) {
        this.damageNumbers.splice(i, 1);
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * 0.05;
      p.y += p.vy * 0.05;
      p.life--;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    tileSize: number,
  ): void {
    // Render damage numbers
    for (const dn of this.damageNumbers) {
      const screen = camera.worldToScreen(dn.x, dn.y, tileSize);
      const alpha = Math.min(1, dn.life / 20);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = dn.color;
      ctx.font = dn.text.endsWith("!")
        ? "bold 14px monospace"
        : "bold 12px monospace";
      ctx.textAlign = "center";
      ctx.fillText(dn.text, Math.floor(screen.x), Math.floor(screen.y));
    }
    ctx.globalAlpha = 1;

    // Render particles
    for (const p of this.particles) {
      const screen = camera.worldToScreen(p.x, p.y, tileSize);
      const alpha = Math.min(1, p.life / 10);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(
        Math.floor(screen.x) - p.size / 2,
        Math.floor(screen.y) - p.size / 2,
        p.size,
        p.size,
      );
    }
    ctx.globalAlpha = 1;
  }
}
