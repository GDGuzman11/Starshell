/**
 * Kit PROPS — standalone battlefield objects: cover you fight around (walls,
 * barriers, sandbags, dragon's teeth, rubble, wrecks, containers) plus tall
 * sightline-breakers (fuel tanks, comm towers) and a small open guard post. Each
 * is built from atoms / primitive boxes and returns a minimal ModuleMeta (footprint
 * only — no interior nav), so they place + rotate through the same pipeline as the
 * buildings and block collision / line-of-sight as real geometry.
 *
 * Imported ONLY by the /arcade chunk.
 */
import type { Box } from '../level3d';
import { DIM, TEX } from './types';
import type { ModuleMeta } from './types';
import { barricade, column, crate, doorwayWall, floorSlab, railing, rubble, wall, wreck } from './atoms';

/** Minimal prop meta — footprint + height, no walkable floors or connectors. */
function propMeta(kind: string, cx: number, cz: number, sx: number, sz: number, height: number): ModuleMeta {
  return { kind, cx, cz, sx, sz, height, floors: [], doorways: [], stairs: [], connectors: [] };
}

/** A chest-high straight cover wall — a shield to run behind. */
export function coverWallProp(boxes: Box[], cx: number, cz: number): ModuleMeta {
  wall(boxes, cx, cz, 8, 'x', DIM.halfH + 0.3, 0, TEX.wall);
  return propMeta('coverwall', cx, cz, 8, DIM.wallT, DIM.halfH + 0.3);
}

/** A piled sandbag line (soft cover). */
export function sandbagProp(boxes: Box[], cx: number, cz: number, rand: () => number): ModuleMeta {
  barricade(boxes, cx, cz, 8, 'x', rand);
  return propMeta('sandbags', cx, cz, 8, 1.4, 1.4);
}

/** A shipping container — hard cover you can hug or vault behind. */
export function containerProp(boxes: Box[], cx: number, cz: number): ModuleMeta {
  boxes.push({ x: cx, y: 1.3, z: cz, sx: 6.2, sy: 2.6, sz: 2.6, tex: TEX.panel });
  boxes.push({ x: cx, y: 2.65, z: cz, sx: 6.2, sy: 0.1, sz: 2.6, tex: TEX.rail }); // ribbed lid accent
  return propMeta('container', cx, cz, 6.2, 2.6, 2.7);
}

/** A concrete Jersey barrier — low hard cover, good along lanes. */
export function barrierProp(boxes: Box[], cx: number, cz: number): ModuleMeta {
  boxes.push({ x: cx, y: 0.55, z: cz, sx: 4, sy: 1.1, sz: 0.9, tex: TEX.wall });
  boxes.push({ x: cx, y: 0.2, z: cz, sx: 4, sy: 0.4, sz: 1.4, tex: TEX.wall }); // flared base
  return propMeta('barrier', cx, cz, 4, 1.4, 1.1);
}

/** Dragon's teeth — a staggered row of anti-armour blocks (low, partial cover). */
export function dragonTeethProp(boxes: Box[], cx: number, cz: number): ModuleMeta {
  for (let i = -2; i <= 2; i++) boxes.push({ x: cx + i * 1.3, y: 0.6, z: cz + (i % 2 ? 0.4 : -0.4), sx: 1, sy: 1.2, sz: 1, tex: TEX.wall });
  return propMeta('dragonteeth', cx, cz, 6.6, 1.8, 1.2);
}

/** A fuel/storage tank — tall hard cover + a sightline breaker. */
export function fuelTankProp(boxes: Box[], cx: number, cz: number): ModuleMeta {
  boxes.push({ x: cx, y: 2.4, z: cz, sx: 3.2, sy: 4.8, sz: 3.2, tex: TEX.panel });
  boxes.push({ x: cx, y: 4.9, z: cz, sx: 2.4, sy: 0.5, sz: 2.4, tex: TEX.rail }); // domed cap
  return propMeta('fueltank', cx, cz, 3.2, 3.2, 5);
}

