/** Client-side progression utilities — mirrors server's progression.ts formulas */

export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(100 * Math.pow(level, 1.8));
}

export function xpToNextLevel(level: number, currentXp: number): number {
  if (level >= 100) return 0;
  return xpForLevel(level + 1) - currentXp;
}

export function xpProgressPercent(level: number, currentXp: number): number {
  if (level >= 100) return 100;
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const range = nextLevelXp - currentLevelXp;
  if (range <= 0) return 100;
  return Math.min(
    100,
    Math.round(((currentXp - currentLevelXp) / range) * 100),
  );
}

/** Key milestones by level — rank promotions and stat bonuses */
export const LEVEL_MILESTONES: Record<number, string> = {
  5: "Cadet Rank",
  10: "Ensign Rank",
  15: "Lieutenant Rank",
  20: "Commander Rank",
  25: "Captain Rank",
  30: "Commodore Rank",
  35: "Rear Admiral Rank",
  40: "Vice Admiral Rank",
  50: "Fleet Admiral Rank",
  60: "Sentinel Rank",
  75: "Overlord Rank",
  100: "Cosmic Legend",
};

export function getNextMilestone(
  level: number,
): { level: number; reward: string } | null {
  for (const [lvl, reward] of Object.entries(LEVEL_MILESTONES)) {
    const l = Number(lvl);
    if (l > level) return { level: l, reward };
  }
  return null;
}
