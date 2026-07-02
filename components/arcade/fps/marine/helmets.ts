/**
 * HELMET GEOMETRY LANGUAGES — the first slice of the Armor Overhaul. Each Combat
 * Division (plus the Recruit baseline) gets a COMPLETELY DIFFERENT helmet silhouette,
 * built from primitives, so the division is identifiable from shape alone with all
 * colour removed (the spec's quality test). Within a language, a per-piece `seed`
 * drives discrete feature choices so the 20 variants read distinct yet stay unmistakably
 * that division — an art-directed geometry language, not a generic parametric box.
 *
 *   Recruit  — compact rounded standard-issue dome
 *   Vanguard — wide, heavy, forward-jutting bulldog jaw + split visor
 *   Ghost    — tall, narrow, single big optic + antenna/sensor fins
 *   Warden   — massive cube + vent/emitter crown + thick neck ring (tank turret)
 *   Phantom  — elongated sleek head + long visor + asymmetric rangefinder
 *   Lifeline — rounded soft dome + top rescue beacon + medical side pods
 *
 * Imported ONLY by the /arcade chunk.
 */
import * as THREE from 'three';
import type { RenderTier } from '../materials';
import { rng } from '../rand';
import { accent, box, capsuleY, coneZ, cylX, cylY, cylZ, metal } from '../models/parts';
import type { ArmorModelSpec } from './parts';

