/**
 * Modular arena generators. `makeModularArena` builds the procedural war-torn city
 * (dev Kit-Arena toggle); `buildFromLayout` turns an authored/editor LevelLayout into
 * a playable arena; `makeBattlefieldLayout` is the editor's randomizer; `makeSampleLayout`
 * is the dev rotation test. All return the standard `Level3D` shape so the rest of the
 * game (guns / enemies / nav / grid / render) runs unchanged.
 *
 * Imported ONLY by the /arcade chunk.
 */
import type { Box, Ladder, Level3D, Ramp } from '../level3d';
import { rng } from '../rand';
import type { ModuleMeta } from './types';
import { barricade, bridge, crate, debris, floorSlab, rubble, wreck } from './atoms';
import { apartmentBlockModule, barracksModule, bunkerModule, commandCenterModule, ruinModule, watchTowerModule } from './modules';
import { ammoCrateProp, barrierProp, commTowerProp, containerProp, coverWallProp, crateStackProp, dragonTeethProp, fuelTankProp, guardPostProp, healthCrateProp, rubbleProp, sandbagProp, shieldCrateProp, stationProp, wreckProp } from './props';
import { cellToWorld, CELL, footprintOf, LAYOUT_VERSION, MODULE_KINDS, ROTATIONS, type BridgeSpan, type BuildingKind, type LevelLayout, type ModuleKind, type Placement, type PropKind, type Rot } from './layout';
import { placeModule } from './transform';

type GP = { x: number; y: number; z: number }[];

const WALL_H = 4.5;

/**
 * WAR-TORN CITY generator. A NYC / downtown-LA street grid (blocks + cross
 * avenues) bombed out Stalingrad-style: quadrant blocks packed with intact + RUINED
 * buildings, open avenues down the middle (long-range lanes + boss sightlines), a
 * gutted central plaza, and rubble / wrecks / barricades strewn through the streets.
 * Player + enemies spawn at opposite ends of the main avenue.
 */
