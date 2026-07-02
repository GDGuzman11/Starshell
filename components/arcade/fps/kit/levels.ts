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
import { buildFromLayout, makeBattlefieldLayout } from './generate';
import { bossArena, bossArenaArchon, bossArenaBehemoth, bossArenaChimera, bossArenaColossus, bossArenaInfestor, bossArenaLeviathan, bossArenaMonolith, bossArenaOblivion, bossArenaOracle, bossArenaSpecter, scatterBuildingsAndWalls } from './bossArenas';
import { loadCampaign } from './storage';
import type { LevelLayout } from './layout';
import type { BossKind } from '../enemy';

/**
 * BAKED production campaign — the public 100-level run, keyed by authored-level ordinal
 * (1..N). Generated with the editor's GENERATE ALL randomizer and stored as
 * `[theme, size, seed]` triples: `makeBattlefieldLayout` is deterministic (seeded RNG),
 * so each triple regenerates its EXACT authored arena at play time (verified 100/100 vs
 * the editor EXPORT). This keeps the shipped data ~2.5 kB instead of ~430 kB of inlined
 * placements. To re-bake from a new EXPORT: take each level's `layout.{theme,size,seed}`.
 * NOTE: this is coupled to the current generator — if `makeBattlefieldLayout` changes,
 * re-bake (the maps would otherwise silently change). Empty triple list = every non-boss
 * level uses the dev local timeline or the procedural fallback.
 */
const CAMPAIGN_SEEDS: [string, number, number][] = [
  ["neon", 208, 972274263],
  ["desert", 200, 177492500],
  ["industrial", 208, 375946688],
  ["moon", 208, 757686503],
  ["frozen", 176, 105240498],
  ["moon", 192, 509379512],
  ["volcanic", 224, 953572508],
  ["jungle", 192, 358321864],
  ["industrial", 176, 459759124],
  ["industrial", 200, 290132495],
  ["neon", 176, 786628675],
  ["frozen", 200, 387387726],
  ["wartorn", 192, 288571312],
  ["frozen", 200, 37999743],
  ["wartorn", 224, 865875087],
  ["volcanic", 200, 88544076],
  ["wartorn", 224, 609141185],
  ["neon", 192, 409114073],
  ["desert", 224, 938649934],
  ["neon", 208, 203434713],
  ["wartorn", 176, 673537185],
  ["frozen", 208, 357879723],
  ["jungle", 224, 668312261],
  ["moon", 192, 74984920],
  ["neon", 200, 761448401],
  ["neon", 208, 318567416],
  ["moon", 200, 518228179],
  ["wartorn", 200, 784737034],
  ["volcanic", 224, 574175647],
  ["neon", 200, 262071436],
  ["wartorn", 192, 410890847],
  ["moon", 208, 236568222],
  ["moon", 192, 97627185],
  ["frozen", 208, 990665924],
  ["desert", 200, 821009443],
  ["industrial", 176, 257909378],
  ["industrial", 208, 383597848],
  ["frozen", 200, 278994459],
  ["wartorn", 208, 25042126],
  ["industrial", 192, 764772679],
  ["neon", 224, 987745725],
  ["neon", 192, 677739655],
  ["neon", 224, 872095530],
  ["neon", 208, 422826025],
  ["frozen", 176, 723954696],
  ["jungle", 208, 477908076],
  ["industrial", 224, 687107603],
  ["moon", 200, 966741252],
  ["wartorn", 224, 180586853],
  ["industrial", 200, 57240131],
  ["wartorn", 208, 66546968],
  ["jungle", 176, 575502177],
  ["industrial", 192, 909904298],
  ["industrial", 208, 179012377],
  ["desert", 176, 12596555],
  ["neon", 200, 502010530],
  ["volcanic", 192, 197830817],
  ["industrial", 208, 668625289],
  ["wartorn", 176, 972968090],
  ["frozen", 176, 607094835],
  ["desert", 192, 945811988],
  ["wartorn", 224, 48364791],
  ["wartorn", 208, 768185768],
  ["neon", 192, 687242490],
  ["neon", 192, 228313788],
  ["wartorn", 192, 920879330],
  ["desert", 192, 758120983],
  ["frozen", 224, 89322994],
  ["moon", 208, 364248707],
  ["jungle", 200, 215990161],
  ["industrial", 176, 745895390],
  ["wartorn", 176, 650271239],
  ["jungle", 208, 510372707],
  ["jungle", 192, 779414801],
  ["volcanic", 208, 366116839],
  ["jungle", 208, 797480921],
  ["jungle", 192, 310763571],
  ["industrial", 208, 285972412],
  ["volcanic", 176, 608112117],
  ["frozen", 224, 737956512],
  ["industrial", 200, 816818986],
  ["neon", 208, 79613871],
  ["industrial", 224, 83626435],
  ["frozen", 200, 257847805],
  ["neon", 176, 966586868],
  ["wartorn", 176, 642225205],
  ["industrial", 192, 161927027],
  ["volcanic", 224, 569123926],
  ["wartorn", 176, 979302955],
  ["industrial", 208, 62129001],
  ["moon", 176, 661751681],
  ["industrial", 192, 15374906],
  ["jungle", 192, 300388390],
  ["wartorn", 208, 694092276],
  ["desert", 176, 103933615],
  ["neon", 224, 433543300],
  ["frozen", 208, 923834074],
  ["jungle", 224, 340433671],
  ["desert", 224, 811936430],
  ["jungle", 208, 184130362],
];

