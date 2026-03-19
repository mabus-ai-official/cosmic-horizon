/**
 * Narration manifest — maps story missions, faction questlines, and random events
 * to pre-generated MP3 URLs. Audio files live in public/audio/narration/ and are
 * generated offline via client/scripts/generate-narration.ts.
 *
 * Story missions 1-10 (Chapter 1-2) have generated audio.
 * Missions 11-60, faction questlines, and events are placeholders for future generation.
 */

interface NarrationEntry {
  accept: string;
  complete: string;
  claim: string;
  codex: string;
}

// Helper to generate consistent paths
function storyPath(n: number, event: string): string {
  return `/audio/narration/m${String(n).padStart(2, "0")}_${event}.mp3`;
}

function factionPath(faction: string, n: number, event: string): string {
  return `/audio/narration/fq_${faction}_m${String(n).padStart(2, "0")}_${event}.mp3`;
}

// Story mission narration (missions 1-60)
const NARRATION: Record<number, NarrationEntry> = {};
for (let i = 1; i <= 60; i++) {
  NARRATION[i] = {
    accept: storyPath(i, "accept"),
    complete: storyPath(i, "complete"),
    claim: storyPath(i, "claim"),
    codex: `/audio/narration/codex_${String(i).padStart(2, "0")}.mp3`,
  };
}

/** Faction questline narration — keyed by "faction:missionNumber" */
const FACTION_NARRATION: Record<string, NarrationEntry> = {};
const FACTIONS = [
  { key: "mycorrhizal_network", count: 12 },
  { key: "iron_dominion", count: 12 },
  { key: "traders_guild", count: 6 },
  { key: "shadow_syndicate", count: 6 },
  { key: "independent", count: 4 },
];
for (const f of FACTIONS) {
  for (let i = 1; i <= f.count; i++) {
    FACTION_NARRATION[`${f.key}:${i}`] = {
      accept: factionPath(f.key, i, "accept"),
      complete: factionPath(f.key, i, "complete"),
      claim: factionPath(f.key, i, "claim"),
      codex: factionPath(f.key, i, "codex"),
    };
  }
}

/** Random event narration — keyed by event_key */
const EVENT_NARRATION: Record<string, string> = {
  distress_signal: "/audio/narration/event_distress_signal.mp3",
  pirate_ambush: "/audio/narration/event_pirate_ambush.mp3",
  trade_opportunity: "/audio/narration/event_trade_opportunity.mp3",
  derelict_discovery: "/audio/narration/event_derelict_discovery.mp3",
  fungal_bloom: "/audio/narration/event_fungal_bloom.mp3",
  smugglers_offer: "/audio/narration/event_smugglers_offer.mp3",
  ranger_emergency: "/audio/narration/event_ranger_emergency.mp3",
  scholars_request: "/audio/narration/event_scholars_request.mp3",
  raxus_challenge: "/audio/narration/event_raxus_challenge.mp3",
  mycelial_surge: "/audio/narration/event_mycelial_surge.mp3",
  colony_crisis: "/audio/narration/event_colony_crisis.mp3",
  trade_route_disruption: "/audio/narration/event_trade_route_disruption.mp3",
  faction_tension: "/audio/narration/event_faction_tension.mp3",
  new_frontier: "/audio/narration/event_new_frontier.mp3",
  mentors_call: "/audio/narration/event_mentors_call.mp3",
  economic_boom: "/audio/narration/event_economic_boom.mp3",
  alliance_test: "/audio/narration/event_alliance_test.mp3",
  ancient_signal: "/audio/narration/event_ancient_signal.mp3",
  the_wanderer: "/audio/narration/event_the_wanderer.mp3",
  galactic_crisis: "/audio/narration/event_galactic_crisis.mp3",
};

/** Known phase narration files that actually exist on disk */
const PHASE_NARRATION_FILES = new Set<string>([
  // Chapter 1
  "m05_phase2",
  "m06_phase2",
  "m07_phase2",
  // Chapter 2
  "m10_phase2",
  "m12_phase2",
  "m13_phase2",
  // Chapter 3
  "m18_phase2",
  "m19_phase2",
  "m20_phase2",
  "m21_phase2",
  "m23_phase2",
  "m23_phase3",
  "m24_phase2",
  // Chapter 4
  "m25_phase2",
  "m26_phase2",
  "m27_phase2",
  "m28_phase2",
  "m28_phase3",
  "m29_phase2",
  "m29_phase3",
  "m30_phase2",
  "m30_phase3",
  "m30_phase4",
  "m31_phase2",
  // Chapter 5
  "m32_phase2",
  "m33_phase2",
  "m34_phase2",
  "m34_phase3",
  "m36_phase2",
  "m37_phase2",
  "m38_phase2",
  "m39_phase2",
  // Chapter 6
  "m40_phase2",
  "m41_phase2",
  "m42_phase2",
  "m43_phase2",
  "m44_phase2",
  "m45_phase2",
  "m46_phase2",
  "m46_phase3",
  // Chapter 7
  "m47_phase2",
  "m48_phase2",
  "m49_phase2",
  "m50_phase2",
  "m50_phase3",
  "m51_phase2",
  "m52_phase2",
  // Chapter 8
  "m54_phase2",
  "m55_phase2",
  "m56_phase2",
  "m56_phase3",
  "m57_phase2",
  "m58_phase2",
  "m59_phase2",
  "m59_phase3",
]);

