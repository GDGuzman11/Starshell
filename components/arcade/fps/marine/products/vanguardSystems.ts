/**
 * VANGUARD SYSTEMS PRODUCTS — ammo packs + heavy backpacks (backpack family) and breaching
 * modules + power cores (core family). Heavy, industrial, breaching. Primitives only.
 */
import * as THREE from 'three';
import type { RenderTier } from '../../materials';
import { box, cylY, cylZ } from '../../models/parts';
import { kit } from './kit';
import type { ArmorModelSpec } from '../parts';
import type { ArmorProduct } from '../products';

type B = (spec: ArmorModelSpec, rt: RenderTier) => THREE.Group;

// ── AMMO PACKS (backpack) ─────────────────────────────────────────────────────
const drum: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.28 * b, 0.34 * b, 0.16 * b, body, 0, 0, -0.02)); // body
  for (const s of [-1, 1]) g.add(cylY(0.07 * b, 0.34 * b, dark, s * 0.18 * b, 0, 0)); // ammo drums
  gl(box(0.2 * b, 0.03, 0.03, glow, 0, 0.1 * b, 0.06)); // feed light
  return g;
};
const belt: B = (spec, rt) => {
  const { g, b, body, dark } = kit(spec, rt);
  g.add(box(0.3 * b, 0.32 * b, 0.15 * b, body, 0, 0, -0.02));
  for (let i = 0; i < 5; i++) g.add(box(0.05 * b, 0.05 * b, 0.05, dark, -0.14 * b + i * 0.07 * b, -0.12 * b, 0.06)); // belt links
  return g;
};
const cellPack: B = (spec, rt) => {
  const { g, b, body, glow, gl } = kit(spec, rt);
  g.add(box(0.3 * b, 0.36 * b, 0.16 * b, body, 0, 0, -0.02));
  for (let i = 0; i < 4; i++) gl(box(0.06 * b, 0.06 * b, 0.03, glow, -0.1 * b + (i % 2) * 0.2 * b, 0.08 * b - Math.floor(i / 2) * 0.16 * b, 0.06)); // charge cells
  return g;
};

// ── HEAVY BACKPACKS (backpack) ────────────────────────────────────────────────
const bulwark: B = (spec, rt) => {
  const { g, b, body, dark } = kit(spec, rt);
  g.add(box(0.34 * b, 0.4 * b, 0.2 * b, body, 0, 0, -0.03)); // heavy body
  g.add(box(0.3 * b, 0.08 * b, 0.18 * b, dark, 0, 0.16 * b, -0.03)); // top lid
  for (let k = 0; k < 3; k++) g.add(box(0.03, 0.03, 0.03, dark, -0.08 * b + k * 0.08 * b, 0.14 * b, 0.08)); // studs
  return g;
};
const assault: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.34 * b, 0.38 * b, 0.2 * b, body, 0, 0, -0.03));
  for (let i = 0; i < 3; i++) g.add(box(0.09 * b, 0.1 * b, 0.06, dark, (i - 1) * 0.1 * b, -0.1 * b, -0.12)); // pouches
  gl(box(0.22 * b, 0.03, 0.03, glow, 0, 0.09 * b, 0.06)); // rig light
  return g;
};
const titan: B = (spec, rt) => {
  const { g, b, body, dark } = kit(spec, rt);
  g.add(box(0.36 * b, 0.42 * b, 0.22 * b, body, 0, 0, -0.04)); // huge body
  for (const s of [-1, 1]) g.add(box(0.06 * b, 0.42 * b, 0.06, dark, s * 0.16 * b, 0, -0.16)); // side rails
  g.add(box(0.16 * b, 0.14 * b, 0.1 * b, dark, 0, -0.16 * b, -0.16)); // breaching charge
  return g;
};

// ── BREACHING MODULES (core, front-mounted) ───────────────────────────────────
const ram: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.14 * b, 0.14 * b, 0.08, dark, 0, 0, 0)); // mount
  g.add(box(0.1 * b, 0.1 * b, 0.16, body, 0, 0, 0.1)); // ram head (forward)
  gl(box(0.05 * b, 0.05 * b, 0.03, glow, 0, 0, 0.18)); // impact light
  return g;
};
const hooks: B = (spec, rt) => {
  const { g, b, body, dark } = kit(spec, rt);
  g.add(box(0.14 * b, 0.12 * b, 0.07, body, 0, 0, 0)); // mount
  for (const s of [-1, 1]) { const hook = box(0.03 * b, 0.16 * b, 0.05, dark, s * 0.07 * b, 0, 0.08); hook.rotation.z = s * 0.4; g.add(hook); } // grapple hooks
  return g;
};
const charge: B = (spec, rt) => {
  const { g, b, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.14 * b, 0.14 * b, 0.1, dark, 0, 0, 0)); // charge housing
  gl(cylZ(0.05 * b, 0.04, glow, 0, 0, 0.06, 12)); // primed charge
  return g;
};

// ── POWER CORES (core) ────────────────────────────────────────────────────────
const reactor: B = (spec, rt) => {
  const { g, b, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.18 * b, 0.16 * b, 0.09, dark, 0, 0, 0)); // housing
  gl(box(0.1 * b, 0.1 * b, 0.05, glow, 0, 0, 0.05)); // core face
  for (const s of [-1, 1]) g.add(box(0.03, 0.14 * b, 0.06, dark, s * 0.1 * b, 0, 0.02)); // side rails
  return g;
};
const piston: B = (spec, rt) => {
  const { g, b, dark, glow, moving } = kit(spec, rt);
  g.add(box(0.17 * b, 0.16 * b, 0.09, dark, 0, 0, 0));
  moving(cylZ(0.06 * b, 0.05, glow, 0, 0, 0.06, 10)); // pumping core
  for (const s of [-1, 1]) g.add(cylY(0.02, 0.14 * b, dark, s * 0.09 * b, 0, 0.03)); // pistons
  return g;
};
const dynamo: B = (spec, rt) => {
  const { g, b, body, glow, gl } = kit(spec, rt);
  g.add(box(0.17 * b, 0.17 * b, 0.09, body, 0, 0, 0));
  for (let i = 0; i < 3; i++) gl(box(0.13 * b, 0.03, 0.04, glow, 0, 0.06 * b - i * 0.06 * b, 0.05)); // stacked cells
  return g;
};

export const VANGUARD_AMMO: ArmorProduct[] = [
  { id: 'drum', name: 'Drum', noun: 'Ammo Pack', build: drum },
  { id: 'belt', name: 'Belt', noun: 'Ammo Pack', build: belt },
  { id: 'cellpack', name: 'Cell', noun: 'Ammo Pack', build: cellPack },
];
export const VANGUARD_BACKPACK: ArmorProduct[] = [
  { id: 'bulwark', name: 'Bulwark', noun: 'Pack', build: bulwark },
  { id: 'assault', name: 'Assault', noun: 'Pack', build: assault },
  { id: 'titan', name: 'Titan', noun: 'Pack', build: titan },
];
export const VANGUARD_BREACH: ArmorProduct[] = [
  { id: 'ram', name: 'Ram', noun: 'Breacher', build: ram },
  { id: 'hooks', name: 'Hooks', noun: 'Breacher', build: hooks },
  { id: 'charge', name: 'Charge', noun: 'Breacher', build: charge },
];
export const VANGUARD_CORE: ArmorProduct[] = [
  { id: 'reactor', name: 'Reactor', noun: 'Core', build: reactor },
  { id: 'piston', name: 'Piston', noun: 'Core', build: piston },
  { id: 'dynamo', name: 'Dynamo', noun: 'Core', build: dynamo },
];
