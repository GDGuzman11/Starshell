/**
 * Player physics for the 3D FPS. Capsule-ish AABB vs the level's box colliders,
 * per-axis resolution (so you slide along walls and stand on upper floors),
 * gravity + jump, and ladder zones you climb by simply walking into them.
 */
import type { Box, Ladder, Level3D, Ramp } from './level3d';
import { rampContains, rampHeightAt } from './level3d';
import type { SpatialGrid } from './level/grid';

export interface Player3 {
  x: number;
  y: number; // feet
  z: number;
  vy: number;
  px: number; // external horizontal impulse velocity (knockback / pull), decays
  pz: number;
  yaw: number;
  pitch: number;
  onGround: boolean;
  health: number;
  /** Overshield/armor: soaks damage BEFORE health, does NOT regenerate. Refilled
   *  only by shield drops. Capped at `maxArmor`. */
  armor: number;
  maxArmor: number;
  /** Move-speed multiplier from armor mobility (small, capped ~1.08). Default 1. */
  speedMul?: number;
  /** Active zipline ride (index into level.ziplines + progress 0..1). */
  zip: { i: number; t: number } | null;
  /** Active grapple flight — arcs the player from (x0,y0,z0) to (tx,ty,tz). */
  grapple?: { x0: number; y0: number; z0: number; tx: number; ty: number; tz: number; t: number; dur: number } | null;
}

const ZIP_SPEED = 16; // units/sec along a zipline

export const EYE = 1.5;
export const MAX_PITCH = 1.45; // ~83°
const R = 0.3;
const H = 1.7;
const MOVE = 4.6;
const GRAV = 22;
const JUMP = 7.2;
const CLIMB = 3.4;
/** Max vertical the player auto-snaps/steps without jumping (ramps + ledges). */
const STEP_UP = 0.4;
/** How far above a ramp surface still counts as "on" it (snap-down tolerance). */
const RAMP_SNAP = 0.5;

/**
 * Highest walkable support height under the point (x,z): the world floor (0),
 * any ramp surface whose footprint contains the point, and the tops of solid
 * boxes the point sits over (whose top is at/below the reference height `refTop`
 * so we don't count tops far overhead). Grid-backed; identical candidate math.
 */
export function groundHeightAt(
  x: number,
  z: number,
  lvl: Level3D,
  grid?: SpatialGrid,
  refTop = Infinity,
): number {
  let h = 0; // world floor
  const ramps = lvl.ramps;
  if (ramps) {
    for (let i = 0; i < ramps.length; i++) {
      const rmp = ramps[i];
      if (rampContains(rmp, x, z)) {
        const rh = rampHeightAt(rmp, x, z);
        if (rh > h && rh <= refTop + 1e-3) h = rh;
      }
    }
  }
  const boxes: readonly Box[] = grid ? grid.queryAABB(x, z, x, z) : lvl.boxes;
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    if (b.dead) continue; // destroyed structure — no collision
    if (
      x > b.x - b.sx / 2 &&
      x < b.x + b.sx / 2 &&
      z > b.z - b.sz / 2 &&
      z < b.z + b.sz / 2
    ) {
      const top = b.y + b.sy / 2;
      if (top > h && top <= refTop + 1e-3) h = top;
    }
  }
  return h;
}

export interface MoveInput {
  fwd: number;
  strafe: number;
  jump: boolean;
}

export function makePlayer3(spawn: { x: number; z: number; yaw: number }): Player3 {
  return { x: spawn.x, y: 0, z: spawn.z, vy: 0, px: 0, pz: 0, yaw: spawn.yaw, pitch: 0, onGround: true, health: 100, armor: 0, maxArmor: 100, zip: null, grapple: null };
}

/** Add a horizontal impulse to the player (boss knockback / pull). `(dx,dz)` is
 *  the push direction (need not be normalized); `strength` is the velocity added.
 *  For a pull vortex, point it toward the centre each frame. */
export function pushPlayer(p: Player3, dx: number, dz: number, strength: number): void {
  const d = Math.hypot(dx, dz) || 1;
  p.px += (dx / d) * strength;
  p.pz += (dz / d) * strength;
}

/** Launch the player upward (slam knockback / eruption). Takes the max so it never
 *  cancels an existing jump. */
export function launchPlayer(p: Player3, vy: number): void {
  if (vy > p.vy) p.vy = vy;
  p.onGround = false;
}

/** Begin a grapple flight to (tx,ty,tz) — a fixed-duration arc up onto a rooftop
 *  (collision is ignored during the flight; you land at the safe target). */
export function startGrapple(p: Player3, tx: number, ty: number, tz: number): void {
  const dist = Math.hypot(tx - p.x, ty - p.y, tz - p.z);
  const dur = Math.min(0.8, Math.max(0.32, dist / 32));
  p.grapple = { x0: p.x, y0: p.y, z0: p.z, tx, ty, tz, t: dur, dur };
  p.zip = null;
  p.vy = 0;
}

