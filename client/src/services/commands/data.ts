/**
 * Data and utility commands — help, status, settings, changelog, radio, leaderboard.
 * Provides informational displays and player settings that don't affect
 * game state. Also houses the help system and command reference.
 */
import * as api from "../api";
import type { CommandHandler } from "./types";
import { resolveItem } from "./utils";
import { buildCantinaScene } from "../../config/scenes/cantina-scene";

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
        "bombard <#> <nrg> (b)  Bombard an enemy planet",
        "defenses <#>     (def) Scan a planet's defenses",
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
        "fortify <#> <type> <amt> Fortify planet defenses (shield/cannon/drone)",
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
    bombard: [
      "bombard <planet#> <energy>",
      "  Bombard an enemy planet from orbit. Costs 3 AP.",
      "  Damage hits shield -> cannon -> drones. Cannons fire back!",
      "  When all defenses are destroyed, you conquer the planet.",
      "  Aliases: b",
    ],
    fortify: [
      "fortify <planet#> <shield|cannon|drone> <amount>",
      "  Add defenses to your planet. Costs credits + tech stock.",
      "  Shield: 50cr + 1 tech each. Cannon: 75cr + 1 tech. Drone: 100cr + 2 tech.",
      "  Aliases: fort",
    ],
    defenses: [
      "defenses <planet#>",
      "  Scan a planet's defenses in your sector.",
      "  Shows shield, cannon, and drone status.",
      "  Aliases: def",
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

export const dataCommands: Record<string, CommandHandler> = {
  note: (args, ctx) => {
    if (args.length < 1) {
      ctx.addLine(
        "Usage: note <text> — create a note, or: note del <id>",
        "error",
      );
      return;
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
  },

  notes: (args, ctx) => {
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
  },

  events: (_args, ctx) => {
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
  },

  intel: (_args, ctx) => {
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
        if (data.message) ctx.addLine(data.message, "npc");
      })
      .catch((err: any) =>
        ctx.addLine(err.response?.data?.error || "Intel failed", "error"),
      );
  },

  resources: (args, ctx) => {
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
        return;
      }
      if (result === "ambiguous") return;
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
  },

  help: (args, ctx) => {
    ctx.advanceTutorial("help");
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
      ctx.addLine(
        "  ai              Ask ARIA, your ship AI (ask <question>)",
        "info",
      );
      ctx.addLine("", "info");
      ctx.addLine('Type "tips" for contextual guidance.', "info");
    }
  },

  tips: (_args, ctx) => {
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
  },
};
