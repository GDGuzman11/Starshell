/**
 * 3D arena level — axis-aligned boxes (each a solid collider AND a textured
 * mesh) + ladders (climb zones with a top exit dir) + spawn. Y is up.
 *
 * A varied "warzone city": walled buildings (window bands → they read as
 * buildings, with an open front for entry / shooting), drawn from several
 * archetypes and placed so multi-floor towers sit FAR apart. 3-floor towers go
 * up via an external ground→2nd ladder, then an interior ladder in the open
 * front up onto a back mezzanine (a big, easy 3rd-floor opening). Map size
 * scales with the chosen enemy count.
 */
import { rng } from './rand';

export interface Box {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  tex: number;
}

export interface Ladder {
  x: number;
  z: number;
  y0: number;
  y1: number;
  sx: number;
  sz: number;
  exX: number; // unit dir to step onto the floor at the top
  exZ: number;
}

export interface JumpPad {
  x: number;
  z: number;
  r: number;
  power: number;
}

export interface Zipline {
  x0: number;
  y0: number;
  z0: number;
  x1: number;
  y1: number;
  z1: number;
}

export interface Level3D {
  boxes: Box[];
  ladders: Ladder[];
  pads: JumpPad[];
  ziplines: Zipline[];
  spawn: { x: number; z: number; yaw: number };
  /** Far end of the arena where enemies start (opposite the player spawn). */
  enemySpawn: { x: number; z: number };
  size: number;
  seed: number;
}

type Rnd = () => number;
const WALL_H = 4.5;

/** A deck corner of a 3-floor tower nearest the target (away from the front
 *  ladder), pulled slightly inward so it sits on the mezzanine. */
function nearestDeckCorner(
  t: { x: number; z: number; half: number },
  target: { x: number; z: number },
): { x: number; z: number } {
  const pts: { x: number; z: number }[] = [];
  for (const sx of [-1, 1]) {
    pts.push({ x: t.x + sx * (t.half - 0.5), z: t.z + 0.5 });
    pts.push({ x: t.x + sx * (t.half - 0.5), z: t.z + t.half - 0.5 });
  }
  return pts.reduce((best, c) =>
    Math.hypot(c.x - target.x, c.z - target.z) < Math.hypot(best.x - target.x, best.z - target.z) ? c : best,
  );
}

function columns(boxes: Box[], cx: number, cz: number, half: number, top: number): void {
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      boxes.push({ x: cx + sx * half, y: top / 2, z: cz + sz * half, sx: 0.4, sy: top, sz: 0.4, tex: 0 });
}

/** A wall for one story with a window band cut out (sill + lintel). */
function windowWall(boxes: Box[], cx: number, cz: number, sx: number, sz: number, yBase: number): void {
  boxes.push({ x: cx, y: yBase + 0.5, z: cz, sx, sy: 1, sz, tex: 1 }); // sill
  boxes.push({ x: cx, y: yBase + 2.6, z: cz, sx, sy: 0.8, sz, tex: 1 }); // lintel
}

/** Window walls on −x, +x and +z (open front on −z) for a story. */
function shell(boxes: Box[], cx: number, cz: number, half: number, bw: number, yBase: number): void {
  windowWall(boxes, cx - half, cz, 0.3, bw, yBase);
  windowWall(boxes, cx + half, cz, 0.3, bw, yBase);
  windowWall(boxes, cx, cz + half, bw, 0.3, yBase);
}

/** 3-floor walled building: external ground→2nd ladder, interior ladder up to a
 *  back mezzanine (the open front is the big 3rd-floor access + shoot-down). */
function tower3(boxes: Box[], ladders: Ladder[], cx: number, cz: number, bw: number): void {
  const half = bw / 2;
  const F2 = 3;
  const F3 = 6;
  const top = F3 + 0.6;
  const slab = 0.3;
  columns(boxes, cx, cz, half, top);
  shell(boxes, cx, cz, half, bw, 0); // ground story walls
  shell(boxes, cx, cz, half, bw, F2); // 2nd story walls

  boxes.push({ x: cx, y: F2 - slab / 2, z: cz, sx: bw, sy: slab, sz: bw, tex: 3 }); // 2nd floor
  // 3rd-floor mezzanine over the back half (front half open = the access/opening)
  boxes.push({ x: cx, y: F3 - slab / 2, z: cz + half / 2, sx: bw, sy: slab, sz: half, tex: 3 });

  ladders.push({ x: cx, z: cz - half - 0.35, y0: 0, y1: F2 + 0.5, sx: 0.9, sz: 0.45, exX: 0, exZ: 1 });
  ladders.push({ x: cx, z: cz - 0.5, y0: F2, y1: F3 + 0.5, sx: 1, sz: 0.9, exX: 0, exZ: 1 });
}