export function makeModularArena(count: number, seed: number): Level3D {
  const r = rng(seed);
  const size = Math.min(220, Math.max(150, 150 + count * 6));
  const half = size / 2;
  const boxes: Box[] = [];
  const ladders: Ladder[] = [];
  const ramps: Ramp[] = [];
  const grapplePoints: { x: number; y: number; z: number }[] = [];
  const modules: ModuleMeta[] = [];

  const spawn = { x: 0, z: -half * 0.86, yaw: Math.PI };
  const enemySpawn = { x: 0, z: half * 0.86 };
  const clearOf = (x: number, z: number, rad: number) => Math.hypot(x - spawn.x, z - spawn.z) < rad || Math.hypot(x - enemySpawn.x, z - enemySpawn.z) < rad;

  // Arena boundary.
  boxes.push({ x: 0, y: WALL_H / 2, z: -half, sx: size, sy: WALL_H, sz: 0.6, tex: 0 });
  boxes.push({ x: 0, y: WALL_H / 2, z: half, sx: size, sy: WALL_H, sz: 0.6, tex: 0 });
  boxes.push({ x: -half, y: WALL_H / 2, z: 0, sx: 0.6, sy: WALL_H, sz: size, tex: 0 });
  boxes.push({ x: half, y: WALL_H / 2, z: 0, sx: 0.6, sy: WALL_H, sz: size, tex: 0 });

  // City grid: blocks separated by streets; the centre column/row are open avenues.
  const BLOCK = 22;
  const STREET = 10;
  const PITCH = BLOCK + STREET; // 32 m block-to-block
  const reach = Math.floor((half - BLOCK / 2 - 4) / PITCH);
  const occupied: { x: number; z: number; rad: number }[] = [];

  for (let gx = -reach; gx <= reach; gx++) {
    for (let gz = -reach; gz <= reach; gz++) {
      const bx = gx * PITCH;
      const bz = gz * PITCH;
      if (clearOf(bx, bz, 18)) continue; // keep the spawn approaches open

      if (gx === 0 && gz === 0) {
        // Central plaza — a bombed-out landmark + heavy rubble + wrecks.
        modules.push(ruinModule(boxes, ladders, ramps, grapplePoints, bx, bz, r, 26, 22));
        rubble(boxes, bx - 12, bz + 8, 4, r);
        rubble(boxes, bx + 12, bz - 8, 4, r);
        wreck(boxes, bx + 10, bz + 10, r);
        occupied.push({ x: bx, z: bz, rad: 16 });
        continue;
      }
      if (gx === 0 || gz === 0) {
        // Open avenue cell — war debris only (keeps the long sightlines).
        const jx = (r() * 2 - 1) * 4;
        const jz = (r() * 2 - 1) * 4;
        const roll = r();
        if (roll < 0.4) wreck(boxes, bx + jx, bz + jz, r);
        else if (roll < 0.72) rubble(boxes, bx + jx, bz + jz, 3.4, r);
        else if (roll < 0.9) barricade(boxes, bx, bz, BLOCK * 0.55, gx === 0 ? 'x' : 'z', r);
        occupied.push({ x: bx, z: bz, rad: 8 });
        continue;
      }

      // Block cell — a building (some intact, some gutted).
      const px = bx + (r() * 2 - 1) * 2;
      const pz = bz + (r() * 2 - 1) * 2;
      if (r() < 0.35) {
        modules.push(ruinModule(boxes, ladders, ramps, grapplePoints, px, pz, r));
      } else {
        const t = r();
        if (t < 0.5) modules.push(apartmentBlockModule(boxes, ladders, ramps, grapplePoints, px, pz, 2 + Math.floor(r() * 3)));
        else if (t < 0.68) modules.push(watchTowerModule(boxes, ladders, ramps, grapplePoints, px, pz));
        else if (t < 0.84) modules.push(barracksModule(boxes, ladders, ramps, grapplePoints, px, pz));
        else modules.push(bunkerModule(boxes, ladders, ramps, grapplePoints, px, pz));
      }
      occupied.push({ x: px, z: pz, rad: 13 });
    }
  }

  // Extra street clutter (rubble / wrecks / debris) clear of buildings + spawns.
  const clutter = Math.round(size / 7);
  for (let i = 0; i < clutter; i++) {
    const x = (r() * 2 - 1) * (half - 6);
    const z = (r() * 2 - 1) * (half - 6);
    if (clearOf(x, z, 15)) continue;
    if (occupied.some((o) => Math.abs(x - o.x) < o.rad && Math.abs(z - o.z) < o.rad)) continue;
    const roll = r();
    if (roll < 0.5) rubble(boxes, x, z, 2.6, r);
    else if (roll < 0.8) wreck(boxes, x, z, r);
    else debris(boxes, x, z, 3, 4, r);
  }

  return { boxes, ladders, ramps, pads: [], ziplines: [], spawn, enemySpawn, grapplePoints, modules, size, seed };
}

/** Place one module of `kind` at (cx,cz) rotated `rot`, via the origin-build +
 *  transform pipeline. Dispatches the differing builder signatures. */
