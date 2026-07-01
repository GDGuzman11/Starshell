/**
 * Enemy bots + adaptive AI. Bots DON'T know where you are until they SEE you
 * (a line-of-sight raycast, blocked by walls). Once they spot you they go
 * alert, chase to a preferred range, strafe, and shoot — leading your movement,
 * so holding a straight line gets you hit while juking/relocating throws them
 * off. Break line of sight and they advance on your last-known spot, then give
 * up. Difficulty scales reaction, accuracy, speed, damage, and view range.
 */
import { segBlocked, segHitsSphere, type Vec3 } from './combat';
import type { Box, Ladder, Level3D } from './level3d';
import type { SpatialGrid } from './level/grid';
import { type NavGraph, type NavNode, nearestNode, pathTo } from './level/nav';
import { EYE, groundHeightAt, type Player3, pushPlayer } from './physics';
import type { EnemyClass } from './enemies/types';
import { type BossBrainState, makeBossBrain, tickBossBrain } from './boss/brain';
import { MINIONS, type MinionKind } from './boss/minions';

export type Difficulty = 'normal' | 'hard' | 'nightmare';

export interface Enemy {
  x: number;
  y: number;
  z: number;
  health: number;
  maxHealth: number;
  shield: number; // absorbs damage before health; slowly regenerates out of combat
  maxShield: number;
  shieldRegenT: number; // seconds until shield regen resumes (reset on every hit)
  state: 'idle' | 'alert';
  lastSeen: { x: number; z: number } | null;
  fireCd: number;
  hitFlash: number;
  wander: number;
  step: number; // accumulated gait distance (drives the run animation)
  alarm: number; // seconds of "under fire" evasive behaviour after being shot
  weapon: WeaponKind;
  cls: EnemyClass;
  side: 1 | -1; // which way this bot flanks/orbits
  barUntil: number; // show a health bar until this timestamp (set on hit)
  boss: BossKind | null;
  track: number; // seconds of continuous line-of-sight (accuracy zeroes in)
  muzzle: number; // seconds left on the firing pose / muzzle flash
  // Throwable-applied status (timers, seconds). Decremented by the game loop.
  stunT: number; // frozen: no move, no fire
  slowT: number; // movement at ~45%
  blindT: number; // can't see/acquire the player
  burnT: number; // taking damage-over-time
  burnDps: number;
  // Vertical / climbing.
  onDeck: boolean; // standing on an elevated floor (don't fall)
  perch: { x: number; z: number; y: number } | null; // sniper tower target / chosen vantage
  perchT?: number; // sniper: cooldown before re-picking a better vantage
  squadId: number; // which squad this bot belongs to (independent intel per squad)
  healCd?: number; // healer (engineer): cooldown between heal-beam pulses
  // Nav (Phase 4): cached A* route (remaining waypoint node ids), repath cooldown,
  // and the goal the route was planned for (repath when it moves). All optional so
  // existing constructors and the no-graph fallback are untouched.
  path?: number[];
  repath?: number;
  navGoal?: { x: number; z: number };
  bossBrain?: BossBrainState; // tactical movement brain (bosses only)
  minion?: MinionKind; // boss-faction minion type (drives model + role AI)
  weakUntil?: number; // timestamp: boss is in a vulnerability window (bonus damage)
  dormant?: boolean; // reinforcement minion not yet woken (hidden, inert)
  wakeAtHp?: number; // boss HP fraction at/below which this reinforcement wakes
  destructible?: 'beacon' | 'shield'; // a deployable object (no AI), shootable
  enh?: boolean; // ENHANCED gauntlet variant (bigger, faster, more aggressive)
}

// Energy shield carried by every regular enemy: starts at 3/4 of max HP, absorbs
// damage before health, and slowly regenerates a few seconds after last being hit
// (so breaking line-of-sight lets a squad re-armour). Bosses are excluded (they're
// a separate system with their own large HP pools).
export const SHIELD_FRAC = 0.75;
const SHIELD_REGEN_DELAY = 4; // s out of combat before the shield starts refilling
const SHIELD_REGEN_FRAC = 0.09; // of maxShield per second once regenerating (~11s to full)

/** Apply damage, depleting the shield first then health, and pause shield regen.
 *  Carries overflow from a big hit straight through into health. */
export function hurtEnemy(e: Enemy, amount: number): void {
  if (amount <= 0) return;
  e.shieldRegenT = SHIELD_REGEN_DELAY;
  if (e.shield > 0) {
    const absorbed = Math.min(e.shield, amount);
    e.shield -= absorbed;
    amount -= absorbed;
  }
  if (amount > 0) e.health -= amount;
}

/** The four boss aliens (levels 5/10/15/20). Bigger, faster, smarter; each has
 *  a ranged attack + a melee attack when you get close. */
