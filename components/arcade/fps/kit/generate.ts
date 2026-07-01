/**
 * Modular arena generator. P0 ships `makeKitTestArena` — a small hand-assembled
 * demo that exercises the atoms (walls, doorway, windows, floor decks, ladders,
 * a stair ramp, a catwalk, a railed rooftop, cover) so the kit can be validated
 * in-engine behind a dev flag before the full grid generator (P2) replaces
 * `makeArena3D`. Returns the standard `Level3D` shape so the rest of the game
 * (guns / enemies / nav / grid / render) runs unchanged.
 *
 * Imported ONLY by the /arcade chunk.
 */
import type { Box, Ladder, Level3D, Ramp } from '../level3d';
import { rng } from '../rand';
import type { ModuleMeta } from './types';
import { barricade, bridge, crate, debris, rubble, wreck } from './atoms';
import { apartmentBlockModule, barracksModule, bunkerModule, commandCenterModule, ruinModule, watchTowerModule } from './modules';
import { ammoCrateProp, barrierProp, commTowerProp, containerProp, coverWallProp, crateStackProp, dragonTeethProp, fuelTankProp, guardPostProp, rubbleProp, sandbagProp, shieldCrateProp, stationProp, wreckProp } from './props';
import { cellToWorld, CELL, footprintOf, LAYOUT_VERSION, MODULE_KINDS, ROTATIONS, type BridgeSpan, type BuildingKind, type LevelLayout, type ModuleKind, type Placement, type PropKind, type Rot } from './layout';
import { placeModule } from './transform';

type GP = { x: number; y: number; z: number }[];

const WALL_H = 4.5;

/** P1 validation arena: one of each core module (a central Command Center flanked
 *  by barracks, watch towers, and bunkers), a 2nd-floor catwalk linking a barracks
 *  to the command mezzanine, and scattered cover. Spawns at opposite ends. Exposes
 *  each module's nav/AI hints via `modules`. */
export function makeKitTestArena(seed: number): Level3D {
  const r = rng(seed);
  const size = 132;
  const half = size / 2;
  const boxes: Box[] = [];
  const ladders: Ladder[] = [];
  const ramps: Ramp[] = [];
  const grapplePoints: { x: number; y: number; z: number }[] = [];
  const modules: ModuleMeta[] = [];

  const spawn = { x: 0, z: -half * 0.82, yaw: Math.PI };
  const enemySpawn = { x: 0, z: half * 0.82 };

  // Arena boundary.
  boxes.push({ x: 0, y: WALL_H / 2, z: -half, sx: size, sy: WALL_H, sz: 0.6, tex: 0 });
  boxes.push({ x: 0, y: WALL_H / 2, z: half, sx: size, sy: WALL_H, sz: 0.6, tex: 0 });
  boxes.push({ x: -half, y: WALL_H / 2, z: 0, sx: 0.6, sy: WALL_H, sz: size, tex: 0 });
  boxes.push({ x: half, y: WALL_H / 2, z: 0, sx: 0.6, sy: WALL_H, sz: size, tex: 0 });

  // One of each (bigger) core module, well spaced around the centre.
  modules.push(commandCenterModule(boxes, ladders, ramps, grapplePoints, 0, 0));
  modules.push(barracksModule(boxes, ladders, ramps, grapplePoints, -33, -12));
  modules.push(barracksModule(boxes, ladders, ramps, grapplePoints, 33, 12));
  modules.push(watchTowerModule(boxes, ladders, ramps, grapplePoints, -34, 28));
  modules.push(watchTowerModule(boxes, ladders, ramps, grapplePoints, 34, -28));
  modules.push(bunkerModule(boxes, ladders, ramps, grapplePoints, 0, 40));
  modules.push(bunkerModule(boxes, ladders, ramps, grapplePoints, 0, -40));

  // Scattered cover crates (clear of spawns + structures).
  for (let i = 0; i < 12; i++) {
    const x = (r() * 2 - 1) * (half - 6);
    const z = (r() * 2 - 1) * (half - 6);
    if (Math.hypot(x - spawn.x, z - spawn.z) < 8 || Math.hypot(x - enemySpawn.x, z - enemySpawn.z) < 8) continue;
    if (modules.some((m) => Math.abs(x - m.cx) < m.sx / 2 + 1 && Math.abs(z - m.cz) < m.sz / 2 + 1)) continue;
    crate(boxes, x, z, 1.2 + r() * 0.6);
  }

  return { boxes, ladders, ramps, pads: [], ziplines: [], spawn, enemySpawn, grapplePoints, modules, size, seed };
}

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
  for (const br of layout.bridges ?? []) {
    const along = Math.abs(br.x1 - br.x0) >= Math.abs(br.z1 - br.z0) ? 'x' : 'z';
    const cx = (br.x0 + br.x1) / 2;
    const cz = (br.z0 + br.z1) / 2;
    const len = Math.hypot(br.x1 - br.x0, br.z1 - br.z0);
    bridge(boxes, cx, cz, len, along, br.y);
  }

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

