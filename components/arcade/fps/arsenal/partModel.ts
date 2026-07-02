/**
 * Engineering part RENDERER — turns a part's parametric `PartModelSpec` into visible
 * primitive geometry (boxes / cylinders / cones only, zero assets), and overlays the
 * player's EQUIPPED parts onto the base weapon at per-weapon slot anchors so every
 * purchase physically appears on the gun. Phase 2 slice: the Pulse AR is fully
 * slot-refactored; other weapons fall back to their base model until their own slice.
 *
 * Imported ONLY by the /arcade chunk.
 */
import * as THREE from 'three';
import type { RenderTier } from '../materials';
import { accent, box, coneZ, cylZ, metal } from '../models/parts';
import { buildGun } from '../models';
import type { PartModelSpec } from './parts';
import type { EngPart } from './parts';
import type { SlotKind } from './categories';

// ── per-slot geometry generators (local space; anchored by SLOT_ANCHORS) ──────────
function barrelMesh(s: PartModelSpec, tier: RenderTier): THREE.Group {
  const g = new THREE.Group();
  const body = metal(s.body, tier);
  const glow = accent(s.accent, tier, 1.2);
  const len = 0.3 * s.len;
  const r = 0.03 * s.girth;
  g.add(cylZ(r, len, body, 0, 0, -len / 2)); // extends −Z (muzzle forward)
  for (let i = 0; i < s.vents; i++) g.add(box(r * 2.4, 0.012, 0.02, body, 0, 0, -0.05 - i * 0.05));
  const mz = -len;
  if (s.muzzle === 1) g.add(coneZ(r * 1.5, r, 0.06, body, 0, 0, mz - 0.03)); // brake
  else if (s.muzzle === 2) for (const a of [0, 1, 2]) g.add(box(0.012, 0.03, 0.05, body, Math.cos(a * 2.1) * r * 1.3, Math.sin(a * 2.1) * r * 1.3, mz - 0.03)); // ports
  else if (s.muzzle === 3) g.add(cylZ(r * 1.6, 0.06, body, 0, 0, mz - 0.03)); // shroud
  if (s.emissive > 0.02) g.add(box(r * 1.3, r * 1.3, 0.02, glow, 0, 0, mz + 0.005)); // glowing tip
  return g;
}
function receiverMesh(s: PartModelSpec, tier: RenderTier): THREE.Group {
  const g = new THREE.Group();
  const body = metal(s.body, tier);
  const glow = accent(s.accent, tier, 1.0);
  g.add(box(0.09 * s.girth, 0.06, 0.2 * s.len, body, 0, 0, 0));
  for (let i = 0; i < s.segs; i++) g.add(box(0.1 * s.girth, 0.014, 0.03, body, 0, 0.035, 0.06 - i * 0.05)); // top rail teeth
  if (s.emissive > 0.2) g.add(box(0.02, 0.02, 0.12, glow, 0.05, 0, 0)); // side conduit
  return g;
}
function magMesh(s: PartModelSpec, tier: RenderTier): THREE.Group {
  const g = new THREE.Group();
  const body = metal(s.body, tier);
  const glow = accent(s.accent, tier, 1.4);
  const h = 0.16 * s.len;
  g.add(box(0.07 * s.girth, h, 0.1, body, 0, -h / 2, 0));
  if (s.taper > 0) g.rotation.x = s.taper * 0.4; // curved-mag rake
  if (s.emissive > 0.2) g.add(box(0.02, h * 0.7, 0.02, glow, 0.036 * s.girth, -h / 2, 0)); // ammo-cell window
  return g;
}
function opticMesh(s: PartModelSpec, tier: RenderTier): THREE.Group {
  const g = new THREE.Group();
  const body = metal(s.body, tier);
  const glow = accent(s.accent, tier, 1.6);
  g.add(box(0.05 * s.girth, 0.04, 0.12 * s.len, body, 0, 0.02, 0)); // scope body
  g.add(cylZ(0.02 * s.girth, 0.05, body, 0, 0.02, -0.06 * s.len)); // objective
  g.add(box(0.02, 0.02, 0.01, glow, 0, 0.02, 0.06 * s.len)); // reticle glow
  if (s.segs > 2) g.add(box(0.06 * s.girth, 0.012, 0.03, body, 0, 0.045, 0)); // turret
  return g;
}
function stockMesh(s: PartModelSpec, tier: RenderTier): THREE.Group {
  const g = new THREE.Group();
  const body = metal(s.body, tier);
  const len = 0.16 * s.len;
  g.add(box(0.03, 0.02, len, body, 0, 0.04, len / 2));
  g.add(box(0.03, 0.02, len, body, 0, -0.05, len / 2));
  g.add(box(0.03, 0.11, 0.02, body, 0, -0.005, len));
  if (s.girth > 1.1) g.add(box(0.05, 0.1, 0.05, body, 0, -0.02, len)); // solid butt
  return g;
}
function genericMesh(s: PartModelSpec, tier: RenderTier): THREE.Group {
  const g = new THREE.Group();
  const body = metal(s.body, tier);
  const glow = accent(s.accent, tier, 1.0);
  g.add(box(0.06 * s.girth, 0.06, 0.08 * s.len, body, 0, 0, 0));
  if (s.emissive > 0.2) g.add(box(0.02, 0.02, 0.09 * s.len, glow, 0.03, 0, 0));
  return g;
}

