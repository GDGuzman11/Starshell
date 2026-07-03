/**
 * GHOST CORE-FAMILY PRODUCTS — two distinct slot lines that share the `core` family but
 * are separate slots: DRONE modules (back-mounted) and POWER CORES (front-torso). Slim,
 * technical. Primitives only.
 */
import * as THREE from 'three';
import type { RenderTier } from '../../materials';
import { box, cylY, cylZ } from '../../models/parts';
import { kit } from './kit';
import type { ArmorModelSpec } from '../parts';
import type { ArmorProduct } from '../products';

type B = (spec: ArmorModelSpec, rt: RenderTier) => THREE.Group;

// ── DRONE modules ─────────────────────────────────────────────────────────────
const hoverdrone: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl, moving } = kit(spec, rt);
  g.add(box(0.12 * b, 0.08 * b, 0.1 * b, dark, 0, 0, 0)); // dock
  g.add(box(0.09 * b, 0.05 * b, 0.09 * b, body, 0, -0.02 * b, 0.05)); // drone body
  moving(cylZ(0.06 * b, 0.015, glow, 0, 0.02 * b, 0.06, 8)); // rotor
  gl(box(0.03, 0.02, 0.02, glow, 0, -0.02 * b, 0.1)); // eye
  return g;
};
const sentry: B = (spec, rt) => {
  const { g, b, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.11 * b, 0.11 * b, 0.09, dark, 0, 0, 0));
  gl(cylZ(0.04 * b, 0.03, glow, 0, 0, 0.06, 12)); // sensor eye
  for (const s of [-1, 1]) { const arm = box(0.02, 0.1 * b, 0.02, dark, s * 0.07 * b, 0, 0.02); arm.rotation.z = s * 0.4; g.add(arm); } // fold arms
  return g;
};
const relay: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.1 * b, 0.12 * b, 0.08, body, 0, 0, 0));
  g.add(cylY(0.01, 0.16 * b, dark, 0, 0.12 * b, 0)); // antenna
  gl(box(0.02, 0.02, 0.02, glow, 0, 0.21 * b, 0)); // tip
  gl(box(0.06 * b, 0.02, 0.03, glow, 0, -0.04 * b, 0.05)); // data light
  return g;
};

// ── POWER CORES ───────────────────────────────────────────────────────────────
const cell: B = (spec, rt) => {
  const { g, b, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.1 * b, 0.16 * b, 0.07, dark, 0, 0, 0)); // slim housing
  gl(box(0.05 * b, 0.11 * b, 0.04, glow, 0, 0, 0.04)); // vertical core strip
  g.add(cylY(0.008, 0.12 * b, dark, 0.05 * b, 0.12 * b, 0)); // antenna
  return g;
};
const flux: B = (spec, rt) => {
  const { g, b, dark, glow, gl, moving } = kit(spec, rt);
  g.add(box(0.12 * b, 0.14 * b, 0.07, dark, 0, 0, 0));
  moving(cylZ(0.05 * b, 0.03, glow, 0, 0, 0.05, 10)); // rotating core ring
  gl(box(0.02, 0.1 * b, 0.03, glow, 0.05 * b, 0, 0.04)); // side trace
  return g;
};
const capacitor: B = (spec, rt) => {
  const { g, b, body, glow, gl } = kit(spec, rt);
  g.add(box(0.11 * b, 0.16 * b, 0.07, body, 0, 0, 0));
  for (let i = 0; i < 3; i++) gl(box(0.07 * b, 0.03, 0.04, glow, 0, 0.05 * b - i * 0.05 * b, 0.04)); // stacked cells
  return g;
};

export const GHOST_DRONE: ArmorProduct[] = [
  { id: 'hoverdrone', name: 'Hoverdrone', noun: 'Drone', build: hoverdrone },
  { id: 'sentry', name: 'Sentry', noun: 'Drone', build: sentry },
  { id: 'relay', name: 'Relay', noun: 'Drone', build: relay },
];
export const GHOST_CORE: ArmorProduct[] = [
  { id: 'cell', name: 'Cell', noun: 'Power Core', build: cell },
  { id: 'flux', name: 'Flux', noun: 'Power Core', build: flux },
  { id: 'capacitor', name: 'Capacitor', noun: 'Power Core', build: capacitor },
];
