export type PanelId =
  | "nav"
  | "aria"
  | "explore"
  | "trade"
  | "combat"
  | "crew"
  | "missions"
  | "planets"
  | "gear"
  | "inventory"
  | "comms"
  | "syndicate"
  | "wallet"
  | "actions"
  | "intel"
  | "trade-history"
  | "notes"
  | "codex"
  | "profile";

export interface PanelDef {
  id: PanelId;
  label: string;
  spriteKey: string;
  hotkey: string;
}

export const PANELS: PanelDef[] = [
  // You
  { id: "profile", label: "PILOT", spriteKey: "icon_profile", hotkey: "P" },
  { id: "nav", label: "HELM", spriteKey: "icon_nav", hotkey: "H" },
  // Action
  { id: "combat", label: "COMBAT", spriteKey: "icon_combat", hotkey: "C" },
  { id: "explore", label: "SCANNER", spriteKey: "icon_explore", hotkey: "S" },
  {
    id: "missions",
    label: "MISSIONS",
    spriteKey: "icon_missions",
    hotkey: "I",
  },
  // Social
  { id: "crew", label: "CONTACTS", spriteKey: "icon_crew", hotkey: "O" },
  { id: "comms", label: "COMMS", spriteKey: "icon_comms", hotkey: "K" },
  {
    id: "syndicate",
    label: "SYNDICATE",
    spriteKey: "icon_syndicate",
    hotkey: "Y",
  },
  // Ship & Economy
  { id: "gear", label: "LOADOUT", spriteKey: "icon_gear", hotkey: "G" },
  { id: "inventory", label: "CARGO", spriteKey: "icon_inventory", hotkey: "A" },
  { id: "trade", label: "MARKET", spriteKey: "icon_trade", hotkey: "M" },
  { id: "planets", label: "PLANETS", spriteKey: "icon_planets", hotkey: "L" },
  { id: "wallet", label: "WALLET", spriteKey: "icon_wallet", hotkey: "W" },
  // Reference
  { id: "actions", label: "DATABANK", spriteKey: "icon_actions", hotkey: "D" },
  { id: "intel", label: "INTEL", spriteKey: "icon_intel", hotkey: "T" },
  { id: "codex", label: "CODEX", spriteKey: "icon_codex", hotkey: "X" },
  { id: "notes", label: "NOTES", spriteKey: "icon_notes", hotkey: "N" },
  {
    id: "trade-history",
    label: "LEDGER",
    spriteKey: "icon_trade_history",
    hotkey: "J",
  },
];
