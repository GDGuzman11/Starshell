/**
 * PHANTOM TORSO PRODUCTS — long slim chests, small swept pauldrons, camouflage systems.
 * Elegant, sharp, precise. Primitives only.
 */
import * as THREE from 'three';
import type { RenderTier } from '../../materials';
import { box, coneZ } from '../../models/parts';
import { kit } from './kit';
import type { ArmorModelSpec } from '../parts';
import type { ArmorProduct } from '../products';

type B = (spec: ArmorModelSpec, rt: RenderTier) => THREE.Group;

// ── CHESTS ────────────────────────────────────────────────────────────────────
const marksman: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.28 * b, 0.46 * b, 0.05, body, 0, 0, 0.02)); // long slim plate
  const up = box(0.24 * b, 0.14 * b, 0.05, body, 0, 0.18 * b, 0.03); up.rotation.x = -0.2; g.add(up); // tapered upper
  const sash = box(0.42 * b, 0.07 * b, 0.04, dark, 0, 0, 0.06); sash.rotation.z = 0.5; g.add(sash); // diagonal bandolier
  gl(box(0.05 * b, 0.05 * b, 0.03, glow, 0, 0.1 * b, 0.06)); // status
  return g;
};
const sable: B = (spec, rt) => {
  const { g, b, body, dark } = kit(spec, rt);
  g.add(box(0.26 * b, 0.46 * b, 0.05, body, 0, 0, 0.02)); // clean long plate
  const up = box(0.2 * b, 0.16 * b, 0.05, body, 0, 0.19 * b, 0.04); up.rotation.x = -0.25; g.add(up); // tapered collar
  g.add(box(0.05 * b, 0.42 * b, 0.04, dark, 0, 0, 0.06)); // central seam
  return g;
};
const vectorChest: B = (spec, rt) => {
  const { g, b, body, glow, gl } = kit(spec, rt);
  g.add(box(0.3 * b, 0.44 * b, 0.05, body, 0, 0, 0.02));
  for (const s of [-1, 1]) { const facet = box(0.1 * b, 0.4 * b, 0.05, body, s * 0.09 * b, 0, 0.05); facet.rotation.y = -s * 0.3; g.add(facet); } // faceted angular panels
  gl(box(0.02, 0.3 * b, 0.04, glow, 0, 0, 0.08)); // centre line
  return g;
};

// ── PAULDRONS (both shoulders) — small, swept ─────────────────────────────────
const stability: B = (spec, rt) => {
  const { g, b, body } = kit(spec, rt);
  for (const s of [-1, 1]) {
    const x = s * 0.26;
    const cap = box(0.13 * b, 0.1 * b, 0.24 * b, body, x, 0, 0); cap.rotation.z = s * 0.25; g.add(cap); // swept cap
    const fin = coneZ(0.001, 0.03 * b, 0.18 * b, body, x, 0.04 * b, -0.06 * b); g.add(fin); // stabilizer fin
  }
  return g;
};
const swept: B = (spec, rt) => {
  const { g, b, body, dark } = kit(spec, rt);
  for (const s of [-1, 1]) {
    const x = s * 0.26;
    const cap = box(0.12 * b, 0.09 * b, 0.26 * b, body, x, 0, 0); cap.rotation.z = s * 0.35; g.add(cap); // sharply swept
    const blade = box(0.03, 0.03, 0.2 * b, dark, x + s * 0.06 * b, 0.05 * b, 0); g.add(blade); // edge blade
  }
  return g;
};
const recoil: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  for (const s of [-1, 1]) {
    const x = s * 0.26;
    g.add(box(0.14 * b, 0.11 * b, 0.22 * b, body, x, 0, 0)); // cap
    g.add(box(0.04 * b, 0.04 * b, 0.14 * b, dark, x, -0.03 * b, 0.08 * b)); // recoil dampener rod
    gl(box(0.02, 0.02, 0.02, glow, x, -0.03 * b, 0.15 * b)); // dampener light
  }
  return g;
};

// ── CAMOUFLAGE SYSTEMS (plate) ────────────────────────────────────────────────
const cloak: B = (spec, rt) => {
  const { g, b, body, dark } = kit(spec, rt);
  for (const s of [-1, 1]) { const panel = box(0.1 * b, 0.36 * b, 0.03, body, s * 0.08 * b, 0, 0.04); panel.rotation.y = -s * 0.2; g.add(panel); } // thin cloak panels
  g.add(box(0.06 * b, 0.36 * b, 0.03, dark, 0, 0, 0.04)); // spine
  return g;
};
const ghillie: B = (spec, rt) => {
  const { g, b, body, dark } = kit(spec, rt);
  g.add(box(0.24 * b, 0.06 * b, 0.03, dark, 0, 0.14 * b, 0.04)); // top rail
  for (let i = 0; i < 6; i++) { const strand = box(0.02, 0.24 * b, 0.02, body, -0.1 * b + i * 0.04 * b, -0.02 * b, 0.04); strand.rotation.z = (i - 3) * 0.06; g.add(strand); } // hanging strands
  return g;
};
const adaptive: B = (spec, rt) => {
  const { g, b, body, glow, gl } = kit(spec, rt);
  g.add(box(0.26 * b, 0.32 * b, 0.03, body, 0, 0, 0.03)); // adaptive skin
  for (let i = 0; i < 3; i++) gl(box(0.22 * b, 0.02, 0.03, glow, 0, 0.1 * b - i * 0.1 * b, 0.05)); // shimmer lines
  return g;
};

export const PHANTOM_CHESTS: ArmorProduct[] = [
  { id: 'marksman', name: 'Marksman', noun: 'Plate', build: marksman },
  { id: 'sable', name: 'Sable', noun: 'Plate', build: sable },
  { id: 'vectorchest', name: 'Vector', noun: 'Plate', build: vectorChest },
];
export const PHANTOM_PAULDRONS: ArmorProduct[] = [
  { id: 'stability', name: 'Stability', noun: 'Pauldrons', build: stability },
  { id: 'swept', name: 'Swept', noun: 'Pauldrons', build: swept },
  { id: 'recoil', name: 'Recoil', noun: 'Pauldrons', build: recoil },
];
export const PHANTOM_CAMO: ArmorProduct[] = [
  { id: 'cloak', name: 'Cloak', noun: 'System', build: cloak },
  { id: 'ghillie', name: 'Ghillie', noun: 'System', build: ghillie },
  { id: 'adaptive', name: 'Adaptive', noun: 'System', build: adaptive },
];
