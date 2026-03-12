/**
 * Special action commands — deploy, colonize, planet, investigate, escort, bombard, scanner.
 * Covers advanced gameplay actions like deploying mines/drones, colonizing
 * planets, managing colonies, and using the planetary scanner system.
 */
import * as api from "../api";
import type { CommandHandler } from "./types";
import { resolveItem } from "./utils";
import { buildDeployScene } from "../../config/scenes/deploy-scene";
import { buildColonizeScene } from "../../config/scenes/colonize-scene";
import { buildScannerScene } from "../../config/scenes/scanner-scene";

export const specialCommands: Record<string, CommandHandler> = {
  deploy: (args, ctx) => {
    if (args.length < 1) {
      ctx.addLine(
        "Usage: deploy <item_id> [toll_amount] [buoy_message...]",
        "error",
      );
      return;
    }
    const tollAmt = args.length > 1 ? parseInt(args[1]) : undefined;
    const buoyMsg = args.length > 1 ? args.slice(1).join(" ") : undefined;
    api
      .deploy(args[0], tollAmt, buoyMsg)
      .then(({ data }) => {
        ctx.enqueueScene?.(
          buildDeployScene(
            ctx.player?.currentShip?.shipTypeId ?? "scout",
            data.type ?? args[0],
          ),
        );
        ctx.addLine(
          `Deployed ${data.type} in sector ${data.sectorId}. Credits: ${data.newCredits.toLocaleString()}`,
          "success",
        );
        ctx.refreshStatus();
      })
      .catch((err: any) =>
        ctx.addLine(err.response?.data?.error || "Deploy failed", "error"),
      );
  },

  colonize: (args, ctx) => {
    if (args.length < 2) {
      ctx.addLine("Usage: colonize <name or #> <quantity>", "error");
      return;
    }
    const qty = parseInt(args[args.length - 1]);
    if (isNaN(qty)) {
      ctx.addLine("Quantity must be a number", "error");
      return;
    }
    const planetQuery = args.slice(0, -1).join(" ");
    const planets = (ctx.sector?.planets ?? []).map((p: any) => ({
      id: p.id,
      name: p.name,
      planetClass: p.planetClass,
    }));
    const result = resolveItem(planetQuery, planets, ctx);
    if (result === null) {
      ctx.addLine("Planet not found in sector", "error");
      return;
    }
    if (result === "ambiguous") return;
    const planetClass =
      planets.find((p: any) => p.id === result.id)?.planetClass ?? "H";
    api
      .colonizePlanet(result.id, qty, ctx.player?.race ?? "terran")
      .then(({ data }) => {
        ctx.enqueueScene?.(
          buildColonizeScene(
            ctx.player?.currentShip?.shipTypeId ?? "scout",
            planetClass,
          ),
        );
        ctx.addLine(
          `Deposited ${data.deposited} colonists on ${result.name} (${data.planetColonists} total)`,
          "success",
        );
        if (data.message) ctx.addLine(data.message, "npc");
        ctx.refreshStatus();
      })
      .catch((err: any) =>
        ctx.addLine(err.response?.data?.error || "Colonize failed", "error"),
      );
  },

  collect: (args, ctx) => {
    if (args.length < 1) {
      ctx.addLine("Usage:", "info");
      ctx.addLine(
        "  collect <name or #> <quantity>    Collect colonists from seed planet",
        "info",
      );
      ctx.addLine(
        "  collect resources <planet>        Collect all resources from planet",
        "info",
      );
      ctx.addLine(
        "  collect refinery <#>              Collect completed refinery batch",
        "info",
      );
      ctx.addLine(
        "  collect all <planet>              Collect resources + all refinery batches",
        "info",
      );
      return;
    }

    // "collect resources <planet>"
    if (args[0].toLowerCase() === "resources") {
      if (args.length < 2) {
        ctx.addLine("Usage: collect resources <planet name or #>", "error");
        return;
      }
      const pQuery = args.slice(1).join(" ");
      const planets = (ctx.sector?.planets ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
      }));
      const result = resolveItem(pQuery, planets, ctx);
      if (result === null) {
        ctx.addLine("Planet not found in sector", "error");
        return;
      }
      if (result === "ambiguous") return;
      api
        .collectPlanetResources(result.id)
        .then(({ data }) => {
          if (data.collected.length === 0) {
            ctx.addLine("No resources to collect", "info");
            return;
          }
          ctx.addLine(`Collected resources from ${result.name}:`, "success");
          for (const c of data.collected) {
            ctx.addLine(`  ${c.name} x${c.quantity}`, "trade");
          }
          if (data.xp?.awarded) ctx.addLine(`+${data.xp.awarded} XP`, "info");
          ctx.refreshStatus();
        })
        .catch((err: any) =>
          ctx.addLine(err.response?.data?.error || "Collect failed", "error"),
        );
      return;
    }

    // "collect refinery <#>"
    if (args[0].toLowerCase() === "refinery") {
      if (args.length < 2) {
        ctx.addLine("Usage: collect refinery <queue #>", "error");
        return;
      }
      const listing = ctx.getLastListing();
      const num = parseInt(args[1]);
      if (!isNaN(num) && listing && num >= 1 && num <= listing.length) {
        const queueId = listing[num - 1].id;
        api
          .collectRefinery(queueId)
          .then(({ data }) => {
            ctx.addLine(
              `Collected: ${data.recipeName} x${data.batchSize}`,
              "success",
            );
            if (data.output)
              ctx.addLine(
                `  Output: ${data.output.name || data.output.type} x${data.output.quantity || 1}`,
                "trade",
              );
            if (data.xp?.awarded) ctx.addLine(`+${data.xp.awarded} XP`, "info");
            ctx.refreshStatus();
          })
          .catch((err: any) =>
            ctx.addLine(err.response?.data?.error || "Collect failed", "error"),
          );
      } else {
        ctx.addLine(
          `Invalid queue #. View planet resources first to see queue.`,
          "error",
        );
      }
      return;
    }

    // "collect all <planet>"
    if (args[0].toLowerCase() === "all") {
      if (args.length < 2) {
        ctx.addLine("Usage: collect all <planet name or #>", "error");
        return;
      }
      const pQuery = args.slice(1).join(" ");
      const planets = (ctx.sector?.planets ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
      }));
      const result = resolveItem(pQuery, planets, ctx);
      if (result === null) {
        ctx.addLine("Planet not found in sector", "error");
        return;
      }
      if (result === "ambiguous") return;
      // Collect resources + refinery
      api
        .collectPlanetResources(result.id)
        .then(({ data }) => {
          if (data.collected.length > 0) {
            ctx.addLine(`Resources from ${result.name}:`, "success");
            for (const c of data.collected)
              ctx.addLine(`  ${c.name} x${c.quantity}`, "trade");
          }
          // Then collect all refinery
          api
            .collectAllRefinery(result.id)
            .then(({ data: rData }) => {
              if (rData.collected > 0) {
                ctx.addLine(
                  `Refinery batches collected: ${rData.collected}`,
                  "success",
                );
                for (const r of rData.results) {
                  ctx.addLine(`  ${r.recipeName} x${r.batchSize}`, "trade");
                }
              }
              if (data.collected.length === 0 && rData.collected === 0) {
                ctx.addLine("Nothing to collect", "info");
              }
              ctx.refreshStatus();
            })
            .catch((err: any) =>
              ctx.addLine(
                err.response?.data?.error || "Refinery collect failed",
                "error",
              ),
            );
        })
        .catch((err: any) =>
          ctx.addLine(err.response?.data?.error || "Collect failed", "error"),
        );
      return;
    }

    // Default: collect colonists from seed planet
    if (args.length < 2) {
      ctx.addLine("Usage: collect <name or #> <quantity>", "error");
      return;
    }
    const qty = parseInt(args[args.length - 1]);
    if (isNaN(qty)) {
      ctx.addLine("Quantity must be a number", "error");
      return;
    }
    const planetQuery = args.slice(0, -1).join(" ");
    const planets = (ctx.sector?.planets ?? []).map((p: any) => ({
      id: p.id,
      name: p.name,
    }));
    const result = resolveItem(planetQuery, planets, ctx);
    if (result === null) {
      ctx.addLine("Planet not found in sector", "error");
      return;
    }
    if (result === "ambiguous") return;
    api
      .collectColonists(result.id, qty, ctx.player?.race ?? "terran")
      .then(({ data }) => {
        ctx.addLine(
          `Collected ${data.collected} colonists from ${result.name}`,
          "success",
        );
        ctx.refreshStatus();
      })
      .catch((err: any) =>
        ctx.addLine(err.response?.data?.error || "Collect failed", "error"),
      );
  },

  land: (args, ctx) => {
    if (args.length < 1) {
      ctx.addLine("Usage: land <name or #>", "error");
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
      .getPlanet(result.id)
      .then(({ data }) => {
        const variantLabel = data.variant
          ? ` ★ ${(data.variantName || data.variant).toUpperCase()} VARIANT`
          : "";
        ctx.addLine(
          `=== ${data.name} [Class ${data.planetClass}]${variantLabel} ===`,
          "system",
        );
        ctx.addLine(
          `Owner: ${data.ownerId || "Unclaimed"} | Level: ${data.upgradeLevel} | Colonists: ${data.colonists.toLocaleString()}`,
          "info",
        );
        if (data.variant && data.rareResource) {
          ctx.addLine(`Ultra-Rare: produces ${data.rareResource}`, "success");
        }
        ctx.addLine(
          `Stocks: Cyr=${data.cyrilliumStock} Food=${data.foodStock} Tech=${data.techStock} Drones=${data.droneCount}`,
          "info",
        );
        ctx.addLine(
          `Production/tick: Cyr=${data.production.cyrillium} Food=${data.production.food} Tech=${data.production.tech}`,
          "trade",
        );
        if (data.uniqueResources?.length > 0) {
          ctx.addLine(
            `Unique Resources: ${data.uniqueResources.map((r: any) => `${r.name} x${r.stock}`).join(", ")}`,
            "trade",
          );
        }
        if (data.refineryQueue?.length > 0) {
          ctx.addLine(
            `Refinery Queue (${data.refineryQueue.length}/${data.refinerySlots} slots):`,
            "info",
          );
          data.refineryQueue.forEach((q: any, i: number) => {
            const status = q.ready
              ? "READY"
              : `${Math.ceil((new Date(q.completesAt).getTime() - Date.now()) / 60000)} min remaining`;
            ctx.addLine(
              `  [${i + 1}] ${q.recipeName} x${q.batchSize} — ${status}`,
              q.ready ? "success" : "info",
            );
          });
          ctx.setLastListing(
            data.refineryQueue.map((q: any) => ({
              id: q.id,
              label: q.recipeName,
            })),
          );
        }
        if (data.canUpgrade)
          ctx.addLine(
            'This planet can be upgraded! Type "upgrade <name or #>"',
            "success",
          );
      })
      .catch((err: any) =>
        ctx.addLine(err.response?.data?.error || "Landing failed", "error"),
      );
  },

  ask: (args, ctx) => {
    if (args.length === 0) {
      ctx.addLine("Usage: ask <question> — Ask ARIA, your ship AI.", "info");
      return;
    }
    const question = args.join(" ");
    ctx.addLine(`> ${question}`, "info");
    ctx.addLine("ARIA is thinking...", "system");
    api
      .askAI(question)
      .then(({ data }) => {
        ctx.addLine(`ARIA: ${data.answer}`, "ai");
      })
      .catch((err: any) => {
        const msg =
          err?.response?.data?.error || "ARIA is unavailable right now.";
        ctx.addLine(`ARIA: ${msg}`, "error");
      });
  },

  cloak: (_args, ctx) => {
    api
      .toggleCloak()
      .then(({ data }) => {
        ctx.addLine(
          data.cloaked
            ? "Cloaking device engaged"
            : "Cloaking device disengaged",
          data.cloaked ? "success" : "info",
        );
        if (data.message) ctx.addLine(data.message, "npc");
      })
      .catch((err: any) =>
        ctx.addLine(err.response?.data?.error || "Cloak failed", "error"),
      );
  },

  eject: (args, ctx) => {
    if (args.length < 2) {
      ctx.addLine("Usage: eject <commodity> <quantity>", "error");
      return;
    }
    api
      .ejectCargo(args[0].toLowerCase(), parseInt(args[1]) || 1)
      .then(({ data }) => {
        ctx.addLine(
          `Jettisoned ${data.ejected} ${data.commodity} (${data.remaining} remaining)`,
          "warning",
        );
        if (data.message) ctx.addLine(data.message, "npc");
        ctx.refreshStatus();
      })
      .catch((err: any) =>
        ctx.addLine(err.response?.data?.error || "Eject failed", "error"),
      );
  },

  use: (args, ctx) => {
    if (args.length < 1) {
      ctx.addLine("Usage: use <name or #> [args]", "error");
      return;
    }
    // Separate extra args (e.g. sectorId) from the item query
    // If last arg is a number and there are 2+ args, treat it as an extra arg
    let itemQuery: string;
    let extra: Record<string, any> = {};
    if (args.length > 1 && !isNaN(parseInt(args[args.length - 1]))) {
      extra = { sectorId: parseInt(args[args.length - 1]) };
      itemQuery = args.slice(0, -1).join(" ");
    } else {
      itemQuery = args.join(" ");
    }
    api
      .getInventory()
      .then(({ data }) => {
        const items = data.inventory.map((i: any) => ({
          id: i.itemId,
          name: i.name,
        }));
        const result = resolveItem(itemQuery, items, ctx);
        if (result === null) {
          ctx.addLine(
            `No item matching "${itemQuery}". Type "inventory" to see your items.`,
            "error",
          );
          return;
        }
        if (result === "ambiguous") return;
        api
          .useStoreItem(result.id, extra)
          .then(({ data: useData }) => {
            ctx.enqueueScene?.(
              buildScannerScene(ctx.player?.currentShip?.shipTypeId ?? "scout"),
            );
            ctx.addLine(`Used item successfully`, "success");
            if (useData.sectorId) {
              ctx.addLine(
                `Sector ${useData.sectorId} [${useData.sectorType}]:`,
                "system",
              );
              if (useData.players?.length)
                ctx.addLine(
                  `  Players: ${useData.players.join(", ")}`,
                  "warning",
                );
              if (useData.outposts?.length)
                ctx.addLine(
                  `  Outposts: ${useData.outposts.join(", ")}`,
                  "info",
                );
              if (useData.planets?.length)
                ctx.addLine(
                  `  Planets: ${useData.planets.map((p: any) => `${p.name} [${p.class}]`).join(", ")}`,
                  "info",
                );
            }
            ctx.refreshStatus();
          })
          .catch((err: any) =>
            ctx.addLine(err.response?.data?.error || "Use failed", "error"),
          );
      })
      .catch((err: any) =>
        ctx.addLine(err.response?.data?.error || "Failed", "error"),
      );
  },

  inventory: (_args, ctx) => {
    api
      .getInventory()
      .then(({ data }) => {
        const hasItems = data.inventory.length > 0;
        const hasEquipped = data.equipped?.length > 0;
        if (!hasItems && !hasEquipped) {
          ctx.addLine("Your inventory is empty", "info");
          return;
        }
        if (hasItems) {
          ctx.addLine("=== INVENTORY ===", "system");
          data.inventory.forEach((item: any, i: number) => {
            const qty = item.quantity > 1 ? `x${item.quantity}` : "";
            const cat = item.category ? ` [${item.category}]` : "";
            ctx.addLine(
              `  [${i + 1}] ${item.name.padEnd(24)} ${qty.padStart(4)}${cat}  (${item.itemId})`,
              "info",
            );
          });
          ctx.setLastListing(
            data.inventory.map((i: any) => ({ id: i.itemId, label: i.name })),
          );
          ctx.addLine('Use "use <name or #>" to use an item', "info");
        }
        if (hasEquipped) {
          ctx.addLine("=== EQUIPPED ===", "system");
          for (const eq of data.equipped) {
            ctx.addLine(
              `  ${eq.name.padEnd(24)} [installed on ship]`,
              "success",
            );
          }
        }
      })
      .catch((err: any) =>
        ctx.addLine(err.response?.data?.error || "Failed", "error"),
      );
  },

  profile: (args, ctx) => {
    if (args[0] === "transition" || args[0] === "go-multiplayer") {
      // SP → MP transition command
      if (ctx.player?.gameMode !== "singleplayer") {
        ctx.addLine("You are already in multiplayer mode.", "error");
        return;
      }
      const force = args[1] === "--force";
      ctx.addLine("Transitioning to multiplayer...", "system");
      api
        .transitionToMP(force)
        .then(({ data }) => {
          ctx.addLine(data.message, "success");
          ctx.addLine(`New sector: ${data.newSectorId}`, "info");
          ctx.addLine("Refreshing game state...", "system");
          ctx.refreshStatus();
          ctx.refreshSector();
        })
        .catch((err: any) => {
          const errData = err.response?.data;
          if (errData?.completed != null) {
            ctx.addLine(`${errData.error}`, "error");
            ctx.addLine(
              `Progress: ${errData.completed}/${errData.total} SP missions completed`,
              "info",
            );
            ctx.addLine(
              'Use "profile transition --force" to transition early.',
              "info",
            );
          } else {
            ctx.addLine(errData?.error || "Transition failed", "error");
          }
        });
      return;
    }
    if (args[0] === "go-singleplayer") {
      // MP → SP transition command
      if (ctx.player?.gameMode === "singleplayer") {
        ctx.addLine("You are already in single player mode.", "error");
        return;
      }
      ctx.addLine("Transitioning to single player...", "system");
      ctx.addLine(
        "A fresh 1000-sector universe will be generated for you.",
        "info",
      );
      api
        .transitionToSP()
        .then(({ data }) => {
          ctx.addLine(data.message, "success");
          ctx.addLine(`New sector: ${data.newSectorId}`, "info");
          ctx.addLine("Refreshing game state...", "system");
          ctx.refreshStatus();
          ctx.refreshSector();
        })
        .catch((err: any) => {
          ctx.addLine(
            err.response?.data?.error || "Transition failed",
            "error",
          );
        });
      return;
    }
    api
      .getProfile()
      .then(({ data }) => {
        ctx.addLine(`=== ${data.username} [${data.rank}] ===`, "system");
        if (ctx.player?.gameMode === "singleplayer") {
          const sp = ctx.player.spMissions;
          ctx.addLine(
            `Mode: Single Player (${sp?.completed || 0}/${sp?.total || 20} missions complete)`,
            "warning",
          );
        } else {
          ctx.addLine("Mode: Multiplayer", "info");
        }
        ctx.addLine(
          `Level: ${data.level}/100 | XP: ${data.xp.toLocaleString()}${data.xpForNextLevel ? ` / ${data.xpForNextLevel.toLocaleString()}` : " (MAX)"}`,
          "info",
        );
        if (data.xpNeeded > 0) {
          const pct = Math.floor((data.xpProgress / data.xpNeeded) * 100);
          const filled = Math.floor(pct / 5);
          const bar = "=".repeat(filled) + "-".repeat(20 - filled);
          ctx.addLine(`Progress: [${bar}] ${pct}%`, "info");
        }
        const lb = data.levelBonuses;
        if (lb) {
          ctx.addLine(
            `Level Bonuses: +${lb.maxEnergyBonus} Energy, +${lb.weaponBonus} Weapon, +${lb.engineBonus} Engine, +${lb.cargoBonus} Cargo`,
            "success",
          );
        }
        ctx.addLine("", "info");
        if (ctx.player?.gameMode === "singleplayer") {
          ctx.addLine(
            'Type "profile go-multiplayer" to switch to multiplayer.',
            "info",
          );
        } else {
          ctx.addLine(
            'Type "profile go-singleplayer" to switch to single player.',
            "info",
          );
        }
      })
      .catch((err: any) =>
        ctx.addLine(err.response?.data?.error || "Profile failed", "error"),
      );
  },

  achievements: (_args, ctx) => {
    api
      .getAchievements()
      .then(({ data }) => {
        ctx.addLine(
          `=== ACHIEVEMENTS (${data.totalEarned}/${data.totalVisible}) ===`,
          "system",
        );
        if (data.earned.length > 0) {
          ctx.addLine("--- EARNED ---", "system");
          for (const a of data.earned) {
            ctx.addLine(
              `  [${a.icon}] ${a.name} - ${a.description}`,
              "success",
            );
          }
        }
        if (data.available.length > 0) {
          ctx.addLine("--- LOCKED ---", "system");
          for (const a of data.available) {
            ctx.addLine(`  [ ] ${a.name} - ${a.description}`, "info");
          }
        }
      })
      .catch((err: any) =>
        ctx.addLine(
          err.response?.data?.error || "Achievements failed",
          "error",
        ),
      );
  },

  ranks: (_args, ctx) => {
    api
      .getRanks()
      .then(({ data }) => {
        ctx.addLine("=== RANK TIERS ===", "system");
        for (const r of data.ranks) {
          const range =
            r.minLevel === r.maxLevel
              ? `${r.minLevel}`
              : `${r.minLevel}-${r.maxLevel}`;
          ctx.addLine(`  Level ${range.padEnd(7)} ${r.title}`, "info");
        }
        ctx.addLine("", "info");
        ctx.addLine("=== SHIP LEVEL GATES ===", "system");
        for (const [ship, level] of Object.entries(data.shipGates)) {
          ctx.addLine(
            `  ${(ship as string).padEnd(14)} Level ${level}`,
            "info",
          );
        }
      })
      .catch((err: any) =>
        ctx.addLine(err.response?.data?.error || "Ranks failed", "error"),
      );
  },

  bombard: (args, ctx) => {
    const planetNum = parseInt(args[0], 10);
    const energy = parseInt(args[1], 10);
    if (!planetNum || !energy || energy < 1) {
      ctx.addLine("Usage: bombard <planet#> <energy>", "error");
      return;
    }
    const planets = ctx.sector?.planets || [];
    const target = planets[planetNum - 1];
    if (!target) {
      ctx.addLine(`No planet #${planetNum} in this sector.`, "error");
      return;
    }
    api
      .bombardPlanet(target.id, energy)
      .then(({ data }) => {
        ctx.addLine("=== BOMBARDMENT RESULTS ===", "combat");
        if (data.shieldDamage > 0)
          ctx.addLine(`  Shield damage: ${data.shieldDamage}`, "combat");
        if (data.cannonDamage > 0)
          ctx.addLine(`  Cannon damage: ${data.cannonDamage}`, "combat");
        if (data.dronesDestroyed > 0)
          ctx.addLine(`  Drones destroyed: ${data.dronesDestroyed}`, "combat");
        if (data.returnFireDamage > 0)
          ctx.addLine(
            `  Return fire! Your ship took ${data.returnFireDamage} damage (hull: ${data.attackerHullRemaining})`,
            "error",
          );
        if (data.attackerDestroyed)
          ctx.addLine("  Your ship was destroyed by cannon fire!", "error");
        ctx.addLine(
          `  Defenses remaining: Shield ${data.planetDefenses.shieldEnergy} | Cannon ${data.planetDefenses.cannonEnergy} | Drones ${data.planetDefenses.droneCount}`,
          "info",
        );
        if (data.conquered) {
          ctx.addLine("  PLANET CONQUERED! You are the new owner!", "success");
        }
        if (data.xp?.awarded)
          ctx.addLine(`  +${data.xp.awarded} XP`, "success");
        ctx.refreshStatus();
      })
      .catch((err: any) =>
        ctx.addLine(
          err?.response?.data?.error || "Bombardment failed",
          "error",
        ),
      );
  },

  fortify: (args, ctx) => {
    const fPlanetNum = parseInt(args[0], 10);
    const fType = args[1]?.toLowerCase();
    const fAmount = parseInt(args[2], 10);
    if (!fPlanetNum || !fType || !fAmount || fAmount < 1) {
      ctx.addLine(
        "Usage: fortify <planet#> <shield|cannon|drone> <amount>",
        "error",
      );
      return;
    }
    if (!["shield", "cannon", "drone"].includes(fType)) {
      ctx.addLine("Type must be shield, cannon, or drone", "error");
      return;
    }
    const ownedPlanets = ctx.sector?.planets || [];
    const fTarget = ownedPlanets[fPlanetNum - 1];
    if (!fTarget) {
      ctx.addLine(`No planet #${fPlanetNum} in this sector.`, "error");
      return;
    }
    api
      .fortifyPlanet(fTarget.id, fType, fAmount)
      .then(({ data }) => {
        ctx.addLine(
          `Fortified ${data.added} ${fType}(s) on planet. Cost: ${data.creditsCost} credits, ${data.techCost} tech.`,
          "success",
        );
        ctx.addLine(
          `  Defenses: Shield ${data.planetDefenses.shieldEnergy} | Cannon ${data.planetDefenses.cannonEnergy} | Drones ${data.planetDefenses.droneCount}`,
          "info",
        );
        ctx.refreshStatus();
      })
      .catch((err: any) =>
        ctx.addLine(err?.response?.data?.error || "Fortify failed", "error"),
      );
  },

  defenses: (args, ctx) => {
    const dPlanetNum = parseInt(args[0], 10);
    if (!dPlanetNum) {
      ctx.addLine("Usage: defenses <planet#>", "error");
      return;
    }
    const dPlanets = ctx.sector?.planets || [];
    const dTarget = dPlanets[dPlanetNum - 1];
    if (!dTarget) {
      ctx.addLine(`No planet #${dPlanetNum} in this sector.`, "error");
      return;
    }
    api
      .getPlanetDefenses(dTarget.id)
      .then(({ data }) => {
        ctx.addLine(`=== ${data.name} Defenses ===`, "info");
        ctx.addLine(`  Owner: ${data.ownerName || "Unclaimed"}`, "info");
        ctx.addLine(
          `  Shield: ${data.defenses.shieldEnergy}/${data.defenses.shieldMaxEnergy}`,
          "info",
        );
        ctx.addLine(
          `  Cannon: ${data.defenses.cannonEnergy}/${data.defenses.cannonMaxEnergy} (power: ${data.defenses.cannonShotPower})`,
          "info",
        );
        ctx.addLine(
          `  Drones: ${data.defenses.droneCount}${data.defenses.droneMode ? ` (${data.defenses.droneMode})` : ""}`,
          "info",
        );
      })
      .catch((err: any) =>
        ctx.addLine(
          err?.response?.data?.error || "Failed to scan defenses",
          "error",
        ),
      );
  },

  clear: (_args, ctx) => {
    ctx.clearLines();
  },
};