/** 2-floor walled perch: ground walls + open upper deck, external ladder. */
function tower2(boxes: Box[], ladders: Ladder[], cx: number, cz: number, bw: number): void {
  const half = bw / 2;
  const F2 = 3;
  const top = F2 + 0.6;
  const slab = 0.3;
  columns(boxes, cx, cz, half, top);
  shell(boxes, cx, cz, half, bw, 0);
  boxes.push({ x: cx, y: F2 - slab / 2, z: cz, sx: bw, sy: slab, sz: bw, tex: 3 });
  // perch rails on 3 sides (open front −z)
  boxes.push({ x: cx - half, y: F2 + 0.4, z: cz, sx: 0.2, sy: 0.8, sz: bw, tex: 2 });
  boxes.push({ x: cx + half, y: F2 + 0.4, z: cz, sx: 0.2, sy: 0.8, sz: bw, tex: 2 });
  boxes.push({ x: cx, y: F2 + 0.4, z: cz + half, sx: bw, sy: 0.8, sz: 0.2, tex: 2 });
  ladders.push({ x: cx, z: cz - half - 0.35, y0: 0, y1: F2 + 0.5, sx: 0.9, sz: 0.45, exX: 0, exZ: 1 });
}

/** Open raised platform on columns — quick sniper deck. */
function platform(boxes: Box[], ladders: Ladder[], cx: number, cz: number, bw: number): void {
  const half = bw / 2;
  const H = 2.6;
  const slab = 0.3;
  columns(boxes, cx, cz, half, H + 0.5);
  boxes.push({ x: cx, y: H - slab / 2, z: cz, sx: bw, sy: slab, sz: bw, tex: 3 });
  boxes.push({ x: cx, y: H + 0.4, z: cz + half, sx: bw, sy: 0.8, sz: 0.2, tex: 2 });
  ladders.push({ x: cx, z: cz - half - 0.35, y0: 0, y1: H + 0.5, sx: 0.9, sz: 0.45, exX: 0, exZ: 1 });
}

/** Ground cover bunker — U of low walls + a crate. */
function bunker(boxes: Box[], cx: number, cz: number, bw: number, r: Rnd): void {
  const half = bw / 2;
  const h = 2.2;
  boxes.push({ x: cx, y: h / 2, z: cz + half, sx: bw, sy: h, sz: 0.4, tex: 1 });
  boxes.push({ x: cx - half, y: h / 2, z: cz, sx: 0.4, sy: h, sz: bw, tex: 1 });
  boxes.push({ x: cx + half, y: h / 2, z: cz, sx: 0.4, sy: h, sz: bw, tex: 1 });
  boxes.push({ x: cx, y: 0.6, z: cz, sx: 1.2, sy: 1.2, sz: 1.2, tex: 1 + Math.floor(r() * 3) });
}

/** A big elevated plateau ("hill") with a ladder up + cover blocks on top. */
function hill(boxes: Box[], ladders: Ladder[], cx: number, cz: number, w: number): void {
  const H = 3;
  const half = w / 2;
  boxes.push({ x: cx, y: H / 2, z: cz, sx: w, sy: H, sz: w, tex: 1 }); // plateau body
  ladders.push({ x: cx, z: cz - half - 0.35, y0: 0, y1: H + 0.5, sx: 0.9, sz: 0.45, exX: 0, exZ: 1 });
  boxes.push({ x: cx - half * 0.4, y: H + 0.7, z: cz + half * 0.3, sx: 2, sy: 1.4, sz: 2, tex: 2 });
  boxes.push({ x: cx + half * 0.4, y: H + 0.7, z: cz - half * 0.2, sx: 1.6, sy: 1.4, sz: 1.6, tex: 3 });
}

