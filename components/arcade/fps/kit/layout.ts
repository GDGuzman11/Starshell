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

export type ModuleKind = 'barracks' | 'watchtower' | 'command' | 'apartment' | 'ruin' | 'bunker';
export type Rot = 0 | 90 | 180 | 270;

export interface Placement {
  module: ModuleKind;
  gx: number; // integer grid cell (0,0 = arena centre)
  gz: number;
  rot: Rot;
  params?: { levels?: number }; // apartment storeys (2..4)
}

export interface LevelLayout {
  v: number; // LAYOUT_VERSION (migration guard)
  theme: string; // ThemeId
  size: number; // arena metres (square)
  seed: number; // clutter-fill determinism
  placements: Placement[];
  spawn?: { gx: number; gz: number }; // else derived (−z end)
  enemySpawn?: { gx: number; gz: number }; // else derived (+z end)
  name?: string; // user label (saved layouts)
}

export const MODULE_KINDS: ModuleKind[] = ['barracks', 'watchtower', 'command', 'apartment', 'ruin', 'bunker'];
export const ROTATIONS: Rot[] = [0, 90, 180, 270];

/** Approximate module footprints (metres) — for editor overlap tests (swapped at 90/270). */
export const FOOTPRINT: Record<ModuleKind, { w: number; d: number }> = {
  barracks: { w: 18, d: 16 },
  watchtower: { w: 18, d: 18 },
  command: { w: 24, d: 24 },
  apartment: { w: 20, d: 16 },
  ruin: { w: 18, d: 16 },
  bunker: { w: 10, d: 10 },
};

/** Grid cell → world metres. */
export function cellToWorld(g: number): number {
  return g * CELL;
}

/** A placement's footprint in metres, accounting for 90/270 rotation. */
export function footprintOf(p: Placement): { w: number; d: number } {
  const f = FOOTPRINT[p.module];
  return p.rot === 90 || p.rot === 270 ? { w: f.d, d: f.w } : { w: f.w, d: f.d };
}
