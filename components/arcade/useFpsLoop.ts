'use client';

import { useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { buildWorld, type World } from './fps/scene';
import { EYE, MAX_PITCH, launchPlayer, pushPlayer, startGrapple, stepPlayer, type Player3 } from './fps/physics';
import type { Level3D } from './fps/level3d';
import { updateEnemies, hurtEnemy, BOSSES, type Difficulty, type Enemy, type Squad, type Smoke } from './fps/enemy';
import { rayWallBox, raySphere, segBlocked, type Vec3 } from './fps/combat';
import type { Box } from './fps/level3d';
import { bossTex } from './fps/textures';
import { buildEnemyModel, disposeEnemyModel } from './fps/enemies/models';
import { poseDeath, poseEnemy } from './fps/enemies/animator';
import { buildBossModel, buildDestructibleModel } from './fps/boss/models';
import { poseBossDeath, poseBossModel } from './fps/boss/animator';
import { MINIONS, buildMinionModel, poseMinion } from './fps/boss/minions';
import type { GunDef, ThrowDef } from './fps/weapons';
import { sfx } from './engine/audio';
import { makeComposer } from './fps/postfx';
import { Viewmodel } from './fps/viewmodel';
import type { RenderTier } from './fps/materials';
import { SpatialGrid } from './fps/level/grid';
import { buildNavGraph, type NavGraph } from './fps/level/nav';
import { ProjectileSystem } from './fps/projectiles';
import { TelegraphSystem } from './fps/telegraph';

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
// How many zoom steps a weapon has past the hip: snipers get 3 (3× scope),
// everything else gets a single ADS zoom. Sidearms (pistols) included = 1.
const maxZoomFor = (gun: GunDef) => (gun.scoped ? 3 : 1);

export interface FpsGameState {
  level: Level3D;
  player: Player3;
  enemies: Enemy[];
  difficulty: Difficulty;
  guns: GunDef[];
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
  shotsFired: number;
  shotsHit: number;
  dmgDealt: number;
  regenT: number;
  squads: Squad[]; // one shared-intel object per squad (independent squads)
  maxHp: number;
  god?: boolean; // dev: invincible (health stays full)
  elapsed: number; // seconds since the level started (combat lock + boss grace)
}

export interface FpsSnapshot {
  health: number;
  maxHp: number;
  armor: number; // overshield (soaks damage before health)
  maxArmor: number;
  pickupAt: number; // timestamp of the last ammo/shield pickup (HUD flash)
  weapon: string;
  family: string;
  mag: number;
  reserve: number;
  reloading: boolean;
  ads: boolean;
  scoped: boolean;
  slots: { name: string; active: boolean }[];
  throwName: string;
  throwCount: number;
  bosses: { name: string; ratio: number; phase: number; status: string; brood: number }[];
  enemiesLeft: number;
  status: 'playing' | 'won' | 'lost';
  kills: number;
  shotsFired: number;
  shotsHit: number;
  dmgDealt: number;
  hitAt: number;
  fireAt: number;
  hurtAt: number;
  flashAt: number; // player flashbanged
  stunAt: number; // player caught in a stun/concussion blast (screen distortion)
  fogAt: number; // Kraken void fog cast (vision-obscuring overlay)
  grappleReady: boolean; // a rooftop grapple point is aimable right now
  radar: { x: number; z: number; boss: boolean; kind?: 'ammo' | 'shield' | 'health' }[]; // enemies + pickups, player-relative
}

interface Grenade { x: number; y: number; z: number; vx: number; vy: number; vz: number; fuse: number; mesh: THREE.Mesh }
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
  const zoomLevel = useRef(0); // 0 = hip, 1 = zoom, 2 = deep zoom (right-click cycles)
  const sens = useRef(1); // look-sensitivity multiplier (user-adjustable)
  const aimAssistOn = useRef(true); // touch aim assist (settings)
  const invertY = useRef(false); // invert look pitch (settings)
  const reloadReq = useRef(false);
  const throwReq = useRef(false);
  const jumpReq = useRef(false);
  const grappleReq = useRef(false);
  const prevFire = useRef(false);
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
    // DYNAMIC render resolution — the internal buffer matches the canvas aspect (so
    // a full-screen game never stretches) at a perf-scaled retro resolution (NEAREST
    // filter retained). renderScale flexes with measured FPS to hold a stable frame.
    let renderScale = tier === 'mobile' ? 0.8 : 1.0;
    let fpsFrames = 0;
    let fpsTimer = 0;
    const BASE_H = 270;
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
    const projectiles = new ProjectileSystem(); // boss/minion projectiles (P0; spawned from P1)
    const telegraphs = new TelegraphSystem(); // ground warning decals (P0; spawned from P1)
    const bossHazards: { x: number; z: number; r: number; until: number; dps: number; mesh: THREE.Mesh; pull?: number }[] = []; // acid puddles / pull vortices
    let recoilKick = 0; // current view recoil (radians), decays to 0
    const grenades: Grenade[] = [];
    const smokes: SmokeFx[] = [];
    const flashes: Flash[] = [];
    const zones: Zone[] = [];
    // Player pickups: enemies drop these; auto-collected on proximity.
    const drops: { x: number; y: number; z: number; kind: 'ammo' | 'shield'; mesh: THREE.Object3D; born: number }[] = [];
    // Placed pickups (from the arena's ammo/shield/health crates): dynamic symbols that
    // RELOCATE to a new open spot after being collected.
    const pickups: { kind: 'ammo' | 'shield' | 'health'; x: number; z: number; mesh: THREE.Group; respawnT: number; born: number }[] = [];
    let lastSnap = 0;
    const snap: FpsSnapshot = {
      health: 100, maxHp: 100, armor: 0, maxArmor: 100, pickupAt: 0, weapon: '', family: '', mag: 0, reserve: 0, reloading: false, ads: false, scoped: false,
      slots: [], throwName: '', throwCount: 0, bosses: [], enemiesLeft: 0, status: 'playing', kills: 0, shotsFired: 0, shotsHit: 0, dmgDealt: 0, hitAt: 0, fireAt: 0, hurtAt: 0, flashAt: 0, stunAt: 0, fogAt: 0, grappleReady: false, radar: [],
    };
    const prevPos = { x: 0, z: 0 };

    const clearMesh = (m: THREE.Mesh) => {
      world?.scene.remove(m);
      (m.material as THREE.Material).dispose();
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
      for (const z of zones) clearMesh(z.mesh);
      for (const d of drops) clearGroup(d.mesh);
      for (const pk of pickups) clearGroup(pk.mesh);
      grenades.length = 0;
      smokes.length = 0;
      flashes.length = 0;
      zones.length = 0;
      drops.length = 0;
      pickups.length = 0;
      projectiles.clear();
      telegraphs.clear();
      for (const hz of bossHazards) clearMesh(hz.mesh);
      bossHazards.length = 0;
    };

    const buildFor = (g: FpsGameState) => {
      disposeExtras();
      world?.dispose();
      world = buildWorld(g.level, tier);
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
      // Build the viewmodel once; (re)load the active gun for this level.
      if (!viewmodel) viewmodel = new Viewmodel(tier, RW / RH);
      viewmodel.setGun(g.guns[g.active].id);
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
      if (b.dead) return;
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
      if (k === '1' || k === '2' || k === '3') switchReq.current = Number(k) - 1;
      if (k === 'w' || k === 'a' || k === 's' || k === 'd' || k === ' ' || k.startsWith('arrow')) {
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
        const p = g.player;
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
          if (p.armor > 0) {
            const soak = Math.min(p.armor, amount);
            p.armor -= soak;
            amount -= soak;
          }
          if (amount > 0) p.health = Math.max(0, p.health - amount);
          snap.hurtAt = now;
          if (p.health <= 0) g.status = 'lost';
        };
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
        if (lookDX.current !== 0) {
          p.yaw -= lookDX.current * ls * aimSlow;
          lookDX.current = 0;
        }
        if (lookDY.current !== 0) {
          const iy = invertY.current ? -1 : 1;
          p.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, p.pitch - lookDY.current * ls * aimSlow * iy));
          lookDY.current = 0;
        }
        if (assist && hadLook) {
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

        if (g.status === 'playing') {
          g.elapsed += dt; // level clock for the start-of-match combat lock + boss grace
          if (switchReq.current !== null) {
            const n = g.guns.length;
            const req = switchReq.current;
            g.active = req === 'next' ? (g.active + 1) % n : req === 'prev' ? (g.active - 1 + n) % n : Math.min(n - 1, Math.max(0, req));
            switchReq.current = null;
            g.reloading = 0;
            g.fireCd = 0.22;
            zoomLevel.current = 0; // swapping weapons drops you back to the hip
            viewmodel?.setGun(g.guns[g.active].id);
            sfx.swap();
          }
          const gun = g.guns[g.active];

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
          stepPlayer(p, g.level, { fwd, strafe, jump: jumpNow }, dt, grid ?? undefined);
          const pvx = (p.x - prevPos.x) / Math.max(dt, 0.001);
          const pvz = (p.z - prevPos.z) / Math.max(dt, 0.001);
          prevPos.x = p.x;
          prevPos.z = p.z;

          const cp = Math.cos(p.pitch);
          const fx = -cp * Math.sin(p.yaw);
          const fy = Math.sin(p.pitch);
          const fz = -cp * Math.cos(p.yaw);
          const eye: Vec3 = [p.x, p.y + EYE, p.z];
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
            if (g.reloading <= 0 && g.mags[g.active] < gun.mag && g.reserves[g.active] > 0) {
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

          const fireInput = fireHeld.current || autoFire;
          // COMBAT LOCK: no shooting (either side) until the match-intro countdown
          // finishes (~2.8 s). Movement is free; firing is held.
          const locked = g.elapsed < 2.8;
          const wantShot = !locked && (gun.auto ? fireInput : fireInput && !prevFire.current);
          prevFire.current = fireInput;

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

          if (wantShot && g.fireCd <= 0 && g.reloading <= 0 && g.mags[g.active] > 0) {
            g.fireCd = gun.rate;
            g.mags[g.active]--;
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
            const wb = rayWallBox(eye, sdir, g.level, RANGE);
            const wallD = wb.t;
            let hitT = wallD;
            let hit: Enemy | null = null;
            for (const e of g.enemies) {
              if (e.health <= 0) continue;
              const hr = e.destructible === 'shield' ? 3.0 : e.boss ? BOSSES[e.boss].radius : ENEMY_R; // shield = a wide blocker
              const ecy = e.boss ? BOSSES[e.boss].scale : 1.0;
              const t = raySphere(eye, sdir, [e.x, e.y + ecy, e.z], hr);
              if (t < hitT) {
                hitT = t;
                hit = e;
              }
            }
            addTracer([eye[0] + sfx2 * 0.4, eye[1] - 0.12, eye[2] + sfz2 * 0.4], [eye[0] + sfx2 * hitT, eye[1] + sfy2 * hitT, eye[2] + sfz2 * hitT], gun.color);
            // Chip the structure the shot hit (if the wall was the nearest thing).
            if (!hit && wb.box && wallD < RANGE) {
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
                  const dd = Math.round(gun.dmg * (1 - d / gun.splash) * wm);
                  hurtEnemy(e, dd);
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
              if (world) {
                const fm = new THREE.Mesh(ballGeo, new THREE.MeshBasicMaterial({ color: gun.color, transparent: true, blending: THREE.AdditiveBlending }));
                fm.position.set(ix, iy, iz);
                world.scene.add(fm);
                flashes.push({ mesh: fm, born: now, r: gun.splash * zoomBoost });
              }
              sfx.explosion();
              cueSquads(p.x, p.z);
              if (anyHit) {
                g.shotsHit++;
                snap.hitAt = now;
                sfx.playImpact(gun.id, 'enemy');
              }
            } else {
              if (hit) {
                // Boss weak-point window (after a missed pounce) = bonus damage.
                const wm = hit.boss && hit.weakUntil && now < hit.weakUntil ? 2.5 : 1;
                hurtEnemy(hit, gun.dmg * wm);
                g.dmgDealt += gun.dmg * wm;
                g.shotsHit++;
                hit.hitFlash = 0.12;
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
                const base = (hit ? (gun.family === 'sniper' ? 2.2 : 1.3) : 0.7) * zoomBoost;
                const fm = new THREE.Mesh(ballGeo, new THREE.MeshBasicMaterial({ color: hit ? gun.color : 0xffe6b0, transparent: true, blending: THREE.AdditiveBlending }));
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
            } else if (grHitsBox(gr.x, ny, gr.z)) {
              gr.vy *= -0.5;
            } else {
              gr.y = ny;
            }
            gr.fuse -= dt;
            gr.mesh.position.set(gr.x, gr.y, gr.z);
            if (gr.fuse <= 0) {
              const t = g.throwable;
              const cx = gr.x;
              const cy = gr.y;
              const cz = gr.z;
              sfx.playThrowable(t.id, 'blast'); // per-throwable detonation (all 12)
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
              const spawnFlash = (bx: number, by: number, bz: number, radius: number, color: number) => {
                if (!world) return;
                const fm = new THREE.Mesh(ballGeo, new THREE.MeshBasicMaterial({ color, transparent: true }));
                fm.position.set(bx, by, bz);
                world.scene.add(fm);
                flashes.push({ mesh: fm, born: now, r: radius });
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
                spawnFlash(cx, cy, cz, t.blast.radius, t.color);
              }
              // Cluster: a spread of smaller secondary blasts.
              if (t.cluster) {
                for (let k = 0; k < t.cluster; k++) {
                  const ox = cx + (Math.random() * 2 - 1) * t.blast.radius;
                  const oz = cz + (Math.random() * 2 - 1) * t.blast.radius;
                  anyHit = blastAt(ox, 0.6, oz, t.blast.dmg * 0.6, t.blast.radius * 0.7) || anyHit;
                  spawnFlash(ox, 0.8, oz, t.blast.radius * 0.7, t.color);
                }
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
                if (z.kind === 'smoke' || z.kind === 'gas') {
                  const sm = new THREE.Mesh(ballGeo, new THREE.MeshBasicMaterial({ color: t.color, transparent: true, opacity: 0.5, depthWrite: false }));
                  sm.position.set(cx, 1.6, cz);
                  sm.scale.setScalar(0.5);
                  world.scene.add(sm);
                  smokes.push({ x: cx, y: 1.6, z: cz, r: z.radius, until: now + z.duration * 1000, born: now, dur: z.duration * 1000, dps: z.dps ?? 0, mesh: sm });
                  if (z.kind === 'gas') sfx.gas();
                  else sfx.hurt();
                } else {
                  const zm = new THREE.Mesh(ballGeo, new THREE.MeshBasicMaterial({ color: t.color, transparent: true, opacity: 0.42, depthWrite: false }));
                  zm.position.set(cx, 0.3, cz);
                  zm.scale.set(z.radius, 0.3, z.radius);
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
            for (const im of projectiles.update(dt, p, g.level, grid ?? undefined)) {
              if (im.dmg > 0) {
                hurtPlayer(im.dmg);
                recoilKick = Math.min(0.16, recoilKick + 0.03); // impact shake
                sfx.hurt();
              }
              if (world) {
                const fm = new THREE.Mesh(ballGeo, new THREE.MeshBasicMaterial({ color: im.color, transparent: true, blending: THREE.AdditiveBlending }));
                fm.position.set(im.x, im.y, im.z);
                world.scene.add(fm);
                flashes.push({ mesh: fm, born: now, r: Math.max(1.2, im.splash || 1.2) });
                // Acid spit leaves a lingering puddle that denies that ground.
                if (im.kind === 'acid') {
                  const pm = new THREE.Mesh(ballGeo, new THREE.MeshBasicMaterial({ color: 0x6aff7a, transparent: true, opacity: 0.4, depthWrite: false }));
                  pm.position.set(im.x, 0.06, im.z);
                  pm.scale.set(2.4, 0.05, 2.4);
                  world.scene.add(pm);
                  bossHazards.push({ x: im.x, z: im.z, r: 2.4, until: now + 4200, dps: 14, mesh: pm });
                }
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

          // Drops: spin + bob, and AUTO-COLLECT on proximity. Ammo tops up every gun's
          // reserve; shield refills the overshield. (Must be near the drop's height so
          // rooftop drops aren't grabbed from the ground below.)
          for (let i = drops.length - 1; i >= 0; i--) {
            const d = drops[i];
            d.mesh.rotation.y += dt * 2.4;
            d.mesh.position.y = d.y + 0.6 + Math.sin((now - d.born) / 300) * 0.12;
            if (Math.hypot(d.x - p.x, d.z - p.z) < 1.7 && Math.abs(p.y - d.y) < 2.2) {
              if (d.kind === 'ammo') {
                for (let gi = 0; gi < g.guns.length; gi++) {
                  const base = g.guns[gi].reserve;
                  g.reserves[gi] = Math.min(Math.ceil(base * 1.5), g.reserves[gi] + Math.ceil(base * 0.25));
                }
              } else {
                p.armor = Math.min(p.maxArmor, p.armor + 35);
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
              if (p.y < 3 && Math.hypot(pk.x - p.x, pk.z - p.z) < 2.2) {
                if (pk.kind === 'ammo') refillAmmo(0.5);
                else if (pk.kind === 'shield') p.armor = Math.min(p.maxArmor, p.armor + 50);
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
          for (let s = 0; s < g.squads.length; s++) {
            const group = squadGroups[s];
            if (!group || !group.length) continue;
            const res = updateEnemies(group, p, g.level, g.difficulty, pvx, pvz, dt, now, g.squads[s], smokes, grid ?? undefined, nav ?? undefined, g.elapsed);
            for (const tr of res.tracers) addTracer(tr.from, [p.x, p.y + EYE - 0.1, p.z], tr.color);
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
            if (res.seen) anySeen = true;
          }
          if (totalDamage > 0) {
            hurtPlayer(totalDamage);
            sfx.hurt();
          }
          if (anySeen || totalDamage > 0) g.regenT = 0;
          else {
            g.regenT += dt;
            if (g.regenT > 2) p.health = Math.min(g.maxHp, p.health + 24 * dt);
          }
          if (g.god) p.health = g.maxHp; // dev god-mode: stay topped up after all damage
          // Drive the 3D viewmodel (bob from movement; recoil/flash/reload poses
          // were triggered by the fire/reload hooks above). Drawn after the world.
          viewmodel?.update(dt, Math.hypot(pvx, pvz), g.reloading);

          // Boss levels are won when the BOSS dies (its summoned minions then
          // don't block the clear); normal levels when every enemy is down.
          const hasBoss = g.enemies.some((e) => e.boss);
          if (hasBoss ? !g.enemies.some((e) => e.boss && e.health > 0) : g.enemies.every((e) => e.health <= 0)) g.status = 'won';
        }
        // Kill any sustained loop if we left the playing state (win/lose/pause).
        if (activeLoop && g.status !== 'playing') {
          sfx.playWeaponLoopStop(activeLoop);
          activeLoop = null;
        }

        // Enemy actors (3D models for regulars, billboard sprites for bosses).
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
          const moving = moveSpeed > 1.4;

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
            poseEnemy(s, e.cls, moving, e.state === 'alert' || e.muzzle > 0, e.step, e.hitFlash, now);
            const hf = e.hitFlash > 0 ? Math.min(1, e.hitFlash / 0.12) : 0;
            // Tank "armor breakaway": glows hotter as it breaks down (exposed reactor).
            const dmg = e.cls === 'tank' ? (1 - e.health / e.maxHealth) * 0.6 : 0;
            const mats = s.userData.bodyMats as THREE.Material[] | undefined;
            if (mats) for (const m of mats) (m as THREE.MeshStandardMaterial).emissive.setRGB(Math.max(hf * 0.7, dmg), Math.max(hf * 0.04, dmg * 0.4), hf * 0.04);
          }

          if (showBar) {
            const ratio = Math.max(0, e.health / e.maxHealth);
            const by = e.y + 2.6;
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
        camera.position.set(p.x, p.y + EYE, p.z);
        camera.rotation.y = p.yaw;
        camera.rotation.x = p.pitch + recoilKick;
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
          snap.weapon = gun.name;
          snap.family = gun.family;
          snap.mag = g.mags[g.active];
          snap.reserve = g.reserves[g.active];
          snap.reloading = g.reloading > 0;
          snap.ads = g.ads;
          snap.scoped = gun.scoped;
          snap.slots = g.guns.map((gg, i) => ({ name: gg.name, active: i === g.active }));
          snap.throwName = g.throwable.name;
          snap.throwCount = g.throwCount;
          // One pass over the enemies for the HUD: boss bars, brood count, alive count,
          // and radar blips (rotated into player-facing space, forward = up).
          const sinY = Math.sin(p.yaw);
          const cosY = Math.cos(p.yaw);
          let broodCount = 0;
          let aliveLeft = 0;
          const bossList: { name: string; ratio: number; phase: number; status: string; brood: number }[] = [];
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
          snap.bosses = bossList;
          snap.enemiesLeft = aliveLeft;
          snap.radar = radar;
          snap.status = g.status;
          snap.kills = g.kills;
          snap.shotsFired = g.shotsFired;
          snap.shotsHit = g.shotsHit;
          snap.dmgDealt = g.dmgDealt;
          // Ammo / shield / health pickups on the radar (colour-coded dots). Hidden
          // while respawning.
          for (const pk of pickups) {
            if (!pk.mesh.visible) continue;
            const dx = pk.x - p.x;
            const dz = pk.z - p.z;
            snap.radar.push({ x: dx * cosY - dz * sinY, z: -dx * sinY - dz * cosY, boss: false, kind: pk.kind });
          }
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
      world?.dispose();
      ballGeo.dispose();
      projectiles.dispose();
      telegraphs.dispose();
      viewmodel?.dispose();
      composer?.composer.dispose();
      renderer.dispose();
    };
  }, [canvasRef, gameRef, active, onSnapshot]);

  return { setMoveAxis, addLook, cycleWeapon, cycleZoom, setSensitivity, setAimAssist, setInvertY, throwGrenade, jump, reload, grapple };
}
