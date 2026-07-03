/**
 * PHANTOM LIMB PRODUCTS — slim precision gloves + narrow marksman boots. Light, sharp.
 * Primitives only.
 */
import * as THREE from 'three';
import type { RenderTier } from '../../materials';
import { box } from '../../models/parts';
import { kit } from './kit';
import type { ArmorModelSpec } from '../parts';
import type { ArmorProduct } from '../products';

type B = (spec: ArmorModelSpec, rt: RenderTier) => THREE.Group;

// ── GLOVES ────────────────────────────────────────────────────────────────────
const trigger: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.13 * b, 0.12 * b, 0.18 * b, body, 0, 0, 0.02)); // slim glove
  g.add(box(0.04 * b, 0.05 * b, 0.1, dark, 0.05 * b, -0.03 * b, 0.12)); // trigger finger
  gl(box(0.02, 0.02, 0.12 * b, glow, 0.07 * b, 0.02 * b, 0.04)); // wrist data line
  return g;
};
const steady: B = (spec, rt) => {
  const { g, b, body, dark } = kit(spec, rt);
  g.add(box(0.13 * b, 0.13 * b, 0.18 * b, body, 0, 0, 0.02));
  g.add(box(0.04, 0.1 * b, 0.06, dark, 0, 0.06 * b, -0.02)); // wrist brace
  g.add(box(0.04 * b, 0.05 * b, 0.1, dark, 0.05 * b, -0.03 * b, 0.12)); // trigger finger
  return g;
};
const precisionGlove: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.12 * b, 0.12 * b, 0.19 * b, body, 0, 0, 0.02)); // very slim
  for (let i = 0; i < 3; i++) g.add(box(0.02, 0.02, 0.09, dark, -0.03 * b + i * 0.03 * b, -0.04 * b, 0.13)); // articulated fingers
  gl(box(0.02, 0.02, 0.02, glow, 0.06 * b, 0.03 * b, 0.06)); // sensor
  return g;
};

// ── BOOTS ─────────────────────────────────────────────────────────────────────
const marksmanBoot: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.15 * b, 0.14 * b, 0.24 * b, body, 0, 0, 0.02)); // narrow boot
  g.add(box(0.16 * b, 0.04, 0.3 * b, dark, 0, -0.06 * b, 0.06)); // slim sole
  g.add(box(0.04 * b, 0.05 * b, 0.12 * b, dark, 0, -0.04 * b, -0.11)); // heel stabilizer spur
  gl(box(0.02, 0.02, 0.14 * b, glow, 0.07 * b, 0, 0.02)); // side line
  return g;
};
const perch: B = (spec, rt) => {
  const { g, b, body, dark } = kit(spec, rt);
  g.add(box(0.15 * b, 0.14 * b, 0.24 * b, body, 0, 0, 0.02));
  g.add(box(0.17 * b, 0.04, 0.3 * b, dark, 0, -0.06 * b, 0.06)); // sole
  g.add(box(0.14 * b, 0.03, 0.06, dark, 0, -0.06 * b, 0.16)); // toe grip claw
  g.add(box(0.06 * b, 0.03, 0.14 * b, dark, 0, -0.05 * b, -0.12)); // heel brace
  return g;
};
const silentBoot: B = (spec, rt) => {
  const { g, b, body, dark } = kit(spec, rt);
  g.add(box(0.14 * b, 0.12 * b, 0.25 * b, body, 0, -0.01 * b, 0.02)); // low slim boot
  g.add(box(0.16 * b, 0.06, 0.32 * b, dark, 0, -0.06 * b, 0.05)); // padded sole
  return g;
};

export const PHANTOM_GLOVES: ArmorProduct[] = [
  { id: 'trigger', name: 'Trigger', noun: 'Gauntlets', build: trigger },
  { id: 'steady', name: 'Steady', noun: 'Gauntlets', build: steady },
  { id: 'precisionglove', name: 'Precision', noun: 'Gauntlets', build: precisionGlove },
];
export const PHANTOM_BOOTS: ArmorProduct[] = [
  { id: 'marksmanboot', name: 'Marksman', noun: 'Boots', build: marksmanBoot },
  { id: 'perch', name: 'Perch', noun: 'Boots', build: perch },
  { id: 'silentboot', name: 'Silent', noun: 'Boots', build: silentBoot },
];
