'use client';

import { useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { buildWorld, type World } from './fps/scene';
import { EYE, MAX_PITCH, stepPlayer, type Player3 } from './fps/physics';
import type { Level3D } from './fps/level3d';
import { updateEnemies, hurtEnemy, BOSSES, type Difficulty, type Enemy, type Squad, type Smoke } from './fps/enemy';
import { rayWallDist, raySphere, segBlocked, type Vec3 } from './fps/combat';
import { bossTex } from './fps/textures';
import { buildEnemyModel, disposeEnemyModel } from './fps/enemies/models';
import { poseDeath, poseEnemy } from './fps/enemies/animator';
import type { GunDef, ThrowDef } from './fps/weapons';
import { sfx } from './engine/audio';
import { makeComposer } from './fps/postfx';
import { Viewmodel } from './fps/viewmodel';
import type { RenderTier } from './fps/materials';
import { SpatialGrid } from './fps/level/grid';
import { buildNavGraph, type NavGraph } from './fps/level/nav';

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
  squad: Squad;
  maxHp: number;
}

export interface FpsSnapshot {
  health: number;
  maxHp: number;
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
  bosses: { name: string; ratio: number }[];
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
  radar: { x: number; z: number; boss: boolean }[]; // enemy positions, player-relative
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
    // Enemy actors: a 3D model Group for regular enemies, a billboard Sprite for
    // bosses. Indexed parallel to g.enemies.
    let sprites: THREE.Object3D[] = [];
    let barBg: THREE.Sprite[] = [];
    let barFill: THREE.Sprite[] = [];
    let barShield: THREE.Sprite[] = [];
    let prevEnemyXZ: { x: number; z: number }[] = [];
    let bossTexes: THREE.CanvasTexture[] = [];
    const tracers: { line: THREE.Line; geo: THREE.BufferGeometry; until: number }[] = [];
    let recoilKick = 0; // current view recoil (radians), decays to 0
    const grenades: Grenade[] = [];
    const smokes: SmokeFx[] = [];
    const flashes: Flash[] = [];
    const zones: Zone[] = [];
    let lastSnap = 0;
    const snap: FpsSnapshot = {
      health: 100, maxHp: 100, weapon: '', family: '', mag: 0, reserve: 0, reloading: false, ads: false, scoped: false,
      slots: [], throwName: '', throwCount: 0, bosses: [], enemiesLeft: 0, status: 'playing', kills: 0, shotsFired: 0, shotsHit: 0, dmgDealt: 0, hitAt: 0, fireAt: 0, hurtAt: 0, flashAt: 0, stunAt: 0, radar: [],
    };
    const prevPos = { x: 0, z: 0 };

    const clearMesh = (m: THREE.Mesh) => {
      world?.scene.remove(m);
      (m.material as THREE.Material).dispose();
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
      grenades.length = 0;
      smokes.length = 0;
      flashes.length = 0;
      zones.length = 0;
    };

