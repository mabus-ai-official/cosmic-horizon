/**
 * Scanning commands — look, scan, map, sector-info.
 * Provides situational awareness by inspecting the current sector,
 * probing adjacent sectors, and rendering the explored galaxy map.
 */
import * as api from "../api";
import type { CommandHandler } from "./types";
import { buildLookScene } from "../../config/scenes/look-scene";
import { buildScanScene } from "../../config/scenes/scan-scene";

export const scanningCommands: Record<string, CommandHandler> = {
  look: (_args, ctx) => {
    const s = ctx.sector;
    if (!s) {
      ctx.addLine("No sector data", "error");
      return;
    }
    ctx.enqueueScene?.(
      buildLookScene(
        ctx.player?.currentShip?.shipTypeId ?? "scout",
        (s.planets?.length ?? 0) > 0,
        (s.outposts?.length ?? 0) > 0,
        (s.players?.length ?? 0) > 0,
      ),
    );
    ctx.addLine(`=== Sector ${s.sectorId} [${s.type}] ===`, "system");
    if (s.hasStarMall) {
      if (s.spMallLocked) {
        ctx.addLine(
          "Star Mall [LOCKED — complete missions to unlock]",
          "warning",
        );
      } else {
        ctx.addLine("Star Mall", "success");
      }
    }
    ctx.addLine(
      `Adjacent: ${s.adjacentSectors.map((a: any) => a.sectorId + (a.oneWay ? "→" : "")).join(", ")}`,
      "info",
    );
    if (s.players.length > 0)
      ctx.addLine(
        `Players: ${s.players.map((p: any) => p.username).join(", ")}`,
        "warning",
      );
    if (s.outposts.length > 0)
      ctx.addLine(
        `Outposts: ${s.outposts.map((o: any) => o.name).join(", ")}`,
        "info",
      );
    if (s.planets.length > 0) {
      ctx.addLine("Planets:", "info");
      s.planets.forEach((p: any, i: number) => {
        const tag =
          p.planetClass === "S"
            ? " [seed world]"
            : p.ownerId
              ? ""
              : " *unclaimed*";
        const variantTag = p.variant
          ? ` ★ ${(p.variantName || p.variant).toUpperCase()}`
          : "";
        ctx.addLine(
          `  [${i + 1}] ${p.name} [${p.planetClass}]${tag}${variantTag}`,
          p.variant ? "success" : "info",
        );
      });
      ctx.setLastListing(
        s.planets.map((p: any) => ({ id: p.id, label: p.name })),
      );
    }
    if (s.events?.length > 0) {
      ctx.addLine(
        `Anomalies: ${s.events.map((e: any) => e.eventType.replace(/_/g, " ")).join(", ")}`,
        "warning",
      );
    }
    if (s.resourceEvents?.length > 0) {
      ctx.addLine("Resource Events:", "warning");
      for (const re of s.resourceEvents) {
        if (re.eventType === "asteroid_field") {
          ctx.addLine(
            `  Asteroid Field (${re.remainingNodes} nodes) — use 'harvest' to mine`,
            "info",
          );
        } else if (re.eventType === "derelict" && !re.claimedBy) {
          ctx.addLine(`  Derelict Ship — use 'salvage' to claim`, "info");
        } else if (re.eventType === "anomaly") {
          ctx.addLine(`  Resource Anomaly — use 'harvest' to collect`, "info");
        } else if (re.eventType === "alien_cache") {
          const gStr =
            re.guardianHp > 0
              ? `Guardian HP: ${re.guardianHp}`
              : "Guardian defeated";
          ctx.addLine(
            `  !! ALIEN CACHE !! (${gStr}) — use 'attackguardian'`,
            "warning",
          );
        }
      }
    }
    if (s.npcs?.length > 0) {
      ctx.addLine(
        `NPCs: ${s.npcs.map((n: any) => `${n.name}${n.encountered ? "" : " [NEW]"}`).join(", ")}`,
        "info",
      );
    }
    if (s.warpGates?.length > 0) {
      ctx.addLine(
        `Warp Gates: ${s.warpGates.map((g: any) => `→ Sector ${g.destinationSectorId}${g.tollAmount > 0 ? ` (${g.tollAmount} cr toll)` : ""}`).join(", ")}`,
        "success",
      );
    }
    if (s.hasStarMall)
      ctx.addLine('★ Star Mall — type "mall" to see services', "success");
    ctx.advanceTutorial("look");
  },

  scan: (_args, ctx) => {
    ctx.advanceTutorial("scan");
    ctx.addLine("Scanning adjacent sectors...", "info");
    api
      .scan()
      .then(({ data }) => {
        if (data.scannedSectors.length === 0) {
          ctx.addLine("No scanner data returned", "warning");
          return;
        }
        ctx.enqueueScene?.(
          buildScanScene(
            ctx.player?.currentShip?.shipTypeId ?? "scout",
            ctx.sector?.adjacentSectors?.length ?? 3,
          ),
        );

        // Collect scan summary stats
        let totalPlanets = 0;
        let totalEvents = 0;
        let totalHostiles = 0;

        // Separate sectors by significance for ordered output
        const highlights: {
          sector: any;
          lines: { text: string; type: any }[];
        }[] = [];
        const normal: {
          sector: any;
          lines: { text: string; type: any }[];
        }[] = [];

        for (const sector of data.scannedSectors) {
          const sectorLines: { text: string; type: any }[] = [];
          let isHighlight = false;

          totalPlanets += sector.planets.length;
          if (sector.players.length > 0) totalHostiles += sector.players.length;

          // Variant planets — high significance
          for (const p of sector.planets) {
            if (p.variant) {
              sectorLines.push({
                text: `    ★ ${p.name} [${p.planetClass}] — ${(p.variantName || p.variant).toUpperCase()} VARIANT`,
                type: "success",
              });
              isHighlight = true;
            }
          }

          // Resource events — medium significance
          if (sector.resourceEvents?.length > 0) {
            totalEvents += sector.resourceEvents.length;
            for (const re of sector.resourceEvents) {
              const timeMs = Math.max(
                0,
                new Date(re.expiresAt).getTime() - Date.now(),
              );
              const hours = Math.floor(timeMs / 3600000);
              const mins = Math.floor((timeMs % 3600000) / 60000);
              const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
              if (re.eventType === "alien_cache") {
                const gStr =
                  re.guardianHp > 0 ? "guardian active" : "guardian defeated";
                sectorLines.push({
                  text: `    !! ALIEN CACHE !! (${gStr}, expires ${timeStr})`,
                  type: "warning",
                });
                isHighlight = true;
              } else if (re.eventType === "asteroid_field") {
                sectorLines.push({
                  text: `    Asteroid Field (${re.remainingNodes} nodes, expires ${timeStr})`,
                  type: "trade",
                });
                isHighlight = true;
              } else if (re.eventType === "anomaly") {
                sectorLines.push({
                  text: `    Resource Anomaly (expires ${timeStr})`,
                  type: "trade",
                });
                isHighlight = true;
              } else if (re.eventType === "derelict") {
                sectorLines.push({
                  text: `    Derelict Ship (expires ${timeStr})`,
                  type: "trade",
                });
                isHighlight = true;
              }
            }
          }

          // Players — warning
          if (sector.players.length > 0) {
            sectorLines.push({
              text: `    ${sector.players.length} pilot(s) detected`,
              type: "warning",
            });
            isHighlight = true;
          }

          const entry = { sector, lines: sectorLines };
          if (isHighlight) {
            highlights.push(entry);
          } else {
            normal.push(entry);
          }
        }

        ctx.addLine(
          `=== SCAN RESULTS: ${data.scannedSectors.length} sectors analyzed ===`,
          "system",
        );

        // Show highlights first
        for (const { sector, lines: sLines } of [...highlights, ...normal]) {
          const parts = [`Sector ${sector.id} [${sector.type}]`];
          if (sector.planets.length > 0)
            parts.push(`${sector.planets.length} planet(s)`);
          ctx.addLine(
            `  ${parts.join(" — ")}`,
            sLines.length > 0 ? "info" : "info",
          );
          for (const sl of sLines) {
            ctx.addLine(sl.text, sl.type);
          }
        }

        ctx.addLine(
          `Scan complete: ${totalPlanets} planets, ${totalEvents} events, ${totalHostiles} hostiles`,
          "system",
        );
      })
      .catch((err: any) =>
        ctx.addLine(err.response?.data?.error || "Scan failed", "error"),
      );
  },

  map: (_args, ctx) => {
    ctx.advanceTutorial("map");
    ctx.addLine("Fetching explored map...", "info");
    api
      .getMap()
      .then(({ data }) => {
        ctx.addLine(`Explored ${data.sectors.length} sectors`, "system");
        ctx.addLine(`Current: Sector ${data.currentSectorId}`, "info");
        const starMalls = data.sectors.filter((s: any) => s.hasStarMall);
        if (starMalls.length > 0) {
          ctx.addLine(
            `Star Malls discovered: ${starMalls.map((s: any) => `Sector ${s.id}`).join(", ")}`,
            "success",
          );
        }
      })
      .catch((err: any) =>
        ctx.addLine(err.response?.data?.error || "Map failed", "error"),
      );
  },

  status: (_args, ctx) => {
    const p = ctx.player;
    if (!p) {
      ctx.addLine("Not logged in", "error");
      return;
    }
    const raceLabel = p.race
      ? ` [${p.race.charAt(0).toUpperCase() + p.race.slice(1)}]`
      : "";
    const levelLabel = p.level ? ` Lv.${p.level}` : "";
    const rankLabel = p.rank ? ` | ${p.rank}` : "";
    const modeLabel = p.gameMode === "singleplayer" ? " [SINGLE PLAYER]" : "";
    ctx.addLine(
      `=== ${p.username}${raceLabel}${levelLabel}${rankLabel}${modeLabel} ===`,
      "system",
    );
    ctx.addLine(
      `Sector: ${p.currentSectorId} | Energy: ${p.energy}/${p.maxEnergy} | Credits: ${p.credits.toLocaleString()}`,
      "info",
    );
    if (p.xp != null) ctx.addLine(`XP: ${p.xp.toLocaleString()}`, "info");
    if (p.currentShip) {
      const c = p.currentShip;
      ctx.addLine(
        `Ship: ${c.shipTypeId} | Hull: ${c.hullHp}/${c.maxHullHp} | Weapons: ${c.weaponEnergy} | Engines: ${c.engineEnergy}`,
        "info",
      );
      const total =
        c.cyrilliumCargo +
        c.foodCargo +
        c.techCargo +
        c.colonistsCargo +
        (c.vedicCargo || 0);
      ctx.addLine(
        `Cargo: Cyr=${c.cyrilliumCargo} Food=${c.foodCargo} Tech=${c.techCargo} VCry=${c.vedicCargo || 0} Col=${c.colonistsCargo} [${total}/${c.maxCargoHolds}]`,
        "info",
      );
    }
    ctx.advanceTutorial("status");
  },

  planets: (args, ctx) => {
    if (args[0] === "all" || args[0] === "discovered") {
      api
        .getDiscoveredPlanets()
        .then(({ data }) => {
          if (data.planets.length === 0) {
            ctx.addLine(
              "No planets discovered yet. Explore more sectors!",
              "info",
            );
            return;
          }
          ctx.addLine("=== DISCOVERED PLANETS ===", "system");
          data.planets.forEach((p: any, i: number) => {
            const tag = p.owned
              ? " [YOURS]"
              : p.ownerName
                ? ` (${p.ownerName})`
                : p.planetClass === "S"
                  ? " [seed world]"
                  : " *unclaimed*";
            ctx.addLine(
              `  [${i + 1}] ${p.name} [${p.planetClass}] Sector ${p.sectorId}${tag}`,
              p.owned ? "success" : "info",
            );
            if (p.owned && p.cyrilliumStock != null) {
              ctx.addLine(
                `      Level ${p.upgradeLevel} | Colonists: ${p.colonists.toLocaleString()} | Cyr: ${p.cyrilliumStock} Food: ${p.foodStock} Tech: ${p.techStock}`,
                "info",
              );
            } else {
              ctx.addLine(
                `      Level ${p.upgradeLevel} | Colonists: ${p.colonists.toLocaleString()}`,
                "info",
              );
            }
          });
        })
        .catch((err: any) =>
          ctx.addLine(
            err.response?.data?.error || "Failed to fetch planets",
            "error",
          ),
        );
    } else {
      api
        .getOwnedPlanets()
        .then(({ data }) => {
          if (data.planets.length === 0) {
            ctx.addLine("You do not own any planets", "info");
            return;
          }
          ctx.addLine("=== YOUR PLANETS ===", "system");
          data.planets.forEach((p: any, i: number) => {
            const queueTag =
              p.refineryQueueCount > 0
                ? ` | Refinery: ${p.refineryQueueCount} active`
                : "";
            const variantTag = p.variant
              ? ` ★ ${(p.variantName || p.variant).toUpperCase()}`
              : "";
            ctx.addLine(
              `  [${i + 1}] ${p.name} [${p.planetClass}] Sector ${p.sectorId}    Level ${p.upgradeLevel}${queueTag}${variantTag}`,
              p.variant ? "success" : "info",
            );
            ctx.addLine(
              `      Colonists: ${p.colonists.toLocaleString()} | Cyr: ${p.cyrilliumStock} Food: ${p.foodStock} Tech: ${p.techStock}`,
              "info",
            );
            if (p.rareResource)
              ctx.addLine(
                `      Ultra-Rare: produces ${p.rareResource}`,
                "success",
              );
            if (p.uniqueResources?.length > 0) {
              ctx.addLine(
                `      Resources: ${p.uniqueResources.map((r: any) => `${r.name} x${r.stock}`).join(", ")}`,
                "trade",
              );
            }
            ctx.addLine(
              `      Production/tick: Cyr=${p.production.cyrillium} Food=${p.production.food} Tech=${p.production.tech}`,
              "trade",
            );
          });
        })
        .catch((err: any) =>
          ctx.addLine(
            err.response?.data?.error || "Failed to fetch planets",
            "error",
          ),
        );
    }
  },
};
