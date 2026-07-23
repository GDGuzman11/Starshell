/**
 * CAPITAL SHIP MODEL — builds a HUGE procedural "Star Destroyer" from primitives, driven
 * by a CapitalDNA roll. Zero-asset: boxes / cylinders / cones / torus / spheres + emissive
 * materials only. The ship runs along +Z (nose at −Z), centred at the origin; the caller
 * positions / scales it above the arena.
 *
 * The look follows the STARSHELL visual bible (100 reference designs): near-black hulls,
 * molten emissive SEAMS, WINDOW BANKS, and ONE dominant glowing CORE — read by silhouette
 * first, heavily backlit. `dna.hull` selects one of ~11 SILHOUETTE FAMILIES, each with a
 * dedicated builder, so no two families look alike. A LIMITED set of animated sub-
 * assemblies (turrets rotate, reactor + engines pulse, rings/cores spin) is stashed on
 * `userData.anim` and driven by `animateCapital`.
 */
import * as THREE from 'three';
import type { RenderTier } from '../materials';
import { accent, box, coneZ, cylY, cylZ, metal } from '../models/parts';
import { rng } from '../rand';
import type { CapitalDNA } from './dna';

export interface CapitalAnim {
  turrets: THREE.Object3D[]; // rotate on Y
  reactor: THREE.MeshStandardMaterial[]; // pulse emissive
  engines: THREE.MeshStandardMaterial[]; // pulse exhaust
  spin: THREE.Object3D[]; // rings / cores that slowly rotate
  t: number;
}

/** Everything a family builder needs — shared materials, dims, rng, and the anim sink. */
interface Ctx {
  g: THREE.Group;
  dna: CapitalDNA;
  tier: RenderTier;
  desktop: boolean;
  r: () => number;
  L: number;
  W: number;
  H: number;
  armor: THREE.Material; // near-black hull body
  dark: THREE.Material; // darker detail
  steel: THREE.Material; // structural
  glow: THREE.Material; // accent emissive (seams / windows / rails)
  engineMat: THREE.MeshStandardMaterial;
  anim: CapitalAnim;
}

// ── local geometry helpers (torus + sphere aren't in parts.ts) ──────────────────
/** Ring in the XY plane (hole facing ±Z) — eclipse / singularity rings. */
function torusZ(radius: number, tube: number, mat: THREE.Material, x = 0, y = 0, z = 0, seg = 32): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 10, seg), mat);
  m.position.set(x, y, z);
  return m;
}
function sphere(radius: number, mat: THREE.Material, x = 0, y = 0, z = 0, seg = 18): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius, seg, Math.max(8, seg - 4)), mat);
  m.position.set(x, y, z);
  return m;
}

