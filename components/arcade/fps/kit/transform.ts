/**
 * Module ROTATION. The kit's module builders emit axis-aligned geometry at a
 * centre; to place a module at 90/180/270° we build it at the ORIGIN, then rotate
 * every emitted primitive (box / ladder / ramp) + the returned ModuleMeta by the
 * same linear XZ rotation and translate to the target cell. Because 90/270 is just
 * an axis swap + sign flip, every AABB stays an AABB and every collider stays
 * grid-valid — no arbitrary angles, no collision rewrite.
 *
 * The single source of truth is `rotXZ` (a length-preserving rotation used for
 * BOTH points and direction vectors), so ramp slope directions, ladder exit
 * vectors, and connector normals all stay consistent with the rotated geometry.
 *
 * Imported ONLY by the /arcade chunk.
 */
import type { Box, Ladder, Ramp } from '../level3d';
import type { Cardinal, ModuleMeta, Rect } from './types';
import type { Rot } from './layout';

type GP = { x: number; y: number; z: number }[];

/** Rotate an (x,z) point/vector about the origin by `rot` degrees. */
export function rotXZ(x: number, z: number, rot: Rot): [number, number] {
  switch (rot) {
    case 90:
      return [z, -x];
    case 180:
      return [-x, -z];
    case 270:
      return [-z, x];
    default:
      return [x, z];
  }
}
const swap = (rot: Rot): boolean => rot === 90 || rot === 270;

// Ramp dir ⇄ unit vector (dir points UPHILL).
const DIR_VEC: Record<Ramp['dir'], [number, number]> = { '+x': [1, 0], '-x': [-1, 0], '+z': [0, 1], '-z': [0, -1] };
function vecToDir(dx: number, dz: number): Ramp['dir'] {
  return Math.abs(dx) >= Math.abs(dz) ? (dx >= 0 ? '+x' : '-x') : dz >= 0 ? '+z' : '-z';
}
// Cardinal ⇄ outward normal (N = −z, S = +z, E = +x, W = −x).
const CARD_VEC: Record<Cardinal, [number, number]> = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };
function vecToCard(dx: number, dz: number): Cardinal {
  return Math.abs(dx) >= Math.abs(dz) ? (dx >= 0 ? 'E' : 'W') : dz >= 0 ? 'S' : 'N';
}

function rotRect(rect: Rect, rot: Rot, ox: number, oz: number): Rect {
  const [ax, az] = rotXZ(rect[0], rect[1], rot);
  const [bx, bz] = rotXZ(rect[2], rect[3], rot);
  return [Math.min(ax, bx) + ox, Math.min(az, bz) + oz, Math.max(ax, bx) + ox, Math.max(az, bz) + oz];
}

function transformBox(b: Box, rot: Rot, ox: number, oz: number): Box {
  const [rx, rz] = rotXZ(b.x, b.z, rot);
  return { ...b, x: rx + ox, z: rz + oz, sx: swap(rot) ? b.sz : b.sx, sz: swap(rot) ? b.sx : b.sz };
}
function transformLadder(l: Ladder, rot: Rot, ox: number, oz: number): Ladder {
  const [rx, rz] = rotXZ(l.x, l.z, rot);
  const [ex, ez] = rotXZ(l.exX, l.exZ, rot);
  return { ...l, x: rx + ox, z: rz + oz, sx: swap(rot) ? l.sz : l.sx, sz: swap(rot) ? l.sx : l.sz, exX: ex, exZ: ez };
}
function transformRamp(r: Ramp, rot: Rot, ox: number, oz: number): Ramp {
  const [rx, rz] = rotXZ(r.x, r.z, rot);
  const [dvx, dvz] = DIR_VEC[r.dir];
  const [rdx, rdz] = rotXZ(dvx, dvz, rot);
  return { ...r, x: rx + ox, z: rz + oz, sx: swap(rot) ? r.sz : r.sx, sz: swap(rot) ? r.sx : r.sz, dir: vecToDir(rdx, rdz) };
}
function transformMeta(m: ModuleMeta, rot: Rot, ox: number, oz: number): ModuleMeta {
  const [cx, cz] = rotXZ(m.cx, m.cz, rot);
  const pt = (x: number, z: number): [number, number] => {
    const [rx, rz] = rotXZ(x, z, rot);
    return [rx + ox, rz + oz];
  };
  return {
    ...m,
    cx: cx + ox,
    cz: cz + oz,
    sx: swap(rot) ? m.sz : m.sx,
    sz: swap(rot) ? m.sx : m.sz,
    floors: m.floors.map((f) => ({ y: f.y, rect: rotRect(f.rect, rot, ox, oz) })),
    doorways: m.doorways.map((d) => {
      const [x, z] = pt(d.x, d.z);
      return { x, z, y: d.y };
    }),
    stairs: m.stairs.map((s) => {
      const [x0, z0] = pt(s.x0, s.z0);
      const [x1, z1] = pt(s.x1, s.z1);
      return { x0, z0, y0: s.y0, x1, z1, y1: s.y1 };
    }),
    roof: m.roof ? { y: m.roof.y, rect: rotRect(m.roof.rect, rot, ox, oz) } : undefined,
    connectors: m.connectors.map((c) => {
      const [x, z] = pt(c.x, c.z);
      const [nx, nz] = CARD_VEC[c.side];
      const [rnx, rnz] = rotXZ(nx, nz, rot);
      return { side: vecToCard(rnx, rnz), x, z, y: c.y };
    }),
  };
}

/**
 * Build a module at the origin via `builder`, then rotate + translate all of its
 * emitted geometry and metadata into (cx, cz) at `rot`. Returns the placed meta.
 */
export function placeModule(
  builder: (boxes: Box[], ladders: Ladder[], ramps: Ramp[], gps: GP, cx: number, cz: number) => ModuleMeta,
  rot: Rot,
  cx: number,
  cz: number,
  boxes: Box[],
  ladders: Ladder[],
  ramps: Ramp[],
  gps: GP,
): ModuleMeta {
  const lb: Box[] = [];
  const ll: Ladder[] = [];
  const lr: Ramp[] = [];
  const lg: GP = [];
  const meta = builder(lb, ll, lr, lg, 0, 0);
  for (const b of lb) boxes.push(transformBox(b, rot, cx, cz));
  for (const l of ll) ladders.push(transformLadder(l, rot, cx, cz));
  for (const r of lr) ramps.push(transformRamp(r, rot, cx, cz));
  for (const g of lg) {
    const [x, z] = rotXZ(g.x, g.z, rot);
    gps.push({ x: x + cx, y: g.y, z: z + cz });
  }
  return transformMeta(meta, rot, cx, cz);
}
