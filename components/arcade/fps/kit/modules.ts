/**
 * Kit MODULES — believable military structures assembled ONLY from atoms. Each
 * builder emits geometry into the shared arrays AND returns `ModuleMeta` (the
 * nav/AI hints) so P3 can navigate them and place bridges.
 *
 * VERTICAL RULE (important): an interior ramp climbs from one floor to the next
 * and the floor above has an opening whose footprint EXACTLY matches the ramp
 * (`rampFloor`), so there is never a gap beside the ramp to fall through, and the
 * ramp lands flush on the solid floor. Ramps sit in the MIDDLE of the (large)
 * footprint with clear space around them, never against a perimeter wall. Each
 * rooftop gets ONE centre-facing grapple point.
 *
 * Imported ONLY by the /arcade chunk.
 */
import type { Box, Ladder, Ramp } from '../level3d';
import { roofGrapplePoint } from '../level3d';
import { DIM, TEX } from './types';
import type { ModuleMeta, Rect } from './types';
import { crate, debris, doorwayWall, floorSlab, floorWithHole, halfWall, railing, rubble, wall, windowBand } from './atoms';

type GP = { x: number; y: number; z: number }[];
const F = DIM.floorStep; // 4 m between floors
const RUN = 6; // interior ramp horizontal run (compact, fits centrally)
const RW = 3.2; // interior ramp width == the floor-opening width (no fall-through)

/** Build the solid floor at `yHi` over `W×D`, but with an opening that EXACTLY
 *  matches the ramp footprint, and a ramp under it climbing `yLo→yHi` centred at
 *  (cx, oz), landing flush on the floor. `oz` places the ramp in the −z/+z half so
 *  stacked floors switchback without conflicting. Returns the ramp's end points. */
function rampFloor(
  boxes: Box[],
  ramps: Ramp[],
  cx: number,
  cz: number,
  W: number,
  D: number,
  yLo: number,
  yHi: number,
  oz: number,
): { x0: number; z0: number; y0: number; x1: number; z1: number; y1: number } {
  floorWithHole(boxes, cx, cz, W, D, yHi, cx, oz, RUN, RW); // opening == ramp footprint
  ramps.push({ x: cx, z: oz, sx: RUN, sz: RW, yLo, yHi, dir: '+x', tex: TEX.rail });
  return { x0: cx - RUN / 2, z0: oz, y0: yLo, x1: cx + RUN / 2, z1: oz, y1: yHi };
}

/** Open-deck rails around a floor edge. */
function edgeRails(boxes: Box[], cx: number, cz: number, W: number, D: number, y: number): void {
  railing(boxes, cx, cz - D / 2, W, 'x', y);
  railing(boxes, cx, cz + D / 2, W, 'x', y);
  railing(boxes, cx - W / 2, cz, D, 'z', y);
  railing(boxes, cx + W / 2, cz, D, 'z', y);
}

/** BARRACKS — a big 2-storey building: enclosed ground room (doorways front+back,
 *  windowed sides) with a central interior ramp up to an open railed firing deck. */
export function barracksModule(boxes: Box[], _ladders: Ladder[], ramps: Ramp[], gps: GP, cx: number, cz: number): ModuleMeta {
  const W = 20;
  const D = 18;
  const hw = W / 2;
  const hd = D / 2;
  doorwayWall(boxes, cx, cz - hd, W, 'x', DIM.wallH, 0); // front −z
  doorwayWall(boxes, cx, cz + hd, W, 'x', DIM.wallH, 0); // back +z
  windowBand(boxes, cx - hw, cz, D, 'z', 0);
  windowBand(boxes, cx + hw, cz, D, 'z', 0);
  const s = rampFloor(boxes, ramps, cx, cz, W, D, 0, F, cz); // central ramp to the deck
  edgeRails(boxes, cx, cz, W, D, F);
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
    stairs: [s],
    roof: { y: F, rect },
    connectors: [
      { side: 'S', x: cx, z: cz - hd, y: F },
      { side: 'N', x: cx, z: cz + hd, y: F },
    ],
  };
}

/** WATCH TOWER — a large 3-level lookout: enclosed ground + mid floors (windowed),
 *  two central interior ramps switchbacking (front half then back half) up to an
 *  open railed sniper deck on top + a grapple point. */