// ── shared detail language (seams / windows / core / turrets / engines) ─────────
/** A run of thin emissive strips along Z = molten hull seams / light rails. */
function seamRun(c: Ctx, x: number, y: number, zFrom: number, zTo: number, count: number, w = 0.4): void {
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    c.g.add(box(w, 0.3, (Math.abs(zTo - zFrom) / count) * 0.6, c.glow, x, y, zFrom + (zTo - zFrom) * t));
  }
}
/** A grid of tiny emissive squares on a flank = window / porthole bank (desktop only). */
function windowBank(c: Ctx, x: number, y: number, z: number, cols: number, rows: number, dz: number, dy: number): void {
  if (!c.desktop) return;
  for (let iz = 0; iz < cols; iz++)
    for (let iy = 0; iy < rows; iy++) c.g.add(box(0.35, 0.45, 0.45, c.glow, x, y + (iy - (rows - 1) / 2) * dy, z + (iz - (cols - 1) / 2) * dz));
}
/** The ONE dominant glowing core — a bright emissive sphere in a dark housing ring. */
function coreGlow(c: Ctx, x: number, y: number, z: number, radius: number, spin = false): void {
  const mat = accent(c.dna.accent, c.tier, 2.6) as THREE.MeshStandardMaterial;
  c.g.add(cylY(radius * 1.35, radius * 0.5, c.dark, x, y, z)); // housing collar
  const core = sphere(radius, mat, x, y, z, 16);
  c.g.add(core);
  c.anim.reactor.push(mat);
  if (spin) c.anim.spin.push(core);
}
/** A rotating turret (base ring + housing + twin barrels + targeting glow). */
function turret(c: Ctx, x: number, y: number, z: number, s = 1): void {
  const t = new THREE.Group();
  t.position.set(x, y, z);
  t.add(cylY(1.6 * s, 0.9 * s, c.steel, 0, 0, 0));
  t.add(box(2.2 * s, 1.4 * s, 2.6 * s, c.dark, 0, 0.9 * s, 0));
  t.add(cylZ(0.4 * s, 4 * s, c.dark, -0.35 * s, 0.9 * s, -2 * s));
  t.add(cylZ(0.4 * s, 4 * s, c.dark, 0.35 * s, 0.9 * s, -2 * s));
  t.add(box(0.5 * s, 0.5 * s, 0.5 * s, c.glow, 0, 1.5 * s, -0.5 * s));
  c.g.add(t);
  c.anim.turrets.push(t);
}
/** Rear engine cluster — dark nacelles with pulsing exhaust discs. */
function engineBank(c: Ctx, y = 0, spread = 0.9, zBack?: number): void {
  const z = zBack ?? c.L / 2;
  for (let i = 0; i < c.dna.engines; i++) {
    const ex = (i - (c.dna.engines - 1) / 2) * (c.W / c.dna.engines) * spread;
    c.g.add(cylZ(c.H * 0.32, c.H * 1.2, c.dark, ex, y, z + c.H * 0.5));
    c.g.add(cylZ(c.H * 0.26, c.H * 0.3, c.engineMat, ex, y, z + c.H * 1.0));
  }
}
/** Twin sensor masts + a run of edge nav lights (desktop denser). */
function sensorsAndLights(c: Ctx): void {
  for (const sx of [-1, 1]) {
    c.g.add(cylY(0.5, c.H * 1.6, c.steel, sx * c.W * 0.4, c.H * 0.9, -c.L * 0.15));
    c.g.add(box(1, 1, 1, c.glow, sx * c.W * 0.4, c.H * 1.7, -c.L * 0.15));
  }
  const n = c.desktop ? 10 : 5;
  for (let i = 0; i < n; i++) {
    const z = c.L / 2 - i * (c.L / n);
    c.g.add(box(0.5, 0.5, 0.5, c.glow, c.W / 2, -c.H / 4, z));
    c.g.add(box(0.5, 0.5, 0.5, c.glow, -c.W / 2, -c.H / 4, z));
  }
}
/** A command tower / bridge (shared by the hull-type families). */
function bridge(c: Ctx): void {
  const towerZ = c.dna.bridge === 'fore' ? -c.L * 0.3 : c.dna.bridge === 'aft' ? c.L * 0.32 : 0;
  const th = c.dna.bridge === 'spinal' ? c.H * 2.4 : c.H * 1.6;
  const tw = c.W * 0.3;
  const towerY = c.H * 0.6;
  c.g.add(box(tw, th, tw * 1.4, c.steel, 0, towerY + th / 2, towerZ));
  c.g.add(box(tw * 0.8, th * 0.4, 0.4, c.glow, 0, towerY + th * 0.7, towerZ - tw * 0.7));
  c.g.add(cylY(0.4, th * 0.7, c.dark, tw * 0.3, towerY + th, towerZ));
  c.g.add(box(1.2, 0.6, 1.2, c.glow, tw * 0.3, towerY + th * 1.35, towerZ));
  windowBank(c, tw * 0.52, towerY + th * 0.5, towerZ, 3, 3, 0, th * 0.14);
}
/** Scatter N turrets across the dorsal deck. */
function scatterTurrets(c: Ctx, spanW = 0.42, spanZ = 0.42, y?: number): void {
  const yy = y ?? c.H / 2 + 0.8;
  for (let i = 0; i < c.dna.turrets; i++) turret(c, (c.r() * 2 - 1) * c.W * spanW, yy, (c.r() * 2 - 1) * c.L * spanZ);
}

