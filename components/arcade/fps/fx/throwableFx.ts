/**
 * ThrowableFx — the handcrafted "Battlefield Event" visual layer for every thrown
 * weapon. Purely cosmetic: it renders trails, detonations, and lingering effects,
 * and owns its own geometry/texture/particle pools. It NEVER touches gameplay —
 * the loop resolves damage/status/zones/LoS separately and just calls in here to
 * draw. Mirrors the imperative ProjectileSystem / TelegraphSystem pattern.
 *
 * Building blocks (all procedural, GPU-friendly, additive so the Bloom composer
 * does the glow for free):
 *   • billboards  — camera-facing Sprites (flash / smoke / glow) or ground-aligned
 *                   quads (shockwave ring / scorch decal), fading over their life.
 *   • bursts      — pooled THREE.Points clouds (fragments / sparks / dust chips)
 *                   integrated with gravity + drag.
 *   • lights      — a few transient PointLights (desktop only, capped).
 *
 * Only FRAG is fully art-directed so far; every other kind falls back to a clean
 * generic burst (≈ the old single-sphere flash) until it gets its own signature.
 */
import * as THREE from 'three';
import type { RenderTier } from '../materials';
import type { ThrowKind, ZoneKind } from '../weapons';

interface Billboard {
  obj: THREE.Object3D;
  mat: THREE.SpriteMaterial | THREE.MeshBasicMaterial;
  born: number;
  life: number; // ms
  vx: number;
  vy: number;
  vz: number;
  s0: number;
  s1: number;
  o0: number;
  o1: number;
  ease: boolean; // true = ease-out (fast then settle), false = linear
  flat: boolean; // true = ground-aligned quad (scale x/y), false = sprite (uniform)
}

interface Burst {
  pts: THREE.Points;
  geo: THREE.BufferGeometry;
  mat: THREE.PointsMaterial;
  pos: Float32Array;
  vel: Float32Array;
  n: number;
  born: number;
  life: number; // ms
  grav: number;
  drag: number;
  active: boolean;
}

interface FxLight {
  light: THREE.PointLight;
  born: number;
  life: number;
  intensity: number;
}

/** A lingering zone visual (smoke/gas/fire/cryo/decoy) that keeps emitting puffs
 *  for its gameplay duration. `beacon` is the persistent decoy hologram. */
interface Emitter {
  kind: ZoneKind;
  x: number;
  z: number;
  r: number;
  until: number;
  next: number;
  interval: number;
  beacon: THREE.Object3D | null;
  beaconMat: THREE.Material | null;
}

/** A one-shot effect fired after a delay (e.g. the singularity collapse). */
interface Delayed {
  at: number;
  run: () => void;
}

const BURST_CAP = 160; // fixed particle capacity per pooled burst

function radialTexture(stops: [number, string][], size = 64): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [at, col] of stops) g.addColorStop(at, col);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(cv);
  tex.needsUpdate = true;
  return tex;
}

export class ThrowableFx {
  private scene: THREE.Scene;
  private q: number; // quality/count multiplier (mobile = 0.5)
  private maxLights: number;

  private soft: THREE.CanvasTexture; // radial glow (flash / smoke / dust)
  private ring: THREE.CanvasTexture; // hollow ring (shockwave)
  private scorch: THREE.CanvasTexture; // dark splat (ground decal)
  private quad: THREE.PlaneGeometry; // shared unit quad for flat billboards

  private billboards: Billboard[] = [];
  private bursts: Burst[] = [];
  private burstPool: Burst[] = [];
  private lights: FxLight[] = [];
  private arcs: { line: THREE.LineSegments; geo: THREE.BufferGeometry; mat: THREE.LineBasicMaterial; born: number; life: number }[] = [];
  private emitters: Emitter[] = [];
  private delayed: Delayed[] = [];
  private trailT = 0; // trail emission throttle accumulator (s)

  constructor(scene: THREE.Scene, tier: RenderTier) {
    this.scene = scene;
    this.q = tier === 'mobile' ? 0.5 : 1;
    this.maxLights = tier === 'mobile' ? 0 : 3;
    this.soft = radialTexture([
      [0, 'rgba(255,255,255,1)'],
      [0.4, 'rgba(255,255,255,0.75)'],
      [1, 'rgba(255,255,255,0)'],
    ]);
    this.ring = radialTexture([
      [0, 'rgba(255,255,255,0)'],
      [0.62, 'rgba(255,255,255,0)'],
      [0.8, 'rgba(255,255,255,1)'],
      [0.92, 'rgba(255,255,255,0.5)'],
      [1, 'rgba(255,255,255,0)'],
    ]);
    this.scorch = radialTexture([
      [0, 'rgba(0,0,0,0.95)'],
      [0.55, 'rgba(0,0,0,0.7)'],
      [1, 'rgba(0,0,0,0)'],
    ]);
    this.quad = new THREE.PlaneGeometry(1, 1);
  }