export function watchTowerModule(boxes: Box[], _ladders: Ladder[], ramps: Ramp[], gps: GP, cx: number, cz: number): ModuleMeta {
  const W = 20;
  const hw = W / 2;
  const top = 2 * F; // sniper deck at 8 m
  // Corner columns full height.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) boxes.push({ x: cx + sx * (hw - 0.3), y: (top + 0.6) / 2, z: cz + sz * (hw - 0.3), sx: 0.5, sy: top + 0.6, sz: 0.5, tex: 0 });
  // Ground storey: front doorway (−z), windowed elsewhere.
  doorwayWall(boxes, cx, cz - hw, W, 'x', DIM.wallH, 0);
  wall(boxes, cx, cz + hw, W, 'x', DIM.wallH, 0);
  windowBand(boxes, cx - hw, cz, W, 'z', 0);
  windowBand(boxes, cx + hw, cz, W, 'z', 0);
  // Mid storey walls (windowed all round).
  for (const [x, z, len, ax] of [
    [cx, cz - hw, W, 'x'],
    [cx, cz + hw, W, 'x'],
    [cx - hw, cz, W, 'z'],
    [cx + hw, cz, W, 'z'],
  ] as [number, number, number, 'x' | 'z'][])
    windowBand(boxes, x, z, len, ax, F);
  // Two switchback ramps: ground→mid (front half), mid→top (back half).
  const s1 = rampFloor(boxes, ramps, cx, cz, W, W, 0, F, cz - 5);
  const s2 = rampFloor(boxes, ramps, cx, cz, W, W, F, top, cz + 5);
  edgeRails(boxes, cx, cz, W, W, top); // open sniper deck
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
    stairs: [s1, s2],
    roof: { y: top, rect },
    connectors: [{ side: 'S', x: cx, z: cz - hw, y: top }],
  };
}

/** COMMAND CENTER — a big central hub: an open ground hall with a doorway on all
 *  four sides (flankable), a central interior ramp up to an open 2nd-floor gallery
 *  deck (railed), a rooftop grapple point, and ground cover. The map's anchor. */
export function commandCenterModule(boxes: Box[], _ladders: Ladder[], ramps: Ramp[], gps: GP, cx: number, cz: number): ModuleMeta {
  const W = 26;
  const hw = W / 2;
  doorwayWall(boxes, cx, cz - hw, W, 'x', DIM.wallH, 0);
  doorwayWall(boxes, cx, cz + hw, W, 'x', DIM.wallH, 0);
  doorwayWall(boxes, cx - hw, cz, W, 'z', DIM.wallH, 0);
  doorwayWall(boxes, cx + hw, cz, W, 'z', DIM.wallH, 0);
  const s = rampFloor(boxes, ramps, cx, cz, W, W, 0, F, cz); // central ramp to the gallery
  edgeRails(boxes, cx, cz, W, W, F);
  // Ground cover crates in the hall corners.
  crate(boxes, cx - hw + 3, cz + hw - 3);
  crate(boxes, cx + hw - 3, cz - hw + 3);
  crate(boxes, cx - hw + 3, cz - hw + 3);
  crate(boxes, cx + hw - 3, cz + hw - 3);
  gps.push(roofGrapplePoint(cx, cz, hw, F + 0.05));
  const rect: Rect = [cx - hw, cz - hw, cx + hw, cz + hw];
  return {
    kind: 'command',
    cx,
    cz,
    sx: W,
    sz: W,
    height: F,
    floors: [
      { y: 0, rect },
      { y: F, rect },
    ],
    doorways: [
      { x: cx, z: cz - hw, y: 0 },
      { x: cx, z: cz + hw, y: 0 },
      { x: cx - hw, z: cz, y: 0 },
      { x: cx + hw, z: cz, y: 0 },
    ],
    stairs: [s],
    roof: { y: F, rect },
    connectors: [
      { side: 'S', x: cx, z: cz - hw, y: F },
      { side: 'N', x: cx, z: cz + hw, y: F },
      { side: 'W', x: cx - hw, z: cz, y: F },
      { side: 'E', x: cx + hw, z: cz, y: F },
    ],
  };
}

/** APARTMENT BLOCK — a downtown mid-rise: a windowed multi-storey building with a
 *  front doorway, interior switchback ramps up through floor openings, and a flat
 *  railed roof + grapple point. The bread-and-butter of the city grid. */
