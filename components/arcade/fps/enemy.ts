/**
 * Enemy bots + adaptive AI. Bots DON'T know where you are until they SEE you
 * (a line-of-sight raycast, blocked by walls). Once they spot you they go
 * alert, chase to a preferred range, strafe, and shoot — leading your movement,
 * so holding a straight line gets you hit while juking/relocating throws them
 * off. Break line of sight and they advance on your last-known spot, then give
 * up. Difficulty scales reaction, accuracy, speed, damage, and view range.
 */
import { segBlocked, segHitsSphere, type Vec3 } from './combat';
import type { Level3D } from './level3d';
import { EYE, type Player3 } from './physics';

export type Difficulty = 'normal' | 'hard' | 'nightmare';

export interface Enemy {
  x: number;
  y: number;
  z: number;
  health: number;
  maxHealth: number;
  state: 'idle' | 'alert';
  lastSeen: { x: number; z: number } | null;
  fireCd: number;
  hitFlash: number;
  wander: number;
  step: number; // accumulated gait distance (drives the run animation)
  alarm: number; // seconds of "under fire" evasive behaviour after being shot
  weapon: WeaponKind;
  role: Role;
  side: 1 | -1; // which way this bot flanks/orbits
  barUntil: number; // show a health bar until this timestamp (set on hit)
  boss: BossKind | null;
}

/** The four boss aliens (levels 5/10/15/20). Bigger, faster, smarter; each has
 *  a ranged attack + a melee attack when you get close. */
export type BossKind = 'xeno' | 'warrior' | 'octopus';
export interface BossDef {
  name: string;
  health: number;
  speed: number;
  scale: number; // sprite size vs a regular alien (~4×)
  radius: number; // collision/hit radius
  meleeRange: number;
  meleeDmg: number;
  meleeRate: number;
  rangeDmg: number;
  rangeRate: number;
  acc: number; // hit chance (they barely miss)
  color: number; // ranged tracer colour
}
export const BOSSES: Record<BossKind, BossDef> = {
  xeno: { name: 'XENOMORPH', health: 3500, speed: 9, scale: 4, radius: 1.6, meleeRange: 4, meleeDmg: 34, meleeRate: 0.7, rangeDmg: 16, rangeRate: 0.6, acc: 0.85, color: 0x9cff6a },
  warrior: { name: 'WARLORD', health: 4000, speed: 8, scale: 4, radius: 1.6, meleeRange: 4, meleeDmg: 42, meleeRate: 0.6, rangeDmg: 13, rangeRate: 0.16, acc: 0.9, color: 0xff9a3a },
  octopus: { name: 'KRAKEN', health: 4500, speed: 7.5, scale: 4.3, radius: 1.9, meleeRange: 5, meleeDmg: 30, meleeRate: 0.5, rangeDmg: 18, rangeRate: 0.4, acc: 0.88, color: 0xc08bff },
};

export type WeaponKind = 'rifle' | 'mg' | 'laser';
/** Squad combat roles — so a group doesn't all blindly rush. */
export type Role = 'tank' | 'sniper' | 'assault' | 'flanker' | 'suppressor' | 'skirmisher';
/** The sniper's long-range weapon (it swaps to a rifle if you close in). */
const SNIPER_W = { rate: 1.7, dmg: 30, accMod: 1.7, color: 0x9af0ff };
const TANK_HP_MUL = 3;
/** Shared squad awareness — one bot's sighting cues the whole group. */
export interface Squad {
  lastKnown: { x: number; z: number } | null;
  t: number;
}

/** Active smoke cloud — blocks the aliens' line of sight. */
export interface Smoke {
  x: number;
  y: number;
  z: number;
  r: number;
}

const ENEMY_HP = 500; // 5× tougher

// The aliens draw from the same weapon families the player does.
const WEAPONS: Record<WeaponKind, { rate: number; dmg: number; accMod: number; color: number }> = {
  rifle: { rate: 0.9, dmg: 9, accMod: 1.0, color: 0xff8a4a },
  mg: { rate: 0.16, dmg: 4, accMod: 0.5, color: 0xff5d6e },
  laser: { rate: 1.2, dmg: 13, accMod: 1.1, color: 0x7fdfff },
};
const WEAPON_KEYS: WeaponKind[] = ['rifle', 'mg', 'laser'];