/** Build a helmet in its division's geometry language. Centred at the origin; model.ts
 *  places it on the head group at the helmet anchor. */
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

  switch (spec.division) {
    // ── VANGUARD — Shock Trooper: wide, heavy, forward jaw ─────────────────────
    case 'vanguard': {
      g.add(box(0.31 * b, 0.24 * b, 0.3 * b, body, 0, 0.02, 0)); // heavy skull
      // signature: an armoured jaw jutting forward + down
      const jaw = 0.9 + r() * 0.4;
      g.add(box(0.26 * b * jaw, 0.12 * b, 0.17 * b, body, 0, -0.12 * b, 0.15 * b));
      g.add(box(0.28 * b, 0.06, 0.09, dark, 0, 0.08 * b, 0.13 * b)); // brow ridge
      for (let i = 0; i < 1 + ((r() * 3) | 0); i++) g.add(box(0.03, 0.09 * b, 0.06, dark, -0.08 * b + i * 0.08 * b, 0.13 * b, 0.11 * b)); // forehead ridges
      // split vs single visor
      if (chance(0.6)) {
        for (const s of [-1, 1]) { const v = gl(box(0.09 * b, 0.06 * b, 0.03, glow, s * 0.07 * b, 0, 0.16 * b)); v.rotation.z = s * 0.2; }
      } else {
        gl(box(0.22 * b, 0.05 * b, 0.03, glow, 0, 0, 0.16 * b));
      }
      for (const s of [-1, 1]) g.add(box(0.05, 0.16 * b, 0.19 * b, body, s * 0.16 * b, -0.03, 0.02)); // wide cheek armour
      if (spec.emissive > 0.3) gl(cylZ(0.02 * b, 0.06, glow, 0.13 * b, 0.06 * b, 0.12 * b, 8)); // breaching light
      break;
    }

    // ── GHOST — Recon: tall, narrow, single optic + antennas ───────────────────
    case 'ghost': {
      g.add(box(0.19 * b, 0.29 * b, 0.24 * b, body, 0, 0.03, 0)); // narrow tall head
      const hood = coneZ(0.001, 0.14 * b, 0.2 * b, dark, 0, 0.12 * b, -0.04); hood.rotation.x = 0.5; g.add(hood); // swept hood
      // optic: single big / tri-lens / wraparound
      const optic = pick(['single', 'tri', 'wrap']);
      if (optic === 'single') gl(cylZ(0.09 * b, 0.05, glow, 0, 0, 0.13 * b, 16));
      else if (optic === 'tri') for (let i = 0; i < 3; i++) gl(cylZ(0.035 * b, 0.05, glow, (i - 1) * 0.07 * b, 0, 0.13 * b, 12));
      else gl(box(0.2 * b, 0.05 * b, 0.03, glow, 0, 0.01, 0.12 * b));
      for (let i = 0; i < 1 + ((r() * 3) | 0); i++) g.add(cylY(0.01, 0.14 * b + i * 0.03, dark, -0.05 * b + i * 0.05 * b, 0.2 * b, -0.06)); // antenna cluster
      if (chance(0.6)) for (const s of [-1, 1]) { const f = box(0.02, 0.16 * b, 0.1, dark, s * 0.09 * b, 0.08 * b, -0.02); f.rotation.z = s * 0.2; g.add(f); } // sensor fins
      break;
    }

    // ── WARDEN — Walking Fortress: massive cube + crown + neck ring ────────────
    case 'warden': {
      g.add(box(0.35 * b, 0.3 * b, 0.34 * b, body, 0, 0.03, 0)); // huge cube skull
      g.add(box(0.35 * b, 0.1 * b, 0.05, dark, 0, -0.02, 0.16 * b)); // thick blast-shield visor
      gl(box(0.24 * b, 0.02, 0.02, glow, 0, -0.01, 0.185 * b)); // shield slit
      // crown: vent fins / emitter posts / reactor housing
      const crown = pick(['vents', 'emitters', 'reactor']);
      const n = 3 + ((r() * 3) | 0);
      if (crown === 'vents') for (let i = 0; i < n; i++) g.add(box(0.03, 0.11 * b, 0.18 * b, dark, (i - (n - 1) / 2) * 0.07 * b, 0.18 * b, 0));
      else if (crown === 'emitters') for (let i = 0; i < n; i++) gl(cylY(0.02 * b, 0.12 * b, glow, (i - (n - 1) / 2) * 0.08 * b, 0.19 * b, 0));
      else { g.add(box(0.2 * b, 0.1 * b, 0.2 * b, dark, 0, 0.19 * b, 0)); gl(cylY(0.05 * b, 0.06, glow, 0, 0.26 * b, 0)); }
      for (const s of [-1, 1]) gl(box(0.05, 0.11 * b, 0.11 * b, glow, s * 0.19 * b, 0.04, -0.02)); // twin reactor vents
      g.add(cylY(0.21 * b, 0.06, dark, 0, -0.16 * b, 0)); // thick neck ring
      break;
    }

    // ── PHANTOM — Precision Hunter: elongated + long visor + rangefinder ───────
    case 'phantom': {
      g.add(box(0.2 * b, 0.2 * b, 0.35 * b, body, 0, 0.02, 0.02)); // elongated sleek head
      const nose = coneZ(0.06 * b, 0.1 * b, 0.12 * b, body, 0, -0.01, 0.2 * b); g.add(nose); // tapered front
      gl(box(0.17 * b, 0.04 * b, 0.22 * b, glow, 0, 0.03, 0.08 * b)); // long precision visor
      // signature: asymmetric rangefinder cantilevered off one side
      const s = chance(0.5) ? 1 : -1;
      g.add(box(0.05 * b, 0.05 * b, 0.14 * b, dark, s * 0.12 * b, 0.07 * b, 0.08 * b));
      gl(cylZ(0.02 * b, 0.04, glow, s * 0.12 * b, 0.07 * b, 0.17 * b, 10));
      if (chance(0.6)) g.add(cylZ(0.014, 0.16 * b, dark, 0, 0.1 * b, 0.16 * b, 8)); // forehead sensor stalk
      g.add(box(0.11 * b, 0.11 * b, 0.1 * b, dark, 0, 0, -0.17 * b)); // long rear counterweight
      break;
    }

    // ── LIFELINE — Combat Support: rounded + beacon + medical pods ─────────────
    case 'lifeline': {
      g.add(capsuleY(0.15 * b, 0.1 * b, body, 0, 0.0, 0)); // rounded soft dome
      gl(box(0.22 * b, 0.07 * b, 0.03, glow, 0, 0.0, 0.13 * b)); // broad soft visor
      const beacon = gl(cylY(0.035 * b, 0.06 * b, glow, 0, 0.17 * b, 0)); beacon.name = spec.animated ? 'spin' : 'glow'; // rescue beacon
      g.add(capsuleY(0.04 * b, 0.05 * b, dark, 0, 0.22 * b, 0)); // beacon cap
      for (const s of [-1, 1]) g.add(cylX(0.06 * b, 0.06 * b, dark, s * 0.15 * b, 0.0, 0.02)); // rounded medical ear pods
      // medical cross emblem on the brow
      gl(box(0.03, 0.08 * b, 0.02, glow, 0, 0.08 * b, 0.13 * b));
      gl(box(0.08 * b, 0.03, 0.02, glow, 0, 0.08 * b, 0.13 * b));
      break;
    }

    // ── RECRUIT — Standard Issue: compact rounded dome (the neutral baseline) ───
    case 'recruit':
    default: {
      g.add(box(0.27 * b, 0.22 * b, 0.29 * b, body, 0, 0.01, 0)); // rounded skull
      g.add(box(0.23 * b, 0.05 * b, 0.06 * b, dark, 0, 0.12 * b, 0)); // dome cap
      g.add(box(0.29 * b, 0.05, 0.06, dark, 0, 0.06 * b, 0.13 * b)); // brow
      gl(box(0.23 * b, 0.05 * b, 0.03, glow, 0, 0, 0.15 * b)); // visor slit
      g.add(box(0.15 * b, 0.06 * b, 0.09, dark, 0, -0.11 * b, 0.1 * b)); // chin guard
      if (chance(0.5)) for (const s of [-1, 1]) g.add(box(0.04, 0.1 * b, 0.14 * b, body, s * 0.14 * b, -0.03, 0.02)); // cheek guards
      if (chance(0.4)) g.add(cylY(0.01, 0.13 * b, dark, 0.08 * b, 0.16 * b, -0.05)); // antenna
      break;
    }
  }
  return g;
}