  // ── public API ──────────────────────────────────────────────────────────────

  /** Per-frame trail for an in-flight grenade — a kind-specific glow so you read
   *  what's incoming before it lands. */
  trail(kind: ThrowKind, x: number, y: number, z: number, dt: number, color: number): void {
    this.trailT += dt;
    if (this.trailT < 0.028) return;
    this.trailT = 0;
    if (kind === 'frag') {
      // A thin grey smoke wisp + a faint hot ember peeling off the casing.
      this.sprite(this.soft, 0x5b544a, false, x, y, z, 0, 0.5, 0, 0.12, 0.18, 0.4, 0, 360, true);
      this.sprite(this.soft, 0xff8a3a, true, x, y, z, 0, 0.2, 0, 0.1, 0.03, 0.28, 0, 200, true);
      return;
    }
    // Everything else leaves a faint additive comet-glow in its own colour.
    this.sprite(this.soft, color, true, x, y, z, 0, 0, 0, 0.28, 0.12, 0.6, 0, 240, true);
    if (kind === 'plasma' || kind === 'gravity' || kind === 'shock') {
      this.sprite(this.soft, 0xffffff, true, x, y, z, 0, 0, 0, 0.14, 0.06, 0.7, 0, 180, true);
    }
  }

  /** Detonation burst for a throwable kind at (x,y,z); `radius` is VISUAL size. */
  detonate(kind: ThrowKind, x: number, y: number, z: number, radius: number, color: number): void {
    const r = Math.max(1, radius);
    switch (kind) {
      case 'frag': return this.detonateFrag(x, y, z, r);
      case 'smoke': return this.detonateSmoke(x, y, z, r);
      case 'incendiary': return this.detonateMolotov(x, y, z, r);
      case 'cryo': return this.detonateCryo(x, y, z, r);
      case 'shock': return this.detonateEmp(x, y, z, r);
      case 'flash': return this.detonateFlash(x, y, z, r);
      case 'cluster': return this.detonateCluster(x, y, z, r);
      case 'gas': return this.detonateToxin(x, y, z, r);
      case 'gravity': return this.detonateSingularity(x, y, z, r);
      case 'concussion': return this.detonateConcussion(x, y, z, r);
      case 'decoy': return this.detonateDecoy(x, y, z, r);
      case 'plasma': return this.detonatePlasma(x, y, z, r);
      default:
        this.sprite(this.soft, color, true, x, y + 0.3, z, 0, 0, 0, r * 0.3, r * 1.2, 1, 0, 320, true);
    }
  }

