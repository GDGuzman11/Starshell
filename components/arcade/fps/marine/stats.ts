/**
 * ARMOR STATS — aggregation + the small, hard-capped gameplay bonuses armour grants.
 * Per Gabe's decision, armour is PRESTIGE-FIRST: equipped pieces sum to a visible
 * rating, but the actual combat effect is deliberately tiny and capped so it can
 * never become pay-to-win. The visible evolution across familiarity stages is the
 * real reward. `aggregateArmor` feeds the avatar/bench display; `armorPlayerBonus`
 * feeds the deploy seam (Phase 3).
 *
 * Imported ONLY by the /arcade chunk.
 */
import type { ArmorStat } from './slots';
import type { ArmorPiece } from './parts';
import { divisionStats } from './divisions';

export interface ArmorTotals {
  armor: number;
  mobility: number;
  shield: number;
  recovery: number;
  rating: number; // 0..100 headline number for the panel
}

const STAT_KEYS: ArmorStat[] = ['armor', 'mobility', 'shield', 'recovery'];
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Sum the (multiplicative) deltas of the equipped pieces per stat. */
export function aggregateArmor(pieces: ArmorPiece[]): ArmorTotals {
  const t = { armor: 0, mobility: 0, shield: 0, recovery: 0 };
  for (const p of pieces) {
    (Object.keys(t) as ArmorStat[]).forEach((k) => {
      t[k] += p.stats[k] ?? 0;
    });
  }
  // Rating: a friendly 0..100 headline that grows with total positive investment.
  const sum = Math.max(0, t.armor) + Math.max(0, t.mobility) + Math.max(0, t.shield) + Math.max(0, t.recovery);
  const rating = Math.round(Math.min(100, sum * 130));
  return { ...t, rating };
}

export type StatVector = Record<ArmorStat, number>;

/** Per-stat POINTS (0..100 scale) for the bars: the division's base identity + what
 *  the equipped armour pieces add on top. `total = base + added`. */
export function statLayers(divisionId: string | null | undefined, pieces: ArmorPiece[]): { base: StatVector; added: StatVector; total: StatVector; rating: number } {
  const dv = divisionStats(divisionId);
  const agg = aggregateArmor(pieces);
  const base = { ...dv } as StatVector;
  const added = {} as StatVector;
  const total = {} as StatVector;
  for (const k of STAT_KEYS) {
    added[k] = Math.max(0, agg[k]) * 100; // each piece ≈ +2..6 pts
    total[k] = base[k] + added[k];
  }
  const rating = Math.round(Math.min(100, (total.armor + total.mobility + total.shield + total.recovery) / 4));
  return { base, added, total, rating };
}

/** The combat effects the Marine's DIVISION + equipped armour apply at deploy. Divisions
 *  are earned (not bought) so their identity is meaningful but bounded; heavy divisions
 *  are genuinely slower (moveMul < 1), light ones squishier. Armour pieces add on top. */
export function combatBonus(
  divisionId: string | null | undefined,
  pieces: ArmorPiece[],
): { maxHp: number; overshield: number; moveMul: number; regenDelayMul: number; regenRateMul: number } {
  const { total } = statLayers(divisionId, pieces);
  return {
    maxHp: Math.round(clamp(total.armor, 0, 130) * 0.7), // Warden ~+66, Ghost ~+21
    overshield: Math.round(clamp(total.shield, 0, 130) * 0.7),
    moveMul: clamp(1 + (total.mobility - 50) * 0.0045, 0.85, 1.25), // <1 for heavy frames
    regenDelayMul: clamp(1.6 - total.recovery / 100, 0.55, 1.7), // high recovery → shorter wait
    regenRateMul: clamp(0.7 + (total.recovery / 100) * 0.9, 0.7, 1.8), // …and faster heal
  };
}