// ── SILHOUETTE FAMILIES ─────────────────────────────────────────────────────────
function buildDagger(c: Ctx): void {
  const { W, H, L } = c;
  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    c.g.add(box(W * (1 - t * 0.9), H * (1 - t * 0.55), L / 8 + 0.6, c.armor, 0, 0, L / 2 - (i + 0.5) * (L / 8)));
  }
  c.g.add(box(W * 0.16, H * 1.3, L * 0.9, c.steel, 0, H * 0.2, 0)); // dorsal ridge spine
  seamRun(c, 0, H * 0.55, L * 0.42, -L * 0.42, 8);
  seamRun(c, W * 0.28, 0, L * 0.3, -L * 0.2, 6, 0.3);
  seamRun(c, -W * 0.28, 0, L * 0.3, -L * 0.2, 6, 0.3);
  windowBank(c, W * 0.3, -H * 0.1, L * 0.15, 4, 2, L * 0.06, H * 0.22);
  windowBank(c, -W * 0.3, -H * 0.1, L * 0.15, 4, 2, L * 0.06, H * 0.22);
  bridge(c);
  engineBank(c);
  coreGlow(c, 0, H * 0.35, L * 0.28, H * 0.28);
  scatterTurrets(c, 0.28, 0.36);
  sensorsAndLights(c);
}

function buildDreadnought(c: Ctx): void {
  const { W, H, L } = c;
  c.g.add(box(W, H, L, c.armor, 0, 0, 0)); // slab base
  // stacked receding plate tiers (the "city block" stack)
  for (let i = 1; i <= 3; i++) {
    const s = 1 - i * 0.22;
    c.g.add(box(W * s, H * 0.5, L * s, c.dark, 0, H * 0.5 + i * H * 0.42, (c.r() - 0.5) * L * 0.1));
    seamRun(c, W * s * 0.5, H * 0.5 + i * H * 0.42, L * s * 0.45, -L * s * 0.45, 6, 0.3);
    seamRun(c, -W * s * 0.5, H * 0.5 + i * H * 0.42, L * s * 0.45, -L * s * 0.45, 6, 0.3);
  }
  // bristling superstructure blocks
  const blocks = c.desktop ? 10 : 5;
  for (let i = 0; i < blocks; i++) {
    const bw = W * (0.08 + c.r() * 0.1);
    c.g.add(box(bw, H * (0.8 + c.r() * 1.6), bw, c.steel, (c.r() * 2 - 1) * W * 0.4, H * 0.9, (c.r() * 2 - 1) * L * 0.42));
  }
  windowBank(c, W * 0.52, 0, 0, 6, 3, L * 0.11, H * 0.24);
  windowBank(c, -W * 0.52, 0, 0, 6, 3, L * 0.11, H * 0.24);
  seamRun(c, 0, H * 0.55, L * 0.46, -L * 0.46, 10);
  bridge(c);
  engineBank(c, 0, 1.0);
  coreGlow(c, 0, H * 1.4, L * 0.06, H * 0.42);
  scatterTurrets(c, 0.44, 0.44);
  sensorsAndLights(c);
}

