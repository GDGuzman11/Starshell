/**
 * PHANTOM SYSTEMS PRODUCTS — rangefinding backpacks + precision power cores. Slim, optic-heavy.
 * Primitives only.
 */
import * as THREE from 'three';
import type { RenderTier } from '../../materials';
import { box, cylY, cylZ } from '../../models/parts';
import { kit } from './kit';
import type { ArmorModelSpec } from '../parts';
import type { ArmorProduct } from '../products';

type B = (spec: ArmorModelSpec, rt: RenderTier) => THREE.Group;

// ── RANGEFINDING BACKPACKS (backpack) ─────────────────────────────────────────
const rangefinder: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.18 * b, 0.34 * b, 0.1 * b, body, 0, 0, -0.02)); // slim minimal body
  g.add(cylY(0.015, 0.4 * b, dark, 0.08 * b, 0.24 * b, -0.04)); // rangefinder mast
  gl(box(0.05 * b, 0.05 * b, 0.05 * b, glow, 0.08 * b, 0.44 * b, -0.04)); // rangefinder optic
  gl(box(0.02, 0.24 * b, 0.02, glow, -0.06 * b, 0, 0.04)); // data strip
  return g;
};
const spotter: B = (spec, rt) => {
  const { g, b, body, dark, glow, moving } = kit(spec, rt);
  g.add(box(0.2 * b, 0.32 * b, 0.1 * b, body, 0, 0, -0.02));
  g.add(box(0.08 * b, 0.08 * b, 0.08 * b, dark, 0, 0.2 * b, -0.05)); // spotter head
  moving(cylZ(0.04 * b, 0.03, glow, 0, 0.2 * b, -0.09, 12)); // rotating spotter scope
  return g;
};
const longbow: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.16 * b, 0.36 * b, 0.1 * b, body, 0, 0, -0.02)); // very slim
  for (const s of [-1, 1]) g.add(cylY(0.012, 0.34 * b, dark, s * 0.06 * b, 0.22 * b, -0.04)); // twin masts
  gl(box(0.02, 0.02, 0.02, glow, 0, 0.4 * b, -0.04)); // tip
  return g;
};

// ── PRECISION POWER CORES (core) ──────────────────────────────────────────────
const precision: B = (spec, rt) => {
  const { g, b, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.12 * b, 0.12 * b, 0.08, dark, 0, 0, 0)); // compact housing
  gl(cylZ(0.05 * b, 0.05, glow, 0, 0, 0.05, 16)); // lens
  g.add(cylZ(0.06 * b, 0.02, dark, 0, 0, 0.07, 16)); // lens ring
  return g;
};
const lens: B = (spec, rt) => {
  const { g, b, dark, glow, moving } = kit(spec, rt);
  g.add(box(0.12 * b, 0.12 * b, 0.08, dark, 0, 0, 0));
  moving(cylZ(0.055 * b, 0.03, glow, 0, 0, 0.06, 16)); // focusing iris
  return g;
};
const focus: B = (spec, rt) => {
  const { g, b, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.11 * b, 0.13 * b, 0.08, dark, 0, 0, 0));
  for (let i = 0; i < 3; i++) gl(cylZ((0.05 - i * 0.012) * b, 0.02, glow, 0, 0, 0.05 + i * 0.01, 16)); // stacked lens rings
  return g;
};

export const PHANTOM_RANGEFIND: ArmorProduct[] = [
  { id: 'rangefinder', name: 'Rangefinder', noun: 'Pack', build: rangefinder },
  { id: 'spotter', name: 'Spotter', noun: 'Pack', build: spotter },
  { id: 'longbow', name: 'Longbow', noun: 'Pack', build: longbow },
];
export const PHANTOM_CORE: ArmorProduct[] = [
  { id: 'precision', name: 'Precision', noun: 'Core', build: precision },
  { id: 'lens', name: 'Lens', noun: 'Core', build: lens },
  { id: 'focus', name: 'Focus', noun: 'Core', build: focus },
];