/**
 * PURPOSEFUL battlefield randomizer → an editable LevelLayout (not random noise):
 * a central command anchor, buildings scattered on an even grid with variety +
 * spacing, bridges connecting aligned same-height building pairs, and cover placed
 * STRATEGICALLY in the lanes between structures (dense down the central approach) so
 * crossing open ground always has something to hide behind, plus a few tall sightline
 * breakers. Loads into the editor so it can be hand-tweaked.
 */
export function makeBattlefieldLayout(theme: string, size: number, seed: number): LevelLayout {
  const r = rng(seed);
  const pick = <T,>(a: T[]): T => a[Math.floor(r() * a.length)];
  const half = size / 2;
  // Building anchors on an even grid spanning the WHOLE map (out to ~one building's
  // half-width from the walls), so the arena is used edge-to-edge, not just the centre.
  const reach = Math.max(2, Math.floor((half - 12) / CELL));
  const cells: number[] = [];
  for (let g = -reach; g <= reach; g++) if (g % 2 === 0) cells.push(g);
  const spawns = [
    { x: 0, z: -half * 0.86 },
    { x: 0, z: half * 0.86 },
  ];
  const nearSpawn = (gx: number, gz: number) => spawns.some((s) => Math.hypot(cellToWorld(gx) - s.x, cellToWorld(gz) - s.z) < 22);

  const placements: Placement[] = [];
  const bridges: BridgeSpan[] = [];
  const occupied = new Set<string>();
  const key = (gx: number, gz: number) => `${gx},${gz}`;
  const free = (gx: number, gz: number) => !occupied.has(key(gx, gz));
  const claim = (gx: number, gz: number) => occupied.add(key(gx, gz));

  // A HEIGHT-4 building compound (command + BARRACKS) filling the whole even grid at
  // bridge-spacing (2 cells apart), all axis-aligned + the same roof height — so any
  // orthogonal neighbours can be (and are) bridged. This guarantees well over 8
  // aligned, same-height, connectable buildings spread across the map.
  const H4 = 4;
  const h4cells: { gx: number; gz: number; pi: number }[] = [];
  placements.push({ module: 'command', gx: 0, gz: 0, rot: 0 });
  claim(0, 0);
  h4cells.push({ gx: 0, gz: 0, pi: 0 });
  for (const gx of cells) {
    for (const gz of cells) {
      if ((gx === 0 && gz === 0) || nearSpawn(gx, gz) || !free(gx, gz)) continue;
      placements.push({ module: 'barracks', gx, gz, rot: 0 }); // rot 0 → clean bridge edges
      h4cells.push({ gx, gz, pi: placements.length - 1 });
      claim(gx, gz);
    }
  }

  // VARIETY: swap a minority of the barracks for taller towers / apartments / ruins
  // for silhouette, but never drop the same-height compound below a safe count (keeps
  // the ≥8 bridgeable guarantee). Converted cells are excluded from the compound.
  const variety: BuildingKind[] = ['watchtower', 'apartment', 'ruin', 'bunker'];
  const converted = new Set<string>();
  let keep = h4cells.length - 1; // exclude the command hub from the swap budget
  for (const c of h4cells) {
    if (c.pi === 0) continue; // never convert the command hub
    if (keep <= 10) break; // always leave a compound of ≥10 (well above 8)
    if (r() < 0.3) {
      const kind = pick(variety);
      placements[c.pi] = { module: kind, gx: c.gx, gz: c.gz, rot: pick([0, 90, 180, 270]) as Rot, params: kind === 'apartment' ? { levels: 2 + Math.floor(r() * 3) } : undefined };
      converted.add(key(c.gx, c.gz));
      keep--;
    }
  }

  // Bridge every orthogonal neighbour pair still in the height-4 compound (each once).
  const compound = new Map<string, Placement>();
  for (const c of h4cells) if (!converted.has(key(c.gx, c.gz))) compound.set(key(c.gx, c.gz), placements[c.pi]);
  const bridgeBetween = (A: Placement, B: Placement) => {
    const cxA = cellToWorld(A.gx);
    const czA = cellToWorld(A.gz);
    const fpA = footprintOf(A);
    const cxB = cellToWorld(B.gx);
    const czB = cellToWorld(B.gz);
    const fpB = footprintOf(B);
    if (Math.abs(cxB - cxA) >= Math.abs(czB - czA)) bridges.push({ x0: cxA + Math.sign(cxB - cxA) * (fpA.w / 2), z0: czA, x1: cxB - Math.sign(cxB - cxA) * (fpB.w / 2), z1: czA, y: H4 });
    else bridges.push({ x0: cxA, z0: czA + Math.sign(czB - czA) * (fpA.d / 2), x1: cxA, z1: czB - Math.sign(czB - czA) * (fpB.d / 2), y: H4 });
  };
  for (const [k, A] of compound) {
    const [gx, gz] = k.split(',').map(Number);
    const east = compound.get(key(gx + 2, gz));
    if (east) bridgeBetween(A, east);
    const south = compound.get(key(gx, gz + 2));
    if (south) bridgeBetween(A, south);
  }

  // Strategic cover in the ODD-cell lanes between the buildings, across the whole map —
  // denser down the central approach so crossing open ground always has cover.
  const coverPool: PropKind[] = ['barrier', 'sandbags', 'dragonteeth', 'rubble', 'container', 'wreck', 'crates', 'coverwall'];
  for (let gx = -reach; gx <= reach; gx++) {
    for (let gz = -reach; gz <= reach; gz++) {
      if ((gx % 2 === 0 && gz % 2 === 0) || nearSpawn(gx, gz) || !free(gx, gz)) continue;
      const p = gx === 0 ? 0.6 : 0.34;
      if (r() < p) {
        placements.push({ module: pick(coverPool), gx, gz, rot: pick([0, 90]) as Rot });
        claim(gx, gz);
      }
    }
  }

  // Tall sightline breakers + resupply (station + ammo + shield) out in the field.
  for (const kind of ['fueltank', 'commtower', 'station', 'ammocrate', 'shieldcrate'] as PropKind[]) {
    for (let t = 0; t < 24; t++) {
      const gx = pick([-1, 1]) * (1 + Math.floor(r() * reach));
      const gz = pick([-1, 1]) * (1 + Math.floor(r() * reach));
      if (nearSpawn(gx, gz) || !free(gx, gz)) continue;
      placements.push({ module: kind, gx, gz, rot: 0 });
      claim(gx, gz);
      break;
    }
  }

  return { v: LAYOUT_VERSION, theme, size, seed, placements, bridges };
}