// ── bespoke generators for the energy / launcher / support slots ──────────────────
function emitterMesh(s: PartModelSpec, tier: RenderTier): THREE.Group {
  const g = new THREE.Group();
  const body = metal(s.body, tier);
  const glow = accent(s.accent, tier, 1.4 + s.emissive);
  const r = 0.05 * s.girth;
  g.add(cylZ(r, 0.1 * s.len, body, 0, 0, -0.05));
  g.add(cylZ(r * 0.6, 0.13 * s.len, glow, 0, 0, -0.08)); // glowing bore
  g.add(cylZ(r * 1.2, 0.02, glow, 0, 0, -0.11)); // emitter ring
  const n = Math.max(3, s.segs);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    g.add(box(0.014, 0.014, 0.09 * s.len, body, Math.cos(a) * r * 1.15, Math.sin(a) * r * 1.15, -0.06)); // focusing prongs
  }
  return g;
}
function coreMesh(s: PartModelSpec, tier: RenderTier): THREE.Group {
  const g = new THREE.Group();
  const body = metal(s.body, tier);
  const glow = accent(s.accent, tier, 1.5 + s.emissive);
  g.add(box(0.06 * s.girth, 0.09, 0.13 * s.len, body, 0, 0, 0)); // energy cell block
  g.add(box(0.02, 0.07, 0.11 * s.len, glow, 0.035 * s.girth, 0, 0)); // glowing window
  g.add(box(0.02, 0.07, 0.11 * s.len, glow, -0.035 * s.girth, 0, 0));
  for (let i = 0; i < s.segs; i++) g.add(cylZ(0.016, 0.06, body, 0, 0.055, 0.04 - i * 0.04)); // top conduits
  return g;
}
function coolingMesh(s: PartModelSpec, tier: RenderTier): THREE.Group {
  const g = new THREE.Group();
  const body = metal(s.body, tier);
  const glow = accent(s.accent, tier, 1.2);
  const n = Math.max(3, s.segs + s.vents);
  for (let i = 0; i < n; i++) g.add(box(0.1 * s.girth, 0.06, 0.012, body, 0, 0.02, -0.03 + i * 0.02)); // fin stack
  if (s.emissive > 0.3) g.add(box(0.02, 0.05, 0.012 * n, glow, 0.05 * s.girth, 0.02, -0.01));
  return g;
}
function targetingMesh(s: PartModelSpec, tier: RenderTier): THREE.Group {
  const g = new THREE.Group();
  const body = metal(s.body, tier);
  const glow = accent(s.accent, tier, 1.6);
  g.add(box(0.05 * s.girth, 0.04, 0.1 * s.len, body, 0, 0, 0)); // sensor module
  g.add(cylZ(0.022 * s.girth, 0.03, glow, 0, 0, -0.055 * s.len)); // lens
  g.add(box(0.03, 0.012, 0.03, body, 0, 0.026, 0.01)); // top nub
  return g;
}
function reactorMesh(s: PartModelSpec, tier: RenderTier): THREE.Group {
  const g = new THREE.Group();
  const body = metal(s.body, tier);
  const glow = accent(s.accent, tier, 1.4 + s.emissive);
  g.add(box(0.09 * s.girth, 0.1, 0.15 * s.len, body, 0, 0, 0)); // rear battery
  g.add(box(0.02, 0.07, 0.11 * s.len, glow, 0.048 * s.girth, 0, 0)); // glow strip
  for (let i = 0; i < 2; i++) g.add(cylZ(0.02, 0.09, body, -0.03 + i * 0.06, 0.06, 0)); // top coils
  return g;
}
function warheadMesh(s: PartModelSpec, tier: RenderTier): THREE.Group {
  const g = new THREE.Group();
  const body = metal(s.body, tier);
  const glow = accent(s.accent, tier, 1.6);
  const r = 0.05 * s.girth;
  g.add(cylZ(r, 0.1 * s.len, body, 0, 0, 0));
  g.add(coneZ(0, r, 0.1 * s.len, s.emissive > 0.3 ? glow : body, 0, 0, -0.1 * s.len)); // nose cone
  for (let i = 0; i < 3; i++) g.add(cylZ(r * 1.06, 0.014, body, 0, 0, 0.03 - i * 0.03)); // bands
  return g;
}
function stabilizerMesh(s: PartModelSpec, tier: RenderTier): THREE.Group {
  const g = new THREE.Group();
  const body = metal(s.body, tier);
  for (const sgn of [-1, 1]) {
    const f = box(0.02, 0.02, 0.11 * s.len, body, sgn * 0.04, 0, 0);
    f.rotation.y = sgn * 0.3;
    g.add(f);
  }
  g.add(box(0.06 * s.girth, 0.02, 0.05, body, 0, 0, 0.02)); // mount
  if (s.emissive > 0.3) g.add(box(0.012, 0.012, 0.08, accent(s.accent, tier, 1.4), 0, 0.02, 0));
  return g;
}
function boltMesh(s: PartModelSpec, tier: RenderTier): THREE.Group {
  const g = new THREE.Group();
  const body = metal(s.body, tier);
  g.add(box(0.045 * s.girth, 0.05, 0.09 * s.len, body, 0, 0, 0)); // bolt block
  g.add(box(0.06, 0.02, 0.025, body, 0.04, 0.02, 0)); // charging handle
  if (s.emissive > 0.3) g.add(box(0.02, 0.02, 0.02, accent(s.accent, tier, 1.5), 0, 0.03, 0));
  return g;
}
function stabilityMesh(s: PartModelSpec, tier: RenderTier): THREE.Group {
  const g = new THREE.Group();
  const body = metal(s.body, tier);
  for (const sgn of [-1, 1]) {
    const leg = box(0.015, 0.12 * s.len, 0.015, body, sgn * 0.03, -0.06 * s.len, 0);
    leg.rotation.z = sgn * 0.45;
    g.add(leg);
  }
  g.add(box(0.05 * s.girth, 0.02, 0.05, body, 0, 0, 0)); // mount
  return g;
}
function gripMesh(s: PartModelSpec, tier: RenderTier): THREE.Group {
  const g = new THREE.Group();
  const body = metal(s.body, tier);
  const grp = box(0.035 * s.girth, 0.11 * s.len, 0.045, body, 0, -0.055 * s.len, 0);
  grp.rotation.x = 0.22;
  g.add(grp);
  if (s.emissive > 0.3) g.add(box(0.01, 0.06, 0.01, accent(s.accent, tier, 1.4), 0.02, -0.045, 0));
  return g;
}

