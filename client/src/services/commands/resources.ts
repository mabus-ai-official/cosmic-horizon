/**
 * Resource commands — harvest, salvage, ransack, loot.
 * Handles gathering resources from sector events, wrecks, and
 * planetary raids. These are the primary material acquisition loops.
 */
import * as api from "../api";
import type { CommandHandler } from "./types";
import { resolveItem } from "./utils";

export const resourcesCommands: Record<string, CommandHandler> = {
  harvest: (args, ctx) => {
    // harvest [event# or 'all'] [node#]
    const isAll = args[0]?.toLowerCase() === "all";

    if (isAll) {
      // Harvest all available nodes from all events
      api
        .getResourceEvents()
        .then(async ({ data }) => {
          const events = (data.resourceEvents || []).filter(
            (e: any) =>
              (e.eventType === "asteroid_field" || e.eventType === "anomaly") &&
              e.remainingNodes > 0,
          );
          if (events.length === 0) {
            ctx.addLine("No harvestable events in sector", "info");
            return;
          }
          let totalHarvested = 0;
          for (const event of events) {
            for (let ni = 0; ni < event.resources.length; ni++) {
              if (event.resources[ni].harvested) continue;
              try {
                const { data: hData } = await api.harvestEvent(event.id, ni);
                ctx.addLine(
                  `  Harvested ${hData.resource.name} x${hData.resource.quantity}`,
                  "trade",
                );
                totalHarvested++;
              } catch (err: any) {
                const msg = err.response?.data?.error;
                if (msg === "Not enough energy") {
                  ctx.addLine("Out of energy!", "warning");
                  return;
                }
                break;
              }
            }
          }
          if (totalHarvested > 0) {
            ctx.addLine(`Harvested ${totalHarvested} nodes total`, "success");
            ctx.refreshStatus();
          }
        })
        .catch((err: any) =>
          ctx.addLine(err.response?.data?.error || "Harvest failed", "error"),
        );
      return;
    }

    // Resolve event by listing number or default to first
    const eventNum = args[0] ? parseInt(args[0]) : 0;
    const nodeNum = args[1] ? parseInt(args[1]) - 1 : -1; // -1 means first available

    api
      .getResourceEvents()
      .then(async ({ data }) => {
        const events = (data.resourceEvents || []).filter(
          (e: any) =>
            (e.eventType === "asteroid_field" || e.eventType === "anomaly") &&
            e.remainingNodes > 0,
        );
        if (events.length === 0) {
          ctx.addLine("No harvestable events in sector", "info");
          return;
        }

        let targetEvent: any;
        if (eventNum > 0) {
          // Look up from full events list
          const allEvents = data.resourceEvents || [];
          if (eventNum > allEvents.length) {
            ctx.addLine("Invalid event number", "error");
            return;
          }
          targetEvent = allEvents[eventNum - 1];
          if (
            targetEvent.eventType !== "asteroid_field" &&
            targetEvent.eventType !== "anomaly"
          ) {
            ctx.addLine("That event cannot be harvested", "error");
            return;
          }
        } else {
          targetEvent = events[0];
        }

        // Find target node
        let targetNodeIndex: number;
        if (nodeNum >= 0) {
          targetNodeIndex = nodeNum;
        } else {
          targetNodeIndex = targetEvent.resources.findIndex(
            (r: any) => !r.harvested,
          );
          if (targetNodeIndex === -1) {
            ctx.addLine("All nodes depleted", "info");
            return;
          }
        }

        try {
          const { data: hData } = await api.harvestEvent(
            targetEvent.id,
            targetNodeIndex,
          );
          ctx.addLine(
            `Harvested ${hData.resource.name} x${hData.resource.quantity}`,
            "success",
          );
          if (hData.remainingNodes > 0) {
            ctx.addLine(`${hData.remainingNodes} nodes remaining`, "info");
          } else {
            ctx.addLine("Event depleted", "info");
          }
          ctx.refreshStatus();
        } catch (err: any) {
          ctx.addLine(err.response?.data?.error || "Harvest failed", "error");
        }
      })
      .catch((err: any) =>
        ctx.addLine(err.response?.data?.error || "Harvest failed", "error"),
      );
  },

  claim: (args, ctx) => {
    if (args.length < 1) {
      ctx.addLine("Usage: claim <name or #>", "error");
      return;
    }
    const planets = (ctx.sector?.planets ?? []).map((p: any) => ({
      id: p.id,
      name: p.name,
    }));
    const result = resolveItem(args.join(" "), planets, ctx);
    if (result === null) {
      ctx.addLine("Planet not found in sector", "error");
      return;
    }
    if (result === "ambiguous") return;
    api
      .claimPlanet(result.id)
      .then(({ data }) => {
        ctx.addLine(`Claimed ${result.name}!`, "success");
        if (data.message) ctx.addLine(data.message, "npc");
        ctx.refreshSector();
        ctx.advanceTutorial("claim");
      })
      .catch((err: any) =>
        ctx.addLine(err.response?.data?.error || "Claim failed", "error"),
      );
  },

  salvagedeRelict: (args, ctx) => {
    // Salvage a derelict resource event
    api
      .getResourceEvents()
      .then(async ({ data }) => {
        const derelicts = (data.resourceEvents || []).filter(
          (e: any) => e.eventType === "derelict" && !e.claimedBy,
        );
        if (derelicts.length === 0) {
          ctx.addLine("No unclaimed derelicts in sector", "info");
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
          if (target.eventType !== "derelict") {
            ctx.addLine("That is not a derelict", "error");
            return;
          }
        } else {
          target = derelicts[0];
        }

        try {
          const { data: sData } = await api.salvageEvent(target.id);
          ctx.addLine("=== DERELICT SALVAGED ===", "system");
          if (sData.credits > 0)
            ctx.addLine(
              `  Credits: +${sData.credits.toLocaleString()}`,
              "trade",
            );
          if (sData.resources?.length > 0) {
            for (const r of sData.resources) {
              ctx.addLine(`  ${r.name} x${r.quantity}`, "trade");
            }
          }
          if (sData.tabletDrop) {
            ctx.addLine(
              `  Tablet found: ${sData.tabletDrop.name} (${sData.tabletDrop.rarity})!`,
              "success",
            );
          }
          ctx.refreshStatus();
        } catch (err: any) {
          ctx.addLine(err.response?.data?.error || "Salvage failed", "error");
        }
      })
      .catch((err: any) =>
        ctx.addLine(err.response?.data?.error || "Salvage failed", "error"),
      );
  },

  investigate: (args, ctx) => {
    if (args.length < 1) {
      // Investigate first event in sector
      const evt = ctx.sector?.events?.[0];
      if (!evt) {
        ctx.addLine("No anomalies in this sector", "error");
        return;
      }
      api
        .investigateEvent(evt.id)
        .then(({ data }) => {
          ctx.addLine(data.message, "success");
          if (data.creditsGained)
            ctx.addLine(`+${data.creditsGained} credits`, "trade");
          if (data.creditsLost)
            ctx.addLine(`-${data.creditsLost} credits`, "warning");
          if (data.cargoGained)
            ctx.addLine(
              `+${data.cargoGained.quantity} ${data.cargoGained.commodity}`,
              "trade",
            );
          if (data.tabletDrop) {
            ctx.addLine(
              `You found a tablet: ${data.tabletDrop.name} (${data.tabletDrop.rarity})!`,
              "success",
            );
          }
          ctx.refreshStatus();
          ctx.refreshSector();
        })
        .catch((err: any) =>
          ctx.addLine(
            err.response?.data?.error || "Investigation failed",
            "error",
          ),
        );
    } else {
      api
        .investigateEvent(args[0])
        .then(({ data }) => {
          ctx.addLine(data.message, "success");
          if (data.creditsGained)
            ctx.addLine(`+${data.creditsGained} credits`, "trade");
          if (data.creditsLost)
            ctx.addLine(`-${data.creditsLost} credits`, "warning");
          if (data.cargoGained)
            ctx.addLine(
              `+${data.cargoGained.quantity} ${data.cargoGained.commodity}`,
              "trade",
            );
          if (data.tabletDrop) {
            ctx.addLine(
              `You found a tablet: ${data.tabletDrop.name} (${data.tabletDrop.rarity})!`,
              "success",
            );
          }
          ctx.refreshStatus();
          ctx.refreshSector();
        })
        .catch((err: any) =>
          ctx.addLine(
            err.response?.data?.error || "Investigation failed",
            "error",
          ),
        );
    }
  },
};
