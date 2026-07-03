/**
 * LIFELINE TORSO PRODUCTS — rounded medical chests + medical harnesses. Soft, supportive,
 * crosses + canisters + monitors. Primitives only.
 */
import * as THREE from 'three';
import type { RenderTier } from '../../materials';
import { box, cylY } from '../../models/parts';
import { kit } from './kit';
import type { ArmorModelSpec } from '../parts';
import type { ArmorProduct } from '../products';

type B = (spec: ArmorModelSpec, rt: RenderTier) => THREE.Group;

// ── CHESTS ────────────────────────────────────────────────────────────────────
const medic: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.38 * b, 0.38 * b, 0.06, body, 0, 0, 0.02)); // rounded plate
  g.add(box(0.34 * b, 0.06, 0.05, dark, 0, 0.19 * b, 0.04)); // soft collar
  gl(box(0.05 * b, 0.16 * b, 0.03, glow, 0, 0.02 * b, 0.07)); gl(box(0.16 * b, 0.05 * b, 0.03, glow, 0, 0.02 * b, 0.07)); // medical cross
  for (const s of [-1, 1]) g.add(cylY(0.06 * b, 0.18 * b, dark, s * 0.15 * b, -0.04 * b, 0.06)); // canister pods
  return g;
};
const vital: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.36 * b, 0.4 * b, 0.06, body, 0, 0, 0.02)); // rounded plate
  gl(box(0.16 * b, 0.1 * b, 0.03, glow, 0, 0.08 * b, 0.06)); // life-monitor screen
  for (let i = 0; i < 3; i++) gl(box(0.14 * b, 0.015, 0.03, glow, 0, 0.05 * b - i * 0.03 * b, 0.07)); // ekg lines
  for (const s of [-1, 1]) g.add(box(0.06 * b, 0.16 * b, 0.05, dark, s * 0.15 * b, -0.08 * b, 0.05)); // side pouches
  return g;
};
const guardian: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.4 * b, 0.38 * b, 0.07, body, 0, 0, 0.03)); // wide soft plate
  g.add(box(0.16 * b, 0.16 * b, 0.06, dark, 0, 0.02 * b, 0.08)); // central unit
  gl(box(0.04 * b, 0.12 * b, 0.03, glow, 0, 0.02 * b, 0.11)); gl(box(0.12 * b, 0.04 * b, 0.03, glow, 0, 0.02 * b, 0.11)); // big cross
  for (const s of [-1, 1]) g.add(cylY(0.05 * b, 0.16 * b, dark, s * 0.16 * b, -0.06 * b, 0.05)); // stim canisters
  return g;
};

// ── MEDICAL HARNESS (plate) ───────────────────────────────────────────────────
const trauma: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  for (const s of [-1, 1]) { const strap = box(0.03 * b, 0.34 * b, 0.03, dark, s * 0.06 * b, 0, 0.04); strap.rotation.z = s * 0.26; g.add(strap); } // crossing straps
  g.add(box(0.1 * b, 0.1 * b, 0.05, body, 0, -0.02 * b, 0.05)); // trauma kit
  gl(box(0.03, 0.06 * b, 0.03, glow, 0, -0.02 * b, 0.08)); gl(box(0.06 * b, 0.03, 0.03, glow, 0, -0.02 * b, 0.08)); // kit cross
  return g;
};
const fieldHarness: B = (spec, rt) => {
  const { g, b, body, dark } = kit(spec, rt);
  g.add(box(0.3 * b, 0.06 * b, 0.05, dark, 0, 0.02 * b, 0.04)); // belt
  for (let i = 0; i < 4; i++) g.add(box(0.05 * b, 0.09 * b, 0.05, body, -0.12 * b + i * 0.08 * b, -0.05 * b, 0.06)); // supply pouches
  return g;
};
const aid: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.05 * b, 0.34 * b, 0.04, dark, 0, 0, 0.04)); // spine strap
  for (const s of [-1, 1]) g.add(cylY(0.04 * b, 0.14 * b, body, s * 0.11 * b, 0, 0.05)); // aid canisters
  gl(box(0.03 * b, 0.03 * b, 0.03, glow, 0, 0.1 * b, 0.06)); // status
  return g;
};

export const LIFELINE_CHESTS: ArmorProduct[] = [
  { id: 'medic', name: 'Medic', noun: 'Plate', build: medic },
  { id: 'vital', name: 'Vital', noun: 'Plate', build: vital },
  { id: 'guardian', name: 'Guardian', noun: 'Plate', build: guardian },
];
export const LIFELINE_HARNESS: ArmorProduct[] = [
  { id: 'trauma', name: 'Trauma', noun: 'Harness', build: trauma },
  { id: 'fieldharness', name: 'Field', noun: 'Harness', build: fieldHarness },
  { id: 'aid', name: 'Aid', noun: 'Harness', build: aid },
];
