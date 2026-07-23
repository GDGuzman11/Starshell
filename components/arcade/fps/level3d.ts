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
import type { ModuleMeta } from './kit/types';

export interface Box {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  tex: number;
  hp?: number; // structural HP (lazy-init on first hit); destructible by gunfire
  maxHp?: number;
  dead?: boolean; // destroyed: skipped by collision / LoS / shots, mesh hidden
  indestructible?: boolean; // arena borders: block shots/LoS but never take damage or break
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

/**
 * A walkable sloped surface (NOT a solid box collider — a height FUNCTION).
 * Footprint is the XZ rect centred on (x,z) with extents (sx,sz). The surface
 * rises from `yLo` to `yHi` along `dir` across that footprint. Height at a point
 * inside the footprint = lerp(yLo, yHi, frac), where frac is the normalized
 * position along `dir` (0 at the low edge → 1 at the high edge), clamped to
 * [yLo, yHi]. Physics snaps the player/enemies onto this surface; the rendered
 * mesh is purely visual.
 */
export interface Ramp {
  x: number;
  z: number;
  sx: number;
  sz: number;
  yLo: number;
  yHi: number;
  dir: '+x' | '-x' | '+z' | '-z';
  tex: number;
}

export interface Level3D {
  boxes: Box[];
  ladders: Ladder[];
  pads: JumpPad[];
  ziplines: Zipline[];
  /** Optional sloped walkable surfaces (Phase 3). Absent on older levels. */
  ramps?: Ramp[];
  spawn: { x: number; z: number; yaw: number };
  /** Far end of the arena where enemies start (opposite the player spawn). */
  enemySpawn: { x: number; z: number };
  /** Rooftop/perch points the player can GRAPPLE to (aim near one + press grapple).
   *  Each is a safe standing spot on top of a building (feet height). */
  grapplePoints?: { x: number; y: number; z: number }[];
  /** Modular-kit structures + their nav/AI hints (present on modular arenas). */
  modules?: ModuleMeta[];
  /** Visual theme id (sky/fog/textures). Undefined = the original seeded look. */
  theme?: string;
  size: number;
  seed: number;
}

/** Is (px,pz) within the ramp's XZ footprint? */
export function rampContains(rmp: Ramp, px: number, pz: number): boolean {
  return (
    px >= rmp.x - rmp.sx / 2 &&
    px <= rmp.x + rmp.sx / 2 &&
    pz >= rmp.z - rmp.sz / 2 &&
    pz <= rmp.z + rmp.sz / 2
  );
}

/** Surface height of the ramp at (px,pz). Caller should check rampContains first;
 *  frac is clamped so the result is always within [yLo, yHi]. */
export function rampHeightAt(rmp: Ramp, px: number, pz: number): number {
  let frac: number;
  switch (rmp.dir) {
    case '+x':
      frac = (px - (rmp.x - rmp.sx / 2)) / rmp.sx;
      break;
    case '-x':
      frac = ((rmp.x + rmp.sx / 2) - px) / rmp.sx;
      break;
    case '+z':
      frac = (pz - (rmp.z - rmp.sz / 2)) / rmp.sz;
      break;
    case '-z':
    default:
      frac = ((rmp.z + rmp.sz / 2) - pz) / rmp.sz;
      break;
  }
  if (frac < 0) frac = 0;
  else if (frac > 1) frac = 1;
  return rmp.yLo + (rmp.yHi - rmp.yLo) * frac;
}

type Rnd = () => number;
const WALL_H = 4.5;

/** ONE grapple landing spot per roof, on the EDGE FACING THE ARENA CENTRE (pulled
 *  `inset` onto the deck so landing is inside the rail). An edge point is what's
 *  actually VISIBLE from the ground looking up — a centre point is occluded by the
 *  roof — and the centre-facing side is the most-approached / most-visible one. */
export function roofGrapplePoint(cx: number, cz: number, half: number, y: number, inset = 1.3): { x: number; y: number; z: number } {
  const e = Math.max(0.6, half - inset);
  if (Math.abs(cx) >= Math.abs(cz)) return { x: cx - Math.sign(cx || 1) * e, y, z: cz }; // ±x edge toward centre
  return { x: cx, y, z: cz - Math.sign(cz || 1) * e }; // ±z edge toward centre
}

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
  boxes.push({ x: cx, y: yBase + 0.5, z: cz, sx, sy: 1, sz, tex: 1 }); // sill (0–1 m)
  boxes.push({ x: cx, y: yBase + 3.5, z: cz, sx, sy: 0.6, sz, tex: 1 }); // lintel (3.2–3.8 m — clears tall heads)
}

