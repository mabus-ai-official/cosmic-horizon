/**
 * Navigation commands — move, warp-to, dock, undock, warp.
 * Handles all player movement between sectors including warp gates
 * and auto-pathing. Movement is the core gameplay loop driver.
 */
import * as api from "../api";
import type { CommandHandler } from "./types";
import { buildWarpGateScene } from "../../config/scenes/warp-gate-scene";

export const navigationCommands: Record<string, CommandHandler> = {
  move: (args, ctx) => {
    const sectorId = parseInt(args[0]);
    if (isNaN(sectorId)) {
      ctx.addLine("Usage: move <sector_id>", "error");
    } else {
      ctx.doMove(sectorId);
    }
  },

  "warp-to": (args, ctx) => {
    const sectorId = parseInt(args[0]);
    if (isNaN(sectorId)) {
      ctx.addLine(
        "Usage: warp-to <sector_id> [confirm] — auto-path to sector (1 energy per hop)",
        "error",
      );
    } else if (ctx.doWarpTo) {
      ctx.doWarpTo(sectorId, args[1] === "confirm");
    } else {
      ctx.addLine("Warp-to not available", "error");
    }
  },

  dock: (_args, ctx) => {
    const outpost = ctx.sector?.outposts?.[0];
    if (!outpost) {
      ctx.addLine("No outpost in this sector", "error");
      return;
    }
    ctx.doDock();
  },

  undock: (_args, ctx) => {
    if (!ctx.player?.dockedAtOutpostId) {
      ctx.addLine("Not currently docked", "error");
      return;
    }
    ctx.doUndock();
  },

  warp: (args, ctx) => {
    const sub = args[0];
    if (sub === "build" && args[1]) {
      const destSector = parseInt(args[1]);
      if (isNaN(destSector)) {
        ctx.addLine("Usage: warp build <sector_id>", "error");
        return;
      }
      api
        .buildWarpGate(destSector)
        .then(({ data }) => {
          ctx.addLine(
            `Warp gate built! Sector ${data.sectorA} ↔ Sector ${data.sectorB}`,
            "success",
          );
          ctx.addLine(`Credits: ${data.newCredits.toLocaleString()}`, "trade");
          ctx.refreshStatus();
          ctx.refreshSector();
        })
        .catch((err: any) =>
          ctx.addLine(err.response?.data?.error || "Build failed", "error"),
        );
    } else if (sub === "toll" && args[1] && args[2]) {
      const toll = parseInt(args[2]);
      if (isNaN(toll)) {
        ctx.addLine("Usage: warp toll <gate_id> <amount>", "error");
        return;
      }
      api
        .setWarpGateToll(args[1], toll)
        .then(({ data }) => {
          ctx.addLine(`Toll set to ${data.newToll} cr`, "success");
        })
        .catch((err: any) =>
          ctx.addLine(err.response?.data?.error || "Failed", "error"),
        );
    } else if (sub === "list") {
      api
        .getSyndicateWarpGates()
        .then(({ data }) => {
          if (data.gates.length === 0) {
            ctx.addLine("No syndicate warp gates", "info");
            return;
          }
          ctx.addLine("=== SYNDICATE WARP GATES ===", "system");
          for (const g of data.gates) {
            ctx.addLine(
              `  [${g.id.slice(0, 8)}] Sector ${g.sectorA} ↔ Sector ${g.sectorB} | Toll: ${g.tollAmount} cr | HP: ${g.health}`,
              "info",
            );
          }
        })
        .catch((err: any) =>
          ctx.addLine(err.response?.data?.error || "Failed", "error"),
        );
    } else {
      // Use a warp gate in current sector
      const gate = ctx.sector?.warpGates?.[0];
      if (args[0]) {
        api
          .useWarpGate(args[0])
          .then(({ data }) => {
            ctx.enqueueScene?.(
              buildWarpGateScene(
                ctx.player?.currentShip?.shipTypeId ?? "scout",
              ),
            );
            ctx.addLine(
              `Warped to sector ${data.destinationSectorId}!${data.tollPaid > 0 ? ` Toll: ${data.tollPaid} cr` : ""}`,
              "success",
            );
            ctx.refreshStatus();
            ctx.refreshSector();
          })
          .catch((err: any) =>
            ctx.addLine(err.response?.data?.error || "Warp failed", "error"),
          );
      } else if (gate) {
        api
          .useWarpGate(gate.id)
          .then(({ data }) => {
            ctx.enqueueScene?.(
              buildWarpGateScene(
                ctx.player?.currentShip?.shipTypeId ?? "scout",
              ),
            );
            ctx.addLine(
              `Warped to sector ${data.destinationSectorId}!${data.tollPaid > 0 ? ` Toll: ${data.tollPaid} cr` : ""}`,
              "success",
            );
            ctx.refreshStatus();
            ctx.refreshSector();
          })
          .catch((err: any) =>
            ctx.addLine(err.response?.data?.error || "Warp failed", "error"),
          );
      } else {
        ctx.addLine(
          "No warp gate in sector. Usage: warp [gate_id], warp build <sector>, warp toll <gate> <amt>, warp list",
          "error",
        );
      }
    }
  },
};
