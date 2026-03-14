/**
 * Command registry — merges all domain command modules into a single lookup map
 * and provides the main handleCommand() entry point.
 */
import type { CommandContext, CommandHandler } from "./types";
import { parse, isSPBlocked } from "./utils";
import { navigationCommands } from "./navigation";
import { scanningCommands } from "./scanning";
import { combatCommands } from "./combat";
import { resourcesCommands } from "./resources";
import { craftingCommands } from "./crafting";
import { tradingCommands } from "./trading";
import { missionsCommands } from "./missions";
import { socialCommands } from "./social";
import { servicesCommands } from "./services";
import { syndicateCommands } from "./syndicate";
import { dataCommands } from "./data";
import { specialCommands } from "./special";

/** Shorthand aliases map to canonical command names. */
export const ALIASES: Record<string, string> = {
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
  b: "bombard",
  fort: "fortify",
  def: "defenses",
};

/**
 * Module-level mutable state for NPC conversation tracking.
 * Shared between 'talk' and 'cantinatalk' commands across the social module.
 */
let activeNpcId: string | null = null;

export function getActiveNpcId(): string | null {
  return activeNpcId;
}

export function setActiveNpcId(id: string | null): void {
  activeNpcId = id;
}

/** Master command map — all domain modules merged into a single lookup. */
const allCommands: Record<string, CommandHandler> = {
  ...navigationCommands,
  ...scanningCommands,
  ...combatCommands,
  ...resourcesCommands,
  ...craftingCommands,
  ...tradingCommands,
  ...missionsCommands,
  ...socialCommands,
  ...servicesCommands,
  ...syndicateCommands,
  ...dataCommands,
  ...specialCommands,
};

/** Main entry point — parse input, check SP restrictions, dispatch to handler. */
export function handleCommand(input: string, ctx: CommandContext): void {
  const { command, args } = parse(input);

  if (isSPBlocked(command, ctx)) return;

  const handler = allCommands[command];
  if (handler) {
    handler(args, ctx);
  } else {
    ctx.addLine(
      `Unknown command: ${command}. Type "help" for commands.`,
      "error",
    );
  }
}
