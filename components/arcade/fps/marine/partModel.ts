/**
 * ARMOR PIECE GEOMETRY — turns a parametric ArmorModelSpec into visible primitive
 * geometry (the armor twin of the Arsenal's `partModel.ts`). Every piece is built
 * from boxes / cylinders / cones only (zero assets), modelled centred at the origin
 * so `model.ts` can drop it onto a named body-part group at the slot's anchor.
 *
 * Chunky, broad, late-90s-action-figure silhouettes per the spec. Emissive trim is
 * tagged `glow` and moving parts `spin` so MarinePreview animates them (same
 * convention GunPreview uses). Higher tiers get more plates + brighter trim + a
 * moving element, so the visible evolution reads at a glance.
 *
 * Imported ONLY by the /arcade chunk.
 */
import * as THREE from 'three';
import type { RenderTier } from '../materials';
import { accent, box, cylY, cylZ, metal } from '../models/parts';
import { buildHelmet } from './helmets';
import { buildChest } from './chests';
import { buildShoulders } from './shoulders';
import { buildBackpack } from './backpacks';
import { buildBoot } from './boots';
import { buildLimb } from './limbs';
import { buildGlove } from './gloves';
import { buildCore } from './cores';
import { buildVisor } from './visors';
import { productById } from './products';
import type { ArmorModelSpec } from './parts';

/** Build one armour piece centred at the origin. Paired slots (arms/legs) return a
 *  single side; model.ts clones it onto both limb groups. */
export function buildArmorPiece(spec: ArmorModelSpec, rt: RenderTier): THREE.Group {
  const g = new THREE.Group();
  // Pt2: a bespoke PRODUCT template overrides the per-division language when present.
  if (spec.template) {
    const product = productById(spec.division, spec.family, spec.template);
    if (product) {
      g.add(product.build(spec, rt));
      return g;
    }
  }
  const b = spec.bulk;
  const body = metal(spec.body, rt);
  const dark = metal(0x1c1f24, rt);
  const glow = accent(spec.accent, rt, 1.3 + spec.emissive);
  const trim = spec.emissive > 0.25;

  const glowStrip = (w: number, h: number, d: number, x: number, y: number, z: number) => {
    const m = box(w, h, d, glow, x, y, z);
    m.name = 'glow';
    g.add(m);
  };
  // A small rotating element (prototype/legendary) so evolution reads as motion.
  const addSpinner = (y: number, z: number, r: number) => {
    if (!spec.animated) return;
    const ring = cylZ(r, 0.02, glow, 0, y, z, 8);
    ring.name = 'spin';
    g.add(ring);
  };

  switch (spec.family) {
    case 'helmet': {
      // Art-directed per-division helmet geometry (Armor Overhaul, slice 1).
      g.add(buildHelmet(spec, rt));
      break;
    }
    case 'chest': {
      // Art-directed per-division chest geometry (Armor Overhaul, slice 2).
      g.add(buildChest(spec, rt));
      break;
    }
    case 'visor': {
      g.add(buildVisor(spec, rt)); // per-division visor (Armor Overhaul, slice 7c)
      break;
    }
    case 'plate': {
      g.add(box(0.44 * b, 0.3 * b, 0.06, body, 0, 0, 0)); // main plate
      for (let i = 0; i < spec.plates; i++) g.add(box(0.4 * b - i * 0.05, 0.04, 0.03, dark, 0, 0.09 * b - i * 0.08, 0.04)); // ribs
      if (trim) glowStrip(0.06, 0.14 * b, 0.02, 0, 0, 0.05);
      addSpinner(-0.08 * b, 0.06, 0.03 * b);
      break;
    }
    case 'pauldron': {
      // Art-directed per-division shoulder geometry (Armor Overhaul, slice 3).
      g.add(buildShoulders(spec, rt));
      break;
    }
    case 'limb': {
      // Art-directed per-division limb geometry (Armor Overhaul, slice 6).
      g.add(buildLimb(spec, rt));
      break;
    }
    case 'cap': {
      g.add(cylY(0.11 * b, 0.1 * b, body, 0, 0, 0.04)); // knee dome
      if (trim) glowStrip(0.06, 0.02, 0.02, 0, 0, 0.12 * b);
      break;
    }
    case 'glove': {
      g.add(buildGlove(spec, rt)); // per-division gauntlet (Armor Overhaul, slice 7a)
      break;
    }
    case 'boot': {
      // Art-directed per-division boot geometry (Armor Overhaul, slice 5).
      g.add(buildBoot(spec, rt));
      break;
    }
    case 'backpack': {
      // Art-directed per-division backpack geometry (Armor Overhaul, slice 4).
      g.add(buildBackpack(spec, rt));
      break;
    }
    case 'core': {
      g.add(buildCore(spec, rt)); // per-division module (Armor Overhaul, slice 7b)
      break;
    }
    case 'comms': {
      g.add(box(0.08 * b, 0.08 * b, 0.08 * b, dark, 0, 0, 0)); // module
      g.add(cylY(0.008, 0.2 * b, dark, 0, 0.14 * b, 0)); // antenna
      glowStrip(0.02, 0.02, 0.02, 0, 0.25 * b, 0); // antenna tip
      break;
    }
    case 'insignia': {
      const m = box(0.14 * b, 0.14 * b, 0.01, glow, 0, 0, 0);
      m.name = 'glow';
      g.add(m);
      g.add(box(0.16 * b, 0.16 * b, 0.008, dark, 0, 0, -0.005)); // backing
      break;
    }
    case 'coating':
    default:
      break; // coating is applied as a whole-rig tint in model.ts
  }
  return g;
}
