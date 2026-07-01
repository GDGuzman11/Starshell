/**
 * CAMPAIGN level binding. Each non-boss campaign level can be bound to a
 * hand-authored LevelLayout (built in the dev Level Editor and pasted in here via
 * its EXPORT). `resolveLevel` returns the baked layout if one exists, else falls
 * back to the legacy procedural arena — so the campaign is always playable, and
 * baking an authored level is a one-line add.
 *
 * Boss levels (5/10/15/20) are never bound here — they keep their own design.
 *
 * Imported ONLY by the /arcade chunk.
 */
import { makeArena3D, type Level3D } from '../level3d';
import { buildFromLayout } from './generate';
import type { LevelLayout } from './layout';

/**
 * Authored layouts keyed by campaign level (1..20, non-boss only). Paste the
 * editor's EXPORT JSON here, e.g.:
 *   1: { v: 1, theme: 'neon', size: 200, seed: 1, placements: [ ... ] },
 * Empty = every level uses the procedural fallback (current behaviour).
 */
export const CAMPAIGN: Record<number, LevelLayout> = {};

/** Resolve a campaign level to a playable Level3D: a baked authored layout if one
 *  is bound, otherwise the legacy procedural arena sized by `mapCount`. The live
 *  `seed` is threaded in so clutter still varies per play. */
export function resolveLevel(level: number, mapCount: number, seed: number): Level3D {
  const layout = CAMPAIGN[level];
  if (layout) return buildFromLayout({ ...layout, seed });
  return makeArena3D(mapCount, seed);
}
