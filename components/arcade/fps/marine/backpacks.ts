/**
 * BACKPACK GEOMETRY LANGUAGES — the fourth slice of the Armor Overhaul. The pack is a
 * big rear-silhouette read, so each identity gets its own (built from primitives,
 * colour-independent). Modelled behind the torso (extends −z); model.ts places it at
 * the back anchor:
 *
 *   Recruit  — simple field pack + flap + straps
 *   Vanguard — bulky ammo pack: boxy body + side ammo drums (industrial, heavy)
 *   Ghost    — compact slim body + tall sensor antenna array + drone housing
 *   Warden   — HUGE reactor pack: glowing core + twin exhaust stacks + heat vents
 *   Phantom  — minimal slim pack + tall rangefinder mast (precision)
 *   Lifeline — rounded nano canisters + drone bay + medical cross (support)
 *
 * A per-piece `seed` drives in-language variants. Imported ONLY by the /arcade chunk.
 */
import * as THREE from 'three';
import type { RenderTier } from '../materials';
import { rng } from '../rand';
import { accent, box, cylY, cylZ, metal } from '../models/parts';
import type { ArmorModelSpec } from './parts';

/** Build a backpack in the division's language. Centred at the origin (extends −z). */
export function buildBackpack(spec: ArmorModelSpec, rt: RenderTier): THREE.Group {
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
    // ── VANGUARD — bulky ammo / breaching pack ────────────────────────────────
    case 'vanguard': {
      g.add(box(0.34 * b, 0.4 * b, 0.2 * b, body, 0, 0, -0.03)); // heavy body
      g.add(box(0.3 * b, 0.08 * b, 0.18 * b, dark, 0, 0.16 * b, -0.03)); // top lid
      for (const s of [-1, 1]) g.add(cylY(0.07 * b, 0.36 * b, dark, s * 0.2 * b, 0, 0)); // ammo drums
      for (let k = 0; k < 3; k++) g.add(box(0.03, 0.03, 0.03, dark, -0.08 * b + k * 0.08 * b, 0.14 * b, 0.08)); // studs
      if (spec.spikes > 1) g.add(box(0.1 * b, 0.14 * b, 0.1 * b, dark, 0, -0.16 * b, -0.15)); // breaching charge
      if (trim) gl(box(0.24 * b, 0.03, 0.03, glow, 0, 0.09 * b, 0.06));
      break;
    }

    // ── GHOST — compact body + tall sensor antennas + drone bay ────────────────
    case 'ghost': {
      g.add(box(0.22 * b, 0.3 * b, 0.12 * b, body, 0, 0, -0.02)); // compact slim body
      for (let i = 0; i < 3; i++) g.add(cylY(0.012, (0.24 + i * 0.06) * b, dark, -0.06 * b + i * 0.06 * b, 0.24 * b, -0.04)); // antenna array
      gl(box(0.03, 0.03, 0.03, glow, 0.06 * b, 0.4 * b, -0.04)); // antenna tip light
      g.add(box(0.1 * b, 0.08 * b, 0.1 * b, dark, 0, -0.1 * b, -0.08)); // drone housing
      if (chance(0.6)) gl(box(0.02, 0.16 * b, 0.02, glow, 0.1 * b, 0, 0.02)); // data strip
      break;
    }

    // ── WARDEN — huge reactor pack: core + exhaust stacks + vents ──────────────
    case 'warden': {
      g.add(box(0.4 * b, 0.44 * b, 0.26 * b, body, 0, 0, -0.05)); // massive body
      g.add(box(0.2 * b, 0.2 * b, 0.06, dark, 0, 0.02 * b, -0.19)); // reactor housing
      const core = gl(cylZ(0.1 * b, 0.06, glow, 0, 0.02 * b, -0.2, 12)); // reactor core
      core.name = spec.animated ? 'spin' : 'glow';
      for (const s of [-1, 1]) { g.add(cylY(0.05 * b, 0.5 * b, dark, s * 0.16 * b, 0.1 * b, -0.06)); gl(cylY(0.03 * b, 0.06, glow, s * 0.16 * b, 0.36 * b, -0.06)); } // exhaust stacks
      for (let i = 0; i < 4; i++) g.add(box(0.3 * b, 0.02, 0.03, dark, 0, 0.14 * b - i * 0.08 * b, 0.09)); // heat vents
      break;
    }

    // ── PHANTOM — minimal slim pack + rangefinder mast ────────────────────────
    case 'phantom': {
      g.add(box(0.18 * b, 0.34 * b, 0.1 * b, body, 0, 0, -0.02)); // slim minimal body
      g.add(cylY(0.015, 0.4 * b, dark, 0.08 * b, 0.24 * b, -0.04)); // rangefinder mast
      gl(box(0.05 * b, 0.05 * b, 0.05 * b, glow, 0.08 * b, 0.44 * b, -0.04)); // rangefinder optic
      if (trim) gl(box(0.02, 0.24 * b, 0.02, glow, -0.06 * b, 0, 0.04)); // data strip
      break;
    }

    // ── LIFELINE — rounded nano canisters + drone bay + cross ──────────────────
    case 'lifeline': {
      g.add(box(0.3 * b, 0.34 * b, 0.16 * b, body, 0, 0, -0.02)); // body
      for (const s of [-1, 1]) g.add(cylY(0.07 * b, 0.3 * b, dark, s * 0.14 * b, 0, -0.02)); // nano canisters
      g.add(box(0.14 * b, 0.1 * b, 0.1 * b, dark, 0, 0.1 * b, -0.1)); // drone bay
      gl(box(0.04 * b, 0.12 * b, 0.02, glow, 0, -0.06 * b, 0.06)); // cross (vertical)
      gl(box(0.12 * b, 0.04 * b, 0.02, glow, 0, -0.06 * b, 0.06)); // cross (horizontal)
      break;
    }

    // ── RECRUIT — simple field pack (neutral baseline) ────────────────────────
    case 'recruit':
    default: {
      g.add(box(0.3 * b, 0.38 * b, 0.16 * b, body, 0, 0, -0.02)); // pack body
      g.add(box(0.32 * b, 0.1 * b, 0.17 * b, dark, 0, 0.12 * b, -0.02)); // top flap
      for (const s of [-1, 1]) g.add(box(0.04, 0.36 * b, 0.03, dark, s * 0.13 * b, 0, 0.08)); // straps
      if (chance(0.5)) g.add(box(0.14 * b, 0.1 * b, 0.1 * b, dark, 0, -0.14 * b, -0.1)); // bedroll/pouch
      if (trim) gl(box(0.03, 0.03, 0.03, glow, 0.1 * b, 0.1 * b, 0.06)); // status light
      break;
    }
  }
  return g;
}