/** Build a single part's primitive geometry (local space; caller positions it). */
export function buildPartMesh(spec: PartModelSpec, tier: RenderTier): THREE.Group {
  switch (spec.slot) {
    case 'barrel':
    case 'tube':
      return barrelMesh(spec, tier);
    case 'receiver':
    case 'frame':
    case 'slide':
      return receiverMesh(spec, tier);
    case 'magazine':
    case 'feed':
      return magMesh(spec, tier);
    case 'optic':
    case 'scope':
    case 'sight':
      return opticMesh(spec, tier);
    case 'rear':
    case 'stock':
      return stockMesh(spec, tier);
    case 'emitter':
      return emitterMesh(spec, tier);
    case 'core':
      return coreMesh(spec, tier);
    case 'cooling':
      return coolingMesh(spec, tier);
    case 'targeting':
      return targetingMesh(spec, tier);
    case 'reactor':
      return reactorMesh(spec, tier);
    case 'warhead':
      return warheadMesh(spec, tier);
    case 'stabilizer':
      return stabilizerMesh(spec, tier);
    case 'bolt':
      return boltMesh(spec, tier);
    case 'stability':
      return stabilityMesh(spec, tier);
    case 'grip':
      return gripMesh(spec, tier);
    default:
      return genericMesh(spec, tier);
  }
}

