/**
 * Narration manifest — maps Act 1 story missions (1-10) to pre-generated MP3 URLs.
 * Audio files live in public/audio/narration/ and are generated offline via
 * client/scripts/generate-narration.ts.
 */

interface NarrationEntry {
  accept: string;
  complete: string;
  claim: string;
  codex: string;
}

const NARRATION: Record<number, NarrationEntry> = {
  1: {
    accept: "/audio/narration/m01_accept.mp3",
    complete: "/audio/narration/m01_complete.mp3",
    claim: "/audio/narration/m01_claim.mp3",
    codex: "/audio/narration/codex_01.mp3",
  },
  2: {
    accept: "/audio/narration/m02_accept.mp3",
    complete: "/audio/narration/m02_complete.mp3",
    claim: "/audio/narration/m02_claim.mp3",
    codex: "/audio/narration/codex_02.mp3",
  },
  3: {
    accept: "/audio/narration/m03_accept.mp3",
    complete: "/audio/narration/m03_complete.mp3",
    claim: "/audio/narration/m03_claim.mp3",
    codex: "/audio/narration/codex_03.mp3",
  },
  4: {
    accept: "/audio/narration/m04_accept.mp3",
    complete: "/audio/narration/m04_complete.mp3",
    claim: "/audio/narration/m04_claim.mp3",
    codex: "/audio/narration/codex_04.mp3",
  },
  5: {
    accept: "/audio/narration/m05_accept.mp3",
    complete: "/audio/narration/m05_complete.mp3",
    claim: "/audio/narration/m05_claim.mp3",
    codex: "/audio/narration/codex_05.mp3",
  },
  6: {
    accept: "/audio/narration/m06_accept.mp3",
    complete: "/audio/narration/m06_complete.mp3",
    claim: "/audio/narration/m06_claim.mp3",
    codex: "/audio/narration/codex_06.mp3",
  },
  7: {
    accept: "/audio/narration/m07_accept.mp3",
    complete: "/audio/narration/m07_complete.mp3",
    claim: "/audio/narration/m07_claim.mp3",
    codex: "/audio/narration/codex_07.mp3",
  },
  8: {
    accept: "/audio/narration/m08_accept.mp3",
    complete: "/audio/narration/m08_complete.mp3",
    claim: "/audio/narration/m08_claim.mp3",
    codex: "/audio/narration/codex_08.mp3",
  },
  9: {
    accept: "/audio/narration/m09_accept.mp3",
    complete: "/audio/narration/m09_complete.mp3",
    claim: "/audio/narration/m09_claim.mp3",
    codex: "/audio/narration/codex_09.mp3",
  },
  10: {
    accept: "/audio/narration/m10_accept.mp3",
    complete: "/audio/narration/m10_complete.mp3",
    claim: "/audio/narration/m10_claim.mp3",
    codex: "/audio/narration/codex_10.mp3",
  },
};

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
};

export function getNarrationUrl(
  storyOrder: number,
  event: "accept" | "complete" | "claim" | "codex",
): string | null {
  return NARRATION[storyOrder]?.[event] ?? null;
}

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
