/**
 * Uniqueness guard for the DNA generator — the doc's rule that "future generations
 * must compare against all existing DNA combinations" and avoid visually-similar
 * results. We derive a compact feature signature from a blueprint (DNA pair +
 * silhouette + palette + slot layout) and a cheap distance so the generator can flag
 * a near-duplicate before it's saved. Pure + dependency-free (client sync path).
 */
import type { WeaponBlueprint } from './blueprint';

/** Quantised feature vector: the fields that make two guns "look the same". */
function features(bp: WeaponBlueprint): string[] {
  const pal = bp.model.palette;
  const bodies = pal.body.map((c) => (c >> 4).toString(16)).sort().join('');
  const acc = (pal.accent >> 4).toString(16);
  const slots = bp.model.slots
    .map((s) => `${s.slot}:${Math.round(s.girth * 4)}:${Math.round(s.emissive * 3)}:${s.muzzle}`)
    .sort();
  return [
    `dna:${bp.dna.primary}>${bp.dna.secondary}`,
    `tpl:${bp.model.template}`,
    `fam:${bp.family}`,
    `pal:${bodies}/${acc}`,
    ...slots,
  ];
}

/** A stable short hash of the feature set — stored as the blueprint's DNA signature. */
export function featureHash(bp: WeaponBlueprint): string {
  const str = features(bp).join('|');
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

/** Jaccard similarity (0..1) over the two feature sets — 1 = identical layout. */
export function similarity(a: WeaponBlueprint, b: WeaponBlueprint): number {
  const fa = new Set(features(a));
  const fb = new Set(features(b));
  let inter = 0;
  for (const f of fa) if (fb.has(f)) inter++;
  const union = fa.size + fb.size - inter;
  return union === 0 ? 0 : inter / union;
}

/** The closest existing blueprint (by similarity) and its score, or null if none. */
export function nearestMatch(
  bp: WeaponBlueprint,
  existing: WeaponBlueprint[],
): { match: WeaponBlueprint; score: number } | null {
  let best: { match: WeaponBlueprint; score: number } | null = null;
  for (const e of existing) {
    if (e.id === bp.id) continue;
    const score = similarity(bp, e);
    if (!best || score > best.score) best = { match: e, score };
  }
  return best;
}