// ── per-weapon slot anchors (where each category mounts + which base mesh it hides) ─
interface Anchor {
  pos: [number, number, number];
  rot?: [number, number, number];
  hide?: string; // base mesh name to hide when this slot is equipped
}
const SLOT_ANCHORS: Record<string, Partial<Record<SlotKind, Anchor>>> = {
  // PULSE AR (Phase 2 vertical slice) — base meshes named base:barrel / mag / base:optic.
  ar: {
    barrel: { pos: [0, 0.01, -0.16], hide: 'base:barrel' },
    receiver: { pos: [0, 0.0, 0.04] },
    magazine: { pos: [0, -0.07, 0.08], hide: 'mag' },
    optic: { pos: [0, 0.1, 0.02], hide: 'base:optic' },
    rear: { pos: [0, -0.01, 0.22] },
  },
  // AR-01 "PULSE" (Standard Issue) — built with visible attachment points from the start.
  ar01: {
    barrel: { pos: [0, 0.02, -0.22], hide: 'base:barrel' },
    receiver: { pos: [0, 0.02, 0.04] },
    magazine: { pos: [0, -0.11, 0.06], hide: 'mag' },
    optic: { pos: [0, 0.19, 0.03], hide: 'base:optic' },
    rear: { pos: [0, -0.01, 0.38], hide: 'base:stock' },
  },
  cb02: {
    barrel: { pos: [0, 0.02, -0.32], hide: 'base:barrel' },
    receiver: { pos: [0, 0.0, 0.06] },
    magazine: { pos: [0, -0.08, 0.08], hide: 'mag' },
    optic: { pos: [0, 0.11, 0.02], hide: 'base:optic' },
    rear: { pos: [0, -0.01, 0.36], hide: 'base:stock' },
  },
  vx04: {
    barrel: { pos: [0, 0.01, -0.2], hide: 'base:barrel' },
    receiver: { pos: [0, 0.02, 0.06] },
    feed: { pos: [0, -0.11, 0.06], hide: 'base:feed' },
    cooling: { pos: [0.09, 0.08, 0.0] },
    stability: { pos: [0, 0.02, 0.3] },
  },
  er08: {
    emitter: { pos: [0, 0.02, -0.3], hide: 'base:emitter' },
    core: { pos: [0, 0.08, 0.0], hide: 'base:core' },
    cooling: { pos: [0, 0.05, -0.06], hide: 'base:cooling' },
    targeting: { pos: [0, 0.11, 0.06], hide: 'base:targeting' },
    reactor: { pos: [0, -0.01, 0.28], hide: 'base:reactor' },
  },
  rt06: {
    tube: { pos: [0, 0.02, -0.44] },
    warhead: { pos: [0, 0.02, -0.34], hide: 'base:warhead' },
    core: { pos: [0.12, 0.02, 0.12] },
    targeting: { pos: [0, 0.16, -0.12], hide: 'base:sight' },
    stabilizer: { pos: [0, 0.16, 0.28] },
  },
  gc03: {
    tube: { pos: [0, 0.02, -0.4] },
    warhead: { pos: [0, 0.02, -0.32] },
    core: { pos: [0.12, 0.06, 0.14] },
    targeting: { pos: [0, 0.14, -0.06], hide: 'base:sight' },
    stabilizer: { pos: [0.1, 0.1, 0.0] },
  },
  pm09: {
    tube: { pos: [0, 0.04, -0.42] },
    warhead: { pos: [0, 0.04, -0.34] },
    core: { pos: [0, 0.02, 0.08], hide: 'base:core' },
    targeting: { pos: [0, 0.04, -0.1], hide: 'base:targeting' },
    stabilizer: { pos: [0.12, 0.11, 0.04], hide: 'base:stabilizer' },
  },
  rc12: {
    barrel: { pos: [0, 0.01, -0.5] },
    receiver: { pos: [0, 0.0, 0.08] },
    scope: { pos: [0, 0.13, 0.06], hide: 'base:optic' },
    bolt: { pos: [0.08, 0.02, 0.14], hide: 'base:bolt' },
    stock: { pos: [0, -0.01, 0.34], hide: 'base:stock' },
  },
  sp01: {
    slide: { pos: [0, 0.03, -0.02], hide: 'base:slide' },
    frame: { pos: [0, -0.03, 0.0], hide: 'base:frame' },
    magazine: { pos: [0, -0.11, 0.06], hide: 'mag' },
    sight: { pos: [0, 0.09, 0.06], hide: 'base:sight' },
    grip: { pos: [0, -0.1, 0.06] },
  },
  mp05: {
    slide: { pos: [0, 0.03, 0.0], hide: 'base:slide' },
    frame: { pos: [0, -0.03, 0.02], hide: 'base:frame' },
    magazine: { pos: [0, -0.13, 0.08], hide: 'mag' },
    sight: { pos: [0, 0.1, 0.02], hide: 'base:sight' },
    grip: { pos: [0, -0.1, 0.1] },
  },
};

/** True if a weapon has been slot-refactored (its parts visibly attach). */
export function hasSlots(weaponId: string): boolean {
  return !!SLOT_ANCHORS[weaponId];
}

/** Build a weapon model with the player's EQUIPPED engineering parts overlaid at their
 *  slot anchors (hiding the base pieces they replace). Weapons without a slot map get
 *  their unmodified base model. */
export function buildEngineeredGun(id: string, tier: RenderTier, equipped: EngPart[]): THREE.Group {
  const g = buildGun(id, tier);
  const anchors = SLOT_ANCHORS[id];
  if (!anchors) return g;
  for (const part of equipped) {
    const a = anchors[part.slot];
    if (!a) continue;
    if (a.hide) {
      const m = g.getObjectByName(a.hide);
      if (m) m.visible = false;
    }
    const pm = buildPartMesh(part.model, tier);
    pm.position.set(a.pos[0], a.pos[1], a.pos[2]);
    if (a.rot) pm.rotation.set(a.rot[0], a.rot[1], a.rot[2]);
    pm.name = `eng:${part.slot}`;
    g.add(pm);
  }
  return g;
}