// Standoff range, flank angle (rad), orbit strafe, speed per role.
const ROLE: Record<Role, { range: number; angle: number; strafe: number; speedMul: number }> = {
  tank: { range: 5, angle: 0.0, strafe: 0.25, speedMul: 0.7 }, // soaks damage, pushes in
  sniper: { range: 28, angle: 0.12, strafe: 0.2, speedMul: 0.85 }, // holds far, accurate
  assault: { range: 6, angle: 0.0, strafe: 0.5, speedMul: 1.05 },
  flanker: { range: 8, angle: 1.2, strafe: 0.7, speedMul: 1.0 },
  suppressor: { range: 17, angle: 0.25, strafe: 0.3, speedMul: 0.8 },
  skirmisher: { range: 11, angle: 0.7, strafe: 1.0, speedMul: 1.1 },
};
/** A deliberate squad composition by index: a pusher, pincer flankers on
 *  OPPOSITE sides, a suppressor that holds, and a skirmisher. */
function squadRole(i: number, count: number): { role: Role; side: 1 | -1 } {
  if (count === 1) return { role: 'assault', side: 1 };
  // With a group there's always a TANK (front-line, soaks damage) and a SNIPER
  // (holds far, accurate), then flankers / suppressor.
  const comp: { role: Role; side: 1 | -1 }[] = [
    { role: 'tank', side: 1 },
    { role: 'sniper', side: -1 },
    { role: 'flanker', side: 1 },
    { role: 'flanker', side: -1 },
    { role: 'suppressor', side: 1 },
  ];
  return comp[i] ?? { role: 'skirmisher', side: i % 2 === 0 ? 1 : -1 };
}

const R = 0.45; // collision radius
const EYE_H = 1.4;

interface Params {
  acc: number;
  dmg: number;
  rate: number;
  speed: number;
  view: number;
}
const PARAMS: Record<Difficulty, Params> = {
  normal: { acc: 0.3, dmg: 7, rate: 1.1, speed: 2.4, view: 48 },
  hard: { acc: 0.45, dmg: 9, rate: 0.85, speed: 3.0, view: 64 },
  nightmare: { acc: 0.62, dmg: 12, rate: 0.62, speed: 3.6, view: 84 },
};

function blocked(lvl: Level3D, x: number, z: number, r = R): boolean {
  for (const b of lvl.boxes) {
    if (
      x + r > b.x - b.sx / 2 &&
      x - r < b.x + b.sx / 2 &&
      z + r > b.z - b.sz / 2 &&
      z - r < b.z + b.sz / 2 &&
      b.y - b.sy / 2 < 1.6 // only ground-level obstacles matter to a grounded bot
    ) {
      return true;
    }
  }
  return false;
}

/** If a wall is dead ahead, steer around it (probe rotated directions). */
function avoidWalls(e: Enemy, lvl: Level3D, dx: number, dz: number, r: number): [number, number] {
  const look = 1.8;
  if (!blocked(lvl, e.x + dx * look, e.z + dz * look, r)) return [dx, dz];
  for (const a of [0.9, -0.9, 1.6, -1.6, 2.4, -2.4]) {
    const c = Math.cos(a);
    const s = Math.sin(a);
    const nx = dx * c - dz * s;
    const nz = dx * s + dz * c;
    if (!blocked(lvl, e.x + nx * look, e.z + nz * look, r)) return [nx, nz];
  }
  return [dx, dz];
}

function moveEnemy(e: Enemy, lvl: Level3D, wx: number, wz: number, speed: number, dt: number, r = R): void {
  const l = Math.hypot(wx, wz);
  if (l < 0.01) return;
  const [dx, dz] = avoidWalls(e, lvl, wx / l, wz / l, r); // path around walls, not into them
  const sp = speed * dt;
  const nx = e.x + dx * sp;
  const nz = e.z + dz * sp;
  if (!blocked(lvl, nx, e.z, r)) e.x = nx;
  if (!blocked(lvl, e.x, nz, r)) e.z = nz;
  e.step += speed * dt * 1.3; // advance the running gait
}