/** Phase transition narration — keyed by "storyOrder:phaseOrder" */
function getPhaseNarrationUrl(
  storyOrder: number,
  phaseOrder: number,
): string | null {
  const key = `m${String(storyOrder).padStart(2, "0")}_phase${phaseOrder}`;
  if (!PHASE_NARRATION_FILES.has(key)) return null;
  return `/audio/narration/${key}.mp3`;
}

/** Known choice narration files that actually exist on disk */
const CHOICE_NARRATION_FILES = new Set<string>([
  // Story choices
  "dying_star_data",
  "philosopher_test",
  "artifact_decision",
  "espionage_data",
  "coalition_structure",
  "fragile_pact",
  "weapon_configuration",
  "council_structure",
  "valandors_legacy",
  // Faction choices
  "network_resonance",
  "scholars_dilemma",
  "dominion_prisoners",
  "kalin_secrets",
  "market_policy",
  "double_agent",
  "galaxy_citizen",
]);

/** Choice narration — keyed by choice_key */
function getChoiceNarrationUrl(choiceKey: string): string | null {
  if (!CHOICE_NARRATION_FILES.has(choiceKey)) return null;
  return `/audio/narration/choice_${choiceKey}.mp3`;
}

/** Short narrated lines for mission claim events */
export const CLAIM_TEXTS: Record<number, string> = {
  1: "Your first steps into the unknown are complete. The Spore Network stirs.",
  2: "Supplies secured. The bioluminescent trail grows clearer with each passing moment.",
  3: "The signal is triangulated. Something ancient waits at the convergence point.",
  4: "You have found the first node. The mycelial threads tremble at your approach.",
  5: "Cyrillium delivered. Dr. Vorn's arrays hum to life, peeling back layers of ancient mystery.",
  6: "The pirate threat is suppressed. The research corridor is secure — for now.",
  7: "Funding secured. The seed stirs, reaching tendrils toward the stars.",
  8: "The map is drawn. Dormant threads stretch across the galaxy like roots seeking water.",
  9: "Colony established. The presence of life strengthens the Network's signal.",
  10: "The Agaricalis has begun. Bioluminescent tendrils weave between the stars, and the galaxy will never be the same.",
  // Chapters 2-8 claim texts — placeholders for narration generation
  11: "The anomaly is mapped. Something vast lurks beyond the veil of known space.",
  12: "The wormhole crossing is survived. A new galaxy beckons.",
  13: "First contact achieved. The Vedic see something in you that you have yet to understand.",
  14: "The philosopher's test is passed. Knowledge is a weapon — how you wield it defines you.",
  15: "Cyrillium samples secured. These crystals hold secrets older than the stars themselves.",
  16: "The crystal resonance confirms it — the Vedic have been here far longer than anyone suspected.",
  17: "Valandor's warning echoes in your mind. The convoy is safe, but for how long?",
  18: "The Calvatian Gate stands before you. Beyond lies the unknown.",
  19: "New horizons reveal new dangers. The Calvatian Galaxy is vast and untamed.",
  20: "The Tar'ri traders speak of opportunity, but their eyes betray concern.",
  21: "Trade diplomacy succeeds. The Tar'ri remember those who feed their hungry.",
  22: "A distress signal — someone out here needs help. Or wants you to think they do.",
  23: "The Kalin are rescued. Commander Raxus speaks of debts and honor.",
  24: "The artifact is unearthed. Its power could reshape the galaxy — the question is, who decides?",
  25: "The debate rages. Kovax sees leverage, Raxus sees weapons. Both see the future.",
  26: "Smuggled fragments secured. Someone is moving artifacts through shadow channels.",
  27: "The war games reveal your combat potential. Raxus is impressed — or concerned.",
  28: "Whispers in deep space. Something is listening, something old and patient.",
  29: "The Syndicate listening post is neutralized. But the data it held raises more questions.",
  30: "The arms race accelerates. Caelum's prototypes could tip the balance.",
  31: "The drums of war grow louder. Elenion speaks of unity, but unity requires sacrifice.",
  32: "The siege is broken. Unknown technology gleams in the wreckage — this is not over.",
  33: "The evidence trail leads deeper. Lyra's analysis reveals weapons from a forgotten age.",
  34: "The summit convenes. Three leaders, three philosophies, one galaxy to protect.",
  35: "The coalition is formed. The structure you chose will echo through history.",
  36: "The shadow entity revealed. This threat predates every civilization in the galaxy.",
  37: "Precursor infrastructure awakens. The hidden enemy has a name now — and a purpose.",
  38: "Alliances forged in necessity. The supply lines hold — for now.",
  39: "The fragile pact holds. But Raxus's secret threatens everything.",
  40: "The core approaches. Here, at the heart of the galaxy, the ancient ones built their throne.",
  41: "Ancient traps disarmed. Professor Thane's calculations may have saved your life.",
  42: "The Primordium stands revealed. An entire civilization, older than stars, dormant but not dead.",
  43: "The gathering storm breaks. The combined fleet holds its ground against the darkness.",
  44: "The weapon is chosen. Its nature will determine what kind of peace follows.",
  45: "Primordium sentinels fall. The core heart beats somewhere in the darkness ahead.",
  46: "The battle for the galaxy is won. But victory always carries a cost.",
  47: "After the storm, the galaxy licks its wounds. Rebuilding begins with observation.",
  48: "Miraen's garden takes root. Life persists, even in the wake of destruction.",
  49: "Trade routes reconnected. The galaxy's arteries pump again with commerce and hope.",
  50: "The Council Charter is signed. A new era of governance begins.",
  51: "Caelum's legacy lives on. Precursor technology serves peace now, not war.",
  52: "The rift begins to heal. Raxus extends his hand — this time, in friendship.",
  53: "The Galactic Council convenes for the first time. Dawn breaks on a new era.",
  54: "The Ambassador's mantle rests on your shoulders. The galaxy knows your name.",
  55: "Ancient echoes reveal that the Primordium left more than destruction — they left possibility.",
  56: "The Spore Network reborn. Mycelial tendrils span galaxies now, carrying whispers of life.",
  57: "Valandor's farewell. His gift is not an object — it is understanding.",
  58: "The new frontier calls. Beyond the edge of the map, the universe continues.",
  59: "Keeper of the Stars. Your legacy is written in trade routes and colony lights.",
  60: "Legacy. The stars remember. And so will everyone who comes after you.",
};

