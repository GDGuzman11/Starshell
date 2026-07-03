/**
 * WARDEN SYSTEMS PRODUCTS — shield emitters + fortress power cores (core family), defensive
 * backpacks + reactor packs (backpack family). Huge reactors, shield generators, exhaust.
 * Primitives only.
 */
import * as THREE from 'three';
import type { RenderTier } from '../../materials';
import { box, cylY, cylZ } from '../../models/parts';
import { kit } from './kit';
import type { ArmorModelSpec } from '../parts';
import type { ArmorProduct } from '../products';

type B = (spec: ArmorModelSpec, rt: RenderTier) => THREE.Group;

// ── SHIELD EMITTERS (core, front) ─────────────────────────────────────────────
const emitter: B = (spec, rt) => {
  const { g, b, dark, glow, gl, moving } = kit(spec, rt);
  g.add(box(0.18 * b, 0.16 * b, 0.09, dark, 0, 0, 0)); // housing
  moving(cylZ(0.09 * b, 0.03, glow, 0, 0, 0.06, 16)); // rotating emitter ring
  gl(cylZ(0.04 * b, 0.04, glow, 0, 0, 0.09, 8)); // projector node
  return g;
};
const halo: B = (spec, rt) => {
  const { g, b, dark, glow, moving } = kit(spec, rt);
  g.add(box(0.16 * b, 0.16 * b, 0.08, dark, 0, 0, 0));
  moving(cylZ(0.12 * b, 0.02, glow, 0, 0, 0.05, 20)); // wide halo ring
  return g;
};
const aegisCore: B = (spec, rt) => {
  const { g, b, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.2 * b, 0.18 * b, 0.1, dark, 0, 0, 0)); // heavy housing
  gl(box(0.12 * b, 0.12 * b, 0.04, glow, 0, 0, 0.06)); // shield window
  for (const s of [-1, 1]) g.add(box(0.03, 0.16 * b, 0.06, dark, s * 0.1 * b, 0, 0.02)); // pylons
  return g;
};

// ── FORTRESS POWER CORES (core) ───────────────────────────────────────────────
const reactor: B = (spec, rt) => {
  const { g, b, dark, glow, moving } = kit(spec, rt);
  g.add(box(0.2 * b, 0.2 * b, 0.1, dark, 0, 0, 0)); // big housing
  moving(cylZ(0.07 * b, 0.05, glow, 0, 0, 0.06, 12)); // reactor core
  for (let i = 0; i < 3; i++) g.add(box(0.18 * b, 0.02, 0.04, dark, 0, 0.07 * b - i * 0.07 * b, 0.05)); // vents
  return g;
};
const fusion: B = (spec, rt) => {
  const { g, b, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.2 * b, 0.2 * b, 0.11, dark, 0, 0, 0));
  gl(cylZ(0.09 * b, 0.05, glow, 0, 0, 0.06, 16)); // fusion face
  for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2; g.add(box(0.03, 0.03, 0.06, dark, Math.cos(a) * 0.12 * b, Math.sin(a) * 0.12 * b, 0.04)); } // bolts
  return g;
};
const dynamo: B = (spec, rt) => {
  const { g, b, body, glow, gl } = kit(spec, rt);
  g.add(box(0.19 * b, 0.2 * b, 0.1, body, 0, 0, 0));
  for (let i = 0; i < 4; i++) gl(box(0.15 * b, 0.02, 0.04, glow, 0, 0.07 * b - i * 0.05 * b, 0.05)); // stacked cells
  return g;
};

