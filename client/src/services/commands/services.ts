/**
 * Star Mall service commands — mall, dealer, store, garage, cantina, refuel, upgrade, salvage.
 * Provides the UI layer for all outpost services where players spend credits
 * to buy ships, repair, upgrade, refuel, and interact with NPCs.
 */
import * as api from "../api";
import type { CommandHandler } from "./types";
import { resolveItem } from "./utils";
import { buildDealerScene } from "../../config/scenes/dealer-scene";
import { buildCantinaScene } from "../../config/scenes/cantina-scene";
import { buildGarageScene } from "../../config/scenes/garage-scene";
import { buildSalvageScene } from "../../config/scenes/salvage-scene";
import { buildUpgradeScene } from "../../config/scenes/upgrade-scene";
import { buildRefuelScene } from "../../config/scenes/refuel-scene";

export const servicesCommands: Record<string, CommandHandler> = {
  mall: (_args, ctx) => {
    const MALL_SERVICES: Record<string, { label: string; cmd: string }> = {
      shipDealer: { label: "Ship Dealer", cmd: "dealer" },
      generalStore: { label: "General Store", cmd: "store" },
      garage: { label: "Garage", cmd: "garage" },
      salvageYard: { label: "Salvage Yard", cmd: "salvage" },
      cantina: { label: "Cantina", cmd: "cantina" },
      refueling: { label: "Refueling", cmd: "refuel" },
      bountyBoard: { label: "Bounty Board", cmd: "bounties" },
    };
    api
      .getStarMallOverview()
      .then(({ data }) => {
        ctx.addLine("=== STAR MALL ===", "system");
        for (const [key, svc] of Object.entries(data.services) as [
          string,
          any,
        ][]) {
          const info = MALL_SERVICES[key] ?? { label: key, cmd: "" };
          const extra =
            svc.storedShips != null
              ? ` (${svc.storedShips} ships stored)`
              : svc.activeBounties != null
                ? ` (${svc.activeBounties} active)`
                : "";
          const hint = info.cmd ? `  → type "${info.cmd}"` : "";
          ctx.addLine(
            `  ${info.label.padEnd(16)} ${(svc.available ? "OPEN" : "CLOSED").padEnd(8)}${extra}${hint}`,
            svc.available ? "success" : "warning",
          );
        }
        ctx.addLine(`Credits: ${data.credits.toLocaleString()}`, "info");
        if (data.message) ctx.addLine(data.message, "npc");
      })
      .catch((err: any) =>
        ctx.addLine(err.response?.data?.error || "Not at a star mall", "error"),
      );
  },

  store: (_args, ctx) => {
    api
      .getStoreCatalog()
      .then(({ data }) => {
        ctx.addLine("=== GENERAL STORE ===", "system");
        data.items.forEach((item: any, i: number) => {
          const avail = item.canUse ? "" : ` [${item.reason}]`;
          const itemId = item.id ?? item.itemId;
          ctx.addLine(
            `  [${i + 1}] ${item.name.padEnd(24)} ${String(item.price).padStart(8)} cr  [${item.category}]${avail}  (${itemId})`,
            item.canUse ? "info" : "warning",
          );
        });
        ctx.setLastListing(
          data.items.map((i: any) => ({
            id: i.id ?? i.itemId,
            label: i.name,
          })),
        );
        ctx.addLine('Use "purchase <name or #>" to buy', "info");
      })
      .catch((err: any) =>
        ctx.addLine(err.response?.data?.error || "Not at a star mall", "error"),
      );
  },

  cantina: (_args, ctx) => {
    api
      .getCantina()
      .then(({ data }) => {
        ctx.enqueueScene?.(
          buildCantinaScene(ctx.player?.currentShip?.shipTypeId ?? "scout"),
        );
        ctx.addLine("=== CANTINA ===", "system");
        if (data.message) ctx.addLine(data.message, "npc");
        ctx.addLine(`"${data.rumor}"`, "info");
        ctx.addLine(
          `Intel available for ${data.intelCost} credits. Type "intel" to buy.`,
          "trade",
        );
        if (data.cantinaUnlocked) {
          ctx.addLine(
            'The bartender nods at you. Type "cantinatalk" (ct) for work.',
            "info",
          );
        } else {
          ctx.addLine(
            'The bartender ignores you. Complete "The Bartender\'s Trust" mission to unlock.',
            "info",
          );
        }
      })
      .catch((err: any) =>
        ctx.addLine(err.response?.data?.error || "Not at a star mall", "error"),
      );
  },

  dealer: (_args, ctx) => {
    api
      .getDealer()
      .then(({ data }) => {
        ctx.addLine("=== SHIP DEALER ===", "system");
        for (const ship of data.ships) {
          const lock = ship.locked ? ` [Lv.${ship.requiredLevel}]` : "";
          ctx.addLine(
            `  ${ship.name.padEnd(24)} ${String(ship.price).padStart(8)} cr  W:${ship.baseWeaponEnergy} C:${ship.baseCargoHolds} E:${ship.baseEngineEnergy}${lock}`,
            ship.locked ? "warning" : "info",
          );
        }
        ctx.addLine('Use "buyship <type>" to purchase', "info");
      })
      .catch((err: any) =>
        ctx.addLine(err.response?.data?.error || "No star mall here", "error"),
      );
  },

  buyship: (args, ctx) => {
    if (args.length < 1) {
      ctx.addLine("Usage: buyship <ship_type>", "error");
      return;
    }
    api
      .buyShip(args[0])
      .then(({ data }) => {
        ctx.enqueueScene?.(buildDealerScene(data.shipType ?? args[0]));
        ctx.addLine(
          `Purchased ${data.shipType}! Credits remaining: ${data.newCredits.toLocaleString()}`,
          "success",
        );
        if (data.message) ctx.addLine(data.message, "npc");
        ctx.refreshStatus();
      })
      .catch((err: any) =>
        ctx.addLine(err.response?.data?.error || "Purchase failed", "error"),
      );
  },

  garage: (_args, ctx) => {
    api
      .getGarage()
      .then(({ data }) => {
        if (data.ships.length === 0) {
          ctx.addLine("No ships in garage", "info");
          return;
        }
        ctx.addLine("=== GARAGE ===", "system");
        data.ships.forEach((ship: any, i: number) => {
          ctx.addLine(
            `  [${i + 1}] ${ship.name.padEnd(20)} W:${ship.weaponEnergy} E:${ship.engineEnergy} C:${ship.cargoHolds}  (${ship.id.slice(0, 8)})`,
            "info",
          );
        });
        ctx.setLastListing(
          data.ships.map((s: any) => ({ id: s.id, label: s.name })),
        );
        ctx.addLine('Use "retrieve <name or #>" to get a ship', "info");
      })
      .catch((err: any) =>
        ctx.addLine(err.response?.data?.error || "Not at a star mall", "error"),
      );
  },

  storeship: (_args, ctx) => {
    api
      .storeShipInGarage()
      .then(({ data }) => {
        ctx.enqueueScene?.(
          buildGarageScene(
            ctx.player?.currentShip?.shipTypeId ?? "scout",
            false,
          ),
        );
        ctx.addLine(
          `Ship stored in garage. Switched to ${data.switchedTo.slice(0, 8)}`,
          "success",
        );
        if (data.note) ctx.addLine(data.note, "warning");
        if (data.message) ctx.addLine(data.message, "npc");
        ctx.refreshStatus();
      })
      .catch((err: any) =>
        ctx.addLine(err.response?.data?.error || "Store failed", "error"),
      );
  },

  retrieve: (args, ctx) => {
    if (args.length < 1) {
      ctx.addLine("Usage: retrieve <name or #>", "error");
      return;
    }
    const query = args.join(" ");
    api
      .getGarage()
      .then(({ data }) => {
        const items = data.ships.map((s: any) => ({
          id: s.id,
          name: s.name,
        }));
        const result = resolveItem(query, items, ctx);
        if (result === null) {
          ctx.addLine(
            `No ship matching "${query}". Type "garage" to see stored ships.`,
            "error",
          );
          return;
        }
        if (result === "ambiguous") return;
        api
          .retrieveShipFromGarage(result.id)
          .then(({ data: retData }) => {
            ctx.enqueueScene?.(
              buildGarageScene(retData.shipTypeId ?? "scout", true),
            );
            ctx.addLine(`Retrieved ${retData.name} from garage`, "success");
            if (retData.message) ctx.addLine(retData.message, "npc");
            ctx.refreshStatus();
          })
          .catch((err: any) =>
            ctx.addLine(
              err.response?.data?.error || "Retrieve failed",
              "error",
            ),
          );
      })
      .catch((err: any) =>
        ctx.addLine(err.response?.data?.error || "Not at a star mall", "error"),
      );
  },

  salvage: (args, ctx) => {
    // Check if we're at a star mall for ship salvage, or should do derelict salvage
    if (!ctx.sector?.hasStarMall) {
      // Not at star mall — try derelict salvage
      api
        .getResourceEvents()
        .then(async ({ data }) => {
          const derelicts = (data.resourceEvents || []).filter(
            (e: any) => e.eventType === "derelict" && !e.claimedBy,
          );
          if (derelicts.length === 0) {
            ctx.addLine(
              "No unclaimed derelicts in sector. For ship salvage, visit a Star Mall.",
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
              for (const r of sData.resources)
                ctx.addLine(`  ${r.name} x${r.quantity}`, "trade");
            }
            if (sData.tabletDrop) {
              ctx.addLine(
                `  Tablet found: ${sData.tabletDrop.name} (${sData.tabletDrop.rarity})!`,
                "success",
              );
            }
            ctx.refreshStatus();
            ctx.refreshSector();
          } catch (err: any) {
            ctx.addLine(err.response?.data?.error || "Salvage failed", "error");
          }
        })
        .catch((err: any) =>
          ctx.addLine(
            err.response?.data?.error || "No derelicts here",
            "error",
          ),
        );
      return;
    }
    if (args.length > 0 && args[0] !== "list") {
      const query = args.join(" ");
      api
        .getSalvageOptions()
        .then(({ data }) => {
          const items = data.ships.map((s: any) => ({
            id: s.id,
            name: s.name,
          }));
          const result = resolveItem(query, items, ctx);
          if (result === null) {
            ctx.addLine(
              `No ship matching "${query}". Type "salvage" to see options.`,
              "error",
            );
            return;
          }
          if (result === "ambiguous") return;
          api
            .salvageShip(result.id)
            .then(({ data: salvData }) => {
              ctx.enqueueScene?.(
                buildSalvageScene(salvData.shipType ?? "scout"),
              );
              ctx.addLine(
                `Salvaged ${salvData.shipType} for ${salvData.salvageValue.toLocaleString()} credits`,
                "success",
              );
              if (salvData.message) ctx.addLine(salvData.message, "npc");
              ctx.refreshStatus();
            })
            .catch((err: any) =>
              ctx.addLine(
                err.response?.data?.error || "Salvage failed",
                "error",
              ),
            );
        })
        .catch((err: any) =>
          ctx.addLine(
            err.response?.data?.error || "Not at a star mall",
            "error",
          ),
        );
    } else {
      api
        .getSalvageOptions()
        .then(({ data }) => {
          if (data.ships.length === 0) {
            ctx.addLine("No ships available for salvage", "info");
            return;
          }
          ctx.addLine("=== SALVAGE YARD ===", "system");
          data.ships.forEach((ship: any, i: number) => {
            const status = ship.hasCargo ? " [has cargo!]" : "";
            ctx.addLine(
              `  [${i + 1}] ${ship.name.padEnd(20)} ${String(ship.salvageValue).padStart(8)} cr${status}  (${ship.id.slice(0, 8)})`,
              ship.hasCargo ? "warning" : "info",
            );
          });
          ctx.setLastListing(
            data.ships.map((s: any) => ({ id: s.id, label: s.name })),
          );
          ctx.addLine('Use "salvage <name or #>" to sell', "info");
        })
        .catch((err: any) =>
          ctx.addLine(
            err.response?.data?.error || "Not at a star mall",
            "error",
          ),
        );
    }
  },

  refuel: (args, ctx) => {
    const qty = args.length > 0 ? parseInt(args[0]) : 50;
    api
      .refuel(isNaN(qty) ? 50 : qty)
      .then(({ data }) => {
        ctx.enqueueScene?.(
          buildRefuelScene(ctx.player?.currentShip?.shipTypeId ?? "scout"),
        );
        ctx.addLine(
          `Refueled ${data.refueled} energy for ${data.cost} credits. Energy: ${data.newEnergy}`,
          "success",
        );
        if (data.message) ctx.addLine(data.message, "npc");
        ctx.refreshStatus();
      })
      .catch((err: any) =>
        ctx.addLine(err.response?.data?.error || "Refuel failed", "error"),
      );
  },

  upgrade: (args, ctx) => {
    if (args.length < 1) {
      ctx.addLine("Usage: upgrade <name or #>", "error");
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
      .upgradePlanet(result.id)
      .then(({ data }) => {
        ctx.addLine(
          `${result.name} upgraded to level ${data.newLevel}!`,
          "success",
        );
        ctx.refreshStatus();
        ctx.refreshSector();
      })
      .catch((err: any) =>
        ctx.addLine(err.response?.data?.error || "Upgrade failed", "error"),
      );
  },

  shipupgrades: (_args, ctx) => {
    api
      .getShipUpgrades()
      .then(({ data }) => {
        if (data.upgrades.length === 0) {
          ctx.addLine("No upgrades installed on current ship", "info");
          return;
        }
        ctx.addLine("=== SHIP UPGRADES ===", "system");
        data.upgrades.forEach((u: any, i: number) => {
          ctx.addLine(
            `  [${i + 1}] ${u.name.padEnd(20)} [${u.slot}] +${u.effectiveBonus}  (${u.installId.slice(0, 8)})`,
            "info",
          );
        });
        ctx.setLastListing(
          data.upgrades.map((u: any) => ({ id: u.installId, label: u.name })),
        );
        ctx.addLine('Use "uninstall <name or #>" to remove', "info");
      })
      .catch((err: any) =>
        ctx.addLine(err.response?.data?.error || "Not at a star mall", "error"),
      );
  },

  install: (args, ctx) => {
    if (args.length < 1) {
      ctx.addLine("Usage: install <name or #>", "error");
      return;
    }
    const query = args.join(" ");
    api
      .getAvailableUpgrades()
      .then(({ data }) => {
        const items = data.upgrades.map((u: any) => ({
          id: u.id,
          name: u.name,
        }));
        const result = resolveItem(query, items, ctx);
        if (result === null) {
          ctx.addLine(
            `No upgrade matching "${query}". Type "upgrades" to see available options.`,
            "error",
          );
          return;
        }
        if (result === "ambiguous") return;
        api
          .installUpgrade(result.id)
          .then(({ data: installData }) => {
            ctx.enqueueScene?.(
              buildUpgradeScene(ctx.player?.currentShip?.shipTypeId ?? "scout"),
            );
            ctx.addLine(
              `Installed ${installData.name} [${installData.slot}] +${installData.effectiveBonus}`,
              "success",
            );
            ctx.addLine(
              `Credits: ${installData.newCredits.toLocaleString()}`,
              "trade",
            );
            ctx.refreshStatus();
          })
          .catch((err: any) =>
            ctx.addLine(err.response?.data?.error || "Install failed", "error"),
          );
      })
      .catch((err: any) =>
        ctx.addLine(err.response?.data?.error || "Not at a star mall", "error"),
      );
  },

  uninstall: (args, ctx) => {
    if (args.length < 1) {
      ctx.addLine("Usage: uninstall <name or #>", "error");
      return;
    }
    const query = args.join(" ");
    api
      .getShipUpgrades()
      .then(({ data }) => {
        const items = data.upgrades.map((u: any) => ({
          id: u.installId,
          name: u.name,
        }));
        const result = resolveItem(query, items, ctx);
        if (result === null) {
          ctx.addLine(
            `No upgrade matching "${query}". Type "shipupgrades" to see installed upgrades.`,
            "error",
          );
          return;
        }
        if (result === "ambiguous") return;
        api
          .uninstallUpgrade(result.id)
          .then(() => {
            ctx.addLine("Upgrade removed", "success");
          })
          .catch((err: any) =>
            ctx.addLine(
              err.response?.data?.error || "Uninstall failed",
              "error",
            ),
          );
      })
      .catch((err: any) =>
        ctx.addLine(err.response?.data?.error || "Not at a star mall", "error"),
      );
  },

  upgrades: (_args, ctx) => {
    api
      .getAvailableUpgrades()
      .then(({ data }) => {
        if (data.upgrades.length === 0) {
          ctx.addLine("No upgrades available", "info");
          return;
        }
        ctx.addLine("=== AVAILABLE UPGRADES ===", "system");
        data.upgrades.forEach((u: any, i: number) => {
          ctx.addLine(
            `  [${i + 1}] ${u.name.padEnd(20)} ${String(u.price).padStart(8)} cr  [${u.slot}] +${u.statBonus}`,
            "info",
          );
          ctx.addLine(`    ${u.description} (${u.id})`, "info");
        });
        ctx.setLastListing(
          data.upgrades.map((u: any) => ({ id: u.id, label: u.name })),
        );
        ctx.addLine('Use "install <name or #>" to install', "info");
      })
      .catch((err: any) =>
        ctx.addLine(err.response?.data?.error || "Not at a star mall", "error"),
      );
  },
};
