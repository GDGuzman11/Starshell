/**
 * VISOR GEOMETRY LANGUAGES — Armor Overhaul slice 7c. The 'visor' family (recruit +
 * Ghost Tactical Visor + Phantom Long-Range Visor; the other divisions build their
 * visor into the helmet). Overlays the face at the head anchor. A per-piece `seed`
 * drives in-language variants. Imported ONLY by /arcade.
 */
import * as THREE from 'three';
import type { RenderTier } from '../materials';
import { rng } from '../rand';
import { accent, box, cylZ, metal } from '../models/parts';
import type { ArmorModelSpec } from './parts';

export function buildVisor(spec: ArmorModelSpec, rt: RenderTier): THREE.Group {
  const g = new THREE.Group();
  const b = spec.bulk;
  const dark = metal(0x17191e, rt);
  const glow = accent(spec.accent, rt, 1.3 + spec.emissive);
  const r = rng(spec.seed >>> 0);
  const gl = (m: THREE.Mesh): THREE.Mesh => { m.name = 'glow'; g.add(m); return m; };

  switch (spec.division) {
    // ── GHOST — wide wraparound / tri-lens tactical visor + side sensors ──────
    case 'ghost': {
      gl(box(0.26 * b, 0.07 * b, 0.02, glow, 0, 0, 0.02)); // wide band
      g.add(box(0.28 * b, 0.02, 0.03, dark, 0, 0.05 * b, 0.02)); // upper frame
      for (const s of [-1, 1]) g.add(box(0.03 * b, 0.05 * b, 0.04, dark, s * 0.14 * b, 0, 0.01)); // side sensors
      break;
    }
    // ── PHANTOM — long narrow precision visor + offset rangefinder lens ───────
    case 'phantom': {
      gl(box(0.24 * b, 0.04 * b, 0.02, glow, 0, 0, 0.02)); // narrow long slit
      g.add(box(0.26 * b, 0.02, 0.03, dark, 0, 0.04 * b, 0.02)); // frame
      const s = r() < 0.5 ? 1 : -1;
      g.add(box(0.05 * b, 0.05 * b, 0.06, dark, s * 0.1 * b, 0, 0.03)); // rangefinder housing
      gl(cylZ(0.02 * b, 0.03, glow, s * 0.1 * b, 0, 0.06, 12)); // rangefinder lens
      break;
    }
    // ── RECRUIT — simple glowing band (neutral baseline) ──────────────────────
    case 'recruit':
    default: {
      gl(box(0.24 * b, 0.06 * b, 0.02, glow, 0, 0, 0.02)); // band
      g.add(box(0.26 * b, 0.02, 0.03, dark, 0, 0.05 * b, 0.02)); // upper frame
      break;
    }
  }
  return g;
}