/** How many levels the baked public campaign has. */
export function bakedCount(): number {
  return CAMPAIGN_SEEDS.length;
}

/** The baked layout for an authored ordinal (1..N), regenerated + memoized on first use. */
const bakedCache = new Map<number, LevelLayout>();
export function bakedLevel(ord: number): LevelLayout | undefined {
  if (ord < 1 || ord > CAMPAIGN_SEEDS.length) return undefined;
  let l = bakedCache.get(ord);
  if (!l) {
    const [theme, size, seed] = CAMPAIGN_SEEDS[ord - 1];
    l = makeBattlefieldLayout(theme, size, seed);
    bakedCache.set(ord, l);
  }
  return l;
}

/** A regular boss fight sits at every Nth campaign level (plus the final gauntlet). */
export const BOSS_EVERY = 15;

/** Regular bosses cycle in this order (by boss ordinal). New civilizations are appended
 *  as they ship, so deeper runs face more variety. */
export const GAUNTLET_ORDER: BossKind[] = ['xeno', 'warrior', 'octopus', 'archon', 'behemoth', 'specter', 'leviathan', 'monolith', 'oblivion', 'colossus', 'chimera', 'oracle', 'infestor'];

/** Per-boss bespoke arena (modular-kit layout → drops/buildings/walls/theme). A boss
 *  without an entry falls back to the procedural makeArena3D. Each boss's terrain is
 *  supplied per batch; for now every boss gets a stocked building+cover spread. */
export const BOSS_ARENAS: Partial<Record<BossKind, (seed: number) => LevelLayout>> = {
  xeno: (seed) => bossArena({ theme: 'neon', size: 160, placements: scatterBuildingsAndWalls(160, seed) }, seed),
  warrior: (seed) => bossArena({ theme: 'volcanic', size: 160, placements: scatterBuildingsAndWalls(160, seed) }, seed),
  octopus: (seed) => bossArena({ theme: 'jungle', size: 160, placements: scatterBuildingsAndWalls(160, seed) }, seed),
  archon: bossArenaArchon,
  behemoth: bossArenaBehemoth,
  specter: bossArenaSpecter,
  leviathan: bossArenaLeviathan,
  monolith: bossArenaMonolith,
  oblivion: bossArenaOblivion,
  colossus: bossArenaColossus,
  chimera: bossArenaChimera,
  oracle: bossArenaOracle,
  infestor: bossArenaInfestor,
};

/** Build a boss level's arena: its bespoke stocked layout, or the procedural fallback. */
export function buildBossArena(kind: BossKind, mapCount: number, seed: number): Level3D {
  const make = BOSS_ARENAS[kind];
  return make ? buildFromLayout(make(seed)) : makeArena3D(mapCount, seed);
}

/** How many non-boss levels the campaign has: the local timeline length (dev), else
 *  the baked public campaign, else the default 16. */
export function authoredCount(): number {
  const n = loadCampaign().length;
  if (n) return n;
  return bakedCount() || 16;
}

/** Non-boss ordinal of a campaign level (counting only non-boss slots ≤ level). */
export function authoredOrdinal(level: number): number {
  return level - Math.floor(level / BOSS_EVERY);
}

/** Total campaign levels = the last authored level + a final gauntlet capstone. */
export function campaignTotalLevels(): number {
  const n = Math.max(1, authoredCount());
  return n + Math.floor((n - 1) / (BOSS_EVERY - 1)) + 1;
}

/** A boss level = every BOSS_EVERY-th level, plus the final gauntlet (may not be an Nth). */
export function isBossLevel(level: number, total = campaignTotalLevels()): boolean {
  return level % BOSS_EVERY === 0 || level === total;
}
export function isGauntletLevel(level: number, total = campaignTotalLevels()): boolean {
  return level === total;
}
/** The (regular) boss kind for a boss-slot level — cycles through GAUNTLET_ORDER. */
export function bossKindFor(level: number): BossKind {
  const n = GAUNTLET_ORDER.length;
  return GAUNTLET_ORDER[(((Math.floor(level / BOSS_EVERY) - 1) % n) + n) % n];
}

/** Resolve a campaign level to a playable Level3D. Boss/gauntlet + empty slots use the
 *  procedural arena; authored non-boss slots use their baked/local layout. */
export function resolveLevel(level: number, mapCount: number, seed: number): Level3D {
  if (isBossLevel(level)) return buildBossArena(bossKindFor(level), mapCount, seed); // bespoke stocked boss arena
  const ord = authoredOrdinal(level);
  const local = loadCampaign()[ord - 1]; // dev workshop override
  if (local?.authored) return buildFromLayout({ ...local.layout, seed });
  const baked = bakedLevel(ord); // shipped to players
  if (baked) return buildFromLayout({ ...baked, seed });
  return makeArena3D(mapCount, seed); // fallback
}
