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
  // Syndicate economy events
  "syndicate:economy_update": void;
  "syndicate:project_completed": void;
  // Multi-session sync — no payload, client calls its own refresh
  "sync:status": void;
  "sync:sector": void;
  "sync:map": void;
  "sync:full": void;
  // Arcade events
  "arcade:challenge": {
    challengeId: string;
    challengerName: string;
    gameType: string;
  };
  "arcade:challenge_response": {
    challengeId: string;
    accepted: boolean;
    sessionId?: string;
  };
  "arcade:session_start": {
    sessionId: string;
    opponent: { id: string | null; username: string };
    gameType: string;
    isPlayer1: boolean;
  };
  "arcade:round_start": {
    round: number;
    sweetSpotPositions: number[];
    barSpeed: number;
    effects: any[];
  };
  "arcade:opponent_score": { round: number; score: number };
  "arcade:round_complete": {
    round: number;
    scores: { player1: number; player2: number };
    standings: { player1: number; player2: number };
  };
  "arcade:drink_phase": { menu: any[]; timeLimit: number };
  "arcade:game_complete": {
    winnerId: string | null;
    finalScores: { player1: number; player2: number };
  };
  // Combat V2 events
  "combat-v2:session_start": {
    sessionId: string;
    attackerId: string;
    attackerName: string;
    defenderId: string;
    defenderName: string;
    roundNumber: number;
    deadline: string;
    playerAState: any;
    playerBState: any;
  };
  "combat-v2:round_start": {
    sessionId: string;
    roundNumber: number;
    deadline: string;
    playerAState: any;
    playerBState: any;
  };
  "combat-v2:opponent_ready": { playerId: string };
  "combat-v2:round_resolved": { sessionId: string; resolution: any };
  "combat-v2:combat_end": {
    sessionId: string;
    status: string;
    winnerId: string | null;
    endReason: string;
    destroyedPlayerId?: string;
    fledPlayerId?: string;
  };
}

// Client -> Server events
export interface ClientEvents {
  join: { playerId: string };
  "chat:sector": { message: string };
  "chat:syndicate": { message: string };
  "chat:alliance": { message: string; allianceId?: string };
  "arcade:ready": { sessionId: string };
  "arcade:hit": { sessionId: string; timing: number; roundHitIndex: number };
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

export function arcadeRoom(sessionId: string): string {
  return `arcade:${sessionId}`;
}

export function combatV2Room(sessionId: string): string {
  return `combat:${sessionId}`;
}