// ── DEFENSIVE BACKPACKS (backpack) ────────────────────────────────────────────
const fortressPack: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.4 * b, 0.44 * b, 0.26 * b, body, 0, 0, -0.05)); // massive body
  g.add(box(0.2 * b, 0.2 * b, 0.06, dark, 0, 0.02 * b, -0.19)); // reactor housing
  gl(cylZ(0.08 * b, 0.05, glow, 0, 0.02 * b, -0.2, 12)); // core
  for (const s of [-1, 1]) g.add(box(0.06 * b, 0.4 * b, 0.06, dark, s * 0.19 * b, 0, -0.16)); // side columns
  return g;
};
const bulwarkPack: B = (spec, rt) => {
  const { g, b, body, dark } = kit(spec, rt);
  g.add(box(0.42 * b, 0.44 * b, 0.24 * b, body, 0, 0, -0.05));
  for (let i = 0; i < 4; i++) g.add(box(0.4 * b, 0.04, 0.24 * b, dark, 0, 0.16 * b - i * 0.1 * b, -0.05)); // layered plates
  return g;
};
const redoubtPack: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.38 * b, 0.42 * b, 0.24 * b, body, 0, 0, -0.05));
  for (const s of [-1, 1]) g.add(cylY(0.05 * b, 0.4 * b, dark, s * 0.16 * b, 0, -0.06)); // exhaust stacks
  gl(box(0.24 * b, 0.03, 0.03, glow, 0, 0.12 * b, 0.06)); // status
  return g;
};

// ── REACTOR PACKS (backpack, lower) ───────────────────────────────────────────
const reactorPack: B = (spec, rt) => {
  const { g, b, body, dark, glow, moving } = kit(spec, rt);
  g.add(box(0.34 * b, 0.34 * b, 0.22 * b, body, 0, 0, -0.04)); // reactor body
  g.add(box(0.24 * b, 0.24 * b, 0.06, dark, 0, 0, -0.15)); // reactor housing
  moving(cylZ(0.1 * b, 0.05, glow, 0, 0, -0.16, 12)); // rotating reactor
  return g;
};
const exhaust: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.32 * b, 0.32 * b, 0.2 * b, body, 0, 0, -0.04));
  for (const s of [-1, 1]) { g.add(cylY(0.06 * b, 0.42 * b, dark, s * 0.13 * b, 0.02 * b, -0.02)); gl(cylY(0.04 * b, 0.04, glow, s * 0.13 * b, 0.24 * b, -0.02)); } // exhaust stacks + glow
  return g;
};
const coolant: B = (spec, rt) => {
  const { g, b, body, glow, gl } = kit(spec, rt);
  g.add(box(0.34 * b, 0.32 * b, 0.2 * b, body, 0, 0, -0.04));
  for (let i = 0; i < 4; i++) gl(box(0.3 * b, 0.02, 0.03, glow, 0, 0.12 * b - i * 0.08 * b, 0.05)); // coolant lines
  return g;
};

export const WARDEN_EMITTER: ArmorProduct[] = [
  { id: 'emitter', name: 'Emitter', noun: 'Shield', build: emitter },
  { id: 'halo', name: 'Halo', noun: 'Shield', build: halo },
  { id: 'aegiscore', name: 'Aegis', noun: 'Shield', build: aegisCore },
];
export const WARDEN_CORE: ArmorProduct[] = [
  { id: 'reactor', name: 'Reactor', noun: 'Core', build: reactor },
  { id: 'fusion', name: 'Fusion', noun: 'Core', build: fusion },
  { id: 'dynamo', name: 'Dynamo', noun: 'Core', build: dynamo },
];
export const WARDEN_BACKPACK: ArmorProduct[] = [
  { id: 'fortresspack', name: 'Fortress', noun: 'Pack', build: fortressPack },
  { id: 'bulwarkpack', name: 'Bulwark', noun: 'Pack', build: bulwarkPack },
  { id: 'redoubtpack', name: 'Redoubt', noun: 'Pack', build: redoubtPack },
];
export const WARDEN_REACTOR: ArmorProduct[] = [
  { id: 'reactorpack', name: 'Reactor', noun: 'Reactor', build: reactorPack },
  { id: 'exhaust', name: 'Exhaust', noun: 'Reactor', build: exhaust },
  { id: 'coolant', name: 'Coolant', noun: 'Reactor', build: coolant },
];