function buildCathedral(c: Ctx): void {
  const { W, H, L } = c;
  c.g.add(box(W * 0.85, H, L, c.armor, 0, 0, 0)); // nave base
  const n = c.desktop ? 7 : 4;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const sx = (t - 0.5) * W * 0.7;
    const sh = H * (2.2 + Math.sin(t * Math.PI) * 2.6); // tallest in the middle
    c.g.add(box(W * 0.09, sh, W * 0.12, c.dark, sx, H * 0.5 + sh / 2, -L * 0.05)); // spire
    c.g.add(box(W * 0.06, sh * 0.5, W * 0.09, c.steel, sx, H * 0.5 + sh * 0.4, -L * 0.05)); // buttress
    c.g.add(box(0.35, sh * 0.7, 0.3, c.glow, sx, H * 0.5 + sh * 0.5, -L * 0.05 - W * 0.07)); // glowing slit
    c.g.add(box(W * 0.11, W * 0.11, W * 0.11, c.glow, sx, H * 0.5 + sh, -L * 0.05)); // apex beacon
  }
  seamRun(c, 0, H * 0.55, L * 0.46, -L * 0.46, 9);
  windowBank(c, W * 0.45, 0, L * 0.2, 5, 4, L * 0.09, H * 0.2);
  windowBank(c, -W * 0.45, 0, L * 0.2, 5, 4, L * 0.09, H * 0.2);
  engineBank(c);
  coreGlow(c, 0, H * 0.75, L * 0.3, H * 0.3);
  scatterTurrets(c, 0.4, 0.4);
  sensorsAndLights(c);
}

function buildRing(c: Ctx): void {
  const { W, H, L } = c;
  const R = L * 0.42;
  const ring = new THREE.Group();
  ring.add(torusZ(R, R * 0.12, c.armor, 0, 0, 0, 40)); // main dark ring
  ring.add(torusZ(R, R * 0.045, c.glow, 0, 0, R * 0.13, 40)); // inner emissive rail
  // radial spokes + turret nodes around the ring
  const nodes = c.desktop ? 8 : 5;
  for (let i = 0; i < nodes; i++) {
    const a = (i / nodes) * Math.PI * 2;
    const px = Math.cos(a) * R;
    const py = Math.sin(a) * R;
    const spoke = box(R * 0.5, 1.2, 1.2, c.steel, px * 0.6, py * 0.6, 0);
    spoke.rotation.z = a;
    ring.add(spoke);
    const node = box(3, 2.2, 3, c.dark, px, py, 0);
    node.lookAt(0, 0, 0);
    ring.add(node);
    ring.add(box(0.8, 0.8, 0.8, c.glow, px * 0.92, py * 0.92, 0));
  }
  c.g.add(ring);
  c.anim.spin.push(ring); // the ring slowly turns
  coreGlow(c, 0, 0, 0, R * 0.26, true); // suspended singularity core
  // a small command spar so it still reads as a warship, not a hoop
  c.g.add(box(W * 0.18, H * 0.5, L * 0.5, c.armor, 0, -R * 0.2, R * 0.2));
}

function buildBiomech(c: Ctx): void {
  const { W, H, L } = c;
  const central = new THREE.Mesh(new THREE.CapsuleGeometry(W * 0.32, L * 0.5, 6, 12), c.armor);
  central.rotation.x = Math.PI / 2; // central mass runs along Z
  c.g.add(central);
  const lumps = c.desktop ? 14 : 7;
  for (let i = 0; i < lumps; i++) {
    const px = (c.r() * 2 - 1) * W * 0.5;
    const py = (c.r() * 2 - 1) * H * 1.1;
    const pz = (c.r() * 2 - 1) * L * 0.46;
    const rad = W * (0.1 + c.r() * 0.22);
    const lump = sphere(rad, c.r() < 0.5 ? c.armor : c.dark, px, py, pz, 12);
    lump.scale.set(1, 0.7 + c.r() * 0.8, 1.4 + c.r());
    lump.rotation.set(c.r() * 3, c.r() * 3, c.r() * 3);
    c.g.add(lump);
    if (c.r() < 0.4) c.g.add(box(0.4, 0.4, rad * 2.2, c.glow, px, py, pz)); // glowing vein
  }
  // tendrils
  const tend = c.desktop ? 5 : 2;
  for (let i = 0; i < tend; i++) {
    const t = new THREE.Mesh(new THREE.CapsuleGeometry(W * 0.05, L * (0.3 + c.r() * 0.3), 4, 8), c.dark);
    t.position.set((c.r() * 2 - 1) * W * 0.4, (c.r() * 2 - 1) * H * 0.8, -L * (0.3 + c.r() * 0.2));
    t.rotation.set(c.r() * 2 - 1, c.r() * 2 - 1, c.r() * 2 - 1);
    c.g.add(t);
  }
  coreGlow(c, 0, 0, L * 0.05, W * 0.24, true); // a single pulsing "eye" / heart
  // a scatter of glowing pods
  for (let i = 0; i < (c.desktop ? 6 : 3); i++) c.g.add(sphere(1.2, c.glow, (c.r() * 2 - 1) * W * 0.55, (c.r() * 2 - 1) * H, (c.r() * 2 - 1) * L * 0.4, 8));
  engineBank(c, 0, 0.6);
}

