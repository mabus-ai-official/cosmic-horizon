import db from "../db/connection";
import { GAME_CONFIG } from "../config/game";

export type MissionType =
  | "deliver_cargo"
  | "visit_sector"
  | "destroy_ship"
  | "colonize_planet"
  | "trade_units"
  | "scan_sectors"
  | "meet_npc"
  | "escort"
  | "intercept"
  | "investigate"
  | "survive_ambush"
  | "timed_delivery"
  | "choose"
  | "defend_planet"
  | "sabotage";

export interface MissionObjectives {
  // deliver_cargo: deliver X units of commodity to a sector with an outpost
  commodity?: string;
  quantity?: number;
  // visit_sector: visit N distinct sectors
  sectorsToVisit?: number;
  // destroy_ship: destroy N ships
  shipsToDestroy?: number;
  // colonize_planet: colonize N colonists
  colonistsToDeposit?: number;
  // trade_units: trade N units total (buy or sell)
  unitsToTrade?: number;
  // scan_sectors: scan N times
  scansRequired?: number;
  // meet_npc: meet a specific NPC
  npcId?: string;
  npcName?: string;
  // escort: escort N caravans
  caravansToEscort?: number;
  // intercept: intercept N caravans
  caravansToIntercept?: number;
  // investigate: investigate N events
  eventsToInvestigate?: number;
  eventType?: string;
  // survive_ambush: survive N ambushes
  ambushesToSurvive?: number;
  // timed_delivery: deliver commodity within time limit
  timeMinutes?: number;
  targetSectorId?: number;
  // choose: present a choice (meta-type, auto-completes on selection)
  choiceId?: string;
  // defend_planet: repel N bombardments
  bombardsToRepel?: number;
  planetId?: string;
  // sabotage: complete sabotage at target
  targetId?: string;
  targetType?: string;
}

export interface MissionProgress {
  sectorsVisited?: number[];
  exploredAtStart?: number[]; // snapshot of explored sectors when mission was accepted
  shipsDestroyed?: number;
  colonistsDeposited?: number;
  unitsTraded?: number;
  scansCompleted?: number;
  scannedSectorIds?: number[];
  cargoDelivered?: number;
  // New objective type progress
  npcMet?: boolean;
  caravansEscorted?: number;
  caravansIntercepted?: number;
  eventsInvestigated?: number;
  ambushesSurvived?: number;
  timedDelivered?: number;
  choiceMade?: boolean;
  bombardsRepelled?: number;
  sabotageCompleted?: boolean;
}

export interface ObjectiveDetail {
  description: string;
  target: number;
  current: number;
  complete: boolean;
  hint?: string;
}

/**
 * Check and update mission progress based on a player action.
 * Called by the mission-tracker service after every qualifying game event
 * (move, trade, combat, etc.). Each mission type only listens to relevant
 * actions — visit_sector ignores trade, deliver_cargo only cares about sells
 * of the right commodity, etc. Returns whether the progress changed and
 * whether the mission is now complete.
 */
