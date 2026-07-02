/**
 * Weapon / component FAMILIARITY — the permanent "this weapon and I have history"
 * progression that REPLACES weapon levels. Familiarity is XP that accrues NATURALLY
 * from playing (kills, boss damage, accuracy, finishing operations) — never grinding.
 * It advances through military milestones and unlocks small (never overpowering)
 * bonuses + cosmetic/visual evolution handled elsewhere.
 *
 * Imported ONLY by the /arcade chunk.
 */
export const FAMILIARITY_STAGES = ['Recruit', 'Field Tested', 'Combat Ready', 'Veteran', 'Elite', 'Prototype', 'Legendary Service'] as const;
export type FamiliarityStage = (typeof FAMILIARITY_STAGES)[number];

/** Cumulative XP to REACH each stage (index-aligned with FAMILIARITY_STAGES). */
export const STAGE_XP = [0, 150, 500, 1200, 2600, 5200, 9000];

export function stageIndexFor(xp: number): number {
  let i = 0;
  for (let s = 0; s < STAGE_XP.length; s++) if (xp >= STAGE_XP[s]) i = s;
  return i;
}
export function stageFor(xp: number): FamiliarityStage {
  return FAMILIARITY_STAGES[stageIndexFor(xp)];
}

/** Progress toward the next milestone: current/next stage + a 0..1 bar fraction. */
export function stageProgress(xp: number): { index: number; stage: FamiliarityStage; next: FamiliarityStage | null; pct: number } {
  const index = stageIndexFor(xp);
  const stage = FAMILIARITY_STAGES[index];
  if (index >= FAMILIARITY_STAGES.length - 1) return { index, stage, next: null, pct: 1 };
  const cur = STAGE_XP[index];
  const nxt = STAGE_XP[index + 1];
  return { index, stage, next: FAMILIARITY_STAGES[index + 1], pct: Math.max(0, Math.min(1, (xp - cur) / (nxt - cur))) };
}

/** XP earned by an EQUIPPED weapon/component for one completed operation. Scales with
 *  performance so it feels natural, not grindy; a strong level pays ~150-300. */
export function xpForOperation(o: { kills: number; bossDamage?: number; accuracy?: number; won: boolean }): number {
  const acc = Math.max(0, Math.min(1, o.accuracy ?? 0));
  return Math.round(o.kills * 5 + (o.bossDamage ?? 0) * 0.02 + acc * 30 + (o.won ? 40 : 15));
}

/** A tiny milestone gameplay bonus (multiplicative), capped low per the spec's
 *  "never overpowering" rule: +0.5% damage per stage → +3% at Legendary Service. */
export function milestoneBonus(xp: number): { dmg: number } {
  return { dmg: stageIndexFor(xp) * 0.005 };
}