function buildTrident(c: Ctx): void {
  const { W, H, L } = c;
  c.g.add(box(W * 0.5, H, L * 0.5, c.armor, 0, 0, L * 0.2)); // rear body
  for (const sx of [-1, 0, 1]) {
    const off = sx * W * 0.34;
    const len = sx === 0 ? L : L * 0.82;
    c.g.add(box(W * 0.2, H * 0.7, len, c.armor, off, sx === 0 ? 0 : -H * 0.1, (L - len) / 2 - L * 0.02)); // prong
    c.g.add(coneZ(0.5, W * 0.1, len * 0.28, c.dark, off, sx === 0 ? 0 : -H * 0.1, -len * 0.42)); // prong tip
    c.g.add(box(W * 0.07, H * 0.35, len * 0.5, c.glow, off, sx === 0 ? 0 : -H * 0.1, -len * 0.22)); // glow rail
  }
  seamRun(c, 0, H * 0.5, L * 0.3, -L * 0.3, 6);
  bridge(c);
  engineBank(c, 0, 0.9, L * 0.42);
  coreGlow(c, 0, H * 0.3, L * 0.3, H * 0.3);
  scatterTurrets(c, 0.36, 0.3);
  sensorsAndLights(c);
}

function buildCarrier(c: Ctx): void {
  const { W, H, L } = c;
  c.g.add(box(W * 1.5, H * 0.55, L, c.armor, 0, 0, 0)); // wide flat deck
  // hangar / launch rows down the deck
  const rows = c.desktop ? 6 : 3;
  for (let i = 0; i < rows; i++) {
    const z = L / 2 - (i + 0.5) * (L / rows);
    c.g.add(box(W * 1.2, 0.3, L / rows - 2, c.glow, 0, H * 0.29, z)); // launch strip
    c.g.add(box(W * 0.06, 0.6, L / rows - 2, c.dark, W * 0.4, H * 0.3, z)); // lane divider
    c.g.add(box(W * 0.06, 0.6, L / rows - 2, c.dark, -W * 0.4, H * 0.3, z));
  }
  // island command tower offset to starboard
  c.g.add(box(W * 0.22, H * 1.8, L * 0.18, c.steel, W * 0.6, H * 1.1, L * 0.1));
  windowBank(c, W * 0.72, H * 1.0, L * 0.1, 3, 4, 0, H * 0.2);
  c.g.add(box(W * 0.18, H * 0.4, 0.4, c.glow, W * 0.6, H * 1.6, L * 0.1 - L * 0.05));
  // hangar mouths on the flanks
  for (let i = 0; i < (c.desktop ? 4 : 2); i++) {
    const z = (i - 1.5) * L * 0.22;
    c.g.add(box(0.6, H * 0.3, L * 0.14, c.glow, W * 0.76, -H * 0.05, z));
    c.g.add(box(0.6, H * 0.3, L * 0.14, c.glow, -W * 0.76, -H * 0.05, z));
  }
  engineBank(c, 0, 1.3);
  coreGlow(c, W * 0.6, H * 2.0, L * 0.1, H * 0.22);
  scatterTurrets(c, 0.6, 0.4, H * 0.35);
  sensorsAndLights(c);
}

