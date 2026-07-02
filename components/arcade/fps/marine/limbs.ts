/**
 * LIMB GEOMETRY LANGUAGES — the sixth slice of the Armor Overhaul. The 'limb' family
 * plates the upper arms, forearms, thighs and shins (recruit) plus Warden's Armor
 * Braces — a curved segment shell that fits any limb. Each identity gets its own read
 * (built from primitives, colour-independent). Builds ONE segment centred at the
 * origin; model.ts clones it onto both sides at the limb anchor:
 *
 *   Recruit  — simple shell + trim bands
 *   Vanguard — heavier shell + forward plate + studs
 *   Ghost    — slim shell + tech stripe
 *   Warden   — thick braced shell + reinforcement braces + side rails
 *   Phantom  — thin sleek shell + sharp ridge
 *   Lifeline — rounded shell + status light
 *
 * A per-piece `seed` drives in-language variants. Imported ONLY by the /arcade chunk.
 */
import * as THREE from 'three';
import type { RenderTier } from '../materials';
import { rng } from '../rand';
import { accent, box, metal } from '../models/parts';
import type { ArmorModelSpec } from './parts';

/** Build one limb segment shell in the division's language, centred at the origin. */
export function buildLimb(spec: ArmorModelSpec, rt: RenderTier): THREE.Group {
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
    // ── VANGUARD — heavier shell + forward plate + studs ──────────────────────
    case 'vanguard': {
      g.add(box(0.24 * b, 0.24 * b, 0.24 * b, body, 0, 0, 0)); // heavy shell
      g.add(box(0.14 * b, 0.2 * b, 0.06, dark, 0, 0, 0.13 * b)); // forward plate
      for (let k = 0; k < 2; k++) g.add(box(0.03, 0.03, 0.03, dark, -0.05 * b + k * 0.1 * b, 0.08 * b, 0.12 * b)); // studs
      if (trim) gl(box(0.02, 0.16 * b, 0.02, glow, 0.12 * b, 0, 0.02));
      break;
    }

    // ── GHOST — slim shell + tech stripe ──────────────────────────────────────
    case 'ghost': {
      g.add(box(0.16 * b, 0.24 * b, 0.16 * b, body, 0, 0, 0)); // slim shell
      gl(box(0.015, 0.2 * b, 0.015, glow, 0.08 * b, 0, 0.05 * b)); // tech stripe
      if (chance(0.5)) g.add(box(0.05 * b, 0.04 * b, 0.05 * b, dark, -0.07 * b, 0.06 * b, 0.06)); // sensor node
      break;
    }

    // ── WARDEN — thick braced shell + braces + side rails ─────────────────────
    case 'warden': {
      g.add(box(0.24 * b, 0.24 * b, 0.24 * b, body, 0, 0, 0)); // thick shell
      for (let i = 0; i < 3; i++) g.add(box(0.26 * b, 0.04, 0.26 * b, dark, 0, 0.09 * b - i * 0.09 * b, 0)); // reinforcement braces
      for (const s of [-1, 1]) g.add(box(0.03, 0.14 * b, 0.03, dark, s * 0.11 * b, 0, 0.1 * b)); // side rails
      if (trim) gl(box(0.16 * b, 0.02, 0.03, glow, 0, 0, 0.13 * b));
      break;
    }

    // ── PHANTOM — thin sleek shell + sharp ridge ──────────────────────────────
    case 'phantom': {
      g.add(box(0.15 * b, 0.24 * b, 0.15 * b, body, 0, 0, 0)); // thin shell
      g.add(box(0.03, 0.22 * b, 0.06, dark, 0, 0, 0.09 * b)); // sharp ridge
      if (trim) gl(box(0.015, 0.16 * b, 0.015, glow, 0.08 * b, 0, 0.02));
      break;
    }

    // ── LIFELINE — rounded shell + status light ───────────────────────────────
    case 'lifeline': {
      g.add(box(0.19 * b, 0.24 * b, 0.19 * b, body, 0, 0, 0)); // shell
      g.add(box(0.2 * b, 0.05 * b, 0.2 * b, dark, 0, 0, 0)); // centre band
      gl(box(0.03 * b, 0.03 * b, 0.02, glow, 0, 0.05 * b, 0.11 * b)); // status light
      break;
    }

    // ── RECRUIT — simple shell + trim bands (neutral baseline) ────────────────
    case 'recruit':
    default: {
      g.add(box(0.2 * b, 0.24 * b, 0.2 * b, body, 0, 0, 0)); // shell
      g.add(box(0.22 * b, 0.03, 0.22 * b, dark, 0, 0.07 * b, 0)); // upper band
      if (chance(0.5)) g.add(box(0.22 * b, 0.03, 0.22 * b, dark, 0, -0.07 * b, 0)); // lower band
      if (trim) gl(box(0.02, 0.16 * b, 0.02, glow, 0.11 * b, 0, 0.02));
      break;
    }
  }
  return g;
}
