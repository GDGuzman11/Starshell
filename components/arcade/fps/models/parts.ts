/**
 * Shared toolkit for the weapon models — per Gabe's "Retro FPS Weapon Design
 * Bible". Everything is built from ONLY BoxGeometry / CylinderGeometry /
 * CapsuleGeometry / PlaneGeometry (no meshes, no asset files) so the "from
 * scratch, zero assets" identity holds.
 *
 * Convention: every weapon is modelled pointing down −Z (the muzzle toward −Z,
 * which is the Three.js camera's forward), up = +Y, right = +X, centred near the
 * origin. The loadout preview frames each model to fit; the in-game viewmodel
 * scales it to a fixed on-screen size. Builders create a few shared materials and
 * reuse them across the model's meshes.
 */
import * as THREE from 'three';
import type { RenderTier } from '../materials';

/** Bible palette — primaries / secondaries (body colours). */
export const COL = {
  gunmetal: 0x363b43,
  titanium: 0x4b505a,
  matteBlack: 0x191b1f,
  olive: 0x474f37,
  bronze: 0x6e5230,
  burntSteel: 0x564942,
  steel: 0x6a7079,
};
/** Bible accents — ONE per weapon. */
export const ACCENT = {
  blue: 0x49a6ff,
  orange: 0xff7a2a,
  red: 0xff3a48,
  purple: 0xb15cff,
  green: 0x63ff84,
  amber: 0xffc24a,
};

/** Body metal. Crisp PBR on desktop; cheap Lambert on mobile. */
export function metal(color: number, tier: RenderTier, rough = 0.5, metalness = 0.85): THREE.Material {
  if (tier === 'mobile') return new THREE.MeshLambertMaterial({ color });
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness });
}
/** Glowing accent (energy/heat/warning). Emissive so in-game Bloom catches it. */
export function accent(color: number, tier: RenderTier, intensity = 1.5): THREE.Material {
  if (tier === 'mobile') return new THREE.MeshBasicMaterial({ color });
  return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.35, metalness: 0.1 });
}

// ── geometry helpers (all return a positioned Mesh) ───────────────────────────
export function box(w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}
/** Cylinder along Z (barrels, shrouds). */
export function cylZ(r: number, len: number, mat: THREE.Material, x = 0, y = 0, z = 0, seg = 18): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat);
  m.rotation.x = Math.PI / 2;
  m.position.set(x, y, z);
  return m;
}
/** Tapered cylinder along Z (muzzle brakes, cones). */
export function coneZ(rFront: number, rBack: number, len: number, mat: THREE.Material, x = 0, y = 0, z = 0, seg = 18): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rFront, rBack, len, seg), mat);
  m.rotation.x = Math.PI / 2;
  m.position.set(x, y, z);
  return m;
}
/** Cylinder along Y (magazines, drums, grips, transformers). */
export function cylY(r: number, len: number, mat: THREE.Material, x = 0, y = 0, z = 0, seg = 18): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat);
  m.position.set(x, y, z);
  return m;
}
/** Cylinder along X (cross drums, coil cores, cylinders of a revolver). */
export function cylX(r: number, len: number, mat: THREE.Material, x = 0, y = 0, z = 0, seg = 18): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat);
  m.rotation.z = Math.PI / 2;
  m.position.set(x, y, z);
  return m;
}
/** Capsule along Z (rounded receivers, energy cells). */
export function capsuleZ(r: number, len: number, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 12), mat);
  m.rotation.x = Math.PI / 2;
  m.position.set(x, y, z);
  return m;
}
/** Capsule along Y (upright rounded bodies — grenades, orbs). */
export function capsuleY(r: number, len: number, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 5, 14), mat);
  m.position.set(x, y, z);
  return m;
}

// ── composite details ─────────────────────────────────────────────────────────
/** Stack of cooling fins (thin plates) along Z. Returns a Group. */
export function finStack(count: number, gap: number, w: number, h: number, mat: THREE.Material, x: number, y: number, zStart: number): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < count; i++) g.add(box(w, h, 0.012, mat, x, y, zStart - i * gap));
  return g;
}
/** Stack of rings (open coils) along Z — suggests an electromagnetic coil. */
export function coilStack(count: number, gap: number, r: number, mat: THREE.Material, x: number, y: number, zStart: number): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < count; i++) g.add(cylZ(r, 0.02, mat, x, y, zStart - i * gap, 14));
  return g;
}
/** Row of vent slats on a side panel (thin gaps suggested by raised ribs). */
export function ventSlats(count: number, gap: number, w: number, h: number, mat: THREE.Material, x: number, yStart: number, z: number): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < count; i++) g.add(box(w, h, 0.02, mat, x, yStart - i * gap, z));
  return g;
}
/** A pistol/SMG grip: a slightly back-raked block. */
export function grip(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, rake = 0.32): THREE.Mesh {
  const m = box(w, h, d, mat, x, y, z);
  m.rotation.x = rake;
  return m;
}

/** Assemble a model from parts and tag it so animators can find moving bits. */
export function model(parts: THREE.Object3D[]): THREE.Group {
  const g = new THREE.Group();
  for (const p of parts) g.add(p);
  return g;
}
