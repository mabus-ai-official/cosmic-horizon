/** Player/mob/item sprite rendering */

import type { SnapshotPlayer, SnapshotMob, SnapshotDrop } from "./types";
import { Camera } from "./camera";

const PLAYER_SIZE = 12;
const MOB_SIZE = 10;
const DROP_SIZE = 6;

export class SpriteRenderer {
  renderPlayers(
    ctx: CanvasRenderingContext2D,
    players: SnapshotPlayer[],
    camera: Camera,
    tileSize: number,
    localPlayerId: string,
  ): void {
    for (const p of players) {
      const screen = camera.worldToScreen(p.x, p.y, tileSize);
      const sx = Math.floor(screen.x);
      const sy = Math.floor(screen.y);

      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.ellipse(
        sx,
        sy + PLAYER_SIZE / 2,
        PLAYER_SIZE / 2,
        3,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();

      // Body color
      if (p.dead) {
        ctx.fillStyle = "#555";
      } else if (p.id === localPlayerId) {
        ctx.fillStyle = "#00e5ff";
      } else {
        ctx.fillStyle = "#4caf50";
      }

      // Simple character shape
      ctx.beginPath();
      ctx.arc(sx, sy - 2, PLAYER_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();

      // Direction indicator
      if (!p.dead) {
        const dirOffsets: Record<string, [number, number]> = {
          up: [0, -PLAYER_SIZE / 2 - 3],
          down: [0, PLAYER_SIZE / 2 - 1],
          left: [-PLAYER_SIZE / 2 - 3, 0],
          right: [PLAYER_SIZE / 2 + 3, 0],
        };
        const [offX, offY] = dirOffsets[p.facing] ?? [0, PLAYER_SIZE / 2];
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(sx + offX, sy - 2 + offY, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Name tag
      ctx.fillStyle = p.id === localPlayerId ? "#00e5ff" : "#fff";
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.fillText(p.name, sx, sy - PLAYER_SIZE - 2);

      // HP bar
      if (p.hp < p.maxHp) {
        const barW = 24;
        const barH = 3;
        const bx = sx - barW / 2;
        const by = sy - PLAYER_SIZE - 10;
        ctx.fillStyle = "#333";
        ctx.fillRect(bx, by, barW, barH);
        const ratio = Math.max(0, p.hp / p.maxHp);
        ctx.fillStyle =
          ratio > 0.5 ? "#4caf50" : ratio > 0.25 ? "#ff9800" : "#f44336";
        ctx.fillRect(bx, by, barW * ratio, barH);
      }

      // Attack flash
      if (p.attacking) {
        ctx.strokeStyle = "rgba(255,255,255,0.6)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy - 2, PLAYER_SIZE, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  renderMobs(
    ctx: CanvasRenderingContext2D,
    mobs: SnapshotMob[],
    camera: Camera,
    tileSize: number,
  ): void {
    for (const m of mobs) {
      const screen = camera.worldToScreen(m.x, m.y, tileSize);
      const sx = Math.floor(screen.x);
      const sy = Math.floor(screen.y);

      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.ellipse(sx, sy + MOB_SIZE / 2, MOB_SIZE / 2, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body
      if (m.isBoss) {
        ctx.fillStyle = "#ff1744";
      } else if (m.isElite) {
        ctx.fillStyle = "#ff9100";
      } else {
        ctx.fillStyle = "#e53935";
      }

      const size = m.isBoss
        ? MOB_SIZE * 1.5
        : m.isElite
          ? MOB_SIZE * 1.2
          : MOB_SIZE;
      ctx.fillRect(sx - size / 2, sy - size / 2, size, size);

      // Elite/boss glow
      if (m.isElite || m.isBoss) {
        ctx.strokeStyle = m.isBoss
          ? "rgba(255,23,68,0.5)"
          : "rgba(255,145,0,0.5)";
        ctx.lineWidth = 2;
        ctx.strokeRect(
          sx - size / 2 - 2,
          sy - size / 2 - 2,
          size + 4,
          size + 4,
        );
      }

      // HP bar
      const barW = 20;
      const barH = 2;
      const bx = sx - barW / 2;
      const by = sy - size / 2 - 6;
      ctx.fillStyle = "#333";
      ctx.fillRect(bx, by, barW, barH);
      const ratio = Math.max(0, m.hp / m.maxHp);
      ctx.fillStyle = "#f44336";
      ctx.fillRect(bx, by, barW * ratio, barH);

      // Level + name (bosses/elites only)
      if (m.isElite || m.isBoss) {
        ctx.fillStyle = m.isBoss ? "#ff1744" : "#ff9100";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`Lv.${m.level} ${m.name}`, sx, sy - size / 2 - 10);
      }
    }
  }

  renderDrops(
    ctx: CanvasRenderingContext2D,
    drops: SnapshotDrop[],
    camera: Camera,
    tileSize: number,
    tick: number,
  ): void {
    for (const d of drops) {
      const screen = camera.worldToScreen(d.x, d.y, tileSize);
      const sx = Math.floor(screen.x);
      const sy = Math.floor(screen.y);

      // Bobbing animation
      const bob = Math.sin(tick * 0.1 + d.x * 3) * 2;

      ctx.fillStyle = "#ffd700";
      ctx.beginPath();
      ctx.arc(sx, sy + bob, DROP_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();

      // Glow
      ctx.strokeStyle = "rgba(255,215,0,0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(sx, sy + bob, DROP_SIZE, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}