export function checkMissionProgress(
  mission: {
    type: string;
    objectives: MissionObjectives;
    progress: MissionProgress;
  },
  action: string,
  data: Record<string, any>,
): { updated: boolean; completed: boolean; progress: MissionProgress } {
  const { type, objectives, progress } = mission;
  const p = { ...progress };
  let updated = false;

  switch (type) {
    case "visit_sector":
      if (action === "move") {
        const visited = p.sectorsVisited || [];
        if (!visited.includes(data.sectorId)) {
          visited.push(data.sectorId);
          p.sectorsVisited = visited;
          updated = true;
        }
      }
      break;

    case "destroy_ship":
      if (action === "combat_destroy") {
        p.shipsDestroyed = (p.shipsDestroyed || 0) + 1;
        updated = true;
      }
      break;

    case "colonize_planet":
      if (action === "colonize") {
        p.colonistsDeposited =
          (p.colonistsDeposited || 0) + (data.quantity || 0);
        updated = true;
      }
      break;

    case "trade_units":
      if (action === "trade") {
        p.unitsTraded = (p.unitsTraded || 0) + (data.quantity || 0);
        updated = true;
      }
      break;

    case "scan_sectors":
      if (action === "scan") {
        const sectorId = data.sectorId;
        if (!p.scannedSectorIds) p.scannedSectorIds = [];
        if (!p.scannedSectorIds.includes(sectorId)) {
          p.scannedSectorIds.push(sectorId);
          p.scansCompleted = p.scannedSectorIds.length;
          updated = true;
        }
      }
      break;

    case "deliver_cargo":
      if (action === "trade" && data.tradeType === "sell") {
        if (data.commodity === objectives.commodity) {
          p.cargoDelivered = (p.cargoDelivered || 0) + (data.quantity || 0);
          updated = true;
        }
      }
      break;

    case "meet_npc":
      if (action === "npc_encounter" && data.npcId === objectives.npcId) {
        p.npcMet = true;
        updated = true;
      }
      break;

    case "escort":
      if (action === "caravan_delivered") {
        p.caravansEscorted = (p.caravansEscorted || 0) + 1;
        updated = true;
      }
      break;

    case "intercept":
      if (action === "caravan_ransacked") {
        p.caravansIntercepted = (p.caravansIntercepted || 0) + 1;
        updated = true;
      }
      break;

    case "investigate":
      if (action === "event_investigated") {
        if (!objectives.eventType || data.eventType === objectives.eventType) {
          p.eventsInvestigated = (p.eventsInvestigated || 0) + 1;
          updated = true;
        }
      }
      break;

    case "survive_ambush":
      if (action === "combat_survive") {
        p.ambushesSurvived = (p.ambushesSurvived || 0) + 1;
        updated = true;
      }
      break;

    case "timed_delivery":
      if (action === "trade" && data.tradeType === "sell") {
        if (data.commodity === objectives.commodity) {
          p.timedDelivered = (p.timedDelivered || 0) + (data.quantity || 0);
          updated = true;
        }
      }
      break;

    case "choose":
      if (action === "choice_made" && data.choiceId === objectives.choiceId) {
        p.choiceMade = true;
        updated = true;
      }
      break;

    case "defend_planet":
      if (action === "planet_defended") {
        if (!objectives.planetId || data.planetId === objectives.planetId) {
          p.bombardsRepelled = (p.bombardsRepelled || 0) + 1;
          updated = true;
        }
      }
      break;

    case "sabotage":
      if (
        action === "sabotage_complete" &&
        data.targetId === objectives.targetId
      ) {
        p.sabotageCompleted = true;
        updated = true;
      }
      break;
  }

  const completed = isMissionComplete(type, objectives, p);
  return { updated, completed, progress: p };
}

function isMissionComplete(
  type: string,
  objectives: MissionObjectives,
  progress: MissionProgress,
): boolean {
  switch (type) {
    case "visit_sector":
      return (
        (progress.sectorsVisited?.length || 0) >=
        (objectives.sectorsToVisit || 0)
      );
    case "destroy_ship":
      return (progress.shipsDestroyed || 0) >= (objectives.shipsToDestroy || 0);
    case "colonize_planet":
      return (
        (progress.colonistsDeposited || 0) >=
        (objectives.colonistsToDeposit || 0)
      );
    case "trade_units":
      return (progress.unitsTraded || 0) >= (objectives.unitsToTrade || 0);
    case "scan_sectors":
      return (progress.scansCompleted || 0) >= (objectives.scansRequired || 0);
    case "deliver_cargo":
      return (progress.cargoDelivered || 0) >= (objectives.quantity || 0);
    case "meet_npc":
      return !!progress.npcMet;
    case "escort":
      return (
        (progress.caravansEscorted || 0) >= (objectives.caravansToEscort || 0)
      );
    case "intercept":
      return (
        (progress.caravansIntercepted || 0) >=
        (objectives.caravansToIntercept || 0)
      );
    case "investigate":
      return (
        (progress.eventsInvestigated || 0) >=
        (objectives.eventsToInvestigate || 0)
      );
    case "survive_ambush":
      return (
        (progress.ambushesSurvived || 0) >= (objectives.ambushesToSurvive || 0)
      );
    case "timed_delivery":
      return (progress.timedDelivered || 0) >= (objectives.quantity || 0);
    case "choose":
      return !!progress.choiceMade;
    case "defend_planet":
      return (
        (progress.bombardsRepelled || 0) >= (objectives.bombardsToRepel || 0)
      );
    case "sabotage":
      return !!progress.sabotageCompleted;
    default:
      return false;
  }
}