export function makeArena3D(enemyCount: number, seed: number): Level3D {
  const r = rng(seed);
  const size = (22 + enemyCount * 6) * 2;
  const half = size / 2;
  const boxes: Box[] = [];
  const ladders: Ladder[] = [];

  // Player and enemies start at OPPOSITE ends of the arena.
  const playerSpawn = { x: 0, z: -half * 0.78, yaw: Math.PI };
  const enemySpawn = { x: 0, z: half * 0.78 };
  const clearOf = (x: number, z: number): boolean =>
    Math.hypot(x - playerSpawn.x, z - playerSpawn.z) < 11 ||
    Math.hypot(x - enemySpawn.x, z - enemySpawn.z) < 11;

  boxes.push({ x: 0, y: WALL_H / 2, z: -half, sx: size, sy: WALL_H, sz: 0.6, tex: 0 });
  boxes.push({ x: 0, y: WALL_H / 2, z: half, sx: size, sy: WALL_H, sz: 0.6, tex: 0 });
  boxes.push({ x: -half, y: WALL_H / 2, z: 0, sx: 0.6, sy: WALL_H, sz: size, tex: 0 });
  boxes.push({ x: half, y: WALL_H / 2, z: 0, sx: 0.6, sy: WALL_H, sz: size, tex: 0 });

  const placed: { x: number; z: number; rad: number }[] = [];
  const towers3: { x: number; z: number; half: number }[] = [];
  const tryPlace = (rad: number, minGap: number): { x: number; z: number } | null => {
    for (let t = 0; t < 24; t++) {
      const x = (r() * 2 - 1) * (half - rad - 2);
      const z = (r() * 2 - 1) * (half - rad - 2);
      if (clearOf(x, z)) continue;
      if (!placed.some((p) => Math.hypot(x - p.x, z - p.z) < p.rad / 2 + rad / 2 + minGap)) return { x, z };
    }
    return null;
  };

  // A fully elevated "hill" plateau (placed first so everything avoids it).
  const hillW = Math.min(22, size * 0.22);
  const hillX = half * 0.55;
  const hillZ = -half * 0.55;
  hill(boxes, ladders, hillX, hillZ, hillW);
  placed.push({ x: hillX, z: hillZ, rad: hillW });

  // Multi-floor towers FIRST, spaced FAR apart. Force the first few to be
  // 3-floor towers so there are enough rooftops to string ziplines between.
  const towerCount = Math.max(4, Math.round(size / 18));
  for (let i = 0; i < towerCount; i++) {
    const bw = 6 + r() * 3;
    const pos = tryPlace(bw, size * 0.22);
    if (!pos) continue;
    placed.push({ x: pos.x, z: pos.z, rad: bw });
    const isT3 = i < 3 || r() < 0.5;
    (isT3 ? tower3 : tower2)(boxes, ladders, pos.x, pos.z, bw);
    if (isT3) towers3.push({ x: pos.x, z: pos.z, half: bw / 2 });
  }
  // Then smaller structures fill the gaps (platforms + bunkers).
  const fillers = Math.round(size / 6);
  for (let i = 0; i < fillers; i++) {
    const bw = 4 + r() * 3;
    const pos = tryPlace(bw, 5);
    if (!pos) continue;
    placed.push({ x: pos.x, z: pos.z, rad: bw });
    if (r() < 0.5) platform(boxes, ladders, pos.x, pos.z, bw);
    else bunker(boxes, pos.x, pos.z, bw, r);
  }

  // Cover pillars (avoid spawn + structures).
  const pillars = Math.round(size * 0.45);
  for (let i = 0; i < pillars; i++) {
    const x = (r() * 2 - 1) * (half - 3);
    const z = (r() * 2 - 1) * (half - 3);
    if (clearOf(x, z)) continue;
    if (placed.some((p) => Math.abs(x - p.x) < p.rad / 2 + 2 && Math.abs(z - p.z) < p.rad / 2 + 2)) continue;
    const h = 1.2 + r() * 2;
    const s = 0.9 + r() * 1.2;
    boxes.push({ x, y: h / 2, z, sx: s, sy: h, sz: s, tex: 1 + Math.floor(r() * 3) });
  }

  // Ziplines connecting 3-floor towers, rooftop-to-rooftop (≤ 3). Each is
  // anchored at the deck corner nearest the target tower (away from the front
  // ladder), so it visibly faces the tower it connects to.
  // Each zipline links a DISTINCT pair of towers — (0,1), (2,3), (4,5) — so no
  // tower is reused (no "circle"); every hook goes to a different building.
  const ziplines: Zipline[] = [];
  const Y3 = 6; // 3rd-floor deck height
  for (let a = 0; a + 1 < towers3.length && ziplines.length < 3; a += 2) {
    const A = towers3[a];
    const B = towers3[a + 1];
    const ca = nearestDeckCorner(A, B);
    const cb = nearestDeckCorner(B, A);
    ziplines.push({ x0: ca.x, y0: Y3, z0: ca.z, x1: cb.x, y1: Y3, z1: cb.z });
  }

  // Jump pads scattered in the open (surprise verticality).
  const pads: JumpPad[] = [];
  const padN = Math.round(size / 12);
  for (let i = 0; i < padN; i++) {
    const x = (r() * 2 - 1) * (half - 4);
    const z = (r() * 2 - 1) * (half - 4);
    if (Math.hypot(x, z) < 6) continue;
    if (placed.some((p) => Math.abs(x - p.x) < p.rad / 2 + 2 && Math.abs(z - p.z) < p.rad / 2 + 2)) continue;
    pads.push({ x, z, r: 1.1, power: 13 });
  }

  return { boxes, ladders, pads, ziplines, spawn: playerSpawn, enemySpawn, size, seed };
}
