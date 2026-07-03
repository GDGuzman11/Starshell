/**
 * GHOST COMMS-FAMILY PRODUCTS — two distinct head-mounted slot lines that share the
 * `comms` family: SCANNER arrays (optic-forward) and COMM uplinks (antenna-forward).
 * Small modules. Primitives only.
 */
import * as THREE from 'three';
import type { RenderTier } from '../../materials';
import { box, cylY, cylZ } from '../../models/parts';
import { kit } from './kit';
import type { ArmorModelSpec } from '../parts';
import type { ArmorProduct } from '../products';

type B = (spec: ArmorModelSpec, rt: RenderTier) => THREE.Group;

// ── SCANNER arrays (optic-forward) ────────────────────────────────────────────
const optic: B = (spec, rt) => {
  const { g, b, dark, glow, moving } = kit(spec, rt);
  g.add(box(0.08 * b, 0.08 * b, 0.08 * b, dark, 0, 0, 0)); // module
  moving(cylZ(0.04 * b, 0.03, glow, 0, 0, 0.05, 10)); // scanning lens
  return g;
};
const scanArray: B = (spec, rt) => {
  const { g, b, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.09 * b, 0.06 * b, 0.07 * b, dark, 0, 0, 0));
  for (let i = 0; i < 3; i++) g.add(cylY(0.008, 0.1 * b, dark, (i - 1) * 0.03 * b, 0.08 * b, 0)); // mini antennas
  gl(box(0.06 * b, 0.02, 0.02, glow, 0, -0.02 * b, 0.04));
  return g;
};
const sweep: B = (spec, rt) => {
  const { g, b, dark, glow, moving } = kit(spec, rt);
  g.add(box(0.08 * b, 0.08 * b, 0.06 * b, dark, 0, 0, 0));
  moving(box(0.12 * b, 0.015, 0.02, glow, 0, 0.02 * b, 0.04)); // rotating radar bar
  return g;
};

// ── COMM uplinks (antenna-forward) ────────────────────────────────────────────
const uplink: B = (spec, rt) => {
  const { g, b, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.08 * b, 0.08 * b, 0.08 * b, dark, 0, 0, 0)); // module
  g.add(cylY(0.008, 0.2 * b, dark, 0, 0.14 * b, 0)); // tall antenna
  gl(box(0.02, 0.02, 0.02, glow, 0, 0.25 * b, 0)); // tip light
  return g;
};
const commRelay: B = (spec, rt) => {
  const { g, b, dark, glow, moving } = kit(spec, rt);
  g.add(box(0.08 * b, 0.08 * b, 0.07 * b, dark, 0, 0, 0));
  moving(cylZ(0.05 * b, 0.02, glow, 0, 0.02 * b, 0.05, 10)); // small dish
  return g;
};
const beacon: B = (spec, rt) => {
  const { g, b, dark, glow, moving } = kit(spec, rt);
  g.add(box(0.08 * b, 0.06 * b, 0.08 * b, dark, 0, 0, 0));
  moving(cylY(0.03 * b, 0.05 * b, glow, 0, 0.07 * b, 0)); // beacon
  return g;
};

export const GHOST_SCANNER: ArmorProduct[] = [
  { id: 'optic', name: 'Optic', noun: 'Scanner', build: optic },
  { id: 'scanarray', name: 'Array', noun: 'Scanner', build: scanArray },
  { id: 'sweep', name: 'Sweep', noun: 'Scanner', build: sweep },
];
export const GHOST_COMM: ArmorProduct[] = [
  { id: 'uplink', name: 'Uplink', noun: 'Comms', build: uplink },
  { id: 'commrelay', name: 'Relay', noun: 'Comms', build: commRelay },
  { id: 'beacon', name: 'Beacon', noun: 'Comms', build: beacon },
];