/**
 * Check if a timed mission has expired. Null expiresAt means no time limit
 * (exploration missions, etc.). Timed missions create urgency for combat
 * and delivery missions while keeping exploration stress-free.
 */
export function isMissionExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

/**
 * Build per-objective detail array from mission template data.
 * Creates the structured UI data (description, target, current, complete)
 * that the client renders as progress bars. Objectives start at 0 progress
 * and are updated via updateObjectivesDetail() as the player acts.
 */
export function buildObjectivesDetail(
  type: string,
  objectives: MissionObjectives,
  hints?: string[],
  descriptionSuffix?: string,
): ObjectiveDetail[] {
  const details: ObjectiveDetail[] = [];
  const hint = hints?.[0];

  switch (type) {
    case "visit_sector":
      details.push({
        description: `Visit ${objectives.sectorsToVisit} distinct sectors`,
        target: objectives.sectorsToVisit || 0,
        current: 0,
        complete: false,
        hint,
      });
      break;
    case "destroy_ship":
      details.push({
        description: `Destroy ${objectives.shipsToDestroy} enemy ship${(objectives.shipsToDestroy || 0) > 1 ? "s" : ""}`,
        target: objectives.shipsToDestroy || 0,
        current: 0,
        complete: false,
        hint,
      });
      break;
    case "colonize_planet":
      details.push({
        description: `Deposit ${objectives.colonistsToDeposit} colonists${descriptionSuffix || ""}`,
        target: objectives.colonistsToDeposit || 0,
        current: 0,
        complete: false,
        hint,
      });
      break;
    case "trade_units":
      details.push({
        description: `Trade ${objectives.unitsToTrade} units of goods`,
        target: objectives.unitsToTrade || 0,
        current: 0,
        complete: false,
        hint,
      });
      break;
    case "scan_sectors":
      details.push({
        description: `Perform ${objectives.scansRequired} sector scans`,
        target: objectives.scansRequired || 0,
        current: 0,
        complete: false,
        hint,
      });
      break;
    case "deliver_cargo": {
      const commodity = objectives.commodity || "unknown";
      const capCommodity =
        commodity.charAt(0).toUpperCase() + commodity.slice(1);
      details.push({
        description: `Deliver ${objectives.quantity} ${capCommodity}${descriptionSuffix || ""}`,
        target: objectives.quantity || 0,
        current: 0,
        complete: false,
        hint,
      });
      break;
    }
    case "meet_npc":
      details.push({
        description: `Meet ${objectives.npcName || "NPC"}`,
        target: 1,
        current: 0,
        complete: false,
        hint,
      });
      break;
    case "escort":
      details.push({
        description: `Escort ${objectives.caravansToEscort} caravan${(objectives.caravansToEscort || 0) > 1 ? "s" : ""}`,
        target: objectives.caravansToEscort || 0,
        current: 0,
        complete: false,
        hint,
      });
      break;
    case "intercept":
      details.push({
        description: `Intercept ${objectives.caravansToIntercept} caravan${(objectives.caravansToIntercept || 0) > 1 ? "s" : ""}`,
        target: objectives.caravansToIntercept || 0,
        current: 0,
        complete: false,
        hint,
      });
      break;
    case "investigate":
      details.push({
        description: `Investigate ${objectives.eventsToInvestigate} event${(objectives.eventsToInvestigate || 0) > 1 ? "s" : ""}`,
        target: objectives.eventsToInvestigate || 0,
        current: 0,
        complete: false,
        hint,
      });
      break;
    case "survive_ambush":
      details.push({
        description: `Survive ${objectives.ambushesToSurvive} ambush${(objectives.ambushesToSurvive || 0) > 1 ? "es" : ""}`,
        target: objectives.ambushesToSurvive || 0,
        current: 0,
        complete: false,
        hint,
      });
      break;
    case "timed_delivery": {
      const tdComm = objectives.commodity || "unknown";
      const capTdComm = tdComm.charAt(0).toUpperCase() + tdComm.slice(1);
      details.push({
        description: `Deliver ${objectives.quantity} ${capTdComm} within ${objectives.timeMinutes} minutes`,
        target: objectives.quantity || 0,
        current: 0,
        complete: false,
        hint,
      });
      break;
    }
    case "choose":
      details.push({
        description: "Make your choice",
        target: 1,
        current: 0,
        complete: false,
        hint,
      });
      break;
    case "defend_planet":
      details.push({
        description: `Repel ${objectives.bombardsToRepel} bombardment${(objectives.bombardsToRepel || 0) > 1 ? "s" : ""}`,
        target: objectives.bombardsToRepel || 0,
        current: 0,
        complete: false,
        hint,
      });
      break;
    case "sabotage":
      details.push({
        description: `Sabotage the ${objectives.targetType || "target"}`,
        target: 1,
        current: 0,
        complete: false,
        hint,
      });
      break;
  }
  return details;
}

