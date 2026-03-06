import * as api from "./api";
import type { SceneDefinition } from "../config/scene-types";
import { buildWarpGateScene } from "../config/scenes/warp-gate-scene";
import { buildDeployScene } from "../config/scenes/deploy-scene";
import { buildScannerScene } from "../config/scenes/scanner-scene";
import { buildColonizeScene } from "../config/scenes/colonize-scene";
import { buildCantinaScene } from "../config/scenes/cantina-scene";
import { buildGarageScene } from "../config/scenes/garage-scene";
import { buildSalvageScene } from "../config/scenes/salvage-scene";
import { buildDealerScene } from "../config/scenes/dealer-scene";
import { buildUpgradeScene } from "../config/scenes/upgrade-scene";
import { buildRefuelScene } from "../config/scenes/refuel-scene";
import { buildMissionBoardScene } from "../config/scenes/mission-board-scene";
import { buildBountyBoardScene } from "../config/scenes/bounty-board-scene";
import { buildLookScene } from "../config/scenes/look-scene";
import { buildScanScene } from "../config/scenes/scan-scene";
import { buildNPCEncounterScene } from "../config/scenes/npc-scene";

interface CommandContext {
  addLine: (
    text: string,
    type:
      | "info"
      | "success"
      | "error"
      | "warning"
      | "system"
      | "combat"
      | "trade",
  ) => void;
  clearLines: () => void;
  player: any;
  sector: any;
  doMove: (sectorId: number) => void;
  doWarpTo?: (sectorId: number) => void;
  doBuy: (outpostId: string, commodity: string, quantity: number) => void;
  doSell: (outpostId: string, commodity: string, quantity: number) => void;
  doFire: (targetPlayerId: string, energy: number) => void;
  doFlee: () => void;
  doDock: () => void;
  doUndock: () => void;
  refreshStatus: () => void;
  refreshSector: () => void;
  emit: (event: string, data: any) => void;
  advanceTutorial: (action: string) => void;
  enqueueScene?: (scene: SceneDefinition) => void;
  setLastListing: (items: { id: string; label: string }[]) => void;
  getLastListing: () => { id: string; label: string }[] | null;
}

interface ParsedCommand {
  command: string;
  args: string[];
}

const ALIASES: Record<string, string> = {
  m: "move",
  l: "look",
  s: "scan",
  st: "status",
  d: "dock",
  f: "fire",
  attack: "fire",
  "?": "help",
  commands: "help",
  ships: "dealer",
  say: "chat",
  jettison: "eject",
  top: "leaderboard",
  lb: "leaderboard",
  mb: "missionboard",
  cr: "claimreward",
  ct: "cantinatalk",
  t: "talk",
  con: "contacts",
  n: "note",
  fuel: "refuel",
  ud: "undock",
  p: "profile",
  rank: "profile",
  lvl: "profile",
  ach: "achievements",
  tab: "tablets",
  eq: "equip",
  uneq: "unequip",
  res: "resources",
  rec: "recipes",
  mine: "harvest",
  ag: "attackguardian",
  ev: "events",
  sp: "syndicatepool",
  sd: "syndicatedeposit",
  sw: "syndicatewithdraw",
};

let activeNpcId: string | null = null;

function resolveItem(
  query: string,
  items: { id: string; name: string }[],
  ctx: CommandContext,
): { id: string; name: string } | null | "ambiguous" {
  const num = parseInt(query);
  if (!isNaN(num) && num >= 1) {
    const listing = ctx.getLastListing();
    if (listing && num <= listing.length) {
      const entry = listing[num - 1];
      const match = items.find((i) => i.id === entry.id);
      if (match) return match;
    }
  }
  const q = query.toLowerCase();
  const matches = items.filter(
    (i) => i.id.toLowerCase().includes(q) || i.name.toLowerCase().includes(q),
  );
  if (matches.length === 1) return matches[0];
  if (matches.length === 0) return null;
  ctx.addLine(`Multiple matches for "${query}":`, "warning");
  matches.forEach((m, i) =>
    ctx.addLine(`  [${i + 1}] ${m.name} (${m.id})`, "info"),
  );
  ctx.setLastListing(matches.map((m) => ({ id: m.id, label: m.name })));
  return "ambiguous";
}

function formatTabletEffects(effects: any): string {
  const parts: string[] = [];
  if (effects.weaponBonus) parts.push(`+${effects.weaponBonus} wpn`);
  if (effects.engineBonus) parts.push(`+${effects.engineBonus} eng`);
  if (effects.cargoBonus) parts.push(`+${effects.cargoBonus} cargo`);
  if (effects.shieldBonus) parts.push(`+${effects.shieldBonus} shld`);
  if (effects.fleeBonus)
    parts.push(`+${Math.round(effects.fleeBonus * 100)}% flee`);
  if (effects.xpMultiplier)
    parts.push(`+${Math.round(effects.xpMultiplier * 100)}% XP`);
  return parts.join(", ");
}

function rarityTag(rarity: string): string {
  const colors: Record<string, string> = {
    common: "Common",
    uncommon: "Uncommon",
    rare: "Rare",
    epic: "Epic",
    legendary: "Legendary",
    mythic: "Mythic",
  };
  return colors[rarity] || rarity;
}

function getTimeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function parse(input: string): ParsedCommand {
  const parts = input.trim().split(/\s+/);
  const raw = parts[0].toLowerCase();
  return {
    command: ALIASES[raw] || raw,
    args: parts.slice(1),
  };
}

function isSPBlocked(command: string, ctx: CommandContext): boolean {
  const socialCommands = [
    "chat",
    "syndicate",
    "leaderboard",
    "mail",
    "bounties",
    "bounty",
    "alliance",
    "syndicatepool",
    "syndicatedeposit",
    "syndicatewithdraw",
    "factory",
    "projects",
  ];
  if (
    ctx.player?.gameMode === "singleplayer" &&
    socialCommands.includes(command)
  ) {
    ctx.addLine("Not available in single player mode", "error");
    return true;
  }
  return false;
}