/** Window walls on −x, +x and +z (open front on −z) for a story. */
function shell(boxes: Box[], cx: number, cz: number, half: number, bw: number, yBase: number): void {
  windowWall(boxes, cx - half, cz, 0.3, bw, yBase);
  windowWall(boxes, cx + half, cz, 0.3, bw, yBase);
  windowWall(boxes, cx, cz + half, bw, 0.3, yBase);
}

const FLOOR_H = 4; // height between floors — enlarged so the taller BLACKSTAR LEGION units
// (up to the 3.1 m Suppressor) fit under decks + through openings with headroom (was 3).

/** Multi-floor walled building. Every floor is a FULL deck (walls on 3 sides,
 *  open front −z). A switchback of external front ladders connects each floor to
 *  the one above it: you reach the next ladder by walking across the floor you
 *  just climbed onto. Top deck has rails. `floors` = number of levels. */
function towerN(boxes: Box[], ladders: Ladder[], cx: number, cz: number, bw: number, floors: number): void {
  const half = bw / 2;
  const slab = 0.3;
  const roof = (floors - 1) * FLOOR_H; // top deck height
  const top = roof + 0.6;
  columns(boxes, cx, cz, half, top);
  for (let f = 0; f < floors - 1; f++) shell(boxes, cx, cz, half, bw, f * FLOOR_H); // story walls
  // Full floor decks for every upper level (the ground is the world floor).
  for (let f = 1; f < floors; f++) {
    boxes.push({ x: cx, y: f * FLOOR_H - slab / 2, z: cz, sx: bw, sy: slab, sz: bw, tex: 3 });
  }
  // ONE continuous ladder up the open front face — ground straight to the top deck
  // (no switchback / no cut segments).
  ladders.push({ x: cx, z: cz - half - 0.35, y0: 0, y1: roof + 0.5, sx: 1.6, sz: 0.5, exX: 0, exZ: 1 });
  // Top deck is OPEN — no rails (removed per design).
}

/** 2-floor walled perch: ground walls + open upper deck, external ladder. */
function tower2(boxes: Box[], ladders: Ladder[], cx: number, cz: number, bw: number): void {
  const half = bw / 2;
  const F2 = FLOOR_H;
  const top = F2 + 0.6;
  const slab = 0.3;
  columns(boxes, cx, cz, half, top);
  shell(boxes, cx, cz, half, bw, 0);
  boxes.push({ x: cx, y: F2 - slab / 2, z: cz, sx: bw, sy: slab, sz: bw, tex: 3 });
  // Open deck — no rails (removed per design).
  ladders.push({ x: cx, z: cz - half - 0.35, y0: 0, y1: F2 + 0.5, sx: 1.6, sz: 0.45, exX: 0, exZ: 1 });
}

