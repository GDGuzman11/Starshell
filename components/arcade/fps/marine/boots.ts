/**
 * BOOT GEOMETRY LANGUAGES — the fifth slice of the Armor Overhaul. Boots ground the
 * silhouette (stance + bulk read from the ground up), so each identity gets its own
 * (built from primitives, colour-independent). Builds ONE boot centred at the origin;
 * model.ts clones it onto both legs at the foot anchor:
 *
 *   Recruit  — standard combat boot + sole + toe cap
 *   Vanguard — heavy chunky boot: thick sole + toe plate + ankle guard + cleats
 *   Ghost    — sleek low runner + heel spring blade (fast)
 *   Warden   — massive layered armoured boot (widest stance)
 *   Phantom  — narrow precise boot + heel stabilizer spur
 *   Lifeline — clean rounded boot + status light
 *
 * A per-piece `seed` drives in-language variants. Imported ONLY by the /arcade chunk.
 */
import * as THREE from 'three';
import type { RenderTier } from '../materials';
import { rng } from '../rand';
import { accent, box, metal } from '../models/parts';
import type { ArmorModelSpec } from './parts';

/** Build one boot in the division's language, centred at the origin. */
export function buildBoot(spec: ArmorModelSpec, rt: RenderTier): THREE.Group {
  const g = new THREE.Group();
  const b = spec.bulk;
  const body = metal(spec.body, rt);
  const dark = metal(0x17191e, rt);
  const glow = accent(spec.accent, rt, 1.2 + spec.emissive);
  const r = rng(spec.seed >>> 0);
  const trim = spec.emissive > 0.25;
  const gl = (m: THREE.Mesh): THREE.Mesh => { m.name = 'glow'; g.add(m); return m; };

  switch (spec.division) {
    // ── VANGUARD — heavy chunky boot + cleats ─────────────────────────────────
    case 'vanguard': {
      g.add(box(0.24 * b, 0.18 * b, 0.26 * b, body, 0, 0.02 * b, 0.02)); // chunky boot
      g.add(box(0.26 * b, 0.08, 0.38 * b, dark, 0, -0.08 * b, 0.06)); // thick sole
      g.add(box(0.24 * b, 0.1 * b, 0.08, dark, 0, 0.04 * b, 0.16)); // toe cap plate
      g.add(box(0.24 * b, 0.1 * b, 0.1, body, 0, 0.12 * b, -0.06)); // ankle guard
      for (let k = 0; k < 3; k++) g.add(box(0.03, 0.03, 0.03, dark, -0.08 * b + k * 0.08 * b, -0.11 * b, 0.1)); // cleats
      if (trim) gl(box(0.03, 0.03, 0.1, glow, 0.1 * b, 0.02 * b, 0));
      break;
    }

    // ── GHOST — sleek low runner + heel blade ─────────────────────────────────
    case 'ghost': {
      g.add(box(0.16 * b, 0.12 * b, 0.24 * b, body, 0, 0, 0.02)); // slim boot
      g.add(box(0.17 * b, 0.04, 0.32 * b, dark, 0, -0.05 * b, 0.06)); // low sole
      const blade = box(0.1 * b, 0.1 * b, 0.03, dark, 0, -0.08 * b, -0.1); // heel spring blade
      blade.rotation.x = 0.5;
      g.add(blade);
      if (trim) gl(box(0.02, 0.02, 0.18 * b, glow, 0.08 * b, 0, 0.02)); // side light strip
      break;
    }

    // ── WARDEN — massive layered armoured boot ────────────────────────────────
    case 'warden': {
      g.add(box(0.28 * b, 0.22 * b, 0.3 * b, body, 0, 0.04 * b, 0.02)); // huge boot
      g.add(box(0.3 * b, 0.1, 0.42 * b, dark, 0, -0.1 * b, 0.06)); // massive sole
      g.add(box(0.3 * b, 0.12 * b, 0.1, dark, 0, 0.02 * b, 0.18)); // toe plate
      for (let i = 0; i < 3; i++) g.add(box(0.3 * b, 0.03, 0.28 * b, dark, 0, 0.12 * b - i * 0.08 * b, 0.02)); // layered plates
      if (trim) gl(box(0.2 * b, 0.02, 0.03, glow, 0, -0.02 * b, 0.18));
      break;
    }

    // ── PHANTOM — narrow precise boot + heel spur ─────────────────────────────
    case 'phantom': {
      g.add(box(0.15 * b, 0.14 * b, 0.24 * b, body, 0, 0, 0.02)); // narrow boot
      g.add(box(0.16 * b, 0.04, 0.3 * b, dark, 0, -0.06 * b, 0.06)); // slim sole
      g.add(box(0.04 * b, 0.05 * b, 0.12 * b, dark, 0, -0.04 * b, -0.11)); // heel stabilizer spur
      if (trim) gl(box(0.02, 0.02, 0.14 * b, glow, 0.07 * b, 0, 0.02));
      break;
    }

    // ── LIFELINE — clean rounded boot ─────────────────────────────────────────
    case 'lifeline': {
      g.add(box(0.19 * b, 0.14 * b, 0.24 * b, body, 0, 0, 0.02)); // boot
      g.add(box(0.2 * b, 0.05, 0.32 * b, dark, 0, -0.06 * b, 0.06)); // sole
      g.add(box(0.18 * b, 0.08 * b, 0.06, body, 0, 0.06 * b, 0.14)); // rounded toe
      gl(box(0.03 * b, 0.06 * b, 0.02, glow, 0, 0.05 * b, 0.16)); // status light
      break;
    }

    // ── RECRUIT — standard combat boot (neutral baseline) ─────────────────────
    case 'recruit':
    default: {
      g.add(box(0.2 * b, 0.14 * b, 0.24 * b, body, 0, 0, 0.02)); // boot upper
      g.add(box(0.22 * b, 0.06, 0.34 * b, dark, 0, -0.06 * b, 0.06)); // sole + toe
      g.add(box(0.2 * b, 0.08 * b, 0.06, dark, 0, 0.06 * b, 0.14)); // toe cap
      if (r() < 0.5) g.add(box(0.21 * b, 0.05 * b, 0.06, dark, 0, 0.11 * b, -0.05)); // ankle band
      if (trim) gl(box(0.03, 0.03, 0.1, glow, 0.09 * b, 0, 0));
      break;
    }
  }
  return g;
}
