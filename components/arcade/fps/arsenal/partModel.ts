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
