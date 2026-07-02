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

export interface ArmorTotals {
  armor: number;
  mobility: number;
  shield: number;
  recovery: number;
  rating: number; // 0..100 headline number for the panel
}

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

/** The capped bonuses armour actually applies to the player at deploy. Kept small:
 *  at most +20 max HP, +30 overshield, +8% move speed, −15% shield-recharge delay. */
export function armorPlayerBonus(pieces: ArmorPiece[]): { maxHp: number; overshield: number; moveMul: number; recoverMul: number } {
  const t = aggregateArmor(pieces);
  const cap = (v: number, hi: number) => Math.max(0, Math.min(hi, v));
  return {
    maxHp: Math.round(cap(t.armor, 0.2) * 100),
    overshield: Math.round(cap(t.shield, 0.3) * 100),
    moveMul: 1 + cap(t.mobility, 0.08),
    recoverMul: 1 - cap(t.recovery, 0.15),
  };
}
