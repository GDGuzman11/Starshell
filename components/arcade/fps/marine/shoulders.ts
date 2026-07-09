/**
 * SHOULDER (PAULDRON) GEOMETRY LANGUAGES — the third slice of the Armor Overhaul.
 * Shoulders define how BROAD a Marine reads from across the battlefield, so each
 * identity gets its own silhouette (built from primitives, colour-independent). Only
 * the divisions that ENGINEER shoulders per the spec get a language; Ghost/Lifeline
 * keep the base-body shoulders (they have no pauldron category), so those fall through
 * to the recruit builder if ever equipped:
 *
 *   Recruit  — simple rounded shoulder caps
 *   Vanguard — broad, layered, forward-angled plates + studs (wide, aggressive)
 *   Warden   — MASSIVE stacked blocky slabs + shield-emitter nub + vents (widest)
 *   Phantom  — small, slim, sharp swept-back caps (minimal)
 *
 * The piece builds BOTH sides. A per-piece `seed` drives in-language variants.
 * Imported ONLY by the /arcade chunk.
 */
import * as THREE from 'three';
import type { RenderTier } from '../materials';
import { rng } from '../rand';
import { accent, box, coneZ, cylY, metal } from '../models/parts';
import type { ArmorModelSpec } from './parts';

/** Build a pair of pauldrons in the division's language. Centred at the origin;
 *  model.ts places it on the torso shoulder line. */
export function buildShoulders(spec: ArmorModelSpec, rt: RenderTier): THREE.Group {
  const g = new THREE.Group();
  const b = spec.bulk;
  const body = metal(spec.body, rt);
  const dark = metal(0x17191e, rt);
  const glow = accent(spec.accent, rt, 1.2 + spec.emissive);
  const r = rng(spec.seed >>> 0);
  const chance = (p: number) => r() < p;
  const trim = spec.emissive > 0.25;
  const gl = (m: THREE.Mesh): THREE.Mesh => { m.name = 'glow'; g.add(m); return m; };

  switch (spec.division) {
    // ── VANGUARD — broad, layered, forward-angled, studded ────────────────────
    case 'vanguard': {
      for (const s of [-1, 1]) {
        const x = s * 0.33;
        const plates = 2 + ((r() * 2) | 0);
        for (let i = 0; i < plates; i++) {
          const p = box((0.3 - i * 0.04) * b, 0.12 * b, (0.36 - i * 0.03) * b, i % 2 ? dark : body, x + s * i * 0.05 * b, 0.06 * b - i * 0.09 * b, 0);
          p.rotation.z = -s * 0.15; // fan outward
          g.add(p);
        }
        for (let k = 0; k < 3; k++) g.add(box(0.03, 0.03, 0.03, dark, x - 0.08 * b + k * 0.08 * b, 0.12 * b, 0.1 * b)); // studs
        if (spec.spikes > 1) { const sp = coneZ(0.001, 0.05 * b, 0.14 * b, dark, x, 0.1 * b, 0); sp.rotation.x = -0.5; g.add(sp); }
        if (trim) gl(box(0.03, 0.03, 0.24 * b, glow, x + s * 0.14 * b, 0, 0));
      }
      break;
    }

    // ── WARDEN — massive stacked slabs + shield-emitter nub ────────────────────
    case 'warden': {
      for (const s of [-1, 1]) {
        const x = s * 0.36;
        g.add(box(0.34 * b, 0.14 * b, 0.4 * b, body, x, 0.04 * b, 0)); // main slab
        g.add(box(0.3 * b, 0.1 * b, 0.36 * b, dark, x, -0.08 * b, 0)); // lower slab
        g.add(box(0.36 * b, 0.05, 0.42 * b, dark, x, 0.13 * b, 0)); // top cap band
        gl(cylY(0.04 * b, 0.1 * b, glow, x, 0.2 * b, 0)); // shield emitter (pulses, never spins)
        for (let k = 0; k < 3; k++) g.add(box(0.02, 0.08 * b, 0.34 * b, dark, x - 0.1 * b + k * 0.1 * b, 0.04 * b, 0.02)); // vents
        if (trim) gl(box(0.28 * b, 0.02, 0.03, glow, x, -0.02 * b, 0.2 * b));
      }
      break;
    }

    // ── PHANTOM — small, slim, sharp swept-back caps ───────────────────────────
    case 'phantom': {
      for (const s of [-1, 1]) {
        const x = s * 0.26;
        const cap = box(0.13 * b, 0.1 * b, 0.24 * b, body, x, 0, 0);
        cap.rotation.z = s * 0.25; // swept up/out
        g.add(cap);
        const fin = coneZ(0.001, 0.03 * b, 0.18 * b, body, x, 0.04 * b, -0.06 * b);
        fin.rotation.x = 0.6; // sharp swept-back fin
        g.add(fin);
        if (trim) gl(box(0.02, 0.02, 0.16 * b, glow, x, 0.03 * b, 0));
      }
      break;
    }

    // ── RECRUIT — simple rounded shoulder caps (neutral baseline) ──────────────
    case 'recruit':
    default: {
      for (const s of [-1, 1]) {
        const x = s * 0.3;
        g.add(box(0.2 * b, 0.16 * b, 0.28 * b, body, x, 0, 0)); // cap
        g.add(box(0.22 * b, 0.05, 0.26 * b, dark, x, 0.09 * b, 0)); // ridge
        if (chance(0.5)) g.add(box(0.18 * b, 0.06 * b, 0.24 * b, dark, x, -0.09 * b, 0)); // lower lip
        if (trim) gl(box(0.03, 0.03, 0.2 * b, glow, x + s * 0.1 * b, 0, 0));
      }
      break;
    }
  }
  return g;
}