/** Open raised platform on columns — quick sniper deck. */
function platform(boxes: Box[], ladders: Ladder[], cx: number, cz: number, bw: number): void {
  const half = bw / 2;
  const H = 3.6; // raised so tall units clear the underside (was 2.6)
  const slab = 0.3;
  columns(boxes, cx, cz, half, H + 0.5);
  boxes.push({ x: cx, y: H - slab / 2, z: cz, sx: bw, sy: slab, sz: bw, tex: 3 });
  // Open platform — no rail (removed per design).
  ladders.push({ x: cx, z: cz - half - 0.35, y0: 0, y1: H + 0.5, sx: 1.6, sz: 0.45, exX: 0, exZ: 1 });
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
  ladders.push({ x: cx, z: cz - half - 0.35, y0: 0, y1: H + 0.5, sx: 1.6, sz: 0.45, exX: 0, exZ: 1 });
  boxes.push({ x: cx - half * 0.4, y: H + 0.7, z: cz + half * 0.3, sx: 2, sy: 1.4, sz: 2, tex: 2 });
  boxes.push({ x: cx + half * 0.4, y: H + 0.7, z: cz - half * 0.2, sx: 1.6, sy: 1.4, sz: 1.6, tex: 3 });
}

// ── Terrain primitives (Phase 3) ─────────────────────────────────────────────
// Helpers that emit a Ramp and/or boxes to raise ground or ring a sunken area.
// All elevation goes UP from y=0; a "trench/underground" is a flat base-level
// floor surrounded by raised berm boxes, reached by a ramp leading DOWN into it.
// (The world floor stays at y=0 — nothing is authored below it.)

/** Emit one walkable ramp. `dir` points UPHILL (toward yHi). */
function ramp(
  ramps: Ramp[],
  x: number,
  z: number,
  sx: number,
  sz: number,
  yLo: number,
  yHi: number,
  dir: Ramp['dir'],
  tex = 2,
): void {
  ramps.push({ x, z, sx, sz, yLo, yHi, dir, tex });
}

/** A raised berm/wall of ground (a solid box from y=0 up to height h). */
function berm(boxes: Box[], x: number, z: number, sx: number, sz: number, h: number, tex = 1): void {
  boxes.push({ x, y: h / 2, z, sx, sy: h, sz, tex });
}

/** A single raised ground step (alias of berm, semantic name for stair runs). */
function step(boxes: Box[], x: number, z: number, sx: number, sz: number, h: number, tex = 1): void {
  berm(boxes, x, z, sx, sz, h, tex);
}

/**
 * A "sunken" area: a flat base-level floor (y=0) ringed by raised berm walls of
 * height `wall`, so it reads as a pit relative to the wall tops. A GAP on the
 * `entry` side has NO berm; instead an UP-and-OVER ramp pair lets you reach it
 * from the surrounding y=0 ground: an outer up-ramp (0 → wall) climbing to the
 * berm crest, then an inner down-ramp (wall → 0) descending to the trench floor.
 * Everything stays at y≥0; "underground" is purely the berm height around you.
 */
