// Server -> Client events
export interface ServerEvents {
  "sector:update": {
    sectorId: number;
    players: { id: string; username: string }[];
  };
  "player:entered": { playerId: string; username: string; sectorId: number };
  "player:left": { playerId: string; sectorId: number };
  "combat:volley": {
    attackerId: string;
    attackerName: string;
    damage: number;
    yourEnergyRemaining: number;
  };
  "combat:destroyed": { destroyedPlayerId: string; destroyerName: string };
  "combat:fled": { playerId: string; username: string };
  notification: { type: string; message: string; data?: any };
  "energy:update": { energy: number; maxEnergy: number };
  "trade:complete": {
    outpostId: string;
    commodity: string;
    quantity: number;
    total: number;
  };
  "chat:sector": {
    senderId: string;
    senderName: string;
    message: string;
    timestamp: number;
  };
  "chat:syndicate": {
    senderId: string;
    senderName: string;
    message: string;
    timestamp: number;
  };
  "chat:alliance": {
    senderId: string;
    senderName: string;
    syndicateName: string;
    message: string;
    timestamp: number;
  };
  "syndicate:vote_created": {
    voteId: string;
    type: string;
    description: string;
    proposedBy: string;
  };
  "syndicate:vote_resolved": { voteId: string; result: string };
  "syndicate:member_joined": { playerId: string; username: string };
  "syndicate:member_left": { playerId: string; username: string };
  // Push events — real-time feedback for achievements, missions, factions
  "achievement:unlocked": {
    name: string;
    description: string;
    xpReward: number;
    creditReward: number;
  };
  "mission:completed": {
    missionId: string;
    title: string;
    type: string;
    rewardCredits: number;
    rewardXp: number;
    requiresClaim: boolean;
  };
  "faction:rankup": {
    factionId: string;
    factionName: string;
    newTier: string;
    fame: number;
  };
  // Story mission events
  "story:act_complete": { act: number; actTitle: string; actSummary: string };
  "story:act_unlocked": { message: string };
  "story:lore_unlocked": { codexTitle: string; codexContent: string };
  // Multi-session sync — no payload, client calls its own refresh
  "sync:status": void;
  "sync:sector": void;
  "sync:map": void;
  "sync:full": void;
}

// Client -> Server events
export interface ClientEvents {
  join: { playerId: string };
  "chat:sector": { message: string };
  "chat:syndicate": { message: string };
  "chat:alliance": { message: string; allianceId?: string };
}

// Room naming helpers
export function sectorRoom(sectorId: number): string {
  return `sector:${sectorId}`;
}

export function playerRoom(playerId: string): string {
  return `player:${playerId}`;
}

export function syndicateRoom(syndicateId: string): string {
  return `syndicate:${syndicateId}`;
}

export function allianceRoom(allianceId: string): string {
  return `alliance:${allianceId}`;
}
