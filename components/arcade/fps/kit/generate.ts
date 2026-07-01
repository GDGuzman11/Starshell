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
import { crate } from './atoms';
import { barracksModule, bunkerModule, commandCenterModule, watchTowerModule } from './modules';

const WALL_H = 4.5;

/** P1 validation arena: one of each core module (a central Command Center flanked
 *  by barracks, watch towers, and bunkers), a 2nd-floor catwalk linking a barracks
 *  to the command mezzanine, and scattered cover. Spawns at opposite ends. Exposes
 *  each module's nav/AI hints via `modules`. */
export function makeKitTestArena(seed: number): Level3D {
  const r = rng(seed);
  const size = 160;
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
  modules.push(barracksModule(boxes, ladders, ramps, grapplePoints, -42, -14));
  modules.push(barracksModule(boxes, ladders, ramps, grapplePoints, 42, 14));
  modules.push(watchTowerModule(boxes, ladders, ramps, grapplePoints, -44, 34));
  modules.push(watchTowerModule(boxes, ladders, ramps, grapplePoints, 44, -34));
  modules.push(bunkerModule(boxes, ladders, ramps, grapplePoints, 0, 50));
  modules.push(bunkerModule(boxes, ladders, ramps, grapplePoints, 0, -50));

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
