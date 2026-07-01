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
import { barricade, crate, debris, rubble, wreck } from './atoms';
import { apartmentBlockModule, barracksModule, bunkerModule, commandCenterModule, ruinModule, watchTowerModule } from './modules';

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
