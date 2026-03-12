import type { SceneDefinition } from "../../config/scene-types";

/** Context object passed to every command handler, providing access to game state and actions. */
export interface CommandContext {
  addLine: (
    text: string,
    type:
      | "info"
      | "success"
      | "error"
      | "warning"
      | "system"
      | "combat"
      | "trade"
      | "npc"
      | "ai",
  ) => void;
  clearLines: () => void;
  player: any;
  sector: any;
  doMove: (sectorId: number) => void;
  doWarpTo?: (sectorId: number, confirmed?: boolean) => void;
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

/** A command handler receives parsed args and the command context. */
export type CommandHandler = (args: string[], ctx: CommandContext) => void;

export interface ParsedCommand {
  command: string;
  args: string[];
}