/** A comm/relay tower — a tall thin lattice that blocks long sightlines. */
export function commTowerProp(boxes: Box[], cx: number, cz: number): ModuleMeta {
  const h = 13;
  const s = 1.6;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) boxes.push({ x: cx + sx * s, y: h / 2, z: cz + sz * s, sx: 0.4, sy: h, sz: 0.4, tex: TEX.wall });
  for (const y of [3, 6, 9, 12]) {
    railing(boxes, cx, cz - s, s * 2, 'x', y - DIM.railH);
    railing(boxes, cx, cz + s, s * 2, 'x', y - DIM.railH);
  }
  boxes.push({ x: cx, y: h + 1, z: cz, sx: 0.2, sy: 2, sz: 0.2, tex: TEX.rail }); // antenna
  return propMeta('commtower', cx, cz, s * 2 + 0.4, s * 2 + 0.4, h);
}

/** A small open-topped guard post — 4 walls + a doorway, no roof (a mini strongpoint). */
export function guardPostProp(boxes: Box[], cx: number, cz: number): ModuleMeta {
  const W = 6;
  const hw = W / 2;
  const h = DIM.wallH;
  doorwayWall(boxes, cx, cz - hw, W, 'x', h, 0); // front doorway
  wall(boxes, cx, cz + hw, W, 'x', h, 0);
  wall(boxes, cx - hw, cz, W, 'z', h, 0);
  wall(boxes, cx + hw, cz, W, 'z', h, 0);
  return propMeta('guardpost', cx, cz, W, W, h);
}

/** A stack of supply crates (varied cover). */
export function crateStackProp(boxes: Box[], cx: number, cz: number): ModuleMeta {
  crate(boxes, cx, cz, 1.5);
  crate(boxes, cx + 1.4, cz + 0.3, 1.3);
  crate(boxes, cx - 0.4, cz + 1.3, 1.2);
  boxes.push({ x: cx + 0.5, y: 1.9, z: cz + 0.2, sx: 1.1, sy: 1.1, sz: 1.1, tex: TEX.panel }); // stacked on top
  return propMeta('crates', cx, cz, 3.2, 3, 2.4);
}

/** A rubble heap (collapsed masonry — chest-high cover). */
export function rubbleProp(boxes: Box[], cx: number, cz: number, rand: () => number): ModuleMeta {
  rubble(boxes, cx, cz, 3.4, rand);
  return propMeta('rubble', cx, cz, 4, 4, 2);
}

/** A burnt-out vehicle wreck (hard cover). */
export function wreckProp(boxes: Box[], cx: number, cz: number, rand: () => number): ModuleMeta {
  wreck(boxes, cx, cz, rand);
  return propMeta('wreck', cx, cz, 4, 3, 2);
}

// ── RESUPPLY (wired to the game — see useFpsLoop) ────────────────────────────

/** A RESUPPLY STATION — a small tower-sized canopy you walk under: standing inside
 *  it continuously replenishes BOTH ammo and shield (reusable). */
export function stationProp(boxes: Box[], cx: number, cz: number): ModuleMeta {
  const W = 6;
  const hw = W / 2;
  const h = 5;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) column(boxes, cx + sx * (hw - 0.4), cz + sz * (hw - 0.4), h, 0, TEX.wall);
  floorSlab(boxes, cx, cz, W, W, h); // canopy roof
  boxes.push({ x: cx, y: 0.7, z: cz, sx: 1.6, sy: 1.4, sz: 1.6, tex: TEX.rail }); // glowing resupply core
  return propMeta('station', cx, cz, W, W, h);
}

/** An AMMO crate — auto-grabbed when you're right beside it (bursts ammo, then
 *  briefly cools down). Amber marker in-world. */
export function ammoCrateProp(boxes: Box[], cx: number, cz: number): ModuleMeta {
  boxes.push({ x: cx, y: 0.9, z: cz, sx: 2, sy: 1.8, sz: 2, tex: TEX.panel });
  boxes.push({ x: cx, y: 1.85, z: cz, sx: 2.15, sy: 0.18, sz: 2.15, tex: TEX.rail }); // lid band
  return propMeta('ammocrate', cx, cz, 2, 2, 2);
}

/** A SHIELD crate — auto-grabbed when you're right beside it (bursts overshield,
 *  then briefly cools down). Cyan marker in-world. */
export function shieldCrateProp(boxes: Box[], cx: number, cz: number): ModuleMeta {
  boxes.push({ x: cx, y: 0.9, z: cz, sx: 2, sy: 1.8, sz: 2, tex: TEX.panel });
  boxes.push({ x: cx, y: 1.85, z: cz, sx: 2.15, sy: 0.18, sz: 2.15, tex: TEX.rail });
  return propMeta('shieldcrate', cx, cz, 2, 2, 2);
}
