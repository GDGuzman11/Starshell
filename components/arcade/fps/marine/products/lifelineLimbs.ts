/**
 * LIFELINE LIMB PRODUCTS — repair/injector gloves + soft support boots. Rounded, medical.
 * Primitives only.
 */
import * as THREE from 'three';
import type { RenderTier } from '../../materials';
import { box, cylZ } from '../../models/parts';
import { kit } from './kit';
import type { ArmorModelSpec } from '../parts';
import type { ArmorProduct } from '../products';

type B = (spec: ArmorModelSpec, rt: RenderTier) => THREE.Group;

// ── GLOVES ────────────────────────────────────────────────────────────────────
const repairGlove: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.16 * b, 0.13 * b, 0.18 * b, body, 0, 0, 0.02)); // glove
  g.add(box(0.09 * b, 0.08 * b, 0.09 * b, dark, 0, 0.07 * b, -0.02)); // wrist tool
  gl(box(0.03 * b, 0.03 * b, 0.02, glow, 0, 0.09 * b, 0.04)); // tool light
  return g;
};
const injectorGlove: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.15 * b, 0.13 * b, 0.18 * b, body, 0, 0, 0.02));
  g.add(cylZ(0.02 * b, 0.12, dark, 0.05 * b, -0.02 * b, 0.1)); // wrist injector needle
  gl(cylZ(0.015 * b, 0.03, glow, 0.05 * b, -0.02 * b, 0.06, 8)); // vial
  return g;
};
const fieldGlove: B = (spec, rt) => {
  const { g, b, body, dark } = kit(spec, rt);
  g.add(box(0.16 * b, 0.14 * b, 0.18 * b, body, 0, 0, 0.02));
  g.add(box(0.14 * b, 0.06, 0.09, dark, 0, -0.05 * b, 0.11)); // knuckle
  g.add(box(0.06 * b, 0.06 * b, 0.05, dark, -0.05 * b, 0.06 * b, -0.02)); // supply pod
  return g;
};

// ── BOOTS ─────────────────────────────────────────────────────────────────────
const supportBoot: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.19 * b, 0.14 * b, 0.24 * b, body, 0, 0, 0.02)); // boot
  g.add(box(0.2 * b, 0.05, 0.32 * b, dark, 0, -0.06 * b, 0.06)); // sole
  g.add(box(0.18 * b, 0.08 * b, 0.06, body, 0, 0.06 * b, 0.14)); // rounded toe
  gl(box(0.03 * b, 0.06 * b, 0.02, glow, 0, 0.05 * b, 0.16)); // status light
  return g;
};
const rescueBoot: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.19 * b, 0.15 * b, 0.24 * b, body, 0, 0, 0.02));
  g.add(box(0.2 * b, 0.06, 0.32 * b, dark, 0, -0.06 * b, 0.06)); // grip sole
  gl(box(0.02, 0.02, 0.16 * b, glow, 0.08 * b, 0, 0.02)); gl(box(0.02, 0.02, 0.16 * b, glow, -0.08 * b, 0, 0.02)); // twin guide lights
  return g;
};
const fieldBoot: B = (spec, rt) => {
  const { g, b, body, dark } = kit(spec, rt);
  g.add(box(0.19 * b, 0.16 * b, 0.24 * b, body, 0, 0.02 * b, 0.02));
  g.add(box(0.2 * b, 0.06, 0.34 * b, dark, 0, -0.06 * b, 0.06)); // sole
  g.add(box(0.2 * b, 0.06 * b, 0.06, dark, 0, 0.1 * b, -0.05)); // ankle support
  return g;
};

export const LIFELINE_GLOVES: ArmorProduct[] = [
  { id: 'repairglove', name: 'Repair', noun: 'Gloves', build: repairGlove },
  { id: 'injectorglove', name: 'Injector', noun: 'Gloves', build: injectorGlove },
  { id: 'fieldglove', name: 'Field', noun: 'Gloves', build: fieldGlove },
];
export const LIFELINE_BOOTS: ArmorProduct[] = [
  { id: 'supportboot', name: 'Support', noun: 'Boots', build: supportBoot },
  { id: 'rescueboot', name: 'Rescue', noun: 'Boots', build: rescueBoot },
  { id: 'fieldboot', name: 'Field', noun: 'Boots', build: fieldBoot },
];