function trench(
  boxes: Box[],
  ramps: Ramp[],
  cx: number,
  cz: number,
  w: number,
  d: number,
  wall: number,
  entry: Ramp['dir'],
  tex = 1,
): void {
  const hw = w / 2;
  const hd = d / 2;
  const t = 1.0; // berm thickness
  const gap = Math.min(w, d) * 0.5; // opening width for the ramp pair
  // Ring the trench with berms, leaving a gap on the `entry` side.
  const fullX = (z: number) => berm(boxes, cx, z, w + 2 * t, t, wall, tex); // wall spanning X
  const fullZ = (x: number) => berm(boxes, x, cz, t, d + 2 * t, wall, tex); // wall spanning Z
  const stubX = (z: number) => {
    const seg = (w + 2 * t - gap) / 2;
    berm(boxes, cx - (gap / 2 + seg / 2), z, seg, t, wall, tex);
    berm(boxes, cx + (gap / 2 + seg / 2), z, seg, t, wall, tex);
  };
  const stubZ = (x: number) => {
    const seg = (d + 2 * t - gap) / 2;
    berm(boxes, x, cz - (gap / 2 + seg / 2), t, seg, wall, tex);
    berm(boxes, x, cz + (gap / 2 + seg / 2), t, seg, wall, tex);
  };
  if (entry === '-z') stubX(cz - hd - t / 2); else fullX(cz - hd - t / 2);
  if (entry === '+z') stubX(cz + hd + t / 2); else fullX(cz + hd + t / 2);
  if (entry === '-x') stubZ(cx - hw - t / 2); else fullZ(cx - hw - t / 2);
  if (entry === '+x') stubZ(cx + hw + t / 2); else fullZ(cx + hw + t / 2);

  // Up-and-over ramp pair through the gap; both high ends meet at the berm crest.
  // The high end (yHi) of each ramp points TOWARD the crest.
  const run = wall * 2.2; // gentle slope run per ramp
  if (entry === '-z') {
    const crest = cz - hd - t / 2; // berm centre line (−z side)
    ramp(ramps, cx, crest - run / 2, gap, run, 0, wall, '+z', tex); // outer: low at −z, high at crest
    ramp(ramps, cx, crest + run / 2, gap, run, 0, wall, '-z', tex); // inner: high at crest, low into pit
  } else if (entry === '+z') {
    const crest = cz + hd + t / 2;
    ramp(ramps, cx, crest + run / 2, gap, run, 0, wall, '-z', tex);
    ramp(ramps, cx, crest - run / 2, gap, run, 0, wall, '+z', tex);
  } else if (entry === '-x') {
    const crest = cx - hw - t / 2;
    ramp(ramps, crest - run / 2, cz, run, gap, 0, wall, '+x', tex);
    ramp(ramps, crest + run / 2, cz, run, gap, 0, wall, '-x', tex);
  } else {
    const crest = cx + hw + t / 2;
    ramp(ramps, crest + run / 2, cz, run, gap, 0, wall, '-x', tex);
    ramp(ramps, crest - run / 2, cz, run, gap, 0, wall, '+x', tex);
  }
}

/** A stepped plateau: a stack of shrinking berm boxes (visual stairs you can
 *  step-up onto). Not used by the demo but available for the generator. */
function plateauStepped(boxes: Box[], cx: number, cz: number, w: number, steps: number, stepH: number, tex = 1): void {
  for (let i = 0; i < steps; i++) {
    const s = w * (1 - i / (steps + 1));
    step(boxes, cx, cz, s, s, (i + 1) * stepH, tex);
  }
}

