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
  | "trade-routes"
  | "trade-offers"
  | "notes"
  | "codex"
  | "profile";

export type GroupId =
  | "pilot"
  | "helm"
  | "ship"
  | "commerce"
  | "social"
  | "database";

export interface PanelDef {
  id: PanelId;
  label: string;
  spriteKey: string;
  hotkey: string;
}

export interface PanelGroupDef {
  id: GroupId;
  label: string;
  description: string;
  spriteKey: string;
  hotkey: string;
  accentColor: string;
  tabs: { id: PanelId; label: string }[];
}

export const PANEL_GROUPS: PanelGroupDef[] = [
  {
    id: "pilot",
    label: "PILOT",
    description: "Identity & finances",
    spriteKey: "icon_profile",
    hotkey: "P",
    accentColor: "var(--magenta)",
    tabs: [
      { id: "profile", label: "Profile" },
      { id: "gear", label: "Loadout" },
      { id: "missions", label: "Missions" },
      { id: "planets", label: "Planets" },
      { id: "wallet", label: "Wallet" },
      { id: "notes", label: "Notes" },
    ],
  },
  {
    id: "helm",
    label: "HELM",
    description: "Navigate the galaxy",
    spriteKey: "icon_nav",
    hotkey: "H",
    accentColor: "var(--cyan)",
    tabs: [
      { id: "nav", label: "Navigation" },
      { id: "aria", label: "ARIA" },
    ],
  },
  {
    id: "ship",
    label: "SHIP",
    description: "Cargo, combat & scanning",
    spriteKey: "icon_gear",
    hotkey: "S",
    accentColor: "var(--green)",
    tabs: [
      { id: "inventory", label: "Cargo" },
      { id: "combat", label: "Combat" },
      { id: "explore", label: "Scanner" },
    ],
  },
  {
    id: "commerce",
    label: "COMMERCE",
    description: "Trade & economy",
    spriteKey: "icon_trade",
    hotkey: "M",
    accentColor: "var(--yellow)",
    tabs: [
      { id: "trade", label: "Market" },
      { id: "trade-routes", label: "Routes" },
      { id: "trade-offers", label: "Offers" },
      { id: "trade-history", label: "Ledger" },
    ],
  },
  {
    id: "social",
    label: "SOCIAL",
    description: "Comms, contacts & guild",
    spriteKey: "icon_comms",
    hotkey: "K",
    accentColor: "var(--purple)",
    tabs: [
      { id: "comms", label: "Comms" },
      { id: "crew", label: "Contacts" },
      { id: "syndicate", label: "Syndicate" },
    ],
  },
  {
    id: "database",
    label: "DATABASE",
    description: "Intel, codex & reference",
    spriteKey: "icon_actions",
    hotkey: "D",
    accentColor: "var(--cyan)",
    tabs: [
      { id: "actions", label: "Databank" },
      { id: "intel", label: "Intel" },
      { id: "codex", label: "Codex" },
    ],
  },
];

// Legacy PANELS array for backward compatibility
export const PANELS: PanelDef[] = [
  { id: "profile", label: "PILOT", spriteKey: "icon_profile", hotkey: "P" },
  { id: "nav", label: "HELM", spriteKey: "icon_nav", hotkey: "H" },
  { id: "combat", label: "COMBAT", spriteKey: "icon_combat", hotkey: "C" },
  { id: "explore", label: "SCANNER", spriteKey: "icon_explore", hotkey: "S" },
  {
    id: "missions",
    label: "MISSIONS",
    spriteKey: "icon_missions",
    hotkey: "I",
  },
  { id: "crew", label: "CONTACTS", spriteKey: "icon_crew", hotkey: "O" },
  { id: "comms", label: "COMMS", spriteKey: "icon_comms", hotkey: "K" },
  {
    id: "syndicate",
    label: "SYNDICATE",
    spriteKey: "icon_syndicate",
    hotkey: "Y",
  },
  { id: "gear", label: "LOADOUT", spriteKey: "icon_gear", hotkey: "G" },
  { id: "inventory", label: "CARGO", spriteKey: "icon_inventory", hotkey: "A" },
  { id: "trade", label: "MARKET", spriteKey: "icon_trade", hotkey: "M" },
  { id: "planets", label: "PLANETS", spriteKey: "icon_planets", hotkey: "L" },
  { id: "wallet", label: "WALLET", spriteKey: "icon_wallet", hotkey: "W" },
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
