export type EventPriority = "blocking" | "interstitial" | "toast";

export type EventCategory =
  | "level_up"
  | "story_act"
  | "story_mission"
  | "lore_reveal"
  | "faction_rankup"
  | "first_time"
  | "player_choice"
  | "resource_discovery"
  | "daily_missions"
  | "mission_complete"
  | "story_accept"
  | "tutorial_welcome"
  | "npc_dialogue"
  | "mission_choice"
  | "phase_intro"
  | "hostile_contact";

export interface EventAction {
  id: string;
  label: string;
  variant: "primary" | "secondary";
}

export interface NpcPortrait {
  npcName: string;
  npcTitle?: string;
  npcRace?: string;
  spriteConfig?: Record<string, any>;
}

export interface GameEvent {
  id: number;
  category: EventCategory;
  priority: EventPriority;
  title: string;
  subtitle?: string;
  body?: string | React.ReactNode;
  duration: number; // ms, 0 = no auto-dismiss
  dismissable: boolean;
  actions?: EventAction[];
  colorScheme: string;
  narrationUrl?: string;
  portrait?: NpcPortrait;
  onDismiss?: () => void;
  onAction?: (actionId: string) => void;
}

// Default configurations per event category
export const EVENT_DEFAULTS: Record<
  EventCategory,
  {
    priority: EventPriority;
    duration: number;
    colorScheme: string;
    dismissable: boolean;
  }
> = {
  level_up: {
    priority: "interstitial",
    duration: 6000,
    colorScheme: "cyan",
    dismissable: true,
  },
  story_act: {
    priority: "blocking",
    duration: 0,
    colorScheme: "yellow",
    dismissable: false,
  },
  story_mission: {
    priority: "interstitial",
    duration: 7000,
    colorScheme: "green",
    dismissable: true,
  },
  lore_reveal: {
    priority: "interstitial",
    duration: 8000,
    colorScheme: "magenta",
    dismissable: true,
  },
  faction_rankup: {
    priority: "interstitial",
    duration: 7000,
    colorScheme: "purple",
    dismissable: true,
  },
  first_time: {
    priority: "interstitial",
    duration: 6000,
    colorScheme: "cyan",
    dismissable: true,
  },
  player_choice: {
    priority: "blocking",
    duration: 0,
    colorScheme: "magenta",
    dismissable: false,
  },
  resource_discovery: {
    priority: "interstitial",
    duration: 5000,
    colorScheme: "orange",
    dismissable: true,
  },
  daily_missions: {
    priority: "interstitial",
    duration: 0,
    colorScheme: "yellow",
    dismissable: true,
  },
  mission_complete: {
    priority: "interstitial",
    duration: 6000,
    colorScheme: "green",
    dismissable: true,
  },
  story_accept: {
    priority: "blocking",
    duration: 0,
    colorScheme: "yellow",
    dismissable: false,
  },
  tutorial_welcome: {
    priority: "blocking",
    duration: 0,
    colorScheme: "cyan",
    dismissable: false,
  },
  npc_dialogue: {
    priority: "blocking",
    duration: 0,
    colorScheme: "cyan",
    dismissable: false,
  },
  mission_choice: {
    priority: "blocking",
    duration: 0,
    colorScheme: "magenta",
    dismissable: false,
  },
  phase_intro: {
    priority: "interstitial",
    duration: 5000,
    colorScheme: "green",
    dismissable: true,
  },
  hostile_contact: {
    priority: "interstitial",
    duration: 3000,
    colorScheme: "red",
    dismissable: true,
  },
};
