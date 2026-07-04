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
import type { ThrowKind } from '../weapons';

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

  /** Per-frame trail for an in-flight grenade (kind-specific; frag only for now). */
  trail(kind: ThrowKind, x: number, y: number, z: number, dt: number): void {
    this.trailT += dt;
    if (this.trailT < 0.028) return;
    this.trailT = 0;
    if (kind === 'frag') {
      // A thin grey smoke wisp + a faint hot ember peeling off the casing.
      this.sprite(this.soft, 0x5b544a, false, x, y, z, 0, 0.5, 0, 0.12, 0.18, 0.4, 0, 360, true);
      this.sprite(this.soft, 0xff8a3a, true, x, y, z, 0, 0.2, 0, 0.1, 0.03, 0.28, 0, 200, true);
    }
  }

  /** Detonation burst for a throwable kind at (x,y,z); `radius` is VISUAL size. */
  detonate(kind: ThrowKind, x: number, y: number, z: number, radius: number, color: number): void {
    const r = Math.max(1, radius);
    if (kind === 'frag') return this.detonateFrag(x, y, z, r);
    // Generic fallback (≈ the previous single-sphere flash) for kinds not yet
    // given a bespoke signature — keeps them looking as before during rollout.
    this.sprite(this.soft, color, true, x, y + 0.3, z, 0, 0, 0, r * 0.3, r * 1.2, 1, 0, 320, true);
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
    this.billboards.length = 0;
    this.bursts.length = 0;
    this.burstPool.length = 0;
    this.lights.length = 0;
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
}
