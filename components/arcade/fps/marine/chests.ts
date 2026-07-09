/**
 * CHEST GEOMETRY LANGUAGES — the second slice of the Armor Overhaul (after helmets).
 * The chest plate is the biggest identity read after overall body shape, so each
 * Combat Division (plus the Recruit baseline) gets a COMPLETELY DIFFERENT chest
 * silhouette, built from primitives, recognizable with all colour removed:
 *
 *   Recruit  — plain standard-issue plate + sternum ridge + collar
 *   Vanguard — broad, heavy, forward-angled slabs + ammo straps + breaching apron
 *   Ghost    — slim, tall vertical ribbing + compact central sensor unit
 *   Warden   — massive layered slab + horizontal bands + big reactor housing
 *   Phantom  — long, sleek, sharp plate + diagonal round bandolier
 *   Lifeline — rounded plate + medical cross + side canister pods + monitor
 *
 * A per-piece `seed` drives in-language variants. Imported ONLY by the /arcade chunk.
 */
import * as THREE from 'three';
import type { RenderTier } from '../materials';
import { rng } from '../rand';
import { accent, box, cylY, cylZ, metal } from '../models/parts';
import type { ArmorModelSpec } from './parts';

/** Build a chest plate in its division's geometry language. Centred at the origin;
 *  model.ts places it on the torso front at the chest anchor. */
