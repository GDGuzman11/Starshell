/**
 * VANGUARD LIMB PRODUCTS — heavy gauntlets + chunky breaching boots. Aggressive, studded.
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
const ironfist: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.19 * b, 0.16 * b, 0.2 * b, body, 0, 0, 0.02)); // heavy gauntlet
  g.add(box(0.18 * b, 0.09 * b, 0.09, dark, 0, -0.05 * b, 0.11)); // big knuckle plate
  for (let k = 0; k < 3; k++) g.add(box(0.03, 0.03, 0.03, dark, -0.06 * b + k * 0.06 * b, -0.03 * b, 0.13)); // studs
  gl(box(0.03, 0.03, 0.03, glow, 0.08 * b, 0.03 * b, 0.06)); // wrist light
  return g;
};
const breachGlove: B = (spec, rt) => {
  const { g, b, body, dark } = kit(spec, rt);
  g.add(box(0.2 * b, 0.17 * b, 0.2 * b, body, 0, 0, 0.02)); // heavier
  g.add(box(0.2 * b, 0.11 * b, 0.1, dark, 0, -0.05 * b, 0.11)); // ram knuckle
  for (const s of [-1, 1]) g.add(box(0.04, 0.12 * b, 0.06, dark, s * 0.1 * b, 0, 0.06)); // side plates
  return g;
};
const gripGlove: B = (spec, rt) => {
  const { g, b, body, dark } = kit(spec, rt);
  g.add(box(0.18 * b, 0.15 * b, 0.19 * b, body, 0, 0, 0.02));
  g.add(box(0.16 * b, 0.07, 0.1, dark, 0, -0.05 * b, 0.11)); // knuckle
  g.add(box(0.17 * b, 0.06 * b, 0.06, dark, 0, 0.08 * b, -0.02)); // heavy cuff
  return g;
};

// ── BOOTS ─────────────────────────────────────────────────────────────────────
const stomp: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.24 * b, 0.18 * b, 0.26 * b, body, 0, 0.02 * b, 0.02)); // chunky boot
  g.add(box(0.26 * b, 0.08, 0.38 * b, dark, 0, -0.08 * b, 0.06)); // thick sole
  g.add(box(0.24 * b, 0.1 * b, 0.08, dark, 0, 0.04 * b, 0.16)); // toe cap plate
  for (let k = 0; k < 3; k++) g.add(box(0.03, 0.03, 0.03, dark, -0.08 * b + k * 0.08 * b, -0.11 * b, 0.1)); // cleats
  gl(box(0.03, 0.03, 0.1, glow, 0.1 * b, 0.02 * b, 0)); // side light
  return g;
};
const siegeBoot: B = (spec, rt) => {
  const { g, b, body, dark } = kit(spec, rt);
  g.add(box(0.25 * b, 0.22 * b, 0.26 * b, body, 0, 0.04 * b, 0.02)); // tall heavy boot
  g.add(box(0.27 * b, 0.1, 0.4 * b, dark, 0, -0.09 * b, 0.06)); // massive sole
  g.add(box(0.25 * b, 0.12 * b, 0.1, body, 0, 0.14 * b, -0.06)); // ankle guard
  return g;
};
const charger: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.24 * b, 0.18 * b, 0.26 * b, body, 0, 0.02 * b, 0.02));
  g.add(box(0.26 * b, 0.08, 0.38 * b, dark, 0, -0.08 * b, 0.06)); // sole
  gl(box(0.04, 0.04, 0.16 * b, glow, 0, -0.02 * b, -0.12)); // rear thruster
  return g;
};

export const VANGUARD_GLOVES: ArmorProduct[] = [
  { id: 'ironfist', name: 'Ironfist', noun: 'Gauntlets', build: ironfist },
  { id: 'breachglove', name: 'Breach', noun: 'Gauntlets', build: breachGlove },
  { id: 'gripglove', name: 'Grip', noun: 'Gauntlets', build: gripGlove },
];
export const VANGUARD_BOOTS: ArmorProduct[] = [
  { id: 'stomp', name: 'Stomp', noun: 'Sabatons', build: stomp },
  { id: 'siegeboot', name: 'Siege', noun: 'Sabatons', build: siegeBoot },
  { id: 'charger', name: 'Charger', noun: 'Sabatons', build: charger },
];
