/**
 * Combat raycasting — used for hitscan weapons, enemy line-of-sight, and shot
 * blocking. All against the level's axis-aligned box colliders + enemy spheres.
 * Vectors are [x, y, z]; directions are unit-length so `t` is world distance.
 */
import type { Box, Level3D } from './level3d';
import type { SpatialGrid } from './level/grid';

export type Vec3 = [number, number, number];

/** Ray vs AABB (slab method). Returns entry distance or Infinity. */
function rayBox(o: Vec3, d: Vec3, b: Box): number {
  let tmin = 0;
  let tmax = Infinity;
  const lo = [b.x - b.sx / 2, b.y - b.sy / 2, b.z - b.sz / 2];
  const hi = [b.x + b.sx / 2, b.y + b.sy / 2, b.z + b.sz / 2];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-8) {
      if (o[i] < lo[i] || o[i] > hi[i]) return Infinity;
    } else {
      let t1 = (lo[i] - o[i]) / d[i];
      let t2 = (hi[i] - o[i]) / d[i];
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return Infinity;
    }
  }
  return tmin;
}

/** Nearest wall hit distance along a ray (capped at maxD).
 *  With a grid, only candidate boxes along the ray are tested (identical math). */
export function rayWallDist(o: Vec3, d: Vec3, lvl: Level3D, maxD: number, grid?: SpatialGrid): number {
  let best = maxD;
  const boxes = grid ? grid.queryRay(o[0], o[2], d[0], d[2], maxD) : lvl.boxes;
  for (let i = 0; i < boxes.length; i++) {
    const t = rayBox(o, d, boxes[i]);
    if (t < best) best = t;
  }
  return best;
}

/** Is the straight segment a→b blocked by any wall? */
export function segBlocked(a: Vec3, b: Vec3, lvl: Level3D, grid?: SpatialGrid): boolean {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  const len = Math.hypot(dx, dy, dz);
  if (len < 1e-6) return false;
  const dir: Vec3 = [dx / len, dy / len, dz / len];
  return rayWallDist(a, dir, lvl, len - 0.2, grid) < len - 0.2;
}

/** Does the segment a→b pass within radius r of centre c? (smoke LoS block). */
export function segHitsSphere(a: Vec3, b: Vec3, c: Vec3, r: number): boolean {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  const len2 = dx * dx + dy * dy + dz * dz || 1e-6;
  let t = ((c[0] - a[0]) * dx + (c[1] - a[1]) * dy + (c[2] - a[2]) * dz) / len2;
  t = Math.max(0, Math.min(1, t));
  const px = a[0] + dx * t - c[0];
  const py = a[1] + dy * t - c[1];
  const pz = a[2] + dz * t - c[2];
  return px * px + py * py + pz * pz < r * r;
}

/** Ray vs sphere — entry distance or Infinity. */
export function raySphere(o: Vec3, d: Vec3, c: Vec3, r: number): number {
  const ox = o[0] - c[0];
  const oy = o[1] - c[1];
  const oz = o[2] - c[2];
  const b = ox * d[0] + oy * d[1] + oz * d[2];
  const cc = ox * ox + oy * oy + oz * oz - r * r;
  const disc = b * b - cc;
  if (disc < 0) return Infinity;
  const t = -b - Math.sqrt(disc);
  return t < 0 ? Infinity : t;
}
