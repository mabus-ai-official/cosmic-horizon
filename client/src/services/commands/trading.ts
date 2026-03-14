/**
 * Trading commands — buy, sell, prices, cargo, jettison, transfer.
 * Drives the supply/demand economy by letting players trade commodities
 * at outposts and manage their ship's cargo hold.
 */
import * as api from "../api";
import type { CommandHandler } from "./types";
import { resolveItem } from "./utils";

export const tradingCommands: Record<string, CommandHandler> = {
  buy: (args, ctx) => {
    if (args.length < 2) {
      ctx.addLine("Usage: buy <commodity> <quantity>", "error");
      return;
    }
    const outpost = ctx.sector?.outposts?.[0];
    if (!outpost) {
      ctx.addLine("No outpost in this sector", "error");
      return;
    }
    if (!ctx.player?.dockedAtOutpostId) {
      ctx.addLine(
        'Must be docked at this outpost to trade. Type "dock" first.',
        "error",
      );
      return;
    }
    ctx.doBuy(outpost.id, args[0].toLowerCase(), parseInt(args[1]) || 1);
  },

  sell: (args, ctx) => {
    if (args.length < 2) {
      ctx.addLine("Usage: sell <commodity> <quantity>", "error");
      return;
    }
    const outpost = ctx.sector?.outposts?.[0];
    if (!outpost) {
      ctx.addLine("No outpost in this sector", "error");
      return;
    }
    if (!ctx.player?.dockedAtOutpostId) {
      ctx.addLine(
        'Must be docked at this outpost to trade. Type "dock" first.',
        "error",
      );
      return;
    }
    ctx.doSell(outpost.id, args[0].toLowerCase(), parseInt(args[1]) || 1);
  },

  purchase: (args, ctx) => {
    if (args.length < 1) {
      ctx.addLine("Usage: purchase <name or #>", "error");
      return;
    }
    const query = args.join(" ");
    api
      .getStoreCatalog()
      .then(({ data }) => {
        const items = data.items.map((i: any) => ({
          id: i.id ?? i.itemId,
          name: i.name,
        }));
        const result = resolveItem(query, items, ctx);
        if (result === null) {
          ctx.addLine(
            `No item matching "${query}". Type "store" to see available items.`,
            "error",
          );
          return;
        }
        if (result === "ambiguous") return;
        api
          .buyStoreItem(result.id)
          .then(({ data: buyData }) => {
            ctx.addLine(
              `Purchased ${buyData.name || buyData.item}! Credits: ${buyData.newCredits?.toLocaleString() ?? "N/A"}`,
              "success",
            );
            if (buyData.message) ctx.addLine(buyData.message, "npc");
            ctx.refreshStatus();
          })
          .catch((err: any) =>
            ctx.addLine(
              err.response?.data?.error || "Purchase failed",
              "error",
            ),
          );
      })
      .catch((err: any) =>
        ctx.addLine(err.response?.data?.error || "Not at a star mall", "error"),
      );
  },

  trades: (_args, ctx) => {
    ctx.addLine("Loading trade offers...", "system");
    Promise.all([api.getIncomingTrades(), api.getOutgoingTrades()])
      .then(([incoming, outgoing]) => {
        const inc = incoming.data.offers || [];
        const out = outgoing.data.offers || [];
        if (inc.length === 0 && out.length === 0) {
          ctx.addLine("No pending trade offers.", "info");
          return;
        }
        if (inc.length > 0) {
          ctx.addLine(`=== INCOMING OFFERS (${inc.length}) ===`, "system");
          inc.forEach((o: any) => {
            const desc =
              o.tradeType === "resource"
                ? `${o.quantity} ${o.resourceType} from ${o.sourcePlanetName || "?"}`
                : `Planet "${o.transferPlanetName || "?"}" [${o.transferPlanetClass || "?"}]`;
            const priceStr = o.price > 0 ? ` for ${o.price} cr` : " (gift)";
            ctx.addLine(
              `  ${o.senderName}: ${desc}${priceStr}  [ID: ${o.id.slice(0, 8)}]`,
              "trade",
            );
          });
          ctx.addLine(
            'Accept: "accepttrade <id>" | Reject: "rejecttrade <id>"',
            "info",
          );
        }
        if (out.length > 0) {
          ctx.addLine(`=== OUTGOING OFFERS (${out.length}) ===`, "system");
          out.forEach((o: any) => {
            const desc =
              o.tradeType === "resource"
                ? `${o.quantity} ${o.resourceType}`
                : `Planet "${o.transferPlanetName || "?"}"`;
            ctx.addLine(
              `  To ${o.recipientName}: ${desc}  [ID: ${o.id.slice(0, 8)}]`,
              "trade",
            );
          });
          ctx.addLine('Cancel: "canceltrade <id>"', "info");
        }
      })
      .catch(() => ctx.addLine("Failed to load trades", "error"));
  },

  offer: (args, ctx) => {
    // offer <player> resource <planetName> <resourceType> <qty> [price]
    // offer <player> planet <planetName> [price]
    if (args.length < 3) {
      ctx.addLine(
        "Usage: offer <player> resource <planet> <type> <qty> [price]",
        "info",
      );
      ctx.addLine("       offer <player> planet <planet> [price]", "info");
      return;
    }
    const recipientName = args[0];
    const offerType = args[1].toLowerCase();
    if (offerType === "resource") {
      if (args.length < 5) {
        ctx.addLine(
          "Usage: offer <player> resource <planet> <type> <qty> [price]",
          "error",
        );
        return;
      }
      const planetName = args[2];
      const resourceType = args[3].toLowerCase();
      const qty = parseInt(args[4], 10);
      const price = args[5] ? parseInt(args[5], 10) : 0;
      if (isNaN(qty) || qty <= 0) {
        ctx.addLine("Quantity must be a positive number", "error");
        return;
      }
      // Resolve planet by name
      api
        .getOwnedPlanets()
        .then(({ data }) => {
          const planets = data.planets || data;
          const planet = (Array.isArray(planets) ? planets : []).find(
            (p: any) =>
              p.name.toLowerCase() === planetName.toLowerCase() ||
              p.id === planetName,
          );
          if (!planet) {
            ctx.addLine(
              `Planet "${planetName}" not found in owned planets`,
              "error",
            );
            return;
          }
          return api
            .offerPlanetTrade({
              recipientName,
              tradeType: "resource",
              planetId: planet.id,
              resourceType,
              quantity: qty,
              price,
            })
            .then(() => {
              ctx.addLine(
                `Offered ${qty} ${resourceType} to ${recipientName}${price ? ` for ${price} credits` : " (gift)"}`,
                "success",
              );
            });
        })
        .catch((err: any) => {
          ctx.addLine(
            err?.response?.data?.error || "Failed to send offer",
            "error",
          );
        });
    } else if (offerType === "planet") {
      const planetName = args[2];
      const price = args[3] ? parseInt(args[3], 10) : 0;
      api
        .getOwnedPlanets()
        .then(({ data }) => {
          const planets = data.planets || data;
          const planet = (Array.isArray(planets) ? planets : []).find(
            (p: any) =>
              p.name.toLowerCase() === planetName.toLowerCase() ||
              p.id === planetName,
          );
          if (!planet) {
            ctx.addLine(
              `Planet "${planetName}" not found in owned planets`,
              "error",
            );
            return;
          }
          return api
            .offerPlanetTrade({
              recipientName,
              tradeType: "planet",
              transferPlanetId: planet.id,
              price,
            })
            .then(() => {
              ctx.addLine(
                `Offered planet "${planet.name}" to ${recipientName}${price ? ` for ${price} credits` : " (gift)"}`,
                "success",
              );
            });
        })
        .catch((err: any) => {
          ctx.addLine(
            err?.response?.data?.error || "Failed to send offer",
            "error",
          );
        });
    } else {
      ctx.addLine('Offer type must be "resource" or "planet"', "error");
    }
  },

  accepttrade: (args, ctx) => {
    if (!args[0]) {
      ctx.addLine("Usage: accepttrade <offer-id>", "error");
      return;
    }
    api
      .getIncomingTrades()
      .then(({ data }) => {
        const match = (data.offers || []).find((o: any) =>
          o.id.startsWith(args[0]),
        );
        if (!match) {
          ctx.addLine("Offer not found", "error");
          return;
        }
        return api.acceptTrade(match.id).then(() => {
          ctx.addLine("Trade accepted!", "success");
        });
      })
      .catch((err: any) =>
        ctx.addLine(err?.response?.data?.error || "Failed to accept", "error"),
      );
  },

  rejecttrade: (args, ctx) => {
    if (!args[0]) {
      ctx.addLine("Usage: rejecttrade <offer-id>", "error");
      return;
    }
    api
      .getIncomingTrades()
      .then(({ data }) => {
        const match = (data.offers || []).find((o: any) =>
          o.id.startsWith(args[0]),
        );
        if (!match) {
          ctx.addLine("Offer not found", "error");
          return;
        }
        return api.rejectTrade(match.id).then(() => {
          ctx.addLine("Trade rejected.", "info");
        });
      })
      .catch((err: any) =>
        ctx.addLine(err?.response?.data?.error || "Failed to reject", "error"),
      );
  },

  canceltrade: (args, ctx) => {
    if (!args[0]) {
      ctx.addLine("Usage: canceltrade <offer-id>", "error");
      return;
    }
    api
      .getOutgoingTrades()
      .then(({ data }) => {
        const match = (data.offers || []).find((o: any) =>
          o.id.startsWith(args[0]),
        );
        if (!match) {
          ctx.addLine("Offer not found", "error");
          return;
        }
        return api.cancelTrade(match.id).then(() => {
          ctx.addLine("Trade offer cancelled.", "info");
        });
      })
      .catch((err: any) =>
        ctx.addLine(err?.response?.data?.error || "Failed to cancel", "error"),
      );
  },
};
