/**
 * LIFELINE SYSTEMS PRODUCTS — nano backpacks (backpack), and three core-family slots: drone
 * stations, nano injectors, support cores. Drones, nano canisters, medical crosses.
 * Primitives only.
 */
import * as THREE from 'three';
import type { RenderTier } from '../../materials';
import { box, cylY, cylZ } from '../../models/parts';
import { kit } from './kit';
import type { ArmorModelSpec } from '../parts';
import type { ArmorProduct } from '../products';

type B = (spec: ArmorModelSpec, rt: RenderTier) => THREE.Group;

// ── NANO BACKPACKS (backpack) ─────────────────────────────────────────────────
const nano: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.3 * b, 0.34 * b, 0.16 * b, body, 0, 0, -0.02)); // body
  for (const s of [-1, 1]) g.add(cylY(0.07 * b, 0.3 * b, dark, s * 0.14 * b, 0, -0.02)); // nano canisters
  gl(box(0.04 * b, 0.12 * b, 0.02, glow, 0, -0.06 * b, 0.06)); gl(box(0.12 * b, 0.04 * b, 0.02, glow, 0, -0.06 * b, 0.06)); // cross
  return g;
};
const dronePack: B = (spec, rt) => {
  const { g, b, body, dark, glow, moving } = kit(spec, rt);
  g.add(box(0.3 * b, 0.32 * b, 0.16 * b, body, 0, 0, -0.02));
  g.add(box(0.16 * b, 0.12 * b, 0.12 * b, dark, 0, 0.08 * b, -0.1)); // drone bay
  moving(cylZ(0.05 * b, 0.02, glow, 0, 0.08 * b, -0.17, 8)); // drone rotor
  return g;
};
const fieldPack: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.32 * b, 0.34 * b, 0.16 * b, body, 0, 0, -0.02));
  for (let i = 0; i < 4; i++) g.add(box(0.07 * b, 0.07 * b, 0.06, dark, (i % 2 - 0.5) * 0.16 * b, 0.08 * b - Math.floor(i / 2) * 0.16 * b, -0.1)); // supply modules
  gl(box(0.03 * b, 0.09 * b, 0.02, glow, 0, 0, 0.06)); gl(box(0.09 * b, 0.03 * b, 0.02, glow, 0, 0, 0.06)); // cross
  return g;
};

// ── DRONE STATIONS (core, back) ───────────────────────────────────────────────
const medbot: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl, moving } = kit(spec, rt);
  g.add(box(0.14 * b, 0.1 * b, 0.1 * b, dark, 0, 0, 0)); // dock
  g.add(box(0.09 * b, 0.06 * b, 0.09 * b, body, 0, -0.02 * b, 0.05)); // drone body
  moving(cylZ(0.06 * b, 0.015, glow, 0, 0.02 * b, 0.06, 8)); // rotor
  gl(box(0.02, 0.04, 0.02, glow, 0, -0.02 * b, 0.1)); gl(box(0.04, 0.02, 0.02, glow, 0, -0.02 * b, 0.1)); // med cross
  return g;
};
const sentry: B = (spec, rt) => {
  const { g, b, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.12 * b, 0.11 * b, 0.09, dark, 0, 0, 0));
  gl(cylZ(0.04 * b, 0.03, glow, 0, 0, 0.06, 12)); // scan eye
  for (const s of [-1, 1]) { const arm = box(0.02, 0.09 * b, 0.02, dark, s * 0.07 * b, 0, 0.02); arm.rotation.z = s * 0.4; g.add(arm); } // arms
  return g;
};
const repair: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.12 * b, 0.12 * b, 0.09, body, 0, 0, 0));
  for (const s of [-1, 1]) g.add(box(0.02, 0.02, 0.1, dark, s * 0.05 * b, 0, 0.06)); // repair prongs
  gl(box(0.03 * b, 0.03 * b, 0.02, glow, 0, 0, 0.09)); // tool light
  return g;
};

// ── NANO INJECTORS (core, front) ──────────────────────────────────────────────
const injector: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.12 * b, 0.12 * b, 0.08, dark, 0, 0, 0)); // housing
  g.add(cylZ(0.03 * b, 0.14, body, 0, 0, 0.1)); // injector barrel
  gl(cylZ(0.02 * b, 0.05, glow, 0, 0, 0.06, 8)); // vial glow
  return g;
};
const stim: B = (spec, rt) => {
  const { g, b, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.13 * b, 0.11 * b, 0.08, dark, 0, 0, 0));
  for (let i = 0; i < 3; i++) gl(cylY(0.02 * b, 0.09 * b, glow, (i - 1) * 0.04 * b, 0, 0.05)); // stim vials
  return g;
};
const nanoCore: B = (spec, rt) => {
  const { g, b, dark, glow, moving } = kit(spec, rt);
  g.add(box(0.12 * b, 0.12 * b, 0.08, dark, 0, 0, 0));
  moving(cylZ(0.05 * b, 0.03, glow, 0, 0, 0.06, 12)); // swirling nanite core
  return g;
};

// ── SUPPORT POWER CORES (core) ────────────────────────────────────────────────
const support: B = (spec, rt) => {
  const { g, b, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.16 * b, 0.16 * b, 0.08, dark, 0, 0, 0)); // housing
  gl(cylZ(0.06 * b, 0.05, glow, 0, 0, 0.05, 16)); // core
  gl(box(0.03 * b, 0.1 * b, 0.02, glow, 0, 0, 0.08)); gl(box(0.1 * b, 0.03 * b, 0.02, glow, 0, 0, 0.08)); // cross
  return g;
};
const restore: B = (spec, rt) => {
  const { g, b, dark, glow, moving } = kit(spec, rt);
  g.add(box(0.16 * b, 0.16 * b, 0.09, dark, 0, 0, 0));
  moving(cylZ(0.07 * b, 0.04, glow, 0, 0, 0.06, 12)); // restoring core
  return g;
};
const cell: B = (spec, rt) => {
  const { g, b, body, glow, gl } = kit(spec, rt);
  g.add(box(0.15 * b, 0.17 * b, 0.08, body, 0, 0, 0));
  for (let i = 0; i < 3; i++) gl(box(0.11 * b, 0.03, 0.04, glow, 0, 0.05 * b - i * 0.05 * b, 0.05)); // stacked cells
  return g;
};

export const LIFELINE_NANOPACK: ArmorProduct[] = [
  { id: 'nano', name: 'Nano', noun: 'Pack', build: nano },
  { id: 'dronepack', name: 'Drone', noun: 'Pack', build: dronePack },
  { id: 'fieldpack', name: 'Field', noun: 'Pack', build: fieldPack },
];
export const LIFELINE_DRONE: ArmorProduct[] = [
  { id: 'medbot', name: 'Medbot', noun: 'Drone', build: medbot },
  { id: 'sentry', name: 'Sentry', noun: 'Drone', build: sentry },
  { id: 'repair', name: 'Repair', noun: 'Drone', build: repair },
];
export const LIFELINE_INJECTOR: ArmorProduct[] = [
  { id: 'injector', name: 'Injector', noun: 'Nano', build: injector },
  { id: 'stim', name: 'Stim', noun: 'Nano', build: stim },
  { id: 'nanocore', name: 'Nanite', noun: 'Nano', build: nanoCore },
];
export const LIFELINE_CORE: ArmorProduct[] = [
  { id: 'support', name: 'Support', noun: 'Core', build: support },
  { id: 'restore', name: 'Restore', noun: 'Core', build: restore },
  { id: 'cell', name: 'Cell', noun: 'Core', build: cell },
];
