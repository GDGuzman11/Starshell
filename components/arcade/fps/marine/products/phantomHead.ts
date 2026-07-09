/**
 * PHANTOM HEAD PRODUCTS — Precision Hunter: long, sleek, sharp helmets + long-range visors +
 * targeting modules. Everything emphasises precision. Primitives only.
 */
import * as THREE from 'three';
import type { RenderTier } from '../../materials';
import { box, coneZ, cylZ } from '../../models/parts';
import { kit } from './kit';
import type { ArmorModelSpec } from '../parts';
import type { ArmorProduct } from '../products';

type B = (spec: ArmorModelSpec, rt: RenderTier) => THREE.Group;

// ── HELMETS ───────────────────────────────────────────────────────────────────
const longshot: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.2 * b, 0.2 * b, 0.35 * b, body, 0, 0.02, 0.02)); // elongated sleek head
  const nose = coneZ(0.06 * b, 0.1 * b, 0.12 * b, body, 0, -0.01, 0.2 * b); g.add(nose); // tapered front
  gl(box(0.17 * b, 0.04 * b, 0.22 * b, glow, 0, 0.03, 0.08 * b)); // long precision visor
  g.add(box(0.05 * b, 0.05 * b, 0.14 * b, dark, 0.12 * b, 0.07 * b, 0.08 * b)); // rangefinder
  gl(cylZ(0.02 * b, 0.04, glow, 0.12 * b, 0.07 * b, 0.17 * b, 10)); // rangefinder lens
  g.add(box(0.11 * b, 0.11 * b, 0.1 * b, dark, 0, 0, -0.17 * b)); // rear counterweight
  return g;
};
const deadeye: B = (spec, rt) => {
  const { g, b, body, dark, glow, moving } = kit(spec, rt);
  g.add(box(0.19 * b, 0.2 * b, 0.34 * b, body, 0, 0.02, 0.02)); // sleek head
  g.add(coneZ(0.05 * b, 0.09 * b, 0.1 * b, body, 0, -0.01, 0.2 * b)); // nose
  moving(cylZ(0.05 * b, 0.03, glow, 0, 0.03 * b, 0.16 * b, 12)); // large single scope optic
  g.add(cylZ(0.06 * b, 0.02, dark, 0, 0.03 * b, 0.19 * b, 12)); // scope ring
  return g;
};
const vantage: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.2 * b, 0.21 * b, 0.33 * b, body, 0, 0.02, 0.02)); // head
  g.add(box(0.05 * b, 0.05 * b, 0.2 * b, dark, 0, 0.13 * b, 0.06 * b)); // top sensor rail
  gl(box(0.02, 0.02, 0.18 * b, glow, 0, 0.16 * b, 0.06 * b)); // rail line
  for (const s of [-1, 1]) gl(box(0.03 * b, 0.03 * b, 0.16 * b, glow, s * 0.09 * b, 0.02, 0.1 * b)); // twin optics
  return g;
};

// ── TARGETING MODULES (comms) ─────────────────────────────────────────────────
const targeter: B = (spec, rt) => {
  const { g, b, dark, glow, moving } = kit(spec, rt);
  g.add(box(0.07 * b, 0.07 * b, 0.09 * b, dark, 0, 0, 0)); // module
  moving(cylZ(0.035 * b, 0.03, glow, 0, 0, 0.06, 12)); // scanning targeter
  return g;
};
const designator: B = (spec, rt) => {
  const { g, b, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.06 * b, 0.08 * b, 0.08 * b, dark, 0, 0, 0));
  g.add(box(0.02, 0.02, 0.12 * b, dark, 0, 0.02 * b, 0.06)); // designator barrel
  gl(box(0.02, 0.02, 0.02, glow, 0, 0.02 * b, 0.13 * b)); // laser dot
  return g;
};
const tracker: B = (spec, rt) => {
  const { g, b, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.08 * b, 0.06 * b, 0.07 * b, dark, 0, 0, 0));
  for (let i = 0; i < 3; i++) gl(box(0.015, 0.03, 0.015, glow, (i - 1) * 0.025 * b, 0.05 * b, 0.02)); // tracking pips
  return g;
};

export const PHANTOM_HELMETS: ArmorProduct[] = [
  { id: 'longshot', name: 'Longshot', noun: 'Helm', build: longshot },
  { id: 'deadeye', name: 'Deadeye', noun: 'Helm', build: deadeye },
  { id: 'vantage', name: 'Vantage', noun: 'Helm', build: vantage },
];
export const PHANTOM_TARGETING: ArmorProduct[] = [
  { id: 'targeter', name: 'Targeter', noun: 'Module', build: targeter },
  { id: 'designator', name: 'Designator', noun: 'Module', build: designator },
  { id: 'tracker', name: 'Tracker', noun: 'Module', build: tracker },
];
