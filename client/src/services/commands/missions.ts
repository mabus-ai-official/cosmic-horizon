/**
 * Mission commands — missions, accept, abandon, claim, bounties.
 * Manages the quest system including the Star Mall mission board,
 * cantina bartender jobs, and player bounty contracts.
 */
import * as api from "../api";
import type { CommandHandler } from "./types";
import { resolveItem } from "./utils";
import { buildMissionBoardScene } from "../../config/scenes/mission-board-scene";
import { buildBountyBoardScene } from "../../config/scenes/bounty-board-scene";

export const missionsCommands: Record<string, CommandHandler> = {
  missions: (args, ctx) => {
    if (args[0] === "completed") {
      api
        .getCompletedMissions()
        .then(({ data }) => {
          if (data.missions.length === 0) {
            ctx.addLine("No completed missions", "info");
            return;
          }
          ctx.addLine("=== COMPLETED MISSIONS ===", "system");
          for (const m of data.missions) {
            const xpStr = m.rewardXp ? ` + ${m.rewardXp} XP` : "";
            ctx.addLine(
              `  [T${m.tier || "?"}] ${m.title} | +${m.rewardCredits.toLocaleString()} cr${xpStr}`,
              "success",
            );
          }
        })
        .catch((err: any) =>
          ctx.addLine(err.response?.data?.error || "Failed", "error"),
        );
    } else {
      api
        .getActiveMissions()
        .then(({ data }) => {
          if (data.missions.length === 0) {
            ctx.addLine(
              "No active missions. Visit a Star Mall mission board.",
              "info",
            );
            return;
          }
          const active = data.missions.filter(
            (m: any) => m.claimStatus !== "pending_claim",
          );
          const pending = data.missions.filter(
            (m: any) => m.claimStatus === "pending_claim",
          );
          ctx.addLine(
            `=== ACTIVE MISSIONS (${active.length}/${5}) ===`,
            "system",
          );
          let idx = 0;
          for (const m of active) {
            idx++;
            ctx.addLine(
              `  [${idx}] ${m.title} [T${m.tier || "?"}] (${m.type})`,
              "info",
            );
            if (m.objectivesDetail && m.objectivesDetail.length > 0) {
              for (const obj of m.objectivesDetail) {
                const mark = obj.complete ? "x" : " ";
                ctx.addLine(
                  `      [${mark}] ${obj.description} (${obj.current}/${obj.target})`,
                  obj.complete ? "success" : "trade",
                );
                if (obj.hint && !obj.complete) {
                  ctx.addLine(`          Hint: ${obj.hint}`, "info");
                }
              }
            }
            const xpStr = m.rewardXp ? ` + ${m.rewardXp} XP` : "";
            ctx.addLine(
              `      Reward: ${m.rewardCredits.toLocaleString()} cr${xpStr}`,
              "trade",
            );
            if (m.requiresClaimAtMall) {
              ctx.addLine(
                "      Status: Return to Star Mall to claim when complete",
                "info",
              );
            }
          }
          if (pending.length > 0) {
            ctx.addLine("", "info");
            ctx.addLine(`=== PENDING CLAIM (${pending.length}) ===`, "system");
            for (const m of pending) {
              idx++;
              const xpStr = m.rewardXp ? ` + ${m.rewardXp} XP` : "";
              ctx.addLine(
                `  [${idx}] ${m.title} [T${m.tier || "?"}] — COMPLETE`,
                "success",
              );
              ctx.addLine(
                `      Reward: ${m.rewardCredits.toLocaleString()} cr${xpStr}`,
                "trade",
              );
              ctx.addLine(
                '      Visit any Star Mall and use "claimreward" to collect',
                "info",
              );
            }
          }
          ctx.setLastListing(
            data.missions.map((m: any) => ({
              id: m.missionId,
              label: m.title,
            })),
          );
        })
        .catch((err: any) =>
          ctx.addLine(err.response?.data?.error || "Failed", "error"),
        );
    }
  },

  missionboard: (_args, ctx) => {
    api
      .getAvailableMissions()
      .then(({ data }) => {
        ctx.enqueueScene?.(buildMissionBoardScene());
        if (data.missions.length === 0) {
          ctx.addLine("No missions available", "info");
          return;
        }
        ctx.addLine("=== MISSION BOARD ===", "system");
        // Group by tier
        const tiers: Record<number, any[]> = {};
        for (const m of data.missions) {
          const t = m.tier || 1;
          if (!tiers[t]) tiers[t] = [];
          tiers[t].push(m);
        }
        let mIdx = 0;
        for (const tier of Object.keys(tiers).map(Number).sort()) {
          ctx.addLine(`--- Tier ${tier} ---`, "system");
          for (const m of tiers[tier]) {
            mIdx++;
            const xpStr = m.rewardXp ? ` + ${m.rewardXp} XP` : "";
            const lockStr =
              m.prerequisiteMissionId && !m.prerequisiteMet
                ? " [LOCKED - prerequisite]"
                : "";
            ctx.addLine(
              `  [${mIdx}] ${m.title} (${m.type}) — ${m.rewardCredits.toLocaleString()} cr${xpStr}${lockStr}`,
              "info",
            );
            ctx.addLine(`    ${m.description}`, "info");
          }
        }
        // Show locked tiers
        if (data.lockedTiers && data.lockedTiers.length > 0) {
          for (const lt of data.lockedTiers) {
            ctx.addLine(
              `--- Tier ${lt.tier} [LOCKED - Requires Level ${lt.requiredLevel}] ---`,
              "error",
            );
          }
        }
        ctx.setLastListing(
          data.missions.map((m: any) => ({ id: m.id, label: m.title })),
        );
        ctx.addLine('Use "accept <# or keyword>" to accept', "info");
      })
      .catch((err: any) =>
        ctx.addLine(err.response?.data?.error || "Not at a star mall", "error"),
      );
  },

  claimreward: (args, ctx) => {
    const claimArg = args[0];
    api
      .getClaimableMissions()
      .then(async ({ data }) => {
        if (data.missions.length === 0) {
          ctx.addLine(
            "No missions to claim. Complete missions that require Star Mall claims first.",
            "info",
          );
          return;
        }
        let missionToClaim: any = null;
        if (data.missions.length === 1 && !claimArg) {
          missionToClaim = data.missions[0];
        } else if (claimArg) {
          const idx = parseInt(claimArg, 10);
          if (!isNaN(idx) && idx >= 1 && idx <= data.missions.length) {
            missionToClaim = data.missions[idx - 1];
          }
        }
        if (!missionToClaim) {
          ctx.addLine("=== CLAIMABLE MISSIONS ===", "system");
          data.missions.forEach((m: any, i: number) => {
            const xpStr = m.rewardXp ? ` + ${m.rewardXp} XP` : "";
            ctx.addLine(
              `  [${i + 1}] ${m.title} — ${m.rewardCredits.toLocaleString()} cr${xpStr}`,
              "trade",
            );
          });
          ctx.addLine('Use "claimreward <#>" to claim', "info");
          return;
        }
        try {
          const { data: result } = await api.claimMission(
            missionToClaim.missionId,
          );
          ctx.addLine(`Claimed: ${result.title}`, "success");
          ctx.addLine(
            `  +${result.creditsAwarded.toLocaleString()} credits, +${result.xpAwarded} XP`,
            "success",
          );
          ctx.addLine(
            `  Credits: ${result.newCredits.toLocaleString()}`,
            "trade",
          );
        } catch (err: any) {
          ctx.addLine(err.response?.data?.error || "Failed to claim", "error");
        }
      })
      .catch((err: any) =>
        ctx.addLine(
          err.response?.data?.error || "Must be at a Star Mall",
          "error",
        ),
      );
  },

  accept: (args, ctx) => {
    if (args.length < 1) {
      ctx.addLine("Usage: accept <# or keyword>", "error");
      return;
    }
    const query = args.join(" ");
    api
      .getAvailableMissions()
      .then(({ data }) => {
        const items = data.missions.map((m: any) => ({
          id: m.id,
          name: m.title,
        }));
        const result = resolveItem(query, items, ctx);
        if (result === null) {
          ctx.addLine(
            `No mission matching "${query}". Type "missionboard" to see available missions.`,
            "error",
          );
          return;
        }
        if (result === "ambiguous") return;
        api
          .acceptMission(result.id)
          .then(({ data: accData }) => {
            ctx.addLine(`Accepted: ${accData.title}`, "success");
            ctx.addLine(
              `Reward: ${accData.rewardCredits} cr${accData.expiresAt ? ` | Expires: ${new Date(accData.expiresAt).toLocaleTimeString()}` : ""}`,
              "trade",
            );
            if (accData.message) ctx.addLine(accData.message, "npc");
          })
          .catch((err: any) =>
            ctx.addLine(err.response?.data?.error || "Accept failed", "error"),
          );
      })
      .catch((err: any) =>
        ctx.addLine(err.response?.data?.error || "Not at a star mall", "error"),
      );
  },

  abandon: (args, ctx) => {
    if (args.length < 1) {
      ctx.addLine("Usage: abandon <# or keyword>", "error");
      return;
    }
    const query = args.join(" ");
    api
      .getActiveMissions()
      .then(({ data }) => {
        const items = data.missions.map((m: any) => ({
          id: m.missionId,
          name: m.title,
        }));
        const result = resolveItem(query, items, ctx);
        if (result === null) {
          ctx.addLine(
            `No mission matching "${query}". Type "missions" to see active missions.`,
            "error",
          );
          return;
        }
        if (result === "ambiguous") return;
        api
          .abandonMission(result.id)
          .then(() => {
            ctx.addLine("Mission abandoned", "warning");
          })
          .catch((err: any) =>
            ctx.addLine(err.response?.data?.error || "Abandon failed", "error"),
          );
      })
      .catch((err: any) =>
        ctx.addLine(err.response?.data?.error || "Failed", "error"),
      );
  },

  bounty: (args, ctx) => {
    if (args.length < 2) {
      ctx.addLine("Usage: bounty <player_name> <amount>", "error");
      return;
    }
    const amount = parseInt(args[args.length - 1]);
    if (isNaN(amount)) {
      ctx.addLine("Amount must be a number", "error");
      return;
    }
    // Find the player - they need to be known somehow. For now just pass the name.
    ctx.addLine(`Placing bounty... (TODO: resolve player by name)`, "warning");
  },

  bounties: (_args, ctx) => {
    api
      .getBounties()
      .then(({ data }) => {
        ctx.enqueueScene?.(buildBountyBoardScene());
        if (data.bounties.length === 0) {
          ctx.addLine("No active bounties", "info");
          return;
        }
        ctx.addLine("=== ACTIVE BOUNTIES ===", "system");
        data.bounties.forEach((b: any, i: number) => {
          ctx.addLine(
            `  [${i + 1}] ${b.targetUsername.padEnd(20)} ${String(b.amount).padStart(8)} cr  (placed by ${b.placedByUsername})`,
            "warning",
          );
        });
      })
      .catch((err: any) =>
        ctx.addLine(
          err.response?.data?.error || "Failed to fetch bounties",
          "error",
        ),
      );
  },
};
