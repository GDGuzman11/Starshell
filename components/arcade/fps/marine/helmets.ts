/**
 * HELMET GEOMETRY — one CONSISTENT head shape for every division; the division shows
 * in the LOOK, not the skull. The visor is INTEGRATED into the helmet (there is no
 * separate visor slot), so a head is a single component. A shared skull (proportioned
 * to the recruit head so fit-to-slot never distorts it) is restyled per division with
 * trim, an integrated visor variant, small sensors/emblems and colour — so a Warden
 * and a Ghost are unmistakably different at a glance while both still read as a head.
 * A per-piece `seed` varies the discrete accents so the 20 variants stay distinct.
 *
 * Imported ONLY by the /arcade chunk.
 */
import * as THREE from 'three';
import type { RenderTier } from '../materials';
import { rng } from '../rand';
import { accent, box, cylY, cylZ, metal } from '../models/parts';
import type { ArmorModelSpec } from './parts';

/** Build a helmet: shared head shape + division-specific styling + integrated visor.
 *  Centred at the origin; model.ts fits it onto the head's armor:helmet shell. */
export function buildHelmet(spec: ArmorModelSpec, rt: RenderTier): THREE.Group {
  const g = new THREE.Group();
  const b = spec.bulk;
  const body = metal(spec.body, rt);
  const dark = metal(0x15171b, rt);
  const glow = accent(spec.accent, rt, 1.25 + spec.emissive);
  const r = rng(spec.seed >>> 0);
  const pick = <T,>(arr: T[]): T => arr[(r() * arr.length) | 0];
  const chance = (p: number) => r() < p;
  const gl = (m: THREE.Mesh): THREE.Mesh => { m.name = 'glow'; g.add(m); return m; };

  // ── SHARED HEAD SHAPE (identical across every division — only the LOOK changes) ──
  const skull = box(0.24 * b, 0.22 * b, 0.26 * b, body, 0, 0.01, 0); // main skull
  skull.name = 'fitcore'; // fit sizes the head by THIS, so antennas/crowns never squash it
  g.add(skull);
  g.add(box(0.2 * b, 0.05 * b, 0.24 * b, dark, 0, 0.12 * b, 0)); // top dome cap
  g.add(box(0.26 * b, 0.05, 0.06, dark, 0, 0.05 * b, 0.12 * b)); // brow ridge
  g.add(box(0.14 * b, 0.07 * b, 0.08, dark, 0, -0.11 * b, 0.09 * b)); // chin/jaw guard

  // Integrated VISOR — the style varies per division, the head form does not.
  const visor = {
    slit: () => gl(box(0.2 * b, 0.045 * b, 0.03, glow, 0, 0, 0.13 * b)),
    wide: () => gl(box(0.24 * b, 0.06 * b, 0.03, glow, 0, 0, 0.13 * b)),
    split: () => { for (const s of [-1, 1]) { const v = gl(box(0.09 * b, 0.05 * b, 0.03, glow, s * 0.06 * b, 0, 0.13 * b)); v.rotation.z = s * 0.25; } },
    tri: () => { for (let i = 0; i < 3; i++) gl(cylZ(0.03 * b, 0.04, glow, (i - 1) * 0.07 * b, 0, 0.13 * b, 12)); },
    single: () => gl(cylZ(0.07 * b, 0.04, glow, 0, 0, 0.13 * b, 16)),
    long: () => gl(box(0.18 * b, 0.05 * b, 0.12 * b, glow, 0, 0.02, 0.1 * b)),
  };

  switch (spec.division) {
    // ── VANGUARD — Shock Trooper: heavy brow + cheek armour + split visor ──────────
    case 'vanguard': {
      g.add(box(0.28 * b, 0.06, 0.09, dark, 0, 0.06 * b, 0.12 * b)); // heavy brow slab
      for (let i = 0; i < 1 + ((r() * 3) | 0); i++) g.add(box(0.03, 0.08 * b, 0.06, dark, -0.08 * b + i * 0.08 * b, 0.12 * b, 0.11 * b)); // forehead ridges
      for (const s of [-1, 1]) g.add(box(0.045, 0.15 * b, 0.18 * b, body, s * 0.135 * b, -0.02, 0.01)); // wide cheek armour
      (chance(0.6) ? visor.split : visor.wide)();
      if (spec.emissive > 0.3) gl(cylZ(0.02 * b, 0.06, glow, 0.12 * b, 0.06 * b, 0.12 * b, 8)); // breaching light
      break;
    }

    // ── GHOST — Recon: sleek + antennas + optic visor + sensor fins ────────────────
    case 'ghost': {
      (pick([visor.single, visor.tri, visor.wide]))();
      for (let i = 0; i < 1 + ((r() * 3) | 0); i++) g.add(cylY(0.01, 0.13 * b + i * 0.03, dark, -0.05 * b + i * 0.05 * b, 0.2 * b, -0.06)); // antenna cluster
      if (chance(0.6)) for (const s of [-1, 1]) { const f = box(0.02, 0.14 * b, 0.09, dark, s * 0.13 * b, 0.06 * b, -0.02); f.rotation.z = s * 0.2; g.add(f); } // sensor fins
      break;
    }

    // ── WARDEN — Walking Fortress: blast-shield slit + vent crown + neck ring ───────
    case 'warden': {
      g.add(box(0.26 * b, 0.09 * b, 0.05, dark, 0, -0.02, 0.13 * b)); // thick blast-shield band
      gl(box(0.2 * b, 0.02, 0.02, glow, 0, -0.02, 0.15 * b)); // shield slit
      const crown = pick(['vents', 'emitters']);
      const n = 3 + ((r() * 3) | 0);
      if (crown === 'vents') for (let i = 0; i < n; i++) g.add(box(0.025, 0.07 * b, 0.16 * b, dark, (i - (n - 1) / 2) * 0.06 * b, 0.17 * b, 0));
      else for (let i = 0; i < n; i++) gl(cylY(0.018 * b, 0.08 * b, glow, (i - (n - 1) / 2) * 0.07 * b, 0.17 * b, 0));
      for (const s of [-1, 1]) gl(box(0.04, 0.09 * b, 0.09 * b, glow, s * 0.14 * b, 0.02, -0.02)); // twin reactor vents
      g.add(cylY(0.16 * b, 0.05, dark, 0, -0.14 * b, 0)); // thick neck ring
      break;
    }

    // ── PHANTOM — Precision Hunter: long visor + rangefinder + rear counterweight ───
    case 'phantom': {
      visor.long();
      const s = chance(0.5) ? 1 : -1;
      g.add(box(0.045 * b, 0.045 * b, 0.13 * b, dark, s * 0.12 * b, 0.06 * b, 0.07 * b)); // rangefinder arm
      gl(cylZ(0.02 * b, 0.04, glow, s * 0.12 * b, 0.06 * b, 0.15 * b, 10)); // rangefinder lens
      if (chance(0.6)) g.add(cylZ(0.014, 0.14 * b, dark, 0, 0.1 * b, 0.14 * b, 8)); // forehead sensor stalk
      g.add(box(0.1 * b, 0.1 * b, 0.08 * b, dark, 0, 0, -0.15 * b)); // rear counterweight
      break;
    }

    // ── LIFELINE — Combat Support: soft visor + beacon + ear pods + cross ──────────
    case 'lifeline': {
      visor.wide();
      gl(cylY(0.035 * b, 0.05 * b, glow, 0, 0.16 * b, 0)); // rescue beacon
      g.add(box(0.06 * b, 0.05 * b, 0.06 * b, dark, 0, 0.21 * b, 0)); // beacon cap
      for (const s of [-1, 1]) g.add(box(0.05, 0.09 * b, 0.1 * b, dark, s * 0.14 * b, -0.01, 0.01)); // medical ear pods
      gl(box(0.03, 0.08 * b, 0.02, glow, 0, 0.06 * b, 0.13 * b)); // cross (vertical)
      gl(box(0.08 * b, 0.03, 0.02, glow, 0, 0.06 * b, 0.13 * b)); // cross (horizontal)
      break;
    }

    // ── RECRUIT / OUTRIDER — Standard Issue: the neutral baseline ───────────────────
    case 'recruit':
    default: {
      visor.slit();
      if (chance(0.5)) for (const s of [-1, 1]) g.add(box(0.04, 0.09 * b, 0.13 * b, body, s * 0.13 * b, -0.02, 0.01)); // cheek guards
      if (chance(0.4)) g.add(cylY(0.01, 0.12 * b, dark, 0.08 * b, 0.15 * b, -0.05)); // antenna
      break;
    }
  }
  return g;
}
