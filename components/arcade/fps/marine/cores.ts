/**
 * POWER-CORE / MODULE GEOMETRY LANGUAGES — Armor Overhaul slice 7b. The 'core' family
 * covers every glowing module a division carries (power cores, breaching/shield
 * emitters, drone bays, nano injectors), so each identity gets its own module read.
 * Builds ONE module centred at the origin. A per-piece `seed` drives in-language
 * variants; higher tiers spin. Imported ONLY by /arcade.
 */
import * as THREE from 'three';
import type { RenderTier } from '../materials';
import { rng } from '../rand';
import { accent, box, cylY, cylZ, metal } from '../models/parts';
import type { ArmorModelSpec } from './parts';

export function buildCore(spec: ArmorModelSpec, rt: RenderTier): THREE.Group {
  const g = new THREE.Group();
  const b = spec.bulk;
  const body = metal(spec.body, rt);
  const dark = metal(0x17191e, rt);
  const glow = accent(spec.accent, rt, 1.4 + spec.emissive);
  const r = rng(spec.seed >>> 0);
  const gl = (m: THREE.Mesh): THREE.Mesh => { m.name = 'glow'; g.add(m); return m; };
  const spin = (m: THREE.Mesh): THREE.Mesh => { m.name = spec.animated ? 'spin' : 'glow'; g.add(m); return m; };

  switch (spec.division) {
    // ── VANGUARD — boxy heavy module ──────────────────────────────────────────
    case 'vanguard': {
      g.add(box(0.18 * b, 0.16 * b, 0.09, dark, 0, 0, 0)); // housing
      gl(box(0.1 * b, 0.1 * b, 0.05, glow, 0, 0, 0.05)); // core face
      for (const s of [-1, 1]) g.add(box(0.03, 0.14 * b, 0.06, dark, s * 0.1 * b, 0, 0.02)); // side rails
      break;
    }
    // ── GHOST — slim tech module + antenna ────────────────────────────────────
    case 'ghost': {
      g.add(box(0.1 * b, 0.16 * b, 0.07, dark, 0, 0, 0)); // slim housing
      gl(box(0.05 * b, 0.11 * b, 0.04, glow, 0, 0, 0.04)); // vertical core strip
      g.add(cylY(0.008, 0.12 * b, dark, 0.05 * b, 0.12 * b, 0)); // antenna
      break;
    }
    // ── WARDEN — reactor housing + vents + spin ring ──────────────────────────
    case 'warden': {
      g.add(box(0.2 * b, 0.2 * b, 0.1, dark, 0, 0, 0)); // big housing
      spin(cylZ(0.07 * b, 0.05, glow, 0, 0, 0.06, 12)); // reactor core
      for (let i = 0; i < 3; i++) g.add(box(0.18 * b, 0.02, 0.04, dark, 0, 0.07 * b - i * 0.07 * b, 0.05)); // vents
      break;
    }
    // ── PHANTOM — precise lens module ─────────────────────────────────────────
    case 'phantom': {
      g.add(box(0.12 * b, 0.12 * b, 0.08, dark, 0, 0, 0)); // compact housing
      gl(cylZ(0.05 * b, 0.05, glow, 0, 0, 0.05, 16)); // lens
      g.add(cylZ(0.06 * b, 0.02, dark, 0, 0, 0.07, 16)); // lens ring
      break;
    }
    // ── LIFELINE — rounded module + cross ─────────────────────────────────────
    case 'lifeline': {
      g.add(box(0.16 * b, 0.16 * b, 0.08, dark, 0, 0, 0)); // housing
      gl(cylZ(0.06 * b, 0.05, glow, 0, 0, 0.05, 16)); // core
      gl(box(0.03 * b, 0.1 * b, 0.02, glow, 0, 0, 0.08)); // cross (vertical)
      gl(box(0.1 * b, 0.03 * b, 0.02, glow, 0, 0, 0.08)); // cross (horizontal)
      break;
    }
    // ── RECRUIT — simple housing + round core (neutral baseline) ──────────────
    case 'recruit':
    default: {
      g.add(box(0.16 * b, 0.16 * b, 0.08, dark, 0, 0, 0)); // housing
      gl(cylZ(0.055 * b, 0.05, glow, 0, 0, 0.05, 14)); // reactor face
      if (r() < 0.5) for (const s of [-1, 1]) g.add(box(0.02, 0.12 * b, 0.05, dark, s * 0.09 * b, 0, 0.02)); // side ribs
      break;
    }
  }
  return g;
}
