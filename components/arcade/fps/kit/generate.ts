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
import { DIM } from './types';
import { catwalk, crate, doorwayWall, floorSlab, ladder, railing, roof, stairRun, wall, windowBand } from './atoms';

const WALL_H = 4.5;

/** A 2-storey barracks assembled ONLY from atoms: a ground room (front doorway,
 *  windowed sides, solid back), a 2nd-floor open deck reached by an external front
 *  ladder, and a railed rooftop reached by an interior ladder. */
function barracks(boxes: Box[], ladders: Ladder[], cx: number, cz: number, w: number): void {
  const half = w / 2;
  const F = DIM.floorStep; // 4
  // Ground storey walls.
  wall(boxes, cx, cz + half, w, 'x', DIM.wallH, 0); // back (+z) solid
  doorwayWall(boxes, cx, cz - half, w, 'x', DIM.wallH, 0); // front (−z) doorway
  windowBand(boxes, cx - half, cz, w, 'z', 0); // −x windows
  windowBand(boxes, cx + half, cz, w, 'z', 0); // +x windows
  // 2nd-floor deck + rails (open front −z for shooting).
  floorSlab(boxes, cx, cz, w, w, F);
  railing(boxes, cx, cz + half, w, 'x', F);
  railing(boxes, cx - half, cz, w, 'z', F);
  railing(boxes, cx + half, cz, w, 'z', F);
  // External front ladder ground → 2nd deck.
  ladder(ladders, cx - half + 1.2, cz - half - 0.35, 0, F, 0, 1);
  // Railed rooftop + interior ladder up to it.
  roof(boxes, cx, cz, w, w, 2 * F);
  ladder(ladders, cx + half - 1.2, cz + half - 1.2, F, 2 * F, 0, -1);
}

/** P0 validation arena: two barracks joined by a 2nd-floor catwalk, a ramp up onto
 *  a raised platform, and scattered cover — spawns at opposite ends. */
export function makeKitTestArena(seed: number): Level3D {
  const r = rng(seed);
  const size = 80;
  const half = size / 2;
  const boxes: Box[] = [];
  const ladders: Ladder[] = [];
  const ramps: Ramp[] = [];

  const spawn = { x: 0, z: -half * 0.8, yaw: Math.PI };
  const enemySpawn = { x: 0, z: half * 0.8 };

  // Arena boundary.
  boxes.push({ x: 0, y: WALL_H / 2, z: -half, sx: size, sy: WALL_H, sz: 0.6, tex: 0 });
  boxes.push({ x: 0, y: WALL_H / 2, z: half, sx: size, sy: WALL_H, sz: 0.6, tex: 0 });
  boxes.push({ x: -half, y: WALL_H / 2, z: 0, sx: 0.6, sy: WALL_H, sz: size, tex: 0 });
  boxes.push({ x: half, y: WALL_H / 2, z: 0, sx: 0.6, sy: WALL_H, sz: size, tex: 0 });

  // Two barracks + a 2nd-floor catwalk between their facing edges.
  barracks(boxes, ladders, -6, 0, 12);
  barracks(boxes, ladders, 16, 0, 10);
  catwalk(boxes, 5, 0, 11, 'x', DIM.floorStep); // spans A(+x edge 0) → B(−x edge 11) at y=4

  // A ramp up onto a raised platform (validates the stair/ramp atom + landing).
  const plX = -18;
  const plZ = 10;
  const plH = 3;
  floorSlab(boxes, plX, plZ, 8, 8, plH); // platform top at plH
  wall(boxes, plX, plZ, 8, 'x', plH, 0); // solid platform body front... (simple prism)
  boxes.push({ x: plX, y: plH / 2, z: plZ, sx: 8, sy: plH, sz: 8, tex: 1 }); // platform body
  stairRun(ramps, plX, plZ - 4 - 3, 6, '+z', 0, plH); // high edge lands at platform −z edge (plZ-4)

  // Scattered cover crates (clear of spawns).
  for (let i = 0; i < 10; i++) {
    const x = (r() * 2 - 1) * (half - 6);
    const z = (r() * 2 - 1) * (half - 6);
    if (Math.hypot(x - spawn.x, z - spawn.z) < 8 || Math.hypot(x - enemySpawn.x, z - enemySpawn.z) < 8) continue;
    crate(boxes, x, z, 1.2 + r() * 0.6);
  }

  return { boxes, ladders, ramps, pads: [], ziplines: [], spawn, enemySpawn, size, seed };
}