export type BossKind = 'xeno' | 'warrior' | 'octopus' | 'archon' | 'behemoth' | 'specter' | 'leviathan' | 'monolith' | 'oblivion' | 'colossus' | 'chimera' | 'oracle' | 'infestor';
export interface BossDef {
  name: string;
  health: number;
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
// Damage tuned to ~2× a normal alien hit (~10), scaled per boss for identity;
// bosses also move at exactly 2× the normal enemy speed (applied below).
export const BOSSES: Record<BossKind, BossDef> = {
  xeno: { name: 'XENOMORPH', health: 3500, scale: 4, radius: 1.6, meleeRange: 4, meleeDmg: 22, meleeRate: 0.7, rangeDmg: 14, rangeRate: 0.6, acc: 0.85, color: 0x9cff6a },
  warrior: { name: 'WARLORD', health: 4000, scale: 4, radius: 1.6, meleeRange: 4, meleeDmg: 24, meleeRate: 0.6, rangeDmg: 11, rangeRate: 0.16, acc: 0.9, color: 0xff9a3a },
  octopus: { name: 'KRAKEN', health: 4500, scale: 4.3, radius: 1.9, meleeRange: 5, meleeDmg: 20, meleeRate: 0.5, rangeDmg: 16, rangeRate: 0.4, acc: 0.88, color: 0xc08bff },
  // ARCHON — Ancient AI: a hovering geometric construct. Precise, high-accuracy
  // ranged fire; blink-teleports between vantage points. Lower melee (it never brawls).
  archon: { name: 'ARCHON', health: 4200, scale: 3.4, radius: 1.5, meleeRange: 3, meleeDmg: 16, meleeRate: 0.7, rangeDmg: 15, rangeRate: 0.42, acc: 0.95, color: 0x49a6ff },
  // BEHEMOTH — Living Fortress: a huge armored quadruped. Very tanky + big radius;
  // slow relentless advance, heavy stomps + boulder lobs. Never kites.
  behemoth: { name: 'BEHEMOTH', health: 5200, scale: 3.0, radius: 2.4, meleeRange: 6, meleeDmg: 26, meleeRate: 0.9, rangeDmg: 16, rangeRate: 0.9, acc: 0.7, color: 0xffb14a },
  // SPECTER — Stealth Wraith: thin, fast, fragile. Teleport phase-strikes + fear
  // pulses; goes solid only briefly after a strike. Low HP (a glass ambusher).
  specter: { name: 'SPECTER', health: 3400, scale: 3.3, radius: 1.3, meleeRange: 4, meleeDmg: 24, meleeRate: 0.8, rangeDmg: 12, rangeRate: 0.5, acc: 0.8, color: 0xb877ff },
  // LEVIATHAN — Serpent Burrower: dives + erupts under you (exposing its spine), tail
  // sweeps, venom spits. Big + fast apex hunter.
  leviathan: { name: 'LEVIATHAN', health: 4800, scale: 3.2, radius: 2.0, meleeRange: 5, meleeDmg: 24, meleeRate: 0.7, rangeDmg: 16, rangeRate: 0.7, acc: 0.8, color: 0x9adb3a },
  // MONOLITH — Living Crystal: near-stationary artillery. Charges a heavy refracting
  // resonance beam (vulnerable while charging) + shard novas. High-accuracy ranged.
  monolith: { name: 'MONOLITH', health: 5000, scale: 3.4, radius: 1.8, meleeRange: 4, meleeDmg: 18, meleeRate: 0.9, rangeDmg: 20, rangeRate: 0.9, acc: 0.92, color: 0x7fe8ff },
  // OBLIVION — Void Entity: floats; gravity-pulls you into range, void novas (dimming
  // its core = weak), darkens vision. Rifts spawn void crawlers.
  oblivion: { name: 'OBLIVION', health: 4600, scale: 3.0, radius: 1.7, meleeRange: 4, meleeDmg: 20, meleeRate: 0.8, rangeDmg: 15, rangeRate: 0.5, acc: 0.85, color: 0xc98bff },
  // COLOSSUS — Titan War Machine: the biggest, tankiest. Advances in mobile mode; locks
  // into SIEGE mode (stationary, cooling core exposed = weak) for a heavy cannon + rocket
  // barrage. Overwhelming firepower.
  colossus: { name: 'COLOSSUS', health: 6000, scale: 3.6, radius: 2.4, meleeRange: 6, meleeDmg: 28, meleeRate: 1.0, rangeDmg: 18, rangeRate: 0.8, acc: 0.82, color: 0xff8a3a },
  // CHIMERA — Adaptive Bio-Weapon: fast, aggressive. Dash-slashes in, spine-volleys, and
  // periodically MUTATES (genome sac exposed = weak). Reconfigures relentlessly.
  chimera: { name: 'CHIMERA', health: 4600, scale: 3.0, radius: 1.7, meleeRange: 5, meleeDmg: 22, meleeRate: 0.6, rangeDmg: 14, rangeRate: 0.45, acc: 0.84, color: 0xff5ac8 },
  // ORACLE — Reality & Time: a floating fractal flower. Unfolds (core exposed = weak) to
  // fire convergence beams + a time-echo second bolt; rewinds a wounded ally to full.
  oracle: { name: 'ORACLE', health: 4400, scale: 3.2, radius: 1.5, meleeRange: 4, meleeDmg: 16, meleeRate: 0.9, rangeDmg: 17, rangeRate: 0.5, acc: 0.9, color: 0xffd98a },
  // INFESTOR — Parasitic Evolution: an oozing swarm-mass. Parasite-spray cones, splits
  // (heart exposed = weak) with a knockback, and regenerates while its brood lives.
  infestor: { name: 'INFESTOR', health: 5200, scale: 3.2, radius: 2.1, meleeRange: 5, meleeDmg: 22, meleeRate: 0.7, rangeDmg: 15, rangeRate: 0.7, acc: 0.8, color: 0x9cd84a },
};

export type WeaponKind = 'rifle' | 'mg' | 'laser';
/** The marksman's long-range weapon (it swaps to a rifle if you close in). */
const SNIPER_W = { rate: 1.7, dmg: 30, accMod: 1.7, color: 0x9af0ff };
/** Coarse learning grid resolution (HGRID × HGRID cells over the arena). */
const HGRID = 6;
/** What the squad LEARNS about the player, persisted across fights in a run so
 *  later levels hunt smarter: where the player likes to be (heat), how they
 *  engage (aggression + preferred range), and how many bots they've dropped
 *  (losses → tighter coordination + more cover use). */
export interface HuntMemory {
  heat: Float32Array; // player-presence accumulation per cell (decays slowly)
  aggression: number; // 0 (camps) … 1 (rushes), EMA of player speed
  preferRange: number; // running avg distance the player fights at
  losses: number; // bots downed across the run
}
export function makeHuntMemory(): HuntMemory {
  return { heat: new Float32Array(HGRID * HGRID), aggression: 0.5, preferRange: 16, losses: 0 };
}
function heatCell(x: number, z: number, size: number): number {
  const gx = Math.min(HGRID - 1, Math.max(0, Math.floor(((x + size / 2) / size) * HGRID)));
  const gz = Math.min(HGRID - 1, Math.max(0, Math.floor(((z + size / 2) / size) * HGRID)));
  return gz * HGRID + gx;
}
function cellCenter(idx: number, size: number): { x: number; z: number } {
  const gx = idx % HGRID;
  const gz = Math.floor(idx / HGRID);
  return { x: -size / 2 + (gx + 0.5) * (size / HGRID), z: -size / 2 + (gz + 0.5) * (size / HGRID) };
}

/** Shared squad awareness — one bot's sighting cues the whole group, plus the
 *  coordinated hunt plan (learned focus + per-frame book-keeping). */
export interface Squad {
  lastKnown: { x: number; z: number } | null;
  t: number;
  mem?: HuntMemory; // persistent learning (same object across a run's levels)
  hot?: { x: number; z: number } | null; // learned favourite ground (hottest cell)
  planT?: number; // re-plan / heat-decay cooldown
  lastAlive?: number; // alive bot count last frame (to detect losses)
  aggroUntil?: number; // hive-screech buff window: minions surge faster/aggressive
  buffUntil?: number; // Warlord Command Beacon: legion accuracy buff while it lives
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

// Per-class combat params: standoff range, flank angle (rad), orbit strafe, speed
// multiplier, HP multiplier (× ENEMY_HP), and acquisition-range multiplier (×
// difficulty view). This is what gives each of the 10 classes distinct movement.
interface ClassDef {
  range: number;
  angle: number;
  strafe: number;
  speedMul: number;
  hp: number;
  viewMul: number;
}
const CLASS: Record<EnemyClass, ClassDef> = {
  rifleman: { range: 7, angle: 0.0, strafe: 0.5, speedMul: 1.0, hp: 1.0, viewMul: 1.0 }, // core, uses cover
  scout: { range: 12, angle: 1.3, strafe: 1.0, speedMul: 1.35, hp: 0.7, viewMul: 1.2 }, // fast, circles, retreats
  breacher: { range: 4, angle: 0.1, strafe: 0.4, speedMul: 1.05, hp: 2.2, viewMul: 0.95 }, // rushes close
  marksman: { range: 30, angle: 0.12, strafe: 0.2, speedMul: 0.85, hp: 0.9, viewMul: 2.2 }, // perches, long range
  suppressor: { range: 18, angle: 0.25, strafe: 0.25, speedMul: 0.75, hp: 1.8, viewMul: 1.0 }, // pins, holds
  engineer: { range: 22, angle: 0.3, strafe: 0.3, speedMul: 0.9, hp: 1.2, viewMul: 0.9 }, // hangs back (support)
  tank: { range: 6, angle: 0.0, strafe: 0.2, speedMul: 0.6, hp: 3.0, viewMul: 1.0 }, // slow, heavy push
  elite: { range: 9, angle: 1.1, strafe: 0.7, speedMul: 1.1, hp: 1.5, viewMul: 1.15 }, // fast flank
  commander: { range: 20, angle: 0.2, strafe: 0.3, speedMul: 0.85, hp: 2.0, viewMul: 1.1 }, // stays back, calm
  berserker: { range: 2.5, angle: 0.0, strafe: 0.3, speedMul: 1.3, hp: 1.6, viewMul: 1.0 }, // charges to melee
};

/** Every squad is a fixed 5-man fireteam: a CAPTAIN who steadies their aim, two
 *  SNIPERS who perch, a heavy TANK who drives forward, and a HEALER who roams and
 *  patches up the wounded. The campaign spawns N of these identical squads. */
export const SQUAD_ROLES: EnemyClass[] = ['commander', 'marksman', 'marksman', 'tank', 'engineer'];
export const SQUAD_SIZE = SQUAD_ROLES.length;
const HEAL_RATE = 55; // HP/s a healer restores to a nearby wounded ally

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
  // `view` = how close a regular bot must be to acquire you (LoS still required).
  // Kept well under the arena size so they DON'T spot you across the map at spawn.
  normal: { acc: 0.24, dmg: 7, rate: 1.1, speed: 2.4, view: 26 },
  hard: { acc: 0.36, dmg: 9, rate: 0.85, speed: 3.0, view: 33 },
  nightmare: { acc: 0.5, dmg: 12, rate: 0.62, speed: 3.6, view: 42 },
};

function blocked(lvl: Level3D, x: number, z: number, r = R, grid?: SpatialGrid): boolean {
  const boxes = grid ? grid.queryAABB(x - r, z - r, x + r, z + r) : lvl.boxes;
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    if (b.dead) continue; // destroyed structure
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
function avoidWalls(e: Enemy, lvl: Level3D, dx: number, dz: number, r: number, grid?: SpatialGrid): [number, number] {
  const look = 1.8;
  if (!blocked(lvl, e.x + dx * look, e.z + dz * look, r, grid)) return [dx, dz];
  for (const a of [0.9, -0.9, 1.6, -1.6, 2.4, -2.4]) {
    const c = Math.cos(a);
    const s = Math.sin(a);
    const nx = dx * c - dz * s;
    const nz = dx * s + dz * c;
    if (!blocked(lvl, e.x + nx * look, e.z + nz * look, r, grid)) return [nx, nz];
  }
  return [dx, dz];
}

/** Max vertical a grounded bot follows per move (ramps/trenches, not tall boxes). */
const GROUND_FOLLOW = 0.55;

function moveEnemy(e: Enemy, lvl: Level3D, wx: number, wz: number, speed: number, dt: number, r = R, grid?: SpatialGrid): void {
  const l = Math.hypot(wx, wz);
  if (l < 0.01) return;
  const [dx, dz] = avoidWalls(e, lvl, wx / l, wz / l, r, grid); // path around walls, not into them
  const sp = speed * dt;
  const nx = e.x + dx * sp;
  const nz = e.z + dz * sp;
  if (!blocked(lvl, nx, e.z, r, grid)) e.x = nx;
  if (!blocked(lvl, e.x, nz, r, grid)) e.z = nz;
  e.step += speed * dt * 1.3; // advance the running gait
  // Follow ground elevation (ramps up/down, trench floors). Only when NOT on an
  // elevated deck (the box-climbing system owns those) and only within a small
  // step so bots don't pop onto tall cover.
  if (!e.onDeck) {
    const g = groundHeightAt(e.x, e.z, lvl, grid, e.y + GROUND_FOLLOW);
    if (Math.abs(g - e.y) <= GROUND_FOLLOW) e.y = g;
  }
}

const ECLIMB = 3.2; // enemy climb speed
const EFALL = 8; // enemy drop speed

function onLadderXZ(e: Enemy, l: Ladder): boolean {
  return (
    e.x > l.x - l.sx / 2 - R &&
    e.x < l.x + l.sx / 2 + R &&
    e.z > l.z - l.sz / 2 - R &&
    e.z < l.z + l.sz / 2 + R
  );
}
/** Nearest ground-rooted ladder (the entry to a building). */
function nearestGroundLadder(lvl: Level3D, x: number, z: number): Ladder | null {
  let best: Ladder | null = null;
  let bd = Infinity;
  for (const l of lvl.ladders) {
    if (l.y0 > 0.6) continue;
    const d = Math.hypot(l.x - x, l.z - z);
    if (d < bd) {
      bd = d;
      best = l;
    }
  }
  return best;
}
/** Move an enemy toward a target standing height: walk to the nearest ladder,
 *  ride it up, step onto the deck, or drop back down. Returns true if it took
 *  over this bot's motion (the caller should skip its normal ground move). */
function climbToward(e: Enemy, lvl: Level3D, targetY: number, speed: number, dt: number, grid?: SpatialGrid): boolean {
  const need = targetY - e.y;
  if (Math.abs(need) < 0.5) {
    e.onDeck = e.y > 0.5;
    return false;
  }
  if (need > 0.5) {
    // Going up. On a ladder that reaches higher? Climb it.
    const lad = lvl.ladders.find((l) => onLadderXZ(e, l) && l.y1 > e.y + 0.2);
    if (lad) {
      e.y = Math.min(lad.y1 - 0.5, e.y + ECLIMB * dt);
      if (e.y >= lad.y1 - 0.6) {
        e.x += lad.exX * ECLIMB * dt;
        e.z += lad.exZ * ECLIMB * dt;
        e.onDeck = true;
      }
      e.step += ECLIMB * dt;
      return true;
    }
    // Otherwise head to the nearest building's ground ladder.
    const gl = nearestGroundLadder(lvl, e.x, e.z);
    if (gl) {
      moveEnemy(e, lvl, gl.x - gl.exX * 1.0 - e.x, gl.z - gl.exZ * 1.0 - e.z, speed, dt, R, grid);
      return true;
    }
    return false;
  }
  // Going down: drop toward the target height.
  e.y = Math.max(targetY, e.y - EFALL * dt);
  e.onDeck = e.y > 0.5;
  return true;
}
/** How close (horizontally) a bot must get to a waypoint before popping it. */
const WAYPOINT_REACH = 2.4;
/** Inside this range a bot abandons the nav route and uses its tuned close-range
 *  standoff/orbit steering directly (preserves the existing combat feel). */
const NAV_NEAR = 14;

/** Long-range path follow. Returns:
 *   - `'climb'`  the next waypoint is a vertical link and `climbToward` already
 *                moved the bot this frame (caller should just fire + continue);
 *   - `{wx,wz}`  a heading toward the next ground waypoint (caller calls moveEnemy);
 *   - `null`     no graph, no route, or the route is exhausted → caller falls back
 *                to its existing direct/standoff steering for the final approach.
 *  Repaths are throttled (cooldown + only when the goal drifts) so A* is cheap. */
function navFollow(
  e: Enemy,
  graph: NavGraph,
  lvl: Level3D,
  gx: number,
  gz: number,
  gy: number,
  climbSpeed: number,
  dt: number,
  grid?: SpatialGrid,
): 'climb' | { wx: number; wz: number } | null {
  e.repath = (e.repath ?? 0) - dt;
  const goalMoved = e.navGoal ? Math.hypot(gx - e.navGoal.x, gz - e.navGoal.z) > 6 : true;
  if (e.repath <= 0 || !e.path || e.path.length === 0 || goalMoved) {
    const start = nearestNode(graph, e.x, e.z, e.y);
    const goal = nearestNode(graph, gx, gz, gy);
    e.path = pathTo(graph, start, goal);
    e.navGoal = { x: gx, z: gz };
    e.repath = 0.45 + Math.random() * 0.35;
  }
  const path = e.path;
  if (!path || path.length === 0) return null;
  // Pop waypoints we've effectively reached (horizontal proximity).
  while (path.length > 0) {
    const w = graph.nodes[path[0]];
    if (Math.hypot(w.x - e.x, w.z - e.z) < WAYPOINT_REACH) path.shift();
    else break;
  }
  if (path.length === 0) return null; // arrived at the route end → close-range logic
  const wp = graph.nodes[path[0]];
  // A waypoint well above or below us is a ladder/ramp/zip link → use the climb
  // system (it walks to the nearest ground ladder and rides it / drops down).
  if (wp.y - e.y > 1.2 || (e.onDeck && e.y - wp.y > 1.2)) {
    climbToward(e, lvl, wp.y, climbSpeed, dt, grid);
    return 'climb';
  }
  return { wx: wp.x - e.x, wz: wp.z - e.z };
}

/** A sniper's perch = the deck just past the top of the nearest ground ladder. */
function assignPerch(lvl: Level3D, x: number, z: number): { x: number; z: number; y: number } | null {
  const gl = nearestGroundLadder(lvl, x, z);
  if (!gl) return null;
  return { x: gl.x + gl.exX * 1.4, z: gl.z + gl.exZ * 1.4, y: gl.y1 - 0.5 };
}

/** Push AWAY from any wall within `range` (probed on the 4 cardinals). Added to a
 *  bot's heading while it's SHOOTING so it doesn't pin itself against geometry and
 *  keeps a clean line of fire. */
function wallRepulse(e: Enemy, lvl: Level3D, grid: SpatialGrid | undefined, range = 1.3): [number, number] {
  let px = 0;
  let pz = 0;
  if (blocked(lvl, e.x + range, e.z, R, grid)) px -= 1;
  if (blocked(lvl, e.x - range, e.z, R, grid)) px += 1;
  if (blocked(lvl, e.x, e.z + range, R, grid)) pz -= 1;
  if (blocked(lvl, e.x, e.z - range, R, grid)) pz += 1;
  return [px, pz];
}

/** Heading toward the nearest cover that breaks line of sight from (fromX,fromZ):
 *  the far side of the closest body-height box. Used when a bot is hit but can't
 *  see the shooter — it RUNS FOR COVER instead of standing in the open. */
function seekCoverDir(e: Enemy, lvl: Level3D, grid: SpatialGrid | undefined, fromX: number, fromZ: number): [number, number] | null {
  const boxes = grid ? grid.queryAABB(e.x - 12, e.z - 12, e.x + 12, e.z + 12) : lvl.boxes;
  let best: Box | null = null;
  let bd = Infinity;
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    if (b.y + b.sy / 2 < 1.7 || b.y - b.sy / 2 > 1.5) continue; // must block a standing bot
    const d = Math.hypot(b.x - e.x, b.z - e.z);
    if (d < bd) {
      bd = d;
      best = b;
    }
  }
  if (!best) return null;
  let dx = best.x - fromX;
  let dz = best.z - fromZ;
  const dl = Math.hypot(dx, dz) || 1;
  dx /= dl;
  dz /= dl;
  const cx = best.x + dx * (Math.max(best.sx, best.sz) / 2 + 0.8); // far side of the box
  const cz = best.z + dz * (Math.max(best.sx, best.sz) / 2 + 0.8);
  return [cx - e.x, cz - e.z];
}

/** The best vantage node to shoot the focus from: elevated, with a CLEAR line to
 *  the focus, around the player's preferred engagement range. Drives the sniper's
 *  "always relocate to the best possible shot" behaviour. Throttled by the caller. */
function bestVantage(
  nav: NavGraph,
  lvl: Level3D,
  grid: SpatialGrid | undefined,
  ex: number,
  ez: number,
  fx: number,
  fz: number,
  want: number,
): { x: number; y: number; z: number } | null {
  let best: NavNode | null = null;
  let bs = -Infinity;
  const target = Math.min(40, Math.max(16, want * 1.3));
  const foc: Vec3 = [fx, EYE, fz];
  for (let i = 0; i < nav.nodes.length; i++) {
    const n = nav.nodes[i];
    const dF = Math.hypot(n.x - fx, n.z - fz);
    if (dF < 10 || dF > 60) continue;
    if (segBlocked([n.x, n.y + EYE_H, n.z], foc, lvl, grid)) continue; // no shot from here
    const dB = Math.hypot(n.x - ex, n.z - ez);
    const score = n.y * 3 - dB * 0.12 - Math.abs(dF - target) * 0.08; // high, near, ~range out
    if (score > bs) {
      bs = score;
      best = n;
    }
  }
  return best ? { x: best.x, y: best.y, z: best.z } : null;
}

/** Spawn `nSquads` independent 5-man fireteams (SQUAD_ROLES each). Squad clusters
 *  are fanned out laterally across the far side so they close in from different
 *  bearings; members spawn tight around their squad's cluster centre. */
export function spawnEnemies(lvl: Level3D, nSquads: number, _level: number, rand: () => number): Enemy[] {
  const out: Enemy[] = [];
  const half = lvl.size / 2;
  const a = lvl.enemySpawn; // far end, opposite the player
  for (let s = 0; s < nSquads; s++) {
    const spread = nSquads > 1 ? s / (nSquads - 1) - 0.5 : 0; // -0.5 … 0.5
    const cx0 = Math.max(-half + 8, Math.min(half - 8, a.x + spread * half * 0.7));
    const cz0 = a.z;
    for (let k = 0; k < SQUAD_ROLES.length; k++) {
      const cls = SQUAD_ROLES[k];
      // Find a free spot near this squad's cluster centre.
      let x = cx0;
      let z = cz0;
      for (let guard = 0; guard < 40; guard++) {
        const ang = rand() * Math.PI * 2;
        const rad = 2 + rand() * 6;
        x = cx0 + Math.cos(ang) * rad;
        z = cz0 + Math.sin(ang) * rad;
        if (Math.abs(x) <= half - 3 && Math.abs(z) <= half - 3 && !blocked(lvl, x, z)) break;
      }
      const hp = ENEMY_HP * CLASS[cls].hp;
      const perch = cls === 'marksman' ? assignPerch(lvl, x, z) : null;
      const weapon: WeaponKind = cls === 'tank' ? 'mg' : cls === 'commander' ? 'laser' : 'rifle';
      const side: 1 | -1 = k % 2 === 0 ? 1 : -1;
      out.push({ x, y: 0, z, health: hp, maxHealth: hp, shield: hp * SHIELD_FRAC, maxShield: hp * SHIELD_FRAC, shieldRegenT: 0, state: 'idle', lastSeen: null, fireCd: rand() * 0.6, hitFlash: 0, wander: rand() * 6, step: 0, alarm: 0, weapon, cls, side, barUntil: 0, boss: null, track: 0, muzzle: 0, stunT: 0, slowT: 0, blindT: 0, burnT: 0, burnDps: 0, onDeck: false, perch, squadId: s });
    }
  }
  return out;
}

/** Spawn the boss(es) for a boss level. `enhanced` = the gauntlet variant (tougher). */
export function spawnBosses(lvl: Level3D, kinds: BossKind[], rand: () => number, enhanced = false): Enemy[] {
  const a = lvl.enemySpawn;
  return kinds.map((k, i) => {
    const bd = BOSSES[k];
    const ang = (i / Math.max(1, kinds.length)) * Math.PI * 2;
    const hp = Math.round(bd.health * (enhanced ? 1.4 : 1));
    return {
      x: a.x + Math.cos(ang) * 5 * i,
      y: 0,
      z: a.z + Math.sin(ang) * 5 * i,
      health: hp,
      maxHealth: hp,
      enh: enhanced,
      shield: 0, // bosses are a separate system — no shield (flagged for Gabe)
      maxShield: 0,
      shieldRegenT: 0,
      state: 'idle' as const,
      lastSeen: null,
      fireCd: rand() * 0.5,
      hitFlash: 0,
      wander: rand() * 6,
      step: 0,
      alarm: 0,
      weapon: 'rifle' as WeaponKind,
      cls: 'tank' as EnemyClass,
      side: (rand() < 0.5 ? 1 : -1) as 1 | -1,
      barUntil: 0,
      boss: k,
      track: 0,
      muzzle: 0,
      stunT: 0,
      slowT: 0,
      blindT: 0,
      burnT: 0,
      burnDps: 0,
      onDeck: false,
      perch: null,
      squadId: 0,
    };
  });
}

/** Spawn a boss's themed squad near the boss end (Kraken gets its own in P3). The
 *  boss-death win condition means these don't have to be cleared to finish. */
export function spawnBossMinions(lvl: Level3D, kind: BossKind, rand: () => number): Enemy[] {
  const out: Enemy[] = [];
  if (kind === 'xeno') {
    // XENOMORPH HIVE — themed alien minions.
    (['broodling', 'broodling', 'broodling', 'broodling', 'broodling', 'broodling', 'spitter', 'spitter'] as MinionKind[]).forEach((mk, i) => out.push(makeMinion(lvl, mk, i, rand)));
    (['stalker', 'stalker', 'stalker'] as MinionKind[]).forEach((mk, i) => out.push(dormantAt(makeMinion(lvl, mk, i, rand), 0.65)));
    (['broodling', 'broodling', 'broodling', 'spitter'] as MinionKind[]).forEach((mk, i) => out.push(dormantAt(makeMinion(lvl, mk, i, rand), 0.35)));
  } else if (kind === 'warrior') {
    // WARLORD LEGION — a real doctrine squad (cover / suppress / flank AI).
    (['rifleman', 'rifleman', 'rifleman', 'suppressor', 'engineer'] as EnemyClass[]).forEach((c, i) => out.push(makeDoctrineEnemy(lvl, c, i, rand)));
    // Command Beacon deploys at 70% HP — buffs the legion's aim until destroyed.
    out.push(dormantAt(makeDestructible(lvl, 'beacon'), 0.7));
    // Shield Wall deploys at 45% — blocks your shots; flank it or break it.
    out.push(dormantAt(makeDestructible(lvl, 'shield'), 0.45));
    (['rifleman', 'breacher'] as EnemyClass[]).forEach((c, i) => out.push(dormantAt(makeDoctrineEnemy(lvl, c, i, rand), 0.65)));
    (['rifleman', 'engineer'] as EnemyClass[]).forEach((c, i) => out.push(dormantAt(makeDoctrineEnemy(lvl, c, i, rand), 0.35)));
  } else if (kind === 'octopus') {
    // KRAKEN ABYSS — crawlers swarm, spores bomb, sentinels guard the core.
    (['crawler', 'crawler', 'crawler', 'crawler', 'sentinel'] as MinionKind[]).forEach((mk, i) => out.push(makeMinion(lvl, mk, i, rand)));
    (['spore', 'spore', 'crawler'] as MinionKind[]).forEach((mk, i) => out.push(dormantAt(makeMinion(lvl, mk, i, rand), 0.65)));
    (['spore', 'sentinel', 'crawler'] as MinionKind[]).forEach((mk, i) => out.push(dormantAt(makeMinion(lvl, mk, i, rand), 0.35)));
  } else if (kind === 'archon') {
    // ARCHON RETINUE — geometric drones: Facets orbit + snipe, Constructors hold the
    // line (tanky), Sentries lock down as turrets. Reinforcement wings blink in.
    (['facet', 'facet', 'facet', 'facet', 'constructor', 'constructor', 'sentry'] as MinionKind[]).forEach((mk, i) => out.push(makeMinion(lvl, mk, i, rand)));
    (['facet', 'facet', 'sentry'] as MinionKind[]).forEach((mk, i) => out.push(dormantAt(makeMinion(lvl, mk, i, rand), 0.65)));
    (['facet', 'constructor', 'sentry'] as MinionKind[]).forEach((mk, i) => out.push(dormantAt(makeMinion(lvl, mk, i, rand), 0.35)));
  } else if (kind === 'behemoth') {
    // BEHEMOTH HERD — Ramparts wall you off, Grazers charge, Sporebacks heal the beast.
    (['rampart', 'rampart', 'grazer', 'grazer', 'grazer', 'sporeback', 'sporeback'] as MinionKind[]).forEach((mk, i) => out.push(makeMinion(lvl, mk, i, rand)));
    (['grazer', 'grazer', 'rampart'] as MinionKind[]).forEach((mk, i) => out.push(dormantAt(makeMinion(lvl, mk, i, rand), 0.6)));
    (['grazer', 'sporeback', 'rampart'] as MinionKind[]).forEach((mk, i) => out.push(dormantAt(makeMinion(lvl, mk, i, rand), 0.3)));
  } else if (kind === 'specter') {
    // SPECTER HAUNT — Phantoms ambush, Mirrors decoy your fire, Wisps blur your vision.
    (['phantom', 'phantom', 'phantom', 'mirror', 'mirror', 'wisp', 'wisp'] as MinionKind[]).forEach((mk, i) => out.push(makeMinion(lvl, mk, i, rand)));
    (['phantom', 'mirror', 'wisp'] as MinionKind[]).forEach((mk, i) => out.push(dormantAt(makeMinion(lvl, mk, i, rand), 0.6)));
    (['phantom', 'phantom', 'mirror'] as MinionKind[]).forEach((mk, i) => out.push(dormantAt(makeMinion(lvl, mk, i, rand), 0.3)));
  } else if (kind === 'leviathan') {
    // LEVIATHAN BROOD — Broodworms burrow-rush, Maw-turrets anchor + bite, Leeches drain to heal it.
    (['broodworm', 'broodworm', 'broodworm', 'mawturret', 'mawturret', 'leech', 'leech'] as MinionKind[]).forEach((mk, i) => out.push(makeMinion(lvl, mk, i, rand)));
    (['broodworm', 'leech', 'mawturret'] as MinionKind[]).forEach((mk, i) => out.push(dormantAt(makeMinion(lvl, mk, i, rand), 0.6)));
    (['broodworm', 'broodworm', 'leech'] as MinionKind[]).forEach((mk, i) => out.push(dormantAt(makeMinion(lvl, mk, i, rand), 0.3)));
  } else if (kind === 'monolith') {
    // MONOLITH LATTICE — Shards dart in, Resonators beam, Growers grow cover + repair allies.
    (['shard', 'shard', 'shard', 'resonator', 'resonator', 'grower', 'grower'] as MinionKind[]).forEach((mk, i) => out.push(makeMinion(lvl, mk, i, rand)));
    (['shard', 'shard', 'resonator'] as MinionKind[]).forEach((mk, i) => out.push(dormantAt(makeMinion(lvl, mk, i, rand), 0.6)));
    (['shard', 'grower', 'resonator'] as MinionKind[]).forEach((mk, i) => out.push(dormantAt(makeMinion(lvl, mk, i, rand), 0.3)));
  } else if (kind === 'oblivion') {
    // OBLIVION VOID — Shades + Devourers melee-swarm, Rifts open gravity wells that pull.
    (['shade', 'shade', 'devourer', 'devourer', 'rift', 'rift', 'shade'] as MinionKind[]).forEach((mk, i) => out.push(makeMinion(lvl, mk, i, rand)));
    (['devourer', 'shade', 'rift'] as MinionKind[]).forEach((mk, i) => out.push(dormantAt(makeMinion(lvl, mk, i, rand), 0.6)));
    (['shade', 'devourer', 'rift'] as MinionKind[]).forEach((mk, i) => out.push(dormantAt(makeMinion(lvl, mk, i, rand), 0.3)));
  } else if (kind === 'colossus') {
    // COLOSSUS FOUNDRY — Warframes hold the line, Artillery drones shell you, Fabricators repair the mechs.
    (['warframe', 'warframe', 'artillery', 'artillery', 'fabricator', 'warframe', 'artillery'] as MinionKind[]).forEach((mk, i) => out.push(makeMinion(lvl, mk, i, rand)));
    (['warframe', 'artillery', 'fabricator'] as MinionKind[]).forEach((mk, i) => out.push(dormantAt(makeMinion(lvl, mk, i, rand), 0.6)));
    (['warframe', 'warframe', 'fabricator'] as MinionKind[]).forEach((mk, i) => out.push(dormantAt(makeMinion(lvl, mk, i, rand), 0.3)));
  } else if (kind === 'chimera') {
    // CHIMERA STRAIN — Splices swarm-melee, Gene-pods spit adaptive bolts, Regenerators graft allies whole.
    (['splice', 'splice', 'splice', 'genepod', 'genepod', 'regenerator', 'splice'] as MinionKind[]).forEach((mk, i) => out.push(makeMinion(lvl, mk, i, rand)));
    (['splice', 'splice', 'genepod'] as MinionKind[]).forEach((mk, i) => out.push(dormantAt(makeMinion(lvl, mk, i, rand), 0.6)));
    (['splice', 'regenerator', 'genepod'] as MinionKind[]).forEach((mk, i) => out.push(dormantAt(makeMinion(lvl, mk, i, rand), 0.3)));
  } else if (kind === 'oracle') {
    // ORACLE CHOIR — Echoes fire time-clones, Motes emit slow-fields, Seers mark you for the choir.
    (['echo', 'echo', 'echo', 'mote', 'mote', 'seer', 'seer'] as MinionKind[]).forEach((mk, i) => out.push(makeMinion(lvl, mk, i, rand)));
    (['echo', 'mote', 'seer'] as MinionKind[]).forEach((mk, i) => out.push(dormantAt(makeMinion(lvl, mk, i, rand), 0.6)));
    (['echo', 'echo', 'seer'] as MinionKind[]).forEach((mk, i) => out.push(dormantAt(makeMinion(lvl, mk, i, rand), 0.3)));
  } else if (kind === 'infestor') {
    // INFESTOR BROOD — Spawnlings rush-infect, Hosts burst into spawn, Latchers drain to heal it.
    (['spawnling', 'spawnling', 'spawnling', 'spawnling', 'host', 'host', 'latcher'] as MinionKind[]).forEach((mk, i) => out.push(makeMinion(lvl, mk, i, rand)));
    (['spawnling', 'spawnling', 'latcher'] as MinionKind[]).forEach((mk, i) => out.push(dormantAt(makeMinion(lvl, mk, i, rand), 0.6)));
    (['host', 'spawnling', 'latcher'] as MinionKind[]).forEach((mk, i) => out.push(dormantAt(makeMinion(lvl, mk, i, rand), 0.3)));
  }
  return out;
}

/** A deployable destructible object (no AI) as an Enemy — reuses health, the
 *  player shot detection, render + health bars. */
function makeDestructible(lvl: Level3D, kind: 'beacon' | 'shield'): Enemy {
  const a = lvl.enemySpawn;
  const hp = kind === 'beacon' ? 220 : 400;
  return { x: a.x, y: 0, z: a.z, health: hp, maxHealth: hp, shield: 0, maxShield: 0, shieldRegenT: 0, state: 'idle', lastSeen: null, fireCd: 0, hitFlash: 0, wander: 0, step: 0, alarm: 0, weapon: 'rifle', cls: 'rifleman', side: 1, barUntil: 0, boss: null, track: 0, muzzle: 0, stunT: 0, slowT: 0, blindT: 0, burnT: 0, burnDps: 0, onDeck: false, perch: null, destructible: kind, squadId: 0 };
}

/** Mark a reinforcement dormant (parked underground until its phase wakes it). */
function dormantAt(e: Enemy, wakeAtHp: number): Enemy {
  e.dormant = true;
  e.wakeAtHp = wakeAtHp;
  e.y = -100;
  return e;
}

/** A regular doctrine enemy of a given class, positioned near the boss end. */
function makeDoctrineEnemy(lvl: Level3D, cls: EnemyClass, idx: number, rand: () => number): Enemy {
  const a = lvl.enemySpawn;
  const half = lvl.size / 2;
  let x = a.x;
  let z = a.z;
  for (let g = 0; g < 60; g++) {
    const ang = rand() * Math.PI * 2;
    const rad = 4 + rand() * Math.max(10, lvl.size * 0.2);
    x = a.x + Math.cos(ang) * rad;
    z = a.z + Math.sin(ang) * rad;
    if (Math.abs(x) < half - 3 && Math.abs(z) < half - 3 && !blocked(lvl, x, z)) break;
  }
  const hp = ENEMY_HP * CLASS[cls].hp;
  const perch = cls === 'marksman' ? assignPerch(lvl, x, z) : null;
  const weapon: WeaponKind = cls === 'suppressor' ? 'mg' : cls === 'marksman' ? 'rifle' : WEAPON_KEYS[Math.floor(rand() * WEAPON_KEYS.length)];
  return { x, y: 0, z, health: hp, maxHealth: hp, shield: hp * SHIELD_FRAC, maxShield: hp * SHIELD_FRAC, shieldRegenT: 0, state: 'idle', lastSeen: null, fireCd: rand() * 0.6, hitFlash: 0, wander: rand() * 6, step: 0, alarm: 0, weapon, cls, side: (idx % 2 === 0 ? 1 : -1) as 1 | -1, barUntil: 0, boss: null, track: 0, muzzle: 0, stunT: 0, slowT: 0, blindT: 0, burnT: 0, burnDps: 0, onDeck: false, perch, squadId: 0 };
}

function makeMinion(lvl: Level3D, mk: MinionKind, idx: number, rand: () => number): Enemy {
  const md = MINIONS[mk];
  const a = lvl.enemySpawn;
  const half = lvl.size / 2;
  let x = a.x;
  let z = a.z;
  for (let g = 0; g < 60; g++) {
    const ang = rand() * Math.PI * 2;
    const rad = 3 + rand() * Math.max(8, lvl.size * 0.18);
    x = a.x + Math.cos(ang) * rad;
    z = a.z + Math.sin(ang) * rad;
    if (Math.abs(x) < half - 3 && Math.abs(z) < half - 3 && !blocked(lvl, x, z)) break;
  }
  const hp = md.hp;
  return {
    x,
    y: 0,
    z,
    health: hp,
    maxHealth: hp,
    shield: 0, // minions are killable swarm — no shield
    maxShield: 0,
    shieldRegenT: 0,
    state: 'idle',
    lastSeen: null,
    fireCd: rand() * 0.8,
    hitFlash: 0,
    wander: rand() * 6,
    step: 0,
    alarm: 0,
    weapon: 'rifle',
    cls: 'scout',
    side: (idx % 2 === 0 ? 1 : -1) as 1 | -1,
    barUntil: 0,
    boss: null,
    track: 0,
    muzzle: 0,
    stunT: 0,
    slowT: 0,
    blindT: 0,
    burnT: 0,
    burnDps: 0,
    onDeck: false,
    perch: null,
    minion: mk,
    squadId: 0,
  };
}

export interface EnemyTracer {
  from: Vec3;
  to: Vec3;
  color: number;
}

/** A ground telegraph the boss wants shown this frame (the loop spawns it into the
 *  TelegraphSystem; the boss resolves its own damage on landing, so the telegraph
 *  is purely the player's warning). */
export interface BossTelegraph {
  kind: string; // 'pounce' (cosmetic) | 'eruption' (damages + launches on fire)
  x: number;
  z: number;
  radius: number;
  delay: number;
}

/** A boss/minion projectile to spawn this frame (the loop adds the scene + mesh
 *  via the ProjectileSystem). `kind` lets the loop attach an on-impact effect
 *  (e.g. 'acid' → leaves a puddle). */
export interface BossShot {
  kind: string;
  x: number;
  y: number;
  z: number;
  dir: Vec3;
  speed: number;
  dmg: number;
  color: number;
  splash: number;
  gravity?: number; // >0 = arcing lob (grenades); omit for straight projectiles
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
  grid?: SpatialGrid,
  nav?: NavGraph,
  elapsed = 0, // seconds since level start (start-of-match combat lock + boss grace)
): { damage: number; tracers: EnemyTracer[]; seen: boolean; bossShots: BossShot[]; bossTelegraphs: BossTelegraph[]; bossFog: boolean } {
  const P = PARAMS[diff];
  // Combat lock: nobody fires until the intro countdown ends. Boss grace: on a boss
  // level the player gets 10 s to find cover before anything can SEE them.
  const combatLock = elapsed < 2.8;
  const grace = elapsed < 10 && enemies.some((e) => e.boss);
  const peye: Vec3 = [player.x, player.y + EYE, player.z];
  const pspeed = Math.hypot(pvx, pvz);
  let damage = 0;
  let seen = false;
  const tracers: EnemyTracer[] = [];
  const bossShots: BossShot[] = [];
  const bossTelegraphs: BossTelegraph[] = [];
  let bossFog = false;

  // Pass 1: sightings → personal memory + SHARED squad intel (smoke blocks it).
  const sees = enemies.map((e) => {
    if (grace) return false; // boss-level grace window: no one can acquire the player yet
    if (e.health <= 0) return false;
    if (e.blindT > 0) return false; // flashbanged: can't acquire the player
    const dist = Math.hypot(player.x - e.x, player.z - e.z);
    if (dist >= (e.boss ? 220 : P.view * CLASS[e.cls].viewMul)) return false;
    const eeye: Vec3 = [e.x, e.y + EYE_H, e.z];
    if (segBlocked(eeye, peye, lvl, grid)) return false;
    for (const sm of smokes) if (segHitsSphere(eeye, peye, [sm.x, sm.y, sm.z], sm.r)) return false;
    return true;
  });
  const mem = squad.mem;
  for (let i = 0; i < enemies.length; i++) {
    if (sees[i]) {
      seen = true;
      enemies[i].state = 'alert';
      enemies[i].lastSeen = { x: player.x, z: player.z };
      squad.lastKnown = { x: player.x, z: player.z };
      squad.t = now;
      if (mem) {
        // Learn the range the player chooses to fight at (informs vantage choice).
        const d = Math.hypot(player.x - enemies[i].x, player.z - enemies[i].z);
        mem.preferRange += (d - mem.preferRange) * 0.04;
      }
    }
  }
  const haveIntel = squad.lastKnown != null && now - squad.t < 5000; // lose track sooner

  // CAPTAIN: while the squad's commander lives, they steady everyone's aim (reuses
  // the Command-Beacon buff path in fireAt). Drops off the moment the captain falls.
  if (enemies.some((e) => e.cls === 'commander' && e.health > 0 && !e.boss)) squad.buffUntil = now + 400;

  // LEARNING: build a heatmap of where the player spends time (their favourite
  // ground), model how aggressively they play, and count bots lost — all persisted
  // across the run so later fights hunt smarter. The hottest cell becomes the
  // squad's search focus when they have no live intel.
  if (mem) {
    mem.heat[heatCell(player.x, player.z, lvl.size)] += dt;
    mem.aggression += (Math.min(1, pspeed / 6) - mem.aggression) * 0.02;
    const aliveNow = enemies.reduce((a, e) => a + (e.health > 0 && !e.boss ? 1 : 0), 0);
    if (squad.lastAlive != null && aliveNow < squad.lastAlive) mem.losses += squad.lastAlive - aliveNow;
    squad.lastAlive = aliveNow;
    squad.planT = (squad.planT ?? 0) - dt;
    if (squad.planT <= 0) {
      let hi = 0;
      for (let k = 0; k < mem.heat.length; k++) {
        mem.heat[k] *= 0.9; // forget slowly so it tracks recent play
        if (mem.heat[k] > mem.heat[hi]) hi = k;
      }
      squad.hot = mem.heat[hi] > 0.5 ? cellCenter(hi, lvl.size) : null;
      squad.planT = 1.5;
    }
  }
  // Coordination strength grows as the squad takes losses (they learn to gang up).
  const coord = mem ? Math.min(1, mem.losses / 6) : 0;
  // Per-frame: each living non-boss bot's ordinal among its squad, so the hunt can
  // fan them out around the focus from evenly-spread bearings (a real pincer).
  const slot: number[] = new Array(enemies.length).fill(0);
  let aliveCount = 0;
  for (let i = 0; i < enemies.length; i++) {
    if (enemies[i].health > 0 && !enemies[i].boss) slot[i] = aliveCount++;
  }

  // Shared fire routine: line-of-sight gated, sniper swaps long gun for a rifle
  // up close, accuracy falls off with range and with the player's speed.
  const fireAt = (e: Enemy, canSee: boolean): void => {
    e.fireCd -= dt;
    if (combatLock) return; // start-of-match: hold all enemy fire until the countdown ends
    if (e.fireCd > 0) return;
    const dist = Math.hypot(player.x - e.x, player.z - e.z);
    // BERSERKER: melee claws — strikes only point-blank, no LoS needed (it charges).
    if (e.cls === 'berserker') {
      if (dist > 3.5) return;
      e.fireCd = 0.6;
      e.muzzle = 0.12;
      tracers.push({ from: [e.x, e.y + 1, e.z], to: peye, color: 0xff3344 });
      damage += 16;
      return;
    }
    if (!canSee) return;
    const W = e.cls === 'marksman' ? (dist > 12 ? SNIPER_W : WEAPONS.rifle) : WEAPONS[e.weapon];
    e.fireCd = W.rate;
    e.muzzle = 0.12; // show the firing pose + muzzle flash briefly
    tracers.push({ from: [e.x, e.y + EYE_H, e.z], to: peye, color: W.color });
    const evade = Math.min(0.7, pspeed * 0.14);
    // Accuracy falls off steeply with range (the marksman is the exception far out).
    const distFactor = e.cls === 'marksman' && dist > 12 ? 1 : Math.max(0.1, 1 - Math.max(0, dist - 6) / 26);
    // Zero-in: the longer they've held LoS on you, the better their aim. Peeking
    // is safe; lingering in the open gets punished.
    const trackRamp = 0.45 + 0.55 * Math.min(1, e.track / 1.4);
    const buff = now < (squad.buffUntil ?? 0) ? 1.35 : 1; // Warlord Command Beacon
    if (Math.random() < P.acc * W.accMod * distFactor * (1 - evade) * trackRamp * buff) damage += W.dmg;
  };

  // Boss phase manager: wake dormant reinforcements as the boss loses health,
  // each transition firing a HIVE SCREECH (a brief squad aggression surge).
  const bossE = enemies.find((e) => e.boss && e.health > 0);
  if (bossE) {
    const frac = bossE.health / bossE.maxHealth;
    for (const e of enemies) {
      if (e.dormant && e.health > 0 && e.wakeAtHp != null && frac <= e.wakeAtHp) {
        e.dormant = false;
        e.x = bossE.x + (Math.random() - 0.5) * 7;
        e.y = 0;
        e.z = bossE.z + (Math.random() - 0.5) * 7;
        e.state = 'alert';
        if (!e.destructible) squad.aggroUntil = now + 4500; // screech (not for deployables)
      }
    }
    // Command Beacon: while a deployed beacon lives, the legion's aim is buffed.
    if (enemies.some((e) => e.destructible === 'beacon' && !e.dormant && e.health > 0)) {
      squad.buffUntil = now + 200;
    }
  }

  // Pass 2: act on personal or shared knowledge.
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (e.health <= 0) continue;
    if (e.dormant) continue; // reinforcement not yet woken
    if (e.hitFlash > 0) e.hitFlash -= dt;
    if (e.destructible) continue; // deployable object — no AI, just shootable
    if (e.alarm > 0) e.alarm -= dt;
    // Shield regen: paused for a few seconds after any hit, then slowly refills.
    if (e.shieldRegenT > 0) e.shieldRegenT -= dt;
    else if (e.shield < e.maxShield) e.shield = Math.min(e.maxShield, e.shield + e.maxShield * SHIELD_REGEN_FRAC * dt);

    // Boss-faction MINIONS: themed role AI (rush / acid support / flank-lunge).
    if (e.minion) {
      const md = MINIONS[e.minion];
      const tgt = e.state === 'alert' && e.lastSeen ? e.lastSeen : haveIntel ? squad.lastKnown : null;
      if (tgt) {
        e.state = 'alert';
        const aggro = now < (squad.aggroUntil ?? 0) ? 1.3 : 1; // hive-screech surge
        const dist = Math.hypot(player.x - e.x, player.z - e.z);
        e.fireCd -= dt;
        let tx = tgt.x - e.x;
        let tz = tgt.z - e.z;
        const tl = Math.hypot(tx, tz) || 1;
        tx /= tl;
        tz /= tl;
        const perpX = -tz;
        const perpZ = tx;
        const mc =
          e.minion === 'crawler' || e.minion === 'spore' || e.minion === 'sentinel'
            ? 0xc08bff
            : e.minion === 'phantom' || e.minion === 'mirror' || e.minion === 'wisp'
              ? 0xb877ff
              : e.minion === 'rampart' || e.minion === 'grazer' || e.minion === 'sporeback'
                ? 0xffb14a
                : e.minion === 'broodworm' || e.minion === 'mawturret' || e.minion === 'leech'
                  ? 0x9adb3a
                  : e.minion === 'shard' || e.minion === 'resonator' || e.minion === 'grower'
                    ? 0x7fe8ff
                    : e.minion === 'shade' || e.minion === 'devourer' || e.minion === 'rift'
                      ? 0xc98bff
                      : e.minion === 'warframe' || e.minion === 'artillery' || e.minion === 'fabricator'
                        ? 0xff8a3a
                        : e.minion === 'splice' || e.minion === 'genepod' || e.minion === 'regenerator'
                          ? 0xff5ac8
                          : e.minion === 'echo' || e.minion === 'mote' || e.minion === 'seer'
                            ? 0xffd98a
                            : e.minion === 'spawnling' || e.minion === 'host' || e.minion === 'latcher'
                              ? 0x9cd84a
                              : 0x6aff7a;
        if (e.minion === 'broodling' || e.minion === 'crawler' || e.minion === 'rampart' || e.minion === 'grazer' || e.minion === 'broodworm' || e.minion === 'leech' || e.minion === 'shard' || e.minion === 'shade' || e.minion === 'devourer' || e.minion === 'splice' || e.minion === 'spawnling' || e.minion === 'latcher') {
          // Rush + erratic weave; bite/ram on contact. (Ramparts advance as mobile cover;
          // Grazers/Shards/Shades/Devourers are fast chargers; Leeches drain to heal the boss.)
          const jitter = Math.sin(now * 0.006 + e.wander) * 0.45;
          moveEnemy(e, lvl, tx + perpX * jitter, tz + perpZ * jitter, P.speed * md.speedMul * aggro, dt, R, grid);
          const reach = e.minion === 'rampart' ? 3.0 : 2.4;
          if (dist < reach && e.fireCd <= 0) {
            e.fireCd = e.minion === 'grazer' || e.minion === 'shard' || e.minion === 'splice' ? 0.6 : 0.8;
            damage += md.melee;
            tracers.push({ from: [e.x, e.y + 0.5, e.z], to: peye, color: mc });
            if (e.minion === 'leech' || e.minion === 'latcher') {
              const bossE = enemies.find((b) => b.boss && b.health > 0 && !b.dormant);
              if (bossE) bossE.health = Math.min(bossE.maxHealth, bossE.health + 30); // drain → heal the boss
            }
          }
        } else if (e.minion === 'mirror') {
          // SPECTER MIRROR: an illusory decoy — drifts at you to draw fire, no attack;
          // pops in one hit (hp 1).
          moveEnemy(e, lvl, tx + perpX * Math.sin(now * 0.004 + e.wander) * 0.4, tz, P.speed * md.speedMul * aggro, dt, R, grid);
        } else if (
          e.minion === 'sporeback' ||
          e.minion === 'wisp' ||
          e.minion === 'grower' ||
          e.minion === 'mawturret' ||
          e.minion === 'resonator' ||
          e.minion === 'rift' ||
          e.minion === 'warframe' ||
          e.minion === 'artillery' ||
          e.minion === 'fabricator' ||
          e.minion === 'genepod' ||
          e.minion === 'regenerator' ||
          e.minion === 'echo' ||
          e.minion === 'mote' ||
          e.minion === 'seer'
        ) {
          // STANDOFF RANGED SUPPORT (multi-faction). Sporeback heals the boss; Grower/
          // Fabricator/Regenerator repair the most-wounded ally; Wisp clouds your vision;
          // Rift pulls you in (gravity well); Artillery lobs arc shells; Seer marks you
          // (buffs the squad's aim); the rest are near-stationary gunners.
          if (dist < 12) moveEnemy(e, lvl, -tx + perpX * e.side, -tz + perpZ * e.side, P.speed * md.speedMul * aggro, dt, R, grid);
          else if (dist > 22) moveEnemy(e, lvl, tx, tz, P.speed * md.speedMul * aggro, dt, R, grid);
          else moveEnemy(e, lvl, perpX * e.side, perpZ * e.side, P.speed * md.speedMul * 0.6, dt, R, grid);
          if (e.minion === 'sporeback') {
            const bossE = enemies.find((b) => b.boss && b.health > 0 && !b.dormant);
            if (bossE && Math.hypot(bossE.x - e.x, bossE.z - e.z) < 14) bossE.health = Math.min(bossE.maxHealth, bossE.health + 18 * dt);
          } else if (e.minion === 'grower' || e.minion === 'fabricator' || e.minion === 'regenerator') {
            let best: Enemy | null = null;
            let bd2 = 400;
            for (const a of enemies) {
              if (a === e || !a.minion || a.health <= 0 || a.dormant || a.health >= a.maxHealth) continue;
              const d2 = (a.x - e.x) * (a.x - e.x) + (a.z - e.z) * (a.z - e.z);
              if (d2 < bd2) {
                bd2 = d2;
                best = a;
              }
            }
            if (best) best.health = Math.min(best.maxHealth, best.health + 22 * dt);
          } else if (e.minion === 'wisp') {
            e.track += dt;
            if (e.track > 5) {
              e.track = 0;
              bossFog = true;
            }
          } else if (e.minion === 'rift') {
            e.track += dt;
            if (e.track > 2.5 && dist < 26) {
              e.track = 0;
              pushPlayer(player, e.x - player.x, e.z - player.z, 5); // gravity well: drag inward
            }
          } else if (e.minion === 'seer' && sees[i]) {
            squad.buffUntil = now + 200; // marks the player → the choir's aim is buffed
          }
          if (sees[i] && e.fireCd <= 0 && dist < 28) {
            e.fireCd = e.minion === 'wisp' ? 1.4 : e.minion === 'resonator' ? 1.2 : e.minion === 'artillery' ? 2.2 : 1.6;
            const my = e.y + 0.9;
            if (e.minion === 'artillery') {
              // ARC SHELL: a lobbed grenade with splash (denies your ground).
              const hd = Math.hypot(tgt.x - e.x, tgt.z - e.z);
              bossShots.push({ kind: 'grenade', x: e.x, y: my + 0.4, z: e.z, dir: [tgt.x - e.x, hd * 0.5, tgt.z - e.z], speed: 18, dmg: md.ranged, color: 0xff8a3a, splash: 2.8, gravity: 22 });
            } else {
              bossShots.push({ kind: 'bolt', x: e.x, y: my, z: e.z, dir: [tgt.x - e.x, player.y + 1 - my, tgt.z - e.z], speed: 26, dmg: md.ranged, color: mc, splash: 0 });
            }
          }
        } else if (e.minion === 'spore' || e.minion === 'host') {
          // BOMBER (Void Spore / Infestor Host): drift in slowly, then burst on contact.
          moveEnemy(e, lvl, tx, tz, P.speed * md.speedMul * aggro, dt, R, grid);
          if (dist < 2.8) {
            damage += md.melee;
            e.health = 0; // explodes (visual handled in the loop)
          }
        } else if (e.minion === 'spitter') {
          // Standoff acid support: hold mid-range, retreat if rushed, spit acid.
          if (dist < 9) moveEnemy(e, lvl, -tx + perpX * e.side, -tz + perpZ * e.side, P.speed * md.speedMul * aggro, dt, R, grid);
          else if (dist > 16) moveEnemy(e, lvl, tx, tz, P.speed * md.speedMul * aggro, dt, R, grid);
          else moveEnemy(e, lvl, perpX * e.side, perpZ * e.side, P.speed * md.speedMul * 0.6, dt, R, grid);
          if (sees[i] && e.fireCd <= 0 && dist < 22) {
            e.fireCd = 1.7;
            const my = e.y + 0.9;
            bossShots.push({ kind: 'acid', x: e.x, y: my, z: e.z, dir: [tgt.x - e.x, player.y + 1 - my, tgt.z - e.z], speed: 22, dmg: md.ranged, color: 0x9cff6a, splash: 1.8 });
          }
        } else if (e.minion === 'sentinel') {
          // ABYSS SENTINEL: standoff void bolts (straight, no puddle); guards the Kraken.
          if (dist < 10) moveEnemy(e, lvl, -tx + perpX * e.side, -tz + perpZ * e.side, P.speed * md.speedMul * aggro, dt, R, grid);
          else if (dist > 20) moveEnemy(e, lvl, tx, tz, P.speed * md.speedMul * aggro, dt, R, grid);
          else moveEnemy(e, lvl, perpX * e.side, perpZ * e.side, P.speed * md.speedMul * 0.6, dt, R, grid);
          if (sees[i] && e.fireCd <= 0 && dist < 26) {
            e.fireCd = 1.5;
            const my = e.y + 0.9;
            bossShots.push({ kind: 'bolt', x: e.x, y: my, z: e.z, dir: [tgt.x - e.x, player.y + 1 - my, tgt.z - e.z], speed: 27, dmg: md.ranged, color: 0xc08bff, splash: 0 });
          }
        } else if (e.minion === 'facet' || e.minion === 'constructor' || e.minion === 'sentry') {
          // ARCHON drones — precise blue bolts. Facet orbits fast; Constructor holds
          // mid-range (tanky); Sentry is a near-stationary turret.
          if (e.minion === 'sentry') {
            const [rx, rz] = wallRepulse(e, lvl, grid);
            if (rx || rz) moveEnemy(e, lvl, rx, rz, P.speed * 0.4, dt, R, grid);
          } else if (dist < 11) moveEnemy(e, lvl, -tx + perpX * e.side, -tz + perpZ * e.side, P.speed * md.speedMul * aggro, dt, R, grid);
          else if (dist > 24) moveEnemy(e, lvl, tx, tz, P.speed * md.speedMul * aggro, dt, R, grid);
          else moveEnemy(e, lvl, perpX * e.side, perpZ * e.side, P.speed * md.speedMul * 0.6, dt, R, grid);
          if (sees[i] && e.fireCd <= 0 && dist < 30) {
            e.fireCd = e.minion === 'facet' ? 1.1 : e.minion === 'sentry' ? 1.3 : 1.6;
            const my = e.y + 0.9;
            const tt = dist / 38;
            bossShots.push({ kind: 'bolt', x: e.x, y: my, z: e.z, dir: [tgt.x - e.x + pvx * tt, player.y + 1 - my, tgt.z - e.z + pvz * tt], speed: 38, dmg: md.ranged, color: 0x49a6ff, splash: 0 });
          }
        } else {
          // STALKER: circle wide, then lunge in for a strike (e.track = lunge timer).
          e.track += dt;
          if (dist > 5 && e.track < 2.4) {
            moveEnemy(e, lvl, perpX * e.side * 1.1 + tx * 0.4, perpZ * e.side * 1.1 + tz * 0.4, P.speed * md.speedMul * aggro, dt, R, grid);
          } else {
            moveEnemy(e, lvl, tx, tz, P.speed * md.speedMul * 1.7 * aggro, dt, R, grid);
            if (dist < 2.6 && e.fireCd <= 0) {
              e.fireCd = 1.0;
              damage += md.melee;
              tracers.push({ from: [e.x, e.y + 0.6, e.z], to: peye, color: mc });
              e.track = 0;
            }
            if (e.track > 3.4) e.track = 0;
          }
        }
      }
      continue;
    }

    // Bosses: a RANGED KITER. Holds a standoff distance and shoots from afar;
    // strafes to stay a hard target; when the player ducks behind cover it
    // maneuvers AROUND to regain a clean shot. Never charges in / never climbs —
    // it repositions for the angle, so an elevated/hidden player gets shot at.
    if (e.boss) {
      const bd = BOSSES[e.boss];
      const tgtB = e.state === 'alert' && e.lastSeen ? e.lastSeen : haveIntel ? squad.lastKnown : null;
      if (tgtB) {
        e.state = 'alert';
        e.bossBrain ??= makeBossBrain();
        const brain = e.bossBrain;
        const dist = Math.hypot(player.x - e.x, player.z - e.z);
        const desp = e.health / e.maxHealth < 0.15; // desperation phase: faster + pounce-happy
        const eAgg = e.enh ? 0.65 : 1; // ENHANCED (gauntlet): attacks more often
        const eSpd = e.enh ? 1.3 : 1; // and moves faster
        e.fireCd -= dt;
        brain.pounceCd -= dt;

        // POUNCE (Xenomorph signature): a telegraphed lunge at the predicted spot.
        // A MISS leaves it exposed (weak-point window) for bonus damage.
        if (e.boss === 'xeno' && brain.pounce === 'none' && brain.pounceCd <= 0 && sees[i] && dist > 7 && dist < 22) {
          brain.pounce = 'windup';
          brain.pounceT = 0.55;
          brain.pounceX = player.x + pvx * 0.35;
          brain.pounceZ = player.z + pvz * 0.35;
          bossTelegraphs.push({ kind: 'pounce', x: brain.pounceX, z: brain.pounceZ, radius: 4, delay: 0.55 });
        }

        if (brain.pounce === 'windup') {
          brain.pounceT -= dt; // coil in place so the telegraph reads
          if (brain.pounceT <= 0) {
            brain.pounce = 'leap';
            brain.pounceT = 0.5;
          }
        } else if (brain.pounce === 'leap') {
          brain.pounceT -= dt;
          const lx = brain.pounceX - e.x;
          const lz = brain.pounceZ - e.z;
          const ll = Math.hypot(lx, lz) || 1;
          moveEnemy(e, lvl, lx / ll, lz / ll, P.speed * 6.5, dt, bd.radius, grid);
          if (brain.pounceT <= 0 || ll < 1.6) {
            const hd = Math.hypot(player.x - e.x, player.z - e.z);
            if (hd < 4.5) {
              damage += Math.round(bd.meleeDmg * 1.7); // slam + knock the player back
              pushPlayer(player, player.x - e.x, player.z - e.z, 9);
            } else {
              e.weakUntil = now + 2000; // overshot → exposed core, bonus-damage window
            }
            brain.pounce = 'none';
            brain.pounceCd = ((desp ? 2.5 : 4.5) + Math.random() * (desp ? 1.5 : 3)) * eAgg;
          }
        } else {
          // RANGED KITE (default): standoff movement + acid spit / hitscan fire.
          const mv = tickBossBrain(brain, e.x, e.z, tgtB.x, tgtB.z, sees[i], dist, dt);
          let wx = mv.wx;
          let wz = mv.wz;
          let speedMul = mv.speedMul;
          if (e.boss === 'behemoth') {
            // LIVING FORTRESS: never kites — a slow, relentless advance that herds the
            // player off the open centre it dominates, with a slight strafe.
            const dbx = tgtB.x - e.x;
            const dbz = tgtB.z - e.z;
            const dbl = Math.hypot(dbx, dbz) || 1;
            wx = dbx / dbl - (dbz / dbl) * brain.strafeSign * 0.2;
            wz = dbz / dbl + (dbx / dbl) * brain.strafeSign * 0.2;
            speedMul = 0.75;
          }
          if (e.boss === 'monolith') speedMul = 0.12; // LIVING CRYSTAL: near-stationary artillery
          if (e.boss === 'infestor') {
            // SWARM-MASS: a slow oozing advance that floods toward the player.
            const dbx = tgtB.x - e.x;
            const dbz = tgtB.z - e.z;
            const dbl = Math.hypot(dbx, dbz) || 1;
            wx = dbx / dbl + (-dbz / dbl) * brain.strafeSign * 0.15;
            wz = dbz / dbl + (dbx / dbl) * brain.strafeSign * 0.15;
            speedMul = 0.62;
          }
          if (e.boss === 'colossus') {
            // TITAN: relentless advance in mobile mode; locks stationary in siege mode.
            if (brain.mode === 1) speedMul = 0.05;
            else {
              const dbx = tgtB.x - e.x;
              const dbz = tgtB.z - e.z;
              const dbl = Math.hypot(dbx, dbz) || 1;
              wx = dbx / dbl;
              wz = dbz / dbl;
              speedMul = 0.7;
            }
          }
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
          const wl = Math.hypot(wx, wz) || 1;
          moveEnemy(e, lvl, wx / wl, wz / wl, P.speed * 1.7 * speedMul * (desp ? 1.35 : 1) * eSpd, dt, bd.radius, grid);

          // KRAKEN TENTACLE ERUPTION: a telegraphed ground burst at the player's
          // predicted spot that damages + launches them up (resolved in the loop).
          if (e.boss === 'octopus' && sees[i] && dist < 45) {
            brain.volleyCd -= dt;
            if (brain.volleyCd <= 0) {
              brain.volleyCd = ((desp ? 2 : 3.5) + Math.random() * 2) * eAgg;
              bossTelegraphs.push({ kind: 'eruption', x: player.x + pvx * 0.5, z: player.z + pvz * 0.5, radius: 3.6, delay: 0.9 });
            }
            // SLAM WAVE: a big shockwave centred on the Kraken — get clear or get
            // knocked back (brain.pounceCd is unused by the Kraken, reused here).
            if (brain.pounceCd <= 0 && dist < 17) {
              brain.pounceCd = ((desp ? 4 : 6.5) + Math.random() * 2) * eAgg;
              // Alternate the slam (knockback ring) with a PULL ZONE vortex under
              // the player that drags them toward its centre.
              if (Math.random() < 0.5) bossTelegraphs.push({ kind: 'slam', x: e.x, z: e.z, radius: 9, delay: 0.75 });
              else bossTelegraphs.push({ kind: 'pull', x: player.x, z: player.z, radius: 5, delay: 0.8 });
            }
            // VOID FOG: periodically cloud the player's vision (purple screen fog).
            brain.fogCd -= dt;
            if (brain.fogCd <= 0) {
              brain.fogCd = (desp ? 5 : 8) + Math.random() * 3;
              bossFog = true;
            }
          }
          // WARLORD GRENADE VOLLEY: lob a cluster of arcing grenades to deny the
          // player's ground (independent of the suppressive-fire cadence).
          if (e.boss === 'warrior' && sees[i] && dist > 6 && dist < 40) {
            brain.volleyCd -= dt;
            if (brain.volleyCd <= 0) {
              brain.volleyCd = ((desp ? 3.5 : 5.5) + Math.random() * 2.5) * eAgg;
              const muzzleY = e.y + bd.scale * 0.6;
              for (let g = -1; g <= 1; g++) {
                const lx = player.x + pvx * 0.4 + g * 2.6; // lead + spread the cluster
                const lz = player.z + pvz * 0.4;
                const hd = Math.hypot(lx - e.x, lz - e.z);
                bossShots.push({ kind: 'grenade', x: e.x, y: muzzleY, z: e.z, dir: [lx - e.x, hd * 0.45, lz - e.z], speed: 17, dmg: Math.round(bd.rangeDmg * 1.5), color: 0xffae3a, splash: 3.2, gravity: 22 });
              }
            }
          }
          // ARCHON BLINK: teleport to a fresh vantage at standoff on a new bearing,
          // then leave its core exposed briefly (weak-point window) — punish the
          // reposition. Its geometric intelligence never lets you settle an angle.
          if (e.boss === 'archon' && sees[i]) {
            brain.abilityCd -= dt;
            if (brain.abilityCd <= 0 && dist > 12 && dist < 50) {
              brain.abilityCd = ((desp ? 3 : 5.5) + Math.random() * 2) * eAgg;
              const ang = Math.atan2(e.z - player.z, e.x - player.x) + (Math.random() < 0.5 ? 1 : -1) * (0.9 + Math.random() * 0.6);
              const rr = 15 + Math.random() * 6;
              const lim = lvl.size / 2 - 4;
              const nx = Math.max(-lim, Math.min(lim, player.x + Math.cos(ang) * rr));
              const nz = Math.max(-lim, Math.min(lim, player.z + Math.sin(ang) * rr));
              if (!blocked(lvl, nx, nz, bd.radius, grid)) {
                e.x = nx;
                e.z = nz;
                e.weakUntil = now + 1500;
              }
            }
          }
          // BEHEMOTH: a ground STOMP shockwave to herd you off open ground (its shed-plate
          // flank is exposed briefly after), plus an arcing BOULDER lob to deny range.
          if (e.boss === 'behemoth' && sees[i]) {
            brain.abilityCd -= dt;
            if (brain.abilityCd <= 0 && dist < 16) {
              brain.abilityCd = ((desp ? 4 : 6.5) + Math.random() * 2) * eAgg;
              bossTelegraphs.push({ kind: 'slam', x: e.x, z: e.z, radius: 11, delay: 0.8 });
              e.weakUntil = now + 1800;
            }
            brain.volleyCd -= dt;
            if (brain.volleyCd <= 0 && dist > 10 && dist < 46) {
              brain.volleyCd = ((desp ? 2.5 : 4) + Math.random() * 2) * eAgg;
              const muzzleY = e.y + bd.scale * 0.7;
              const tt = dist / 20;
              const lx = player.x + pvx * tt * 0.6;
              const lz = player.z + pvz * tt * 0.6;
              const hd = Math.hypot(lx - e.x, lz - e.z);
              bossShots.push({ kind: 'grenade', x: e.x, y: muzzleY, z: e.z, dir: [lx - e.x, hd * 0.5, lz - e.z], speed: 18, dmg: Math.round(bd.rangeDmg * 1.3), color: 0xcaa26a, splash: 3.4, gravity: 22 });
            }
          }
          // SPECTER: PHASE-STRIKE — blink to the player's flank, hit, then go solid +
          // flashing (weak-point window). Plus a periodic FEAR PULSE that clouds vision.
          if (e.boss === 'specter' && sees[i]) {
            brain.abilityCd -= dt;
            if (brain.abilityCd <= 0 && dist > 6) {
              brain.abilityCd = ((desp ? 2.5 : 4) + Math.random() * 1.5) * eAgg;
              const ang = Math.atan2(e.z - player.z, e.x - player.x) + (Math.random() < 0.5 ? 1 : -1) * (1.6 + Math.random() * 0.8);
              const rr = 4.5 + Math.random() * 2;
              const lim = lvl.size / 2 - 4;
              const nx = Math.max(-lim, Math.min(lim, player.x + Math.cos(ang) * rr));
              const nz = Math.max(-lim, Math.min(lim, player.z + Math.sin(ang) * rr));
              if (!blocked(lvl, nx, nz, bd.radius, grid)) {
                e.x = nx;
                e.z = nz;
                damage += bd.meleeDmg; // the ambush strike
                tracers.push({ from: [e.x, e.y + bd.scale * 0.5, e.z], to: peye, color: 0xb877ff });
                e.weakUntil = now + 1500;
              }
            }
            brain.fogCd -= dt;
            if (brain.fogCd <= 0) {
              brain.fogCd = (desp ? 4 : 7) + Math.random() * 2;
              bossFog = true;
            }
          }
          // LEVIATHAN: BURROW → ERUPT at the player's predicted spot (bursting up +
          // exposing its spine = weak window), plus a radial TAIL-SWEEP when close.
          if (e.boss === 'leviathan' && sees[i]) {
            brain.abilityCd -= dt;
            if (brain.abilityCd <= 0 && dist > 10) {
              brain.abilityCd = ((desp ? 3 : 5) + Math.random() * 2) * eAgg;
              const lim = lvl.size / 2 - 4;
              const nx = Math.max(-lim, Math.min(lim, player.x + pvx * 0.6));
              const nz = Math.max(-lim, Math.min(lim, player.z + pvz * 0.6));
              if (!blocked(lvl, nx, nz, bd.radius, grid)) {
                e.x = nx;
                e.z = nz;
                bossTelegraphs.push({ kind: 'eruption', x: nx, z: nz, radius: 4.5, delay: 0.6 });
                e.weakUntil = now + 2000;
              }
            }
            brain.volleyCd -= dt;
            if (brain.volleyCd <= 0 && dist < 12) {
              brain.volleyCd = ((desp ? 4 : 6) + Math.random() * 2) * eAgg;
              bossTelegraphs.push({ kind: 'slam', x: e.x, z: e.z, radius: 9, delay: 0.7 });
            }
          }
          // MONOLITH: RESONANCE CHARGE (core exposed = weak) → a fast refracting BEAM,
          // plus a radial SHARD NOVA when you get close.
          if (e.boss === 'monolith' && sees[i]) {
            if (brain.mode === 1) {
              brain.abilityT -= dt;
              if (brain.abilityT <= 0) {
                brain.mode = 0;
                brain.abilityCd = ((desp ? 2.5 : 4) + Math.random() * 1.5) * eAgg;
                const my = e.y + bd.scale * 0.6;
                bossShots.push({ kind: 'bolt', x: e.x, y: my, z: e.z, dir: [player.x - e.x, player.y + 1 - my, player.z - e.z], speed: 62, dmg: Math.round(bd.rangeDmg * 1.5), color: 0x7fe8ff, splash: 0 });
              }
            } else {
              brain.abilityCd -= dt;
              if (brain.abilityCd <= 0 && dist < 55) {
                brain.mode = 1;
                brain.abilityT = 0.9;
                e.weakUntil = now + 900; // charging = exposed core
              }
            }
            brain.volleyCd -= dt;
            if (brain.volleyCd <= 0 && dist < 16) {
              brain.volleyCd = ((desp ? 4 : 6.5) + Math.random() * 2) * eAgg;
              bossTelegraphs.push({ kind: 'slam', x: e.x, z: e.z, radius: 10, delay: 0.7 });
            }
          }
          // OBLIVION: GRAVITY PULL (drag you into range), VOID NOVA (dims the core =
          // weak), and periodic DARKEN (clouds vision).
          if (e.boss === 'oblivion' && sees[i]) {
            brain.abilityCd -= dt;
            if (brain.abilityCd <= 0 && dist > 8 && dist < 40) {
              brain.abilityCd = ((desp ? 3 : 5) + Math.random() * 2) * eAgg;
              bossTelegraphs.push({ kind: 'pull', x: player.x, z: player.z, radius: 5, delay: 0.8 });
            }
            brain.volleyCd -= dt;
            if (brain.volleyCd <= 0 && dist < 18) {
              brain.volleyCd = ((desp ? 4 : 6.5) + Math.random() * 2) * eAgg;
              bossTelegraphs.push({ kind: 'slam', x: e.x, z: e.z, radius: 11, delay: 0.8 });
              e.weakUntil = now + 1600;
            }
            brain.fogCd -= dt;
            if (brain.fogCd <= 0) {
              brain.fogCd = (desp ? 5 : 8) + Math.random() * 3;
              bossFog = true;
            }
          }
          // COLOSSUS: toggle SIEGE MODE (stationary, cooling core exposed = weak) with a
          // heavy lockdown cannon; a ROCKET BARRAGE arcs in regardless of mode.
          if (e.boss === 'colossus' && sees[i]) {
            brain.abilityCd -= dt;
            if (brain.abilityCd <= 0) {
              brain.mode = brain.mode === 1 ? 0 : 1;
              brain.abilityCd = (brain.mode === 1 ? 3.5 : desp ? 4 : 6) * eAgg;
              if (brain.mode === 1) e.weakUntil = now + 3500;
            }
            if (brain.mode === 1) {
              brain.volleyCd -= dt;
              if (brain.volleyCd <= 0 && dist < 60) {
                brain.volleyCd = 0.8 * eAgg;
                const my = e.y + bd.scale * 0.6;
                bossShots.push({ kind: 'bolt', x: e.x, y: my, z: e.z, dir: [player.x - e.x, player.y + 1 - my, player.z - e.z], speed: 56, dmg: Math.round(bd.rangeDmg * 1.4), color: 0xff8a3a, splash: 0 });
              }
            }
            brain.fogCd -= dt; // reused as the barrage timer
            if (brain.fogCd <= 0 && dist > 8 && dist < 50) {
              brain.fogCd = ((desp ? 3 : 5) + Math.random() * 2) * eAgg;
              const muzzleY = e.y + bd.scale * 0.75;
              for (let g = -1; g <= 1; g++) {
                const lx = player.x + pvx * 0.4 + g * 2.6;
                const lz = player.z + pvz * 0.4;
                const hd = Math.hypot(lx - e.x, lz - e.z);
                bossShots.push({ kind: 'grenade', x: e.x, y: muzzleY, z: e.z, dir: [lx - e.x, hd * 0.5, lz - e.z], speed: 18, dmg: Math.round(bd.rangeDmg * 1.2), color: 0xff8a3a, splash: 3.0, gravity: 22 });
              }
            }
          }
          // CHIMERA: periodically MUTATE (genome sac exposed = weak), DASH-SLASH in at
          // mid-range, and fire a SPINE VOLLEY spread. (pounceCd already ticked above.)
          if (e.boss === 'chimera' && sees[i]) {
            brain.abilityCd -= dt;
            if (brain.abilityCd <= 0) {
              brain.abilityCd = ((desp ? 4 : 6) + Math.random() * 2) * eAgg;
              e.weakUntil = now + 1500;
            }
            if (brain.pounceCd <= 0 && dist > 6 && dist < 20) {
              brain.pounceCd = ((desp ? 2.5 : 4) + Math.random() * 1.5) * eAgg;
              const lim = lvl.size / 2 - 4;
              const nx = Math.max(-lim, Math.min(lim, player.x + ((e.x - player.x) / (dist || 1)) * 4));
              const nz = Math.max(-lim, Math.min(lim, player.z + ((e.z - player.z) / (dist || 1)) * 4));
              if (!blocked(lvl, nx, nz, bd.radius, grid)) {
                e.x = nx;
                e.z = nz;
                damage += Math.round(bd.meleeDmg * 0.8);
                tracers.push({ from: [e.x, e.y + bd.scale * 0.5, e.z], to: peye, color: 0xff5ac8 });
              }
            }
            brain.volleyCd -= dt;
            if (brain.volleyCd <= 0 && dist > 8 && dist < 40) {
              brain.volleyCd = ((desp ? 2.5 : 4) + Math.random() * 1.5) * eAgg;
              const my = e.y + bd.scale * 0.6;
              for (let g = -1; g <= 1; g++) bossShots.push({ kind: 'bolt', x: e.x, y: my, z: e.z, dir: [player.x - e.x + g * 3, player.y + 1 - my, player.z - e.z + g * 3], speed: 34, dmg: bd.rangeDmg, color: 0xff5ac8, splash: 0 });
            }
          }
          // ORACLE: UNFOLD (petals open, core exposed = weak) to fire a CONVERGENCE beam +
          // a TIME-ECHO lead bolt; between salvos it REWINDS a wounded ally to full.
          if (e.boss === 'oracle' && sees[i]) {
            brain.abilityCd -= dt;
            if (brain.abilityCd <= 0) {
              brain.mode = brain.mode === 1 ? 0 : 1;
              brain.abilityCd = (brain.mode === 1 ? 2.6 : desp ? 3 : 4.5) * eAgg;
              if (brain.mode === 1) e.weakUntil = now + 2600;
            }
            if (brain.mode === 1) {
              brain.volleyCd -= dt;
              if (brain.volleyCd <= 0 && dist < 55) {
                brain.volleyCd = (desp ? 0.7 : 1.1) * eAgg;
                const my = e.y + bd.scale * 0.7;
                const tt = dist / 48;
                bossShots.push({ kind: 'bolt', x: e.x, y: my, z: e.z, dir: [player.x - e.x, player.y + 1 - my, player.z - e.z], speed: 50, dmg: bd.rangeDmg, color: 0xffd98a, splash: 0 });
                bossShots.push({ kind: 'bolt', x: e.x, y: my, z: e.z, dir: [player.x + pvx * tt - e.x, player.y + 1 - my, player.z + pvz * tt - e.z], speed: 44, dmg: Math.round(bd.rangeDmg * 0.7), color: 0xffe9b0, splash: 0 });
              }
            }
            brain.fogCd -= dt;
            if (brain.fogCd <= 0) {
              brain.fogCd = desp ? 4 : 6;
              let best: Enemy | null = null;
              let hurt = 0;
              for (const a of enemies) {
                if (!a.minion || a.health <= 0 || a.dormant) continue;
                const miss = a.maxHealth - a.health;
                if (miss > hurt) {
                  hurt = miss;
                  best = a;
                }
              }
              if (best) best.health = best.maxHealth; // rewind to full
            }
          }
          // INFESTOR: PARASITE-SPRAY cone of acid, periodic SPLIT (heart exposed = weak +
          // knockback), and ASSIMILATE — regenerates while its brood is alive.
          if (e.boss === 'infestor' && sees[i]) {
            brain.volleyCd -= dt;
            if (brain.volleyCd <= 0 && dist < 34) {
              brain.volleyCd = ((desp ? 2 : 3.2) + Math.random() * 1.5) * eAgg;
              const my = e.y + bd.scale * 0.6;
              const base = Math.atan2(player.z - e.z, player.x - e.x);
              for (let g = -1; g <= 1; g++) {
                const ca = base + g * 0.24;
                bossShots.push({ kind: 'acid', x: e.x, y: my, z: e.z, dir: [Math.cos(ca) * dist, player.y + 1 - my, Math.sin(ca) * dist], speed: 22, dmg: Math.round(bd.rangeDmg * 0.8), color: 0x9cd84a, splash: 2.0 });
              }
            }
            brain.abilityCd -= dt;
            if (brain.abilityCd <= 0 && dist < 16) {
              brain.abilityCd = ((desp ? 4 : 6) + Math.random() * 2) * eAgg;
              bossTelegraphs.push({ kind: 'slam', x: e.x, z: e.z, radius: 8, delay: 0.7 });
              e.weakUntil = now + 2000;
            }
            brain.fogCd -= dt;
            if (brain.fogCd <= 0) {
              brain.fogCd = 1;
              if (enemies.some((a) => a.minion && a.health > 0 && !a.dormant)) e.health = Math.min(e.maxHealth, e.health + 12); // feed on the brood
            }
          }
          if (dist < bd.meleeRange) {
            if (e.fireCd <= 0) {
              e.fireCd = bd.meleeRate;
              damage += bd.meleeDmg;
              tracers.push({ from: [e.x, e.y + bd.scale * 0.5, e.z], to: peye, color: 0xff3344 });
            }
          } else if (sees[i] && e.fireCd <= 0) {
            if (e.boss === 'xeno') {
              // ACID SPIT: a lobbed green projectile that LEADS the player + leaves
              // an acid puddle on impact (handled in the loop).
              e.fireCd = Math.max(bd.rangeRate, 0.9);
              const muzzleY = e.y + bd.scale * 0.7;
              const tt = dist / 26;
              const lx = player.x + pvx * tt * 0.7;
              const lz = player.z + pvz * tt * 0.7;
              bossShots.push({ kind: 'acid', x: e.x, y: muzzleY, z: e.z, dir: [lx - e.x, player.y + 1.0 - muzzleY, lz - e.z], speed: 26, dmg: Math.round(bd.rangeDmg * 1.4), color: 0x9cff6a, splash: 2.6 });
            } else if (e.boss === 'archon') {
              // PRECISION BOLT: a fast, hard-leading energy bolt (geometric aim).
              e.fireCd = bd.rangeRate;
              const my = e.y + bd.scale * 0.5;
              const tt = dist / 40;
              const lx = player.x + pvx * tt;
              const lz = player.z + pvz * tt;
              bossShots.push({ kind: 'bolt', x: e.x, y: my, z: e.z, dir: [lx - e.x, player.y + 1 - my, lz - e.z], speed: 40, dmg: bd.rangeDmg, color: 0x49a6ff, splash: 0 });
            } else if (e.boss === 'leviathan') {
              // VENOM SPRAY: a lobbed acid gob that leads + leaves a puddle on impact.
              e.fireCd = Math.max(bd.rangeRate, 0.9);
              const muzzleY = e.y + bd.scale * 0.7;
              const tt = dist / 24;
              const lx = player.x + pvx * tt * 0.7;
              const lz = player.z + pvz * tt * 0.7;
              bossShots.push({ kind: 'acid', x: e.x, y: muzzleY, z: e.z, dir: [lx - e.x, player.y + 1.0 - muzzleY, lz - e.z], speed: 24, dmg: Math.round(bd.rangeDmg * 1.2), color: 0x9adb3a, splash: 2.4 });
            } else {
              e.fireCd = bd.rangeRate;
              tracers.push({ from: [e.x, e.y + bd.scale * 0.7, e.z], to: peye, color: bd.color });
              if (Math.random() < bd.acc) damage += bd.rangeDmg;
            }
          }
        }
      }
      continue;
    }

    // Zero-in tracking: continuous sight sharpens aim; losing sight decays it.
    if (sees[i]) e.track = Math.min(2, e.track + dt);
    else e.track = Math.max(0, e.track - dt * 1.5);

    if (e.stunT > 0) continue; // EMP/concussion: frozen, no move or fire
    const slow = e.slowT > 0 ? 0.45 : 1; // cryo slow
    const role = CLASS[e.cls];
    const tgt = e.state === 'alert' && e.lastSeen ? e.lastSeen : haveIntel ? squad.lastKnown : null;

    // HEALER (engineer): roam to the MOST-WOUNDED squadmate and mend them with a
    // green beam (health first, then shield). Only when someone actually needs it —
    // otherwise it falls through to normal hang-back support behaviour.
    if (e.cls === 'engineer') {
      let mend: Enemy | null = null;
      let worst = 0.985; // ignore ~full-health allies
      for (let j = 0; j < enemies.length; j++) {
        const a = enemies[j];
        if (j === i || a.health <= 0 || a.boss) continue;
        const frac = a.health / a.maxHealth;
        if (frac < worst) {
          worst = frac;
          mend = a;
        }
      }
      if (mend) {
        const hd = Math.hypot(mend.x - e.x, mend.z - e.z);
        const sp = P.speed * role.speedMul * slow;
        if (hd > 6) {
          // Close on the wounded ally (route around structures if far).
          if (nav && hd > NAV_NEAR) {
            const nf = navFollow(e, nav, lvl, mend.x, mend.z, mend.y > e.y + 2 ? mend.y : 0, sp, dt, grid);
            if (nf && nf !== 'climb') moveEnemy(e, lvl, nf.wx, nf.wz, sp, dt, R, grid);
          } else {
            moveEnemy(e, lvl, mend.x - e.x, mend.z - e.z, sp, dt, R, grid);
          }
        } else {
          // In range: mend over time + a periodic heal-beam pulse.
          mend.health = Math.min(mend.maxHealth, mend.health + HEAL_RATE * dt);
          if (mend.shield < mend.maxShield) mend.shield = Math.min(mend.maxShield, mend.shield + HEAL_RATE * 0.5 * dt);
          e.healCd = (e.healCd ?? 0) - dt;
          if (e.healCd <= 0) {
            e.healCd = 0.3;
            tracers.push({ from: [e.x, e.y + 1.2, e.z], to: [mend.x, mend.y + 1.2, mend.z], color: 0x6affa0 });
          }
          const [rx, rz] = wallRepulse(e, lvl, grid);
          if (rx || rz) moveEnemy(e, lvl, rx, rz, sp * 0.4, dt, R, grid);
        }
        e.state = sees[i] || haveIntel ? 'alert' : 'idle';
        fireAt(e, sees[i]);
        continue;
      }
    }

    // SNIPER: relocate to the best VANTAGE on the player's area and shoot from it.
    // Re-picks a better perch periodically (elevated + a clear line to the focus)
    // so it's always moving toward the best possible shot; routes there via the
    // nav graph and eases off walls while holding. Falls back to its spawn perch
    // when there's no nav graph.
    if (e.cls === 'marksman') {
      const focusS = tgt ?? squad.hot ?? { x: player.x, z: player.z };
      e.perchT = (e.perchT ?? 0) - dt;
      if (nav && !sees[i] && (e.perchT <= 0 || !e.perch)) {
        const v = bestVantage(nav, lvl, grid, e.x, e.z, focusS.x, focusS.z, mem?.preferRange ?? 18);
        if (v) e.perch = v;
        e.perchT = 1.4 + Math.random() * 1.2;
      }
      const v = e.perch;
      if (v) {
        const reached = Math.abs(e.y - v.y) < 0.8 && Math.hypot(e.x - v.x, e.z - v.z) < 2.6;
        if (!reached) {
          if (nav && Math.hypot(v.x - e.x, v.z - e.z) > NAV_NEAR) {
            const nf = navFollow(e, nav, lvl, v.x, v.z, v.y, P.speed * role.speedMul * slow, dt, grid);
            if (nf !== 'climb' && nf) moveEnemy(e, lvl, nf.wx, nf.wz, P.speed * role.speedMul * slow, dt, R, grid);
          } else {
            const busy = climbToward(e, lvl, v.y, P.speed * role.speedMul * slow, dt, grid);
            if (!busy) moveEnemy(e, lvl, v.x - e.x, v.z - e.z, P.speed * 0.8 * slow, dt, R, grid);
          }
        } else if (sees[i]) {
          const [rx, rz] = wallRepulse(e, lvl, grid); // hold the shot, but don't hug the wall
          if (rx || rz) moveEnemy(e, lvl, rx, rz, P.speed * 0.5 * slow, dt, R, grid);
        }
      } else if (nav) {
        const nf = navFollow(e, nav, lvl, focusS.x, focusS.z, 0, P.speed * role.speedMul * slow, dt, grid);
        if (nf !== 'climb' && nf) moveEnemy(e, lvl, nf.wx, nf.wz, P.speed * role.speedMul * slow, dt, R, grid);
      }
      e.state = sees[i] || haveIntel ? 'alert' : 'idle';
      fireAt(e, sees[i]);
      continue;
    }

    if (tgt) {
      e.state = 'alert';
      const boosted = e.alarm > 0;
      // LONG-RANGE NAV: when the target is far, route the battlefield via the nav
      // graph (around structures, up ladders, across ramps, out of trenches) and
      // hand off to the close-range standoff/orbit logic below once within reach.
      const distTgt = Math.hypot(tgt.x - e.x, tgt.z - e.z);
      if (nav && distTgt > NAV_NEAR) {
        const tgtY = player.y > e.y + 2 ? player.y : 0;
        const nf = navFollow(e, nav, lvl, tgt.x, tgt.z, tgtY, P.speed * role.speedMul * slow, dt, grid);
        if (nf === 'climb') {
          fireAt(e, sees[i]);
          continue;
        }
        if (nf) {
          moveEnemy(e, lvl, nf.wx, nf.wz, P.speed * role.speedMul * (boosted ? 1.15 : 1) * slow, dt, R, grid);
          fireAt(e, sees[i]);
          continue;
        }
      }
      // Climb after an elevated player, or drop back down for a grounded one.
      let wantY = e.y;
      if (player.y > e.y + 2) wantY = player.y;
      else if (e.onDeck && player.y < e.y - 1.5) wantY = 0;
      if (Math.abs(wantY - e.y) > 0.6 && climbToward(e, lvl, wantY, P.speed * role.speedMul * slow, dt, grid)) {
        fireAt(e, sees[i]);
        continue;
      }
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
      // WALL DISCIPLINE: while shooting, ease off any wall so the firing lane stays
      // clean; if hit but currently blind, BREAK FOR COVER rather than stand exposed.
      if (sees[i]) {
        const [rx, rz] = wallRepulse(e, lvl, grid);
        wx += rx * 0.8;
        wz += rz * 0.8;
      } else if (e.alarm > 0) {
        const cv = seekCoverDir(e, lvl, grid, tgt.x, tgt.z);
        if (cv) {
          const cl = Math.hypot(cv[0], cv[1]) || 1;
          wx = cv[0] / cl;
          wz = cv[1] / cl;
        }
      }
      moveEnemy(e, lvl, wx, wz, P.speed * role.speedMul * (boosted ? 1.25 : 1) * slow, dt, R, grid);
      fireAt(e, sees[i]);
      // Give up only when there's no personal sight, no shared intel, and the
      // bot has reached the spot.
      if (!sees[i] && !haveIntel && md < 1.5) {
        e.state = 'idle';
        e.lastSeen = null;
      }
    } else if (e.onDeck) {
      climbToward(e, lvl, 0, P.speed * 0.5, dt, grid); // no target: come down off the deck
    } else {
      // COORDINATED HUNT — no sighting, no live intel. The squad searches with a
      // PLAN: head for the player's learned favourite ground (heat) and FAN OUT by
      // slot so they sweep in from spread bearings (a pincer). The tank drives to
      // the centre to harass; the others surround, tighter the more bots the player
      // has dropped (learned). Still NO fire — no line of sight.
      const focus = squad.hot ?? { x: player.x, z: player.z };
      const N = Math.max(1, aliveCount);
      const bearing = (slot[i] / N) * Math.PI * 2 + now / 9000;
      const ring = e.cls === 'tank' ? 0 : 10 - coord * 4 + (slot[i] % 3) * 4;
      const gx2 = focus.x + Math.cos(bearing) * ring;
      const gz2 = focus.z + Math.sin(bearing) * ring;
      const hsp = (e.cls === 'tank' ? 0.62 : 0.5) * P.speed * slow;
      const nf = nav ? navFollow(e, nav, lvl, gx2, gz2, 0, hsp, dt, grid) : null;
      if (nf === 'climb') {
        // climb system moved the bot toward a vertical link on the route
      } else if (nf) {
        moveEnemy(e, lvl, nf.wx, nf.wz, hsp, dt, R, grid);
      } else {
        moveEnemy(e, lvl, gx2 - e.x, gz2 - e.z, hsp, dt, R, grid);
      }
    }
  }
  return { damage, tracers, seen, bossShots, bossTelegraphs, bossFog };
}
