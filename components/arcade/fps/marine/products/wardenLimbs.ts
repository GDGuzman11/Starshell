/**
 * WARDEN LIMB PRODUCTS — massive armoured boots + thick armor braces (limb family).
 * Heavy, square, layered. Primitives only.
 */
import * as THREE from 'three';
import type { RenderTier } from '../../materials';
import { box } from '../../models/parts';
import { kit } from './kit';
import type { ArmorModelSpec } from '../parts';
import type { ArmorProduct } from '../products';

type B = (spec: ArmorModelSpec, rt: RenderTier) => THREE.Group;

// ── BOOTS ─────────────────────────────────────────────────────────────────────
const anchor: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.28 * b, 0.22 * b, 0.3 * b, body, 0, 0.04 * b, 0.02)); // huge boot
  g.add(box(0.3 * b, 0.1, 0.42 * b, dark, 0, -0.1 * b, 0.06)); // massive sole
  g.add(box(0.3 * b, 0.12 * b, 0.1, dark, 0, 0.02 * b, 0.18)); // toe plate
  gl(box(0.03, 0.03, 0.12, glow, 0.12 * b, 0.02 * b, 0)); // side light
  return g;
};
const siegeBoot: B = (spec, rt) => {
  const { g, b, body, dark } = kit(spec, rt);
  g.add(box(0.28 * b, 0.26 * b, 0.3 * b, body, 0, 0.06 * b, 0.02)); // tall fortress boot
  g.add(box(0.32 * b, 0.12, 0.44 * b, dark, 0, -0.11 * b, 0.06)); // enormous sole
  for (let i = 0; i < 3; i++) g.add(box(0.3 * b, 0.04, 0.05, dark, 0, 0.12 * b - i * 0.1 * b, 0.16)); // toe bands
  return g;
};
const colossusBoot: B = (spec, rt) => {
  const { g, b, body, dark } = kit(spec, rt);
  g.add(box(0.3 * b, 0.24 * b, 0.32 * b, body, 0, 0.04 * b, 0.02)); // colossal boot
  g.add(box(0.32 * b, 0.1, 0.44 * b, dark, 0, -0.1 * b, 0.06)); // sole
  for (const s of [-1, 1]) g.add(box(0.05, 0.2 * b, 0.3 * b, dark, s * 0.15 * b, 0.02 * b, 0.02)); // side armor
  return g;
};

// ── ARMOR BRACES (limb) ───────────────────────────────────────────────────────
const brace: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.24 * b, 0.24 * b, 0.24 * b, body, 0, 0, 0)); // thick shell
  for (let i = 0; i < 3; i++) g.add(box(0.26 * b, 0.04, 0.26 * b, dark, 0, 0.09 * b - i * 0.09 * b, 0)); // reinforcement braces
  gl(box(0.16 * b, 0.02, 0.03, glow, 0, 0, 0.13 * b)); // status
  return g;
};
const bulwarkBrace: B = (spec, rt) => {
  const { g, b, body, dark } = kit(spec, rt);
  g.add(box(0.26 * b, 0.24 * b, 0.26 * b, body, 0, 0, 0)); // bigger shell
  g.add(box(0.14 * b, 0.26 * b, 0.06, dark, 0, 0, 0.14 * b)); // front slab
  for (const s of [-1, 1]) g.add(box(0.03, 0.22 * b, 0.06, dark, s * 0.12 * b, 0, 0.1 * b)); // side rails
  return g;
};
const plateBrace: B = (spec, rt) => {
  const { g, b, body, dark } = kit(spec, rt);
  g.add(box(0.24 * b, 0.24 * b, 0.24 * b, body, 0, 0, 0));
  for (const s of [-1, 1]) for (let i = 0; i < 2; i++) g.add(box(0.05, 0.05, 0.05, dark, s * 0.13 * b, 0.06 * b - i * 0.12 * b, 0.1 * b)); // corner bolts
  return g;
};

export const WARDEN_BOOTS: ArmorProduct[] = [
  { id: 'anchor', name: 'Anchor', noun: 'Sabatons', build: anchor },
  { id: 'siegeboot', name: 'Siege', noun: 'Sabatons', build: siegeBoot },
  { id: 'colossusboot', name: 'Colossus', noun: 'Sabatons', build: colossusBoot },
];
export const WARDEN_BRACES: ArmorProduct[] = [
  { id: 'brace', name: 'Brace', noun: 'Braces', build: brace },
  { id: 'bulwarkbrace', name: 'Bulwark', noun: 'Braces', build: bulwarkBrace },
  { id: 'platebrace', name: 'Plate', noun: 'Braces', build: plateBrace },
];