    const buildFor = (g: FpsGameState) => {
      disposeExtras();
      world?.dispose();
      world = buildWorld(g.level, tier);
      // (Re)build the spatial grid for this level's boxes.
      grid = SpatialGrid.build(g.level.boxes);
      // (Re)build the enemy nav graph for this level (grid-accelerated).
      nav = buildNavGraph(g.level, grid);
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
          if (!bossCache[e.boss]) {
            const t = mk(bossTex(e.boss));
            bossCache[e.boss] = t;
            bossTexes.push(t);
          }
          const bd = BOSSES[e.boss];
          const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: bossCache[e.boss]!, transparent: true }));
          s.scale.set(1.5 * bd.scale, 2.0 * bd.scale, 1);
          world!.scene.add(s);
          return s;
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

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'r') reloadReq.current = true;
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
          const wantShot = gun.auto ? fireInput : fireInput && !prevFire.current;
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
            const wallD = rayWallDist(eye, sdir, g.level, RANGE, grid ?? undefined);
            let hitT = wallD;
            let hit: Enemy | null = null;
            for (const e of g.enemies) {
              if (e.health <= 0) continue;
              const hr = e.boss ? BOSSES[e.boss].radius : ENEMY_R;
              const ecy = e.boss ? BOSSES[e.boss].scale : 1.0;
              const t = raySphere(eye, sdir, [e.x, e.y + ecy, e.z], hr);
              if (t < hitT) {
                hitT = t;
                hit = e;
              }
            }
            addTracer([eye[0] + sfx2 * 0.4, eye[1] - 0.12, eye[2] + sfz2 * 0.4], [eye[0] + sfx2 * hitT, eye[1] + sfy2 * hitT, eye[2] + sfz2 * hitT], gun.color);
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
                  const dd = Math.round(gun.dmg * (1 - d / gun.splash));
                  hurtEnemy(e, dd);
                  g.dmgDealt += dd;
                  e.hitFlash = 0.12;
                  e.alarm = 4;
                  e.state = 'alert';
                  e.lastSeen = { x: p.x, z: p.z };
                  e.barUntil = now + 2500;
                  anyHit = true;
                  if (e.health <= 0) g.kills++;
                }
              }
              if (world) {
                const fm = new THREE.Mesh(ballGeo, new THREE.MeshBasicMaterial({ color: gun.color, transparent: true, blending: THREE.AdditiveBlending }));
                fm.position.set(ix, iy, iz);
                world.scene.add(fm);
                flashes.push({ mesh: fm, born: now, r: gun.splash * zoomBoost });
              }
              sfx.explosion();
              g.squad.lastKnown = { x: p.x, z: p.z };
              g.squad.t = now;
              if (anyHit) {
                g.shotsHit++;
                snap.hitAt = now;
                sfx.playImpact(gun.id, 'enemy');
              }
            } else {
              if (hit) {
                hurtEnemy(hit, gun.dmg);
                g.dmgDealt += gun.dmg;
                g.shotsHit++;
                hit.hitFlash = 0.12;
                hit.alarm = 4;
                hit.state = 'alert';
                hit.lastSeen = { x: p.x, z: p.z };
                hit.barUntil = now + 2500;
                g.squad.lastKnown = { x: p.x, z: p.z };
                g.squad.t = now;
                snap.hitAt = now;
                sfx.playImpact(gun.id, 'enemy');
                if (hit.health <= 0) g.kills++;
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

          // Grenade sim + detonation
          for (let i = grenades.length - 1; i >= 0; i--) {
            const gr = grenades[i];
            gr.vy -= 22 * dt;
            gr.x += gr.vx * dt;
            gr.y += gr.vy * dt;
            gr.z += gr.vz * dt;
            if (gr.y < 0.2) {
              gr.y = 0.2;
              gr.vy *= -0.4;
              gr.vx *= 0.6;
              gr.vz *= 0.6;
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
                    if (e.health <= 0) g.kills++;
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
              // Damaging/loud throwables cue the squad to the spot.
              if (t.blast.dmg > 0 || t.status?.stun || t.cluster) {
                g.squad.lastKnown = { x: cx, z: cz };
                g.squad.t = now;
              }
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
                  if (e.health <= 0) g.kills++;
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
              g.squad.lastKnown = { x: z.x, z: z.z };
              g.squad.t = now;
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
              if (e.health <= 0) g.kills++;
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

          // Enemies
          const res = updateEnemies(g.enemies, p, g.level, g.difficulty, pvx, pvz, dt, now, g.squad, smokes, grid ?? undefined, nav ?? undefined);
          for (const tr of res.tracers) addTracer(tr.from, [p.x, p.y + EYE - 0.1, p.z], tr.color);
          if (res.damage > 0) {
            p.health = Math.max(0, p.health - res.damage);
            snap.hurtAt = now;
            sfx.hurt();
            if (p.health <= 0) g.status = 'lost';
          }
          if (res.seen || res.damage > 0) g.regenT = 0;
          else {
            g.regenT += dt;
            if (g.regenT > 2) p.health = Math.min(g.maxHp, p.health + 24 * dt);
          }
          // Drive the 3D viewmodel (bob from movement; recoil/flash/reload poses
          // were triggered by the fire/reload hooks above). Drawn after the world.
          viewmodel?.update(dt, Math.hypot(pvx, pvz), g.reloading);

          if (g.enemies.every((e) => e.health <= 0)) g.status = 'won';
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
          const alive = e.health > 0;
          const showBar = alive && !e.boss && now < e.barUntil; // bosses use the top bar
          barBg[i].visible = showBar;
          barFill[i].visible = showBar;
          barShield[i].visible = showBar && e.shield > 0;
          if (!alive) {
            // Death: bosses just vanish; 3D enemies topple over then disappear.
            if (e.boss) {
              s.visible = false;
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
            const cy = BOSSES[e.boss].scale;
            const bob = Math.abs(Math.sin(e.step * 3.0)) * 0.3;
            s.position.set(e.x, e.y + cy + bob, e.z);
            const mat = (s as THREE.Sprite).material as THREE.SpriteMaterial;
            mat.color.setHex(e.hitFlash > 0 ? 0xff7777 : 0xffffff);
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
          snap.bosses = g.enemies
            .filter((e) => e.boss && e.health > 0)
            .map((e) => ({ name: BOSSES[e.boss!].name, ratio: e.health / e.maxHealth }));
          snap.enemiesLeft = g.enemies.filter((e) => e.health > 0).length;
          snap.status = g.status;
          snap.kills = g.kills;
          snap.shotsFired = g.shotsFired;
          snap.shotsHit = g.shotsHit;
          snap.dmgDealt = g.dmgDealt;
          // Radar: enemy positions rotated into player-facing space (forward = up).
          const sinY = Math.sin(p.yaw);
          const cosY = Math.cos(p.yaw);
          snap.radar = g.enemies
            .filter((e) => e.health > 0)
            .map((e) => {
              const dx = e.x - p.x;
              const dz = e.z - p.z;
              const right = dx * cosY - dz * sinY;
              const forward = -dx * sinY - dz * cosY;
              return { x: right, z: forward, boss: e.boss != null };
            });
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
      viewmodel?.dispose();
      composer?.composer.dispose();
      renderer.dispose();
    };
  }, [canvasRef, gameRef, active, onSnapshot]);

  return { setMoveAxis, addLook, cycleWeapon, cycleZoom, setSensitivity, setAimAssist, setInvertY, throwGrenade, jump, reload };
}
