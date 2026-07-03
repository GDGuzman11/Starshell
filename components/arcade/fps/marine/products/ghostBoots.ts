/**
 * GHOST BOOT PRODUCTS — slim, fast recon boots. Feet (paired). Distinct silhouettes.
 * Primitives only.
 */
import * as THREE from 'three';
import type { RenderTier } from '../../materials';
import { box, cylZ } from '../../models/parts';
import { kit } from './kit';
import type { ArmorModelSpec } from '../parts';
import type { ArmorProduct } from '../products';

type B = (spec: ArmorModelSpec, rt: RenderTier) => THREE.Group;

const sprint: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.16 * b, 0.12 * b, 0.24 * b, body, 0, 0, 0.02)); // slim boot
  g.add(box(0.17 * b, 0.04, 0.32 * b, dark, 0, -0.05 * b, 0.06)); // low sole
  const blade = box(0.1 * b, 0.1 * b, 0.03, dark, 0, -0.08 * b, -0.1); blade.rotation.x = 0.5; g.add(blade); // heel spring blade
  gl(box(0.02, 0.02, 0.18 * b, glow, 0.08 * b, 0, 0.02)); // side light strip
  return g;
};

const grip: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.16 * b, 0.13 * b, 0.24 * b, body, 0, 0, 0.02));
  g.add(box(0.16 * b, 0.05, 0.12 * b, dark, 0, -0.02 * b, 0.16)); // toe grip plate
  g.add(box(0.14 * b, 0.1 * b, 0.04, dark, 0, 0.05 * b, -0.1)); // ankle brace
  gl(box(0.1 * b, 0.02, 0.02, glow, 0, 0.05 * b, 0.14)); // toe light
  return g;
};

const silent: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.15 * b, 0.1 * b, 0.26 * b, body, 0, -0.01 * b, 0.02)); // low-profile boot
  g.add(box(0.16 * b, 0.06, 0.3 * b, dark, 0, -0.06 * b, 0.05)); // padded sole
  gl(box(0.02, 0.02, 0.14 * b, glow, 0, -0.07 * b, 0.02)); // underglow
  return g;
};

const vault: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.16 * b, 0.13 * b, 0.24 * b, body, 0, 0, 0.02));
  g.add(box(0.16 * b, 0.04, 0.3 * b, dark, 0, -0.05 * b, 0.05)); // sole
  g.add(box(0.12 * b, 0.14 * b, 0.03, dark, 0, 0.03 * b, -0.11)); // calf fin
  gl(cylZ(0.05 * b, 0.04, glow, 0, -0.03 * b, -0.14, 10)); // rear jump-jet nozzle
  return g;
};

export const GHOST_BOOTS: ArmorProduct[] = [
  { id: 'sprint', name: 'Sprint', noun: 'Recon Boots', build: sprint },
  { id: 'grip', name: 'Grip', noun: 'Traction Boots', build: grip },
  { id: 'silent', name: 'Silent', noun: 'Stealth Boots', build: silent },
  { id: 'vault', name: 'Vault', noun: 'Jump Boots', build: vault },
];