export function handleCommand(input: string, ctx: CommandContext): void {
  const { command, args } = parse(input);

  if (isSPBlocked(command, ctx)) return;

  switch (command) {
    case "move": {
      const sectorId = parseInt(args[0]);
      if (isNaN(sectorId)) {
        ctx.addLine("Usage: move <sector_id>", "error");
      } else {
        ctx.doMove(sectorId);
      }
      break;
    }

    case "warp-to": {
      const sectorId = parseInt(args[0]);
      if (isNaN(sectorId)) {
        ctx.addLine(
          "Usage: warp-to <sector_id> — auto-path to sector (1 energy per hop)",
          "error",
        );
      } else if (ctx.doWarpTo) {
        ctx.doWarpTo(sectorId);
      } else {
        ctx.addLine("Warp-to not available", "error");
      }
      break;
    }

    case "status": {
      const p = ctx.player;
      if (!p) {
        ctx.addLine("Not logged in", "error");
        break;
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
          c.cyrilliumCargo + c.foodCargo + c.techCargo + c.colonistsCargo;
        ctx.addLine(
          `Cargo: Cyr=${c.cyrilliumCargo} Food=${c.foodCargo} Tech=${c.techCargo} Col=${c.colonistsCargo} [${total}/${c.maxCargoHolds}]`,
          "info",
        );
      }
      ctx.advanceTutorial("status");
      break;
    }

    case "look": {
      const s = ctx.sector;
      if (!s) {
        ctx.addLine("No sector data", "error");
        break;
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
            ctx.addLine(
              `  Resource Anomaly — use 'harvest' to collect`,
              "info",
            );
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
      break;
    }

    case "scan":
      ctx.enqueueScene?.(
        buildScanScene(
          ctx.player?.currentShip?.shipTypeId ?? "scout",
          ctx.sector?.adjacentSectors?.length ?? 3,
        ),
      );
      ctx.addLine("Scanning adjacent sectors...", "info");
      api
        .scan()
        .then(({ data }) => {
          if (data.scannedSectors.length === 0) {
            ctx.addLine("No scanner data returned", "warning");
            return;
          }
          for (const sector of data.scannedSectors) {
            const parts = [`Sector ${sector.id} [${sector.type}]`];
            if (sector.planets.length > 0)
              parts.push(`${sector.planets.length} planet(s)`);
            if (sector.players.length > 0)
              parts.push(`${sector.players.length} pilot(s)`);
            ctx.addLine(`  ${parts.join(" - ")}`, "info");
            // Show variant planets
            for (const p of sector.planets) {
              if (p.variant) {
                ctx.addLine(
                  `    ${p.name} [${p.planetClass}] ★ ${(p.variantName || p.variant).toUpperCase()} VARIANT`,
                  "success",
                );
              }
            }
            // Show resource events
            if (sector.resourceEvents?.length > 0) {
              for (const re of sector.resourceEvents) {
                const timeMs = Math.max(
                  0,
                  new Date(re.expiresAt).getTime() - Date.now(),
                );
                const hours = Math.floor(timeMs / 3600000);
                const mins = Math.floor((timeMs % 3600000) / 60000);
                const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
                if (re.eventType === "asteroid_field") {
                  ctx.addLine(
                    `    Asteroid Field (${re.remainingNodes} nodes, expires ${timeStr})`,
                    "trade",
                  );
                } else if (re.eventType === "anomaly") {
                  ctx.addLine(
                    `    Resource Anomaly (expires ${timeStr})`,
                    "trade",
                  );
                } else if (re.eventType === "derelict") {
                  ctx.addLine(
                    `    Derelict Ship (expires ${timeStr})`,
                    "trade",
                  );
                } else if (re.eventType === "alien_cache") {
                  const gStr =
                    re.guardianHp > 0 ? "guardian active" : "guardian defeated";
                  ctx.addLine(
                    `    !! ALIEN CACHE !! (${gStr}, expires ${timeStr})`,
                    "warning",
                  );
                }
              }
            }
          }
        })
        .catch((err: any) =>
          ctx.addLine(err.response?.data?.error || "Scan failed", "error"),
        );
      break;

    case "map":
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
      break;

    case "dock": {
      const outpost = ctx.sector?.outposts?.[0];
      if (!outpost) {
        ctx.addLine("No outpost in this sector", "error");
        break;
      }
      ctx.doDock();
      break;
    }

    case "undock": {
      if (!ctx.player?.dockedAtOutpostId) {
        ctx.addLine("Not currently docked", "error");
        break;
      }
      ctx.doUndock();
      break;
    }

    case "buy": {
      if (args.length < 2) {
        ctx.addLine("Usage: buy <commodity> <quantity>", "error");
        break;
      }
      const outpost = ctx.sector?.outposts?.[0];
      if (!outpost) {
        ctx.addLine("No outpost in this sector", "error");
        break;
      }
      if (!ctx.player?.dockedAtOutpostId) {
        ctx.addLine(
          'Must be docked at this outpost to trade. Type "dock" first.',
          "error",
        );
        break;
      }
      ctx.doBuy(outpost.id, args[0].toLowerCase(), parseInt(args[1]) || 1);
      break;
    }

    case "sell": {
      if (args.length < 2) {
        ctx.addLine("Usage: sell <commodity> <quantity>", "error");
        break;
      }
      const outpost = ctx.sector?.outposts?.[0];
      if (!outpost) {
        ctx.addLine("No outpost in this sector", "error");
        break;
      }
      if (!ctx.player?.dockedAtOutpostId) {
        ctx.addLine(
          'Must be docked at this outpost to trade. Type "dock" first.',
          "error",
        );
        break;
      }
      ctx.doSell(outpost.id, args[0].toLowerCase(), parseInt(args[1]) || 1);
      break;
    }

    case "fire": {
      if (args.length < 2) {
        ctx.addLine("Usage: fire <player_name> <energy>", "error");
        break;
      }
      const targetName = args[0];
      const energy = parseInt(args[1]);
      if (isNaN(energy)) {
        ctx.addLine("Energy must be a number", "error");
        break;
      }
      const target = ctx.sector?.players?.find(
        (p: any) => p.username.toLowerCase() === targetName.toLowerCase(),
      );
      if (!target) {
        ctx.addLine("Player not found in sector", "error");
        break;
      }
      ctx.doFire(target.id, energy);
      break;
    }

    case "flee":
      ctx.doFlee();
      break;

    case "land": {
      if (args.length < 1) {
        ctx.addLine("Usage: land <name or #>", "error");
        break;
      }
      const planets = (ctx.sector?.planets ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
      }));
      const result = resolveItem(args.join(" "), planets, ctx);
      if (result === null) {
        ctx.addLine("Planet not found in sector", "error");
        break;
      }
      if (result === "ambiguous") break;
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
      break;
    }

    case "claim": {
      if (args.length < 1) {
        ctx.addLine("Usage: claim <name or #>", "error");
        break;
      }
      const planets = (ctx.sector?.planets ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
      }));
      const result = resolveItem(args.join(" "), planets, ctx);
      if (result === null) {
        ctx.addLine("Planet not found in sector", "error");
        break;
      }
      if (result === "ambiguous") break;
      api
        .claimPlanet(result.id)
        .then(() => {
          ctx.addLine(`Claimed ${result.name}!`, "success");
          ctx.refreshSector();
        })
        .catch((err: any) =>
          ctx.addLine(err.response?.data?.error || "Claim failed", "error"),
        );
      break;
    }

    case "colonize": {
      if (args.length < 2) {
        ctx.addLine("Usage: colonize <name or #> <quantity>", "error");
        break;
      }
      const qty = parseInt(args[args.length - 1]);
      if (isNaN(qty)) {
        ctx.addLine("Quantity must be a number", "error");
        break;
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
        break;
      }
      if (result === "ambiguous") break;
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
          ctx.refreshStatus();
        })
        .catch((err: any) =>
          ctx.addLine(err.response?.data?.error || "Colonize failed", "error"),
        );
      break;
    }

    case "collect": {
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
        break;
      }

      // "collect resources <planet>"
      if (args[0].toLowerCase() === "resources") {
        if (args.length < 2) {
          ctx.addLine("Usage: collect resources <planet name or #>", "error");
          break;
        }
        const pQuery = args.slice(1).join(" ");
        const planets = (ctx.sector?.planets ?? []).map((p: any) => ({
          id: p.id,
          name: p.name,
        }));
        const result = resolveItem(pQuery, planets, ctx);
        if (result === null) {
          ctx.addLine("Planet not found in sector", "error");
          break;
        }
        if (result === "ambiguous") break;
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
        break;
      }

      // "collect refinery <#>"
      if (args[0].toLowerCase() === "refinery") {
        if (args.length < 2) {
          ctx.addLine("Usage: collect refinery <queue #>", "error");
          break;
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
              if (data.xp?.awarded)
                ctx.addLine(`+${data.xp.awarded} XP`, "info");
              ctx.refreshStatus();
            })
            .catch((err: any) =>
              ctx.addLine(
                err.response?.data?.error || "Collect failed",
                "error",
              ),
            );
        } else {
          ctx.addLine(
            `Invalid queue #. View planet resources first to see queue.`,
            "error",
          );
        }
        break;
      }

      // "collect all <planet>"
      if (args[0].toLowerCase() === "all") {
        if (args.length < 2) {
          ctx.addLine("Usage: collect all <planet name or #>", "error");
          break;
        }
        const pQuery = args.slice(1).join(" ");
        const planets = (ctx.sector?.planets ?? []).map((p: any) => ({
          id: p.id,
          name: p.name,
        }));
        const result = resolveItem(pQuery, planets, ctx);
        if (result === null) {
          ctx.addLine("Planet not found in sector", "error");
          break;
        }
        if (result === "ambiguous") break;
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
        break;
      }

      // Default: collect colonists from seed planet
      if (args.length < 2) {
        ctx.addLine("Usage: collect <name or #> <quantity>", "error");
        break;
      }
      const qty = parseInt(args[args.length - 1]);
      if (isNaN(qty)) {
        ctx.addLine("Quantity must be a number", "error");
        break;
      }
      const planetQuery = args.slice(0, -1).join(" ");
      const planets = (ctx.sector?.planets ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
      }));
      const result = resolveItem(planetQuery, planets, ctx);
      if (result === null) {
        ctx.addLine("Planet not found in sector", "error");
        break;
      }
      if (result === "ambiguous") break;
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
      break;
    }

    case "upgrade": {
      if (args.length < 1) {
        ctx.addLine("Usage: upgrade <name or #>", "error");
        break;
      }
      const planets = (ctx.sector?.planets ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
      }));
      const result = resolveItem(args.join(" "), planets, ctx);
      if (result === null) {
        ctx.addLine("Planet not found in sector", "error");
        break;
      }
      if (result === "ambiguous") break;
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
      break;
    }

    case "planets":
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
      break;

    case "profile":
      if (args[0] === "transition" || args[0] === "go-multiplayer") {
        // SP → MP transition command
        if (ctx.player?.gameMode !== "singleplayer") {
          ctx.addLine("You are already in multiplayer mode.", "error");
          break;
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
        break;
      }
      if (args[0] === "go-singleplayer") {
        // MP → SP transition command
        if (ctx.player?.gameMode === "singleplayer") {
          ctx.addLine("You are already in single player mode.", "error");
          break;
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
        break;
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
      break;

    case "achievements":
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
      break;

    case "ranks":
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
      break;

    case "dealer":
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
          ctx.addLine(
            err.response?.data?.error || "No star mall here",
            "error",
          ),
        );
      break;

    case "buyship": {
      if (args.length < 1) {
        ctx.addLine("Usage: buyship <ship_type>", "error");
        break;
      }
      api
        .buyShip(args[0])
        .then(({ data }) => {
          ctx.enqueueScene?.(buildDealerScene(data.shipType ?? args[0]));
          ctx.addLine(
            `Purchased ${data.shipType}! Credits remaining: ${data.newCredits.toLocaleString()}`,
            "success",
          );
          ctx.refreshStatus();
        })
        .catch((err: any) =>
          ctx.addLine(err.response?.data?.error || "Purchase failed", "error"),
        );
      break;
    }

    case "cloak":
      api
        .toggleCloak()
        .then(({ data }) => {
          ctx.addLine(
            data.cloaked
              ? "Cloaking device engaged"
              : "Cloaking device disengaged",
            data.cloaked ? "success" : "info",
          );
        })
        .catch((err: any) =>
          ctx.addLine(err.response?.data?.error || "Cloak failed", "error"),
        );
      break;

    case "eject": {
      if (args.length < 2) {
        ctx.addLine("Usage: eject <commodity> <quantity>", "error");
        break;
      }
      api
        .ejectCargo(args[0].toLowerCase(), parseInt(args[1]) || 1)
        .then(({ data }) => {
          ctx.addLine(
            `Jettisoned ${data.ejected} ${data.commodity} (${data.remaining} remaining)`,
            "warning",
          );
          ctx.refreshStatus();
        })
        .catch((err: any) =>
          ctx.addLine(err.response?.data?.error || "Eject failed", "error"),
        );
      break;
    }

    case "chat": {
      if (args.length < 1) {
        ctx.addLine("Usage: chat <message>", "error");
        break;
      }
      const msg = args.join(" ");
      const name = ctx.player?.username || "You";
      ctx.addLine(`[${name}] ${msg}`, "info");
      ctx.emit("chat:sector", { message: msg });
      break;
    }

    case "bounty": {
      if (args.length < 2) {
        ctx.addLine("Usage: bounty <player_name> <amount>", "error");
        break;
      }
      const amount = parseInt(args[args.length - 1]);
      if (isNaN(amount)) {
        ctx.addLine("Amount must be a number", "error");
        break;
      }
      // Find the player - they need to be known somehow. For now just pass the name.
      ctx.addLine(
        `Placing bounty... (TODO: resolve player by name)`,
        "warning",
      );
      break;
    }

    case "bounties":
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
      break;

    case "mall": {
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
        })
        .catch((err: any) =>
          ctx.addLine(
            err.response?.data?.error || "Not at a star mall",
            "error",
          ),
        );
      break;
    }

    case "store":
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
          ctx.addLine(
            err.response?.data?.error || "Not at a star mall",
            "error",
          ),
        );
      break;

    case "purchase": {
      if (args.length < 1) {
        ctx.addLine("Usage: purchase <name or #>", "error");
        break;
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
          ctx.addLine(
            err.response?.data?.error || "Not at a star mall",
            "error",
          ),
        );
      break;
    }

    case "inventory":
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
      break;

    case "use": {
      if (args.length < 1) {
        ctx.addLine("Usage: use <name or #> [args]", "error");
        break;
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
                buildScannerScene(
                  ctx.player?.currentShip?.shipTypeId ?? "scout",
                ),
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
      break;
    }

    case "garage":
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
          ctx.addLine(
            err.response?.data?.error || "Not at a star mall",
            "error",
          ),
        );
      break;

    case "storeship":
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
          ctx.refreshStatus();
        })
        .catch((err: any) =>
          ctx.addLine(err.response?.data?.error || "Store failed", "error"),
        );
      break;

    case "retrieve": {
      if (args.length < 1) {
        ctx.addLine("Usage: retrieve <name or #>", "error");
        break;
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
          ctx.addLine(
            err.response?.data?.error || "Not at a star mall",
            "error",
          ),
        );
      break;
    }

    case "salvage":
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
              ctx.addLine(
                err.response?.data?.error || "Salvage failed",
                "error",
              );
            }
          })
          .catch((err: any) =>
            ctx.addLine(
              err.response?.data?.error || "No derelicts here",
              "error",
            ),
          );
        break;
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
      break;

    case "cantina":
      api
        .getCantina()
        .then(({ data }) => {
          ctx.enqueueScene?.(
            buildCantinaScene(ctx.player?.currentShip?.shipTypeId ?? "scout"),
          );
          ctx.addLine("=== CANTINA ===", "system");
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
          ctx.addLine(
            err.response?.data?.error || "Not at a star mall",
            "error",
          ),
        );
      break;

    case "cantinatalk":
      api
        .talkBartender()
        .then(({ data }) => {
          ctx.addLine("=== BARTENDER ===", "system");
          ctx.addLine(`"${data.dialogue}"`, "info");
          if (data.hasMission && data.mission) {
            const m = data.mission;
            const xpStr = m.rewardXp ? ` + ${m.rewardXp} XP` : "";
            ctx.addLine("", "info");
            ctx.addLine(
              `  Mission: ${m.title} [T${m.tier}] (${m.type})`,
              "trade",
            );
            ctx.addLine(`  ${m.description}`, "info");
            ctx.addLine(
              `  Reward: ${m.rewardCredits.toLocaleString()} cr${xpStr}`,
              "trade",
            );
            ctx.addLine(
              `Use "accept ${m.id.slice(0, 8)}" to take the job`,
              "info",
            );
            ctx.setLastListing([{ id: m.id, label: m.title }]);
          }
        })
        .catch((err: any) =>
          ctx.addLine(
            err.response?.data?.error || "Not at a star mall",
            "error",
          ),
        );
      break;

    case "intel":
      api
        .buyCantineIntel()
        .then(({ data }) => {
          ctx.enqueueScene?.(
            buildCantinaScene(ctx.player?.currentShip?.shipTypeId ?? "scout"),
          );
          ctx.addLine("=== SECTOR INTELLIGENCE ===", "system");
          ctx.addLine("Richest Outposts:", "info");
          for (const o of data.intel.richOutposts) {
            ctx.addLine(
              `  ${o.name} (Sector ${o.sectorId}) - ${Number(o.treasury).toLocaleString()} cr`,
              "trade",
            );
          }
          ctx.addLine("Most Populated Planets:", "info");
          for (const p of data.intel.topPlanets) {
            ctx.addLine(
              `  ${p.name} [${p.planetClass}] (Sector ${p.sectorId}) - ${Number(p.colonists).toLocaleString()} colonists`,
              "info",
            );
          }
          if (data.intel.dangerousSectors.length > 0) {
            ctx.addLine(
              `Dangerous Sectors: ${data.intel.dangerousSectors.join(", ")}`,
              "warning",
            );
          }
          ctx.addLine(
            `Cost: ${data.cost} cr | Credits: ${data.newCredits.toLocaleString()}`,
            "trade",
          );
        })
        .catch((err: any) =>
          ctx.addLine(err.response?.data?.error || "Intel failed", "error"),
        );
      break;

    case "refuel": {
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
          ctx.refreshStatus();
        })
        .catch((err: any) =>
          ctx.addLine(err.response?.data?.error || "Refuel failed", "error"),
        );
      break;
    }

    case "deploy": {
      if (args.length < 1) {
        ctx.addLine(
          "Usage: deploy <item_id> [toll_amount] [buoy_message...]",
          "error",
        );
        break;
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
      break;
    }

    case "combatlog":
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
      break;

    // === MISSIONS ===
    case "missions":
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
              ctx.addLine(
                `=== PENDING CLAIM (${pending.length}) ===`,
                "system",
              );
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
      break;

    case "missionboard":
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
          ctx.addLine(
            err.response?.data?.error || "Not at a star mall",
            "error",
          ),
        );
      break;

    case "claimreward": {
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
            ctx.addLine(
              err.response?.data?.error || "Failed to claim",
              "error",
            );
          }
        })
        .catch((err: any) =>
          ctx.addLine(
            err.response?.data?.error || "Must be at a Star Mall",
            "error",
          ),
        );
      break;
    }

    case "accept": {
      if (args.length < 1) {
        ctx.addLine("Usage: accept <# or keyword>", "error");
        break;
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
            })
            .catch((err: any) =>
              ctx.addLine(
                err.response?.data?.error || "Accept failed",
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
      break;
    }

    case "abandon": {
      if (args.length < 1) {
        ctx.addLine("Usage: abandon <# or keyword>", "error");
        break;
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
              ctx.addLine(
                err.response?.data?.error || "Abandon failed",
                "error",
              ),
            );
        })
        .catch((err: any) =>
          ctx.addLine(err.response?.data?.error || "Failed", "error"),
        );
      break;
    }

    // === RESOURCE EVENTS (Rare Spawns) ===
    case "events": {
      api
        .getResourceEvents()
        .then(({ data }) => {
          const events = data.resourceEvents || [];
          if (events.length === 0) {
            ctx.addLine("No resource events in this sector", "info");
            return;
          }
          ctx.addLine("=== SECTOR RESOURCE EVENTS ===", "system");
          events.forEach((e: any, i: number) => {
            const timeMs = Math.max(
              0,
              new Date(e.expiresAt).getTime() - Date.now(),
            );
            const hours = Math.floor(timeMs / 3600000);
            const mins = Math.floor((timeMs % 3600000) / 60000);
            const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
            if (e.eventType === "asteroid_field") {
              const resources = (e.resources || []).filter(
                (r: any) => !r.harvested,
              );
              const summary = resources
                .map((r: any) => `${r.name} x${r.quantity}`)
                .join(", ");
              ctx.addLine(
                `  [${i + 1}] Asteroid Field — ${e.remainingNodes} nodes remaining (expires in ${timeStr})`,
                "info",
              );
              if (summary) ctx.addLine(`      ${summary}`, "trade");
            } else if (e.eventType === "derelict") {
              const claimed = e.claimedBy ? " (claimed)" : " — unclaimed";
              ctx.addLine(
                `  [${i + 1}] Derelict Ship${claimed} (expires in ${timeStr})`,
                "info",
              );
            } else if (e.eventType === "anomaly") {
              const res = (e.resources || [])[0];
              const desc = res ? `${res.name} x${res.quantity}` : "unknown";
              ctx.addLine(
                `  [${i + 1}] Resource Anomaly — ${desc} (expires in ${timeStr})`,
                "info",
              );
            } else if (e.eventType === "alien_cache") {
              const guardianStatus =
                e.guardianHp > 0
                  ? `Guardian HP: ${e.guardianHp}`
                  : "Guardian DEFEATED";
              ctx.addLine(
                `  [${i + 1}] !! ALIEN CACHE !! — ${guardianStatus} (expires in ${timeStr})`,
                "warning",
              );
            }
          });
          ctx.setLastListing(
            events.map((e: any, i: number) => ({
              id: e.id,
              label: `Event ${i + 1}`,
            })),
          );
        })
        .catch((err: any) =>
          ctx.addLine(
            err.response?.data?.error || "Failed to load events",
            "error",
          ),
        );
      break;
    }

    case "harvest": {
      // harvest [event# or 'all'] [node#]
      const isAll = args[0]?.toLowerCase() === "all";

      if (isAll) {
        // Harvest all available nodes from all events
        api
          .getResourceEvents()
          .then(async ({ data }) => {
            const events = (data.resourceEvents || []).filter(
              (e: any) =>
                (e.eventType === "asteroid_field" ||
                  e.eventType === "anomaly") &&
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
        break;
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
      break;
    }

    case "salvagedeRelict": {
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
      break;
    }

    case "attackguardian": {
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
      break;
    }

    // === SECTOR EVENTS ===
    case "investigate": {
      if (args.length < 1) {
        // Investigate first event in sector
        const evt = ctx.sector?.events?.[0];
        if (!evt) {
          ctx.addLine("No anomalies in this sector", "error");
          break;
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
      break;
    }

    // === LEADERBOARDS ===
    case "leaderboard": {
      const category = args[0] || "";
      if (category) {
        api
          .getLeaderboard(category)
          .then(({ data }) => {
            ctx.addLine(
              `=== LEADERBOARD: ${data.category.toUpperCase()} ===`,
              "system",
            );
            for (const entry of data.entries) {
              ctx.addLine(
                `  #${String(entry.rank).padStart(2)}  ${entry.player_name.padEnd(20)} ${String(entry.score).padStart(10)}`,
                "info",
              );
            }
          })
          .catch((err: any) =>
            ctx.addLine(err.response?.data?.error || "Failed", "error"),
          );
      } else {
        api
          .getLeaderboardOverview()
          .then(({ data }) => {
            ctx.addLine("=== LEADERBOARDS ===", "system");
            for (const [cat, entries] of Object.entries(data.leaderboards) as [
              string,
              any[],
            ][]) {
              ctx.addLine(`--- ${cat.toUpperCase()} ---`, "system");
              for (const e of entries) {
                ctx.addLine(
                  `  #${String(e.rank).padStart(2)}  ${e.player_name.padEnd(20)} ${String(e.score).padStart(10)}`,
                  "info",
                );
              }
            }
            ctx.addLine(
              'Use "leaderboard <category>" for full rankings',
              "info",
            );
            ctx.addLine(
              "Categories: credits, planets, combat, explored, trade, syndicate, level",
              "info",
            );
          })
          .catch((err: any) =>
            ctx.addLine(err.response?.data?.error || "Failed", "error"),
          );
      }
      break;
    }

    // === MAIL ===
    case "mail": {
      const sub = args[0];
      if (sub === "read" && args[1]) {
        api
          .readMessage(args[1])
          .then(({ data }) => {
            ctx.addLine(`=== MESSAGE ===`, "system");
            ctx.addLine(
              `From: ${data.senderName} | To: ${data.recipientName}`,
              "info",
            );
            ctx.addLine(`Subject: ${data.subject}`, "info");
            ctx.addLine(`---`, "system");
            ctx.addLine(data.body, "info");
          })
          .catch((err: any) =>
            ctx.addLine(err.response?.data?.error || "Failed", "error"),
          );
      } else if (sub === "send" && args.length >= 4) {
        const recipient = args[1];
        const subject = args[2];
        const body = args.slice(3).join(" ");
        api
          .sendMessage(recipient, subject, body)
          .then(() => {
            ctx.addLine(`Message sent to ${recipient}`, "success");
          })
          .catch((err: any) =>
            ctx.addLine(err.response?.data?.error || "Send failed", "error"),
          );
      } else if (sub === "delete" && args[1]) {
        api
          .deleteMessage(args[1])
          .then(() => {
            ctx.addLine("Message deleted", "success");
          })
          .catch((err: any) =>
            ctx.addLine(err.response?.data?.error || "Delete failed", "error"),
          );
      } else if (sub === "sent") {
        api
          .getSentMessages()
          .then(({ data }) => {
            if (data.messages.length === 0) {
              ctx.addLine("No sent messages", "info");
              return;
            }
            ctx.addLine("=== SENT MAIL ===", "system");
            for (const m of data.messages) {
              ctx.addLine(
                `  [${m.id.slice(0, 8)}] To: ${m.recipientName} - ${m.subject}`,
                "info",
              );
            }
          })
          .catch((err: any) =>
            ctx.addLine(err.response?.data?.error || "Failed", "error"),
          );
      } else {
        // Default: show inbox
        api
          .getInbox()
          .then(({ data }) => {
            if (data.messages.length === 0) {
              ctx.addLine("Inbox empty", "info");
              return;
            }
            ctx.addLine("=== INBOX ===", "system");
            for (const m of data.messages) {
              const unread = m.read ? "" : " [NEW]";
              ctx.addLine(
                `  [${m.id.slice(0, 8)}] ${m.senderName.padEnd(16)} ${m.subject}${unread}`,
                m.read ? "info" : "warning",
              );
            }
            ctx.addLine(
              'Use "mail read <id>" to read, "mail send <to> <subject> <body>" to send',
              "info",
            );
          })
          .catch((err: any) =>
            ctx.addLine(err.response?.data?.error || "Failed", "error"),
          );
      }
      break;
    }

    // === SHIP UPGRADES ===
    case "upgrades":
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
          ctx.addLine(
            err.response?.data?.error || "Not at a star mall",
            "error",
          ),
        );
      break;

    case "shipupgrades":
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
          ctx.addLine(
            err.response?.data?.error || "Not at a star mall",
            "error",
          ),
        );
      break;

    case "install": {
      if (args.length < 1) {
        ctx.addLine("Usage: install <name or #>", "error");
        break;
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
                buildUpgradeScene(
                  ctx.player?.currentShip?.shipTypeId ?? "scout",
                ),
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
              ctx.addLine(
                err.response?.data?.error || "Install failed",
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
      break;
    }

    case "uninstall": {
      if (args.length < 1) {
        ctx.addLine("Usage: uninstall <name or #>", "error");
        break;
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
          ctx.addLine(
            err.response?.data?.error || "Not at a star mall",
            "error",
          ),
        );
      break;
    }

    // === WARP GATES ===
    case "warp": {
      const sub = args[0];
      if (sub === "build" && args[1]) {
        const destSector = parseInt(args[1]);
        if (isNaN(destSector)) {
          ctx.addLine("Usage: warp build <sector_id>", "error");
          break;
        }
        api
          .buildWarpGate(destSector)
          .then(({ data }) => {
            ctx.addLine(
              `Warp gate built! Sector ${data.sectorA} ↔ Sector ${data.sectorB}`,
              "success",
            );
            ctx.addLine(
              `Credits: ${data.newCredits.toLocaleString()}`,
              "trade",
            );
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
          break;
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
      break;
    }

    // === NOTES ===
    case "note": {
      if (args.length < 1) {
        ctx.addLine(
          "Usage: note <text> — create a note, or: note del <id>",
          "error",
        );
        break;
      }
      if (args[0] === "del" && args[1]) {
        const prefix = args[1].toLowerCase();
        api
          .getNotes()
          .then(({ data }) => {
            const match = data.notes.find((n: any) =>
              n.id.toLowerCase().startsWith(prefix),
            );
            if (!match) {
              ctx.addLine("Note not found", "error");
              return;
            }
            api
              .deleteNote(match.id)
              .then(() => {
                ctx.addLine("Note deleted", "success");
              })
              .catch((err: any) =>
                ctx.addLine(
                  err.response?.data?.error || "Delete failed",
                  "error",
                ),
              );
          })
          .catch((err: any) =>
            ctx.addLine(err.response?.data?.error || "Failed", "error"),
          );
      } else {
        const content = args.join(" ");
        api
          .createNote(content)
          .then(({ data }) => {
            ctx.addLine(`Note saved [${data.id.slice(0, 8)}]`, "success");
          })
          .catch((err: any) =>
            ctx.addLine(
              err.response?.data?.error || "Failed to save note",
              "error",
            ),
          );
      }
      break;
    }

    case "notes": {
      if (args[0] === "search" && args.length > 1) {
        const term = args.slice(1).join(" ");
        api
          .getNotes(term)
          .then(({ data }) => {
            if (data.notes.length === 0) {
              ctx.addLine("No matching notes", "info");
              return;
            }
            ctx.addLine(`=== NOTES (search: ${term}) ===`, "system");
            for (const n of data.notes) {
              ctx.addLine(`  [${n.id.slice(0, 8)}] ${n.content}`, "info");
            }
          })
          .catch((err: any) =>
            ctx.addLine(err.response?.data?.error || "Failed", "error"),
          );
      } else {
        api
          .getNotes()
          .then(({ data }) => {
            if (data.notes.length === 0) {
              ctx.addLine("No notes yet", "info");
              return;
            }
            ctx.addLine("=== NOTES ===", "system");
            for (const n of data.notes) {
              ctx.addLine(`  [${n.id.slice(0, 8)}] ${n.content}`, "info");
            }
          })
          .catch((err: any) =>
            ctx.addLine(err.response?.data?.error || "Failed", "error"),
          );
      }
      break;
    }

    // === NPCs ===
    case "talk": {
      const npcs = (ctx.sector?.npcs ?? []) as any[];
      // If args is a number and we're in active dialogue, treat as choice
      if (args.length === 1 && !isNaN(parseInt(args[0])) && activeNpcId) {
        const choiceIndex = parseInt(args[0]) - 1;
        api
          .talkToNPC(activeNpcId, choiceIndex)
          .then(({ data }) => {
            if (data.isEnd) {
              ctx.addLine(`${data.npcName}: "${data.text}"`, "info");
              ctx.addLine("[Conversation ended]", "system");
              activeNpcId = null;
            } else {
              ctx.addLine(
                `=== ${data.npcName}${data.npcTitle ? ` — ${data.npcTitle}` : ""} ===`,
                "system",
              );
              ctx.addLine(`  "${data.text}"`, "info");
              if (data.options) {
                data.options.forEach((opt: any, i: number) => {
                  const lock = opt.locked
                    ? ` [Requires: ${opt.lockReason}]`
                    : "";
                  ctx.addLine(
                    `  [${i + 1}] ${opt.label}${lock}`,
                    opt.locked ? "warning" : "info",
                  );
                });
              }
              if (data.effects?.reputation) {
                ctx.addLine(
                  `  (Reputation ${data.effects.reputation > 0 ? "+" : ""}${data.effects.reputation})`,
                  "trade",
                );
              }
            }
          })
          .catch((err: any) => {
            ctx.addLine(err.response?.data?.error || "Talk failed", "error");
            activeNpcId = null;
          });
        break;
      }
      // No args + 1 NPC → auto-target
      let targetNpc: any = null;
      if (args.length === 0 && npcs.length === 1) {
        targetNpc = npcs[0];
      } else if (args.length === 0 && npcs.length > 1) {
        ctx.addLine("Multiple NPCs here. Specify who to talk to:", "info");
        npcs.forEach((n: any, i: number) => {
          ctx.addLine(
            `  [${i + 1}] ${n.name}${n.title ? ` — ${n.title}` : ""}${n.encountered ? "" : " [NEW]"}`,
            "info",
          );
        });
        ctx.setLastListing(npcs.map((n: any) => ({ id: n.id, label: n.name })));
        break;
      } else if (args.length === 0 && npcs.length === 0) {
        ctx.addLine("No NPCs in this sector", "error");
        break;
      } else {
        const items = npcs.map((n: any) => ({ id: n.id, name: n.name }));
        const result = resolveItem(args.join(" "), items, ctx);
        if (result === null) {
          ctx.addLine("NPC not found in sector", "error");
          break;
        }
        if (result === "ambiguous") break;
        targetNpc = npcs.find((n: any) => n.id === result.id);
      }
      if (!targetNpc) {
        ctx.addLine("NPC not found", "error");
        break;
      }
      // Check if first encounter — trigger cutscene
      if (!targetNpc.encountered) {
        ctx.enqueueScene?.(
          buildNPCEncounterScene({
            name: targetNpc.name,
            title: targetNpc.title,
            race: targetNpc.race,
            spriteConfig: targetNpc.spriteConfig,
            sceneHint: targetNpc.firstEncounter?.sceneHint,
          }),
        );
        api.markNPCEncountered(targetNpc.id).catch(() => {});
      }
      activeNpcId = targetNpc.id;
      api
        .talkToNPC(targetNpc.id)
        .then(({ data }) => {
          if (data.isEnd) {
            ctx.addLine(`${data.npcName}: "${data.text}"`, "info");
            activeNpcId = null;
          } else {
            ctx.addLine(
              `=== ${data.npcName}${data.npcTitle ? ` — ${data.npcTitle}` : ""} ===`,
              "system",
            );
            ctx.addLine(`  "${data.text}"`, "info");
            if (data.options) {
              data.options.forEach((opt: any, i: number) => {
                const lock = opt.locked ? ` [Requires: ${opt.lockReason}]` : "";
                ctx.addLine(
                  `  [${i + 1}] ${opt.label}${lock}`,
                  opt.locked ? "warning" : "info",
                );
              });
            }
          }
        })
        .catch((err: any) => {
          ctx.addLine(err.response?.data?.error || "Talk failed", "error");
          activeNpcId = null;
        });
      break;
    }

    case "contacts": {
      api
        .getContacts()
        .then(({ data }) => {
          if (data.contacts.length === 0) {
            ctx.addLine("No NPC contacts yet. Explore to find NPCs.", "info");
            return;
          }
          ctx.addLine("=== NPC CONTACTS ===", "system");
          data.contacts.forEach((c: any, i: number) => {
            const factionStr = c.factionName ? ` [${c.factionName}]` : "";
            const repLabel =
              c.reputation < -20
                ? "Hostile"
                : c.reputation < 20
                  ? "Neutral"
                  : c.reputation < 50
                    ? "Friendly"
                    : "Trusted";
            ctx.addLine(
              `  [${i + 1}] ${c.name}${c.title ? ` — ${c.title}` : ""}${factionStr} | Sector ${c.sectorId} | Rep: ${c.reputation} (${repLabel})`,
              "info",
            );
          });
          ctx.setLastListing(
            data.contacts.map((c: any) => ({ id: c.id, label: c.name })),
          );
        })
        .catch((err: any) =>
          ctx.addLine(
            err.response?.data?.error || "Failed to fetch contacts",
            "error",
          ),
        );
      break;
    }

    case "contact": {
      if (args.length < 1) {
        ctx.addLine("Usage: contact <name or #>", "error");
        break;
      }
      const query = args.join(" ");
      api
        .getContacts()
        .then(({ data }) => {
          const items = data.contacts.map((c: any) => ({
            id: c.id,
            name: c.name,
          }));
          const result = resolveItem(query, items, ctx);
          if (result === null) {
            ctx.addLine(
              `No contact matching "${query}". Type "contacts" to see known NPCs.`,
              "error",
            );
            return;
          }
          if (result === "ambiguous") return;
          api
            .getNPCDetail(result.id)
            .then(({ data: detail }) => {
              const repLabel =
                detail.reputation < -20
                  ? "Hostile"
                  : detail.reputation < 20
                    ? "Neutral"
                    : detail.reputation < 50
                      ? "Friendly"
                      : "Trusted";
              ctx.addLine(
                `=== ${detail.name}${detail.title ? ` — ${detail.title}` : ""} ===`,
                "system",
              );
              if (detail.race)
                ctx.addLine(
                  `  Race: ${detail.race.charAt(0).toUpperCase() + detail.race.slice(1)}`,
                  "info",
                );
              if (detail.factionName)
                ctx.addLine(`  Faction: ${detail.factionName}`, "info");
              ctx.addLine(`  Sector: ${detail.sectorId}`, "info");
              ctx.addLine(
                `  Reputation: ${detail.reputation} (${repLabel})`,
                detail.reputation >= 20 ? "success" : "info",
              );
              if (detail.services?.length > 0)
                ctx.addLine(
                  `  Services: ${detail.services.join(", ")}`,
                  "info",
                );
              if (detail.lastVisited)
                ctx.addLine(
                  `  Last visited: ${new Date(detail.lastVisited).toLocaleString()}`,
                  "info",
                );
            })
            .catch((err: any) =>
              ctx.addLine(
                err.response?.data?.error || "Detail failed",
                "error",
              ),
            );
        })
        .catch((err: any) =>
          ctx.addLine(err.response?.data?.error || "Failed", "error"),
        );
      break;
    }

    // === TABLETS ===
    // === CRAFTING ===
    case "resources": {
      if (args.length > 0) {
        // Planet resources: "resources <planet name or #>"
        const pQuery = args.join(" ");
        const planets = (ctx.sector?.planets ?? []).map((p: any) => ({
          id: p.id,
          name: p.name,
        }));
        const result = resolveItem(pQuery, planets, ctx);
        if (result === null) {
          ctx.addLine("Planet not found in sector", "error");
          break;
        }
        if (result === "ambiguous") break;
        api
          .getPlanetCraftingResources(result.id)
          .then(({ data }) => {
            ctx.addLine(
              `=== PLANET: ${data.planetName} (${data.planetClass}-Class, Level ${data.upgradeLevel}) ===`,
              "system",
            );
            if (data.resources.length > 0) {
              ctx.addLine("  Stocks:", "info");
              for (const r of data.resources) {
                ctx.addLine(`    ${r.name} x${r.stock}`, "trade");
              }
            } else {
              ctx.addLine("  No unique resources stockpiled", "info");
            }
            const slots = data.refinerySlots;
            const active = data.refineryQueue.filter((q: any) => !q.collected);
            ctx.addLine(
              `  Refinery Queue (${active.length}/${slots} slots):`,
              "info",
            );
            if (active.length > 0) {
              active.forEach((q: any, i: number) => {
                const status = q.ready
                  ? "READY"
                  : `${Math.ceil((new Date(q.completesAt).getTime() - Date.now()) / 60000)} min remaining`;
                ctx.addLine(
                  `    [${i + 1}] ${q.recipeName} x${q.batchSize} — ${status}`,
                  q.ready ? "success" : "info",
                );
              });
              ctx.setLastListing(
                active.map((q: any) => ({ id: q.id, label: q.recipeName })),
              );
            } else {
              ctx.addLine("    (empty)", "info");
            }
          })
          .catch((err: any) =>
            ctx.addLine(
              err.response?.data?.error || "Failed to load planet resources",
              "error",
            ),
          );
      } else {
        // Personal resource inventory
        api
          .getPlayerResources()
          .then(({ data }) => {
            const resources = data.resources || [];
            if (resources.length === 0) {
              ctx.addLine("=== RESOURCES ===\n  (empty)", "info");
              return;
            }
            ctx.addLine("=== RESOURCES ===", "system");
            const tiers: Record<number, any[]> = {};
            for (const r of resources) {
              if (!tiers[r.tier]) tiers[r.tier] = [];
              tiers[r.tier].push(r);
            }
            const tierNames: Record<number, string> = {
              1: "Raw Materials",
              2: "Processed",
              3: "Refined",
              5: "Ultra-Rare",
            };
            for (const [tier, items] of Object.entries(tiers).sort()) {
              ctx.addLine(
                `  ${tierNames[Number(tier)] || `Tier ${tier}`}:`,
                "info",
              );
              const line = items
                .map((r: any) => `${r.name} x${r.quantity}`)
                .join("    ");
              ctx.addLine(`    ${line}`, "trade");
            }
          })
          .catch((err: any) =>
            ctx.addLine(
              err.response?.data?.error || "Failed to load resources",
              "error",
            ),
          );
      }
      break;
    }

    case "craft": {
      if (args.length < 1) {
        ctx.addLine("Usage: craft <recipe # or name> [batch size]", "error");
        ctx.addLine('  Use "recipes" to see available recipes.', "info");
        break;
      }

      // Check if last arg is a batch number
      let batchSize = 1;
      let recipeQuery: string;
      const lastArg = parseInt(args[args.length - 1]);
      if (!isNaN(lastArg) && args.length > 1 && lastArg >= 1 && lastArg <= 5) {
        batchSize = lastArg;
        recipeQuery = args.slice(0, -1).join(" ");
      } else {
        recipeQuery = args.join(" ");
      }

      // Find planet in sector owned by player
      const ownedInSector = (ctx.sector?.planets ?? []).filter(
        (p: any) => p.ownerId === ctx.player?.id,
      );
      if (ownedInSector.length === 0) {
        ctx.addLine(
          "You need an owned planet in this sector to craft",
          "error",
        );
        break;
      }
      const craftPlanet = ownedInSector[0];

      // Resolve recipe from listing
      const listing = ctx.getLastListing();
      const num = parseInt(recipeQuery);
      let recipeId: string | null = null;

      if (!isNaN(num) && listing && num >= 1 && num <= listing.length) {
        recipeId = listing[num - 1].id;
      } else {
        // Try to find by name from last listing
        if (listing) {
          const q = recipeQuery.toLowerCase();
          const match = listing.find((l) => l.label.toLowerCase().includes(q));
          if (match) {
            recipeId = match.id;
          }
        }
      }

      if (!recipeId) {
        ctx.addLine(
          `No recipe matching "${recipeQuery}". Type "recipes" first.`,
          "error",
        );
        break;
      }

      api
        .startCraft(craftPlanet.id, recipeId, batchSize)
        .then(({ data }) => {
          if (data.queued) {
            const eta = Math.ceil(
              (new Date(data.completesAt).getTime() - Date.now()) / 60000,
            );
            ctx.addLine(
              `Queued: ${data.recipeName} x${data.batchSize} — ready in ${eta} min`,
              "success",
            );
          } else {
            ctx.addLine(
              `Crafted: ${data.recipeName} x${data.batchSize}`,
              "success",
            );
            if (data.output) {
              ctx.addLine(
                `  Output: ${data.output.name || data.output.type} x${data.output.quantity || 1}`,
                "trade",
              );
            }
          }
          if (data.creditsCost > 0)
            ctx.addLine(
              `  Cost: ${data.creditsCost.toLocaleString()} credits`,
              "info",
            );
          if (data.xp?.awarded) ctx.addLine(`  +${data.xp.awarded} XP`, "info");
          ctx.refreshStatus();
        })
        .catch((err: any) =>
          ctx.addLine(err.response?.data?.error || "Craft failed", "error"),
        );
      break;
    }

    case "tablets": {
      api
        .getTablets()
        .then(({ data }) => {
          const total = data.tablets?.length || 0;
          const max = data.storage?.max || 5;
          ctx.addLine(`=== TABLETS (${total}/${max}) ===`, "system");

          // Equipped section
          ctx.addLine("  EQUIPPED:", "info");
          for (let slot = 1; slot <= 3; slot++) {
            const equipped = data.equipped?.find(
              (t: any) => t.equippedSlot === slot,
            );
            const unlocked = data.slots?.unlocked?.includes(slot);
            if (equipped) {
              const effects =
                typeof equipped.effects === "string"
                  ? JSON.parse(equipped.effects)
                  : equipped.effects;
              ctx.addLine(
                `    [Slot ${slot}] ${equipped.name} (${rarityTag(equipped.rarity)}) — ${formatTabletEffects(effects)}`,
                "success",
              );
            } else if (unlocked) {
              ctx.addLine(`    [Slot ${slot}] (empty)`, "info");
            } else {
              const unlockLevel = slot === 1 ? 10 : slot === 2 ? 30 : 60;
              ctx.addLine(
                `    [Slot ${slot}] (locked — unlocks at level ${unlockLevel})`,
                "warning",
              );
            }
          }

          // Inventory section
          const inventory =
            data.tablets?.filter((t: any) => !t.equippedSlot) || [];
          if (inventory.length > 0) {
            ctx.addLine("  INVENTORY:", "info");
            inventory.forEach((t: any, i: number) => {
              const effects =
                typeof t.effects === "string"
                  ? JSON.parse(t.effects)
                  : t.effects;
              ctx.addLine(
                `    [${i + 1}] ${t.name.padEnd(22)} (${rarityTag(t.rarity).padEnd(9)}) — ${formatTabletEffects(effects)}`,
                "info",
              );
            });
            ctx.setLastListing(
              inventory.map((t: any) => ({ id: t.id, label: t.name })),
            );
          } else {
            ctx.addLine("  INVENTORY: (empty)", "info");
          }
          ctx.addLine(
            `  Storage: ${total}/${max} | Use "equip <#> <slot>" at Star Mall`,
            "info",
          );
        })
        .catch((err: any) => {
          ctx.addLine(
            err.response?.data?.error || "Failed to load tablets",
            "error",
          );
        });
      break;
    }

    case "equip": {
      if (args.length < 2) {
        ctx.addLine("Usage: equip <tablet # or name> <slot 1-3>", "error");
        break;
      }
      const slotArg = parseInt(args[args.length - 1]);
      if (isNaN(slotArg) || slotArg < 1 || slotArg > 3) {
        ctx.addLine("Slot must be 1, 2, or 3", "error");
        break;
      }
      const tabletQuery = args.slice(0, -1).join(" ");
      api.getTablets().then(({ data }) => {
        const inventory = (data.tablets || []).filter(
          (t: any) => !t.equippedSlot,
        );
        const items = inventory.map((t: any) => ({ id: t.id, name: t.name }));
        const result = resolveItem(tabletQuery, items, ctx);
        if (result === null) {
          ctx.addLine(`No tablet matching "${tabletQuery}"`, "error");
          return;
        }
        if (result === "ambiguous") return;
        api
          .equipTablet(result.id, slotArg)
          .then(({ data: eqData }) => {
            ctx.addLine(
              `Equipped ${eqData.name} (${rarityTag(eqData.rarity)}) to slot ${eqData.slot}. Cost: ${eqData.cost?.toLocaleString()} cr`,
              "success",
            );
            ctx.addLine(
              `Credits: ${eqData.newCredits?.toLocaleString()}`,
              "info",
            );
            ctx.refreshStatus();
          })
          .catch((err: any) => {
            ctx.addLine(err.response?.data?.error || "Equip failed", "error");
          });
      });
      break;
    }

    case "unequip": {
      if (args.length < 1) {
        ctx.addLine("Usage: unequip <slot 1-3>", "error");
        break;
      }
      const slot = parseInt(args[0]);
      if (isNaN(slot) || slot < 1 || slot > 3) {
        ctx.addLine("Slot must be 1, 2, or 3", "error");
        break;
      }
      api
        .unequipTablet(slot)
        .then(({ data }) => {
          ctx.addLine(
            `Unequipped ${data.name} from slot ${data.slot}`,
            "success",
          );
        })
        .catch((err: any) => {
          ctx.addLine(err.response?.data?.error || "Unequip failed", "error");
        });
      break;
    }

    case "combine": {
      if (args.length < 3) {
        ctx.addLine(
          "Usage: combine <#> <#> <#> — combine 3 same-tier tablets",
          "error",
        );
        break;
      }
      const listing = ctx.getLastListing();
      const ids: string[] = [];
      for (const arg of args.slice(0, 3)) {
        const num = parseInt(arg);
        if (!isNaN(num) && listing && num >= 1 && num <= listing.length) {
          ids.push(listing[num - 1].id);
        } else {
          ctx.addLine(
            `Invalid tablet reference: "${arg}". Use numbers from tablets listing.`,
            "error",
          );
          return;
        }
      }
      api
        .combineTablets(ids)
        .then(({ data }) => {
          const effects =
            typeof data.result.effects === "string"
              ? JSON.parse(data.result.effects)
              : data.result.effects;
          ctx.addLine(
            `Combined 3 tablets into: ${data.result.name} (${rarityTag(data.result.rarity)})!`,
            "success",
          );
          ctx.addLine(`  ${formatTabletEffects(effects)}`, "info");
          ctx.addLine(
            `Cost: ${data.cost?.toLocaleString()} cr | Credits: ${data.newCredits?.toLocaleString()}`,
            "info",
          );
          ctx.refreshStatus();
        })
        .catch((err: any) => {
          ctx.addLine(err.response?.data?.error || "Combine failed", "error");
        });
      break;
    }

    case "recipes": {
      api
        .getRecipes()
        .then(({ data }) => {
          ctx.addLine("=== RECIPES ===", "system");
          const grouped = data.grouped || {};
          const tierNames: Record<number, string> = {
            2: "Tier 2 — Processed (planet level 1+)",
            3: "Tier 3 — Refined (planet level 3+)",
            4: "Tier 4 — Assembly (planet level 5+, instant)",
          };
          let idx = 1;
          const allRecipes: { id: string; label: string }[] = [];
          for (const tier of [2, 3, 4]) {
            const recipes = grouped[tier];
            if (!recipes || recipes.length === 0) continue;
            ctx.addLine(`  ${tierNames[tier]}:`, "info");
            for (const r of recipes) {
              const ingStr = r.ingredients
                .map((i: any) => `${i.quantity} ${i.name}`)
                .join(" + ");
              const outputName = r.name;
              const timeStr =
                r.craftTimeMinutes > 0
                  ? r.craftTimeMinutes >= 60
                    ? `${Math.floor(r.craftTimeMinutes / 60)} hr ${r.craftTimeMinutes % 60 > 0 ? (r.craftTimeMinutes % 60) + " min" : ""}`.trim()
                    : `${r.craftTimeMinutes} min`
                  : "instant";
              const costStr =
                r.creditsCost > 0
                  ? ` (${r.creditsCost.toLocaleString()} cr)`
                  : "";
              ctx.addLine(
                `    [${idx}] ${outputName.padEnd(24)} ${ingStr} → ${outputName} (${timeStr})${costStr}`,
                "info",
              );
              allRecipes.push({ id: r.id, label: r.name });
              idx++;
            }
          }
          ctx.setLastListing(allRecipes);

          // Tablet combine recipes
          ctx.addLine("  TABLET RECIPES:", "info");
          ctx.addLine("    3x Common    → 1x Uncommon    (500 cr)", "info");
          ctx.addLine("    3x Uncommon  → 1x Rare        (1,500 cr)", "info");
          ctx.addLine("    3x Rare      → 1x Epic        (5,000 cr)", "info");
          ctx.addLine("    3x Epic      → 1x Legendary   (15,000 cr)", "info");
          ctx.addLine("    3x Legendary → 1x Mythic      (50,000 cr)", "info");
          ctx.addLine("  Must be at a Star Mall to combine tablets.", "info");
        })
        .catch((err: any) =>
          ctx.addLine(
            err.response?.data?.error || "Failed to load recipes",
            "error",
          ),
        );
      break;
    }

    // === SYNDICATE ECONOMY ===

    case "syndicatepool": {
      api
        .getSyndicatePool()
        .then(({ data }) => {
          ctx.addLine("=== SYNDICATE RESOURCE POOL ===", "system");
          if (data.resources.length === 0) {
            ctx.addLine("  Pool is empty", "info");
          } else {
            for (const r of data.resources) {
              ctx.addLine(`  ${r.name.padEnd(25)} x${r.quantity}`, "trade");
            }
          }
          if (data.permissions.length > 0) {
            ctx.addLine("", "info");
            ctx.addLine("Pool Access:", "system");
            for (const p of data.permissions) {
              ctx.addLine(`  ${p.username.padEnd(20)} ${p.level}`, "info");
            }
          }
        })
        .catch((err: any) =>
          ctx.addLine(
            err.response?.data?.error || "Failed to fetch pool",
            "error",
          ),
        );
      break;
    }

    case "syndicatedeposit": {
      if (args.length < 2) {
        ctx.addLine("Usage: sd <resource> <quantity>", "error");
        break;
      }
      const qty = parseInt(args[args.length - 1]);
      if (isNaN(qty)) {
        ctx.addLine("Quantity must be a number", "error");
        break;
      }
      const resName = args.slice(0, -1).join("_").toLowerCase();
      api
        .depositToPool(resName, qty)
        .then(({ data }) => {
          ctx.addLine(
            `Deposited ${data.deposited} ${data.resourceName} to pool`,
            "success",
          );
          ctx.refreshStatus();
        })
        .catch((err: any) =>
          ctx.addLine(err.response?.data?.error || "Deposit failed", "error"),
        );
      break;
    }

    case "syndicatewithdraw": {
      if (args.length < 2) {
        ctx.addLine("Usage: sw <resource> <quantity>", "error");
        break;
      }
      const qty = parseInt(args[args.length - 1]);
      if (isNaN(qty)) {
        ctx.addLine("Quantity must be a number", "error");
        break;
      }
      const resName = args.slice(0, -1).join("_").toLowerCase();
      api
        .withdrawFromPool(resName, qty)
        .then(({ data }) => {
          ctx.addLine(
            `Withdrew ${data.withdrawn} ${data.resourceName} from pool`,
            "success",
          );
          ctx.refreshStatus();
        })
        .catch((err: any) =>
          ctx.addLine(err.response?.data?.error || "Withdraw failed", "error"),
        );
      break;
    }

    case "syndicate": {
      const sub = (args[0] || "").toLowerCase();

      if (!sub) {
        ctx.addLine("Syndicate economy subcommands:", "system");
        ctx.addLine(
          "  syndicate pool                View pool resources",
          "info",
        );
        ctx.addLine(
          "  syndicate deposit <res> <qty> Deposit to pool (alias: sd)",
          "info",
        );
        ctx.addLine(
          "  syndicate withdraw <res> <qty> Withdraw from pool (alias: sw)",
          "info",
        );
        ctx.addLine(
          "  syndicate pool-access <player> <level>  Set pool permission",
          "info",
        );
        ctx.addLine(
          "  syndicate pool-log            View pool transaction log",
          "info",
        );
        ctx.addLine(
          "  syndicate factory             View factory status",
          "info",
        );
        ctx.addLine(
          "  syndicate factory <planet>    Designate factory planet",
          "info",
        );
        ctx.addLine(
          "  syndicate projects            View active projects",
          "info",
        );
        ctx.addLine(
          "  syndicate start <type> [sector]  Start mega-project",
          "info",
        );
        ctx.addLine(
          "  syndicate contribute <res> <qty> [pool]  Contribute to project",
          "info",
        );
        ctx.addLine(
          "  syndicate project <#>         View project detail",
          "info",
        );
        ctx.addLine(
          "  syndicate structures          View syndicate structures",
          "info",
        );
        break;
      }

      switch (sub) {
        case "pool": {
          api
            .getSyndicatePool()
            .then(({ data }) => {
              ctx.addLine("=== SYNDICATE RESOURCE POOL ===", "system");
              if (data.resources.length === 0) {
                ctx.addLine("  Pool is empty", "info");
              } else {
                for (const r of data.resources) {
                  ctx.addLine(`  ${r.name.padEnd(25)} x${r.quantity}`, "trade");
                }
              }
              if (data.permissions.length > 0) {
                ctx.addLine("", "info");
                ctx.addLine("Pool Access:", "system");
                for (const p of data.permissions) {
                  ctx.addLine(`  ${p.username.padEnd(20)} ${p.level}`, "info");
                }
              }
            })
            .catch((err: any) =>
              ctx.addLine(
                err.response?.data?.error || "Failed to fetch pool",
                "error",
              ),
            );
          break;
        }

        case "deposit": {
          const subArgs = args.slice(1);
          if (subArgs.length < 2) {
            ctx.addLine(
              "Usage: syndicate deposit <resource> <quantity>",
              "error",
            );
            break;
          }
          const qty = parseInt(subArgs[subArgs.length - 1]);
          if (isNaN(qty)) {
            ctx.addLine("Quantity must be a number", "error");
            break;
          }
          const resName = subArgs.slice(0, -1).join("_").toLowerCase();
          api
            .depositToPool(resName, qty)
            .then(({ data }) => {
              ctx.addLine(
                `Deposited ${data.deposited} ${data.resourceName} to pool`,
                "success",
              );
              ctx.refreshStatus();
            })
            .catch((err: any) =>
              ctx.addLine(
                err.response?.data?.error || "Deposit failed",
                "error",
              ),
            );
          break;
        }

        case "withdraw": {
          const subArgs = args.slice(1);
          if (subArgs.length < 2) {
            ctx.addLine(
              "Usage: syndicate withdraw <resource> <quantity>",
              "error",
            );
            break;
          }
          const qty = parseInt(subArgs[subArgs.length - 1]);
          if (isNaN(qty)) {
            ctx.addLine("Quantity must be a number", "error");
            break;
          }
          const resName = subArgs.slice(0, -1).join("_").toLowerCase();
          api
            .withdrawFromPool(resName, qty)
            .then(({ data }) => {
              ctx.addLine(
                `Withdrew ${data.withdrawn} ${data.resourceName} from pool`,
                "success",
              );
              ctx.refreshStatus();
            })
            .catch((err: any) =>
              ctx.addLine(
                err.response?.data?.error || "Withdraw failed",
                "error",
              ),
            );
          break;
        }

        case "pool-access": {
          const subArgs = args.slice(1);
          if (subArgs.length < 2) {
            ctx.addLine(
              "Usage: syndicate pool-access <player_name> <level>",
              "error",
            );
            ctx.addLine("  Levels: none, deposit, full, manager", "info");
            break;
          }
          const playerName = subArgs[0];
          const level = subArgs[1].toLowerCase();
          // Try sector players first, then syndicate members
          const sectorPlayer = ctx.sector?.players?.find(
            (p: any) => p.username.toLowerCase() === playerName.toLowerCase(),
          );
          if (sectorPlayer) {
            api
              .setPoolPermission(sectorPlayer.id, level)
              .then(({ data }) => {
                ctx.addLine(
                  `Set ${data.playerName}'s pool access to: ${data.level}`,
                  "success",
                );
              })
              .catch((err: any) =>
                ctx.addLine(
                  err.response?.data?.error || "Failed to set permission",
                  "error",
                ),
              );
          } else {
            // Look up via syndicate member list
            api
              .getSyndicate()
              .then(({ data }) => {
                const member = data.members?.find(
                  (m: any) =>
                    m.username.toLowerCase() === playerName.toLowerCase(),
                );
                if (!member) {
                  ctx.addLine(
                    `Player "${playerName}" not found in your syndicate`,
                    "error",
                  );
                  return;
                }
                return api.setPoolPermission(
                  member.playerId || member.id,
                  level,
                );
              })
              .then((result: any) => {
                if (result?.data) {
                  ctx.addLine(
                    `Set ${result.data.playerName}'s pool access to: ${result.data.level}`,
                    "success",
                  );
                }
              })
              .catch((err: any) =>
                ctx.addLine(
                  err.response?.data?.error || "Failed to set permission",
                  "error",
                ),
              );
          }
          break;
        }

        case "pool-log": {
          api
            .getPoolLog(20)
            .then(({ data }) => {
              if (data.log.length === 0) {
                ctx.addLine("No pool transactions yet", "info");
                return;
              }
              ctx.addLine("=== POOL TRANSACTION LOG ===", "system");
              for (const entry of data.log) {
                const timeAgo = getTimeAgo(entry.createdAt);
                if (entry.action === "factory_production") {
                  ctx.addLine(
                    `  ${entry.username.padEnd(16)} factory production   +${entry.quantity} total  (${timeAgo})`,
                    "trade",
                  );
                } else {
                  const resLabel = entry.resourceName || "credits";
                  ctx.addLine(
                    `  ${entry.username.padEnd(16)} ${entry.action.padEnd(20)} ${resLabel} x${entry.quantity}  (${timeAgo})`,
                    "info",
                  );
                }
              }
            })
            .catch((err: any) =>
              ctx.addLine(
                err.response?.data?.error || "Failed to fetch log",
                "error",
              ),
            );
          break;
        }

        case "factory": {
          const subArgs = args.slice(1);
          if (subArgs.length > 0) {
            // Designate factory planet
            const planetQuery = subArgs.join(" ");
            const planets = (ctx.sector?.planets ?? []).map((p: any) => ({
              id: p.id,
              name: p.name,
            }));
            const result = resolveItem(planetQuery, planets, ctx);
            if (result === null) {
              ctx.addLine("Planet not found in sector", "error");
              break;
            }
            if (result === "ambiguous") break;
            api
              .designateFactory(result.id)
              .then(({ data }) => {
                ctx.addLine(
                  `Designated ${data.planetName} as syndicate factory!`,
                  "success",
                );
                ctx.addLine(
                  `Cost: ${data.cost.toLocaleString()} credits from treasury`,
                  "trade",
                );
                ctx.refreshSector();
              })
              .catch((err: any) =>
                ctx.addLine(
                  err.response?.data?.error || "Designation failed",
                  "error",
                ),
              );
          } else {
            // View factory status
            api
              .getSyndicateFactory()
              .then(({ data }) => {
                if (!data.hasFactory) {
                  ctx.addLine("No syndicate factory designated", "info");
                  ctx.addLine(
                    'Use "syndicate factory <planet>" to designate one',
                    "info",
                  );
                  return;
                }
                ctx.addLine("=== SYNDICATE FACTORY ===", "system");
                const p = data.planet;
                ctx.addLine(
                  `  ${p.name} [${p.planetClass}] Lv.${p.upgradeLevel}`,
                  "info",
                );
                ctx.addLine(
                  `  Owner: ${p.ownerName} | Colonists: ${p.colonists.toLocaleString()}`,
                  "info",
                );
                ctx.addLine(
                  `  Boosted Production/tick: Cyr=${p.production.cyrillium} Food=${p.production.food} Tech=${p.production.tech}`,
                  "trade",
                );
              })
              .catch((err: any) =>
                ctx.addLine(
                  err.response?.data?.error || "Failed to fetch factory",
                  "error",
                ),
              );
          }
          break;
        }

        case "revoke-factory": {
          api
            .revokeFactory()
            .then(({ data }) => {
              ctx.addLine(
                `Factory designation revoked from ${data.planetName}`,
                "warning",
              );
            })
            .catch((err: any) =>
              ctx.addLine(
                err.response?.data?.error || "Revoke failed",
                "error",
              ),
            );
          break;
        }

        case "projects": {
          api
            .getSyndicateProjects()
            .then(({ data }) => {
              if (data.projects.length === 0) {
                ctx.addLine("No syndicate projects", "info");
                ctx.addLine(
                  'Use "syndicate start <type>" to begin a mega-project',
                  "info",
                );
                return;
              }
              ctx.addLine("=== SYNDICATE PROJECTS ===", "system");
              data.projects.forEach((p: any, i: number) => {
                const statusLabel =
                  p.status === "building"
                    ? "BUILDING"
                    : p.status === "completed"
                      ? "COMPLETE"
                      : `${p.creditsPercent}% cr / ${p.resourcesPercent}% res`;
                ctx.addLine(
                  `  [${i + 1}] ${p.projectName.padEnd(25)} ${statusLabel}`,
                  p.status === "completed" ? "success" : "info",
                );
              });
              ctx.setLastListing(
                data.projects.map((p: any) => ({
                  id: p.id,
                  label: p.projectName,
                })),
              );
            })
            .catch((err: any) =>
              ctx.addLine(
                err.response?.data?.error || "Failed to fetch projects",
                "error",
              ),
            );
          break;
        }

        case "start": {
          const subArgs = args.slice(1);
          if (subArgs.length < 1) {
            // Show available project types
            api
              .getMegaProjectDefinitions()
              .then(({ data }) => {
                ctx.addLine("=== MEGA-PROJECT TYPES ===", "system");
                for (const d of data.definitions) {
                  ctx.addLine(`  ${d.id.padEnd(25)} ${d.name}`, "info");
                  ctx.addLine(
                    `    Cost: ${d.creditsCost.toLocaleString()} cr | Build: ${d.buildTimeHours}h | Min members: ${d.minSyndicateMembers}`,
                    "trade",
                  );
                  for (const req of d.resourceRequirements) {
                    ctx.addLine(
                      `    - ${req.resourceId} x${req.quantity}`,
                      "info",
                    );
                  }
                }
                ctx.addLine("", "info");
                ctx.addLine(
                  "Usage: syndicate start <type_id> [target_sector_id]",
                  "info",
                );
              })
              .catch((err: any) =>
                ctx.addLine(
                  err.response?.data?.error || "Failed to fetch definitions",
                  "error",
                ),
              );
            break;
          }
          const typeId = subArgs[0].toLowerCase();
          const sectorId = subArgs[1] ? parseInt(subArgs[1]) : undefined;
          api
            .startMegaProject(typeId, sectorId)
            .then(({ data }) => {
              ctx.addLine(
                `Started mega-project: ${data.projectName}!`,
                "success",
              );
              ctx.addLine(
                `Credits needed: ${data.creditsCost.toLocaleString()}`,
                "trade",
              );
              ctx.addLine("Resource requirements:", "info");
              for (const req of data.resourceRequirements) {
                ctx.addLine(`  ${req.resourceId} x${req.quantity}`, "info");
              }
              ctx.addLine(
                `Build time: ${data.buildTimeHours} hours (after fully funded)`,
                "info",
              );
            })
            .catch((err: any) =>
              ctx.addLine(
                err.response?.data?.error || "Failed to start project",
                "error",
              ),
            );
          break;
        }

        case "contribute": {
          const subArgs = args.slice(1);
          if (subArgs.length < 2) {
            ctx.addLine(
              "Usage: syndicate contribute <resource|credits> <quantity> [pool]",
              "error",
            );
            ctx.addLine(
              '  Use "credits" as resource to contribute credits',
              "info",
            );
            ctx.addLine(
              '  Add "pool" at end to contribute from syndicate pool',
              "info",
            );
            break;
          }

          // Auto-select project if only one active
          const listing = ctx.getLastListing();
          let projectId: string | null = null;

          if (listing && listing.length > 0) {
            // Use first project from last listing
            projectId = listing[0].id;
          }

          if (!projectId) {
            // Fetch projects to find active one
            api
              .getSyndicateProjects()
              .then(({ data }) => {
                const active = data.projects.filter(
                  (p: any) => p.status === "in_progress",
                );
                if (active.length === 0) {
                  ctx.addLine("No active projects to contribute to", "error");
                  return;
                }
                if (active.length > 1) {
                  ctx.addLine(
                    'Multiple active projects. Use "syndicate projects" first to select one.',
                    "warning",
                  );
                  return;
                }
                doContribute(active[0].id, subArgs);
              })
              .catch((err: any) =>
                ctx.addLine(err.response?.data?.error || "Failed", "error"),
              );
          } else {
            doContribute(projectId, subArgs);
          }

          function doContribute(pId: string, cArgs: string[]) {
            const fromPool = cArgs[cArgs.length - 1]?.toLowerCase() === "pool";
            const effectiveArgs = fromPool ? cArgs.slice(0, -1) : cArgs;
            const qty = parseInt(effectiveArgs[effectiveArgs.length - 1]);
            if (isNaN(qty)) {
              ctx.addLine("Quantity must be a number", "error");
              return;
            }
            const resInput = effectiveArgs.slice(0, -1).join("_").toLowerCase();
            const resourceId = resInput === "credits" ? null : resInput;

            api
              .contributeToProject(pId, resourceId, qty, fromPool)
              .then(({ data }) => {
                const label =
                  data.type === "credits" ? "credits" : data.resourceName;
                ctx.addLine(
                  `Contributed ${data.contributed} ${label} to project`,
                  "success",
                );
              })
              .catch((err: any) =>
                ctx.addLine(
                  err.response?.data?.error || "Contribution failed",
                  "error",
                ),
              );
          }
          break;
        }

        case "project": {
          const subArgs = args.slice(1);
          if (subArgs.length < 1) {
            ctx.addLine(
              "Usage: syndicate project <# from projects list>",
              "error",
            );
            break;
          }
          const num = parseInt(subArgs[0]);
          const listing = ctx.getLastListing();
          if (isNaN(num) || !listing || num < 1 || num > listing.length) {
            ctx.addLine(
              'Use "syndicate projects" first, then "syndicate project <#>"',
              "error",
            );
            break;
          }
          const projectId = listing[num - 1].id;
          api
            .getProjectDetail(projectId)
            .then(({ data }) => {
              ctx.addLine(`=== ${data.projectName} ===`, "system");
              ctx.addLine(
                `Status: ${data.status}`,
                data.status === "completed" ? "success" : "info",
              );
              if (data.description) ctx.addLine(data.description, "info");
              ctx.addLine("", "info");
              ctx.addLine(
                `Credits: ${data.creditsContributed.toLocaleString()} / ${data.creditsRequired.toLocaleString()}`,
                "trade",
              );
              ctx.addLine("Resources:", "info");
              for (const r of data.resourceProgress) {
                const pct =
                  r.required > 0
                    ? Math.floor((r.contributed / r.required) * 100)
                    : 100;
                const bar = `[${"#".repeat(Math.floor(pct / 10))}${".".repeat(10 - Math.floor(pct / 10))}]`;
                ctx.addLine(
                  `  ${r.resourceName.padEnd(22)} ${r.contributed}/${r.required} ${bar} ${pct}%`,
                  r.contributed >= r.required ? "success" : "info",
                );
              }
              if (data.buildProgress) {
                ctx.addLine("", "info");
                ctx.addLine(
                  `Build Progress: ${data.buildProgress.hoursElapsed}h / ${data.buildProgress.hoursTotal}h`,
                  "warning",
                );
                ctx.addLine(
                  `Completes at: ${new Date(data.buildProgress.completesAt).toLocaleString()}`,
                  "info",
                );
              }
              if (data.contributions.length > 0) {
                ctx.addLine("", "info");
                ctx.addLine("Recent Contributions:", "system");
                for (const c of data.contributions.slice(0, 10)) {
                  const label = c.resourceName || "credits";
                  const src = c.source === "pool" ? " (pool)" : "";
                  ctx.addLine(
                    `  ${c.username.padEnd(16)} ${label} x${c.quantity}${src}`,
                    "info",
                  );
                }
              }
            })
            .catch((err: any) =>
              ctx.addLine(
                err.response?.data?.error || "Failed to fetch project",
                "error",
              ),
            );
          break;
        }

        case "cancel": {
          const subArgs = args.slice(1);
          if (subArgs.length < 1) {
            ctx.addLine(
              "Usage: syndicate cancel <# from projects list>",
              "error",
            );
            break;
          }
          const num = parseInt(subArgs[0]);
          const listing = ctx.getLastListing();
          if (isNaN(num) || !listing || num < 1 || num > listing.length) {
            ctx.addLine(
              'Use "syndicate projects" first, then "syndicate cancel <#>"',
              "error",
            );
            break;
          }
          const projectId = listing[num - 1].id;
          api
            .cancelProject(projectId)
            .then(({ data }) => {
              ctx.addLine(
                "Project cancelled. Resources refunded to pool.",
                "warning",
              );
              if (data.refundedCredits > 0) {
                ctx.addLine(
                  `  Credits returned to treasury: ${data.refundedCredits.toLocaleString()}`,
                  "trade",
                );
              }
            })
            .catch((err: any) =>
              ctx.addLine(
                err.response?.data?.error || "Cancel failed",
                "error",
              ),
            );
          break;
        }

        case "structures": {
          api
            .getSyndicateStructures()
            .then(({ data }) => {
              if (data.structures.length === 0) {
                ctx.addLine("No syndicate structures", "info");
                return;
              }
              ctx.addLine("=== SYNDICATE STRUCTURES ===", "system");
              for (const s of data.structures) {
                const loc = s.sectorId ? ` Sector ${s.sectorId}` : "";
                const hp = `HP: ${s.health}/100`;
                const status = s.active ? "ACTIVE" : "INACTIVE";
                ctx.addLine(
                  `  ${(s.name || s.structureType).padEnd(25)} ${hp}  ${status}${loc}`,
                  s.active ? "success" : "warning",
                );
              }
            })
            .catch((err: any) =>
              ctx.addLine(
                err.response?.data?.error || "Failed to fetch structures",
                "error",
              ),
            );
          break;
        }

        default:
          ctx.addLine(
            `Unknown syndicate subcommand: ${sub}. Type "syndicate" for help.`,
            "error",
          );
      }
      break;
    }

    case "tips": {
      ctx.addLine("=== TIPS ===", "system");
      ctx.addLine(
        'Type "help <category>" for commands in a specific area.',
        "info",
      );
      const p = ctx.player;
      const s = ctx.sector;
      if (s?.hasStarMall) {
        ctx.addLine(
          'You\'re at a Star Mall! Try: "upgrades" to see ship improvements, "missionboard" for missions, "store" for items.',
          "success",
        );
      }
      if (p?.currentShip) {
        const total =
          p.currentShip.cyrilliumCargo +
          p.currentShip.foodCargo +
          p.currentShip.techCargo +
          p.currentShip.colonistsCargo;
        if (total > 0) {
          ctx.addLine(
            'You\'re carrying cargo. Find an outpost to "sell" it — buy low, sell high!',
            "trade",
          );
        }
      }
      ctx.addLine(
        'Explore more sectors to find Star Malls, outposts, and planets. Use "map" to see where you\'ve been.',
        "info",
      );
      ctx.addLine(
        'Outposts that BUY goods pay more. Outposts that SELL goods charge less. Check "dock" prices.',
        "trade",
      );
      ctx.addLine(
        'See another player? "fire <name> <energy>" to attack. "flee" to escape.',
        "combat",
      );
      ctx.addLine('Check your mission progress with "missions".', "info");
      break;
    }

    case "help": {
      if (args.length > 0) {
        const query = args[0].toLowerCase();
        // Check if it's a category first
        const categoryLines = getHelpForCategory(query);
        if (categoryLines) {
          categoryLines.forEach((line) => ctx.addLine(line.text, line.type));
        } else {
          // Try as a command
          const cmdLines = getHelpForCommand(query);
          cmdLines.forEach((line) => ctx.addLine(line, "info"));
        }
      } else {
        ctx.addLine("=== COMMAND CATEGORIES ===", "system");
        ctx.addLine(
          "  navigation    Movement & exploration (move, look, scan, map)",
          "info",
        );
        ctx.addLine(
          "  trading       Buying & selling goods (dock, buy, sell)",
          "info",
        );
        ctx.addLine("  combat        Fighting & fleeing (fire, flee)", "info");
        ctx.addLine(
          "  planets       Planet management (land, claim, colonize, collect, upgrade)",
          "info",
        );
        ctx.addLine(
          "  ships         Ships & garage (dealer, buyship, cloak, eject, garage, storeship, retrieve, salvage)",
          "info",
        );
        ctx.addLine(
          "  upgrades      Ship upgrades (upgrades, shipupgrades, install, uninstall)",
          "info",
        );
        ctx.addLine(
          "  store         Store & items (mall, store, purchase, inventory, use, refuel)",
          "info",
        );
        ctx.addLine("  deploy        Deployables (deploy)", "info");
        ctx.addLine(
          "  missions      Missions (missions, missionboard, accept, abandon, claimreward, cantinatalk)",
          "info",
        );
        ctx.addLine(
          "  social        Social features (chat, bounties, leaderboard)",
          "info",
        );
        ctx.addLine(
          "  mail          Messaging (mail read/send/delete/sent)",
          "info",
        );
        ctx.addLine("  notes         Notes (note, notes)", "info");
        ctx.addLine(
          "  warp          Warp gates (warp use/build/toll/list)",
          "info",
        );
        ctx.addLine(
          "  progression   Leveling & achievements (profile, achievements, ranks)",
          "info",
        );
        ctx.addLine(
          "  npcs          NPC interactions (talk, contacts, contact)",
          "info",
        );
        ctx.addLine(
          "  crafting      Resources & crafting (resources, recipes, craft, collect resources)",
          "info",
        );
        ctx.addLine(
          "  tablets       Tablets & equip slots (tablets, equip, unequip, combine)",
          "info",
        );
        ctx.addLine(
          "  exploration   Rare spawns & exploration (events, harvest, salvage, attackguardian)",
          "info",
        );
        ctx.addLine(
          "  syndicateeco  Syndicate economy (pool, factory, projects, structures)",
          "info",
        );
        ctx.addLine("  events        Events (investigate)", "info");
        ctx.addLine("", "info");
        ctx.addLine(
          'Type "help <category>" for commands or "help <command>" for details.',
          "info",
        );
        ctx.addLine('Type "tips" for contextual guidance.', "info");
      }
      break;
    }

    case "clear":
      ctx.clearLines();
      break;

    default:
      ctx.addLine(
        `Unknown command: ${command}. Type "help" for commands.`,
        "error",
      );
  }
}

function getHelpForCategory(
  category: string,
): { text: string; type: "info" | "system" }[] | null {
  const categories: Record<string, { title: string; commands: string[] }> = {
    navigation: {
      title: "NAVIGATION",
      commands: [
        "move <sector>    (m)   Move to an adjacent sector",
        "look             (l)   View current sector contents",
        "scan             (s)   Scan adjacent sectors",
        "map                    View your explored map",
        "status           (st)  View your pilot status",
      ],
    },
    trading: {
      title: "TRADING",
      commands: [
        "dock             (d)   Dock at outpost and view prices",
        "undock           (ud)  Undock from outpost",
        "buy <item> <qty>       Buy commodity (must be docked)",
        "sell <item> <qty>      Sell commodity (must be docked)",
      ],
    },
    combat: {
      title: "COMBAT",
      commands: [
        "fire <name> <nrg> (f)  Attack a player in your sector",
        "flee                    Attempt to escape combat",
        "combatlog               View combat history",
      ],
    },
    planets: {
      title: "PLANETS",
      commands: [
        "planets [all]            List owned (or all discovered) planets",
        "land <name or #>       View planet details",
        "claim <name or #>      Claim an unclaimed planet",
        "colonize <name or #> <qty> Deposit colonists on planet",
        "collect <name or #> <qty>  Collect colonists from seed planet",
        "upgrade <name or #>    Upgrade your planet",
      ],
    },
    ships: {
      title: "SHIPS & GARAGE",
      commands: [
        "dealer           (ships) View ship dealer",
        "buyship <type>          Purchase a new ship",
        "cloak                   Toggle cloaking device",
        "eject <item> <qty>      Jettison cargo",
        "garage                  View stored ships",
        "storeship               Store current ship in garage",
        "retrieve <name or #>    Retrieve ship from garage",
        "salvage [name or #]     Salvage yard / sell a ship",
      ],
    },
    upgrades: {
      title: "SHIP UPGRADES",
      commands: [
        "upgrades                View available upgrades",
        "shipupgrades            View installed upgrades",
        "install <name or #>     Install an upgrade",
        "uninstall <name or #>   Remove an upgrade",
      ],
    },
    store: {
      title: "STORE & ITEMS",
      commands: [
        "mall                    Star Mall overview",
        "store                   Browse the general store",
        "purchase <name or #>    Buy a store item",
        "inventory               View your items",
        "use <name or #> [args]  Use a consumable item",
        "refuel [qty]    (fuel)  Buy energy (10 cr/unit)",
      ],
    },
    deploy: {
      title: "DEPLOYABLES",
      commands: ["deploy <item> [args]    Deploy mine, drone, or buoy"],
    },
    missions: {
      title: "MISSIONS",
      commands: [
        "missions [completed]    View active or completed missions",
        "missionboard    (mb)    Browse available missions (tiered)",
        "accept <# or keyword>   Accept a mission",
        "abandon <# or keyword>  Abandon a mission",
        "claimreward [#] (cr)    Claim completed mission rewards at Star Mall",
        "cantinatalk     (ct)    Talk to bartender for cantina missions",
      ],
    },
    social: {
      title: "SOCIAL",
      commands: [
        "chat <msg>      (say)  Send sector chat message",
        "bounties                View active bounties",
        "leaderboard [cat] (lb) View rankings",
      ],
    },
    mail: {
      title: "MAIL",
      commands: [
        "mail                    View inbox",
        "mail read <id>          Read a message",
        "mail send <to> <subj> <body>  Send a message",
        "mail delete <id>        Delete a message",
        "mail sent               View sent messages",
      ],
    },
    notes: {
      title: "NOTES",
      commands: [
        "note <text>      (n)   Save a note",
        "notes                   List all notes",
        "notes search <term>     Search notes",
        "note del <id>           Delete a note",
      ],
    },
    warp: {
      title: "WARP GATES",
      commands: [
        "warp [gate_id]          Use a warp gate",
        "warp build <sector>     Build a warp gate",
        "warp toll <gate> <amt>  Set gate toll",
        "warp list               View syndicate gates",
      ],
    },
    progression: {
      title: "PROGRESSION",
      commands: [
        "profile    (p, rank, lvl)  View your level, XP, rank, and bonuses",
        "achievements       (ach)   View earned & available achievements",
        "ranks                      View rank tiers and ship level gates",
      ],
    },
    npcs: {
      title: "NPCs",
      commands: [
        "talk [name or #]  (t)  Talk to an NPC in your sector",
        "talk <choice #>        Select a dialogue option",
        "contacts         (con) View your NPC contact journal",
        "contact <name or #>   View detailed NPC info",
      ],
    },
    crafting: {
      title: "CRAFTING",
      commands: [
        "resources       (res) View personal resource inventory",
        "resources <planet>    View planet resources & refinery queue",
        "recipes         (rec) Show all crafting + tablet recipes",
        "craft <# or name> [batch]  Craft a recipe at owned planet",
        "collect resources <planet>  Collect all resources from planet",
        "collect refinery <#>   Collect completed refinery batch",
        "collect all <planet>   Collect resources + refinery batches",
      ],
    },
    tablets: {
      title: "TABLETS",
      commands: [
        "tablets              View your tablets & equipped slots",
        "equip <#> <slot>     Equip tablet to slot 1-3 (Star Mall)",
        "unequip <slot>       Unequip tablet from slot (Star Mall)",
        "combine <#> <#> <#>  Combine 3 same-tier tablets (Star Mall)",
        "recipes              Also shows tablet combination recipes",
      ],
    },
    exploration: {
      title: "EXPLORATION",
      commands: [
        "events                  View resource events in current sector",
        "harvest [event#] [node#] (mine) Harvest a node from asteroid/anomaly",
        "harvest all             Harvest all available nodes",
        "salvage [event#]        Salvage a derelict ship (or ship salvage at Star Mall)",
        "attackguardian [event#] Attack an alien cache guardian",
      ],
    },
    syndicateeco: {
      title: "SYNDICATE ECONOMY",
      commands: [
        "syndicate pool                View pool resources & access",
        "syndicate deposit <res> <qty> (sd) Deposit resource to pool",
        "syndicate withdraw <res> <qty> (sw) Withdraw from pool",
        "syndicate pool-access <player> <level>  Set pool permission",
        "syndicate pool-log            Recent pool transactions",
        "syndicate factory             View factory status",
        "syndicate factory <planet>    Designate factory planet",
        "syndicate revoke-factory      Revoke factory designation",
        "syndicate projects            View active mega-projects",
        "syndicate start [type]        Start a mega-project",
        "syndicate contribute <res> <qty> [pool]  Contribute to project",
        "syndicate project <#>         Detailed project breakdown",
        "syndicate cancel <#>          Cancel a project (leader)",
        "syndicate structures          View syndicate structures",
      ],
    },
    events: {
      title: "EVENTS",
      commands: ["investigate [id]        Investigate a sector anomaly"],
    },
  };

  const cat = categories[category];
  if (!cat) return null;

  const lines: { text: string; type: "info" | "system" }[] = [];
  lines.push({ text: `=== ${cat.title} ===`, type: "system" });
  for (const cmd of cat.commands) {
    lines.push({ text: `  ${cmd}`, type: "info" });
  }
  return lines;
}

function getHelpForCommand(cmd: string): string[] {
  const help: Record<string, string[]> = {
    move: [
      "move <sector_id>",
      "  Move your ship to an adjacent sector. Costs 1 energy.",
      "  Aliases: m",
    ],
    look: [
      "look",
      "  Display contents of your current sector including players, outposts, planets, and anomalies.",
      "  Aliases: l",
    ],
    scan: [
      "scan",
      "  Scan adjacent sectors for planets and players.",
      "  Requires a ship with a planetary scanner.",
      "  Aliases: s",
    ],
    status: [
      "status",
      "  View your pilot status: energy, credits, ship stats, and cargo.",
      "  Aliases: st",
    ],
    map: [
      "map",
      "  View your explored star chart including discovered Star Malls, outposts, and planets.",
    ],
    dock: [
      "dock",
      "  Dock at the outpost in your current sector. Required before buying/selling.",
      "  Aliases: d",
    ],
    undock: ["undock", "  Undock from the current outpost.", "  Aliases: ud"],
    buy: [
      "buy <commodity> <quantity>",
      "  Buy a commodity from the outpost. Must be docked first.",
      "  Commodities: cyrillium, food, tech",
      "  Costs 1 energy.",
    ],
    sell: [
      "sell <commodity> <quantity>",
      "  Sell a commodity to the outpost. Must be docked first.",
      "  Costs 1 energy.",
    ],
    fire: [
      "fire <player_name> <energy>",
      "  Fire weapons at a player in your sector.",
      "  Damage scales with energy spent.",
      "  Aliases: f, attack",
    ],
    flee: [
      "flee",
      "  Attempt to escape when under attack.",
      "  Success chance depends on number of attackers.",
    ],
    planets: [
      "planets [all|discovered]",
      '  List your owned planets, or use "planets all" to see all discovered planets.',
    ],
    land: [
      "land <name or #>",
      "  View details of a planet in your sector: class, colonists, stocks, and production.",
      "  Accepts planet name, partial match, or # from look listing.",
    ],
    claim: [
      "claim <name or #>",
      "  Claim an unclaimed planet in your sector as your own.",
      "  Accepts planet name, partial match, or # from look listing.",
    ],
    colonize: [
      "colonize <name or #> <quantity>",
      "  Deposit colonists from your ship onto a planet you own.",
      "  Accepts planet name, partial match, or # from look listing.",
    ],
    collect: [
      "collect <name or #> <quantity> | collect resources <planet> | collect refinery <#> | collect all <planet>",
      "  Collect colonists from seed planet, or collect resources/refinery batches.",
      '  "collect resources <planet>" — gather all raw + unique resources from planet',
      '  "collect refinery <#>" — collect a completed refinery batch',
      '  "collect all <planet>" — collect everything from a planet',
    ],
    upgrade: [
      "upgrade <name or #>",
      "  Upgrade a planet you own to the next level (requires resources).",
      "  Accepts planet name, partial match, or # from look listing.",
    ],
    dealer: [
      "dealer",
      "  View ships available for purchase at a Star Mall.",
      "  Aliases: ships",
    ],
    buyship: ["buyship <ship_type>", "  Purchase a new ship at a Star Mall."],
    cloak: ["cloak", "  Toggle your cloaking device on or off."],
    eject: [
      "eject <commodity> <quantity>",
      "  Jettison cargo from your ship into space.",
      "  Aliases: jettison",
    ],
    chat: [
      "chat <message>",
      "  Send a message to all players in your sector.",
      "  Aliases: say",
    ],
    bounties: ["bounties", "  View all active bounties on players."],
    profile: [
      "profile",
      "  View your level, XP progress, rank, and level bonuses.",
      "  Aliases: p, rank, lvl",
    ],
    achievements: [
      "achievements",
      "  View earned and available achievements.",
      "  Aliases: ach",
    ],
    ranks: [
      "ranks",
      "  View all rank tiers (levels 1-100) and ship level gates.",
    ],
    leaderboard: [
      "leaderboard [category]",
      "  View rankings.",
      "  Categories: credits, planets, combat, explored, trade, syndicate, level",
      "  Aliases: lb, top",
    ],
    mall: [
      "mall",
      "  View Star Mall services overview (requires Star Mall sector).",
    ],
    store: [
      "store",
      "  Browse items in the general store (requires Star Mall).",
    ],
    purchase: [
      "purchase <name or #>",
      "  Buy an item from the general store.",
      "  Accepts item name, partial match, or # from last listing.",
    ],
    inventory: ["inventory", "  View items in your inventory."],
    use: [
      "use <name or #> [args]",
      "  Use a consumable item from your inventory.",
      "  Accepts item name, partial match, or # from last listing.",
    ],
    refuel: [
      "refuel [quantity]",
      "  Buy energy at a Star Mall (10 credits per unit, max 200).",
      "  Aliases: fuel",
    ],
    deploy: [
      "deploy <item_id> [toll_amount] [buoy_message]",
      "  Deploy a mine, drone, or buoy in your sector.",
    ],
    missions: [
      "missions [completed]",
      '  View active missions with per-objective detail, or "missions completed" for history.',
    ],
    missionboard: [
      "missionboard",
      "  Browse tiered missions at a Star Mall. Shows locked tiers and prerequisites.",
      "  Aliases: mb",
    ],
    accept: [
      "accept <# or keyword>",
      "  Accept a mission from the mission board.",
      "  Accepts mission title keyword or # from last listing.",
    ],
    abandon: [
      "abandon <# or keyword>",
      "  Abandon an active mission.",
      "  Accepts mission title keyword or # from last listing.",
    ],
    claimreward: [
      "claimreward [#]",
      "  Claim rewards for completed missions at a Star Mall.",
      "  If one claimable: auto-claims. If multiple: shows list for selection.",
      "  Aliases: cr",
    ],
    cantinatalk: [
      "cantinatalk",
      "  Talk to the cantina bartender for exclusive underworld missions.",
      '  Requires completing "The Bartender\'s Trust" mission first.',
      "  Aliases: ct",
    ],
    investigate: [
      "investigate [event_id]",
      "  Investigate a sector anomaly. Costs 1 energy.",
    ],
    mail: [
      "mail [read|send|delete|sent]",
      "  View inbox, or use subcommands:",
      "  mail read <id> — Read a message",
      "  mail send <to> <subject> <body> — Send a message",
      "  mail delete <id> — Delete a message",
      "  mail sent — View sent messages",
    ],
    note: [
      "note <text>",
      '  Save a quick note. Use "note del <id>" to delete.',
      "  Aliases: n",
    ],
    notes: [
      "notes [search <term>]",
      '  List all notes, or search with "notes search <term>".',
    ],
    upgrades: ["upgrades", "  View available ship upgrades at a Star Mall."],
    shipupgrades: [
      "shipupgrades",
      "  View upgrades installed on your current ship.",
    ],
    install: [
      "install <name or #>",
      "  Install a ship upgrade.",
      "  Accepts upgrade name, partial match, or # from last listing.",
    ],
    uninstall: [
      "uninstall <name or #>",
      "  Remove an upgrade from your ship (at a Star Mall).",
      "  Accepts upgrade name, partial match, or # from last listing.",
    ],
    warp: [
      "warp [gate_id|build|toll|list]",
      "  Use a warp gate, or manage gates:",
      "  warp build <sector> — Build a warp gate",
      "  warp toll <gate> <amount> — Set gate toll",
      "  warp list — View syndicate gates",
    ],
    garage: ["garage", "  View ships stored in your garage (Star Mall)."],
    storeship: [
      "storeship",
      "  Store your current ship in the garage (Star Mall).",
    ],
    retrieve: [
      "retrieve <name or #>",
      "  Retrieve a ship from your garage.",
      "  Accepts ship name, partial match, or # from last listing.",
    ],
    salvage: [
      "salvage [name or #]",
      "  View salvage options or sell a ship for credits.",
      "  Accepts ship name, partial match, or # from last listing.",
    ],
    combatlog: ["combatlog", "  View your recent combat history."],
    talk: [
      "talk [name or #]",
      "  Talk to an NPC in your sector. If only one NPC, auto-targets them.",
      '  During dialogue, use "talk <#>" to select an option.',
      "  Aliases: t",
    ],
    contacts: [
      "contacts",
      "  View all NPCs you have encountered, with faction, sector, and reputation.",
      "  Aliases: con",
    ],
    contact: [
      "contact <name or #>",
      "  View detailed information about a specific NPC contact.",
      "  Accepts NPC name, partial match, or # from contacts listing.",
    ],
    tablets: [
      "tablets",
      "  View all tablets you own, equipped slots, and storage capacity.",
    ],
    equip: [
      "equip <tablet # or name> <slot 1-3>",
      "  Equip a tablet to a slot. Must be at a Star Mall. Costs credits based on rarity.",
      '  Examples: equip 1 1, equip "Iron Focus" 2',
    ],
    unequip: [
      "unequip <slot 1-3>",
      "  Remove a tablet from an equip slot. Must be at a Star Mall.",
      "  Examples: unequip 1, unequip 3",
    ],
    combine: [
      "combine <#> <#> <#>",
      "  Combine 3 tablets of the same tier into 1 of the next tier. Must be at a Star Mall.",
      "  Example: combine 1 2 3",
    ],
    resources: [
      "resources [planet]",
      "  View your personal resource inventory, or a specific planet's resources + refinery queue.",
      "  Aliases: res",
    ],
    craft: [
      "craft <recipe # or name> [batch size]",
      "  Craft a recipe at an owned planet in your sector.",
      '  Use "recipes" to see available recipes and their numbers.',
      "  Batch size 1-5, default 1. Timed recipes queue in the refinery.",
    ],
    recipes: [
      "recipes",
      "  Show all crafting recipes (Tier 2-4) and tablet combination recipes.",
      "  Aliases: rec",
    ],
    tips: [
      "tips",
      "  Show contextual tips and guidance based on your current situation.",
    ],
    events: [
      "events",
      "  View all active resource events in your current sector.",
      "  Shows asteroid fields, derelict ships, resource anomalies, and alien caches.",
    ],
    harvest: [
      "harvest [event# or all] [node#]",
      "  Harvest a resource node from an asteroid field or anomaly.",
      "  No args: harvest first available node from first event.",
      "  harvest 1 3: harvest node 3 from event 1.",
      "  harvest all: harvest all available nodes.",
      "  Costs 1 energy per harvest.",
      "  Aliases: mine",
    ],
    attackguardian: [
      "attackguardian [event#]",
      "  Attack an alien cache guardian. Costs 2 energy.",
      "  Deals damage based on your ship weapons. Guardian fights back.",
      "  When guardian is defeated, loot is auto-claimed (ultra-rare resources).",
    ],
    syndicate: [
      "syndicate <subcommand>",
      "  Manage syndicate economy: pool, factory, projects, structures.",
      '  Type "syndicate" with no args for full subcommand list.',
      "  Aliases: sp (pool), sd (deposit), sw (withdraw)",
    ],
  };
  return (
    help[cmd] || [
      `No detailed help for "${cmd}". Try "help" to see categories.`,
    ]
  );
}