/**
 * Update objectives detail from current progress.
 * Merges live progress values into the objectives detail array so the
 * client can display accurate progress bars without recalculating.
 */
export function updateObjectivesDetail(
  type: string,
  progress: MissionProgress,
  details: ObjectiveDetail[],
): ObjectiveDetail[] {
  if (!details || details.length === 0) return details;
  const updated = details.map((d) => ({ ...d }));

  switch (type) {
    case "visit_sector":
      updated[0].current = progress.sectorsVisited?.length || 0;
      break;
    case "destroy_ship":
      updated[0].current = progress.shipsDestroyed || 0;
      break;
    case "colonize_planet":
      updated[0].current = progress.colonistsDeposited || 0;
      break;
    case "trade_units":
      updated[0].current = progress.unitsTraded || 0;
      break;
    case "scan_sectors":
      updated[0].current = progress.scansCompleted || 0;
      break;
    case "deliver_cargo":
      updated[0].current = progress.cargoDelivered || 0;
      break;
    case "meet_npc":
      updated[0].current = progress.npcMet ? 1 : 0;
      break;
    case "escort":
      updated[0].current = progress.caravansEscorted || 0;
      break;
    case "intercept":
      updated[0].current = progress.caravansIntercepted || 0;
      break;
    case "investigate":
      updated[0].current = progress.eventsInvestigated || 0;
      break;
    case "survive_ambush":
      updated[0].current = progress.ambushesSurvived || 0;
      break;
    case "timed_delivery":
      updated[0].current = progress.timedDelivered || 0;
      break;
    case "choose":
      updated[0].current = progress.choiceMade ? 1 : 0;
      break;
    case "defend_planet":
      updated[0].current = progress.bombardsRepelled || 0;
      break;
    case "sabotage":
      updated[0].current = progress.sabotageCompleted ? 1 : 0;
      break;
  }

  for (const d of updated) {
    d.complete = d.current >= d.target;
  }
  return updated;
}

/**
 * Check if a player has completed a prerequisite mission.
 * Used to gate content behind mission completion (e.g., Stellar Census
 * unlocks naming authority, cantina gate mission unlocks bartender missions).
 * Checks for both 'claimed' and 'auto' claim statuses since some missions
 * auto-complete without requiring a Star Mall visit.
 */
export async function checkPrerequisite(
  playerId: string,
  prerequisiteMissionId: string,
): Promise<boolean> {
  const completed = await db("player_missions")
    .where({ player_id: playerId, template_id: prerequisiteMissionId })
    .where(function () {
      this.where({ status: "completed", claim_status: "claimed" }).orWhere({
        status: "completed",
        claim_status: "auto",
      });
    })
    .first();
  return !!completed;
}

/**
 * Check if a player has unlocked cantina missions by completing the gate mission.
 * The cantina is a secondary mission source (bartender NPC) — gated behind
 * a specific mission to create a sense of discovery and progression.
 */
export async function hasCantinaAccess(playerId: string): Promise<boolean> {
  return checkPrerequisite(playerId, GAME_CONFIG.CANTINA_GATE_MISSION_ID);
}

/**
 * Generate the mission board pool for a Star Mall.
 * Filters by: player level (tier gating), Act 1 completion (story gate),
 * and excludes non-repeatable missions already active or completed.
 * Pool is randomized with a fixed size limit so the board feels fresh
 * each visit. Repeatable missions can reappear even after completion.
 */