function placeKind(kind: ModuleKind, cx: number, cz: number, rot: Rot, levels: number, boxes: Box[], ladders: Ladder[], ramps: Ramp[], gps: GP, rand: () => number): ModuleMeta {
  switch (kind) {
    case 'barracks':
      return placeModule((b, l, r, g) => barracksModule(b, l, r, g, 0, 0), rot, cx, cz, boxes, ladders, ramps, gps);
    case 'watchtower':
      return placeModule((b, l, r, g) => watchTowerModule(b, l, r, g, 0, 0), rot, cx, cz, boxes, ladders, ramps, gps);
    case 'command':
      return placeModule((b, l, r, g) => commandCenterModule(b, l, r, g, 0, 0), rot, cx, cz, boxes, ladders, ramps, gps);
    case 'apartment':
      return placeModule((b, l, r, g) => apartmentBlockModule(b, l, r, g, 0, 0, levels), rot, cx, cz, boxes, ladders, ramps, gps);
    case 'ruin':
      return placeModule((b, l, r, g) => ruinModule(b, l, r, g, 0, 0, rand), rot, cx, cz, boxes, ladders, ramps, gps);
    case 'bunker':
      return placeModule((b, l, r, g) => bunkerModule(b, l, r, g, 0, 0), rot, cx, cz, boxes, ladders, ramps, gps);
    // Props (cover + battlefield objects) — footprint-only, no interior nav.
    case 'coverwall':
      return placeModule((b) => coverWallProp(b, 0, 0), rot, cx, cz, boxes, ladders, ramps, gps);
    case 'sandbags':
      return placeModule((b) => sandbagProp(b, 0, 0, rand), rot, cx, cz, boxes, ladders, ramps, gps);
    case 'container':
      return placeModule((b) => containerProp(b, 0, 0), rot, cx, cz, boxes, ladders, ramps, gps);
    case 'barrier':
      return placeModule((b) => barrierProp(b, 0, 0), rot, cx, cz, boxes, ladders, ramps, gps);
    case 'dragonteeth':
      return placeModule((b) => dragonTeethProp(b, 0, 0), rot, cx, cz, boxes, ladders, ramps, gps);
    case 'fueltank':
      return placeModule((b) => fuelTankProp(b, 0, 0), rot, cx, cz, boxes, ladders, ramps, gps);
    case 'commtower':
      return placeModule((b) => commTowerProp(b, 0, 0), rot, cx, cz, boxes, ladders, ramps, gps);
    case 'guardpost':
      return placeModule((b) => guardPostProp(b, 0, 0), rot, cx, cz, boxes, ladders, ramps, gps);
    case 'crates':
      return placeModule((b) => crateStackProp(b, 0, 0), rot, cx, cz, boxes, ladders, ramps, gps);
    case 'rubble':
      return placeModule((b) => rubbleProp(b, 0, 0, rand), rot, cx, cz, boxes, ladders, ramps, gps);
    case 'wreck':
      return placeModule((b) => wreckProp(b, 0, 0, rand), rot, cx, cz, boxes, ladders, ramps, gps);
    // Resupply (wired to the game).
    case 'station':
      return placeModule((b) => stationProp(b, 0, 0), rot, cx, cz, boxes, ladders, ramps, gps);
    case 'ammocrate':
      return placeModule((b) => ammoCrateProp(b, 0, 0), rot, cx, cz, boxes, ladders, ramps, gps);
    case 'shieldcrate':
      return placeModule((b) => shieldCrateProp(b, 0, 0), rot, cx, cz, boxes, ladders, ramps, gps);
    case 'healthcrate':
      return placeModule((b) => healthCrateProp(b, 0, 0), rot, cx, cz, boxes, ladders, ramps, gps);
  }
}

/** A flush walkable bridge between two roof points at height `y`, at ANY angle:
 *  axis-aligned spans get one clean railed slab; diagonal spans are tiled from small
 *  overlapping slabs (AABB-safe + walkable, chunky-pixel look). */
function bridgeSpan(boxes: Box[], x0: number, z0: number, x1: number, z1: number, y: number): void {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const len = Math.hypot(dx, dz);
  if (len < 0.5) return;
  if (Math.abs(dx) < 0.8 || Math.abs(dz) < 0.8) {
    bridge(boxes, (x0 + x1) / 2, (z0 + z1) / 2, len, Math.abs(dx) >= Math.abs(dz) ? 'x' : 'z', y);
    return;
  }
  const n = Math.max(2, Math.ceil(len / 1.6));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    floorSlab(boxes, x0 + dx * t, z0 + dz * t, 3.4, 3.4, y);
  }
}

/**
 * Build a playable Level3D from a hand-authored LevelLayout: boundary walls +
 * spawns (from the layout or derived) + each placement (rotated) + light street
 * clutter in the gaps. Deterministic given the layout's seed. Carries the theme.
 */
