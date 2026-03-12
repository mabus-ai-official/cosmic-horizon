import type { CommandContext, ParsedCommand } from "./types";
import { ALIASES } from "./registry";

/** Resolve a user query (name, partial match, or numeric index) against a list of items. */
export function resolveItem(
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

/** Format tablet stat effects into a compact display string. */
export function formatTabletEffects(effects: any): string {
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

/** Convert a rarity string to its display label. */
export function rarityTag(rarity: string): string {
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

/** Convert a date string to a human-readable relative time. */
export function getTimeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Parse raw terminal input into a command and args, resolving aliases. */
export function parse(input: string): ParsedCommand {
  const parts = input.trim().split(/\s+/);
  const raw = parts[0].toLowerCase();
  return {
    command: ALIASES[raw] || raw,
    args: parts.slice(1),
  };
}

/** Check if a command is blocked in single-player mode. Returns true if blocked. */
export function isSPBlocked(command: string, ctx: CommandContext): boolean {
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