export async function generateMissionPool(
  playerId: string,
  playerSectorId: number,
  playerLevel: number,
): Promise<any[]> {
  // Gate behind Act 1 completion
  try {
    const { hasCompletedAct1 } = await import("../engine/story-missions");
    if (!(await hasCompletedAct1(playerId))) return [];
  } catch {
    /* story tables may not exist yet */
  }

  // Determine which tiers are unlocked
  const tierLevels = GAME_CONFIG.MISSION_TIER_LEVELS;
  const unlockedTiers = Object.entries(tierLevels)
    .filter(([, reqLevel]) => playerLevel >= reqLevel)
    .map(([tier]) => Number(tier));

  // Get non-repeatable missions already active or completed by player
  const excludeTemplates = await db("player_missions")
    .where({ player_id: playerId })
    .whereIn("status", ["active", "completed"])
    .join(
      "mission_templates",
      "player_missions.template_id",
      "mission_templates.id",
    )
    .where("mission_templates.repeatable", false)
    .select("mission_templates.id");

  const excludeIds = excludeTemplates.map((r: any) => r.id);

  let query = db("mission_templates")
    .where("source", "board")
    .whereIn("tier", unlockedTiers);

  if (excludeIds.length > 0) {
    query = query.whereNotIn("id", excludeIds);
  }

  const templates = await query
    .orderBy("sort_order", "asc")
    .orderByRaw("RANDOM()")
    .limit(GAME_CONFIG.MISSION_POOL_SIZE);

  return templates.map((t: any) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    type: t.type,
    difficulty: t.difficulty,
    tier: t.tier,
    objectives:
      typeof t.objectives === "string"
        ? JSON.parse(t.objectives)
        : t.objectives,
    rewardCredits: t.reward_credits,
    rewardXp: t.reward_xp,
    rewardItemId: t.reward_item_id,
    timeLimitMinutes: t.time_limit_minutes,
    repeatable: !!t.repeatable,
    requiresClaimAtMall: !!t.requires_claim_at_mall,
    prerequisiteMissionId: t.prerequisite_mission_id,
    hints: typeof t.hints === "string" ? JSON.parse(t.hints) : t.hints || [],
  }));
}

/**
 * Generate a cantina mission for the bartender to offer.
 * Similar to the mission board but draws from the 'cantina' source pool.
 * Returns a single mission (the bartender whispers one job at a time).
 * Gated behind Act 1 completion like the main board.
 */
export async function generateCantinaMissionPool(
  playerId: string,
  playerLevel: number,
): Promise<any | null> {
  // Gate behind Act 1 completion
  try {
    const { hasCompletedAct1 } = await import("../engine/story-missions");
    if (!(await hasCompletedAct1(playerId))) return null;
  } catch {
    /* story tables may not exist yet */
  }

  const tierLevels = GAME_CONFIG.MISSION_TIER_LEVELS;
  const unlockedTiers = Object.entries(tierLevels)
    .filter(([, reqLevel]) => playerLevel >= reqLevel)
    .map(([tier]) => Number(tier));

  // Exclude non-repeatable cantina missions already active or completed
  const excludeTemplates = await db("player_missions")
    .where({ player_id: playerId })
    .whereIn("status", ["active", "completed"])
    .join(
      "mission_templates",
      "player_missions.template_id",
      "mission_templates.id",
    )
    .where("mission_templates.source", "cantina")
    .select("mission_templates.id");

  const excludeIds = excludeTemplates.map((r: any) => r.id);

  let query = db("mission_templates")
    .where("source", "cantina")
    .whereIn("tier", unlockedTiers);

  if (excludeIds.length > 0) {
    query = query.whereNotIn("id", excludeIds);
  }

  const template = await query.orderByRaw("RANDOM()").first();

  if (!template) return null;

  return {
    id: template.id,
    title: template.title,
    description: template.description,
    type: template.type,
    difficulty: template.difficulty,
    tier: template.tier,
    objectives:
      typeof template.objectives === "string"
        ? JSON.parse(template.objectives)
        : template.objectives,
    rewardCredits: template.reward_credits,
    rewardXp: template.reward_xp,
    rewardItemId: template.reward_item_id,
    timeLimitMinutes: template.time_limit_minutes,
    repeatable: !!template.repeatable,
    requiresClaimAtMall: !!template.requires_claim_at_mall,
    hints:
      typeof template.hints === "string"
        ? JSON.parse(template.hints)
        : template.hints || [],
  };
}
