/**
 * GHOST CHEST PRODUCTS — narrow, tall, technical plates in Ghost's design language.
 * Front-torso; each a distinct silhouette. Primitives only.
 */
import * as THREE from 'three';
import type { RenderTier } from '../../materials';
import { box, cylZ } from '../../models/parts';
import { kit } from './kit';
import type { ArmorModelSpec } from '../parts';
import type { ArmorProduct } from '../products';

type B = (spec: ArmorModelSpec, rt: RenderTier) => THREE.Group;

const ripline: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.3 * b, 0.44 * b, 0.05, body, 0, 0, 0.02)); // narrow tall plate
  for (let i = 0; i < 3; i++) g.add(box(0.03, 0.42 * b, 0.045, dark, (i - 1) * 0.09 * b, 0, 0.05)); // vertical ribs
  gl(box(0.09 * b, 0.11 * b, 0.05, glow, 0, 0.07 * b, 0.06)); // central sensor unit
  return g;
};

const lattice: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.28 * b, 0.44 * b, 0.045, body, 0, 0, 0.02));
  for (const s of [-1, 1]) { const bar = box(0.02, 0.5 * b, 0.05, dark, s * 0.06 * b, 0, 0.05); bar.rotation.z = s * 0.5; g.add(bar); } // diagonal lattice
  gl(box(0.22 * b, 0.03, 0.05, glow, 0, 0.02 * b, 0.06)); // wide data-strip
  gl(box(0.02, 0.28 * b, 0.05, glow, 0, -0.05 * b, 0.06)); // vertical trace
  return g;
};

const cutaway: B = (spec, rt) => {
  const { g, b, body, glow, gl } = kit(spec, rt);
  for (const s of [-1, 1]) g.add(box(0.09 * b, 0.44 * b, 0.05, body, s * 0.11 * b, 0, 0.02)); // side panels only
  g.add(box(0.24 * b, 0.05 * b, 0.05, body, 0, 0.2 * b, 0.02)); // top bridge
  g.add(box(0.24 * b, 0.05 * b, 0.05, body, 0, -0.2 * b, 0.02)); // bottom bridge
  gl(box(0.14 * b, 0.24 * b, 0.03, glow, 0, 0, 0.04)); // exposed-tech window
  return g;
};

const aperture: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl, moving } = kit(spec, rt);
  g.add(box(0.26 * b, 0.44 * b, 0.05, body, 0, 0, 0.02)); // slim frame plate
  g.add(cylZ(0.11 * b, 0.05, dark, 0, 0.03 * b, 0.04, 16)); // central optic housing
  moving(cylZ(0.08 * b, 0.03, glow, 0, 0.03 * b, 0.07, 8)); // iris optic
  for (let i = 0; i < 2; i++) gl(box(0.2 * b, 0.02, 0.05, glow, 0, -0.14 * b - i * 0.06 * b, 0.06)); // status bars
  return g;
};

export const GHOST_CHESTS: ArmorProduct[] = [
  { id: 'ripline', name: 'Ripline', noun: 'Recon Plate', build: ripline },
  { id: 'lattice', name: 'Lattice', noun: 'Weave Plate', build: lattice },
  { id: 'cutaway', name: 'Cutaway', noun: 'Vent Plate', build: cutaway },
  { id: 'aperture', name: 'Aperture', noun: 'Optic Plate', build: aperture },
];