export function buildFromLayout(layout: LevelLayout): Level3D {
  const r = rng(layout.seed);
  const size = layout.size;
  const half = size / 2;
  const boxes: Box[] = [];
  const ladders: Ladder[] = [];
  const ramps: Ramp[] = [];
  const grapplePoints: GP = [];
  const modules: ModuleMeta[] = [];

  const spawn = layout.spawn ? { x: cellToWorld(layout.spawn.gx), z: cellToWorld(layout.spawn.gz), yaw: Math.PI } : { x: 0, z: -half * 0.86, yaw: Math.PI };
  const enemySpawn = layout.enemySpawn ? { x: cellToWorld(layout.enemySpawn.gx), z: cellToWorld(layout.enemySpawn.gz) } : { x: 0, z: half * 0.86 };

  // Arena boundary.
  boxes.push({ x: 0, y: WALL_H / 2, z: -half, sx: size, sy: WALL_H, sz: 0.6, tex: 0 });
  boxes.push({ x: 0, y: WALL_H / 2, z: half, sx: size, sy: WALL_H, sz: 0.6, tex: 0 });
  boxes.push({ x: -half, y: WALL_H / 2, z: 0, sx: 0.6, sy: WALL_H, sz: size, tex: 0 });
  boxes.push({ x: half, y: WALL_H / 2, z: 0, sx: 0.6, sy: WALL_H, sz: size, tex: 0 });

  const occupied: { x: number; z: number; rad: number }[] = [];
  for (const pl of layout.placements) {
    const cx = cellToWorld(pl.gx);
    const cz = cellToWorld(pl.gz);
    modules.push(placeKind(pl.module, cx, cz, pl.rot, pl.params?.levels ?? 3, boxes, ladders, ramps, grapplePoints, r));
    occupied.push({ x: cx, z: cz, rad: 13 });
  }

  // Bridges — a flush walkable span between two building roofs (top surface at y).
  for (const br of layout.bridges ?? []) bridgeSpan(boxes, br.x0, br.z0, br.x1, br.z1, br.y);

  // Light street clutter in the empty spaces (skips buildings + spawns).
  const clutter = Math.round(size / 8);
  for (let i = 0; i < clutter; i++) {
    const x = (r() * 2 - 1) * (half - 6);
    const z = (r() * 2 - 1) * (half - 6);
    if (Math.hypot(x - spawn.x, z - spawn.z) < 14 || Math.hypot(x - enemySpawn.x, z - enemySpawn.z) < 14) continue;
    if (occupied.some((o) => Math.abs(x - o.x) < o.rad && Math.abs(z - o.z) < o.rad)) continue;
    const roll = r();
    if (roll < 0.5) rubble(boxes, x, z, 2.6, r);
    else if (roll < 0.8) wreck(boxes, x, z, r);
    else debris(boxes, x, z, 3, 4, r);
  }

  return { boxes, ladders, ramps, pads: [], ziplines: [], spawn, enemySpawn, grapplePoints, modules, theme: layout.theme, size, seed: layout.seed };
}

/** DEV rotation-test layout: every module kind (columns) at every rotation (rows),
 *  so each can be walked to confirm rotated ramps still climb + ladders still exit
 *  onto their deck + openings line up. Used by the dev "Layout Test" toggle. */
export function makeSampleLayout(theme = 'wartorn'): LevelLayout {
  const placements: Placement[] = [];
  MODULE_KINDS.forEach((kind: ModuleKind, ci) => {
    ROTATIONS.forEach((rot: Rot, ri) => {
      placements.push({ module: kind, gx: ci * 2 - 5, gz: ri * 2 - 3, rot, params: kind === 'apartment' ? { levels: 3 } : undefined });
    });
  });
  return { v: 1, theme, size: 200, seed: 12345, placements };
}

type BNode = { gx: number; gz: number; module: ModuleKind; rot: Rot; params?: { levels?: number } };

/**
 * PURPOSEFUL battlefield randomizer → an editable LevelLayout. Each roll picks a
 * LAYOUT PATTERN (grid / square-ring / rows / random / spider-web / X / semicircle)
 * for a connected same-height BARRACKS compound bridged together (any-angle bridges),
 * uses the WHOLE map, mixes in varied building types, then fills the lanes with cover,
 * sightline breakers, and ≥10 each of ammo / shield / health pickups + a station.
 */
