/**
 * Kit MODULES — believable military structures assembled ONLY from atoms. Each
 * builder emits geometry into the shared arrays AND returns `ModuleMeta` (the
 * nav/AI hints: per-floor walkable rects, doorways, stair ends, roof, connectors)
 * so P3 can navigate them and place bridges. Every vertical link lands at a real
 * opening (floorWithHole) ≥ 3× the player's width, and every rooftop gets ONE
 * centre-facing grapple point.
 *
 * Imported ONLY by the /arcade chunk.
 */
import type { Box, Ladder, Ramp } from '../level3d';
import { roofGrapplePoint } from '../level3d';
import { DIM } from './types';
import type { ModuleMeta, Rect } from './types';
import { crate, doorwayWall, floorSlab, floorWithHole, halfWall, railing, roof, stairRun, wall, windowBand } from './atoms';

type GP = { x: number; y: number; z: number }[];
const F = DIM.floorStep; // 4 m between floors

/** BARRACKS — a 2-storey building: an enclosed ground room (doorways front+back,
 *  windowed sides) with an INTERIOR ramp through a floor opening up to an open,
 *  railed 2nd-floor firing deck + a rooftop grapple point. */
export function barracksModule(boxes: Box[], _ladders: Ladder[], ramps: Ramp[], gps: GP, cx: number, cz: number): ModuleMeta {
  const W = 12;
  const D = 10;
  const hw = W / 2;
  const hd = D / 2;
  // Ground perimeter.
  doorwayWall(boxes, cx, cz - hd, W, 'x', DIM.wallH, 0); // front −z
  doorwayWall(boxes, cx, cz + hd, W, 'x', DIM.wallH, 0); // back +z
  windowBand(boxes, cx - hw, cz, D, 'z', 0);
  windowBand(boxes, cx + hw, cz, D, 'z', 0);
  // 2nd floor with a stair opening along the −x edge + an interior ramp up to it.
  const holeCx = cx - hw + 1.8;
  floorWithHole(boxes, cx, cz, W, D, F, holeCx, cz, 3.6, 4);
  stairRun(ramps, holeCx, cz, 3.6, '+x', 0, F); // lands flush at the deck near edge
  // Open railed firing deck (open front −z).
  railing(boxes, cx, cz + hd, W, 'x', F);
  railing(boxes, cx - hw, cz, D, 'z', F);
  railing(boxes, cx + hw, cz, D, 'z', F);
  gps.push(roofGrapplePoint(cx, cz, Math.min(hw, hd), F + 0.05));
  const rect: Rect = [cx - hw, cz - hd, cx + hw, cz + hd];
  return {
    kind: 'barracks',
    cx,
    cz,
    sx: W,
    sz: D,
    height: F,
    floors: [
      { y: 0, rect },
      { y: F, rect },
    ],
    doorways: [
      { x: cx, z: cz - hd, y: 0 },
      { x: cx, z: cz + hd, y: 0 },
    ],
    stairs: [{ x0: holeCx, z0: cz, y0: 0, x1: holeCx + 1.8, z1: cz, y1: F }],
    roof: { y: F, rect },
    connectors: [
      { side: 'S', x: cx, z: cz - hd, y: F },
      { side: 'N', x: cx, z: cz + hd, y: F },
    ],
  };
}

/** WATCH TOWER — a tall slim tower: two enclosed storeys reached by an INTERIOR
 *  ramp switchback through floor openings, topped by an open railed sniper deck +
 *  grapple point. Small footprint so it reads as a lookout. */
export function watchTowerModule(boxes: Box[], _ladders: Ladder[], ramps: Ramp[], gps: GP, cx: number, cz: number): ModuleMeta {
  const W = 8;
  const hw = W / 2;
  const top = 2 * F; // open deck at 8 m
  // Corner columns full height.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) boxes.push({ x: cx + sx * (hw - 0.3), y: (top + 0.6) / 2, z: cz + sz * (hw - 0.3), sx: 0.5, sy: top + 0.6, sz: 0.5, tex: 0 });
  // Two windowed storeys (open front −z on the ground for entry).
  windowBand(boxes, cx + hw, cz, W, 'z', 0);
  windowBand(boxes, cx - hw, cz, W, 'z', 0);
  wall(boxes, cx, cz + hw, W, 'x', DIM.wallH, 0);
  windowBand(boxes, cx - hw, cz, W, 'z', F);
  windowBand(boxes, cx + hw, cz, W, 'z', F);
  wall(boxes, cx, cz + hw, W, 'x', DIM.wallH, F);
  // Floor 1 + floor 2 (deck) each with a stair opening + a ramp up to it, on
  // alternating sides for a switchback.
  floorWithHole(boxes, cx, cz, W, W, F, cx - hw + 1.8, cz, 3.4, 3.4);
  stairRun(ramps, cx - hw + 1.8, cz, 3.4, '+x', 0, F);
  roof(boxes, cx, cz, W, W, top); // open sniper deck
  // (the deck IS reached from floor 1 via a second ramp through a roof opening)
  floorWithHole(boxes, cx, cz, W, W, top, cx + hw - 1.8, cz, 3.4, 3.4);
  stairRun(ramps, cx + hw - 1.8, cz, 3.4, '-x', F, top);
  gps.push(roofGrapplePoint(cx, cz, hw, top + 0.05));
  const rect: Rect = [cx - hw, cz - hw, cx + hw, cz + hw];
  return {
    kind: 'watchtower',
    cx,
    cz,
    sx: W,
    sz: W,
    height: top,
    floors: [
      { y: 0, rect },
      { y: F, rect },
      { y: top, rect },
    ],
    doorways: [{ x: cx, z: cz - hw, y: 0 }],
    stairs: [
      { x0: cx - hw + 1.8, z0: cz, y0: 0, x1: cx - hw + 3.6, z1: cz, y1: F },
      { x0: cx + hw - 1.8, z0: cz, y0: F, x1: cx + hw - 3.6, z1: cz, y1: top },
    ],
    roof: { y: top, rect },
    connectors: [{ side: 'S', x: cx, z: cz - hw, y: top }],
  };
}

