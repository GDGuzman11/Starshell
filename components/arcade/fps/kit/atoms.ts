/**
 * Kit ATOMS — the smallest grid-aligned building blocks, emitted as primitive
 * boxes / ladders / ramps (zero asset files). Every atom uses the standard
 * dimensions in `types.ts` and a consistent origin (walls/floors/columns bottom-
 * centre) so modules assembled from them snap with no gaps or overlaps and work
 * rotated to 0/90/180/270. Modules (fps/kit/modules) build ONLY from these atoms.
 *
 * Imported ONLY by the /arcade chunk.
 */
import type { Box, Ladder, Ramp } from '../level3d';
import { DIM, TEX } from './types';

type Axis = 'x' | 'z';

/** A straight wall segment of length `len` along `along`, thickness DIM.wallT,
 *  height `h`, standing on `yBase`. Centred at (x,z). */
export function wall(boxes: Box[], x: number, z: number, len: number, along: Axis, h: number = DIM.wallH, yBase = 0, tex: number = TEX.wall): void {
  boxes.push({
    x,
    y: yBase + h / 2,
    z,
    sx: along === 'x' ? len : DIM.wallT,
    sy: h,
    sz: along === 'z' ? len : DIM.wallT,
    tex,
  });
}

/** A half-height wall (waist-high cover). */
export function halfWall(boxes: Box[], x: number, z: number, len: number, along: Axis, yBase = 0, tex: number = TEX.panel): void {
  wall(boxes, x, z, len, along, DIM.halfH, yBase, tex);
}

/** A floor/ceiling slab whose TOP surface sits at `topY`, thickness DIM.floorT. */
export function floorSlab(boxes: Box[], x: number, z: number, sx: number, sz: number, topY: number, tex: number = TEX.floor): void {
  boxes.push({ x, y: topY - DIM.floorT / 2, z, sx, sy: DIM.floorT, sz, tex });
}

/**
 * A floor slab with a rectangular OPENING (built as 4 slab strips around the hole)
 * so an interior ladder/ramp can pass through and you walk onto the floor above.
 * RULE: openings are sized ≥ 3× the player's width (≥ ~3 m) so movement is clean.
 */
export function floorWithHole(
  boxes: Box[],
  cx: number,
  cz: number,
  sx: number,
  sz: number,
  topY: number,
  holeCx: number,
  holeCz: number,
  holeW: number,
  holeD: number,
  tex: number = TEX.floor,
): void {
  const x0 = cx - sx / 2;
  const x1 = cx + sx / 2;
  const z0 = cz - sz / 2;
  const z1 = cz + sz / 2;
  const hx0 = holeCx - holeW / 2;
  const hx1 = holeCx + holeW / 2;
  const hz0 = holeCz - holeD / 2;
  const hz1 = holeCz + holeD / 2;
  if (hz0 > z0 + 0.05) floorSlab(boxes, cx, (z0 + hz0) / 2, sx, hz0 - z0, topY, tex); // −z strip
  if (z1 > hz1 + 0.05) floorSlab(boxes, cx, (hz1 + z1) / 2, sx, z1 - hz1, topY, tex); // +z strip
  if (hx0 > x0 + 0.05) floorSlab(boxes, (x0 + hx0) / 2, holeCz, hx0 - x0, holeD, topY, tex); // −x strip
  if (x1 > hx1 + 0.05) floorSlab(boxes, (hx1 + x1) / 2, holeCz, x1 - hx1, holeD, topY, tex); // +x strip
}

/** A vertical column (DIM.colT square) from `yBase` up `h`. */
export function column(boxes: Box[], x: number, z: number, h: number, yBase = 0, tex: number = TEX.wall): void {
  boxes.push({ x, y: yBase + h / 2, z, sx: DIM.colT, sy: h, sz: DIM.colT, tex });
}

/** A railing run (DIM.railH tall) sitting on a deck at `deckY`. */
export function railing(boxes: Box[], x: number, z: number, len: number, along: Axis, deckY: number, tex: number = TEX.rail): void {
  boxes.push({
    x,
    y: deckY + DIM.railH / 2,
    z,
    sx: along === 'x' ? len : DIM.railT,
    sy: DIM.railH,
    sz: along === 'z' ? len : DIM.railT,
    tex,
  });
}

/** A wall of length `len` with a centred DIM.doorW × DIM.doorH opening (two side
 *  jambs + a lintel above the door). Entry point for AI/player through-nav. */