export function spawnEnemies(lvl: Level3D, count: number, rand: () => number): Enemy[] {
  const out: Enemy[] = [];
  const half = lvl.size / 2;
  const a = lvl.enemySpawn; // far end, opposite the player
  const R = Math.max(6, lvl.size * 0.16);
  let guard = 0;
  while (out.length < count && guard++ < count * 90) {
    const ang = rand() * Math.PI * 2;
    const rad = rand() * R;
    const x = a.x + Math.cos(ang) * rad;
    const z = a.z + Math.sin(ang) * rad;
    if (Math.abs(x) > half - 3 || Math.abs(z) > half - 3) continue;
    if (blocked(lvl, x, z)) continue;
    const sr = squadRole(out.length, count);
    const hp = sr.role === 'tank' ? ENEMY_HP * TANK_HP_MUL : ENEMY_HP;
    out.push({ x, y: 0, z, health: hp, maxHealth: hp, state: 'idle', lastSeen: null, fireCd: rand() * 0.6, hitFlash: 0, wander: rand() * 6, step: 0, alarm: 0, weapon: WEAPON_KEYS[Math.floor(rand() * WEAPON_KEYS.length)], role: sr.role, side: sr.side, barUntil: 0, boss: null });
  }
  return out;
}

/** Spawn the boss(es) for a boss level (level 20 = all three). */
export function spawnBosses(lvl: Level3D, kinds: BossKind[], rand: () => number): Enemy[] {
  const a = lvl.enemySpawn;
  return kinds.map((k, i) => {
    const bd = BOSSES[k];
    const ang = (i / Math.max(1, kinds.length)) * Math.PI * 2;
    return {
      x: a.x + Math.cos(ang) * 5 * i,
      y: 0,
      z: a.z + Math.sin(ang) * 5 * i,
      health: bd.health,
      maxHealth: bd.health,
      state: 'idle' as const,
      lastSeen: null,
      fireCd: rand() * 0.5,
      hitFlash: 0,
      wander: rand() * 6,
      step: 0,
      alarm: 0,
      weapon: 'rifle' as WeaponKind,
      role: 'assault' as Role,
      side: (rand() < 0.5 ? 1 : -1) as 1 | -1,
      barUntil: 0,
      boss: k,
    };
  });
}

export interface EnemyTracer {
  from: Vec3;
  to: Vec3;
  color: number;
}

/** Advance all bots with squad tactics: shared sight intel, role-based standoff
 *  + flanking, spacing, and LoS-gated fire. Returns player damage, tracers, and
 *  whether any bot can currently see the player (gates regen). */
