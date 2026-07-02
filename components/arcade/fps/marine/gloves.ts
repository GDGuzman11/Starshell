/**
 * GLOVE (GAUNTLET) GEOMETRY LANGUAGES — Armor Overhaul slice 7a. The 'glove' family
 * (recruit + Vanguard / Phantom / Lifeline gloves; Ghost/Warden have none) reads by
 * identity. Builds ONE gauntlet centred at the origin; model.ts clones it onto both
 * hands. A per-piece `seed` drives in-language variants. Imported ONLY by /arcade.
 */
import * as THREE from 'three';
import type { RenderTier } from '../materials';
import { rng } from '../rand';
import { accent, box, metal } from '../models/parts';
import type { ArmorModelSpec } from './parts';

export function buildGlove(spec: ArmorModelSpec, rt: RenderTier): THREE.Group {
  const g = new THREE.Group();
  const b = spec.bulk;
  const body = metal(spec.body, rt);
  const dark = metal(0x17191e, rt);
  const glow = accent(spec.accent, rt, 1.2 + spec.emissive);
  const r = rng(spec.seed >>> 0);
  const trim = spec.emissive > 0.25;
  const gl = (m: THREE.Mesh): THREE.Mesh => { m.name = 'glow'; g.add(m); return m; };

  switch (spec.division) {
    // ── VANGUARD — heavy breaching fist ───────────────────────────────────────
    case 'vanguard': {
      g.add(box(0.19 * b, 0.16 * b, 0.2 * b, body, 0, 0, 0.02)); // heavy gauntlet
      g.add(box(0.18 * b, 0.09 * b, 0.09, dark, 0, -0.05 * b, 0.11)); // big knuckle plate
      for (let k = 0; k < 3; k++) g.add(box(0.03, 0.03, 0.03, dark, -0.06 * b + k * 0.06 * b, -0.03 * b, 0.13)); // studs
      if (trim) gl(box(0.03, 0.03, 0.03, glow, 0.08 * b, 0.03 * b, 0.06));
      break;
    }
    // ── PHANTOM — slim precise trigger glove ──────────────────────────────────
    case 'phantom': {
      g.add(box(0.13 * b, 0.12 * b, 0.18 * b, body, 0, 0, 0.02)); // slim glove
      g.add(box(0.04 * b, 0.05 * b, 0.1, dark, 0.05 * b, -0.03 * b, 0.12)); // trigger finger
      if (trim) gl(box(0.02, 0.02, 0.12 * b, glow, 0.07 * b, 0.02 * b, 0.04));
      break;
    }
    // ── LIFELINE — repair glove + wrist injector ──────────────────────────────
    case 'lifeline': {
      g.add(box(0.16 * b, 0.13 * b, 0.18 * b, body, 0, 0, 0.02)); // glove
      g.add(box(0.09 * b, 0.08 * b, 0.09 * b, dark, 0, 0.07 * b, -0.02)); // wrist tool
      gl(box(0.03 * b, 0.03 * b, 0.02, glow, 0, 0.09 * b, 0.04)); // injector light
      break;
    }
    // ── RECRUIT — simple gauntlet (neutral baseline) ──────────────────────────
    case 'recruit':
    default: {
      g.add(box(0.16 * b, 0.14 * b, 0.18 * b, body, 0, 0, 0.02)); // gauntlet
      g.add(box(0.14 * b, 0.06, 0.1, dark, 0, -0.06 * b, 0.1)); // knuckle
      if (r() < 0.5) g.add(box(0.15 * b, 0.05 * b, 0.06, dark, 0, 0.07 * b, -0.02)); // cuff
      if (trim) gl(box(0.03, 0.03, 0.03, glow, 0.06 * b, 0.02, 0.08));
      break;
    }
  }
  return g;
}
