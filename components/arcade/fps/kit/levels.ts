/**
 * CAMPAIGN level binding. The campaign is 20 levels with BOSS fights fixed at every
 * 5th (5/10/15/20); the 16 non-boss levels are authored in the dev Level Editor.
 *
 * A campaign level maps to an authored-level ORDINAL (1..16, counting only non-boss
 * slots). `resolveLevel` serves that ordinal from, in order of priority:
 *   1) the editor's LOCAL timeline in localStorage — so a dev author's saved edits
 *      show up in their own campaign playthrough immediately (never ships to players);
 *   2) the BAKED `CAMPAIGN` below — authored layouts committed into the code, which
 *      is what real players get on the live site;
 *   3) the legacy procedural arena — the always-playable fallback for empty slots.
 *
 * Imported ONLY by the /arcade chunk.
 */
import { makeArena3D, type Level3D } from '../level3d';
import { buildFromLayout } from './generate';
import { loadCampaign } from './storage';
import type { LevelLayout } from './layout';

/**
 * Authored layouts BAKED for production, keyed by authored-level ordinal (1..16).
 * Paste the editor's EXPORT CAMPAIGN block here to ship levels to real players, e.g.:
 *   1: { v: 1, theme: 'neon', size: 200, seed: 1, placements: [ ... ], bridges: [ ... ] },
 * Empty = every non-boss level uses the local timeline (dev) or the procedural fallback.
 */
export const CAMPAIGN: Record<number, LevelLayout> = {};

/** Non-boss ordinal of a campaign level (1-based, counting only non-boss slots). */
export function authoredOrdinal(level: number): number {
  return level - Math.floor(level / 5);
}

/** Resolve a campaign level to a playable Level3D. Boss slots + empty slots use the
 *  procedural arena; authored non-boss slots use their baked/local layout. */
export function resolveLevel(level: number, mapCount: number, seed: number): Level3D {
  if (level % 5 === 0) return makeArena3D(mapCount, seed); // boss slot — procedural arena
  const ord = authoredOrdinal(level);
  const local = loadCampaign()[ord - 1]; // dev workshop override
  if (local?.authored) return buildFromLayout({ ...local.layout, seed });
  const baked = CAMPAIGN[ord]; // shipped to players
  if (baked) return buildFromLayout({ ...baked, seed });
  return makeArena3D(mapCount, seed); // fallback
}
