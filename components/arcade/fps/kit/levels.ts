/**
 * CAMPAIGN structure + level binding. The campaign length is FLEXIBLE — it follows
 * however many levels are authored in the editor. BOSS fights sit at every 5th level,
 * and a final GAUNTLET caps the run.
 *
 * A campaign level maps to an authored-level ORDINAL (counting only non-boss slots).
 * `resolveLevel` serves that ordinal from, in priority order:
 *   1) the editor's LOCAL timeline in localStorage — a dev author's saved edits show
 *      up in their own campaign playthrough immediately (never ships to players);
 *   2) the BAKED `CAMPAIGN` below — authored layouts committed into the code, which is
 *      what real players get on the live site;
 *   3) the legacy procedural arena — the always-playable fallback for empty slots.
 *
 * Imported ONLY by the /arcade chunk.
 */
import { makeArena3D, type Level3D } from '../level3d';
import { buildFromLayout } from './generate';
import { loadCampaign } from './storage';
import type { LevelLayout } from './layout';
import type { BossKind } from '../enemy';

/**
 * Authored layouts BAKED for production, keyed by authored-level ordinal (1..N).
 * Paste the editor's EXPORT CAMPAIGN block here to ship levels to real players, e.g.:
 *   1: { v: 1, theme: 'neon', size: 200, seed: 1, placements: [ ... ], bridges: [ ... ] },
 * Empty = every non-boss level uses the local timeline (dev) or the procedural fallback.
 */
export const CAMPAIGN: Record<number, LevelLayout> = {};

/** Regular bosses cycle in this order (by boss ordinal). */
export const GAUNTLET_ORDER: BossKind[] = ['xeno', 'warrior', 'octopus'];

/** How many non-boss levels the campaign has: the local timeline length (dev), else
 *  the highest baked key, else the default 16. */
export function authoredCount(): number {
  const n = loadCampaign().length;
  if (n) return n;
  const keys = Object.keys(CAMPAIGN).map(Number).filter((k) => k > 0);
  return keys.length ? Math.max(...keys) : 16;
}

/** Non-boss ordinal of a campaign level (counting only non-boss slots ≤ level). */
export function authoredOrdinal(level: number): number {
  return level - Math.floor(level / 5);
}

/** Total campaign levels = the last authored level + a final gauntlet capstone. */
export function campaignTotalLevels(): number {
  const n = Math.max(1, authoredCount());
  return n + Math.floor((n - 1) / 4) + 1;
}

/** A boss level = every 5th level, plus the final gauntlet (which may not be a 5th). */
export function isBossLevel(level: number, total = campaignTotalLevels()): boolean {
  return level % 5 === 0 || level === total;
}
export function isGauntletLevel(level: number, total = campaignTotalLevels()): boolean {
  return level === total;
}
/** The (regular) boss kind for a 5th-level boss — cycles xeno → warrior → octopus. */
export function bossKindFor(level: number): BossKind {
  return GAUNTLET_ORDER[(((Math.floor(level / 5) - 1) % 3) + 3) % 3];
}

/** Resolve a campaign level to a playable Level3D. Boss/gauntlet + empty slots use the
 *  procedural arena; authored non-boss slots use their baked/local layout. */
export function resolveLevel(level: number, mapCount: number, seed: number): Level3D {
  if (isBossLevel(level)) return makeArena3D(mapCount, seed); // boss / gauntlet arena
  const ord = authoredOrdinal(level);
  const local = loadCampaign()[ord - 1]; // dev workshop override
  if (local?.authored) return buildFromLayout({ ...local.layout, seed });
  const baked = CAMPAIGN[ord]; // shipped to players
  if (baked) return buildFromLayout({ ...baked, seed });
  return makeArena3D(mapCount, seed); // fallback
}