  /** Lingering zone visual (smoke/gas/fire/cryo/decoy), matched to the gameplay
   *  record's duration. Cosmetic only — the zone's damage/LoS/slow/lure run in the loop. */
  lingering(kind: ZoneKind, x: number, z: number, r: number, durationMs: number): void {
    const now = performance.now();
    const until = now + durationMs;
    let beacon: THREE.Object3D | null = null;
    let beaconMat: THREE.Material | null = null;
    let interval = 170;
    if (kind === 'fire') interval = 90;
    else if (kind === 'gas') interval = 150;
    else if (kind === 'cryo') interval = 240;
    else if (kind === 'decoy') interval = 460;
    if (kind === 'cryo') {
      // A frost sheet that creeps out then slowly melts away with the zone.
      this.ground(this.scorch, 0x9fdcff, x, 0.05, z, r * 0.4, r * 1.05, 0.5, 0, durationMs);
    } else if (kind === 'decoy') {
      // A simple holographic beacon: a glowing cyan emitter pillar + a top orb.
      const g = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ color: 0xaef5c8, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending });
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 1.7, 8, 1, true), mat);
      col.position.y = 0.85;
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), mat);
      orb.position.y = 1.8;
      g.add(col, orb);
      g.position.set(x, 0, z);
      this.scene.add(g);
      beacon = g;
      beaconMat = mat;
    }
    this.emitters.push({ kind, x, z, r, until, next: now, interval, beacon, beaconMat });
  }

  update(dt: number, now: number): void {
    // Billboards (sprites + flat quads).
    for (let i = this.billboards.length - 1; i >= 0; i--) {
      const b = this.billboards[i];
      const age = (now - b.born) / b.life;
      if (age >= 1) {
        this.scene.remove(b.obj);
        b.mat.dispose();
        this.billboards.splice(i, 1);
        continue;
      }
      const k = b.ease ? 1 - (1 - age) * (1 - age) : age;
      const s = b.s0 + (b.s1 - b.s0) * k;
      if (b.flat) b.obj.scale.set(s, s, 1);
      else b.obj.scale.setScalar(s);
      b.obj.position.x += b.vx * dt;
      b.obj.position.y += b.vy * dt;
      b.obj.position.z += b.vz * dt;
      b.mat.opacity = b.o0 + (b.o1 - b.o0) * age;
    }
    // Particle bursts.
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const bu = this.bursts[i];
      const age = (now - bu.born) / bu.life;
      if (age >= 1) {
        this.scene.remove(bu.pts);
        bu.active = false;
        this.bursts.splice(i, 1);
        this.burstPool.push(bu);
        continue;
      }
      const drag = Math.max(0, 1 - bu.drag * dt);
      for (let p = 0; p < bu.n; p++) {
        const o = p * 3;
        bu.vel[o + 1] -= bu.grav * dt;
        bu.vel[o] *= drag;
        bu.vel[o + 1] *= drag;
        bu.vel[o + 2] *= drag;
        bu.pos[o] += bu.vel[o] * dt;
        bu.pos[o + 1] += bu.vel[o + 1] * dt;
        bu.pos[o + 2] += bu.vel[o + 2] * dt;
        if (bu.pos[o + 1] < 0.05) {
          bu.pos[o + 1] = 0.05; // settle on the ground
          bu.vel[o + 1] *= -0.25;
        }
      }
      (bu.geo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      bu.mat.opacity = 1 - age * age; // hold bright, then drop off
    }
    // Transient lights.
    for (let i = this.lights.length - 1; i >= 0; i--) {
      const l = this.lights[i];
      const age = (now - l.born) / l.life;
      if (age >= 1) {
        this.scene.remove(l.light);
        this.lights.splice(i, 1);
        continue;
      }
      l.light.intensity = l.intensity * (1 - age);
    }
    // Electric arcs (EMP / plasma) — bright then gone.
    for (let i = this.arcs.length - 1; i >= 0; i--) {
      const a = this.arcs[i];
      const age = (now - a.born) / a.life;
      if (age >= 1) {
        this.scene.remove(a.line);
        a.geo.dispose();
        a.mat.dispose();
        this.arcs.splice(i, 1);
        continue;
      }
      a.mat.opacity = 1 - age;
    }
    // Delayed one-shots (e.g. the singularity collapse).
    for (let i = this.delayed.length - 1; i >= 0; i--) {
      if (now >= this.delayed[i].at) {
        const d = this.delayed[i];
        this.delayed.splice(i, 1);
        d.run();
      }
    }
    // Lingering zone emitters — keep puffing for the gameplay duration.
    for (let i = this.emitters.length - 1; i >= 0; i--) {
      const em = this.emitters[i];
      if (now > em.until) {
        this.killBeacon(em);
        this.emitters.splice(i, 1);
        continue;
      }
      if (em.beacon && em.beaconMat) {
        // Hologram flicker: mostly steady with occasional dropouts.
        (em.beaconMat as THREE.MeshBasicMaterial).opacity = Math.random() < 0.08 ? 0.12 : 0.42 + Math.random() * 0.16;
        em.beacon.rotation.y += dt * 1.4;
      }
      if (now >= em.next) {
        em.next = now + em.interval;
        this.emitPuff(em);
      }
    }
  }

  dispose(): void {
    for (const b of this.billboards) {
      this.scene.remove(b.obj);
      b.mat.dispose();
    }
    for (const bu of [...this.bursts, ...this.burstPool]) {
      this.scene.remove(bu.pts);
      bu.geo.dispose();
      bu.mat.dispose();
    }
    for (const l of this.lights) this.scene.remove(l.light);
    for (const a of this.arcs) {
      this.scene.remove(a.line);
      a.geo.dispose();
      a.mat.dispose();
    }
    for (const em of this.emitters) this.killBeacon(em);
    this.billboards.length = 0;
    this.bursts.length = 0;
    this.burstPool.length = 0;
    this.lights.length = 0;
    this.arcs.length = 0;
    this.emitters.length = 0;
    this.delayed.length = 0;
    this.soft.dispose();
    this.ring.dispose();
    this.scorch.dispose();
    this.quad.dispose();
  }

  // ── FRAG signature ────────────────────────────────────────────────────────────
  private detonateFrag(x: number, y: number, z: number, r: number): void {
    const cy = y + 0.3;
    // Twin flash: a white-hot core inside a violent orange bloom.
    this.sprite(this.soft, 0xfff2d0, true, x, cy, z, 0, 0, 0, r * 0.2, r * 0.5, 1, 0, 90, true);
    this.sprite(this.soft, 0xffb347, true, x, cy, z, 0, 0, 0, r * 0.45, r * 1.15, 1, 0, 150, true);
    // Pressure shockwave — a fast flat ring punching past the blast radius.
    this.ground(this.ring, 0xffd9a0, x, 0.16, z, r * 0.3, r * 1.7, 0.9, 0, 300);
    // Heat shimmer — a faint quick additive swell.
    this.sprite(this.soft, 0xffd9a0, true, x, cy, z, 0, 0, 0, r * 0.5, r * 1.05, 0.28, 0, 210);
    // Fragments — hundreds of glowing metal shards flung out with gravity + drag.
    this.burst(x, cy, z, Math.round(120 * this.q), 7, 15, 0.35, 0xff7a2a, 0.09, 720, 18, 2.2);
    // Sparks — faster, brighter, shorter-lived.
    this.burst(x, cy, z, Math.round(48 * this.q), 9, 20, 0.15, 0xffe08a, 0.06, 320, 10, 4);
    // Concrete chips kicked off the ground.
    this.burst(x, y + 0.15, z, Math.round(36 * this.q), 4, 11, 0.05, 0x8a7d6a, 0.05, 900, 22, 1.6);
    // Dust dome — low grey-brown puffs billowing up and out.
    const dust = Math.round(4 * this.q + 2);
    for (let i = 0; i < dust; i++) {
      const a = (i / dust) * Math.PI * 2 + Math.random();
      const sp = 0.6 + Math.random() * 0.8;
      this.sprite(this.soft, 0x6b5f52, false, x, y + 0.2, z, Math.cos(a) * sp, 0.5, Math.sin(a) * sp, r * 0.35, r * 0.95, 0.5, 0, 950 + Math.random() * 300);
    }
    // Lingering smoke column — a couple of dark puffs rising slowly.
    for (let i = 0; i < 2; i++) {
      this.sprite(this.soft, 0x4c463f, false, x + (Math.random() - 0.5) * 0.4, y + 0.5, z + (Math.random() - 0.5) * 0.4, 0, 0.5, 0, r * 0.4, r * 0.85, 0.42, 0, 1500 + i * 300);
    }
    // Scorched ground decal.
    this.ground(this.scorch, 0x120f0c, x, 0.06, z, r * 0.7, r * 0.95, 0.6, 0, 3600);
    // Muzzle-of-hell dynamic light.
    this.addLight(x, cy, z, 0xff8a3a, 9, 170);
  }

  // ── SMOKE: a small pressure pop; the cloud is the lingering emitter. ───────────
  private detonateSmoke(x: number, y: number, z: number, r: number): void {
    this.sprite(this.soft, 0xd6dae4, true, x, y + 0.3, z, 0, 0, 0, r * 0.2, r * 0.55, 0.7, 0, 160, true);
    this.ground(this.ring, 0xbfc4d0, x, 0.14, z, r * 0.2, r * 0.7, 0.4, 0, 240);
    this.burst(x, y + 0.2, z, Math.round(14 * this.q), 2, 5, 0.2, 0x9aa3b8, 0.06, 500, 10, 2);
  }

  // ── MOLOTOV: bottle shatter + fuel splash; fire is the lingering emitter. ──────
  private detonateMolotov(x: number, y: number, z: number, r: number): void {
    this.sprite(this.soft, 0xffb347, true, x, y + 0.3, z, 0, 0, 0, r * 0.3, r * 0.85, 1, 0, 140, true);
    this.sprite(this.soft, 0xff5a2a, true, x, y + 0.3, z, 0, 0, 0, r * 0.2, r * 0.5, 0.9, 0, 90, true);
    this.burst(x, y + 0.25, z, Math.round(30 * this.q), 4, 9, 0.5, 0xffd08a, 0.06, 420, 14, 3);
    this.ground(this.scorch, 0x241206, x, 0.06, z, r * 0.5, r * 0.9, 0.6, 0, 4000); // fuel splash
    this.sprite(this.soft, 0x2a221a, false, x, y + 0.4, z, 0, 0.5, 0, r * 0.3, r * 0.7, 0.5, 0, 1400); // black smoke
    this.addLight(x, y + 0.4, z, 0xff6a2a, 7, 200);
  }

  // ── CRYO: blue-white burst, ice shards, expanding frost ring. ─────────────────
  private detonateCryo(x: number, y: number, z: number, r: number): void {
    this.sprite(this.soft, 0xdff4ff, true, x, y + 0.3, z, 0, 0, 0, r * 0.25, r * 0.7, 1, 0, 120, true);
    this.sprite(this.soft, 0x7fdfff, true, x, y + 0.3, z, 0, 0, 0, r * 0.4, r * 1.0, 0.85, 0, 210, true);
    this.ground(this.ring, 0xbfefff, x, 0.14, z, r * 0.3, r * 1.3, 0.7, 0, 300);
    this.burst(x, y + 0.3, z, Math.round(60 * this.q), 5, 12, 0.4, 0xbfefff, 0.07, 700, 16, 2.5); // ice shards
    this.burst(x, y + 0.4, z, Math.round(24 * this.q), 3, 7, 0.3, 0xffffff, 0.05, 500, 4, 2); // sparkles
    this.addLight(x, y + 0.4, z, 0x7fdfff, 7, 180);
  }

  // ── EMP: electromagnetic ring + branching arcs, no smoke. ─────────────────────
  private detonateEmp(x: number, y: number, z: number, r: number): void {
    this.sprite(this.soft, 0xd0f7ff, true, x, y + 0.3, z, 0, 0, 0, r * 0.2, r * 0.6, 1, 0, 120, true);
    this.ground(this.ring, 0x9af0ff, x, 0.14, z, r * 0.3, r * 1.8, 0.85, 0, 260);
    this.ground(this.ring, 0x9af0ff, x, 0.18, z, r * 0.5, r * 2.4, 0.5, 0, 340);
    const bolts = Math.round(6 * this.q + 2);
    this.arc(x, y + 0.5, z, 0x9af0ff, r * 1.1, bolts, 200);
    this.arc(x, y + 0.9, z, 0xd0f7ff, r * 0.8, Math.round(bolts * 0.6), 160);
    this.burst(x, y + 0.4, z, Math.round(30 * this.q), 4, 10, 0.3, 0xd0f7ff, 0.05, 300, 6, 4);
    this.addLight(x, y + 0.5, z, 0x9af0ff, 8, 160);
  }

  // ── FLASHBANG: a blinding expanding light sphere, minimal debris. ─────────────
  private detonateFlash(x: number, y: number, z: number, r: number): void {
    this.sprite(this.soft, 0xffffff, true, x, y + 0.4, z, 0, 0, 0, r * 0.3, r * 1.5, 1, 0, 260, true);
    this.sprite(this.soft, 0xffffff, true, x, y + 0.4, z, 0, 0, 0, r * 0.15, r * 0.6, 1, 0, 110, true);
    this.ground(this.ring, 0xffffff, x, 0.14, z, r * 0.2, r * 1.0, 0.6, 0, 220);
    this.burst(x, y + 0.3, z, Math.round(16 * this.q), 3, 8, 0.4, 0xffffff, 0.05, 400, 14, 2);
    this.addLight(x, y + 0.5, z, 0xffffff, 12, 200);
  }

  // ── CLUSTER: primary pop, then staggered bomblet bursts. ──────────────────────
  private detonateCluster(x: number, y: number, z: number, r: number): void {
    this.sprite(this.soft, 0xffd27a, true, x, y + 0.3, z, 0, 0, 0, r * 0.3, r * 0.9, 1, 0, 140, true);
    this.burst(x, y + 0.3, z, Math.round(40 * this.q), 6, 13, 0.4, 0xffb347, 0.07, 500, 18, 2.5);
    for (let k = 0; k < 5; k++) {
      const ox = x + (Math.random() * 2 - 1) * r;
      const oz = z + (Math.random() * 2 - 1) * r;
      this.delayed.push({
        at: performance.now() + 120 + k * 90 + Math.random() * 60,
        run: () => {
          this.sprite(this.soft, 0xffc45a, true, ox, 0.6, oz, 0, 0, 0, r * 0.25, r * 0.6, 1, 0, 130, true);
          this.burst(ox, 0.6, oz, Math.round(22 * this.q), 4, 9, 0.4, 0xff9a3a, 0.06, 420, 18, 2.5);
          this.ground(this.scorch, 0x1a120a, ox, 0.06, oz, r * 0.3, r * 0.5, 0.4, 0, 2500);
        },
      });
    }
  }

  // ── TOXIN: green chemical burst; the gas is the lingering emitter. ────────────
  private detonateToxin(x: number, y: number, z: number, r: number): void {
    this.sprite(this.soft, 0x9cff6a, true, x, y + 0.3, z, 0, 0, 0, r * 0.25, r * 0.7, 0.9, 0, 160, true);
    this.ground(this.ring, 0x9cff6a, x, 0.14, z, r * 0.2, r * 0.9, 0.5, 0, 260);
    this.burst(x, y + 0.3, z, Math.round(30 * this.q), 3, 8, 0.4, 0x6aff7a, 0.06, 700, 10, 2);
    this.ground(this.scorch, 0x1a2a08, x, 0.05, z, r * 0.4, r * 0.9, 0.4, 0, 5000); // discolouration
    this.addLight(x, y + 0.4, z, 0x6aff7a, 5, 180);
  }

  // ── SINGULARITY: implosion pulling debris inward, then a violent collapse. ────
  private detonateSingularity(x: number, y: number, z: number, r: number): void {
    const cy = y + 0.6;
    this.sprite(this.soft, 0x180826, false, x, cy, z, 0, 0, 0, r * 0.2, r * 0.7, 0.9, 0, 520); // dark void core
    this.ground(this.ring, 0xc08bff, x, 0.16, z, r * 0.4, r * 1.4, 0.8, 0, 500); // accretion ring
    this.sprite(this.soft, 0xd9a8ff, true, x, cy, z, 0, 0, 0, r * 0.5, r * 0.9, 0.5, 0, 400);
    this.implodeBurst(x, y, z, r, Math.round(90 * this.q), 0xc08bff);
    this.addLight(x, cy, z, 0x9a5cff, 6, 400);
    this.delayed.push({
      at: performance.now() + 520,
      run: () => {
        this.sprite(this.soft, 0xe6ccff, true, x, cy, z, 0, 0, 0, r * 0.1, r * 1.3, 1, 0, 220, true);
        this.ground(this.ring, 0xe0b0ff, x, 0.18, z, r * 0.2, r * 1.8, 0.9, 0, 300);
        this.burst(x, cy, z, Math.round(70 * this.q), 8, 18, 0.4, 0xc08bff, 0.07, 500, 14, 2.5);
        this.addLight(x, cy, z, 0xc08bff, 9, 180);
      },
    });
  }

  // ── CONCUSSION: a dominant expanding air ring + dust blown outward. ───────────
  private detonateConcussion(x: number, y: number, z: number, r: number): void {
    this.ground(this.ring, 0xffe9a8, x, 0.16, z, r * 0.3, r * 2.2, 0.9, 0, 340);
    this.ground(this.ring, 0xfff4d0, x, 0.2, z, r * 0.5, r * 2.8, 0.5, 0, 420);
    this.sprite(this.soft, 0xfff0c0, true, x, y + 0.4, z, 0, 0, 0, r * 0.4, r * 1.0, 0.5, 0, 180, true);
    this.burst(x, y + 0.2, z, Math.round(50 * this.q), 6, 14, 0.05, 0xd8cba8, 0.06, 500, 8, 1.6);
    this.addLight(x, y + 0.4, z, 0xffe9a8, 6, 150);
  }

  // ── DECOY: a quick holo-spawn shimmer; the beacon persists via lingering. ─────
  private detonateDecoy(x: number, y: number, z: number, r: number): void {
    this.sprite(this.soft, 0xaef5c8, true, x, y + 0.8, z, 0, 0, 0, r * 0.2, r * 1.2, 0.8, 0, 240, true);
    this.burst(x, y + 0.8, z, Math.round(16 * this.q), 2, 6, 0.5, 0xaef5c8, 0.05, 300, 3, 2);
  }

  // ── PLASMA ORB: white-hot core + blue shell + arcs + lingering embers. ────────
  private detonatePlasma(x: number, y: number, z: number, r: number): void {
    const cy = y + 0.3;
    this.sprite(this.soft, 0xffffff, true, x, cy, z, 0, 0, 0, r * 0.2, r * 0.6, 1, 0, 120, true);
    this.sprite(this.soft, 0x5db6ff, true, x, cy, z, 0, 0, 0, r * 0.4, r * 1.15, 0.9, 0, 240, true);
    this.ground(this.ring, 0x8fd0ff, x, 0.15, z, r * 0.3, r * 1.5, 0.8, 0, 300);
    this.arc(x, cy, z, 0x8fd0ff, r * 0.9, Math.round(5 * this.q + 2), 200);
    this.burst(x, cy, z, Math.round(70 * this.q), 6, 15, 0.35, 0x9fd8ff, 0.07, 600, 12, 2.5); // energy particles
    this.burst(x, cy, z, Math.round(24 * this.q), 2, 5, 0.3, 0x5db6ff, 0.06, 1400, 3, 1.2); // lingering embers
    this.ground(this.scorch, 0x0a1420, x, 0.06, z, r * 0.5, r * 0.85, 0.55, 0, 3200);
    this.sprite(this.soft, 0x9fd8ff, true, x, cy, z, 0, 0, 0, r * 0.5, r * 1.0, 0.25, 0, 200); // heat shimmer
    this.addLight(x, cy, z, 0x5db6ff, 9, 200);
  }

  /** Per-tick puff for a lingering zone (called from update). */
  private emitPuff(em: Emitter): void {
    const { kind, x, z, r } = em;
    const rnd = (m: number) => (Math.random() * 2 - 1) * m;
    if (kind === 'smoke') {
      this.sprite(this.soft, 0x9aa3b8, false, x + rnd(r * 0.5), 1.0 + Math.random() * 0.6, z + rnd(r * 0.5), rnd(0.15), 0.35, rnd(0.15), r * 0.3, r * 0.75, 0.5, 0, 1700);
    } else if (kind === 'gas') {
      this.sprite(this.soft, 0x8fe05a, false, x + rnd(r * 0.7), 0.35 + Math.random() * 0.3, z + rnd(r * 0.7), rnd(0.3), 0.05, rnd(0.3), r * 0.35, r * 0.8, 0.42, 0, 1700);
      if (Math.random() < 0.4) this.burst(x + rnd(r * 0.6), 0.4, z + rnd(r * 0.6), 3, 0.5, 1.5, 0.4, 0x9cff6a, 0.05, 900, 4, 1);
    } else if (kind === 'fire') {
      this.sprite(this.soft, 0xff6a2a, true, x + rnd(r * 0.8), 0.3 + Math.random() * 0.5, z + rnd(r * 0.8), rnd(0.1), 0.7, rnd(0.1), r * 0.25, r * 0.55, 0.9, 0, 460, true);
      if (Math.random() < 0.5) this.burst(x + rnd(r * 0.7), 0.4, z + rnd(r * 0.7), 3, 1, 3, 0.9, 0xffbe5a, 0.04, 700, 6, 1.5);
      if (this.q > 0.5 && Math.random() < 0.3) this.addLight(x + rnd(r * 0.5), 0.6, z + rnd(r * 0.5), 0xff7a2a, 4, 180);
    } else if (kind === 'cryo') {
      this.sprite(this.soft, 0xbfefff, false, x + rnd(r * 0.7), 0.2 + Math.random() * 0.2, z + rnd(r * 0.7), rnd(0.1), 0.06, rnd(0.1), r * 0.3, r * 0.7, 0.3, 0, 1400);
      if (Math.random() < 0.3) this.burst(x + rnd(r * 0.6), 0.3, z + rnd(r * 0.6), 4, 0.3, 1, 0.3, 0xffffff, 0.04, 1000, 2, 1);
    } else if (kind === 'decoy') {
      this.sprite(this.soft, 0xffe08a, true, x + rnd(0.2), 1.7, z + rnd(0.2), 0, 0, 0, 0.2, 0.5, 0.9, 0, 90, true); // fake muzzle flash
      this.burst(x, 1.6, z, 4, 2, 5, 0.2, 0xfff0c0, 0.05, 200, 6, 3);
    }
  }

  private killBeacon(em: Emitter): void {
    if (!em.beacon) return;
    this.scene.remove(em.beacon);
    em.beacon.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    em.beaconMat?.dispose();
    em.beacon = null;
    em.beaconMat = null;
  }

  // ── primitives ────────────────────────────────────────────────────────────────

  /** A camera-facing (or, if `flat`=false, still sprite) additive/alpha billboard. */
  private sprite(
    tex: THREE.CanvasTexture,
    color: number,
    additive: boolean,
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    s0: number,
    s1: number,
    o0: number,
    o1: number,
    life: number,
    ease = false,
  ): void {
    const mat = new THREE.SpriteMaterial({
      map: tex,
      color,
      transparent: true,
      depthWrite: false,
      opacity: o0,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    const sp = new THREE.Sprite(mat);
    sp.position.set(x, y, z);
    sp.scale.setScalar(s0);
    this.scene.add(sp);
    this.billboards.push({ obj: sp, mat, born: performance.now(), life, vx, vy, vz, s0, s1, o0, o1, ease, flat: false });
  }

  /** A flat ground-aligned quad (shockwave ring / scorch decal). */
  private ground(tex: THREE.CanvasTexture, color: number, x: number, y: number, z: number, s0: number, s1: number, o0: number, o1: number, life: number): void {
    const additive = tex === this.ring;
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      color,
      transparent: true,
      depthWrite: false,
      opacity: o0,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      side: THREE.DoubleSide,
      polygonOffset: !additive,
      polygonOffsetFactor: -1,
    });
    const m = new THREE.Mesh(this.quad, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    m.scale.set(s0, s0, 1);
    this.scene.add(m);
    this.billboards.push({ obj: m, mat, born: performance.now(), life, vx: 0, vy: 0, vz: 0, s0, s1, o0, o1, ease: true, flat: true });
  }

  /** A pooled Points cloud fired radially from a point. */
  private burst(x: number, y: number, z: number, n: number, spMin: number, spMax: number, upBias: number, color: number, size: number, life: number, grav: number, drag: number): void {
    if (n <= 0) return;
    const bu = this.acquireBurst();
    bu.n = n;
    for (let p = 0; p < n; p++) {
      const o = p * 3;
      bu.pos[o] = x;
      bu.pos[o + 1] = y;
      bu.pos[o + 2] = z;
      // Random direction with an upward bias so debris arcs rather than only spraying flat.
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      const sp = spMin + Math.random() * (spMax - spMin);
      bu.vel[o] = Math.sin(ph) * Math.cos(th) * sp;
      bu.vel[o + 1] = Math.abs(Math.cos(ph)) * sp * (0.5 + upBias) + upBias * sp;
      bu.vel[o + 2] = Math.sin(ph) * Math.sin(th) * sp;
    }
    bu.geo.setDrawRange(0, n);
    (bu.geo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    bu.mat.color.setHex(color);
    bu.mat.size = size;
    bu.mat.opacity = 1;
    bu.born = performance.now();
    bu.life = life;
    bu.grav = grav;
    bu.drag = drag;
    bu.active = true;
    this.scene.add(bu.pts);
    this.bursts.push(bu);
  }

  private acquireBurst(): Burst {
    const reused = this.burstPool.pop();
    if (reused) return reused;
    const pos = new Float32Array(BURST_CAP * 3);
    const vel = new Float32Array(BURST_CAP * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ size: 0.08, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    return { pts, geo, mat, pos, vel, n: 0, born: 0, life: 0, grav: 0, drag: 0, active: false };
  }

  private addLight(x: number, y: number, z: number, color: number, intensity: number, life: number): void {
    if (this.maxLights <= 0 || this.lights.length >= this.maxLights) return;
    const light = new THREE.PointLight(color, intensity, 14, 2);
    light.position.set(x, y, z);
    this.scene.add(light);
    this.lights.push({ light, born: performance.now(), life, intensity });
  }

  /** Jagged branching electric bolts radiating from (x,y,z). */
  private arc(x: number, y: number, z: number, color: number, reach: number, bolts: number, life: number): void {
    const pts: number[] = [];
    for (let b = 0; b < bolts; b++) {
      const ang = Math.random() * Math.PI * 2;
      const dx = Math.cos(ang);
      const dz = Math.sin(ang);
      let px = x;
      let py = y;
      let pz = z;
      const segs = 4 + Math.floor(Math.random() * 3);
      const step = reach / segs;
      for (let s = 0; s < segs; s++) {
        const nx = x + dx * step * (s + 1) + (Math.random() - 0.5) * 0.5;
        const ny = y + (Math.random() - 0.5) * 0.7;
        const nz = z + dz * step * (s + 1) + (Math.random() - 0.5) * 0.5;
        pts.push(px, py, pz, nx, ny, nz);
        px = nx;
        py = ny;
        pz = nz;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
    const line = new THREE.LineSegments(geo, mat);
    line.frustumCulled = false;
    this.scene.add(line);
    this.arcs.push({ line, geo, mat, born: performance.now(), life });
  }

  /** A pooled Points cloud placed on a shell and rushing INWARD to the centre. */
  private implodeBurst(x: number, y: number, z: number, r: number, n: number, color: number): void {
    if (n <= 0) return;
    const bu = this.acquireBurst();
    bu.n = Math.min(n, BURST_CAP);
    for (let p = 0; p < bu.n; p++) {
      const o = p * 3;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      const rad = r * (0.7 + Math.random() * 0.5);
      const px = Math.sin(ph) * Math.cos(th) * rad;
      const py = Math.abs(Math.cos(ph)) * rad * 0.6;
      const pz = Math.sin(ph) * Math.sin(th) * rad;
      bu.pos[o] = x + px;
      bu.pos[o + 1] = y + py + 0.3;
      bu.pos[o + 2] = z + pz;
      const d = Math.hypot(px, py, pz) || 1;
      const sp = 5 + Math.random() * 4;
      bu.vel[o] = (-px / d) * sp;
      bu.vel[o + 1] = (-py / d) * sp;
      bu.vel[o + 2] = (-pz / d) * sp;
    }
    bu.geo.setDrawRange(0, bu.n);
    (bu.geo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    bu.mat.color.setHex(color);
    bu.mat.size = 0.08;
    bu.mat.opacity = 1;
    bu.born = performance.now();
    bu.life = 520;
    bu.grav = 0; // no gravity/drag → they rush straight to the centre
    bu.drag = 0;
    bu.active = true;
    this.scene.add(bu.pts);
    this.bursts.push(bu);
  }
}