export function makeBattlefieldLayout(theme: string, size: number, seed: number): LevelLayout {
  const r = rng(seed);
  const pick = <T,>(a: T[]): T => a[Math.floor(r() * a.length)];
  const half = size / 2;
  const reach = Math.max(3, Math.floor((half - 12) / CELL));
  const spawns = [
    { x: 0, z: -half * 0.86 },
    { x: 0, z: half * 0.86 },
  ];
  const nearSpawn = (gx: number, gz: number) => spawns.some((s) => Math.hypot(cellToWorld(gx) - s.x, cellToWorld(gz) - s.z) < 24);
  const inBounds = (gx: number, gz: number) => Math.abs(cellToWorld(gx)) <= half - 12 && Math.abs(cellToWorld(gz)) <= half - 12;

  const placements: Placement[] = [];
  const bridges: BridgeSpan[] = [];
  const occupied = new Set<string>();
  const key = (gx: number, gz: number) => `${gx},${gz}`;
  const free = (gx: number, gz: number) => !occupied.has(key(gx, gz));
  const claim = (gx: number, gz: number) => occupied.add(key(gx, gz));

  // Place a connected building at a WORLD point, snapped to a 32 m (even-cell) grid so
  // buildings never overlap. Returns the node (or null if it didn't fit).
  const placeB = (wx: number, wz: number, kind: BuildingKind = 'barracks'): BNode | null => {
    const gx = Math.round(wx / (CELL * 2)) * 2;
    const gz = Math.round(wz / (CELL * 2)) * 2;
    if (!inBounds(gx, gz) || nearSpawn(gx, gz) || !free(gx, gz)) return null;
    const node: BNode = { gx, gz, module: kind, rot: 0 };
    placements.push(node);
    claim(gx, gz);
    return node;
  };
  // A flush any-angle bridge between two building roofs (footprint-edge to edge).
  const connect = (a: BNode | null, b: BNode | null) => {
    if (!a || !b || (a.gx === b.gx && a.gz === b.gz)) return;
    const cxA = cellToWorld(a.gx);
    const czA = cellToWorld(a.gz);
    const fpA = footprintOf(a);
    const cxB = cellToWorld(b.gx);
    const czB = cellToWorld(b.gz);
    const fpB = footprintOf(b);
    const dx = cxB - cxA;
    const dz = czB - czA;
    const L = Math.hypot(dx, dz) || 1;
    const ux = dx / L;
    const uz = dz / L;
    const edge = (fp: { w: number; d: number }) => 1 / Math.max(Math.abs(ux) / (fp.w / 2), Math.abs(uz) / (fp.d / 2));
    bridges.push({ x0: cxA + ux * edge(fpA), z0: czA + uz * edge(fpA), x1: cxB - ux * edge(fpB), z1: czB - uz * edge(fpB), y: 4 });
  };

  // Command hub at the centre (roof height 4 — bridge-compatible with the barracks).
  const hub = placeB(0, 0, 'command');
  const R = Math.min(half - 28, half * 0.62);
  const pattern = pick(['grid', 'square', 'rows', 'random', 'web', 'x', 'semicircle'] as const);

  if (pattern === 'grid') {
    const g: BNode[] = [];
    for (let gx = -reach; gx <= reach; gx += 2) for (let gz = -reach; gz <= reach; gz += 2) if (!(gx === 0 && gz === 0)) { const n = placeB(cellToWorld(gx), cellToWorld(gz)); if (n) g.push(n); }
    if (hub) g.push(hub);
    for (const a of g) for (const b of g) if ((b.gx - a.gx === 2 && b.gz === a.gz) || (b.gz - a.gz === 2 && b.gx === a.gx)) connect(a, b);
  } else if (pattern === 'square') {
    const ring: BNode[] = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const cx = Math.cos(a);
      const sz = Math.sin(a);
      const m = Math.max(Math.abs(cx), Math.abs(sz)); // square (max-norm) perimeter
      const n = placeB((cx / m) * R, (sz / m) * R);
      if (n && !ring.some((p) => p.gx === n.gx && p.gz === n.gz)) ring.push(n);
    }
    for (let i = 0; i < ring.length; i++) connect(ring[i], ring[(i + 1) % ring.length]);
  } else if (pattern === 'rows') {
    for (const rz of [-R * 0.55, R * 0.05, R * 0.6]) {
      const row: BNode[] = [];
      for (let x = -R; x <= R; x += CELL * 2) { const n = placeB(x, rz); if (n) row.push(n); }
      for (let i = 0; i < row.length - 1; i++) connect(row[i], row[i + 1]);
    }
  } else if (pattern === 'random') {
    const placed: BNode[] = [];
    for (let i = 0; i < 9; i++) { const n = placeB((r() * 2 - 1) * R, (r() * 2 - 1) * R); if (n) placed.push(n); }
    for (let i = 1; i < placed.length; i++) {
      let best = 0;
      let bd = Infinity;
      for (let j = 0; j < i; j++) { const d = Math.hypot(placed[i].gx - placed[j].gx, placed[i].gz - placed[j].gz); if (d < bd) { bd = d; best = j; } }
      connect(placed[i], placed[best]); // nearest-neighbour tree → all connected
    }
  } else if (pattern === 'web') {
    const ring: BNode[] = [];
    const N = 6;
    for (let i = 0; i < N; i++) { const a = (i / N) * Math.PI * 2; const n = placeB(Math.cos(a) * R, Math.sin(a) * R); if (n) ring.push(n); }
    for (const n of ring) connect(hub, n); // spokes
    for (let i = 0; i < ring.length; i++) connect(ring[i], ring[(i + 1) % ring.length]); // web
  } else if (pattern === 'x') {
    for (const [ax, az] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const inner = placeB(ax * R * 0.45, az * R * 0.45);
      const outer = placeB(ax * R * 0.9, az * R * 0.9);
      connect(hub, inner);
      connect(inner, outer);
    }
  } else {
    const N = 7; // semicircle arc
    const arc: BNode[] = [];
    for (let i = 0; i < N; i++) { const a = Math.PI * (i / (N - 1)); const n = placeB(Math.cos(a) * R, Math.sin(a) * R * 0.7 - R * 0.2); if (n) arc.push(n); }
    for (let i = 0; i < arc.length - 1; i++) connect(arc[i], arc[i + 1]);
  }

  // Guarantee a connected cluster of ≥4: if the pattern couldn't fit enough, drop a
  // small connected block near the centre.
  if (bridges.length < 3) {
    const fb: BNode[] = [];
    for (const [dx, dz] of [[2, 0], [0, 2], [2, 2], [4, 0]]) { const n = placeB(cellToWorld(dx), cellToWorld(dz)); if (n) fb.push(n); }
    for (const n of fb) connect(hub, n);
  }

  // VARIETY: scatter non-connected buildings of random types across free even cells.
  const variety: BuildingKind[] = ['watchtower', 'apartment', 'ruin', 'bunker'];
  for (let gx = -reach; gx <= reach; gx += 2) for (let gz = -reach; gz <= reach; gz += 2) {
    if (nearSpawn(gx, gz) || !free(gx, gz) || !inBounds(gx, gz)) continue;
    if (r() < 0.26) { const k = pick(variety); placements.push({ module: k, gx, gz, rot: pick([0, 90, 180, 270]) as Rot, params: k === 'apartment' ? { levels: 2 + Math.floor(r() * 3) } : undefined }); claim(gx, gz); }
  }

  // Cover in the odd-cell lanes across the WHOLE map (denser down the centre).
  const coverPool: PropKind[] = ['barrier', 'sandbags', 'dragonteeth', 'rubble', 'container', 'wreck', 'crates', 'coverwall'];
  for (let gx = -reach; gx <= reach; gx++) for (let gz = -reach; gz <= reach; gz++) {
    if ((gx % 2 === 0 && gz % 2 === 0) || nearSpawn(gx, gz) || !free(gx, gz)) continue;
    if (r() < (gx === 0 ? 0.5 : 0.3)) { placements.push({ module: pick(coverPool), gx, gz, rot: pick([0, 90]) as Rot }); claim(gx, gz); }
  }

  // Scatter a set of pieces at random free cells (best-effort count).
  const scatter = (kind: PropKind, count: number) => {
    let placed = 0;
    let guard = 0;
    while (placed < count && guard++ < count * 40) {
      const gx = Math.round((r() * 2 - 1) * reach);
      const gz = Math.round((r() * 2 - 1) * reach);
      if (nearSpawn(gx, gz) || !free(gx, gz)) continue;
      placements.push({ module: kind, gx, gz, rot: 0 });
      claim(gx, gz);
      placed++;
    }
  };
  scatter('fueltank', 2);
  scatter('commtower', 2);
  scatter('station', 2);
  // At least 10 each of ammo / shield / health pickups (radar-visible, walk-over grab).
  scatter('ammocrate', 10);
  scatter('shieldcrate', 10);
  scatter('healthcrate', 10);

  return { v: LAYOUT_VERSION, theme, size, seed, placements, bridges };
}
