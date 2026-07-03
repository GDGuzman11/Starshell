/**
 * VANGUARD TORSO PRODUCTS — chests, pauldrons, combat harness. Wide, heavy, forward,
 * riveted, breaching. Primitives only.
 */
import * as THREE from 'three';
import type { RenderTier } from '../../materials';
import { box } from '../../models/parts';
import { kit } from './kit';
import type { ArmorModelSpec } from '../parts';
import type { ArmorProduct } from '../products';

type B = (spec: ArmorModelSpec, rt: RenderTier) => THREE.Group;

// ── CHESTS ────────────────────────────────────────────────────────────────────
const juggernaut: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.5 * b, 0.4 * b, 0.09, body, 0, 0, 0.03)); // wide backing slab
  for (const s of [-1, 1]) { const pec = box(0.24 * b, 0.22 * b, 0.07, body, s * 0.13 * b, 0.07 * b, 0.07); pec.rotation.y = -s * 0.25; g.add(pec); } // angled pecs
  g.add(box(0.11 * b, 0.36 * b, 0.09, dark, 0, 0, 0.1)); // heavy sternum guard
  gl(box(0.07 * b, 0.07 * b, 0.03, glow, 0, 0.05 * b, 0.12)); // core light
  return g;
};
const siege: B = (spec, rt) => {
  const { g, b, body, dark } = kit(spec, rt);
  g.add(box(0.48 * b, 0.4 * b, 0.1, body, 0, 0, 0.03)); // slab
  for (let i = 0; i < 3; i++) g.add(box(0.46 * b, 0.06 * b, 0.05, dark, 0, 0.13 * b - i * 0.13 * b, 0.08)); // riveted bands
  for (let k = 0; k < 4; k++) g.add(box(0.03, 0.03, 0.03, dark, -0.18 * b + k * 0.12 * b, 0.16 * b, 0.09)); // rivets
  return g;
};
const rampart: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.46 * b, 0.42 * b, 0.11, body, 0, 0, 0.03)); // tall heavy plate
  g.add(box(0.16 * b, 0.42 * b, 0.06, dark, 0, 0, 0.1)); // central spine guard
  for (const s of [-1, 1]) g.add(box(0.06 * b, 0.3 * b, 0.05, dark, s * 0.19 * b, 0, 0.07)); // shoulder-to-hip straps
  gl(box(0.1 * b, 0.03, 0.03, glow, 0, 0.1 * b, 0.12)); // status
  return g;
};

// ── PAULDRONS (both shoulders) ────────────────────────────────────────────────
const storm: B = (spec, rt) => {
  const { g, b, body, dark } = kit(spec, rt);
  for (const s of [-1, 1]) {
    const x = s * 0.33;
    for (let i = 0; i < 3; i++) { const p = box((0.3 - i * 0.04) * b, 0.12 * b, (0.36 - i * 0.03) * b, i % 2 ? dark : body, x + s * i * 0.05 * b, 0.06 * b - i * 0.09 * b, 0); p.rotation.z = -s * 0.15; g.add(p); } // fanned plates
  }
  return g;
};
const anvil: B = (spec, rt) => {
  const { g, b, body, dark } = kit(spec, rt);
  for (const s of [-1, 1]) {
    const x = s * 0.33;
    g.add(box(0.3 * b, 0.2 * b, 0.34 * b, body, x, 0, 0)); // blocky slab
    g.add(box(0.32 * b, 0.06, 0.32 * b, dark, x, 0.1 * b, 0)); // top plate
  }
  return g;
};
const crusher: B = (spec, rt) => {
  const { g, b, body, dark } = kit(spec, rt);
  for (const s of [-1, 1]) {
    const x = s * 0.33;
    g.add(box(0.28 * b, 0.16 * b, 0.32 * b, body, x, 0, 0));
    for (let i = 0; i < 3; i++) { const spike = box(0.04 * b, 0.05 * b, 0.16 * b, dark, x + s * (0.1 + i * 0.02) * b, 0.08 * b, (i - 1) * 0.1 * b); g.add(spike); } // shoulder spikes
  }
  return g;
};

// ── COMBAT HARNESS (plate) ────────────────────────────────────────────────────
const ammoRig: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.34 * b, 0.1 * b, 0.06, dark, 0, 0.02 * b, 0.04)); // chest bandolier
  for (let i = 0; i < 4; i++) g.add(box(0.05 * b, 0.08 * b, 0.05, body, -0.13 * b + i * 0.09 * b, 0.02 * b, 0.06)); // mag cells
  gl(box(0.28 * b, 0.02, 0.05, glow, 0, -0.05 * b, 0.06)); // rail light
  return g;
};
const breaching: B = (spec, rt) => {
  const { g, b, body, dark } = kit(spec, rt);
  for (const s of [-1, 1]) { const hook = box(0.04 * b, 0.16 * b, 0.05, dark, s * 0.12 * b, 0, 0.06); hook.rotation.z = s * 0.3; g.add(hook); } // breaching hooks
  g.add(box(0.1 * b, 0.1 * b, 0.06, body, 0, -0.02 * b, 0.06)); // charge module
  g.add(box(0.3 * b, 0.05 * b, 0.05, dark, 0, 0.08 * b, 0.05)); // upper strap
  return g;
};
const combatHarness: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  for (const s of [-1, 1]) { const strap = box(0.04 * b, 0.34 * b, 0.04, dark, s * 0.07 * b, 0, 0.04); strap.rotation.z = s * 0.28; g.add(strap); } // crossing straps
  g.add(box(0.1 * b, 0.09 * b, 0.05, body, 0, -0.02 * b, 0.06)); // buckle
  for (const s of [-1, 1]) g.add(box(0.07 * b, 0.09 * b, 0.05, dark, s * 0.12 * b, -0.1 * b, 0.05)); // side pouches
  gl(box(0.04 * b, 0.03, 0.04, glow, 0, -0.02 * b, 0.08)); // buckle light
  return g;
};

export const VANGUARD_CHESTS: ArmorProduct[] = [
  { id: 'juggernaut', name: 'Juggernaut', noun: 'Cuirass', build: juggernaut },
  { id: 'siege', name: 'Siege', noun: 'Plate', build: siege },
  { id: 'rampart', name: 'Rampart', noun: 'Plate', build: rampart },
];
export const VANGUARD_PAULDRONS: ArmorProduct[] = [
  { id: 'storm', name: 'Storm', noun: 'Pauldrons', build: storm },
  { id: 'anvil', name: 'Anvil', noun: 'Pauldrons', build: anvil },
  { id: 'crusher', name: 'Crusher', noun: 'Pauldrons', build: crusher },
];
export const VANGUARD_HARNESS: ArmorProduct[] = [
  { id: 'ammorig', name: 'Ammo Rig', noun: 'Harness', build: ammoRig },
  { id: 'breachingrig', name: 'Breaching', noun: 'Harness', build: breaching },
  { id: 'combatharness', name: 'Combat', noun: 'Harness', build: combatHarness },
];
