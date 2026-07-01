/**
 * Serializable LEVEL LAYOUT — the small JSON a hand-authored level is made of.
 * The editor produces these; `buildFromLayout` (generate.ts) turns one into a
 * playable Level3D by placing the existing kit modules (rotated via transform.ts)
 * on a coarse grid, plus boundary walls, spawns, and procedural clutter fill.
 *
 * Grid coords are integer CELLs (CELL metres each), centred on the arena origin —
 * think Tetris cells, not metres. JSON-tiny so it drops into localStorage and can
 * be baked into the campaign (levels.ts).
 *
 * Imported ONLY by the /arcade chunk.
 */
export const LAYOUT_VERSION = 1 as const;
export const CELL = 16; // metres per placement cell

export type BuildingKind = 'barracks' | 'watchtower' | 'command' | 'apartment' | 'ruin' | 'bunker';
export type PropKind = 'coverwall' | 'sandbags' | 'container' | 'barrier' | 'dragonteeth' | 'fueltank' | 'commtower' | 'guardpost' | 'crates' | 'rubble' | 'wreck' | 'station' | 'ammocrate' | 'shieldcrate' | 'healthcrate';
export type ModuleKind = BuildingKind | PropKind;
export type Rot = 0 | 90 | 180 | 270;

export interface Placement {
  module: ModuleKind;
  gx: number; // integer grid cell (0,0 = arena centre)
  gz: number;
  rot: Rot;
  params?: { levels?: number }; // apartment storeys (2..4)
}

/** A bridge span connecting two building roofs, flush at height `y` (world coords). */
export interface BridgeSpan {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  y: number;
}

export interface LevelLayout {
  v: number; // LAYOUT_VERSION (migration guard)
  theme: string; // ThemeId
  size: number; // arena metres (square)
  seed: number; // clutter-fill determinism
  placements: Placement[];
  bridges?: BridgeSpan[]; // roof-to-roof spans
  spawn?: { gx: number; gz: number }; // else derived (−z end)
  enemySpawn?: { gx: number; gz: number }; // else derived (+z end)
  name?: string; // user label (saved layouts)
}

/** One slot in the editor's campaign timeline. `authored` = the user saved a real
 *  layout here; an un-authored slot falls back to the procedural arena in-game. */
export interface CampaignSlot {
  authored: boolean;
  layout: LevelLayout;
}

/** A fresh empty layout (blank canvas for a new timeline slot). */
export function blankLayout(theme = 'wartorn', size = 200): LevelLayout {
  return { v: LAYOUT_VERSION, theme, size, seed: 12345, placements: [], bridges: [] };
}

export const BUILDING_KINDS: BuildingKind[] = ['barracks', 'watchtower', 'command', 'apartment', 'ruin', 'bunker'];
export const PROP_KINDS: PropKind[] = ['coverwall', 'sandbags', 'container', 'barrier', 'dragonteeth', 'fueltank', 'commtower', 'guardpost', 'crates', 'rubble', 'wreck', 'station', 'ammocrate', 'shieldcrate', 'healthcrate'];
export const MODULE_KINDS: ModuleKind[] = [...BUILDING_KINDS, ...PROP_KINDS];
export const ROTATIONS: Rot[] = [0, 90, 180, 270];

/** Approximate module footprints (metres) — for editor overlap tests (swapped at 90/270). */
export const FOOTPRINT: Record<ModuleKind, { w: number; d: number }> = {
  barracks: { w: 18, d: 16 },
  watchtower: { w: 18, d: 18 },
  command: { w: 24, d: 24 },
  apartment: { w: 20, d: 16 },
  ruin: { w: 18, d: 16 },
  bunker: { w: 10, d: 10 },
  coverwall: { w: 8, d: 1 },
  sandbags: { w: 8, d: 1.4 },
  container: { w: 6.2, d: 2.6 },
  barrier: { w: 4, d: 1.4 },
  dragonteeth: { w: 6.6, d: 1.8 },
  fueltank: { w: 3.2, d: 3.2 },
  commtower: { w: 3.6, d: 3.6 },
  guardpost: { w: 6, d: 6 },
  crates: { w: 3.2, d: 3 },
  rubble: { w: 4, d: 4 },
  wreck: { w: 4, d: 3 },
  station: { w: 6, d: 6 },
  ammocrate: { w: 2, d: 2 },
  shieldcrate: { w: 2, d: 2 },
  healthcrate: { w: 2, d: 2 },
};

/** Roof/top-deck height of a building, or null for props / roofless buildings
 *  (used by bridges to connect two buildings flush at the same height). */
export function roofHeightOf(module: ModuleKind, levels = 3): number | null {
  switch (module) {
    case 'barracks':
    case 'command':
      return 4; // one floor step
    case 'watchtower':
      return 8; // two floor steps
    case 'apartment':
      return levels * 4;
    default:
      return null; // ruin/bunker/props have no clean roof to bridge
  }
}

/** Grid cell → world metres. */
export function cellToWorld(g: number): number {
  return g * CELL;
}

/** A placement's footprint in metres, accounting for 90/270 rotation. */
export function footprintOf(p: Placement): { w: number; d: number } {
  const f = FOOTPRINT[p.module];
  return p.rot === 90 || p.rot === 270 ? { w: f.d, d: f.w } : { w: f.w, d: f.d };
}