function overlapXZ(p: Player3, b: Box): boolean {
  return (
    p.x + R > b.x - b.sx / 2 &&
    p.x - R < b.x + b.sx / 2 &&
    p.z + R > b.z - b.sz / 2 &&
    p.z - R < b.z + b.sz / 2
  );
}
function overlapY(p: Player3, b: Box): boolean {
  return p.y + H > b.y - b.sy / 2 && p.y < b.y + b.sy / 2;
}

function inLadder(p: Player3, l: Ladder): boolean {
  return (
    p.x > l.x - l.sx / 2 - R &&
    p.x < l.x + l.sx / 2 + R &&
    p.z > l.z - l.sz / 2 - R &&
    p.z < l.z + l.sz / 2 + R &&
    p.y > l.y0 - 0.6 &&
    p.y < l.y1 + 0.6
  );
}

export function stepPlayer(p: Player3, lvl: Level3D, input: MoveInput, dt: number, grid?: SpatialGrid): void {
  // Candidate boxes overlapping the player's XZ footprint at the current pos.
  // Returns the full box list when no grid is supplied (identical behavior).
  const near = (): readonly Box[] =>
    (grid ? grid.queryAABB(p.x - R, p.z - R, p.x + R, p.z + R) : lvl.boxes).filter((b) => !b.dead);
  // Grapple flight — a fixed-duration arc up onto a rooftop (ignores collision,
  // lands at the safe target). Overrides all other movement while active.
  if (p.grapple) {
    const gr = p.grapple;
    gr.t -= dt;
    const k = Math.min(1, 1 - Math.max(0, gr.t) / gr.dur); // 0 → 1
    p.x = gr.x0 + (gr.tx - gr.x0) * k;
    p.z = gr.z0 + (gr.tz - gr.z0) * k;
    const lift = Math.max(2.5, (gr.ty - gr.y0) * 0.45);
    p.y = gr.y0 + (gr.ty - gr.y0) * k + Math.sin(k * Math.PI) * lift; // parabolic arc up
    p.vy = 0;
    p.onGround = false;
    if (gr.t <= 0) {
      p.x = gr.tx;
      p.y = gr.ty;
      p.z = gr.tz;
      p.grapple = null;
    }
    return;
  }
  // Zipline ride — slide along the line, look freely, drop off at the end.
  if (p.zip) {
    const zl = lvl.ziplines[p.zip.i];
    if (zl) {
      const len = Math.hypot(zl.x1 - zl.x0, zl.y1 - zl.y0, zl.z1 - zl.z0) || 1;
      p.zip.t += (ZIP_SPEED * dt) / len;
      const t = Math.min(1, p.zip.t);
      p.x = zl.x0 + (zl.x1 - zl.x0) * t;
      p.y = zl.y0 + (zl.y1 - zl.y0) * t;
      p.z = zl.z0 + (zl.z1 - zl.z0) * t;
      p.vy = 0;
      if (p.zip.t >= 1 || input.jump) {
        p.zip = null;
        p.onGround = false;
      }
      return;
    }
    p.zip = null;
  }

  // Horizontal wish direction from yaw.
  const fX = -Math.sin(p.yaw);
  const fZ = -Math.cos(p.yaw);
  const rX = -fZ;
  const rZ = fX;
  let wx = fX * input.fwd + rX * input.strafe;
  let wz = fZ * input.fwd + rZ * input.strafe;
  const wl = Math.hypot(wx, wz);
  if (wl > 1) {
    wx /= wl;
    wz /= wl;
  }
  const spd = MOVE * (p.speedMul ?? 1);
  let vx = wx * spd;
  let vz = wz * spd;

  // External impulse (boss knockback / pull vortex): add to this frame's velocity,
  // then decay it. Ignored while on a ladder/zip (those override vx/vz below).
  vx += p.px;
  vz += p.pz;
  const kd = Math.min(1, dt * 6);
  p.px -= p.px * kd;
  p.pz -= p.pz * kd;
  if (Math.abs(p.px) < 0.01) p.px = 0;
  if (Math.abs(p.pz) < 0.01) p.pz = 0;

  const lad = lvl.ladders.find((l) => inLadder(p, l));
  let attached = false;
  if (lad) {
    const up = input.fwd > 0.05;
    const down = input.fwd < -0.05;
    if (up && p.y < lad.y1 - 0.05) {
      // Climbing: lock horizontal so you can't pass through, rise.
      attached = true;
      vx = 0;
      vz = 0;
      p.vy = CLIMB;
    } else if (up && p.y >= lad.y1 - 0.05) {
      // Reached the top → walk OFF onto the floor (in the ladder's exit dir).
      attached = true;
      vx = lad.exX * MOVE;
      vz = lad.exZ * MOVE;
      p.vy = 0;
    } else if (down && p.y > lad.y0 + 0.05) {
      // Descending: lock horizontal, sink.
      attached = true;
      vx = 0;
      vz = 0;
      p.vy = -CLIMB;
    }
    // else (at the bottom, or no climb input) → fall through to normal movement
    // so you can simply walk away.
  }
  if (!attached) {
    if (input.jump && p.onGround) {
      p.vy = JUMP;
      p.onGround = false;
    }
    p.vy -= GRAV * dt;
  }

  // Headroom: can the player stand with feet at `feetY` here (no box clips the
  // body span feetY..feetY+H)? Used to allow step-ups only when there's clearance.
  const headroomClear = (feetY: number, boxes: readonly Box[]): boolean => {
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      if (!overlapXZ(p, b)) continue;
      const bTop = b.y + b.sy / 2;
      const bBot = b.y - b.sy / 2;
      // A box overlaps the body span if it spans above the new feet and below head.
      if (feetY + H > bBot + 1e-4 && feetY < bTop - 1e-4) return false;
    }
    return true;
  };

  // Move + collide, one axis at a time. Each axis re-queries `near()` AFTER the
  // move so the candidate set matches the resolved position (the same boxes the
  // full loop's overlapXZ would test). A blocking box whose top is within STEP_UP
  // of the feet (with headroom) lifts the player onto it instead of stopping.
  p.x += vx * dt;
  {
    const boxes = near();
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      if (!overlapXZ(p, b) || !overlapY(p, b)) continue;
      const top = b.y + b.sy / 2;
      if (p.onGround && top - p.y > 0 && top - p.y <= STEP_UP && headroomClear(top, boxes)) {
        p.y = top; // step up onto the low ledge
      } else {
        p.x = vx > 0 ? b.x - b.sx / 2 - R : b.x + b.sx / 2 + R;
      }
    }
  }
  p.z += vz * dt;
  {
    const boxes = near();
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      if (!overlapXZ(p, b) || !overlapY(p, b)) continue;
      const top = b.y + b.sy / 2;
      if (p.onGround && top - p.y > 0 && top - p.y <= STEP_UP && headroomClear(top, boxes)) {
        p.y = top;
      } else {
        p.z = vz > 0 ? b.z - b.sz / 2 - R : b.z + b.sz / 2 + R;
      }
    }
  }

  p.y += p.vy * dt;
  p.onGround = false;
  const yboxes = near();
  for (let i = 0; i < yboxes.length; i++) {
    const b = yboxes[i];
    if (!overlapXZ(p, b) || !overlapY(p, b)) continue;
    if (p.vy <= 0) {
      // landing on top of a box
      p.y = b.y + b.sy / 2;
      p.vy = 0;
      p.onGround = true;
    } else {
      // bonk a ceiling
      p.y = b.y - b.sy / 2 - H;
      p.vy = 0;
    }
  }

  // Ramp snap — a ramp is a height FUNCTION, not a solid box, so it isn't in the
  // box-stop pass above (no fighting/jitter). When grounded or descending and the
  // feet are at/just above the ramp surface under us, glue to that surface so you
  // walk up/down smoothly. Never while ascending through a jump (vy > 0).
  if (lvl.ramps && lvl.ramps.length > 0 && p.vy <= 0) {
    let surf = -Infinity;
    for (let i = 0; i < lvl.ramps.length; i++) {
      const rmp = lvl.ramps[i];
      if (rampContains(rmp, p.x, p.z)) {
        const rh = rampHeightAt(rmp, p.x, p.z);
        if (rh > surf) surf = rh;
      }
    }
    if (surf > -Infinity && p.y <= surf + RAMP_SNAP && surf >= 0) {
      p.y = surf;
      p.vy = 0;
      p.onGround = true;
    }
  }

  if (p.y <= 0) {
    p.y = 0;
    if (p.vy < 0) p.vy = 0;
    p.onGround = true;
  }

  // Jump pad — launch on contact.
  if (p.onGround) {
    for (const pad of lvl.pads) {
      if (Math.hypot(p.x - pad.x, p.z - pad.z) < pad.r) {
        p.vy = pad.power;
        p.onGround = false;
        break;
      }
    }
  }

  // Zipline — push forward into a start node to grab it.
  if (!p.zip && input.fwd > 0.3) {
    for (let i = 0; i < lvl.ziplines.length; i++) {
      const zl = lvl.ziplines[i];
      if (Math.hypot(p.x - zl.x0, p.y - zl.y0, p.z - zl.z0) < 1.8) {
        p.zip = { i, t: 0 };
        break;
      }
    }
  }
}