function buildSphere(c: Ctx): void {
  const { W, L } = c;
  const R = L * 0.34;
  c.g.add(sphere(R, c.armor, 0, 0, 0, 24)); // battlestation core
  c.g.add(torusZ(R * 1.02, R * 0.07, c.dark, 0, 0, 0, 40)); // equatorial trench frame
  c.g.add(torusZ(R * 1.0, R * 0.03, c.glow, 0, 0, 0, 40)); // trench glow
  // surface panel plates + a superlaser "eye" dish
  const plates = c.desktop ? 10 : 5;
  for (let i = 0; i < plates; i++) {
    const a = c.r() * Math.PI * 2;
    const b = (c.r() - 0.5) * Math.PI;
    const px = Math.cos(b) * Math.cos(a) * R;
    const py = Math.sin(b) * R;
    const pz = Math.cos(b) * Math.sin(a) * R;
    const pl = box(R * 0.28, R * 0.28, 1.2, c.steel, px, py, pz);
    pl.lookAt(0, 0, 0);
    c.g.add(pl);
  }
  const dish = box(R * 0.5, R * 0.5, 1.6, c.dark, 0, R * 0.35, -R * 0.92);
  dish.lookAt(0, 0, 0);
  c.g.add(dish);
  const eyeMat = accent(c.dna.accent, c.tier, 2.4) as THREE.MeshStandardMaterial; // superlaser "eye"
  c.g.add(sphere(R * 0.16, eyeMat, 0, R * 0.35, -R * 0.9, 12));
  c.anim.reactor.push(eyeMat);
  // surface turrets around the upper hemisphere
  for (let i = 0; i < Math.min(c.dna.turrets, c.desktop ? 10 : 5); i++) {
    const a = c.r() * Math.PI * 2;
    turret(c, Math.cos(a) * R * 0.95, R * 0.6, Math.sin(a) * R * 0.95, W < 40 ? 0.8 : 1);
  }
  engineBank(c, 0, 0.5, R * 1.1);
}

function buildObelisk(c: Ctx): void {
  const { W, H, L } = c;
  const height = L; // stands tall along Y
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(W * 0.16, W * 0.28, height, 4), c.armor); // tapered 4-sided monolith
  c.g.add(shaft);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.1, W * 0.16, height * 0.18, 4), c.dark);
  cap.position.y = height * 0.5;
  c.g.add(cap);
  // vertical glowing seams up the four faces
  for (const s of [-1, 1]) {
    c.g.add(box(0.35, height * 0.9, W * 0.02, c.glow, s * W * 0.2, 0, 0));
    c.g.add(box(W * 0.02, height * 0.9, 0.35, c.glow, 0, 0, s * W * 0.2));
  }
  c.g.add(box(W * 0.12, W * 0.12, W * 0.12, c.glow, 0, height * 0.6, 0)); // apex beacon
  coreGlow(c, 0, -height * 0.1, 0, W * 0.13, true); // internal core
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(W * 0.34, W * 0.34, H * 0.4, 8), c.steel);
  plinth.position.y = -height * 0.5; // base plinth
  c.g.add(plinth);
}

function buildCatamaran(c: Ctx): void {
  const { W, H, L } = c;
  for (const s of [-1, 1]) {
    c.g.add(box(W * 0.28, H, L, c.armor, s * W * 0.42, 0, 0)); // parallel hull
    c.g.add(coneZ(0.6, W * 0.14, L * 0.2, c.dark, s * W * 0.42, 0, -L * 0.5)); // hull nose
    seamRun(c, s * W * 0.42, H * 0.5, L * 0.44, -L * 0.44, 8);
    windowBank(c, s * W * 0.56, 0, 0, 5, 3, L * 0.12, H * 0.24);
  }
  // connecting spine bridge + energy beam between hulls
  c.g.add(box(W * 0.56, H * 0.3, L * 0.3, c.steel, 0, H * 0.1, 0));
  c.g.add(box(W * 0.56, 0.5, 0.5, c.glow, 0, H * 0.1, 0));
  coreGlow(c, 0, H * 0.1, 0, H * 0.32);
  bridge(c);
  engineBank(c, 0, 1.4);
  scatterTurrets(c, 0.5, 0.4);
  sensorsAndLights(c);
}

