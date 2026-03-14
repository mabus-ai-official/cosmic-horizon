/**
 * Narration manifest — maps Act 1 story missions (1-10) to pre-generated MP3 URLs.
 * Audio files live in public/audio/narration/ and are generated offline via
 * client/scripts/generate-narration.ts.
 */

interface NarrationEntry {
  accept: string;
  claim: string;
}

const NARRATION: Record<number, NarrationEntry> = {
  1: {
    accept: "/audio/narration/m01_accept.mp3",
    claim: "/audio/narration/m01_claim.mp3",
  },
  2: {
    accept: "/audio/narration/m02_accept.mp3",
    claim: "/audio/narration/m02_claim.mp3",
  },
  3: {
    accept: "/audio/narration/m03_accept.mp3",
    claim: "/audio/narration/m03_claim.mp3",
  },
  4: {
    accept: "/audio/narration/m04_accept.mp3",
    claim: "/audio/narration/m04_claim.mp3",
  },
  5: {
    accept: "/audio/narration/m05_accept.mp3",
    claim: "/audio/narration/m05_claim.mp3",
  },
  6: {
    accept: "/audio/narration/m06_accept.mp3",
    claim: "/audio/narration/m06_claim.mp3",
  },
  7: {
    accept: "/audio/narration/m07_accept.mp3",
    claim: "/audio/narration/m07_claim.mp3",
  },
  8: {
    accept: "/audio/narration/m08_accept.mp3",
    claim: "/audio/narration/m08_claim.mp3",
  },
  9: {
    accept: "/audio/narration/m09_accept.mp3",
    claim: "/audio/narration/m09_claim.mp3",
  },
  10: {
    accept: "/audio/narration/m10_accept.mp3",
    claim: "/audio/narration/m10_claim.mp3",
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
  event: "accept" | "claim",
): string | null {
  return NARRATION[storyOrder]?.[event] ?? null;
}