export function makeArena3D(enemyCount: number, seed: number): Level3D {
  const r = rng(seed);
  const size = (22 + enemyCount * 6) * 2;
  const half = size / 2;
  const boxes: Box[] = [];
  const ladders: Ladder[] = [];
  const ramps: Ramp[] = [];

  // Player and enemies start at OPPOSITE ends of the arena.
  const playerSpawn = { x: 0, z: -half * 0.78, yaw: Math.PI };
  const enemySpawn = { x: 0, z: half * 0.78 };
  const clearOf = (x: number, z: number): boolean =>
    Math.hypot(x - playerSpawn.x, z - playerSpawn.z) < 11 ||
    Math.hypot(x - enemySpawn.x, z - enemySpawn.z) < 11;

  boxes.push({ x: 0, y: WALL_H / 2, z: -half, sx: size, sy: WALL_H, sz: 0.6, tex: 0, indestructible: true });
  boxes.push({ x: 0, y: WALL_H / 2, z: half, sx: size, sy: WALL_H, sz: 0.6, tex: 0, indestructible: true });
  boxes.push({ x: -half, y: WALL_H / 2, z: 0, sx: 0.6, sy: WALL_H, sz: size, tex: 0, indestructible: true });
  boxes.push({ x: half, y: WALL_H / 2, z: 0, sx: 0.6, sy: WALL_H, sz: size, tex: 0, indestructible: true });

  const placed: { x: number; z: number; rad: number }[] = [];
  const towers3: { x: number; z: number; half: number }[] = [];
  const grapplePoints: { x: number; y: number; z: number }[] = [];
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
  grapplePoints.push(roofGrapplePoint(hillX, hillZ, hillW / 2, 3.05)); // hill top edge (H=3)

  // Phase-3 demo terrain (placed before towers so they avoid it): a ramp up onto
  // a raised plateau, and one sunken "trench" (berm-ringed pit at y≥0 with entry
  // ramps). Exercises the ramp/trench primitives in-game; the Phase-5 generator
  // will place these properly per archetype.
  const plX = -size * 0.18;
  const plZ = size * 0.12;
  const plH = 2.5;
  berm(boxes, plX, plZ, 8, 6, plH); // raised plateau (8 wide × 6 deep, top at plH)
  // RULE (also for the Phase-5 generator): a ramp that leads up to a platform must
  // LAND on it — its high edge sits EXACTLY at the platform's near edge (plZ-3) at
  // the platform's top height, and matches the platform width — so you walk
  // straight onto the deck with no step/gap at the seam.
  ramp(ramps, plX, plZ - 6, 8, 6, 0, plH, '+z'); // high edge = plZ-3 = plateau −z edge, full width
  placed.push({ x: plX, z: plZ - 3, rad: 18 });
  const trX = size * 0.18;
  const trZ = -size * 0.12;
  trench(boxes, ramps, trX, trZ, 10, 10, 2.5, '-z'); // sunken area + over-the-berm entry ramps
  placed.push({ x: trX, z: trZ, rad: 18 });

  // Multi-floor towers FIRST, spaced FAR apart. Force the first few to be tall
  // 6-floor towers so there are enough rooftops to string ziplines between.
  const TOWER_FLOORS = 6;
  const towerCount = Math.max(4, Math.round(size / 18));
  for (let i = 0; i < towerCount; i++) {
    const bw = 6 + r() * 3;
    const pos = tryPlace(bw, size * 0.22);
    if (!pos) continue;
    placed.push({ x: pos.x, z: pos.z, rad: bw });
    const isTall = i < 3 || r() < 0.5;
    if (isTall) towerN(boxes, ladders, pos.x, pos.z, bw, TOWER_FLOORS);
    else tower2(boxes, ladders, pos.x, pos.z, bw);
    if (isTall) towers3.push({ x: pos.x, z: pos.z, half: bw / 2 });
    // Rooftop grapple targets. Towers taller than 2 floors get TWO points — the two
    // front (arena-facing) corners of the top deck; the 2-floor perch keeps one edge.
    if (isTall) {
      const roofY = (TOWER_FLOORS - 1) * FLOOR_H + 0.05;
      const inset = 1.0;
      for (const sx of [-1, 1]) grapplePoints.push({ x: pos.x + sx * (bw / 2 - inset), y: roofY, z: pos.z - (bw / 2 - inset) });
    } else {
      grapplePoints.push(roofGrapplePoint(pos.x, pos.z, bw / 2, FLOOR_H + 0.05)); // 2-floor perch deck
    }
  }
  // Then smaller structures fill the gaps (platforms + bunkers).
  const fillers = Math.round(size / 6);
  for (let i = 0; i < fillers; i++) {
    const bw = 4 + r() * 3;
    const pos = tryPlace(bw, 5);
    if (!pos) continue;
    placed.push({ x: pos.x, z: pos.z, rad: bw });
    if (r() < 0.5) {
      platform(boxes, ladders, pos.x, pos.z, bw);
      grapplePoints.push(roofGrapplePoint(pos.x, pos.z, bw / 2, 3.65)); // platform deck edge (H=3.6)
    } else bunker(boxes, pos.x, pos.z, bw, r);
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
  const Y3 = (TOWER_FLOORS - 1) * FLOOR_H; // top-deck height for rooftop ziplines
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

  return { boxes, ladders, ramps, pads, ziplines, spawn: playerSpawn, enemySpawn, grapplePoints, size, seed };
}
