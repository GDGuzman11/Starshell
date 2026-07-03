/**
 * WARDEN HELMET PRODUCTS — Walking Fortress: massive, square, blast-shielded, reactor-crowned.
 * Tank-like silhouettes. Primitives only.
 */
import * as THREE from 'three';
import type { RenderTier } from '../../materials';
import { box, cylY } from '../../models/parts';
import { kit } from './kit';
import type { ArmorModelSpec } from '../parts';
import type { ArmorProduct } from '../products';

type B = (spec: ArmorModelSpec, rt: RenderTier) => THREE.Group;

const fortress: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.35 * b, 0.3 * b, 0.34 * b, body, 0, 0.03, 0)); // huge cube skull
  g.add(box(0.35 * b, 0.1 * b, 0.05, dark, 0, -0.02 * b, 0.16 * b)); // thick blast-shield visor
  gl(box(0.24 * b, 0.02, 0.02, glow, 0, -0.01 * b, 0.185 * b)); // shield slit
  for (const s of [-1, 1]) gl(box(0.05, 0.11 * b, 0.11 * b, glow, s * 0.19 * b, 0.04, -0.02)); // twin reactor vents
  g.add(cylY(0.21 * b, 0.06, dark, 0, -0.16 * b, 0)); // thick neck ring
  return g;
};

const castle: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.34 * b, 0.3 * b, 0.34 * b, body, 0, 0.03, 0)); // cube skull
  const n = 4;
  for (let i = 0; i < n; i++) g.add(box(0.05 * b, 0.1 * b, 0.16 * b, dark, (i - (n - 1) / 2) * 0.08 * b, 0.18 * b, 0)); // crenellated crown
  g.add(box(0.36 * b, 0.12 * b, 0.05, dark, 0, -0.03 * b, 0.16 * b)); // heavy face slab
  gl(box(0.26 * b, 0.02, 0.02, glow, 0, -0.02 * b, 0.185 * b)); // vision slit
  return g;
};

const bastion: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl, moving } = kit(spec, rt);
  g.add(box(0.35 * b, 0.31 * b, 0.33 * b, body, 0, 0.03, 0)); // skull
  g.add(box(0.2 * b, 0.12 * b, 0.2 * b, dark, 0, 0.2 * b, 0)); // reactor housing crown
  moving(cylY(0.06 * b, 0.06, glow, 0, 0.28 * b, 0)); // reactor core
  g.add(box(0.36 * b, 0.1 * b, 0.05, dark, 0, -0.02 * b, 0.16 * b)); // blast shield
  gl(box(0.24 * b, 0.02, 0.02, glow, 0, -0.01 * b, 0.185 * b));
  return g;
};

export const WARDEN_HELMETS: ArmorProduct[] = [
  { id: 'fortress', name: 'Fortress', noun: 'Helm', build: fortress },
  { id: 'castle', name: 'Castle', noun: 'Helm', build: castle },
  { id: 'bastion', name: 'Bastion', noun: 'Helm', build: bastion },
];