export function doorwayWall(boxes: Box[], x: number, z: number, len: number, along: Axis, h: number = DIM.wallH, yBase = 0, tex: number = TEX.wall): void {
  const side = Math.max(0, (len - DIM.doorW) / 2);
  const off = DIM.doorW / 2 + side / 2;
  if (side > 0.05) {
    if (along === 'x') {
      wall(boxes, x - off, z, side, 'x', h, yBase, tex);
      wall(boxes, x + off, z, side, 'x', h, yBase, tex);
    } else {
      wall(boxes, x, z - off, side, 'z', h, yBase, tex);
      wall(boxes, x, z + off, side, 'z', h, yBase, tex);
    }
  }
  if (h > DIM.doorH) {
    const lh = h - DIM.doorH;
    boxes.push({
      x,
      y: yBase + DIM.doorH + lh / 2,
      z,
      sx: along === 'x' ? DIM.doorW : DIM.wallT,
      sy: lh,
      sz: along === 'z' ? DIM.doorW : DIM.wallT,
      tex,
    });
  }
}

/** A wall with a horizontal window band cut out (sill + lintel, gap between). */
export function windowBand(boxes: Box[], x: number, z: number, len: number, along: Axis, yBase = 0, tex: number = TEX.panel): void {
  wall(boxes, x, z, len, along, DIM.windowSill, yBase, tex); // sill
  const lintelBase = yBase + DIM.windowSill + DIM.windowH;
  const lintelH = DIM.wallH - (DIM.windowSill + DIM.windowH);
  if (lintelH > 0.05) wall(boxes, x, z, len, along, lintelH, lintelBase, tex); // lintel
}

/** A walkable stair run (uses the ramp height-function system) at stair width,
 *  climbing from `yLo` to `yHi` along `dir` (points uphill). */
export function stairRun(ramps: Ramp[], x: number, z: number, run: number, dir: Ramp['dir'], yLo: number, yHi: number, tex: number = TEX.rail): void {
  const alongX = dir === '+x' || dir === '-x';
  ramps.push({ x, z, sx: alongX ? run : DIM.stairW, sz: alongX ? DIM.stairW : run, yLo, yHi, dir, tex });
}

/** A ladder (vertical climb zone) with a top-exit direction (exX/exZ unit). */
export function ladder(ladders: Ladder[], x: number, z: number, y0: number, y1: number, exX: number, exZ: number): void {
  ladders.push({ x, z, y0, y1: y1 + 0.5, sx: 0.9, sz: 0.5, exX, exZ });
}

/** An elevated catwalk (thin DIM.catwalkW walkway) at height `atY` with rails on
 *  both long sides. */
export function catwalk(boxes: Box[], x: number, z: number, len: number, along: Axis, atY: number, tex: number = TEX.floor): void {
  const w = DIM.catwalkW;
  floorSlab(boxes, x, z, along === 'x' ? len : w, along === 'z' ? len : w, atY, tex);
  if (along === 'x') {
    railing(boxes, x, z - w / 2, len, 'x', atY);
    railing(boxes, x, z + w / 2, len, 'x', atY);
  } else {
    railing(boxes, x - w / 2, z, len, 'z', atY);
    railing(boxes, x + w / 2, z, len, 'z', atY);
  }
}

/** A wider bridge span (DIM.bridgeW) connecting two elevated points. */
export function bridge(boxes: Box[], x: number, z: number, len: number, along: Axis, atY: number, tex: number = TEX.floor): void {
  const w = DIM.bridgeW;
  floorSlab(boxes, x, z, along === 'x' ? len : w, along === 'z' ? len : w, atY, tex);
  if (along === 'x') {
    railing(boxes, x, z - w / 2, len, 'x', atY);
    railing(boxes, x, z + w / 2, len, 'x', atY);
  } else {
    railing(boxes, x - w / 2, z, len, 'z', atY);
    railing(boxes, x + w / 2, z, len, 'z', atY);
  }
}

/** A combat rooftop: a floor at `atY` railed on all four edges. */
export function roof(boxes: Box[], x: number, z: number, sx: number, sz: number, atY: number, tex: number = TEX.floor): void {
  floorSlab(boxes, x, z, sx, sz, atY, tex);
  railing(boxes, x, z - sz / 2, sx, 'x', atY);
  railing(boxes, x, z + sz / 2, sx, 'x', atY);
  railing(boxes, x - sx / 2, z, sz, 'z', atY);
  railing(boxes, x + sx / 2, z, sz, 'z', atY);
}

/** A cover crate. */
export function crate(boxes: Box[], x: number, z: number, s = 1.4, tex: number = TEX.panel): void {
  boxes.push({ x, y: s / 2, z, sx: s, sy: s, sz: s, tex });
}

/** A cover pillar/pipe. */
export function pillar(boxes: Box[], x: number, z: number, h: number, s = 1, tex: number = TEX.wall): void {
  boxes.push({ x, y: h / 2, z, sx: s, sy: h, sz: s, tex });
}
