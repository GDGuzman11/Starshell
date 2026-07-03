/**
 * VANGUARD HELMET PRODUCTS — Shock Trooper: wide, heavy, forward-leaning, breaching.
 * Aggressive silhouettes. Primitives only.
 */
import * as THREE from 'three';
import type { RenderTier } from '../../materials';
import { box, cylZ } from '../../models/parts';
import { kit } from './kit';
import type { ArmorModelSpec } from '../parts';
import type { ArmorProduct } from '../products';

type B = (spec: ArmorModelSpec, rt: RenderTier) => THREE.Group;

const bulldog: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.31 * b, 0.24 * b, 0.3 * b, body, 0, 0.02, 0)); // heavy skull
  g.add(box(0.28 * b, 0.12 * b, 0.17 * b, body, 0, -0.12 * b, 0.15 * b)); // jutting armoured jaw
  g.add(box(0.28 * b, 0.06, 0.09, dark, 0, 0.08 * b, 0.13 * b)); // brow ridge
  gl(box(0.22 * b, 0.05 * b, 0.03, glow, 0, 0, 0.16 * b)); // visor
  for (const s of [-1, 1]) g.add(box(0.05, 0.16 * b, 0.19 * b, body, s * 0.16 * b, -0.03, 0.02)); // wide cheek armour
  return g;
};

const breacher: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.3 * b, 0.25 * b, 0.3 * b, body, 0, 0.02, 0)); // skull
  g.add(box(0.28 * b, 0.2 * b, 0.06, dark, 0, -0.02 * b, 0.16 * b)); // heavy faceplate
  for (const s of [-1, 1]) gl(box(0.05 * b, 0.04 * b, 0.03, glow, s * 0.08 * b, 0.02 * b, 0.18 * b)); // breaching eye lights
  gl(cylZ(0.025 * b, 0.06, glow, 0.14 * b, 0.08 * b, 0.13 * b, 8)); // breaching lamp
  g.add(box(0.3 * b, 0.06, 0.08, dark, 0, 0.09 * b, 0.13 * b)); // brow bar
  return g;
};

const warhound: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.3 * b, 0.24 * b, 0.3 * b, body, 0, 0.02, 0)); // skull
  for (let i = 0; i < 3; i++) g.add(box(0.03, 0.1 * b, 0.06, dark, (i - 1) * 0.08 * b, 0.13 * b, 0.12 * b)); // forehead ridges
  for (const s of [-1, 1]) { const v = gl(box(0.09 * b, 0.06 * b, 0.03, glow, s * 0.07 * b, 0, 0.16 * b)); v.rotation.z = s * 0.2; } // split visor
  g.add(box(0.24 * b, 0.12 * b, 0.15 * b, body, 0, -0.12 * b, 0.13 * b)); // aggressive jaw
  return g;
};

export const VANGUARD_HELMETS: ArmorProduct[] = [
  { id: 'bulldog', name: 'Bulldog', noun: 'Helm', build: bulldog },
  { id: 'breacher', name: 'Breacher', noun: 'Helm', build: breacher },
  { id: 'warhound', name: 'Warhound', noun: 'Helm', build: warhound },
];
