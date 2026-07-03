/**
 * GHOST HARNESS PRODUCTS — the `plate` family for Ghost's Utility Harness. Light, strappy,
 * techy rigs (NOT a slab). Mid-torso. Distinct silhouettes. Primitives only.
 */
import * as THREE from 'three';
import type { RenderTier } from '../../materials';
import { box } from '../../models/parts';
import { kit } from './kit';
import type { ArmorModelSpec } from '../parts';
import type { ArmorProduct } from '../products';

type B = (spec: ArmorModelSpec, rt: RenderTier) => THREE.Group;

const utility: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  for (const s of [-1, 1]) { const strap = box(0.03 * b, 0.34 * b, 0.03, dark, s * 0.06 * b, 0, 0.04); strap.rotation.z = s * 0.28; g.add(strap); } // crossing chest straps
  g.add(box(0.08 * b, 0.08 * b, 0.04, body, 0, -0.02 * b, 0.05)); // buckle module
  gl(box(0.04 * b, 0.02, 0.04, glow, 0, -0.02 * b, 0.07)); // buckle light
  for (const s of [-1, 1]) g.add(box(0.06 * b, 0.08 * b, 0.05, dark, s * 0.1 * b, -0.1 * b, 0.04)); // side pouches
  return g;
};

const rig: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.05 * b, 0.34 * b, 0.04, dark, 0, 0, 0.04)); // vertical spine strap
  gl(box(0.02, 0.28 * b, 0.04, glow, 0, 0, 0.06)); // data line
  for (const s of [-1, 1]) g.add(box(0.07 * b, 0.1 * b, 0.05, body, s * 0.11 * b, 0, 0.04)); // side pouches
  return g;
};

const carrier: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.3 * b, 0.07 * b, 0.05, dark, 0, -0.02 * b, 0.04)); // horizontal belt
  for (let i = 0; i < 3; i++) g.add(box(0.05 * b, 0.09 * b, 0.05, body, (i - 1) * 0.09 * b, -0.06 * b, 0.05)); // mag pouches
  gl(box(0.26 * b, 0.015, 0.05, glow, 0, 0.0, 0.06)); // belt light
  return g;
};

const sling: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  const strap = box(0.04 * b, 0.44 * b, 0.04, dark, 0, 0, 0.04); strap.rotation.z = 0.5; g.add(strap); // diagonal sling
  g.add(box(0.12 * b, 0.06 * b, 0.05, body, -0.1 * b, 0.14 * b, 0.04)); // shoulder pad
  gl(box(0.02, 0.2 * b, 0.04, glow, 0.02 * b, -0.02 * b, 0.06)); // sling light
  return g;
};

export const GHOST_HARNESS: ArmorProduct[] = [
  { id: 'utility', name: 'Utility', noun: 'Harness', build: utility },
  { id: 'rig', name: 'Rig', noun: 'Harness', build: rig },
  { id: 'carrier', name: 'Carrier', noun: 'Harness', build: carrier },
  { id: 'sling', name: 'Sling', noun: 'Harness', build: sling },
];