function buildSpine(c: Ctx): void {
  const { W, H, L } = c;
  c.g.add(box(W * 0.22, H * 1.4, L, c.steel, 0, 0, 0)); // tall central spine
  for (const sx of [-1, 1]) c.g.add(box(W * 0.55, H * 0.5, L * 0.72, c.armor, sx * W * 0.36, -H * 0.2, 0)); // wings
  seamRun(c, 0, H * 0.7, L * 0.46, -L * 0.46, 10);
  windowBank(c, W * 0.62, -H * 0.2, 0, 5, 2, L * 0.12, H * 0.2);
  windowBank(c, -W * 0.62, -H * 0.2, 0, 5, 2, L * 0.12, H * 0.2);
  bridge(c);
  engineBank(c);
  coreGlow(c, 0, H * 0.5, L * 0.2, H * 0.34);
  scatterTurrets(c, 0.4, 0.42);
  sensorsAndLights(c);
}

function buildSlab(c: Ctx): void {
  const { W, H, L } = c;
  c.g.add(box(W, H, L, c.armor, 0, 0, 0));
  c.g.add(box(W * 0.5, H * 0.7, L * 0.4, c.steel, 0, 0, -L * 0.34)); // nose block
  seamRun(c, 0, H * 0.55, L * 0.46, -L * 0.46, 10);
  windowBank(c, W * 0.52, 0, 0, 6, 3, L * 0.11, H * 0.24);
  windowBank(c, -W * 0.52, 0, 0, 6, 3, L * 0.11, H * 0.24);
  bridge(c);
  engineBank(c);
  coreGlow(c, 0, H * 0.7, L * 0.08, H * 0.36);
  scatterTurrets(c);
  sensorsAndLights(c);
}

const BUILDERS: Record<CapitalDNA['hull'], (c: Ctx) => void> = {
  dagger: buildDagger,
  dreadnought: buildDreadnought,
  cathedral: buildCathedral,
  ring: buildRing,
  biomech: buildBiomech,
  trident: buildTrident,
  carrier: buildCarrier,
  sphere: buildSphere,
  obelisk: buildObelisk,
  catamaran: buildCatamaran,
  spine: buildSpine,
  slab: buildSlab,
};

export function buildCapital(dna: CapitalDNA, tier: RenderTier): THREE.Group {
  const desktop = tier === 'desktop';
  const g = new THREE.Group();
  const anim: CapitalAnim = { turrets: [], reactor: [], engines: [], spin: [], t: 0 };
  const c: Ctx = {
    g,
    dna,
    tier,
    desktop,
    r: rng(dna.seed ^ 0x5ca1),
    L: dna.length,
    W: dna.length * 0.32,
    H: dna.length * 0.12,
    armor: metal(dna.body, tier, 0.65, 0.6),
    dark: metal(0x0a0c10, tier, 0.7, 0.5),
    steel: metal(0x2b2f36, tier, 0.5, 0.8),
    glow: accent(dna.accent, tier, 1.5),
    engineMat: accent(0x8fd8ff, tier, 2.0) as THREE.MeshStandardMaterial,
    anim,
  };
  anim.engines.push(c.engineMat);
  (BUILDERS[dna.hull] ?? buildSlab)(c);
  g.userData.anim = anim;
  return g;
}

/** Per-frame animation: rotate turrets, pulse the reactor + engines, spin rings/cores. */
export function animateCapital(model: THREE.Object3D, dt: number, now: number): void {
  const a = model.userData.anim as CapitalAnim | undefined;
  if (!a) return;
  a.t += dt;
  for (let i = 0; i < a.turrets.length; i++) a.turrets[i].rotation.y = Math.sin(now * 0.0004 + i) * 0.9;
  const pulse = 1.8 + Math.sin(now * 0.003) * 0.7;
  for (const m of a.reactor) m.emissiveIntensity = pulse;
  for (const m of a.engines) m.emissiveIntensity = 1.6 + Math.sin(now * 0.006) * 0.4;
  for (const s of a.spin) s.rotation.z = now * 0.00012;
}