export function updateEnemies(
  enemies: Enemy[],
  player: Player3,
  lvl: Level3D,
  diff: Difficulty,
  pvx: number,
  pvz: number,
  dt: number,
  now: number,
  squad: Squad,
  smokes: Smoke[],
): { damage: number; tracers: EnemyTracer[]; seen: boolean } {
  const P = PARAMS[diff];
  const peye: Vec3 = [player.x, player.y + EYE, player.z];
  const pspeed = Math.hypot(pvx, pvz);
  let damage = 0;
  let seen = false;
  const tracers: EnemyTracer[] = [];

  // Pass 1: sightings → personal memory + SHARED squad intel (smoke blocks it).
  const sees = enemies.map((e) => {
    if (e.health <= 0) return false;
    const dist = Math.hypot(player.x - e.x, player.z - e.z);
    if (dist >= (e.boss ? 220 : e.role === 'sniper' ? 100 : P.view)) return false;
    const eeye: Vec3 = [e.x, e.y + EYE_H, e.z];
    if (segBlocked(eeye, peye, lvl)) return false;
    for (const sm of smokes) if (segHitsSphere(eeye, peye, [sm.x, sm.y, sm.z], sm.r)) return false;
    return true;
  });
  for (let i = 0; i < enemies.length; i++) {
    if (sees[i]) {
      seen = true;
      enemies[i].state = 'alert';
      enemies[i].lastSeen = { x: player.x, z: player.z };
      squad.lastKnown = { x: player.x, z: player.z };
      squad.t = now;
    }
  }
  const haveIntel = squad.lastKnown != null && now - squad.t < 8000;

  // Pass 2: act on personal or shared knowledge.
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (e.health <= 0) continue;
    if (e.hitFlash > 0) e.hitFlash -= dt;
    if (e.alarm > 0) e.alarm -= dt;

    // Bosses: relentless pursuit to melee range; ranged attack at distance,
    // melee (claws/sword/tentacles) up close. Smart = high accuracy.
    if (e.boss) {
      const bd = BOSSES[e.boss];
      const tgtB = e.state === 'alert' && e.lastSeen ? e.lastSeen : haveIntel ? squad.lastKnown : null;
      if (tgtB) {
        e.state = 'alert';
        let wx = tgtB.x - e.x;
        let wz = tgtB.z - e.z;
        const td = Math.hypot(wx, wz) || 1;
        wx /= td;
        wz /= td;
        for (let j = 0; j < enemies.length; j++) {
          if (j === i || enemies[j].health <= 0) continue;
          const dx = e.x - enemies[j].x;
          const dz = e.z - enemies[j].z;
          const d2 = dx * dx + dz * dz;
          if (d2 < 16 && d2 > 0.0001) {
            const d = Math.sqrt(d2);
            wx += (dx / d) * 0.6;
            wz += (dz / d) * 0.6;
          }
        }
        moveEnemy(e, lvl, wx, wz, bd.speed, dt, bd.radius);
        const dist = Math.hypot(player.x - e.x, player.z - e.z);
        e.fireCd -= dt;
        if (dist < bd.meleeRange) {
          if (e.fireCd <= 0) {
            e.fireCd = bd.meleeRate;
            damage += bd.meleeDmg;
            tracers.push({ from: [e.x, e.y + bd.scale * 0.5, e.z], to: peye, color: 0xff3344 });
          }
        } else if (sees[i] && e.fireCd <= 0) {
          e.fireCd = bd.rangeRate;
          tracers.push({ from: [e.x, e.y + bd.scale * 0.7, e.z], to: peye, color: bd.color });
          if (Math.random() < bd.acc) damage += bd.rangeDmg;
        }
      }
      continue;
    }

    const role = ROLE[e.role];
    const tgt = e.state === 'alert' && e.lastSeen ? e.lastSeen : haveIntel ? squad.lastKnown : null;

    if (tgt) {
      e.state = 'alert';
      const boosted = e.alarm > 0;
      // Move to a role-based standoff position around the target — flankers come
      // in from the side, suppressors hold far back, skirmishers harass.
      const baseAng = Math.atan2(e.z - tgt.z, e.x - tgt.x); // target→bot bearing
      const ang = baseAng + role.angle * e.side;
      const standX = tgt.x + Math.cos(ang) * role.range;
      const standZ = tgt.z + Math.sin(ang) * role.range;
      let wx = standX - e.x;
      let wz = standZ - e.z;
      const md = Math.hypot(wx, wz);
      if (md > 0.6) {
        wx /= md;
        wz /= md;
      } else {
        wx = 0;
        wz = 0;
      }
      // orbit/strafe once roughly in position
      const orbit = (md > 0.6 ? 0.25 : 1) * role.strafe * (boosted ? 1.6 : 1);
      wx += -Math.sin(baseAng) * e.side * orbit;
      wz += Math.cos(baseAng) * e.side * orbit;
      // spacing — push off nearby allies so they don't clump
      for (let j = 0; j < enemies.length; j++) {
        if (j === i || enemies[j].health <= 0) continue;
        const dx = e.x - enemies[j].x;
        const dz = e.z - enemies[j].z;
        const d2 = dx * dx + dz * dz;
        if (d2 < 9 && d2 > 0.0001) {
          const d = Math.sqrt(d2);
          wx += (dx / d) * 0.5;
          wz += (dz / d) * 0.5;
        }
      }
      moveEnemy(e, lvl, wx, wz, P.speed * role.speedMul * (boosted ? 1.25 : 1), dt);

      // Fire only with personal line-of-sight.
      e.fireCd -= dt;
      const dist = Math.hypot(player.x - e.x, player.z - e.z);
      // Sniper: long-range scope far out, swaps to a rifle if you close inside ~12.
      const W = e.role === 'sniper' ? (dist > 12 ? SNIPER_W : WEAPONS.rifle) : WEAPONS[e.weapon];
      if (sees[i] && e.fireCd <= 0) {
        e.fireCd = W.rate;
        tracers.push({ from: [e.x, e.y + EYE_H, e.z], to: peye, color: W.color });
        const evade = Math.min(0.7, pspeed * 0.14);
        const distFactor = e.role === 'sniper' && dist > 12 ? 1 : Math.max(0.12, 1 - Math.max(0, dist - 8) / 38);
        if (Math.random() < P.acc * W.accMod * distFactor * (1 - evade)) damage += W.dmg;
      }
      // Give up only when there's no personal sight, no shared intel, and the
      // bot has reached the spot.
      if (!sees[i] && !haveIntel && md < 1.5) {
        e.state = 'idle';
        e.lastSeen = null;
      }
    } else {
      moveEnemy(e, lvl, Math.sin(now / 1500 + e.wander), Math.cos(now / 1700 + e.wander * 2), P.speed * 0.35, dt);
    }
  }
  return { damage, tracers, seen };
}
