/**
 * Player physics for the 3D FPS. Capsule-ish AABB vs the level's box colliders,
 * per-axis resolution (so you slide along walls and stand on upper floors),
 * gravity + jump, and ladder zones you climb by simply walking into them.
 */
import type { Box, Ladder, Level3D } from './level3d';

export interface Player3 {
  x: number;
  y: number; // feet
  z: number;
  vy: number;
  yaw: number;
  pitch: number;
  onGround: boolean;
  health: number;
  /** Active zipline ride (index into level.ziplines + progress 0..1). */
  zip: { i: number; t: number } | null;
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

export interface MoveInput {
  fwd: number;
  strafe: number;
  jump: boolean;
}

export function makePlayer3(spawn: { x: number; z: number; yaw: number }): Player3 {
  return { x: spawn.x, y: 0, z: spawn.z, vy: 0, yaw: spawn.yaw, pitch: 0, onGround: true, health: 100, zip: null };
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

export function stepPlayer(p: Player3, lvl: Level3D, input: MoveInput, dt: number): void {
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
  let vx = wx * MOVE;
  let vz = wz * MOVE;

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

  // Move + collide, one axis at a time.
  p.x += vx * dt;
  for (const b of lvl.boxes) {
    if (overlapXZ(p, b) && overlapY(p, b)) p.x = vx > 0 ? b.x - b.sx / 2 - R : b.x + b.sx / 2 + R;
  }
  p.z += vz * dt;
  for (const b of lvl.boxes) {
    if (overlapXZ(p, b) && overlapY(p, b)) p.z = vz > 0 ? b.z - b.sz / 2 - R : b.z + b.sz / 2 + R;
  }

  p.y += p.vy * dt;
  p.onGround = false;
  for (const b of lvl.boxes) {
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