export function getNarrationUrl(
  storyOrder: number,
  event: "accept" | "complete" | "claim" | "codex",
): string | null {
  return NARRATION[storyOrder]?.[event] ?? null;
}

export function getFactionNarrationUrl(
  factionKey: string,
  missionNumber: number,
  event: "accept" | "complete" | "claim" | "codex",
): string | null {
  return FACTION_NARRATION[`${factionKey}:${missionNumber}`]?.[event] ?? null;
}

export function getEventNarrationUrl(eventKey: string): string | null {
  return EVENT_NARRATION[eventKey] ?? null;
}

/** Act/chapter completion narration — keyed by act number */
const ACT_COMPLETION_NARRATION: Record<number, string> = {
  1: "/audio/narration/chapter_01_complete.mp3",
  2: "/audio/narration/chapter_02_complete.mp3",
  3: "/audio/narration/chapter_03_complete.mp3",
  4: "/audio/narration/chapter_04_complete.mp3",
  5: "/audio/narration/chapter_05_complete.mp3",
  6: "/audio/narration/chapter_06_complete.mp3",
  7: "/audio/narration/chapter_07_complete.mp3",
  8: "/audio/narration/chapter_08_complete.mp3",
};

export function getActCompletionNarrationUrl(act: number): string | null {
  return ACT_COMPLETION_NARRATION[act] ?? null;
}

/** Eavesdrop conversation narration — keyed by conversation index (0-9) */
const EAVESDROP_NARRATION: string[] = [
  "/audio/narration/eavesdrop_01.mp3",
  "/audio/narration/eavesdrop_02.mp3",
  "/audio/narration/eavesdrop_03.mp3",
  "/audio/narration/eavesdrop_04.mp3",
  "/audio/narration/eavesdrop_05.mp3",
  "/audio/narration/eavesdrop_06.mp3",
  "/audio/narration/eavesdrop_07.mp3",
  "/audio/narration/eavesdrop_08.mp3",
  "/audio/narration/eavesdrop_09.mp3",
  "/audio/narration/eavesdrop_10.mp3",
];

export function getEavesdropNarrationUrl(index: number): string | null {
  return EAVESDROP_NARRATION[index] ?? null;
}

export { getPhaseNarrationUrl, getChoiceNarrationUrl };

/** Intro sequence beat narration URLs (0-indexed) */
export const INTRO_NARRATION: string[] = [
  "/audio/narration/intro_01.mp3",
  "/audio/narration/intro_02.mp3",
  "/audio/narration/intro_03.mp3",
  "/audio/narration/intro_04.mp3",
  "/audio/narration/intro_05.mp3",
  "/audio/narration/intro_06.mp3",
  "/audio/narration/intro_07.mp3",
  "/audio/narration/intro_08.mp3",
  "/audio/narration/intro_09.mp3",
  "/audio/narration/intro_10.mp3",
];

/** Tutorial welcome narration */
export const TUTORIAL_WELCOME_NARRATION =
  "/audio/narration/tutorial_welcome.mp3";

/** Post-tutorial beat narration URLs (0-indexed) */
export const POST_TUTORIAL_NARRATION: string[] = [
  "/audio/narration/posttut_01.mp3",
  "/audio/narration/posttut_02.mp3",
  "/audio/narration/posttut_03.mp3",
  "/audio/narration/posttut_04.mp3",
  "/audio/narration/posttut_05.mp3",
  "/audio/narration/posttut_06.mp3",
  "/audio/narration/posttut_07.mp3",
  "/audio/narration/posttut_08.mp3",
];
