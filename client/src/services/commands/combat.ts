/**
 * Combat commands — fire, flee, rache, self-destruct.
 * Implements the energy-based PvP combat model where players spend
 * weapon energy to deal damage and engine energy to escape.
 */
import * as api from "../api";
import type { CommandHandler } from "./types";

export const combatCommands: Record<string, CommandHandler> = {
  fire: (args, ctx) => {
    if (args.length < 2) {
      ctx.addLine("Usage: fire <player_name> <energy>", "error");
      return;
    }
    const targetName = args[0];
    const energy = parseInt(args[1]);
    if (isNaN(energy)) {
      ctx.addLine("Energy must be a number", "error");
      return;
    }
    const target = ctx.sector?.players?.find(
      (p: any) => p.username.toLowerCase() === targetName.toLowerCase(),
    );
    if (!target) {
      ctx.addLine("Player not found in sector", "error");
      return;
    }
    ctx.doFire(target.id, energy);
  },

  flee: (_args, ctx) => {
    ctx.doFlee();
  },

  combatlog: (_args, ctx) => {
    api
      .getCombatLog()
      .then(({ data }) => {
        if (data.logs.length === 0) {
          ctx.addLine("No combat records", "info");
          return;
        }
        ctx.addLine("=== COMBAT LOG ===", "system");
        for (const log of data.logs) {
          ctx.addLine(
            `  ${log.attackerName} → ${log.defenderName} | ${log.damageDealt} dmg [${log.outcome}] Sector ${log.sectorId}`,
            "combat",
          );
        }
      })
      .catch((err: any) =>
        ctx.addLine(err.response?.data?.error || "Failed", "error"),
      );
  },

  attackguardian: (args, ctx) => {
    // Attack alien cache guardian
    api
      .getResourceEvents()
      .then(async ({ data }) => {
        const caches = (data.resourceEvents || []).filter(
          (e: any) => e.eventType === "alien_cache" && e.guardianHp > 0,
        );
        if (caches.length === 0) {
          ctx.addLine(
            "No alien caches with active guardians in sector",
            "info",
          );
          return;
        }

        const eventNum = args[0] ? parseInt(args[0]) : 0;
        let target: any;
        if (eventNum > 0) {
          const allEvents = data.resourceEvents || [];
          if (eventNum > allEvents.length) {
            ctx.addLine("Invalid event number", "error");
            return;
          }
          target = allEvents[eventNum - 1];
          if (target.eventType !== "alien_cache") {
            ctx.addLine("That is not an alien cache", "error");
            return;
          }
        } else {
          target = caches[0];
        }

        try {
          const { data: aData } = await api.attackGuardian(target.id);
          ctx.addLine(`You attack the guardian!`, "combat");
          ctx.addLine(`  Damage dealt: ${aData.damageDealt}`, "combat");
          if (aData.damageTaken > 0)
            ctx.addLine(`  Damage taken: ${aData.damageTaken}`, "warning");
          if (aData.defeated) {
            ctx.addLine("=== GUARDIAN DEFEATED ===", "success");
            if (aData.loot?.resources?.length > 0) {
              ctx.addLine("Loot claimed:", "success");
              for (const r of aData.loot.resources) {
                ctx.addLine(`  ${r.name} x${r.quantity}`, "trade");
              }
            }
          } else {
            ctx.addLine(
              `  Guardian HP: ${aData.remainingHp} remaining`,
              "info",
            );
          }
          ctx.refreshStatus();
        } catch (err: any) {
          ctx.addLine(err.response?.data?.error || "Attack failed", "error");
        }
      })
      .catch((err: any) =>
        ctx.addLine(err.response?.data?.error || "Attack failed", "error"),
      );
  },
};
