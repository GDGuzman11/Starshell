'use client';

import { useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { buildWorld, type World } from './fps/scene';
import { EYE, MAX_PITCH, stepPlayer, type Player3 } from './fps/physics';
import type { Level3D } from './fps/level3d';
import { updateEnemies, BOSSES, type Difficulty, type Enemy, type Squad, type Smoke } from './fps/enemy';
import { rayWallDist, raySphere, segBlocked, type Vec3 } from './fps/combat';
import { enemyTex, bossTex } from './fps/textures';
import type { GunDef, ThrowDef } from './fps/weapons';
import { sfx } from './engine/audio';

const RW = 480;
const RH = 270;
const LOOK_SENS = 0.0024;
const RANGE = 200;
const ENEMY_R = 0.7;

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
  hitAt: number;
  fireAt: number;
  hurtAt: number;
  flashAt: number; // player flashbanged
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
  const reloadReq = useRef(false);
  const throwReq = useRef(false);
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
    zoomLevel.current = (zoomLevel.current + 1) % 3;
  }, []);
  const setSensitivity = useCallback((v: number) => {
    sens.current = v;
  }, []);
  const throwGrenade = useCallback(() => {
    throwReq.current = true;
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

    let world: World | null = null;
    let builtFor: Level3D | null = null;
    let sprites: THREE.Sprite[] = [];
    let barBg: THREE.Sprite[] = [];
    let barFill: THREE.Sprite[] = [];
    let enemyTexes: THREE.CanvasTexture[] = []; // [runA, runB, fire, crouch]
    let prevEnemyXZ: { x: number; z: number }[] = [];
    let bossTexes: THREE.CanvasTexture[] = [];
    const tracers: { line: THREE.Line; geo: THREE.BufferGeometry; until: number }[] = [];
    const grenades: Grenade[] = [];
    const smokes: SmokeFx[] = [];
    const flashes: Flash[] = [];
    const zones: Zone[] = [];
    let lastSnap = 0;
    const snap: FpsSnapshot = {
      health: 100, maxHp: 100, weapon: '', family: '', mag: 0, reserve: 0, reloading: false, ads: false, scoped: false,
      slots: [], throwName: '', throwCount: 0, bosses: [], enemiesLeft: 0, status: 'playing', kills: 0, hitAt: 0, fireAt: 0, hurtAt: 0, flashAt: 0, radar: [],
    };
    const prevPos = { x: 0, z: 0 };

    const clearMesh = (m: THREE.Mesh) => {
      world?.scene.remove(m);
      (m.material as THREE.Material).dispose();
    };
    const disposeExtras = () => {
      for (const s of [...sprites, ...barBg, ...barFill]) {
        world?.scene.remove(s);
        (s.material as THREE.Material).dispose();
      }
      sprites = [];
      barBg = [];
      barFill = [];
      for (const t of enemyTexes) t.dispose();
      enemyTexes = [];
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
      world = buildWorld(g.level);
      const mk = (canvas2: HTMLCanvasElement) => {
        const t = new THREE.CanvasTexture(canvas2);
        t.magFilter = THREE.NearestFilter;
        t.minFilter = THREE.NearestFilter;
        return t;
      };
      enemyTexes = [0, 1, 2, 3].map((f) => mk(enemyTex(f)));
      prevEnemyXZ = g.enemies.map((e) => ({ x: e.x, z: e.z }));
      const bossCache: Partial<Record<string, THREE.CanvasTexture>> = {};
      sprites = g.enemies.map((e) => {
        let map = enemyTexes[0];
        let sx = 1.7;
        let sy = 2.3;
        if (e.boss) {
          if (!bossCache[e.boss]) {
            const t = mk(bossTex(e.boss));
            bossCache[e.boss] = t;
            bossTexes.push(t);
          }
          map = bossCache[e.boss]!;
          const bd = BOSSES[e.boss];
          sx = 1.5 * bd.scale;
          sy = 2.0 * bd.scale;
        }
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true }));
        s.scale.set(sx, sy, 1);
        world!.scene.add(s);
        return s;
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
      builtFor = g.level;
    };

    const addTracer = (from: Vec3, to: Vec3, color: number) => {
      if (!world) return;
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(from[0], from[1], from[2]),
        new THREE.Vector3(to[0], to[1], to[2]),
      ]);
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color }));
      world.scene.add(line);
      tracers.push({ line, geo, until: performance.now() + 55 });
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
      // Right-click is a TOGGLE: hip → zoom → deep zoom → hip (not hold).
      if (e.button === 2) zoomLevel.current = (zoomLevel.current + 1) % 3;
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
        if (lookDX.current !== 0) {
          p.yaw -= lookDX.current * ls;
          lookDX.current = 0;
        }
        if (lookDY.current !== 0) {
          p.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, p.pitch - lookDY.current * ls));
          lookDY.current = 0;
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
            sfx.swap();
          }
          const gun = g.guns[g.active];

          g.ads = zoomLevel.current > 0;
          const wantFov =
            zoomLevel.current === 2
              ? Math.max(14, gun.adsFov * 0.62)
              : zoomLevel.current === 1
                ? gun.adsFov
                : gun.hipFov;
          if (Math.abs(camera.fov - wantFov) > 0.1) {
            camera.fov = wantFov;
            camera.updateProjectionMatrix();
          }

          stepPlayer(p, g.level, { fwd, strafe, jump: keys.current.has(' ') }, dt);
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
              sfx.swap();
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
              sfx.reload();
            }
          }
          g.fireCd -= dt;

          let autoFire = false;
          if (isTouch) {
            for (const e of g.enemies) {
              if (e.health <= 0) continue;
              const ex = e.x - p.x;
              const ey = e.y + 1.1 - (p.y + EYE);
              const ez = e.z - p.z;
              const el = Math.hypot(ex, ey, ez) || 1;
              if ((ex / el) * fx + (ey / el) * fy + (ez / el) * fz > 0.985 && !segBlocked(eye, [e.x, e.y + 1.1, e.z], g.level)) {
                autoFire = true;
                break;
              }
            }
          }

          const fireInput = fireHeld.current || autoFire;
          const wantShot = gun.auto ? fireInput : fireInput && !prevFire.current;
          prevFire.current = fireInput;

          if (wantShot && g.fireCd <= 0 && g.reloading <= 0 && g.mags[g.active] > 0) {
            g.fireCd = gun.rate;
            g.mags[g.active]--;
            snap.fireAt = now;
            sfx.gun(gun.id, gun.family);
            const wallD = rayWallDist(eye, dir, g.level, RANGE);
            let hitT = wallD;
            let hit: Enemy | null = null;
            for (const e of g.enemies) {
              if (e.health <= 0) continue;
              const hr = e.boss ? BOSSES[e.boss].radius : ENEMY_R;
              const ecy = e.boss ? BOSSES[e.boss].scale : 1.0;
              const t = raySphere(eye, dir, [e.x, e.y + ecy, e.z], hr);
              if (t < hitT) {
                hitT = t;
                hit = e;
              }
            }
            addTracer([eye[0] + fx * 0.4, eye[1] - 0.12, eye[2] + fz * 0.4], [eye[0] + fx * hitT, eye[1] + fy * hitT, eye[2] + fz * hitT], gun.color);
            if (gun.splash) {
              // Explosive: detonate at the impact point and splash-damage everyone
              // in radius (falloff to the edge), regardless of the direct ray hit.
              const ix = eye[0] + fx * hitT;
              const iy = eye[1] + fy * hitT;
              const iz = eye[2] + fz * hitT;
              let anyHit = false;
              for (const e of g.enemies) {
                if (e.health <= 0) continue;
                const d = Math.hypot(e.x - ix, e.y + 1 - iy, e.z - iz);
                if (d < gun.splash) {
                  e.health -= Math.round(gun.dmg * (1 - d / gun.splash));
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
                const fm = new THREE.Mesh(ballGeo, new THREE.MeshBasicMaterial({ color: gun.color, transparent: true }));
                fm.position.set(ix, iy, iz);
                world.scene.add(fm);
                flashes.push({ mesh: fm, born: now, r: gun.splash });
              }
              sfx.explosion();
              g.squad.lastKnown = { x: p.x, z: p.z };
              g.squad.t = now;
              if (anyHit) {
                snap.hitAt = now;
                sfx.enemyHit();
              }
            } else if (hit) {
              hit.health -= gun.dmg;
              hit.hitFlash = 0.12;
              hit.alarm = 4;
              hit.state = 'alert';
              hit.lastSeen = { x: p.x, z: p.z };
              hit.barUntil = now + 2500;
              g.squad.lastKnown = { x: p.x, z: p.z };
              g.squad.t = now;
              snap.hitAt = now;
              sfx.enemyHit();
              if (hit.health <= 0) g.kills++;
            }
          } else if (wantShot && g.mags[g.active] <= 0 && g.reloading <= 0 && g.reserves[g.active] > 0) {
            g.reloading = gun.reload;
            sfx.reload();
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
              const blastAt = (bx: number, by: number, bz: number, dmg: number, radius: number): boolean => {
                let any = false;
                for (const e of g.enemies) {
                  if (e.health <= 0) continue;
                  const d = Math.hypot(e.x - bx, e.y + 1 - by, e.z - bz);
                  if (d < radius) {
                    e.health -= Math.round(dmg * (1 - d / radius));
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
                sfx.explosion();
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
                  sfx.flash();
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
                  e.health -= s.dps * dt;
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
              e.health -= e.burnDps * dt;
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
          const res = updateEnemies(g.enemies, p, g.level, g.difficulty, pvx, pvz, dt, now, g.squad, smokes);
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
          if (g.enemies.every((e) => e.health <= 0)) g.status = 'won';
        }

        // Sprites
        for (let i = 0; i < sprites.length; i++) {
          const e = g.enemies[i];
          const s = sprites[i];
          const alive = e.health > 0;
          s.visible = alive;
          const showBar = alive && !e.boss && now < e.barUntil; // bosses use the top bar
          barBg[i].visible = showBar;
          barFill[i].visible = showBar;
          if (!alive) continue;
          // How fast is this bot actually moving (drives run vs stand pose)?
          const pe = prevEnemyXZ[i] ?? { x: e.x, z: e.z };
          const moveSpeed = Math.hypot(e.x - pe.x, e.z - pe.z) / Math.max(dt, 0.001);
          prevEnemyXZ[i] = { x: e.x, z: e.z };
          const cy = e.boss ? BOSSES[e.boss].scale : 1.15;
          const moving = moveSpeed > 1.4;
          // Running bots bob; firing / crouched / standing bots stay steady.
          const bob = e.boss ? Math.abs(Math.sin(e.step * 3.0)) * 0.3 : moving ? Math.abs(Math.sin(e.step * 3.0)) * 0.14 : 0;
          s.position.set(e.x, e.y + cy + bob, e.z);
          const mat = s.material as THREE.SpriteMaterial;
          if (!e.boss) {
            // Pose from behaviour: firing → fire, moving → run cycle, alert and
            // holding → crouch/peek, otherwise an idle stand.
            let frame: number;
            if (e.muzzle > 0) frame = 2;
            else if (moving) frame = Math.floor(e.step * 2.2) % 2 === 0 ? 0 : 1;
            else if (e.state === 'alert') frame = 3;
            else frame = 0;
            const want = enemyTexes[frame];
            if (mat.map !== want) {
              mat.map = want;
              mat.needsUpdate = true;
            }
          }
          mat.color.setHex(e.hitFlash > 0 ? 0xff7777 : 0xffffff);
          if (showBar) {
            const ratio = Math.max(0, e.health / e.maxHealth);
            const by = e.y + 2.6 + bob;
            barBg[i].position.set(e.x, by, e.z);
            barFill[i].position.set(e.x, by, e.z);
            barFill[i].scale.x = 1.4 * ratio;
            (barFill[i].material as THREE.SpriteMaterial).color.setHex(ratio > 0.5 ? 0xaef5c8 : ratio > 0.25 ? 0xffd27a : 0xff5d6e);
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

        camera.position.set(p.x, p.y + EYE, p.z);
        camera.rotation.y = p.yaw;
        camera.rotation.x = p.pitch;
        if (world) renderer.render(world.scene, camera);

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
      world?.dispose();
      ballGeo.dispose();
      renderer.dispose();
    };
  }, [canvasRef, gameRef, active, onSnapshot]);

  return { setMoveAxis, addLook, cycleWeapon, cycleZoom, setSensitivity, throwGrenade };
}