export function buildChest(spec: ArmorModelSpec, rt: RenderTier): THREE.Group {
  const g = new THREE.Group();
  const b = spec.bulk;
  const body = metal(spec.body, rt);
  const dark = metal(0x17191e, rt);
  const glow = accent(spec.accent, rt, 1.2 + spec.emissive);
  const r = rng(spec.seed >>> 0);
  const chance = (p: number) => r() < p;
  const gl = (m: THREE.Mesh): THREE.Mesh => { m.name = 'glow'; g.add(m); return m; };
  // REALISM: a chest plate never rotates — its reactor/vents pulse (glow), not spin.
  const spinner = (mesh: THREE.Mesh) => { mesh.name = 'glow'; g.add(mesh); };

  switch (spec.division) {
    // ── VANGUARD — broad, heavy, forward, breaching ───────────────────────────
    case 'vanguard': {
      g.add(box(0.5 * b, 0.4 * b, 0.09, body, 0, 0, 0.03)); // wide backing slab
      for (const s of [-1, 1]) { // overlapping pectoral plates, angled forward
        const pec = box(0.24 * b, 0.22 * b, 0.07, body, s * 0.13 * b, 0.07 * b, 0.07);
        pec.rotation.y = -s * 0.25;
        g.add(pec);
      }
      g.add(box(0.11 * b, 0.36 * b, 0.09, dark, 0, 0, 0.1)); // heavy central sternum guard
      for (let i = 0; i < 1 + ((r() * 2) | 0); i++) { // diagonal ammo straps
        const strap = box(0.5 * b, 0.05 * b, 0.03, dark, 0, 0.06 * b - i * 0.14 * b, 0.09);
        strap.rotation.z = (i % 2 ? 1 : -1) * 0.22;
        g.add(strap);
      }
      g.add(box(0.44 * b, 0.13 * b, 0.11, body, 0, -0.2 * b, 0.08)); // forward breaching apron
      gl(box(0.08 * b, 0.06 * b, 0.03, glow, 0, 0.0, 0.12)); // core light
      break;
    }

    // ── GHOST — slim, tall, vertical ribbing + sensor ─────────────────────────
    case 'ghost': {
      g.add(box(0.3 * b, 0.44 * b, 0.05, body, 0, 0, 0.02)); // narrow tall plate
      for (let i = 0; i < 3; i++) g.add(box(0.03, 0.42 * b, 0.045, dark, (i - 1) * 0.09 * b, 0, 0.05)); // vertical ribs
      gl(box(0.09 * b, 0.11 * b, 0.05, glow, 0, 0.07 * b, 0.06)); // central sensor unit
      if (chance(0.6)) for (const s of [-1, 1]) g.add(box(0.05 * b, 0.14 * b, 0.03, dark, s * 0.11 * b, -0.08 * b, 0.05)); // exposed tech panels
      break;
    }

    // ── WARDEN — massive layered slab + reactor housing ───────────────────────
    case 'warden': {
      g.add(box(0.56 * b, 0.44 * b, 0.14, body, 0, 0, 0.04)); // enormous slab
      for (let i = 0; i < 3; i++) g.add(box(0.54 * b, 0.06 * b, 0.05, dark, 0, 0.14 * b - i * 0.14 * b, 0.11)); // horizontal bands
      g.add(box(0.18 * b, 0.18 * b, 0.08, dark, 0, 0.0, 0.11)); // reactor housing
      spinner(cylZ(0.07 * b, 0.05, glow, 0, 0.0, 0.15, 8)); // glowing reactor core
      for (const s of [-1, 1]) gl(cylZ(0.03 * b, 0.05, glow, s * 0.22 * b, 0.15 * b, 0.11, 8)); // shield-emitter nubs
      break;
    }

    // ── PHANTOM — long, sleek, sharp + bandolier ──────────────────────────────
    case 'phantom': {
      g.add(box(0.28 * b, 0.46 * b, 0.05, body, 0, 0, 0.02)); // long slim plate
      const up = box(0.24 * b, 0.14 * b, 0.05, body, 0, 0.18 * b, 0.03); // tapered upper
      up.rotation.x = -0.2;
      g.add(up);
      const sash = box(0.42 * b, 0.07 * b, 0.04, dark, 0, 0, 0.06); // diagonal bandolier
      sash.rotation.z = chance(0.5) ? 0.5 : -0.5;
      g.add(sash);
      for (let i = 0; i < 4; i++) { // rounds on the bandolier
        const rd = cylY(0.012 * b, 0.05 * b, glow, (i - 1.5) * 0.09 * b, (chance(0.5) ? 1 : -1) * (i - 1.5) * 0.09 * b, 0.08);
        rd.name = 'glow';
        g.add(rd);
      }
      gl(box(0.05 * b, 0.05 * b, 0.03, glow, 0, -0.06 * b, 0.06)); // precision core
      break;
    }

    // ── LIFELINE — rounded, medical cross, side pods ──────────────────────────
    case 'lifeline': {
      g.add(box(0.38 * b, 0.38 * b, 0.06, body, 0, 0, 0.02)); // rounded plate
      g.add(box(0.34 * b, 0.06, 0.05, dark, 0, 0.19 * b, 0.04)); // soft collar
      gl(box(0.05 * b, 0.16 * b, 0.03, glow, 0, 0.02 * b, 0.07)); // medical cross (vertical)
      gl(box(0.16 * b, 0.05 * b, 0.03, glow, 0, 0.02 * b, 0.07)); // medical cross (horizontal)
      for (const s of [-1, 1]) g.add(cylY(0.06 * b, 0.18 * b, dark, s * 0.15 * b, -0.04 * b, 0.06)); // canister pods
      if (chance(0.6)) gl(box(0.1 * b, 0.05 * b, 0.03, glow, 0, -0.16 * b, 0.06)); // life-monitor screen
      break;
    }

    // ── RECRUIT — plain standard-issue plate (neutral baseline) ───────────────
    case 'recruit':
    default: {
      g.add(box(0.4 * b, 0.38 * b, 0.06, body, 0, 0, 0.02)); // main plate
      g.add(box(0.06 * b, 0.34 * b, 0.04, dark, 0, 0, 0.06)); // sternum ridge
      g.add(box(0.3 * b, 0.06, 0.05, dark, 0, 0.19 * b, 0.04)); // collar
      g.add(box(0.34 * b, 0.1 * b, 0.05, body, 0, -0.2 * b, 0.03)); // lower plate
      gl(box(0.08 * b, 0.06 * b, 0.03, glow, 0, 0.02, 0.07)); // core light
      if (chance(0.5)) for (const s of [-1, 1]) g.add(box(0.05 * b, 0.28 * b, 0.03, dark, s * 0.17 * b, 0, 0.04)); // side straps
      break;
    }
  }
  return g;
}