export function apartmentBlockModule(boxes: Box[], _ladders: Ladder[], ramps: Ramp[], gps: GP, cx: number, cz: number, levels = 3): ModuleMeta {
  const W = 22;
  const D = 18;
  const hw = W / 2;
  const hd = D / 2;
  const top = levels * F;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) boxes.push({ x: cx + sx * (hw - 0.3), y: (top + 0.6) / 2, z: cz + sz * (hd - 0.3), sx: 0.5, sy: top + 0.6, sz: 0.5, tex: 0 });
  // Windowed perimeter per storey (front doorway on the ground).
  for (let st = 0; st < levels; st++) {
    const yb = st * F;
    if (st === 0) doorwayWall(boxes, cx, cz - hd, W, 'x', DIM.wallH, yb);
    else windowBand(boxes, cx, cz - hd, W, 'x', yb);
    windowBand(boxes, cx, cz + hd, W, 'x', yb);
    windowBand(boxes, cx - hw, cz, D, 'z', yb);
    windowBand(boxes, cx + hw, cz, D, 'z', yb);
  }
  // Switchback interior ramps up every level (alternating halves).
  const stairs = [];
  for (let f = 0; f < levels; f++) stairs.push(rampFloor(boxes, ramps, cx, cz, W, D, f * F, (f + 1) * F, cz + (f % 2 === 0 ? -4 : 4)));
  edgeRails(boxes, cx, cz, W, D, top);
  gps.push(roofGrapplePoint(cx, cz, Math.min(hw, hd), top + 0.05));
  const rect: Rect = [cx - hw, cz - hd, cx + hw, cz + hd];
  const floors = [{ y: 0, rect }];
  for (let f = 1; f <= levels; f++) floors.push({ y: f * F, rect });
  return { kind: 'apartment', cx, cz, sx: W, sz: D, height: top, floors, doorways: [{ x: cx, z: cz - hd, y: 0 }], stairs, roof: { y: top, rect }, connectors: [{ side: 'S', x: cx, z: cz - hd, y: top }] };
}

/** RUIN — a bombed-out Stalingrad shell: perimeter walls blown into gapped
 *  segments of varied height, an exposed 2nd-floor fragment, and rubble heaped
 *  inside + around. Pure cover + a broken climb; no clean roof/grapple. */
export function ruinModule(boxes: Box[], _ladders: Ladder[], _ramps: Ramp[], _gps: GP, cx: number, cz: number, rand: () => number, W = 20, D = 18): ModuleMeta {
  const hw = W / 2;
  const hd = D / 2;
  const brokenWall = (x: number, z: number, len: number, along: 'x' | 'z') => {
    const seg = 4;
    const slen = len / seg;
    for (let i = 0; i < seg; i++) {
      if (rand() < 0.38) continue; // blown gap
      const h = rand() < 0.45 ? DIM.wallH : DIM.halfH + rand() * 1.4; // some collapsed to half
      const t = (i - (seg - 1) / 2) * slen;
      if (along === 'x') wall(boxes, x + t, z, slen, 'x', h, 0);
      else wall(boxes, x, z + t, slen, 'z', h, 0);
    }
  };
  brokenWall(cx, cz - hd, W, 'x');
  brokenWall(cx, cz + hd, W, 'x');
  brokenWall(cx - hw, cz, D, 'z');
  brokenWall(cx + hw, cz, D, 'z');
  // Exposed 2nd-floor fragment in one corner + a rubble ramp of debris up to it.
  floorSlab(boxes, cx + hw * 0.35, cz - hd * 0.3, W * 0.42, D * 0.42, F);
  rubble(boxes, cx + hw * 0.35, cz - hd * 0.3 - D * 0.28, 3.2, rand);
  // Interior + base rubble.
  rubble(boxes, cx - hw * 0.3, cz + hd * 0.3, 3, rand);
  rubble(boxes, cx, cz, 2.6, rand);
  debris(boxes, cx, cz, Math.max(hw, hd) * 0.9, 5, rand);
  const rect: Rect = [cx - hw, cz - hd, cx + hw, cz + hd];
  return {
    kind: 'ruin',
    cx,
    cz,
    sx: W,
    sz: D,
    height: F,
    floors: [
      { y: 0, rect },
      { y: F, rect: [cx + hw * 0.35 - W * 0.21, cz - hd * 0.3 - D * 0.21, cx + hw * 0.35 + W * 0.21, cz - hd * 0.3 + D * 0.21] },
    ],
    doorways: [],
    stairs: [],
    connectors: [],
  };
}

/** BUNKER — ground-level cover: a U of half-walls with a low hard head-cover roof
 *  + a crate. No verticality; a strongpoint to fight from/around. */
export function bunkerModule(boxes: Box[], _ladders: Ladder[], _ramps: Ramp[], _gps: GP, cx: number, cz: number): ModuleMeta {
  const W = 12;
  const hw = W / 2;
  const h = DIM.halfH; // 2 m walls
  halfWall(boxes, cx, cz + hw, W, 'x', 0); // back
  halfWall(boxes, cx - hw, cz, W, 'z', 0); // −x
  halfWall(boxes, cx + hw, cz, W, 'z', 0); // +x (open front −z)
  floorSlab(boxes, cx, cz, W, W, h + DIM.floorT); // low hard roof
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
    doorways: [{ x: cx, z: cz - hw, y: 0 }],
    stairs: [],
    connectors: [],
  };
}
