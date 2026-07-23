'use client';

import { useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { buildWorld, type World } from './fps/scene';
import { animateCapital, buildCapital } from './fps/capital/model';
import { animateFighter, buildFighter } from './fps/capital/fighter';
import type { CapitalSpec } from './fps/capital/spec';
import { EYE, MAX_PITCH, launchPlayer, pushPlayer, startGrapple, stepPlayer, type Player3 } from './fps/physics';
import type { Level3D } from './fps/level3d';
import { updateEnemies, hurtEnemy, tankShieldAura, BOSSES, ENEMY_HP, SHIELD_FRAC, type Difficulty, type Enemy, type Squad, type Smoke } from './fps/enemy';
import { rayWallBox, raySphere, segBlocked, type Vec3 } from './fps/combat';
import type { Box } from './fps/level3d';
import { bossTex } from './fps/textures';
import { buildEnemyModel, disposeEnemyModel } from './fps/enemies/models';
import { animateMech } from './fps/enemies/models/mech';
import { poseDeath, poseEnemy } from './fps/enemies/animator';
import { buildBossModel, buildDestructibleModel } from './fps/boss/models';
import { poseBossDeath, poseBossModel } from './fps/boss/animator';
import { MINIONS, buildMinionModel, poseMinion } from './fps/boss/minions';
import type { GunDef, ThrowDef } from './fps/weapons';
import type { EngPart } from './fps/arsenal/parts';
import { sfx } from './engine/audio';
import { makeComposer } from './fps/postfx';
import { Viewmodel } from './fps/viewmodel';
import type { RenderTier } from './fps/materials';
import { SpatialGrid } from './fps/level/grid';
import { buildNavGraph, type NavGraph } from './fps/level/nav';
import { ProjectileSystem } from './fps/projectiles';
import { TelegraphSystem } from './fps/telegraph';
import { ThrowableFx } from './fps/fx/throwableFx';

// A void fighter launched by the Star Destroyer — a free-flying strike craft with its own
// 3D flight AI (steer/dodge/hover/strafe), managed as a dedicated array (NOT a g.enemies row).
interface Fighter {
  x: number; y: number; z: number;      // position
  vx: number; vy: number; vz: number;   // velocity
  health: number; maxHealth: number;
  shield: number; maxShield: number;    // tank-grade overshield, depletes before health
  model: THREE.Group;
  fireCd: number;                        // seconds until it may fire again
  mode: 'ingress' | 'strafe' | 'bank' | 'reposition';
  modeT: number;                         // seconds left in the current mode
  goal: THREE.Vector3;                   // steering target
  bank: number;                          // current roll (rad), eased toward the turn
  hitFlash: number;                      // seconds of hit-flash remaining
  crashing: boolean;                     // shot down → death-diving at the player, detonates on contact/ground
  crashT: number;                        // seconds spent crashing (failsafe detonation)
}

const RW = 480;
const RH = 270;
const LOOK_SENS = 0.0024;
const RANGE = 200;
const ENEMY_R = 0.7;

// Touch auto-fire engagement range per weapon family. Snipers never auto-fire
// from the hip (they only engage when scoped — handled separately); the rest
// open up only once a target is inside their effective band, so a rifle won't
// snipe across the whole arena. The band widens when you deliberately zoom.
const AF_RANGE: Record<string, number> = { rifle: 46, mg: 40, laser: 46, pistol: 30, launcher: 60, sniper: RANGE };
// Bullet spread (radians) at the hip — wide and "sprayy" un-zoomed, tightens
// hard when scoped so the scope is what makes shots land dead-centre.
const SPREAD: Record<string, number> = { rifle: 0.026, mg: 0.044, laser: 0.016, pistol: 0.032, launcher: 0.018, sniper: 0.004 };
// Per-shot camera recoil KICK (radians the view jolts up, then recovers). This
// is the cue that reads through the scope — snipers & launchers (the slow, heavy
// secondaries) kick hard so each shot/cycle is obvious; autos stay snappy.
const RECOIL: Record<string, number> = { rifle: 0.016, mg: 0.011, laser: 0.009, pistol: 0.03, launcher: 0.1, sniper: 0.085 };
const BURST_GAP = 0.07; // intra-burst round spacing (CB-02)
// Per-body-zone damage. A non-boss enemy's body is a stack of overlapping spheres
// (legs / torso / head) so the WHOLE silhouette is hittable — no more "aim at the
// crotch." The damage multiplier is banded by WHERE the round lands: the head hits
// hardest, centre-chest gets a bonus, limbs are chip damage. Bosses/deployables keep
// their single sphere + weak-point mechanic (no zones — headshot-immune).
const HEADSHOT_MULT = 2.5;
const CHEST_MULT = 1.25;
const LIMB_MULT = 0.75;

// Capital-ship scaling references (Gabe's spec). The Star Destroyer + its fighters are sized
// off the ground units so the fight reads as capital-grade. Base unit values live in enemy.ts:
// ENEMY_HP × 3.0 = the tank/artillery base HP; ×SHIELD_FRAC = their base shield; the artillery
// shell hits for 22. Difficulty scales HP/damage the same way PARAMS does for regular enemies.
const HP_MUL: Record<Difficulty, number> = { normal: 0.85, hard: 1.0, nightmare: 1.2 };
const DMG_MUL: Record<Difficulty, number> = { normal: 0.85, hard: 1.05, nightmare: 1.3 };
const UNIT_HP = ENEMY_HP * 3.0; // tank/artillery base HP (1500)
const UNIT_SHIELD = UNIT_HP * SHIELD_FRAC; // their base shield (1125)
const ARTY_DMG = 22; // artillery shell base damage (× DMG_MUL)

/** Ray vs a non-boss enemy's body (legs+torso+head spheres, sized to a ~2 m humanoid).
 *  Returns the nearest entry distance + the zone damage multiplier (Infinity = miss). */
function bodyHit(eye: Vec3, dir: Vec3, e: Enemy): { t: number; mult: number } {
  // Zones + zone bands scale with the model height so tall Legion units (2.4–3.1 m) are fully
  // hittable head/chest/legs, not just the lower 1.8 m.
  const h = e.bodyH ?? 1;
  const legs = raySphere(eye, dir, [e.x, e.y + 0.55 * h, e.z], 0.6 * h);
  const torso = raySphere(eye, dir, [e.x, e.y + 1.25 * h, e.z], 0.55 * h);
  const head = raySphere(eye, dir, [e.x, e.y + 1.72 * h, e.z], 0.3 * h);
  const t = Math.min(legs, torso, head);
  if (!isFinite(t)) return { t: Infinity, mult: 1 };
  const iy = (eye[1] + dir[1] * t - e.y) / h; // impact height above the feet, normalized to 1.8 m
  const mult = iy > 1.5 ? HEADSHOT_MULT : iy > 1.05 ? CHEST_MULT : iy > 0.7 ? 1 : LIMB_MULT;
  return { t, mult };
}
// Self-damage: the player takes a fraction of a throwable's blast (falloff to the
// edge) if caught in its AoE — dangerous but not always an instant kill.
const PLAYER_BLAST_MULT = 0.4;
const HEAT_SHOTS = 24; // energy shots to overheat (ER-08); vents ~2 s when idle
const OVERHEAT_LOCK = 1.9; // overheat cooldown lockout seconds
// How many zoom steps a weapon has past the hip: snipers get 3 (3× scope),
// everything else gets a single ADS zoom. Sidearms (pistols) included = 1.
const maxZoomFor = (gun: GunDef) => (gun.scoped ? 3 : 1);

/** Apply a premium gun's thematic on-hit effect (so it does what its description says):
 *  burn = damage-over-time · cryo = slow · shock = brief stun · void = strong drag + light DoT. */
function applyWeaponTrait(e: Enemy, gun: GunDef): void {
  switch (gun.trait) {
    case 'burn':
      e.burnT = Math.max(e.burnT, 2.5);
      e.burnDps = Math.max(e.burnDps, gun.dmg * 0.15);
      break;
    case 'cryo':
      e.slowT = Math.max(e.slowT, 2.5);
      break;
    case 'shock':
      e.stunT = Math.max(e.stunT, 0.5);
      break;
    case 'void':
      e.slowT = Math.max(e.slowT, 2.0);
      e.burnT = Math.max(e.burnT, 1.2);
      e.burnDps = Math.max(e.burnDps, gun.dmg * 0.08);
      break;
  }
}

export interface FpsGameState {
  level: Level3D;
  capital?: CapitalSpec | null; // Star Destroyer for this level (SD levels only); else null
  player: Player3;
  enemies: Enemy[];
  difficulty: Difficulty;
  guns: GunDef[];
  gunParts?: EngPart[][]; // equipped components per gun (parallel to guns) → shown on the viewmodel
  active: number;
  mags: number[];
  reserves: number[];
  ads: boolean;
  reloading: number;
  fireCd: number;
  throwable: ThrowDef;
  throwCount: number;
  status: 'playing' | 'won' | 'lost';
  kills: number;
  headshots: number;
  shotsFired: number;
  shotsHit: number;
  dmgDealt: number;
  regenT: number;
  regenDelay?: number; // seconds hidden before regen starts (RECOVERY stat; default 2)
  regenRate?: number; //  HP/sec regenerated once healing (RECOVERY stat; default 24)
  squads: Squad[]; // one shared-intel object per squad (independent squads)
  maxHp: number;
  god?: boolean; // dev: invincible (health stays full)
  revive?: boolean; // Nano-Revive: survive one lethal hit this level (then consumed)
  elapsed: number; // seconds since the level started (combat lock + boss grace)
  // Rechargeable overshield: refills 2s after the last hit; after a few full recharges
  // it OVERLOADS (disabled) until a shield pickup/station re-enables it.
  lastHitT?: number; // ms timestamp of the last damage taken
  shieldRecharges?: number; // full recharges used this level
  shieldOverloaded?: boolean; // overshield burnt out until re-enabled by a shield pickup
  // Boss-fight OVERDRIVE: a cinematic opening (boss reveal → gun empowerment) that grants a
  // damage buff for that boss fight only. Set by FpsGame on the shared game state.
  weaponBuff?: number; // player damage multiplier (2.5 after the empowerment; 1/undefined otherwise)
  cineLock?: boolean; // freeze player input + enemy AI + the level clock during the opening cinematic
  bossCine?: 'reveal' | 'empower' | null; // active cinematic beat (drives the boss-reveal camera)
}

export interface FpsSnapshot {
  health: number;
  maxHp: number;
  armor: number; // overshield (soaks damage before health)
  maxArmor: number;
  shieldOverloaded?: boolean; // overshield burnt out (recharges disabled until a shield pickup)
  stamina?: number; // 0..1 sprint stamina
  pickupAt: number; // timestamp of the last ammo/shield pickup (HUD flash)
  weapon: string;
  family: string;
  mag: number;
  reserve: number;
  reloading: boolean;
  reloadProgress: number; // 0..1 reload completion (for the reload button's ring)
  ads: boolean;
  scoped: boolean;
  heat?: number; // energy heat 0..1 (heat weapons only)
  overheated?: boolean; // energy weapon locked out
  charge?: number; // charge progress 0..1 (charge weapons only)
  slots: { name: string; active: boolean }[];
  throwName: string;
  throwCount: number;
  bosses: { name: string; ratio: number; phase: number; status: string; brood: number; shield?: number }[];
  enemiesLeft: number;
  status: 'playing' | 'won' | 'lost';
  kills: number;
  headshots: number;
  shotsFired: number;
  shotsHit: number;
  dmgDealt: number;
  hitAt: number;
  headshotAt: number; // last headshot time (HUD crit marker)
  fireAt: number;
  hurtAt: number;
  flashAt: number; // player flashbanged
  stunAt: number; // player caught in a stun/concussion blast (screen distortion)
  fogAt: number; // Kraken void fog cast (vision-obscuring overlay)
  grappleReady: boolean; // a rooftop grapple point is aimable right now
  radar: { x: number; z: number; boss: boolean; kind?: 'ammo' | 'shield' | 'health' }[]; // enemies + pickups, player-relative
  shakeAt: number;  // timestamp of the last blast shake (drives the HUD shake)
  shakeMag: number; // 0..1 shake intensity for that blast
  overdrive?: boolean; // boss OVERDRIVE ×2.5 buff active
  suppressAt?: number;  // timestamp of the last suppressor pin (drives the suppression vignette)
  suppressMag?: number; // 0..1 suppression intensity
}

interface Grenade { x: number; y: number; z: number; vx: number; vy: number; vz: number; fuse: number; mesh: THREE.Mesh; landed?: boolean; age?: number }
interface SmokeFx extends Smoke { until: number; born: number; dur: number; dps: number; mesh: THREE.Mesh }
interface Flash { mesh: THREE.Mesh; born: number; r: number }
interface Zone { kind: 'fire' | 'cryo' | 'decoy'; x: number; z: number; r: number; born: number; until: number; dps: number; slow: number; lure: boolean; mesh: THREE.Mesh }

export function useFpsLoop(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  gameRef: React.MutableRefObject<FpsGameState | null>,
  active: boolean,
  onSnapshot: (s: FpsSnapshot) => void,
) {
  const keys = useRef<Set<string>>(new Set());
  const touchMove = useRef({ fwd: 0, strafe: 0 });
  const lookDX = useRef(0);
  const lookDY = useRef(0);
  const fireHeld = useRef(false);
  const crouchHeld = useRef(false); // crouch toggle (C key / touch button)
  const sprintHeld = useRef(false); // sprint held (touch button; keyboard uses Shift)
  const stamina = useRef(1); // 0..1 sprint stamina
  const sprintLock = useRef(false); // depleted → locked out until it recovers
  const zoomLevel = useRef(0); // 0 = hip, 1 = zoom, 2 = deep zoom (right-click cycles)
  const sens = useRef(1); // look-sensitivity multiplier (user-adjustable)
  const aimAssistOn = useRef(true); // touch aim assist (settings)
  const invertY = useRef(false); // invert look pitch (settings)
  const reloadReq = useRef(false);
  const throwReq = useRef(false);
  const jumpReq = useRef(false);
  const grappleReq = useRef(false);
  const prevFire = useRef(false); // previous AUTO-fire state (auto rising edge)
  const prevManualFire = useRef(false); // previous MANUAL trigger state (manual rising edge)
  // Fire-mode transient state (reset on weapon switch): burst rounds left, charge held,
  // energy heat (0..1) + overheat lockout seconds.
  const burstLeft = useRef(0);
  const chargeT = useRef(0);
  const heat = useRef(0);
  const overheat = useRef(0);
  const prevGunId = useRef('');
  const switchReq = useRef<number | 'next' | 'prev' | null>(null);

  const setMoveAxis = useCallback((strafe: number, fwd: number) => {
    touchMove.current = { strafe, fwd };
  }, []);
  const addLook = useCallback((dx: number, dy: number) => {
    lookDX.current += dx;
    lookDY.current += dy;
  }, []);
  const cycleWeapon = useCallback((dir: 1 | -1) => {
    switchReq.current = dir > 0 ? 'next' : 'prev';
  }, []);
  const cycleZoom = useCallback(() => {
    const g = gameRef.current;
    const gun = g?.guns[g.active];
    const steps = gun ? maxZoomFor(gun) + 1 : 2;
    zoomLevel.current = (zoomLevel.current + 1) % steps;
  }, [gameRef]);
  const setSensitivity = useCallback((v: number) => {
    sens.current = v;
  }, []);
  const setAimAssist = useCallback((v: boolean) => {
    aimAssistOn.current = v;
  }, []);
  const setFire = useCallback((v: boolean) => {
    fireHeld.current = v; // touch manual fire (a fallback when auto-fire won't engage)
  }, []);
  const setCrouch = useCallback((v: boolean) => {
    crouchHeld.current = v;
  }, []);
  const setSprint = useCallback((v: boolean) => {
    sprintHeld.current = v;
  }, []);
  const setInvertY = useCallback((v: boolean) => {
    invertY.current = v;
  }, []);
  const throwGrenade = useCallback(() => {
    throwReq.current = true;
  }, []);
  const jump = useCallback(() => {
    jumpReq.current = true;
  }, []);
  const grapple = useCallback(() => {
    grappleReq.current = true;
  }, []);
  const reload = useCallback(() => {
    reloadReq.current = true;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(1);
    renderer.setSize(RW, RH, false);
    const camera = new THREE.PerspectiveCamera(78, RW / RH, 0.1, 360);
    camera.rotation.order = 'YXZ';
    const isTouch = 'ontouchstart' in window;
    const ballGeo = new THREE.SphereGeometry(1, 10, 8);
    // Pickup SYMBOLS (emissive so Bloom catches them): AMMO = 4 white bullets bunched,
    // SHIELD = a gold sphere, HEALTH = a green cross. Reused for placed (relocating)
    // pickups and enemy-death drops so all drops read the same.
    const pkMat = {
      ammo: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.85, roughness: 0.4, metalness: 0.3 }),
      shield: new THREE.MeshStandardMaterial({ color: 0xffd24a, emissive: 0xffc400, emissiveIntensity: 1.0, roughness: 0.3, metalness: 0.5 }),
      health: new THREE.MeshStandardMaterial({ color: 0x4dff7a, emissive: 0x25ff5c, emissiveIntensity: 1.1, roughness: 0.4, metalness: 0.1 }),
    };
    const mkPickup = (kind: 'ammo' | 'shield' | 'health'): THREE.Group => {
      const g = new THREE.Group();
      if (kind === 'health') {
        g.add(new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.32, 0.32), pkMat.health)); // green cross
        g.add(new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.95, 0.32), pkMat.health));
      } else if (kind === 'ammo') {
        for (const [ox, oy] of [[-0.16, 0.17], [0.16, 0.17], [-0.16, -0.17], [0.16, -0.17]]) {
          const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.36, 4, 8), pkMat.ammo); // bullet
          b.position.set(ox, oy, 0);
          g.add(b);
        }
      } else {
        g.add(new THREE.Mesh(new THREE.SphereGeometry(0.46, 16, 12), pkMat.shield)); // gold sphere
      }
      return g;
    };
    const disposeObj = (o: THREE.Object3D) => o.traverse((c) => (c as THREE.Mesh).geometry?.dispose?.());

    // Render tier — drives material cost (emissive walls) + post-FX weight.
    // Phones / low-memory devices get the cheaper Lambert walls + bloom-only.
    const lowMem = typeof navigator !== 'undefined' && (navigator as Navigator & { deviceMemory?: number }).deviceMemory !== undefined
      && ((navigator as Navigator & { deviceMemory?: number }).deviceMemory as number) < 4;
    const tier: RenderTier = isTouch || lowMem ? 'mobile' : 'desktop';

    // Imperative post-processing composer (Bloom + grain), built lazily once the
    // first world exists; sized to the 480×270 buffer. The RenderPass's scene is
    // repointed when the world is rebuilt (camera object is stable).
    let composer: ReturnType<typeof makeComposer> | null = null;
    // 3D first-person viewmodel (the selected gun), drawn over the world frame.
    let viewmodel: Viewmodel | null = null;
    let vmEmpowered = false; // last-applied OVERDRIVE red state (toggle on change only)
    // Handcrafted throwable VFX (trails, detonations, lingering). Rebuilt per level
    // with the world's scene; cosmetic only (gameplay resolves separately).
    let throwFx: ThrowableFx | null = null;
    // DYNAMIC render resolution — the internal buffer matches the canvas aspect (so
    // a full-screen game never stretches) at a perf-scaled retro resolution (NEAREST
    // filter retained). renderScale flexes with measured FPS to hold a stable frame.
    let renderScale = tier === 'mobile' ? 0.8 : 1.0;
    let fpsFrames = 0;
    let fpsTimer = 0;
    // Desktop renders at a higher base (360 vs the old 270) so the map + distant
    // enemies read clearly — still chunky/pixelated. Mobile stays at 270 to protect
    // phone perf. Dynamic-res still scales this down under load.
    const BASE_H = tier === 'mobile' ? 270 : 360;
    const MIN_H = 150;
    const MAX_H = 430;
    const resize = () => {
      // Measure the host (the game screen), not the canvas — the canvas carries the
      // small render-buffer attributes, so reading its own client size can be wrong.
      const host = canvas.parentElement;
      const cw = host?.clientWidth || canvas.clientWidth || window.innerWidth || RW;
      const ch = host?.clientHeight || canvas.clientHeight || window.innerHeight || RH;
      const aspect = cw / ch || RW / RH;
      // Lock the canvas DISPLAY size to the host so it always fills edge-to-edge
      // (the low-res buffer is then upscaled by the browser).
      canvas.style.width = `${cw}px`;
      canvas.style.height = `${ch}px`;
      const h = Math.max(MIN_H, Math.min(MAX_H, Math.round(BASE_H * renderScale)));
      const w = Math.round(h * aspect);
      renderer.setSize(w, h, false);
      composer?.composer.setSize(w, h);
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      viewmodel?.resize(aspect);
    };
    // The weapon id whose sustained-fire loop (Ripper / Lance Beam) is playing.
    let activeLoop: string | null = null;

    let world: World | null = null;
    let builtFor: Level3D | null = null;
    // STAR DESTROYER — the capital ship for SD levels. Hidden during the fight; on clear a
    // BLACK HOLE ruptures and the ship EMERGES from it (camera pans over), a 3s grace beat lets
    // you take cover, then it BOMBARDS before departing. Phases: idle → arriving → grace →
    // combat → depart. Obelisk hulls stand vertically on the ground; the rest loom overhead.
    let sd: THREE.Group | null = null;
    let sdPhase: 'idle' | 'arriving' | 'grace' | 'combat' | 'depart' = 'idle';
    let sdT = 0;                // seconds elapsed in the current phase
    let sdCamPan = 0;           // 0..1 how far the camera is slaved to the ship
    let sdFireCd = 0;           // bombardment cadence
    let sdObelisk = false;      // obelisk hulls stand vertically on an open ground spot
    let sdDone = false;         // the whole arrival→bombardment→depart cinematic has resolved
    let sdHp = 1;               // Star Destroyer hull integrity — the ship is now KILLABLE
    let sdMax = 1;
    let sdShield = 0;           // capital overshield — absorbs fire before the hull (non-regen)
    let sdShieldMax = 1;
    let sdMegaCharge = 0;       // 0..1 mega-cannon charge (telegraph glow before it fires)
    let sdMgCd = 0;             // machine-gun cadence (fast, bursts)
    let sdMgBurst = 5;          // rounds left in the current MG burst
    let sdMegaCd = 4;           // mega-cannon cadence
    let sdHitFlash = 0;         // seconds of hull hit-flash remaining
    let sdRadius = 20;          // bounding radius for shoot hit-tests (measured from the model)
    let sdCrippled = false;     // hull at 0 → rolling secondary detonations until the encounter ends
    let blackHole: THREE.Group | null = null;
    let bhRingA: THREE.Mesh | null = null;
    let bhRingB: THREE.Mesh | null = null;
    // The launched strike-craft squadron (waves of 3, cap 6). A dedicated array — never
    // g.enemies — so the free-flight AI + models stay isolated from the ground-enemy system.
    let fighters: Fighter[] = [];
    let fightersSpawned = 0;
    let fighterWaveCd = 0;      // delay before the next wave deploys
    const FIGHTER_CAP = 6;
    const FIGHTER_WAVE = 3;
    const sdBirth = new THREE.Vector3();  // where the rift opens / the ship first appears
    const sdFinal = new THREE.Vector3();  // where the ship settles (sky loom or ground stand)
    const sdSize = { from: 0.02, to: 1.7 }; // emergence scale (to = 1.5× the old 1.15 loom)
    const SD_ARRIVE = 4.5;     // emergence duration (s)
    const SD_GRACE = 3;        // take-cover beat (s)
    const SD_DEPART = 3.5;     // exit-through-the-rift duration (s)
    const makeBlackHole = (accent: number) => {
      const g0 = new THREE.Group();
      g0.add(new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({ color: 0x000000 })));
      const ringMat = () => new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false });
      const a = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.13, 12, 48), ringMat());
      const b = new THREE.Mesh(new THREE.TorusGeometry(1.85, 0.06, 10, 48), ringMat());
      b.rotation.x = Math.PI / 2.5;
      g0.add(a, b);
      bhRingA = a; bhRingB = b;
      return g0;
    };
    const disposeSd = (o: THREE.Object3D) => o.traverse((n) => {
      const m = n as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else if (mat) mat.dispose();
    });
    // Spatial grid over the current level's boxes — narrows collision/LoS queries
    // to local candidates. Rebuilt with the world; identical results, fewer tests.
    let grid: SpatialGrid | null = null;
    // Nav graph for enemy long-range pathing — built once per level alongside the
    // grid, threaded into updateEnemies. Absent → bots use the old direct steering.
    let nav: NavGraph | null = null;
    // Resupply points (editor-placed stations + ammo/shield crates) for this level.
    let resupply: { kind: string; x: number; y: number; z: number; cd: number; tick: number }[] = [];
    // Enemies partitioned by squad, precomputed once per level (squad membership is
    // stable for a level) so the frame loop doesn't re-filter g.enemies every frame.
    let squadGroups: Enemy[][] = [];
    // Enemy actors: a 3D model Group for regular enemies, a billboard Sprite for
    // bosses. Indexed parallel to g.enemies.
    let sprites: THREE.Object3D[] = [];
    let barBg: THREE.Sprite[] = [];
    let barFill: THREE.Sprite[] = [];
    let barShield: THREE.Sprite[] = [];
    let prevEnemyXZ: { x: number; z: number }[] = [];
    let bossTexes: THREE.CanvasTexture[] = [];
    const tracers: { line: THREE.Line; geo: THREE.BufferGeometry; until: number }[] = [];
    // Launcher rounds — fat glowing RPG shells that streak muzzle→impact (cosmetic; the
    // hit is hitscan). Bigger + brighter than a bullet tracer so rockets read clearly.
    const shells: { mesh: THREE.Mesh; from: Vec3; to: Vec3; born: number; dur: number; rad: number }[] = [];
    const projectiles = new ProjectileSystem(); // boss/minion projectiles (P0; spawned from P1)
    const telegraphs = new TelegraphSystem(); // ground warning decals (P0; spawned from P1)
    const bossHazards: { x: number; z: number; r: number; until: number; dps: number; mesh: THREE.Mesh; pull?: number }[] = []; // acid puddles / pull vortices
    let recoilKick = 0; // current view recoil (radians), decays to 0
    let shakeMag = 0;   // 0..1 screen-shake trauma from nearby blasts (camera + HUD), decays
    let bossCamK = 0;   // 0..1 boss-reveal camera pan (ramps during the boss-opening cinematic)
    const grenades: Grenade[] = [];
    const smokes: SmokeFx[] = [];
    const flashes: Flash[] = [];
    const zones: Zone[] = [];

    // ── VOID-FIGHTER squadron (SD dogfight) ──────────────────────────────────────
    const disposeCraft = (o: THREE.Object3D) => o.traverse((n) => {
      const m = n as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else if (mat) mat.dispose();
    });
    const explodeAt = (x: number, y: number, z: number, color: number, r: number, now: number) => {
      if (!world) return;
      const fm = new THREE.Mesh(ballGeo, new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending }));
      fm.position.set(x, y, z);
      world.scene.add(fm);
      flashes.push({ mesh: fm, born: now, r });
    };
    const disposeFighters = () => {
      for (const f of fighters) { world?.scene.remove(f.model); disposeCraft(f.model); }
      fighters = [];
      fightersSpawned = 0;
      fighterWaveCd = 0;
    };
    const spawnFighterWave = (accent: number, count: number, diff: Difficulty) => {
      if (!world) return;
      const hp = Math.round(UNIT_HP * HP_MUL[diff]);       // tank-grade health
      const shield = Math.round(UNIT_SHIELD * HP_MUL[diff]); // + tank-grade shield
      for (let i = 0; i < count && fightersSpawned < FIGHTER_CAP; i++) {
        const model = buildFighter(tier, accent);
        const fx = sdFinal.x + (Math.random() - 0.5) * 14;
        const fy = Math.max(8, sdFinal.y - 4);
        const fz = sdFinal.z + (Math.random() - 0.5) * 8;
        model.position.set(fx, fy, fz);
        world.scene.add(model);
        fighters.push({ x: fx, y: fy, z: fz, vx: 0, vy: 0, vz: 0, health: hp, maxHealth: hp, shield, maxShield: shield, model, fireCd: 1.4 + Math.random() * 1.6, mode: 'ingress', modeT: 1 + Math.random(), goal: new THREE.Vector3(fx, fy, fz), bank: 0, hitFlash: 0, crashing: false, crashT: 0 });
        fightersSpawned++;
      }
    };
    const damageFighter = (f: Fighter, dmg: number, now: number) => {
      if (f.health <= 0 || f.crashing) return;
      let rem = dmg;
      if (f.shield > 0) { const a = Math.min(f.shield, rem); f.shield -= a; rem -= a; } // shield first
      f.health -= rem;
      f.hitFlash = 0.1;
      if (f.health <= 0) {
        // Shot down — don't just pop in the air: go into a death DIVE at the player and
        // detonate on contact (or crater the ground if it misses). Handled in updateFighters.
        f.crashing = true;
        f.crashT = 0;
        sfx.explosion();
        explodeAt(f.x, f.y, f.z, 0xffd27a, 2, now); // hit-flash spark
      }
    };
    const damageSd = (dmg: number) => {
      if (sdHp <= 0) return;
      let rem = dmg;
      if (sdShield > 0) { const a = Math.min(sdShield, rem); sdShield -= a; rem -= a; } // overshield first
      sdHp = Math.max(0, sdHp - rem);
      sdHitFlash = 0.08;
      if (sdHp <= 0) sdCrippled = true;
    };
    // Per-frame flight AI for the whole squadron: steer toward a mode goal, dodge buildings,
    // separate from each other, clamp altitude to the airspace between ground and the SD,
    // run strafing attacks that fire led bolts at the player. Dead craft self-remove.
    const updateFighters = (dt: number, now: number, pl: Player3, level: Level3D, accent: number, hurt: (n: number) => void) => {
      if (!fighters.length) return;
      const eyeY = pl.y + EYE;
      const CEIL = sdFinal.y - 4;   // stay below the Star Destroyer
      const FLOOR = 8;              // stay above the buildings
      const half = level.size / 2 - 4;
      for (let i = fighters.length - 1; i >= 0; i--) {
        const f = fighters[i];
        // SHOT DOWN → a death dive at the player; detonate on contact, on the ground, or after
        // a failsafe. If it reaches the player it blows up on them; otherwise it craters the ground.
        if (f.crashing) {
          f.crashT += dt;
          const dpx = pl.x - f.x, dpy = eyeY - f.y, dpz = pl.z - f.z;
          const dl = Math.hypot(dpx, dpy, dpz) || 1;
          f.vx += (dpx / dl) * 55 * dt;
          f.vz += (dpz / dl) * 55 * dt;
          f.vy += (dpy / dl) * 30 * dt - 26 * dt; // lunge at the player + gravity
          const sp = Math.hypot(f.vx, f.vy, f.vz);
          if (sp > 48) { const k = 48 / sp; f.vx *= k; f.vy *= k; f.vz *= k; }
          f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt;
          f.model.position.set(f.x, f.y, f.z);
          f.model.rotation.z += dt * 7; // tumble
          f.model.rotation.x += dt * 5;
          if (Math.random() < dt * 12) explodeAt(f.x, f.y, f.z, 0x552016, 1.4, now); // smoke trail
          const pdd = Math.hypot(pl.x - f.x, eyeY - f.y, pl.z - f.z);
          if (pdd < 2.6 || f.y <= 1.1 || f.crashT > 4) {
            explodeAt(f.x, Math.max(0.5, f.y), f.z, 0xffb14a, 5.5, now);
            sfx.explosion();
            addScar(f.x, f.z, 4);
            if (pdd < 6) hurt(Math.round(55 * (1 - pdd / 6))); // kamikaze blast
            const close = Math.max(0, 1 - pdd / 12);
            if (close > 0) { shakeMag = Math.min(1, Math.max(shakeMag, close)); snap.shakeAt = now; snap.shakeMag = shakeMag; }
            world?.scene.remove(f.model);
            disposeCraft(f.model);
            fighters.splice(i, 1);
          }
          continue;
        }
        if (f.health <= 0) { fighters.splice(i, 1); continue; }
        f.modeT -= dt;
        f.hitFlash = Math.max(0, f.hitFlash - dt);
        if (f.modeT <= 0) {
          if (f.mode === 'strafe') {
            // peel off after a run: loop out wide, up near the ship
            f.mode = Math.random() < 0.5 ? 'bank' : 'reposition';
            f.modeT = 1.6 + Math.random() * 1.4;
            const ang = Math.random() * Math.PI * 2;
            const R = 26 + Math.random() * 12;
            f.goal.set(pl.x + Math.cos(ang) * R, CEIL - Math.random() * 8, pl.z + Math.sin(ang) * R);
          } else {
            // commit to a strafing run THROUGH the fight, past the player
            f.mode = 'strafe';
            f.modeT = 2.2 + Math.random() * 1.3;
            const ang = Math.random() * Math.PI * 2;
            f.goal.set(pl.x + Math.cos(ang) * 9, eyeY + 2 + Math.random() * 7, pl.z + Math.sin(ang) * 9);
          }
        }
        // desired steering direction toward the goal
        let ax = f.goal.x - f.x, ay = f.goal.y - f.y, az = f.goal.z - f.z;
        const gl = Math.hypot(ax, ay, az) || 1;
        ax /= gl; ay /= gl; az /= gl;
        // building avoidance — probe forward along the current velocity
        const sp = Math.hypot(f.vx, f.vy, f.vz);
        if (sp > 0.5) {
          const dir: Vec3 = [f.vx / sp, f.vy / sp, f.vz / sp];
          const wb = rayWallBox([f.x, f.y, f.z], dir, level, 12);
          if (wb.box && wb.t < 10) {
            const urg = 1 - wb.t / 10;
            ay += urg * 1.6;              // climb over it
            ax += -dir[2] * urg * 1.2;    // veer perpendicular
            az += dir[0] * urg * 1.2;
          }
        }
        // separation from squadmates
        for (const o of fighters) {
          if (o === f || o.health <= 0) continue;
          const dx = f.x - o.x, dy = f.y - o.y, dz = f.z - o.z;
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < 49 && d2 > 0.01) { const inv = (1 - Math.sqrt(d2) / 7) * 0.7; ax += dx * inv; ay += dy * inv; az += dz * inv; }
        }
        // integrate
        const maxSp = f.mode === 'strafe' ? 32 : f.mode === 'ingress' ? 24 : 17;
        const accelR = 28;
        f.vx += ax * accelR * dt; f.vy += ay * accelR * dt; f.vz += az * accelR * dt;
        const s2 = Math.hypot(f.vx, f.vy, f.vz);
        if (s2 > maxSp) { const k = maxSp / s2; f.vx *= k; f.vy *= k; f.vz *= k; }
        f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt;
        if (f.y < FLOOR) { f.y = FLOOR; if (f.vy < 0) f.vy = 0; }
        if (f.y > CEIL) { f.y = CEIL; if (f.vy > 0) f.vy = 0; }
        if (f.x < -half) { f.x = -half; f.vx = Math.abs(f.vx); } else if (f.x > half) { f.x = half; f.vx = -Math.abs(f.vx); }
        if (f.z < -half) { f.z = -half; f.vz = Math.abs(f.vz); } else if (f.z > half) { f.z = half; f.vz = -Math.abs(f.vz); }
        // orient: nose (local -Z) faces the flight direction, roll into the turn
        f.model.position.set(f.x, f.y, f.z);
        f.model.lookAt(f.x - f.vx, f.y - f.vy, f.z - f.vz);
        if (sp > 1) {
          const rgtx = -f.vz / sp, rgtz = f.vx / sp;
          const lat = ax * rgtx + az * rgtz;
          const targetBank = Math.max(-0.8, Math.min(0.8, -lat * 0.9));
          f.bank += (targetBank - f.bank) * Math.min(1, dt * 4);
        }
        f.model.rotateZ(f.bank);
        animateFighter(f.model, now);
        // fire led bolts at the player when it has a clear line
        f.fireCd -= dt;
        if (f.fireCd <= 0 && world) {
          const dpx = pl.x - f.x, dpy = eyeY - f.y, dpz = pl.z - f.z;
          const dd = Math.hypot(dpx, dpy, dpz);
          if (dd < 95 && !segBlocked([f.x, f.y, f.z], [pl.x, eyeY, pl.z], level, grid ?? undefined)) {
            f.fireCd = 1.3 + Math.random() * 0.9;
            const dl = dd || 1;
            const dir: Vec3 = [dpx / dl, dpy / dl, dpz / dl];
            projectiles.spawn({ kind: 'bolt', scene: world.scene, x: f.x, y: f.y, z: f.z, dir, speed: 62, dmg: 9, color: accent, splash: 0, gravity: 0, radius: 0.28 });
          } else {
            f.fireCd = 0.4;
          }
        }
      }
    };

    // Player pickups: enemies drop these; auto-collected on proximity.
    const drops: { x: number; y: number; z: number; kind: 'ammo' | 'shield'; mesh: THREE.Object3D; born: number }[] = [];
    // Placed pickups (from the arena's ammo/shield/health crates): dynamic symbols that
    // RELOCATE to a new open spot after being collected.
    const pickups: { kind: 'ammo' | 'shield' | 'health'; x: number; z: number; mesh: THREE.Group; respawnT: number; born: number }[] = [];
    let lastSnap = 0;
    const snap: FpsSnapshot = {
      health: 100, maxHp: 100, armor: 0, maxArmor: 100, pickupAt: 0, weapon: '', family: '', mag: 0, reserve: 0, reloading: false, reloadProgress: 0, ads: false, scoped: false,
      slots: [], throwName: '', throwCount: 0, bosses: [], enemiesLeft: 0, status: 'playing', kills: 0, headshots: 0, shotsFired: 0, shotsHit: 0, dmgDealt: 0, hitAt: 0, headshotAt: 0, fireAt: 0, hurtAt: 0, flashAt: 0, stunAt: 0, fogAt: 0, grappleReady: false, radar: [], shakeAt: 0, shakeMag: 0,
    };
    const prevPos = { x: 0, z: 0 };

    const clearMesh = (m: THREE.Mesh) => {
      world?.scene.remove(m);
      (m.material as THREE.Material).dispose();
    };
    // Persistent ground scars (artillery impacts) — a capped ring buffer of flat scorch
    // circles; the oldest recycles once the cap is hit. Cheap, no textures.
    const scars: THREE.Mesh[] = [];
    const addScar = (x: number, z: number, r: number) => {
      if (!world) return;
      if (scars.length >= 24) {
        const old = scars.shift()!;
        world.scene.remove(old);
        old.geometry.dispose();
        (old.material as THREE.Material).dispose();
      }
      const rad = Math.max(1.2, r) * (0.8 + Math.random() * 0.5);
      const m = new THREE.Mesh(new THREE.CircleGeometry(rad, 14), new THREE.MeshBasicMaterial({ color: 0x120b06, transparent: true, opacity: 0.7, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }));
      m.rotation.x = -Math.PI / 2; // lay flat on the ground
      m.position.set(x, 0.05, z);
      world.scene.add(m);
      scars.push(m);
    };
    // Remove a Group (pickups/drops) — dispose its per-instance geometries; the shared
    // pkMat materials live for the whole mount.
    const clearGroup = (o: THREE.Object3D) => {
      world?.scene.remove(o);
      disposeObj(o);
    };
    const disposeExtras = () => {
      for (const s of sprites) {
        world?.scene.remove(s);
        if (s instanceof THREE.Sprite) (s.material as THREE.Material).dispose();
        else disposeEnemyModel(s); // a 3D model Group
      }
      for (const s of [...barBg, ...barFill, ...barShield]) {
        world?.scene.remove(s);
        (s.material as THREE.Material).dispose();
      }
      sprites = [];
      barBg = [];
      barFill = [];
      barShield = [];
      for (const t of bossTexes) t.dispose();
      bossTexes = [];
      for (const t of tracers) {
        world?.scene.remove(t.line);
        t.geo.dispose();
        (t.line.material as THREE.Material).dispose();
      }
      tracers.length = 0;
      for (const g of grenades) clearMesh(g.mesh);
      for (const s of smokes) clearMesh(s.mesh);
      for (const f of flashes) clearMesh(f.mesh);
      for (const s of shells) clearMesh(s.mesh);
      shells.length = 0;
      for (const z of zones) clearMesh(z.mesh);
      for (const d of drops) clearGroup(d.mesh);
      for (const pk of pickups) clearGroup(pk.mesh);
      grenades.length = 0;
      smokes.length = 0;
      flashes.length = 0;
      for (const m of scars) { world?.scene.remove(m); m.geometry.dispose(); (m.material as THREE.Material).dispose(); }
      scars.length = 0;
      zones.length = 0;
      drops.length = 0;
      pickups.length = 0;
      projectiles.clear();
      telegraphs.clear();
      throwFx?.dispose();
      throwFx = null;
      for (const hz of bossHazards) clearMesh(hz.mesh);
      bossHazards.length = 0;
    };

    const buildFor = (g: FpsGameState) => {
      disposeExtras();
      if (sd) disposeSd(sd);
      sd = null;
      if (blackHole) { disposeSd(blackHole); blackHole = null; bhRingA = null; bhRingB = null; }
      disposeFighters();
      sdPhase = 'idle';
      sdT = 0;
      sdCamPan = 0;
      sdFireCd = 0;
      sdDone = false;
      sdHitFlash = 0;
      sdCrippled = false;
      sdMegaCharge = 0;
      world?.dispose();
      world = buildWorld(g.level, tier);
      throwFx = new ThrowableFx(world.scene, tier); // handcrafted throwable VFX for this level
      // STAR DESTROYER placement — build the level's capital ship (if any) but keep it HIDDEN
      // during the fight; it emerges from the rift when the level is cleared. Compute where the
      // rift opens (birth) and where the ship settles (final): obelisk hulls descend to STAND
      // on an open ground spot; other hulls loom high overhead, well clear of the buildings.
      if (g.capital) {
        sd = buildCapital(g.capital, tier);
        const S = g.level.size;
        sdObelisk = g.capital.hull === 'obelisk';
        sd.rotation.y = sdObelisk ? 0 : 0.35;
        sd.scale.setScalar(sdSize.to);
        // Capital-scale integrity: 30× a ground unit's HP hull + a 20× overshield (per Gabe's
        // spec) + a bounding radius for shoot hit-tests, measured at loom scale.
        const hm = HP_MUL[g.difficulty];
        sdMax = Math.round(30 * UNIT_HP * hm);
        sdHp = sdMax;
        sdShieldMax = Math.round(20 * UNIT_SHIELD * hm);
        sdShield = sdShieldMax;
        sdRadius = Math.max(8, new THREE.Box3().setFromObject(sd).getBoundingSphere(new THREE.Sphere()).radius * 0.62);
        if (sdObelisk) {
          // Stand on an open corner far from the player's spawn; sit its base on the ground.
          const gx = S * 0.34, gz = -S * 0.34;
          sd.position.set(gx, S * 0.5, gz);
          const box = new THREE.Box3().setFromObject(sd); // world bounds at this scale
          const baseGap = box.min.y - sd.position.y; // ship-origin → bottom offset (world units)
          sdFinal.set(gx, 0.2 - baseGap, gz); // drop so the base rests just above the ground
          sdBirth.set(gx, S * 1.7, gz); // rift high above the landing spot; descends to land
        } else {
          sdFinal.set(0, S * 1.4, -S * 0.55); // loom high overhead (clears buildings)
          sdBirth.set(0, S * 1.75, -S * 1.1); // rift up and back; flies in
        }
        sd.position.copy(sdBirth);
        sd.scale.setScalar(sdSize.from);
        sd.visible = false;
        world.scene.add(sd);
      }
      // (Re)build the spatial grid for this level's boxes.
      grid = SpatialGrid.build(g.level.boxes);
      // (Re)build the enemy nav graph for this level (grid-accelerated).
      nav = buildNavGraph(g.level, grid);
      // Resupply STATIONS (fixed structures; continuous top-up).
      resupply = (g.level.modules ?? []).filter((m) => m.kind === 'station').map((m) => ({ kind: m.kind, x: m.cx, y: 0, z: m.cz, cd: 0, tick: 0 }));
      // Placed ammo/shield/health crates → dynamic relocating pickup symbols.
      for (const m of g.level.modules ?? []) {
        const kind = m.kind === 'ammocrate' ? 'ammo' : m.kind === 'shieldcrate' ? 'shield' : m.kind === 'healthcrate' ? 'health' : null;
        if (!kind) continue;
        const mesh = mkPickup(kind);
        mesh.position.set(m.cx, 1.0, m.cz);
        world!.scene.add(mesh);
        pickups.push({ kind, x: m.cx, z: m.cz, mesh, respawnT: 0, born: performance.now() + Math.random() * 1200 });
      }
      // Partition enemies by squad ONCE per level (membership is stable) so the frame
      // loop reuses these arrays instead of re-filtering g.enemies every frame.
      squadGroups = g.squads.map((_, s) => g.enemies.filter((e) => e.squadId === s));
      // Build the composer once; afterwards just repoint the RenderPass at the
      // new scene (do NOT recreate the renderer or the whole composer).
      if (!composer) {
        composer = makeComposer(renderer, world.scene, camera, tier, RW, RH);
      } else {
        composer.renderPass.mainScene = world.scene;
      }
      // Repoint the enemy-outline effect at the new scene (its internal depth/mask
      // passes hold their own scene ref, so a level rebuild must update it).
      if (composer.outline) composer.outline.mainScene = world.scene;
      // Build the viewmodel once; (re)load the active gun for this level. Clear any prior
      // OVERDRIVE red tint (a boss buff never carries into the next level).
      if (!viewmodel) viewmodel = new Viewmodel(tier, RW / RH);
      viewmodel.setEmpowered(false);
      vmEmpowered = false;
      viewmodel.setGun(g.guns[g.active].id, g.gunParts?.[g.active]);
      resize(); // size the new composer/viewmodel to the live canvas
      const mk = (canvas2: HTMLCanvasElement) => {
        const t = new THREE.CanvasTexture(canvas2);
        t.magFilter = THREE.NearestFilter;
        t.minFilter = THREE.NearestFilter;
        return t;
      };
      prevEnemyXZ = g.enemies.map((e) => ({ x: e.x, z: e.z }));
      const bossCache: Partial<Record<string, THREE.CanvasTexture>> = {};
      sprites = g.enemies.map((e) => {
        if (e.boss) {
          const bd = BOSSES[e.boss];
          // 3D boss model where one exists (Xenomorph); otherwise the legacy sprite.
          const m3d = buildBossModel(e.boss, tier);
          if (m3d) {
            m3d.scale.setScalar(bd.scale * 0.62 * (e.enh ? 1.3 : 1)); // enhanced gauntlet = bigger
            world!.scene.add(m3d);
            return m3d;
          }
          if (!bossCache[e.boss]) {
            // Sprite fallback is only reached for bosses WITHOUT a 3D model; all current
            // bosses have models, so this never runs for the newer civilizations.
            const t = mk(bossTex(e.boss as 'xeno' | 'warrior' | 'octopus'));
            bossCache[e.boss] = t;
            bossTexes.push(t);
          }
          const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: bossCache[e.boss]!, transparent: true }));
          s.scale.set(1.5 * bd.scale, 2.0 * bd.scale, 1);
          world!.scene.add(s);
          return s;
        }
        if (e.destructible) {
          const m = buildDestructibleModel(e.destructible, tier);
          world!.scene.add(m);
          return m;
        }
        if (e.minion) {
          const m = buildMinionModel(e.minion, tier);
          m.scale.setScalar(MINIONS[e.minion].scale);
          world!.scene.add(m);
          return m;
        }
        // Regular enemies are 3D models, one per doctrine class.
        const m = buildEnemyModel(e.cls, tier);
        e.bodyH = ((m.userData.hipY as number) ?? 0.9) / 0.9; // height factor for hit-zones + bar
        world!.scene.add(m);
        return m;
      });
      barBg = g.enemies.map(() => {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x0a0a0a, transparent: true, depthWrite: false }));
        s.scale.set(1.5, 0.22, 1);
        s.renderOrder = 10;
        s.visible = false;
        world!.scene.add(s);
        return s;
      });
      barFill = g.enemies.map(() => {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xaef5c8, transparent: true, depthWrite: false }));
        s.scale.set(1.4, 0.13, 1);
        s.renderOrder = 11;
        s.visible = false;
        world!.scene.add(s);
        return s;
      });
      // Thin shield bar sitting just above the health bar (cyan).
      barShield = g.enemies.map(() => {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x7fdfff, transparent: true, depthWrite: false }));
        s.scale.set(1.4, 0.08, 1);
        s.renderOrder = 12;
        s.visible = false;
        world!.scene.add(s);
        return s;
      });
      builtFor = g.level;
    };

    const addTracer = (from: Vec3, to: Vec3, color: number) => {
      if (!world) return;
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(from[0], from[1], from[2]),
        new THREE.Vector3(to[0], to[1], to[2]),
      ]);
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending }));
      world.scene.add(line);
      tracers.push({ line, geo, until: performance.now() + 90 });
    };

    // Destructible structures: gunfire chips level boxes (HP scales with volume,
    // lazy-init on first hit). Each hit sparks debris; when a box is destroyed it's
    // hidden + flagged dead (collision / LoS / shots skip it) with a rubble burst.
    const boxMaxHp = (b: Box) => Math.min(1600, 130 + b.sx * b.sy * b.sz * 22);
    const damageBox = (b: Box, dmg: number, hx: number, hy: number, hz: number, tNow: number) => {
      if (b.dead || b.indestructible) return; // arena borders block shots but never break
      if (b.hp == null) b.hp = b.maxHp = boxMaxHp(b);
      b.hp -= dmg;
      if (world) {
        const chip = new THREE.Mesh(ballGeo, new THREE.MeshBasicMaterial({ color: 0xd8c8a0, transparent: true }));
        chip.position.set(hx, hy, hz);
        world.scene.add(chip);
        flashes.push({ mesh: chip, born: tNow, r: 0.5 });
      }
      if (b.hp <= 0) {
        b.dead = true;
        world?.hideBox(b);
        if (world) {
          const boom = new THREE.Mesh(ballGeo, new THREE.MeshBasicMaterial({ color: 0xbfae8a, transparent: true }));
          boom.position.set(b.x, b.y, b.z);
          world.scene.add(boom);
          flashes.push({ mesh: boom, born: tNow, r: Math.max(1.6, (b.sx + b.sz) * 0.5) });
        }
        sfx.explosion();
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'r') reloadReq.current = true;
      if (k === 'f') grappleReq.current = true;
      if (k === 'g') throwReq.current = true;
      if ((k === 'c' || k === 'control') && !e.repeat) crouchHeld.current = !crouchHeld.current; // toggle
      if (k === '1' || k === '2' || k === '3') switchReq.current = Number(k) - 1;
      if (k === 'w' || k === 'a' || k === 's' || k === 'd' || k === ' ' || k === 'shift' || k.startsWith('arrow')) {
        if (k.startsWith('arrow') || k === ' ') e.preventDefault();
        keys.current.add(k);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const onClick = () => {
      if (!isTouch) canvas.requestPointerLock?.();
    };
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === canvas) {
        lookDX.current += e.movementX;
        lookDY.current += e.movementY;
      }
    };
    const lockedNow = () => document.pointerLockElement === canvas;
    const onMouseDown = (e: MouseEvent) => {
      if (!lockedNow()) return;
      if (e.button === 0) fireHeld.current = true;
      // Right-click is a TOGGLE through this weapon's zoom steps (snipers 3, rest 1).
      if (e.button === 2) {
        const g = gameRef.current;
        const gun = g?.guns[g.active];
        const steps = gun ? maxZoomFor(gun) + 1 : 2;
        zoomLevel.current = (zoomLevel.current + 1) % steps;
      }
    };
    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) fireHeld.current = false;
    };
    const onWheel = (e: WheelEvent) => {
      if (lockedNow()) switchReq.current = e.deltaY > 0 ? 'next' : 'prev';
    };
    const onCtx = (e: Event) => e.preventDefault();
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('contextmenu', onCtx);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('wheel', onWheel, { passive: true });

    // Keep the render buffer + camera matched to the live canvas size (dynamic
    // viewport, address-bar collapse, orientation change, safe-area shifts).
    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas.parentElement ?? canvas); // observe the host, not the canvas we restyle
    const onViewport = () => resize();
    window.addEventListener('orientationchange', onViewport);
    window.addEventListener('resize', onViewport);
    window.visualViewport?.addEventListener('resize', onViewport);
    resize();

    // Resume audio after a tab switch / phone-call interruption (mobile browsers
    // suspend the AudioContext; this re-arms it once we're visible again).
    const onVisible = () => {
      if (!document.hidden) sfx.ensure();
    };
    document.addEventListener('visibilitychange', onVisible);

    let raf = 0;
    let prev = performance.now();
    let disposed = false;
    const frame = (now: number) => {
      if (disposed) return;
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      const g = gameRef.current;
      if (g && active) {
        if (g.level !== builtFor) {
          buildFor(g);
          prevPos.x = g.player.x;
          prevPos.z = g.player.z;
        }
        // STAR DESTROYER — idle animation (turrets/reactor/engines) + the post-clear arrival
        // cinematic: rift emergence → grace → bombardment → depart. The win waits on it.
        if (sd && world) {
          animateCapital(sd, dt, now);
          if (bhRingA) bhRingA.rotation.z += dt * 1.4;
          if (bhRingB) bhRingB.rotation.z -= dt * 1.1;
          const accent = g.capital?.accent ?? 0xff7a3c;
          const closeRift = () => {
            if (blackHole) { world!.scene.remove(blackHole); disposeSd(blackHole); blackHole = null; bhRingA = null; bhRingB = null; }
          };
          if (sdPhase === 'arriving') {
            sdT += dt;
            const t = Math.min(1, sdT / SD_ARRIVE);
            const e = t * t * (3 - 2 * t);
            sd.position.lerpVectors(sdBirth, sdFinal, e);
            sd.scale.setScalar(sdSize.from + (sdSize.to - sdSize.from) * e);
            if (blackHole) {
              const open = t < 0.25 ? t / 0.25 : t > 0.8 ? Math.max(0, (1 - t) / 0.2) : 1; // open, hold, collapse
              blackHole.scale.setScalar(0.1 + open * sdSize.to * 3.4);
            }
            sdCamPan = Math.min(1, sdT / 0.6); // slave the camera onto the emerging ship
            if (t >= 1) { sdPhase = 'grace'; sdT = 0; closeRift(); }
          } else if (sdPhase === 'grace') {
            sdT += dt;
            sdCamPan = Math.max(0, 1 - sdT / 1); // hand the view back so you can take cover
            if (sdT >= SD_GRACE) { sdPhase = 'combat'; sdT = 0; sdMgCd = 0.4; sdFireCd = 1; sdMegaCd = 4; sdMgBurst = 5; spawnFighterWave(accent, FIGHTER_WAVE, g.difficulty); } // wave 1 launches
          } else if (sdPhase === 'combat') {
            sdT += dt;
            sdCamPan = 0;
            if (!sdCrippled) {
              // THREE-CANNON BOMBARDMENT — a machine gun, a purple splash cannon, and a slow
              // telegraphed mega-cannon, each firing from the ship at the player's position.
              const pl = g.player;
              const dm = DMG_MUL[g.difficulty];
              const scene = world.scene;
              const fireShot = (kind: string, speed: number, dmg: number, splash: number, color: number, radius: number, spread: number) => {
                const sx = sdFinal.x + (Math.random() - 0.5) * spread;
                const sy = sdFinal.y - 3;
                const sz = sdFinal.z + (Math.random() - 0.5) * spread * 0.6;
                const dx = pl.x - sx, dy = pl.y + EYE - sy, dz = pl.z - sz;
                const dl = Math.hypot(dx, dy, dz) || 1;
                const dir: Vec3 = [dx / dl, dy / dl, dz / dl];
                projectiles.spawn({ kind, scene, x: sx, y: sy, z: sz, dir, speed, dmg: Math.round(dmg * dm), color, splash, gravity: 0, radius });
              };
              // 1) MACHINE GUN — rapid bursts of fast bolts (2× artillery)
              sdMgCd -= dt;
              if (sdMgCd <= 0) {
                fireShot('sdmg', 92, ARTY_DMG * 2, 1.4, 0xffcf6a, 0.26, 3);
                sdMgBurst--;
                if (sdMgBurst > 0) sdMgCd = 0.09;
                else { sdMgBurst = 5; sdMgCd = 1.5 + Math.random() * 0.6; }
              }
              // 2) PURPLE CANNON — splash rockets (3× artillery)
              sdFireCd -= dt;
              if (sdFireCd <= 0) { sdFireCd = 1.1 + Math.random() * 0.5; fireShot('sdrocket', 46, ARTY_DMG * 3, 4.5, accent, 0.5, 12); }
              // 3) MEGA CANNON — slow, telegraphed (charging glow), huge blast (4× artillery)
              sdMegaCd -= dt;
              if (sdMegaCd <= 0) {
                sdMegaCharge = Math.min(1, sdMegaCharge + dt); // ~1s charge tell
                if (sdMegaCharge > 0 && Math.random() < dt * 9) explodeAt(sdFinal.x, sdFinal.y - 3, sdFinal.z, accent, 1 + sdMegaCharge * 2.6, now);
                if (sdMegaCharge >= 1) {
                  fireShot('sdmega', 34, ARTY_DMG * 4, 9, accent, 1.1, 5);
                  sfx.explosion();
                  sdMegaCharge = 0;
                  sdMegaCd = 5.5 + Math.random() * 1.5;
                }
              } else if (sdMegaCharge > 0) {
                sdMegaCharge = Math.max(0, sdMegaCharge - dt * 2);
              }
            } else {
              // hull breached: rolling secondary detonations rake the ship
              sdFireCd -= dt;
              if (sdFireCd <= 0) {
                sdFireCd = 0.25 + Math.random() * 0.35;
                explodeAt(sdFinal.x + (Math.random() - 0.5) * sdRadius, sdFinal.y + (Math.random() - 0.5) * sdRadius * 0.5, sdFinal.z + (Math.random() - 0.5) * sdRadius, 0xffb14a, 2 + Math.random() * 2, now);
                sfx.explosion();
              }
            }
            // deploy the next wave of 3 once the current one is wiped out (cap 6)
            fighterWaveCd -= dt;
            if (fighters.length === 0 && fightersSpawned < FIGHTER_CAP && fighterWaveCd <= 0) {
              spawnFighterWave(accent, FIGHTER_WAVE, g.difficulty);
              fighterWaveCd = 1.5;
            }
            // WIN GATE: every fighter destroyed AND the hull dead → death cinematic
            if (fightersSpawned >= FIGHTER_CAP && fighters.length === 0 && sdHp <= 0) {
              sdPhase = 'depart'; sdT = 0;
              blackHole = makeBlackHole(accent);
              blackHole.position.copy(sdFinal);
              blackHole.scale.setScalar(0.1);
              world.scene.add(blackHole);
              explodeAt(sdFinal.x, sdFinal.y, sdFinal.z, 0xffd27a, sdRadius * 1.4, now); // the killing blast
              sfx.explosion();
            }
          } else if (sdPhase === 'depart') {
            // the crippled ship lists, sinks, and implodes into a reopening rift where it died
            sdT += dt;
            const t = Math.min(1, sdT / SD_DEPART);
            sd.rotation.z = t * 0.5;
            sd.position.set(sdFinal.x, sdFinal.y - t * 6, sdFinal.z);
            sd.scale.setScalar(sdSize.to * (1 - t * 0.9));
            if (blackHole) {
              const open = t < 0.3 ? t / 0.3 : Math.max(0, (1 - t) / 0.3);
              blackHole.scale.setScalar(0.1 + open * sdSize.to * 3.4);
            }
            if (Math.random() < dt * 6) explodeAt(sdFinal.x + (Math.random() - 0.5) * sdRadius, sdFinal.y + (Math.random() - 0.5) * sdRadius, sdFinal.z + (Math.random() - 0.5) * sdRadius, 0xffb14a, 2 + Math.random() * 2, now);
            if (t >= 1) { closeRift(); sd.visible = false; sdDone = true; }
          }
        }
        const p = g.player;
        const frozen = !!g.cineLock; // boss-opening cinematic: freeze input, enemy AI, the clock
        // Loud events (gunfire, explosions, alerting throwables) cue only squads
        // with a living member within earshot — distant squads stay unaware, so
        // each squad keeps its own independent picture of where the player is.
        const cueSquads = (ex: number, ez: number, earshot = 70) => {
          for (let s = 0; s < g.squads.length; s++) {
            const sq = g.squads[s];
            for (const e of g.enemies) {
              if (e.squadId !== s || e.health <= 0 || e.boss) continue;
              if (Math.hypot(e.x - ex, e.z - ez) < earshot) {
                sq.lastKnown = { x: ex, z: ez };
                sq.t = now;
                break;
              }
            }
          }
        };
        // Player damage → soak the overshield first, then health. God-mode ignores it.
        const hurtPlayer = (amount: number) => {
          if (amount <= 0 || g.god) return;
          g.lastHitT = now; // pauses the overshield recharge for 2s
          if (p.armor > 0) {
            const soak = Math.min(p.armor, amount);
            p.armor -= soak;
            amount -= soak;
          }
          if (amount > 0) p.health = Math.max(0, p.health - amount);
          snap.hurtAt = now;
          if (p.health <= 0) {
            if (g.revive) {
              // Nano-Revive: eat the lethal hit, restore to 40% + a shield, consume it.
              g.revive = false;
              p.health = Math.max(1, Math.round(g.maxHp * 0.4));
              p.armor = Math.min(p.maxArmor, 40);
              snap.flashAt = now; // a bright pulse marks the save
            } else {
              g.status = 'lost';
            }
          }
        };
        // Star Destroyer fighter squadron: free-flight AI + shot-down death dives (self-cleans).
        if (sd && fighters.length) updateFighters(dt, now, p, g.level, g.capital?.accent ?? 0xff7a3c, hurtPlayer);
        // An enemy died → tally the kill and, ~1 in 3 kills, drop ammo or overshield
        // for the player (bosses / deployables never drop). Big fights stay supplied.
        const onEnemyKilled = (e: Enemy) => {
          g.kills++;
          if (e.boss || e.destructible) return;
          if (Math.random() > 0.34) return;
          const kind: 'ammo' | 'shield' = Math.random() < 0.55 ? 'ammo' : 'shield';
          const mesh = mkPickup(kind);
          mesh.position.set(e.x, e.y + 0.6, e.z);
          world?.scene.add(mesh);
          drops.push({ x: e.x, y: e.y, z: e.z, kind, mesh, born: now });
        };
        const ls = LOOK_SENS * sens.current;
        // Touch AIM ASSIST — a subtle slowdown + magnetism when a target is near the
        // reticle, and only while actively aiming (never drifts when idle).
        let assist: { ex: number; ey: number; ez: number; el: number; dot: number } | null = null;
        if (isTouch && aimAssistOn.current && g.status === 'playing') {
          const cpa = Math.cos(p.pitch);
          const afx = -cpa * Math.sin(p.yaw);
          const afy = Math.sin(p.pitch);
          const afz = -cpa * Math.cos(p.yaw);
          const aeye: Vec3 = [p.x, p.y + EYE, p.z];
          let bestDot = 0.95;
          for (const e of g.enemies) {
            if (e.health <= 0) continue;
            const ex = e.x - p.x;
            const ey = e.y + 1.1 - (p.y + EYE);
            const ez = e.z - p.z;
            const el = Math.hypot(ex, ey, ez) || 1;
            const dot = (ex / el) * afx + (ey / el) * afy + (ez / el) * afz;
            if (dot > bestDot && !segBlocked(aeye, [e.x, e.y + 1.1, e.z], g.level, grid ?? undefined)) {
              bestDot = dot;
              assist = { ex, ey, ez, el, dot };
            }
          }
        }
        const hadLook = lookDX.current !== 0 || lookDY.current !== 0;
        const aimSlow = assist ? 0.62 : 1; // ease the turn near a target
        if (frozen) { lookDX.current = 0; lookDY.current = 0; } // camera is scripted during the cinematic
        if (!frozen && lookDX.current !== 0) {
          p.yaw -= lookDX.current * ls * aimSlow;
          lookDX.current = 0;
        }
        if (!frozen && lookDY.current !== 0) {
          const iy = invertY.current ? -1 : 1;
          p.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, p.pitch - lookDY.current * ls * aimSlow * iy));
          lookDY.current = 0;
        }
        if (!frozen && assist && hadLook) {
          const pull = 0.05 * Math.min(1, (assist.dot - 0.95) / 0.05); // gentle, stronger nearer centre
          let dYaw = Math.atan2(-assist.ex, -assist.ez) - p.yaw;
          dYaw = Math.atan2(Math.sin(dYaw), Math.cos(dYaw));
          p.yaw += dYaw * pull;
          const tPitch = Math.asin(Math.max(-1, Math.min(1, assist.ey / assist.el)));
          p.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, p.pitch + (tPitch - p.pitch) * pull * 0.7));
        }
        let fwd = touchMove.current.fwd;
        let strafe = touchMove.current.strafe;
        if (keys.current.has('w') || keys.current.has('arrowup')) fwd += 1;
        if (keys.current.has('s') || keys.current.has('arrowdown')) fwd -= 1;
        if (keys.current.has('d') || keys.current.has('arrowright')) strafe += 1;
        if (keys.current.has('a') || keys.current.has('arrowleft')) strafe -= 1;
        if (frozen) { fwd = 0; strafe = 0; } // no movement during the cinematic

        if (g.status === 'playing') {
          if (!frozen) g.elapsed += dt; // level clock for the start-of-match combat lock + boss grace
          if (switchReq.current !== null) {
            const n = g.guns.length;
            const req = switchReq.current;
            g.active = req === 'next' ? (g.active + 1) % n : req === 'prev' ? (g.active - 1 + n) % n : Math.min(n - 1, Math.max(0, req));
            switchReq.current = null;
            g.reloading = 0;
            g.fireCd = 0.22;
            zoomLevel.current = 0; // swapping weapons drops you back to the hip
            viewmodel?.setGun(g.guns[g.active].id, g.gunParts?.[g.active]);
            sfx.swap();
          }
          const gun = g.guns[g.active];
          if (prevGunId.current !== gun.id) {
            prevGunId.current = gun.id;
            burstLeft.current = 0;
            chargeT.current = 0;
            heat.current = 0;
            overheat.current = 0;
          }

          g.ads = zoomLevel.current > 0;
          const wantFov =
            zoomLevel.current >= 3
              ? Math.max(9, gun.adsFov * 0.42)
              : zoomLevel.current === 2
                ? Math.max(13, gun.adsFov * 0.64)
                : zoomLevel.current === 1
                  ? gun.adsFov
                  : gun.hipFov;
          if (Math.abs(camera.fov - wantFov) > 0.1) {
            camera.fov = wantFov;
            camera.updateProjectionMatrix();
          }

          const jumpNow = keys.current.has(' ') || jumpReq.current;
          jumpReq.current = false;
          const crouching = crouchHeld.current && p.onGround;
          // SPRINT: hold Shift / the touch button to run faster while moving, draining
          // stamina; it recharges when not sprinting and locks out until recovered at 0.
          const wantSprint = (sprintHeld.current || keys.current.has('shift')) && !crouching && (Math.abs(fwd) > 0.1 || Math.abs(strafe) > 0.1);
          const sprinting = wantSprint && !sprintLock.current && stamina.current > 0;
          if (sprinting) {
            stamina.current = Math.max(0, stamina.current - dt / 3.5); // ~3.5s of sprint
            if (stamina.current <= 0) sprintLock.current = true;
          } else {
            stamina.current = Math.min(1, stamina.current + dt / 5); // ~5s to refill
            if (sprintLock.current && stamina.current > 0.3) sprintLock.current = false;
          }
          stepPlayer(p, g.level, { fwd, strafe, jump: jumpNow, crouch: crouching, sprint: sprinting }, dt, grid ?? undefined);
          const eyeH = EYE - (crouching ? 0.55 : 0); // crouch lowers the camera/shot origin
          const pvx = (p.x - prevPos.x) / Math.max(dt, 0.001);
          const pvz = (p.z - prevPos.z) / Math.max(dt, 0.001);
          prevPos.x = p.x;
          prevPos.z = p.z;

          const cp = Math.cos(p.pitch);
          const fx = -cp * Math.sin(p.yaw);
          const fy = Math.sin(p.pitch);
          const fz = -cp * Math.cos(p.yaw);
          const eye: Vec3 = [p.x, p.y + eyeH, p.z];
          const dir: Vec3 = [fx, fy, fz];

          // GRAPPLE: aim at a rooftop grapple point that's NEAR (≤ range) and
          // VISIBLE → propel the player up onto it. Fair — no cross-arena swings.
          {
            let ready = false;
            const pts = g.level.grapplePoints;
            if (pts && pts.length && !p.grapple) {
              let best: { x: number; y: number; z: number } | null = null;
              let bestDot = 0.955; // ~17° aim cone
              for (const gp of pts) {
                // Aim toward the floating ring marker (above the roof edge) so the
                // LoS clears the railing and reads from the ground.
                const dx = gp.x - p.x;
                const dy = gp.y + 1.6 - (p.y + EYE);
                const dz = gp.z - p.z;
                const d = Math.hypot(dx, dy, dz);
                if (d > 24 || d < 3) continue; // near the building only
                const dot = (dx * fx + dy * fy + dz * fz) / d;
                if (dot < bestDot) continue;
                if (segBlocked(eye, [gp.x, gp.y + 1.5, gp.z], g.level, grid ?? undefined)) continue;
                bestDot = dot;
                best = gp;
              }
              if (best) {
                ready = true;
                if (grappleReq.current) startGrapple(p, best.x, best.y, best.z);
              }
            }
            snap.grappleReady = ready;
          }
          grappleReq.current = false;

          // Throw a grenade/smoke
          if (throwReq.current) {
            throwReq.current = false;
            if (g.throwCount > 0 && world) {
              g.throwCount--;
              const sp = 19;
              const mesh = new THREE.Mesh(ballGeo, new THREE.MeshBasicMaterial({ color: g.throwable.color }));
              mesh.scale.setScalar(0.18);
              mesh.position.set(eye[0], eye[1], eye[2]);
              world.scene.add(mesh);
              grenades.push({ x: eye[0], y: eye[1], z: eye[2], vx: fx * sp, vy: fy * sp + 4.5, vz: fz * sp, fuse: g.throwable.fuse, mesh });
              sfx.playThrowable(g.throwable.id, 'throw');
            }
          }

          // Reload
          if (g.reloading > 0) {
            g.reloading -= dt;
            if (g.reloading <= 0) {
              const need = gun.mag - g.mags[g.active];
              const take = Math.min(need, g.reserves[g.active]);
              g.mags[g.active] += take;
              g.reserves[g.active] -= take;
            }
          }
          if (reloadReq.current) {
            reloadReq.current = false;
            if (!gun.heat && g.reloading <= 0 && g.mags[g.active] < gun.mag && g.reserves[g.active] > 0) {
              g.reloading = gun.reload;
              viewmodel?.reload(gun.reload);
              sfx.playReload(gun.id);
            }
          }
          g.fireCd -= dt;

          let autoFire = false;
          if (isTouch) {
            // Distance-gated auto-fire. Snipers (and other scoped weapons) only
            // engage when you've actually zoomed in — never from the hip. Every
            // other weapon opens up only once a target is inside its effective
            // band (AF_RANGE), so a rifle won't auto-snipe across the map; the
            // band widens when you deliberately zoom. The test is the same
            // raySphere the shot uses, so "fires" ⟺ "the centred shot connects".
            const zoomed = zoomLevel.current > 0;
            const afRange = gun.scoped
              ? zoomed
                ? RANGE
                : 0
              : (AF_RANGE[gun.family] ?? 45) * (zoomed ? 1.7 : 1);
            for (const e of g.enemies) {
              if (afRange <= 0) break;
              if (e.health <= 0) continue;
              const ecy = e.boss ? BOSSES[e.boss].scale : 1.0;
              const hr = (e.boss ? BOSSES[e.boss].radius : ENEMY_R) * 1.3;
              const tc: Vec3 = [e.x, e.y + ecy, e.z];
              if (raySphere(eye, dir, tc, hr) < afRange && !segBlocked(eye, tc, g.level, grid ?? undefined)) {
                autoFire = true;
                break;
              }
            }
          }

          const manualFire = fireHeld.current;
          const fireInput = manualFire || autoFire;
          // COMBAT LOCK: no shooting (either side) until the match-intro countdown
          // finishes (~2.8 s). Movement is free; firing is held.
          const locked = g.elapsed < 2.8 || frozen; // + the boss-opening cinematic freeze
          // Semi-auto fires on the rising edge of EITHER source tracked SEPARATELY, so a
          // manual trigger pull ALWAYS registers even while auto-fire is already holding
          // the input (auto-fire never blocks the manual fire button).
          const wantShot = !locked && (gun.auto ? fireInput : (manualFire && !prevManualFire.current) || (autoFire && !prevFire.current));
          prevFire.current = autoFire;
          prevManualFire.current = manualFire;

          // Sustained-fire audio (Ripper / Lance Beam): ONE loop while held with
          // ammo, instead of a per-shot sound. Handles start/stop + weapon switches.
          const wantLoop = sfx.isLoopWeapon(gun.id) && fireInput && g.mags[g.active] > 0 && g.reloading <= 0;
          if (wantLoop) {
            if (activeLoop !== gun.id) {
              if (activeLoop) sfx.playWeaponLoopStop(activeLoop);
              sfx.playWeaponLoopStart(gun.id);
              activeLoop = gun.id;
            }
          } else if (activeLoop) {
            sfx.playWeaponLoopStop(activeLoop);
            activeLoop = null;
          }

          // FIRE MODES. Ammo source: energy weapons gate on heat/overheat, everything else
          // on the magazine. CHARGE weapons build charge while held and release at full;
          // BURST weapons fire an N-round burst per pull; the rest fire per the trigger.
          const canAmmo = gun.heat ? overheat.current <= 0 && heat.current < 1 : g.mags[g.active] > 0;
          let doFire = false;
          if (gun.charge) {
            if (fireInput && !locked && g.fireCd <= 0 && g.reloading <= 0 && canAmmo) {
              chargeT.current += dt;
              if (chargeT.current >= gun.charge) {
                doFire = true;
                chargeT.current = 0;
              }
            } else if (!fireInput) {
              chargeT.current = 0;
            }
          } else {
            doFire = (wantShot || burstLeft.current > 0) && g.fireCd <= 0 && g.reloading <= 0 && canAmmo;
            if (doFire && gun.burst && burstLeft.current === 0) burstLeft.current = gun.burst;
          }
          // Energy weapons: heat climbs while the trigger is HELD (added per shot below),
          // and vents only when you let off — NOT on the brief gaps between shots (that
          // would cancel the gain). Overheating drains the meter over the lockout.
          if (gun.heat) {
            if (overheat.current > 0) {
              overheat.current -= dt;
              heat.current = Math.max(0, heat.current - dt / OVERHEAT_LOCK);
              if (overheat.current <= 0) heat.current = 0;
            } else if (!fireInput) {
              heat.current = Math.max(0, heat.current - dt / 2);
            }
          }
          if (doFire) {
            if (gun.heat) {
              heat.current = Math.min(1, heat.current + 1 / HEAT_SHOTS);
              if (heat.current >= 1) overheat.current = OVERHEAT_LOCK;
            } else {
              g.mags[g.active]--;
            }
            if (gun.burst) {
              burstLeft.current = Math.max(0, burstLeft.current - 1);
              g.fireCd = burstLeft.current > 0 ? BURST_GAP : gun.rate;
            } else {
              g.fireCd = gun.rate;
            }
            g.shotsFired++;
            snap.fireAt = now;
            viewmodel?.fire();
            recoilKick = Math.min(0.16, recoilKick + (RECOIL[gun.family] ?? 0.015));
            if (!sfx.isLoopWeapon(gun.id)) sfx.playWeaponFire(gun.id, gun.family);
            // Spread: wide & sprayy from the hip, tightening hard with each zoom
            // step (a scope is what makes the bullet land dead-centre). Applied to
            // the SHOT direction only — the auto-fire test above used the centred
            // ray, so un-zoomed fire visibly scatters around the crosshair.
            const zf = zoomLevel.current >= 3 ? 0.04 : zoomLevel.current === 2 ? 0.12 : zoomLevel.current === 1 ? 0.24 : 1;
            const spr = (SPREAD[gun.family] ?? 0.02) * zf;
            const syaw = p.yaw + (Math.random() - Math.random()) * spr;
            const spitch = p.pitch + (Math.random() - Math.random()) * spr;
            const scp = Math.cos(spitch);
            const sfx2 = -scp * Math.sin(syaw);
            const sfy2 = Math.sin(spitch);
            const sfz2 = -scp * Math.cos(syaw);
            const sdir: Vec3 = [sfx2, sfy2, sfz2];
            // During a Star Destroyer fight the ship can loom past the normal hitscan range
            // (unreachable from some spots), so lift the range for the duration — restored once
            // the SD is destroyed / the fight ends.
            const shotRange = sd && sdHp > 0 && sdPhase === 'combat' ? 5000 : RANGE;
            const wb = rayWallBox(eye, sdir, g.level, shotRange);
            const wallD = wb.t;
            let hitT = wallD;
            let hit: Enemy | null = null;
            let hitMult = 1; // body-zone damage multiplier for the nearest enemy hit
            let hitShip: Fighter | null = null; // nearest void fighter the ray struck
            let hitSd = false;                  // the ray struck the Star Destroyer hull
            for (const e of g.enemies) {
              if (e.health <= 0) continue;
              let t: number;
              let mult = 1;
              if (e.boss) {
                t = raySphere(eye, sdir, [e.x, e.y + BOSSES[e.boss].scale, e.z], BOSSES[e.boss].radius);
              } else if (e.cls === 'artillery') {
                t = raySphere(eye, sdir, [e.x, e.y + 2.6, e.z], 3.6); // big siege-gun emplacement
              } else if (e.cls === 'tank') {
                t = raySphere(eye, sdir, [e.x, e.y + 3.0, e.z], 3.0); // towering siege mech
              } else if (e.destructible) {
                t = raySphere(eye, sdir, [e.x, e.y + 1.0, e.z], e.destructible === 'shield' ? 3.0 : ENEMY_R); // shield = a wide blocker
              } else {
                const bh = bodyHit(eye, sdir, e); // per-zone body (head/chest/torso/legs)
                t = bh.t;
                mult = bh.mult;
              }
              if (t < hitT) {
                hitT = t;
                hit = e;
                hitMult = mult;
              }
            }
            // Star Destroyer squadron: void fighters + the (killable) capital hull are shootable.
            for (const f of fighters) {
              if (f.health <= 0) continue;
              const t = raySphere(eye, sdir, [f.x, f.y, f.z], 1.4);
              if (t < hitT) { hitT = t; hit = null; hitMult = 1; hitShip = f; hitSd = false; }
            }
            if (sd && sdHp > 0 && (sdPhase === 'combat' || sdPhase === 'depart')) {
              const t = raySphere(eye, sdir, [sdFinal.x, sdFinal.y, sdFinal.z], sdRadius);
              if (t < hitT) { hitT = t; hit = null; hitMult = 1; hitShip = null; hitSd = true; }
            }
            addTracer([eye[0] + sfx2 * 0.4, eye[1] - 0.12, eye[2] + sfz2 * 0.4], [eye[0] + sfx2 * hitT, eye[1] + sfy2 * hitT, eye[2] + sfz2 * hitT], gun.color);
            // Chip the structure the shot hit (only if the wall was the nearest thing —
            // not when a fighter or the SD hull is closer).
            if (!hit && !hitShip && !hitSd && wb.box && wallD < shotRange) {
              damageBox(wb.box, gun.splash ? gun.dmg * 1.4 : gun.dmg, eye[0] + sfx2 * wallD, eye[1] + sfy2 * wallD, eye[2] + sfz2 * wallD, now);
            }
            const zoomBoost = 1 + zoomLevel.current * 0.5; // impacts/explosions read bigger when scoped
            if (gun.splash) {
              // Explosive: detonate at the impact point and splash-damage everyone
              // in radius (falloff to the edge), regardless of the direct ray hit.
              const ix = eye[0] + sfx2 * hitT;
              const iy = eye[1] + sfy2 * hitT;
              const iz = eye[2] + sfz2 * hitT;
              let anyHit = false;
              for (const e of g.enemies) {
                if (e.health <= 0) continue;
                const d = Math.hypot(e.x - ix, e.y + 1 - iy, e.z - iz);
                if (d < gun.splash) {
                  const wm = e.boss && e.weakUntil && now < e.weakUntil ? 2.5 : 1;
                  const dd = Math.round(gun.dmg * (1 - d / gun.splash) * wm * (g.weaponBuff ?? 1)); // OVERDRIVE ×2.5
                  hurtEnemy(e, dd);
                  if (gun.trait) applyWeaponTrait(e, gun);
                  g.dmgDealt += dd;
                  e.hitFlash = 0.12;
                  e.alarm = 4;
                  e.state = 'alert';
                  e.lastSeen = { x: p.x, z: p.z };
                  e.barUntil = now + 2500;
                  anyHit = true;
                  if (e.health <= 0) onEnemyKilled(e);
                }
              }
              // Splash also rakes the SD squadron.
              for (const f of fighters) {
                if (f.health <= 0) continue;
                const d = Math.hypot(f.x - ix, f.y - iy, f.z - iz);
                if (d < gun.splash) { damageFighter(f, Math.round(gun.dmg * (1 - d / gun.splash)), now); anyHit = true; }
              }
              if (sd && sdHp > 0 && (sdPhase === 'combat' || sdPhase === 'depart')) {
                const d = Math.hypot(sdFinal.x - ix, sdFinal.y - iy, sdFinal.z - iz);
                if (d < gun.splash + sdRadius) { damageSd(Math.round(gun.dmg * 1.2)); anyHit = true; }
              }
              if (world) {
                const fm = new THREE.Mesh(ballGeo, new THREE.MeshBasicMaterial({ color: gun.color, transparent: true, blending: THREE.AdditiveBlending }));
                fm.position.set(ix, iy, iz);
                world.scene.add(fm);
                flashes.push({ mesh: fm, born: now, r: gun.splash * zoomBoost });
                // Fat glowing RPG round streaking from the muzzle to the impact point.
                const from: Vec3 = [eye[0] + sfx2 * 0.5, eye[1] - 0.1, eye[2] + sfz2 * 0.5];
                const rad = 0.34 + gun.splash * 0.04; // bigger launchers fire bigger rounds
                const sm = new THREE.Mesh(ballGeo, new THREE.MeshBasicMaterial({ color: gun.color, transparent: true, blending: THREE.AdditiveBlending }));
                sm.scale.setScalar(rad);
                sm.position.set(from[0], from[1], from[2]);
                world.scene.add(sm);
                const sdist = Math.hypot(ix - from[0], iy - from[1], iz - from[2]);
                shells.push({ mesh: sm, from, to: [ix, iy, iz], born: now, dur: Math.min(0.2, 0.05 + sdist / 260), rad });
              }
              sfx.explosion();
              cueSquads(p.x, p.z);
              if (anyHit) {
                g.shotsHit++;
                snap.hitAt = now;
                sfx.playImpact(gun.id, 'enemy');
              }
            } else {
              if (hitShip) {
                damageFighter(hitShip, gun.dmg, now);
                g.dmgDealt += gun.dmg;
                g.shotsHit++;
                snap.hitAt = now;
                sfx.playImpact(gun.id, 'enemy');
              } else if (hitSd) {
                damageSd(gun.dmg);
                g.dmgDealt += gun.dmg;
                g.shotsHit++;
                snap.hitAt = now;
                sfx.playImpact(gun.id, 'enemy');
              } else if (hit) {
                // Boss weak-point window (after a missed pounce) = bonus damage.
                const wm = hit.boss && hit.weakUntil && now < hit.weakUntil ? 2.5 : 1;
                // Body-zone multiplier (non-boss): head 2.5× · centre-chest 1.25× ·
                // torso 1× · limbs 0.75×. Bosses/deployables have hitMult = 1 (they use
                // the weak-point window instead). A head-zone hit still counts as a headshot.
                const headshot = hitMult >= HEADSHOT_MULT;
                const dmg = gun.dmg * wm * hitMult * (g.weaponBuff ?? 1); // OVERDRIVE ×2.5
                hurtEnemy(hit, dmg);
                if (gun.trait) applyWeaponTrait(hit, gun);
                g.dmgDealt += dmg;
                g.shotsHit++;
                if (headshot) {
                  g.headshots++;
                  snap.headshotAt = now;
                }
                hit.hitFlash = headshot ? 0.2 : 0.12;
                hit.alarm = 4;
                hit.state = 'alert';
                hit.lastSeen = { x: p.x, z: p.z };
                hit.barUntil = now + 2500;
                {
                  const hsq = g.squads[hit.squadId]; // a shot squadmate cues its own squad
                  if (hsq) {
                    hsq.lastKnown = { x: p.x, z: p.z };
                    hsq.t = now;
                  }
                }
                cueSquads(p.x, p.z); // and any other squad within earshot of the shot
                snap.hitAt = now;
                sfx.playImpact(gun.id, 'enemy');
                if (hit.health <= 0) onEnemyKilled(hit);
              }
              // Always leave a visible impact at the point of contact (enemy OR
              // wall) so you can see where the round landed — bigger for snipers
              // and when scoped.
              if (world) {
                const ipx = eye[0] + sfx2 * hitT;
                const ipy = eye[1] + sfy2 * hitT;
                const ipz = eye[2] + sfz2 * hitT;
                const struck = hit || hitShip || hitSd;
                const base = (struck ? (gun.family === 'sniper' ? 2.2 : 1.3) : 0.7) * zoomBoost;
                const fm = new THREE.Mesh(ballGeo, new THREE.MeshBasicMaterial({ color: struck ? gun.color : 0xffe6b0, transparent: true, blending: THREE.AdditiveBlending }));
                fm.position.set(ipx, ipy, ipz);
                world.scene.add(fm);
                flashes.push({ mesh: fm, born: now, r: base });
              }
            }
          } else if (wantShot && g.mags[g.active] <= 0 && g.reloading <= 0 && g.reserves[g.active] > 0) {
            g.reloading = gun.reload;
            viewmodel?.reload(gun.reload);
            sfx.playReload(gun.id);
          }

          // Grenade sim + detonation. Grenades BOUNCE off intact walls (per-axis
          // reflect) and the ground; they pass through destroyed boxes.
          const GR_R = 0.22;
          const grHitsBox = (hx: number, hy: number, hz: number): boolean => {
            const bxs = grid ? grid.queryAABB(hx - GR_R, hz - GR_R, hx + GR_R, hz + GR_R) : g.level.boxes;
            for (let b = 0; b < bxs.length; b++) {
              const bb = bxs[b];
              if (bb.dead) continue;
              if (
                hx + GR_R > bb.x - bb.sx / 2 &&
                hx - GR_R < bb.x + bb.sx / 2 &&
                hz + GR_R > bb.z - bb.sz / 2 &&
                hz - GR_R < bb.z + bb.sz / 2 &&
                hy + GR_R > bb.y - bb.sy / 2 &&
                hy - GR_R < bb.y + bb.sy / 2
              )
                return true;
            }
            return false;
          };
          for (let i = grenades.length - 1; i >= 0; i--) {
            const gr = grenades[i];
            gr.vy -= 22 * dt;
            const nx = gr.x + gr.vx * dt;
            if (grHitsBox(nx, gr.y, gr.z)) gr.vx *= -0.5;
            else gr.x = nx;
            const nz = gr.z + gr.vz * dt;
            if (grHitsBox(gr.x, gr.y, nz)) gr.vz *= -0.5;
            else gr.z = nz;
            const ny = gr.y + gr.vy * dt;
            if (ny < 0.2) {
              gr.y = 0.2;
              gr.vy *= -0.4;
              gr.vx *= 0.7;
              gr.vz *= 0.7;
              gr.landed = true; // touched the ground → the fuse can start
            } else if (grHitsBox(gr.x, ny, gr.z)) {
              gr.vy *= -0.5;
              gr.landed = true; // rested on a surface (deck/roof)
            } else {
              gr.y = ny;
            }
            // The grenade must CONTACT a surface before the fuse ticks, so it detonates
            // on the ground (or a deck) instead of mid-air. A long fallback covers the
            // rare case it never settles.
            gr.age = (gr.age ?? 0) + dt;
            if (gr.landed) gr.fuse -= dt;
            gr.mesh.position.set(gr.x, gr.y, gr.z);
            throwFx?.trail(g.throwable.kind, gr.x, gr.y, gr.z, dt, g.throwable.color); // cosmetic in-flight trail
            if (gr.fuse <= 0 || (gr.age ?? 0) > 6) {
              const t = g.throwable;
              const cx = gr.x;
              const cy = gr.y;
              const cz = gr.z;
              sfx.playThrowable(t.id, 'blast'); // per-throwable detonation (all 12)
              // Handcrafted "Battlefield Event" detonation VFX (cosmetic) + a
              // proximity-scaled camera punch tuned per kind. All gameplay
              // resolution below (damage/status/zone/pull/push) is unchanged.
              {
                // VISUAL radius roughly MATCHES the gameplay damage radius so the blast
                // reflects its true area of effect (the meaty layered fireball reads as a
                // real explosion, not a firecracker). Damage radius itself is unchanged.
                const visR = (t.blast.radius || t.zone?.radius || t.status?.radius || 4) * 1.15;
                throwFx?.detonate(t.kind, cx, cy, cz, visR, t.color);
                const punch = t.push ? 0.18 : t.blast.dmg >= 200 ? 0.16 : t.blast.dmg > 0 ? 0.1 : t.kind === 'flash' ? 0.06 : 0;
                if (punch > 0) {
                  const near = Math.max(0, 1 - Math.hypot(cx - p.x, cz - p.z) / (visR + 8));
                  if (near > 0) recoilKick = Math.min(0.24, recoilKick + near * punch);
                }
              }
              const blastAt = (bx: number, by: number, bz: number, dmg: number, radius: number): boolean => {
                let any = false;
                for (const e of g.enemies) {
                  if (e.health <= 0) continue;
                  const d = Math.hypot(e.x - bx, e.y + 1 - by, e.z - bz);
                  if (d < radius) {
                    hurtEnemy(e, Math.round(dmg * (1 - d / radius)));
                    e.hitFlash = 0.12;
                    e.alarm = 4;
                    e.state = 'alert';
                    e.lastSeen = { x: p.x, z: p.z };
                    e.barUntil = now + 2500;
                    any = true;
                    if (e.health <= 0) onEnemyKilled(e);
                  }
                }
                return any;
              };
              let anyHit = false;
              // Gravity: yank enemies toward the center first.
              if (t.pull) {
                for (const e of g.enemies) {
                  if (e.health <= 0) continue;
                  const dx = cx - e.x;
                  const dz = cz - e.z;
                  const d = Math.hypot(dx, dz) || 1;
                  if (d < t.blast.radius + 2) {
                    const m = Math.min(t.pull, d);
                    e.x += (dx / d) * m;
                    e.z += (dz / d) * m;
                  }
                }
              }
              if (t.blast.dmg > 0 && t.blast.radius > 0) {
                anyHit = blastAt(cx, cy, cz, t.blast.dmg, t.blast.radius) || anyHit;
              }
              // Cluster: a spread of smaller secondary blasts.
              if (t.cluster) {
                for (let k = 0; k < t.cluster; k++) {
                  const ox = cx + (Math.random() * 2 - 1) * t.blast.radius;
                  const oz = cz + (Math.random() * 2 - 1) * t.blast.radius;
                  anyHit = blastAt(ox, 0.6, oz, t.blast.dmg * 0.6, t.blast.radius * 0.7) || anyHit;
                }
              }
              // The PLAYER takes AoE damage too if caught in a lethal blast (falloff to
              // the edge; clusters scatter wider). Armor soaks it via hurtPlayer.
              if (t.blast.dmg > 0 && t.blast.radius > 0) {
                const pr = t.blast.radius * (t.cluster ? 1.7 : 1);
                const pd = Math.hypot(cx - p.x, cz - p.z);
                if (pd < pr) hurtPlayer(Math.round(t.blast.dmg * (1 - pd / pr) * PLAYER_BLAST_MULT));
              }
              // Concussion: shove enemies away.
              if (t.push) {
                for (const e of g.enemies) {
                  if (e.health <= 0) continue;
                  const dx = e.x - cx;
                  const dz = e.z - cz;
                  const d = Math.hypot(dx, dz) || 1;
                  if (d < t.blast.radius) {
                    e.x += (dx / d) * t.push;
                    e.z += (dz / d) * t.push;
                  }
                }
              }
              // Status: stun / slow / blind enemies in radius.
              if (t.status) {
                const s = t.status;
                for (const e of g.enemies) {
                  if (e.health <= 0) continue;
                  if (Math.hypot(e.x - cx, e.z - cz) < s.radius) {
                    if (s.stun) e.stunT = Math.max(e.stunT, s.stun);
                    if (s.slow) e.slowT = Math.max(e.slowT, s.duration);
                    if (s.blind) e.blindT = Math.max(e.blindT, s.blind);
                  }
                }
                if (s.blind) {
                  // Flashbang the player too if they're close and looking at it.
                  const tx = cx - p.x;
                  const tz = cz - p.z;
                  const tl = Math.hypot(tx, tz) || 1;
                  if (tl < s.radius && (tx / tl) * fx + (tz / tl) * fz > 0.2) snap.flashAt = now;
                }
                if (s.stun) {
                  // Stun/concussion blast disorients the player (screen distortion)
                  // regardless of facing if they're inside the radius.
                  if (Math.hypot(cx - p.x, cz - p.z) < s.radius) snap.stunAt = now;
                }
              }
              // Lingering zones.
              if (t.zone && world) {
                const z = t.zone;
                // The gameplay record keeps a (now hidden) mesh for timing/teardown;
                // the visible lingering effect is handcrafted by throwFx.lingering.
                throwFx?.lingering(z.kind, cx, cz, z.radius, z.duration * 1000);
                if (z.kind === 'smoke' || z.kind === 'gas') {
                  const sm = new THREE.Mesh(ballGeo, new THREE.MeshBasicMaterial({ color: t.color, transparent: true, opacity: 0.5, depthWrite: false }));
                  sm.position.set(cx, 1.6, cz);
                  sm.scale.setScalar(0.5);
                  sm.visible = false; // visual handled by throwFx
                  world.scene.add(sm);
                  smokes.push({ x: cx, y: 1.6, z: cz, r: z.radius, until: now + z.duration * 1000, born: now, dur: z.duration * 1000, dps: z.dps ?? 0, mesh: sm });
                  if (z.kind === 'gas') sfx.gas();
                  else sfx.hurt();
                } else {
                  const zm = new THREE.Mesh(ballGeo, new THREE.MeshBasicMaterial({ color: t.color, transparent: true, opacity: 0.42, depthWrite: false }));
                  zm.position.set(cx, 0.3, cz);
                  zm.scale.set(z.radius, 0.3, z.radius);
                  zm.visible = false; // visual handled by throwFx
                  world.scene.add(zm);
                  zones.push({ kind: z.kind, x: cx, z: cz, r: z.radius, born: now, until: now + z.duration * 1000, dps: z.dps ?? 0, slow: z.slow ?? 0, lure: z.lure ?? false, mesh: zm });
                  if (z.kind === 'fire') sfx.ignite();
                  else if (z.kind === 'cryo') sfx.freeze();
                  else sfx.swap();
                }
              }
              if (anyHit) {
                snap.hitAt = now;
                sfx.enemyHit();
              }
              // Damaging/loud throwables cue any squad within earshot of the spot.
              if (t.blast.dmg > 0 || t.status?.stun || t.cluster) cueSquads(cx, cz);
              clearMesh(gr.mesh);
              grenades.splice(i, 1);
            }
          }
          // Smoke / gas grow + expire (gas also poisons enemies inside).
          for (let i = smokes.length - 1; i >= 0; i--) {
            const s = smokes[i];
            const age = (now - s.born) / s.dur;
            const sc = Math.min(1, age * 4) * s.r;
            s.mesh.scale.setScalar(Math.max(0.5, sc));
            (s.mesh.material as THREE.MeshBasicMaterial).opacity = age > 0.8 ? 0.5 * (1 - (age - 0.8) / 0.2) : 0.5;
            if (s.dps) {
              for (const e of g.enemies) {
                if (e.health <= 0) continue;
                if (Math.hypot(e.x - s.x, e.z - s.z) < s.r) {
                  hurtEnemy(e, s.dps * dt);
                  e.hitFlash = Math.max(e.hitFlash, 0.05);
                  if (e.health <= 0) onEnemyKilled(e);
                }
              }
              if (Math.hypot(p.x - s.x, p.z - s.z) < s.r) hurtPlayer(s.dps * dt); // player caught in the gas
            }
            if (now > s.until) {
              clearMesh(s.mesh);
              smokes.splice(i, 1);
            }
          }
          // Effect zones — fire (DoT), cryo (slow), decoy (lures the squad).
          for (let i = zones.length - 1; i >= 0; i--) {
            const z = zones[i];
            const pulse = 1 + 0.08 * Math.sin(now / 120 + i);
            z.mesh.scale.set(z.r * pulse, 0.3, z.r * pulse);
            if (z.kind === 'fire') {
              for (const e of g.enemies) {
                if (e.health <= 0) continue;
                if (Math.hypot(e.x - z.x, e.z - z.z) < z.r) {
                  e.burnT = 0.7;
                  e.burnDps = z.dps;
                }
              }
              if (Math.hypot(p.x - z.x, p.z - z.z) < z.r) hurtPlayer(z.dps * dt); // player caught in the fire
            } else if (z.kind === 'cryo') {
              for (const e of g.enemies) {
                if (e.health <= 0) continue;
                if (Math.hypot(e.x - z.x, e.z - z.z) < z.r) e.slowT = Math.max(e.slowT, 0.3);
              }
            } else if (z.kind === 'decoy') {
              cueSquads(z.x, z.z, 100); // a decoy lures nearby squads to the spot
            }
            if (now > z.until) {
              clearMesh(z.mesh);
              zones.splice(i, 1);
            }
          }
          // Status timers + burn damage-over-time.
          for (const e of g.enemies) {
            if (e.health <= 0) continue;
            if (e.muzzle > 0) e.muzzle -= dt;
            if (e.stunT > 0) e.stunT -= dt;
            if (e.slowT > 0) e.slowT -= dt;
            if (e.blindT > 0) e.blindT -= dt;
            if (e.burnT > 0) {
              e.burnT -= dt;
              hurtEnemy(e, e.burnDps * dt);
              e.hitFlash = Math.max(e.hitFlash, 0.05);
              if (e.health <= 0) onEnemyKilled(e);
            }
          }
          // Boss/minion projectiles: advance + resolve impacts (P0 system, fired in P1).
          if (projectiles.count > 0) {
            // Find the (breakable) building box a Star Destroyer round landed on, if any.
            const boxAt = (bx: number, by: number, bz: number): Box | null => {
              const boxes = grid ? grid.queryAABB(bx - 0.3, bz - 0.3, bx + 0.3, bz + 0.3) : g.level.boxes;
              for (const b of boxes) {
                if (b.dead || b.indestructible) continue;
                if (Math.abs(bx - b.x) <= b.sx / 2 + 0.3 && Math.abs(by - b.y) <= b.sy / 2 + 0.3 && Math.abs(bz - b.z) <= b.sz / 2 + 0.3) return b;
              }
              return null;
            };
            for (const im of projectiles.update(dt, p, g.level, grid ?? undefined)) {
              const isSd = im.kind === 'sdmg' || im.kind === 'sdrocket' || im.kind === 'sdmega';
              const heavy = im.kind === 'sdrocket' || im.kind === 'sdmega';
              if (im.dmg > 0) {
                hurtPlayer(im.dmg);
                recoilKick = Math.min(0.3, recoilKick + (im.kind === 'sdmega' ? 0.2 : heavy ? 0.1 : 0.03)); // impact shake
                sfx.hurt();
              }
              // A MISSED Star Destroyer round either chews through the building it hit (4 hits
              // break the part) or craters the open ground with a big ~4× frag blast.
              let sdCrater = false;
              if (isSd && im.dmg === 0) {
                const bx = boxAt(im.x, im.y, im.z);
                if (bx) damageBox(bx, boxMaxHp(bx) / 4 + 1, im.x, im.y, im.z, now); // 4 SD hits destroy it
                else sdCrater = true;
              }
              // Screen/HUD shake: from a direct hit, near a heavy SD blast, or from a ground crater.
              {
                const weight = sdCrater ? (im.kind === 'sdmega' ? 1 : im.kind === 'sdrocket' ? 0.7 : 0.4) : im.kind === 'sdmega' ? 1 : im.kind === 'sdrocket' ? 0.6 : im.kind === 'sdmg' ? 0.22 : im.dmg > 0 ? 0.4 : 0;
                if (weight > 0) {
                  const reach = (sdCrater ? (im.kind === 'sdmega' ? 16 : im.kind === 'sdrocket' ? 12 : 7) : (im.splash || 1.5) * 2) + 6;
                  const pd = Math.hypot(p.x - im.x, p.y + EYE - im.y, p.z - im.z);
                  const close = im.dmg > 0 ? 1 : Math.max(0, 1 - pd / reach);
                  if (close > 0) { shakeMag = Math.min(1, Math.max(shakeMag, close * weight)); snap.shakeAt = now; snap.shakeMag = shakeMag; }
                }
              }
              if (world) {
                const fm = new THREE.Mesh(ballGeo, new THREE.MeshBasicMaterial({ color: im.color, transparent: true, blending: THREE.AdditiveBlending }));
                fm.position.set(im.x, im.y, im.z);
                world.scene.add(fm);
                flashes.push({ mesh: fm, born: now, r: Math.max(1.2, (im.splash || 1.2) * (isSd ? 1.5 : 1)) });
                if (sdCrater) {
                  // BIG ground crater ~4× the frag grenade (6.5): huge fireball + shockwave +
                  // scorch, and splash-damage the player if they're caught close.
                  const vis = im.kind === 'sdmega' ? 26 : im.kind === 'sdrocket' ? 20 : 11; // ≈4× / 3× / smaller
                  const dmgR = im.kind === 'sdmega' ? 7 : im.kind === 'sdrocket' ? 5.5 : 3;
                  const dmgAmt = im.kind === 'sdmega' ? 60 : im.kind === 'sdrocket' ? 40 : 16;
                  const wave = new THREE.Mesh(ballGeo, new THREE.MeshBasicMaterial({ color: 0xffe6b0, transparent: true, blending: THREE.AdditiveBlending }));
                  wave.position.set(im.x, im.y, im.z);
                  world.scene.add(wave);
                  flashes.push({ mesh: wave, born: now, r: vis });
                  addScar(im.x, im.z, Math.min(9, dmgR * 1.5));
                  sfx.explosion();
                  const pdd = Math.hypot(p.x - im.x, p.y + EYE - im.y, p.z - im.z);
                  if (pdd < dmgR) hurtPlayer(Math.round(dmgAmt * (1 - pdd / dmgR)));
                } else if (heavy) {
                  // Heavy SD blast that connected: a big secondary shockwave + scorch.
                  const wave = new THREE.Mesh(ballGeo, new THREE.MeshBasicMaterial({ color: 0xffe6b0, transparent: true, blending: THREE.AdditiveBlending }));
                  wave.position.set(im.x, im.y, im.z);
                  world.scene.add(wave);
                  flashes.push({ mesh: wave, born: now, r: (im.splash || 3) * 2.2 });
                  addScar(im.x, im.z, (im.splash || 4) * 1.2);
                  sfx.explosion();
                }
                // Acid spit leaves a lingering puddle that denies that ground.
                if (im.kind === 'acid') {
                  const pm = new THREE.Mesh(ballGeo, new THREE.MeshBasicMaterial({ color: 0x6aff7a, transparent: true, opacity: 0.4, depthWrite: false }));
                  pm.position.set(im.x, 0.06, im.z);
                  pm.scale.set(2.4, 0.05, 2.4);
                  world.scene.add(pm);
                  bossHazards.push({ x: im.x, z: im.z, r: 2.4, until: now + 4200, dps: 14, mesh: pm });
                }
                // Artillery shells scorch the ground — a persistent scar the rest of the level.
                if (im.kind === 'artyshell') addScar(im.x, im.z, im.splash || 4);
              }
            }
          }
          // Boss ground hazards (acid puddles): damage the player while they stand in one.
          for (let i = bossHazards.length - 1; i >= 0; i--) {
            const hz = bossHazards[i];
            if (now > hz.until) {
              clearMesh(hz.mesh);
              bossHazards.splice(i, 1);
              continue;
            }
            const hzd = Math.hypot(p.x - hz.x, p.z - hz.z);
            if (p.y < 1.2 && hzd < hz.r) hurtPlayer(hz.dps * dt);
            // Pull vortex: drag the player toward the centre while they're in range.
            if (hz.pull && p.y < 2.5 && hzd < hz.r * 2 && hzd > 0.5) pushPlayer(p, hz.x - p.x, hz.z - p.z, hz.pull);
            (hz.mesh.material as THREE.MeshBasicMaterial).opacity = 0.3 + 0.14 * Math.sin(now * 0.006);
          }
          // Ground telegraphs resolving → a visible flash at the epicentre (P0;
          // P1 adds the per-kind effect: eruption damage/knockback, pool, etc.).
          if (telegraphs.count > 0) {
            for (const tf of telegraphs.update(now, p)) {
              // Tentacle Eruption: damage + launch/knock the player if caught.
              if (tf.kind === 'eruption' && tf.hitPlayer && p.y < 1.6) {
                hurtPlayer(26);
                recoilKick = Math.min(0.22, recoilKick + 0.12);
                launchPlayer(p, 7.5);
                pushPlayer(p, p.x - tf.x, p.z - tf.z, 7);
              }
              // Pull Zone: drop a lingering vortex that drags the player to its centre.
              if (tf.kind === 'pull' && world) {
                const pm = new THREE.Mesh(ballGeo, new THREE.MeshBasicMaterial({ color: 0x8a4ad0, transparent: true, opacity: 0.42, depthWrite: false }));
                pm.position.set(tf.x, 0.1, tf.z);
                pm.scale.set(tf.radius, 0.05, tf.radius);
                world.scene.add(pm);
                bossHazards.push({ x: tf.x, z: tf.z, r: tf.radius, until: now + 3200, dps: 6, mesh: pm, pull: 9 });
              }
              // Slam Wave: a strong knockback (no launch) if caught in the ring.
              if (tf.kind === 'slam' && tf.hitPlayer && p.y < 2.5) {
                hurtPlayer(18);
                recoilKick = Math.min(0.22, recoilKick + 0.1);
                pushPlayer(p, p.x - tf.x, p.z - tf.z, 12);
              }
              if (world) {
                const erupt = tf.kind === 'eruption';
                const slam = tf.kind === 'slam';
                const fm = new THREE.Mesh(ballGeo, new THREE.MeshBasicMaterial({ color: erupt || slam ? 0xc08bff : 0xffae3a, transparent: true, blending: THREE.AdditiveBlending }));
                fm.position.set(tf.x, erupt ? 1.6 : 0.4, tf.z);
                world.scene.add(fm);
                flashes.push({ mesh: fm, born: now, r: tf.radius * (erupt ? 1.3 : 1) });
              }
            }
          }
          // Frag flash expand/fade
          for (let i = flashes.length - 1; i >= 0; i--) {
            const f = flashes[i];
            const age = (now - f.born) / 320;
            if (age >= 1) {
              clearMesh(f.mesh);
              flashes.splice(i, 1);
              continue;
            }
            f.mesh.scale.setScalar(f.r * (0.3 + age * 0.9));
            (f.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - age;
          }
          throwFx?.update(dt, now); // advance handcrafted throwable particles/decals

          // Launcher rounds: streak from muzzle to impact, pulsing, then vanish.
          for (let i = shells.length - 1; i >= 0; i--) {
            const s = shells[i];
            const age = (now - s.born) / (s.dur * 1000);
            if (age >= 1) {
              clearMesh(s.mesh);
              shells.splice(i, 1);
              continue;
            }
            s.mesh.position.set(s.from[0] + (s.to[0] - s.from[0]) * age, s.from[1] + (s.to[1] - s.from[1]) * age, s.from[2] + (s.to[2] - s.from[2]) * age);
            s.mesh.scale.setScalar(s.rad * (1 + Math.sin(age * Math.PI * 8) * 0.18));
          }

          // Drops: spin + bob, and AUTO-COLLECT on proximity. Ammo tops up every gun's
          // reserve; shield refills the overshield. (Must be near the drop's height so
          // rooftop drops aren't grabbed from the ground below.)
          for (let i = drops.length - 1; i >= 0; i--) {
            const d = drops[i];
            d.mesh.rotation.y += dt * 2.4;
            d.mesh.position.y = d.y + 0.6 + Math.sin((now - d.born) / 300) * 0.12;
            const dropMaxed = d.kind === 'ammo' ? g.guns.every((gn, gi) => g.reserves[gi] >= Math.ceil(gn.reserve * 1.5)) : (p.armor >= p.maxArmor && !g.shieldOverloaded);
            if (!dropMaxed && Math.hypot(d.x - p.x, d.z - p.z) < 1.7 && Math.abs(p.y - d.y) < 2.2) {
              if (d.kind === 'ammo') {
                for (let gi = 0; gi < g.guns.length; gi++) {
                  const base = g.guns[gi].reserve;
                  g.reserves[gi] = Math.min(Math.ceil(base * 1.5), g.reserves[gi] + Math.ceil(base * 0.25));
                }
              } else {
                p.armor = Math.min(p.maxArmor, p.armor + 35);
                g.shieldOverloaded = false; g.shieldRecharges = 0;
              }
              snap.pickupAt = now;
              sfx.swap();
              clearGroup(d.mesh);
              drops.splice(i, 1);
            }
          }

          // Resupply. A refill helper shared by stations + pickups.
          const refillAmmo = (frac: number) => {
            for (let gi = 0; gi < g.guns.length; gi++) {
              const base = g.guns[gi].reserve;
              g.reserves[gi] = Math.min(Math.ceil(base * 1.5), g.reserves[gi] + Math.ceil(base * frac));
            }
          };
          // STATIONS: stand under one to continuously top up ammo + overshield.
          for (const rp of resupply) {
            if (Math.abs(p.y - rp.y) > 3) continue;
            if (Math.hypot(rp.x - p.x, rp.z - p.z) < 5) {
              rp.tick -= dt;
              if (rp.tick <= 0) {
                rp.tick = 0.4;
                refillAmmo(0.1);
                p.armor = Math.min(p.maxArmor, p.armor + 10);
                g.shieldOverloaded = false; g.shieldRecharges = 0; // a station re-enables the overshield
                snap.pickupAt = now;
                sfx.swap();
              }
            } else {
              rp.tick = 0;
            }
          }
          // PICKUPS: walk over one to grab it; it then DISAPPEARS and regenerates at a
          // new open spot elsewhere on the map (never sits recharging in place).
          if (pickups.length) {
            const randomOpenXZ = (): { x: number; z: number } => {
              const rh = g.level.size / 2 - 10;
              for (let t = 0; t < 40; t++) {
                const x = (Math.random() * 2 - 1) * rh;
                const z = (Math.random() * 2 - 1) * rh;
                if (grid && grid.queryAABB(x - 0.6, z - 0.6, x + 0.6, z + 0.6).some((b) => !b.dead && b.y - b.sy / 2 < 1.6)) continue;
                if (Math.hypot(x - p.x, z - p.z) < 12) continue;
                return { x, z };
              }
              return { x: 0, z: 0 };
            };
            for (const pk of pickups) {
              if (pk.respawnT > 0) {
                pk.respawnT -= dt;
                if (pk.respawnT <= 0) {
                  const np = randomOpenXZ();
                  pk.x = np.x;
                  pk.z = np.z;
                  pk.mesh.position.set(pk.x, 1.0, pk.z);
                  pk.mesh.visible = true;
                }
                continue;
              }
              pk.mesh.rotation.y += dt * 2;
              pk.mesh.position.y = 1.0 + Math.sin((now - pk.born) / 300) * 0.13;
              // Only grab it if it's actually useful — a maxed resource leaves the crate
              // on the map (full ammo skips ammo, full health skips first-aid, etc.).
              const maxed =
                pk.kind === 'ammo' ? g.guns.every((gn, gi) => g.reserves[gi] >= Math.ceil(gn.reserve * 1.5))
                : pk.kind === 'shield' ? (p.armor >= p.maxArmor && !g.shieldOverloaded) // an overloaded shield is always grabbable (re-enables it)
                : p.health >= g.maxHp;
              if (!maxed && p.y < 3 && Math.hypot(pk.x - p.x, pk.z - p.z) < 2.2) {
                if (pk.kind === 'ammo') refillAmmo(0.5);
                else if (pk.kind === 'shield') { p.armor = Math.min(p.maxArmor, p.armor + 50); g.shieldOverloaded = false; g.shieldRecharges = 0; }
                else p.health = Math.min(g.maxHp, p.health + 50);
                snap.pickupAt = now;
                sfx.swap();
                pk.mesh.visible = false;
                pk.respawnT = 1.6; // disappear, then regenerate elsewhere
              }
            }
          }

          // Enemies — each squad runs its OWN independent brain (its own intel,
          // captain buff, roaming healer, coordination) over just its members;
          // their effects on the player are aggregated. Boss levels are one squad.
          let totalDamage = 0;
          let anySeen = false;
          let suppress = 0; // strongest Suppressor pin this frame (→ screen debuff)
          // Freeze enemy AI (movement + fire) during the boss-opening cinematic.
          if (!frozen) for (let s = 0; s < g.squads.length; s++) {
            const group = squadGroups[s];
            if (!group || !group.length) continue;
            const res = updateEnemies(group, p, g.level, g.difficulty, pvx, pvz, dt, now, g.squads[s], smokes, grid ?? undefined, nav ?? undefined, g.elapsed, eyeH);
            for (const tr of res.tracers) addTracer(tr.from, [p.x, p.y + eyeH - 0.1, p.z], tr.color);
            // Heavy enemies chipping breakable cover to flush the player out.
            for (const wh of res.wallHits) {
              damageBox(wh.box, wh.dmg, wh.x, wh.y, wh.z, now);
              addTracer(wh.from, [wh.x, wh.y, wh.z], wh.color);
            }
            if (world && res.bossShots.length) {
              for (const bs of res.bossShots) {
                projectiles.spawn({ kind: bs.kind, scene: world.scene, x: bs.x, y: bs.y, z: bs.z, dir: bs.dir, speed: bs.speed, dmg: bs.dmg, color: bs.color, splash: bs.splash, gravity: bs.gravity, radius: bs.gravity ? 0.32 : 0.42 });
              }
            }
            if (res.bossFog) snap.fogAt = now;
            if (world && res.bossTelegraphs.length) {
              for (const bt of res.bossTelegraphs) {
                telegraphs.spawn({ kind: bt.kind, scene: world.scene, x: bt.x, z: bt.z, radius: bt.radius, delay: bt.delay, color: bt.kind === 'pounce' ? 0x9cff6a : 0xc08bff }, now);
              }
            }
            totalDamage += res.damage;
            if (res.suppress > suppress) suppress = res.suppress;
            if (res.seen) anySeen = true;
          }
          // SUPPRESSION: a Suppressor pinning you rattles the screen + edges (a "get to cover" cue).
          if (suppress > 0.01) {
            shakeMag = Math.min(1, Math.max(shakeMag, suppress * 0.32));
            snap.suppressAt = now;
            snap.suppressMag = suppress;
          }
          // Siege-Tank shield projector: keep nearby allies' shields charged (cross-squad).
          if (!frozen) tankShieldAura(g.enemies, dt);
          if (totalDamage > 0) {
            hurtPlayer(totalDamage);
            sfx.hurt();
          }
          if (anySeen || totalDamage > 0) g.regenT = 0;
          else {
            g.regenT += dt;
            if (g.regenT > (g.regenDelay ?? 2)) p.health = Math.min(g.maxHp, p.health + (g.regenRate ?? 24) * dt);
          }
          if (g.god) p.health = g.maxHp; // dev god-mode: stay topped up after all damage
          // Rechargeable OVERSHIELD: 2s after the last hit it refills; each full refill is
          // a "recharge" and after a few it OVERLOADS (disabled) until a shield pickup/
          // station re-enables it. Time-gated on damage only (not LoS), so it recharges in
          // every stage — including the dev enemy-test arenas.
          if (!g.shieldOverloaded && now - (g.lastHitT ?? 0) > 2000 && p.armor < p.maxArmor) {
            p.armor = Math.min(p.maxArmor, p.armor + 40 * dt);
            if (p.armor >= p.maxArmor) {
              g.shieldRecharges = (g.shieldRecharges ?? 0) + 1;
              if (g.shieldRecharges >= 3) g.shieldOverloaded = true;
            }
          }
          snap.shieldOverloaded = g.shieldOverloaded ?? false;
          // Drive the 3D viewmodel (bob from movement; recoil/flash/reload poses
          // were triggered by the fire/reload hooks above). Drawn after the world.
          // OVERDRIVE: tint every held weapon red while the ×2.5 boss buff is active.
          const wantEmpower = (g.weaponBuff ?? 1) > 1;
          if (wantEmpower !== vmEmpowered) { vmEmpowered = wantEmpower; viewmodel?.setEmpowered(wantEmpower); }
          viewmodel?.update(dt, Math.hypot(pvx, pvz), g.reloading);

          // Boss levels are won when the BOSS dies (its summoned minions then
          // don't block the clear); normal levels when every enemy is down.
          const hasBoss = g.enemies.some((e) => e.boss);
          const cleared = hasBoss ? !g.enemies.some((e) => e.boss && e.health > 0) : g.enemies.every((e) => e.health <= 0);
          if (cleared) {
            // On a Star Destroyer level, the last-enemy-down cues the rift: open the black hole
            // and kick off the emergence cinematic; the win is held until the whole arrival →
            // bombardment → depart sequence resolves (sdDone).
            if (sd && sdPhase === 'idle' && !sdDone && world) {
              sdPhase = 'arriving';
              sdT = 0;
              sdCamPan = 0;
              sd.visible = true;
              sd.position.copy(sdBirth);
              sd.scale.setScalar(sdSize.from);
              blackHole = makeBlackHole(g.capital?.accent ?? 0xff7a3c);
              blackHole.position.copy(sdBirth);
              blackHole.scale.setScalar(0.1);
              world.scene.add(blackHole);
            }
            if (!sd || sdDone) g.status = 'won';
          }
        }
        // Kill any sustained loop if we left the playing state (win/lose/pause).
        if (activeLoop && g.status !== 'playing') {
          sfx.playWeaponLoopStop(activeLoop);
          activeLoop = null;
        }

        // Enemy actors (3D models for regulars, billboard sprites for bosses).
        const outlineSel: THREE.Object3D[] = []; // live enemies fed to the outline effect
        for (let i = 0; i < sprites.length; i++) {
          const e = g.enemies[i];
          const s = sprites[i];
          if (e.dormant) {
            // Reinforcement not yet woken — keep it hidden + its bars off.
            s.visible = false;
            barBg[i].visible = false;
            barFill[i].visible = false;
            barShield[i].visible = false;
            continue;
          }
          const alive = e.health > 0;
          const showBar = alive && !e.boss && now < e.barUntil; // bosses use the top bar
          barBg[i].visible = showBar;
          barFill[i].visible = showBar;
          barShield[i].visible = showBar && e.shield > 0;
          if (alive) outlineSel.push(s); // pop off the map (desktop outline pass)
          if (!alive) {
            // Death: sprite bosses vanish; 3D bosses + enemies topple then go.
            if (e.boss) {
              if (s instanceof THREE.Sprite) {
                s.visible = false;
                continue;
              }
              // 3D boss death: a slow topple + reactor flash, then disappear.
              if (s.userData.deadT === undefined) sfx.enemyDie();
              const bdt = (s.userData.deadT = ((s.userData.deadT as number) ?? 0) + dt);
              if (bdt >= 2.2) {
                s.visible = false;
                continue;
              }
              s.visible = true;
              s.position.set(e.x, e.y, e.z);
              poseBossDeath(s as THREE.Group, bdt);
              if (!s.userData.died && world) {
                s.userData.died = true;
                const fm = new THREE.Mesh(ballGeo, new THREE.MeshBasicMaterial({ color: 0x9cff6a, transparent: true }));
                fm.position.set(e.x, e.y + BOSSES[e.boss].scale * 0.6, e.z);
                world.scene.add(fm);
                flashes.push({ mesh: fm, born: now, r: BOSSES[e.boss].scale * 1.6 });
                sfx.explosion();
              }
              continue;
            }
            if (e.destructible) {
              // Destroyed deployable: a flash + vanish.
              if (!s.userData.died && world) {
                s.userData.died = true;
                const fm = new THREE.Mesh(ballGeo, new THREE.MeshBasicMaterial({ color: 0xffae3a, transparent: true }));
                fm.position.set(e.x, e.y + 1.4, e.z);
                world.scene.add(fm);
                flashes.push({ mesh: fm, born: now, r: 3 });
                sfx.explosion();
              }
              s.visible = false;
              continue;
            }
            if (e.minion) {
              // Minion death: a quick shrink + sink (Void Spore detonates).
              if (s.userData.deadT === undefined) {
                sfx.enemyDie();
                if (e.minion === 'spore' && world) {
                  const fm = new THREE.Mesh(ballGeo, new THREE.MeshBasicMaterial({ color: 0xc08bff, transparent: true, blending: THREE.AdditiveBlending }));
                  fm.position.set(e.x, e.y + 1.1, e.z);
                  world.scene.add(fm);
                  flashes.push({ mesh: fm, born: now, r: 3 });
                  sfx.explosion();
                }
              }
              const mdt = (s.userData.deadT = ((s.userData.deadT as number) ?? 0) + dt);
              if (mdt >= 0.7) {
                s.visible = false;
                continue;
              }
              s.visible = true;
              s.position.set(e.x, e.y - mdt * 0.6, e.z);
              s.scale.setScalar(MINIONS[e.minion].scale * (1 - mdt / 0.7));
              continue;
            }
            if (s.userData.deadT === undefined) sfx.enemyDie();
            const ddt = (s.userData.deadT = ((s.userData.deadT as number) ?? 0) + dt);
            if (ddt >= 1.4) {
              s.visible = false;
              continue;
            }
            s.visible = true;
            s.position.set(e.x, e.y, e.z);
            poseDeath(s, ddt);
            // A Tank dies catastrophically: a reactor flash + boom.
            if (e.cls === 'tank' && !s.userData.died && world) {
              s.userData.died = true;
              const fm = new THREE.Mesh(ballGeo, new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true }));
              fm.position.set(e.x, e.y + 1, e.z);
              world.scene.add(fm);
              flashes.push({ mesh: fm, born: now, r: 4 });
              sfx.explosion();
            }
            continue;
          }
          s.visible = true;
          const pe = prevEnemyXZ[i] ?? { x: e.x, z: e.z };
          const moveSpeed = Math.hypot(e.x - pe.x, e.z - pe.z) / Math.max(dt, 0.001);
          prevEnemyXZ[i] = { x: e.x, z: e.z };
          const moving = moveSpeed > 0.5; // lower gate so strafing/orbiting bots still visibly walk

          if (e.boss) {
            if (s instanceof THREE.Sprite) {
              const cy = BOSSES[e.boss].scale;
              const bob = Math.abs(Math.sin(e.step * 3.0)) * 0.3;
              s.position.set(e.x, e.y + cy + bob, e.z);
              const mat = s.material as THREE.SpriteMaterial;
              mat.color.setHex(e.hitFlash > 0 ? 0xff7777 : 0xffffff);
            } else {
              // 3D boss: stand on the ground, face the player, animate, flash on hit.
              s.position.set(e.x, e.y, e.z);
              s.rotation.y = Math.atan2(p.x - e.x, p.z - e.z);
              poseBossModel(s as THREE.Group, e.boss, moving, e.step, e.hitFlash, now, e.weakUntil != null && now < e.weakUntil);
            }
          } else if (e.destructible) {
            // Static deployable: hold position; flash red on hit.
            s.position.set(e.x, e.y, e.z);
            const mats = s.userData.bodyMats as THREE.Material[] | undefined;
            if (mats) {
              const hf = e.hitFlash > 0 ? Math.min(1, e.hitFlash / 0.12) : 0;
              for (const m of mats) {
                const sm = m as THREE.MeshStandardMaterial;
                if (sm.emissive) sm.emissive.setRGB(hf * 0.8, hf * 0.12, hf * 0.12);
              }
            }
          } else if (e.minion) {
            s.position.set(e.x, e.y, e.z);
            s.rotation.y = Math.atan2(p.x - e.x, p.z - e.z);
            poseMinion(s as THREE.Group, e.minion, moving, e.step, e.hitFlash, now);
          } else {
            // 3D model: stand on the ground, face the player, animate, flash on hit.
            s.position.set(e.x, e.y, e.z);
            s.rotation.y = Math.atan2(p.x - e.x, p.z - e.z); // forward +Z → faces player
            if (e.cls === 'tank') animateMech(s, dt, moving, e.step, now); // bespoke siege-mech stomp
            else poseEnemy(s, e.cls, moving, e.state === 'alert' || e.muzzle > 0, e.step, e.hitFlash, now, dt, e.muzzle);
            const hf = e.hitFlash > 0 ? Math.min(1, e.hitFlash / 0.12) : 0;
            // Tank "armor breakaway": glows hotter as it breaks down (exposed reactor).
            const dmg = e.cls === 'tank' ? (1 - e.health / e.maxHealth) * 0.6 : 0;
            const mats = s.userData.bodyMats as THREE.Material[] | undefined;
            if (mats) for (const m of mats) (m as THREE.MeshStandardMaterial).emissive.setRGB(Math.max(hf * 0.7, dmg), Math.max(hf * 0.04, dmg * 0.4), hf * 0.04);
            if (e.cls === 'artillery') {
              // Deploy the twin machine guns out of the turret as the player closes in.
              const t = e.mgT ?? 0;
              const mgL = s.userData.mgL as THREE.Object3D | undefined;
              const mgR = s.userData.mgR as THREE.Object3D | undefined;
              if (mgL) mgL.scale.setScalar(Math.max(0.001, t));
              if (mgR) mgR.scale.setScalar(Math.max(0.001, t));
              const flashMat = s.userData.mgFlash as THREE.MeshStandardMaterial | undefined;
              if (flashMat?.emissive) {
                const f = e.muzzle > 0 && t > 0.6 ? 1 : 0; // muzzle flash only while the MGs fire
                flashMat.emissive.setRGB(f, f * 0.7, f * 0.2);
              }
            }
          }

          if (showBar) {
            const ratio = Math.max(0, e.health / e.maxHealth);
            const by = e.y + (e.boss ? 2.6 : 2.15 * (e.bodyH ?? 1) + 0.2); // sit just above the (scaled) head
            barBg[i].position.set(e.x, by, e.z);
            barFill[i].position.set(e.x, by, e.z);
            barFill[i].scale.x = 1.4 * ratio;
            (barFill[i].material as THREE.SpriteMaterial).color.setHex(ratio > 0.5 ? 0xaef5c8 : ratio > 0.25 ? 0xffd27a : 0xff5d6e);
            if (e.shield > 0 && e.maxShield > 0) {
              barShield[i].position.set(e.x, by + 0.17, e.z);
              barShield[i].scale.x = 1.4 * Math.max(0, e.shield / e.maxShield);
            }
          }
        }
        // Feed the live enemies to the outline pass so they pop off the map (desktop).
        if (composer?.outline) composer.outline.selection.set(outlineSel);
        for (let i = tracers.length - 1; i >= 0; i--) {
          if (now > tracers[i].until) {
            world?.scene.remove(tracers[i].line);
            tracers[i].geo.dispose();
            (tracers[i].line.material as THREE.Material).dispose();
            tracers.splice(i, 1);
          }
        }

        // Recoil recovery — snappy settle so the kick reads per shot, then gone.
        recoilKick -= recoilKick * Math.min(1, dt * 7);
        if (recoilKick < 0.0002) recoilKick = 0;
        camera.position.set(p.x, p.y + EYE - (crouchHeld.current && p.onGround ? 0.55 : 0), p.z);
        camera.rotation.y = p.yaw;
        camera.rotation.x = p.pitch + recoilKick;
        // During the Star Destroyer's rift emergence, blend the view off the player's aim and
        // onto the ship so the camera "pans to where it appears from the black hole".
        if (sd && sdCamPan > 0) {
          const look = sd.position;
          const dx = look.x - camera.position.x, dy = look.y - camera.position.y, dz = look.z - camera.position.z;
          const wantYaw = Math.atan2(dx, -dz); // -Z forward
          const wantPitch = Math.atan2(dy, Math.hypot(dx, dz));
          const k = sdCamPan * sdCamPan * (3 - 2 * sdCamPan);
          const lerpAngle = (a: number, b: number) => a + ((((b - a) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI) * k;
          camera.rotation.y = lerpAngle(p.yaw, wantYaw);
          camera.rotation.x = p.pitch + recoilKick + (wantPitch - (p.pitch + recoilKick)) * k;
        }
        // Boss-opening cinematic: pan the camera to frame the boss (ramps in during 'reveal',
        // eases back to the player when the beat ends). Same angle-blend as the SD reveal.
        bossCamK = Math.max(0, Math.min(1, bossCamK + (g.bossCine === 'reveal' ? dt / 0.8 : -dt / 0.6)));
        if (bossCamK > 0.001) {
          const bossE = g.enemies.find((e) => e.boss && e.health > 0);
          if (bossE && bossE.boss) {
            const by = bossE.y + BOSSES[bossE.boss].scale;
            const dx = bossE.x - camera.position.x, dy = by - camera.position.y, dz = bossE.z - camera.position.z;
            const wantYaw = Math.atan2(dx, -dz);
            const wantPitch = Math.atan2(dy, Math.hypot(dx, dz));
            const k = bossCamK * bossCamK * (3 - 2 * bossCamK);
            const lerpAngle = (a: number, b: number) => a + ((((b - a) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI) * k;
            camera.rotation.y = lerpAngle(p.yaw, wantYaw);
            camera.rotation.x = p.pitch + (wantPitch - p.pitch) * k;
          }
        }
        // Blast screen-shake: jitter the camera by the current trauma, then decay it.
        if (shakeMag > 0.001) {
          const s = shakeMag * shakeMag; // ease — small shakes stay subtle
          camera.position.x += (Math.random() - 0.5) * s * 1.3;
          camera.position.y += (Math.random() - 0.5) * s * 1.3;
          camera.position.z += (Math.random() - 0.5) * s * 1.3;
          camera.rotation.z += (Math.random() - 0.5) * s * 0.07;
          shakeMag = Math.max(0, shakeMag - dt * 2.2); // ~0.45s to settle from full
        }
        if (world) {
          if (composer) composer.composer.render(dt);
          else renderer.render(world.scene, camera);
          // 3D viewmodel overlay — pixelated (same buffer), depth-cleared so it
          // never clips world geometry. Hidden under the sniper scope overlay.
          if (viewmodel && zoomLevel.current === 0) viewmodel.render(renderer);
        }

        // Dynamic resolution: nudge the internal buffer to hold ~55-60 fps.
        fpsFrames++;
        fpsTimer += dt;
        if (fpsTimer >= 1) {
          const fps = fpsFrames / fpsTimer;
          fpsFrames = 0;
          fpsTimer = 0;
          const prevScale = renderScale;
          const cap = tier === 'mobile' ? 1.0 : 1.5;
          if (fps < 48) renderScale = Math.max(0.55, renderScale - 0.12);
          else if (fps > 58 && renderScale < cap) renderScale = Math.min(cap, renderScale + 0.06);
          if (renderScale !== prevScale) resize();
        }

        if (now - lastSnap > 70) {
          lastSnap = now;
          const gun = g.guns[g.active];
          snap.health = p.health;
          snap.maxHp = g.maxHp;
          snap.armor = p.armor;
          snap.maxArmor = p.maxArmor;
          snap.stamina = stamina.current;
          snap.weapon = gun.name;
          snap.family = gun.family;
          snap.mag = g.mags[g.active];
          snap.reserve = g.reserves[g.active];
          snap.reloading = g.reloading > 0;
          snap.reloadProgress = g.reloading > 0 && gun.reload > 0 ? Math.max(0, Math.min(1, 1 - g.reloading / gun.reload)) : 0;
          snap.ads = g.ads;
          snap.scoped = gun.scoped;
          snap.heat = gun.heat ? heat.current : undefined;
          snap.overheated = gun.heat ? overheat.current > 0 : undefined;
          snap.charge = gun.charge ? Math.min(1, chargeT.current / gun.charge) : undefined;
          snap.slots = g.guns.map((gg, i) => ({ name: gg.name, active: i === g.active }));
          snap.throwName = g.throwable.name;
          snap.throwCount = g.throwCount;
          // One pass over the enemies for the HUD: boss bars, brood count, alive count,
          // and radar blips (rotated into player-facing space, forward = up).
          const sinY = Math.sin(p.yaw);
          const cosY = Math.cos(p.yaw);
          let broodCount = 0;
          let aliveLeft = 0;
          const bossList: { name: string; ratio: number; phase: number; status: string; brood: number; shield?: number }[] = [];
          const radar: { x: number; z: number; boss: boolean; kind?: 'ammo' | 'shield' | 'health' }[] = [];
          for (const e of g.enemies) {
            if (e.health <= 0) continue;
            if (e.minion && !e.dormant) broodCount++;
            if (e.boss) {
              const ratio = e.health / e.maxHealth;
              const phase = ratio > 0.65 ? 1 : ratio > 0.35 ? 2 : ratio > 0.15 ? 3 : 4;
              const status =
                e.weakUntil && now < e.weakUntil
                  ? 'VULNERABLE'
                  : e.bossBrain?.pounce === 'windup' || e.bossBrain?.pounce === 'leap'
                    ? 'POUNCING'
                    : phase === 4
                      ? 'ENRAGED'
                      : 'HUNTING';
              bossList.push({ name: BOSSES[e.boss].name, ratio, phase, status, brood: 0 });
            }
            if (!e.dormant && !e.destructible) {
              aliveLeft++;
              const dx = e.x - p.x;
              const dz = e.z - p.z;
              radar.push({ x: dx * cosY - dz * sinY, z: -dx * sinY - dz * cosY, boss: e.boss != null });
            }
          }
          for (const b of bossList) b.brood = broodCount; // stamp once the count is known
          // Star Destroyer dogfight: SD as a boss health bar (brood = fighters left) + craft on radar/objective.
          if (sd && (sdPhase === 'combat' || sdPhase === 'depart')) {
            const ratio = Math.max(0, sdHp / sdMax);
            bossList.push({ name: 'STAR DESTROYER', ratio, phase: ratio > 0.5 ? 1 : ratio > 0.2 ? 2 : 3, status: sdCrippled ? 'HULL BREACH' : sdShield > 0 ? 'SHIELDED' : 'BOMBARDING', brood: fighters.reduce((n, f) => n + (f.health > 0 ? 1 : 0), 0), shield: Math.max(0, sdShield / sdShieldMax) });
            const sdx = sdFinal.x - p.x, sdz = sdFinal.z - p.z;
            radar.push({ x: sdx * cosY - sdz * sinY, z: -sdx * sinY - sdz * cosY, boss: true });
          }
          for (const f of fighters) {
            if (f.health <= 0) continue;
            aliveLeft++;
            const dx = f.x - p.x, dz = f.z - p.z;
            radar.push({ x: dx * cosY - dz * sinY, z: -dx * sinY - dz * cosY, boss: false });
          }
          snap.bosses = bossList;
          snap.enemiesLeft = aliveLeft;
          snap.radar = radar;
          snap.shakeMag = shakeMag; // reflect the decaying trauma so the HUD shake eases out
          snap.overdrive = (g.weaponBuff ?? 1) > 1;
          snap.status = g.status;
          snap.kills = g.kills;
          snap.headshots = g.headshots;
          snap.shotsFired = g.shotsFired;
          snap.shotsHit = g.shotsHit;
          snap.dmgDealt = g.dmgDealt;
          // (Pickups are not shown on the radar — the in-world icon is enough to find them.)
          onSnapshot({ ...snap });
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('contextmenu', onCtx);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('wheel', onWheel);
      if (document.pointerLockElement === canvas) document.exitPointerLock?.();
      disposeExtras();
      ro.disconnect();
      window.removeEventListener('orientationchange', onViewport);
      window.removeEventListener('resize', onViewport);
      window.visualViewport?.removeEventListener('resize', onViewport);
      document.removeEventListener('visibilitychange', onVisible);
      if (activeLoop) sfx.playWeaponLoopStop(activeLoop);
      if (sd) disposeSd(sd);
      if (blackHole) disposeSd(blackHole);
      disposeFighters();
      world?.dispose();
      ballGeo.dispose();
      projectiles.dispose();
      telegraphs.dispose();
      viewmodel?.dispose();
      composer?.composer.dispose();
      renderer.dispose();
    };
  }, [canvasRef, gameRef, active, onSnapshot]);

  return { setMoveAxis, addLook, cycleWeapon, cycleZoom, setSensitivity, setAimAssist, setInvertY, setFire, setCrouch, setSprint, throwGrenade, jump, reload, grapple };
}
