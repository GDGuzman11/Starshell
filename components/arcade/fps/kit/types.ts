/**
 * Modular Arena Kit — shared grid + dimension conventions and the module metadata
 * the AI reads. Everything is PROCEDURAL (grid-aligned box builders, zero asset
 * files); the spec's "1 Blender Unit = 1 m", pivots, and connection-points become
 * code conventions here. 1 unit = 1 metre; all footprints snap to the master grid.
 *
 * Imported ONLY by the /arcade chunk (the kit atoms/modules/generator) — never the
 * homepage tree.
 */

/** Master snap grid (metres). Every module footprint is divisible by 2. */
export const GRID = [2, 4, 8, 12, 16, 24, 32] as const;
/** Snap a length UP to the nearest master-grid value (min 2). */
export function snapGrid(v: number): number {
  for (const g of GRID) if (v <= g) return g;
  return Math.ceil(v / 8) * 8; // beyond 32 → round to 8s
}
/** Snap a coordinate onto a 2 m lattice (keeps modules aligned). */
export function snap2(v: number): number {
  return Math.round(v / 2) * 2;
}

/** Standard dimensions (metres) — kept consistent across the whole kit. */
export const DIM = {
  wallT: 0.5, // wall thickness
  wallH: 4, // standard wall height
  halfH: 2, // half wall
  doorW: 2, // door width
  doorH: 3, // door height
  windowH: 1.5,
  windowSill: 1, // sill height
  floorStep: 4, // vertical spacing between floors
  floorT: 0.4, // floor slab thickness
  railH: 1,
  railT: 0.15,
  stairW: 2,
  ladderW: 1,
  bridgeW: 4,
  catwalkW: 2,
  colT: 0.5, // column thickness
} as const;

/** Texture-index roles (into the existing wall-material set). Themes remap these. */
export const TEX = { wall: 0, panel: 1, rail: 2, floor: 3 } as const;

export type Cardinal = 'N' | 'S' | 'E' | 'W';

/** A rectangle on a floor: [minX, minZ, maxX, maxZ]. */
export type Rect = [number, number, number, number];

/**
 * Metadata a module exposes so the generator can place/connect it AND the AI can
 * navigate + fight in it. NAV HINTS (floors/doorways/stairs/roof) are what the nav
 * graph consumes to build interior/multi-floor nodes; CONNECTORS are hook points
 * for bridges/catwalks between modules.
 */
export interface ModuleMeta {
  kind: string;
  cx: number; // centre
  cz: number;
  sx: number; // footprint extent (X)
  sz: number; // footprint extent (Z)
  height: number; // top of the structure
  /** Walkable floor rects per level (ground floor included), lowest first. */
  floors: { y: number; rect: Rect }[];
  /** Opening centres (doorways / open faces) — nav links pass through these. */
  doorways: { x: number; z: number; y: number }[];
  /** Stair/ladder ends (low ↔ high) for vertical nav links. */
  stairs: { x0: number; z0: number; y0: number; x1: number; z1: number; y1: number }[];
  /** Combat rooftop, if any (a perch + a floor). */
  roof?: { y: number; rect: Rect };
  /** Edge hook points where a bridge/catwalk can attach. */
  connectors: { side: Cardinal; x: number; z: number; y: number }[];
}
