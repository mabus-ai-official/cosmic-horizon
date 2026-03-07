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
  | "notes"
  | "profile";

export interface PanelDef {
  id: PanelId;
  label: string;
  spriteKey: string;
  hotkey: string;
}

export const PANELS: PanelDef[] = [
  { id: "profile", label: "PILOT", spriteKey: "icon_profile", hotkey: "P" },
  { id: "nav", label: "HELM", spriteKey: "icon_nav", hotkey: "H" },
  { id: "aria", label: "ARIA", spriteKey: "icon_aria", hotkey: "R" },
  { id: "explore", label: "SCANNER", spriteKey: "icon_explore", hotkey: "S" },
  { id: "trade", label: "MARKET", spriteKey: "icon_trade", hotkey: "M" },
  { id: "combat", label: "COMBAT", spriteKey: "icon_combat", hotkey: "C" },
  { id: "crew", label: "CONTACTS", spriteKey: "icon_crew", hotkey: "O" },
  {
    id: "missions",
    label: "MISSIONS",
    spriteKey: "icon_missions",
    hotkey: "I",
  },
  { id: "planets", label: "PLANETS", spriteKey: "icon_planets", hotkey: "L" },
  { id: "gear", label: "LOADOUT", spriteKey: "icon_gear", hotkey: "G" },
  { id: "inventory", label: "CARGO", spriteKey: "icon_inventory", hotkey: "A" },
  { id: "comms", label: "COMMS", spriteKey: "icon_comms", hotkey: "K" },
  {
    id: "syndicate",
    label: "SYNDICATE",
    spriteKey: "icon_syndicate",
    hotkey: "Y",
  },
  { id: "wallet", label: "WALLET", spriteKey: "icon_wallet", hotkey: "W" },
  { id: "actions", label: "DATABANK", spriteKey: "icon_actions", hotkey: "D" },
  { id: "notes", label: "NOTES", spriteKey: "icon_notes", hotkey: "N" },
];