/** COMMAND CENTER — a big central hub: an open ground hall (doorways on all four
 *  sides for flanking) with a 2nd-floor MEZZANINE ring around a central atrium
 *  (reached by two interior ramps), a rooftop, and edge cover. The map's anchor. */
export function commandCenterModule(boxes: Box[], _ladders: Ladder[], ramps: Ramp[], gps: GP, cx: number, cz: number): ModuleMeta {
  const W = 18;
  const hw = W / 2;
  // Ground perimeter: a doorway on every side (flankable), windows between.
  doorwayWall(boxes, cx, cz - hw, W, 'x', DIM.wallH, 0);
  doorwayWall(boxes, cx, cz + hw, W, 'x', DIM.wallH, 0);
  doorwayWall(boxes, cx - hw, cz, W, 'z', DIM.wallH, 0);
  doorwayWall(boxes, cx + hw, cz, W, 'z', DIM.wallH, 0);
  // 2nd-floor mezzanine ring: a floor with a big central atrium opening.
  floorWithHole(boxes, cx, cz, W, W, F, cx, cz, W * 0.5, W * 0.5);
  // Mezzanine rail around the atrium + outer edge.
  const inner = W * 0.25;
  railing(boxes, cx, cz - inner, W * 0.5, 'x', F);
  railing(boxes, cx, cz + inner, W * 0.5, 'x', F);
  railing(boxes, cx - inner, cz, W * 0.5, 'z', F);
  railing(boxes, cx + inner, cz, W * 0.5, 'z', F);
  // Two interior ramps up to the mezzanine (opposite corners → openings in the ring).
  stairRun(ramps, cx - hw + 2, cz - hw + 3, 4, '+x', 0, F);
  stairRun(ramps, cx + hw - 2, cz + hw - 3, 4, '-x', 0, F);
  // Rooftop over the ring (leaving the atrium open to the sky) — a combat deck.
  roof(boxes, cx, cz - (inner + W * 0.125), W, W * 0.25, 2 * F);
  roof(boxes, cx, cz + (inner + W * 0.125), W, W * 0.25, 2 * F);
  // Edge cover crates on the ground.
  crate(boxes, cx - hw + 2, cz + hw - 2);
  crate(boxes, cx + hw - 2, cz - hw + 2);
  gps.push(roofGrapplePoint(cx, cz, hw, 2 * F + 0.05));
  const rect: Rect = [cx - hw, cz - hw, cx + hw, cz + hw];
  return {
    kind: 'command',
    cx,
    cz,
    sx: W,
    sz: W,
    height: 2 * F,
    floors: [
      { y: 0, rect },
      { y: F, rect: [cx - hw, cz - hw, cx + hw, cz + hw] },
    ],
    doorways: [
      { x: cx, z: cz - hw, y: 0 },
      { x: cx, z: cz + hw, y: 0 },
      { x: cx - hw, z: cz, y: 0 },
      { x: cx + hw, z: cz, y: 0 },
    ],
    stairs: [
      { x0: cx - hw + 2, z0: cz - hw + 3, y0: 0, x1: cx - hw + 6, z1: cz - hw + 3, y1: F },
      { x0: cx + hw - 2, z0: cz + hw - 3, y0: 0, x1: cx + hw - 6, z1: cz + hw - 3, y1: F },
    ],
    roof: { y: 2 * F, rect },
    connectors: [
      { side: 'S', x: cx, z: cz - hw, y: F },
      { side: 'N', x: cx, z: cz + hw, y: F },
      { side: 'W', x: cx - hw, z: cz, y: F },
      { side: 'E', x: cx + hw, z: cz, y: F },
    ],
  };
}

/** BUNKER — ground-level cover: a U of half-walls with a low hard roof (head
 *  cover) + a crate. No verticality; a strongpoint to fight from/around. */
export function bunkerModule(boxes: Box[], _ladders: Ladder[], _ramps: Ramp[], _gps: GP, cx: number, cz: number): ModuleMeta {
  const W = 8;
  const hw = W / 2;
  const h = DIM.halfH; // 2 m walls (waist/chest cover)
  halfWall(boxes, cx, cz + hw, W, 'x', 0); // back
  halfWall(boxes, cx - hw, cz, W, 'z', 0); // −x
  halfWall(boxes, cx + hw, cz, W, 'z', 0); // +x (open front −z)
  floorSlab(boxes, cx, cz, W, W, h + DIM.floorT); // low hard roof for head cover
  crate(boxes, cx, cz, 1.4);
  const rect: Rect = [cx - hw, cz - hw, cx + hw, cz + hw];
  return {
    kind: 'bunker',
    cx,
    cz,
    sx: W,
    sz: W,
    height: h,
    floors: [{ y: 0, rect }],
    doorways: [{ x: cx, z: cz - hw, y: 0 }], // open front
    stairs: [],
    connectors: [],
  };
}
