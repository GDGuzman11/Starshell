/**
 * OUTRIDER TORSO PRODUCTS — Standard-Issue chests, plates (neck/back/belt/hip), pauldrons,
 * backpacks, power cores. Clean, balanced military hardware. Primitives only.
 */
import * as THREE from 'three';
import type { RenderTier } from '../../materials';
import { box, cylY, cylZ } from '../../models/parts';
import { kit } from './kit';
import type { ArmorModelSpec } from '../parts';
import type { ArmorProduct } from '../products';

type B = (spec: ArmorModelSpec, rt: RenderTier) => THREE.Group;

// ── CHESTS ────────────────────────────────────────────────────────────────────
const trooper: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.4 * b, 0.38 * b, 0.06, body, 0, 0, 0.02)); // main plate
  g.add(box(0.06 * b, 0.34 * b, 0.04, dark, 0, 0, 0.06)); // sternum ridge
  g.add(box(0.3 * b, 0.06, 0.05, dark, 0, 0.19 * b, 0.04)); // collar
  gl(box(0.08 * b, 0.06 * b, 0.03, glow, 0, 0.02, 0.07)); // core light
  return g;
};
const carrier: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.38 * b, 0.38 * b, 0.06, body, 0, 0, 0.02));
  for (const s of [-1, 1]) g.add(box(0.09 * b, 0.1 * b, 0.05, dark, s * 0.12 * b, -0.08 * b, 0.05)); // mag pouches
  g.add(box(0.26 * b, 0.06 * b, 0.04, dark, 0, 0.1 * b, 0.05)); // chest rig strap
  gl(box(0.05 * b, 0.05 * b, 0.03, glow, 0, 0.1 * b, 0.07)); // buckle light
  return g;
};
const aegis: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.42 * b, 0.4 * b, 0.08, body, 0, 0, 0.03)); // heavy slab
  for (let i = 0; i < 3; i++) g.add(box(0.4 * b, 0.05 * b, 0.05, dark, 0, 0.13 * b - i * 0.13 * b, 0.06)); // layered bands
  gl(box(0.1 * b, 0.1 * b, 0.03, glow, 0, 0, 0.08)); // reinforced core
  return g;
};

// ── PLATES (neck / back / belt / hip) ─────────────────────────────────────────
const guardPlate: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.32 * b, 0.24 * b, 0.05, body, 0, 0, 0.02)); // plate
  g.add(box(0.28 * b, 0.04, 0.04, dark, 0, 0.08 * b, 0.04)); // rib
  gl(box(0.16 * b, 0.02, 0.04, glow, 0, -0.06 * b, 0.05)); // status line
  return g;
};
const panelPlate: B = (spec, rt) => {
  const { g, b, body, dark } = kit(spec, rt);
  g.add(box(0.3 * b, 0.24 * b, 0.05, body, 0, 0, 0.02));
  for (let i = 0; i < 3; i++) g.add(box(0.06 * b, 0.22 * b, 0.04, dark, (i - 1) * 0.09 * b, 0, 0.04)); // vertical panels
  return g;
};
const bracePlate: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.3 * b, 0.22 * b, 0.05, body, 0, 0, 0.02));
  for (const s of [-1, 1]) { const bar = box(0.03, 0.3 * b, 0.05, dark, 0, 0, 0.04); bar.rotation.z = s * 0.6; g.add(bar); } // X-brace
  gl(box(0.05 * b, 0.05 * b, 0.03, glow, 0, 0, 0.06)); // centre node
  return g;
};

// ── PAULDRONS (both shoulders) ────────────────────────────────────────────────
const stdPauldron: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  for (const s of [-1, 1]) {
    const x = s * 0.3;
    g.add(box(0.2 * b, 0.16 * b, 0.28 * b, body, x, 0, 0)); // cap
    g.add(box(0.22 * b, 0.05, 0.26 * b, dark, x, 0.09 * b, 0)); // ridge
    gl(box(0.03, 0.03, 0.2 * b, glow, x + s * 0.1 * b, 0, 0)); // side light
  }
  return g;
};
const combatPauldron: B = (spec, rt) => {
  const { g, b, body, dark } = kit(spec, rt);
  for (const s of [-1, 1]) {
    const x = s * 0.3;
    g.add(box(0.22 * b, 0.14 * b, 0.26 * b, body, x, 0, 0));
    const spike = box(0.06 * b, 0.1 * b, 0.24 * b, dark, x + s * 0.09 * b, 0.05 * b, 0); spike.rotation.z = -s * 0.5; g.add(spike); // angular flare
  }
  return g;
};
const fieldPauldron: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  for (const s of [-1, 1]) {
    const x = s * 0.3;
    g.add(box(0.18 * b, 0.16 * b, 0.26 * b, body, x, 0, 0)); // rounded cap
    g.add(box(0.05 * b, 0.14 * b, 0.06, dark, x, -0.02 * b, 0.13 * b)); // front strap
    gl(box(0.03 * b, 0.03 * b, 0.03, glow, x, 0.06 * b, 0.13 * b)); // unit light
  }
  return g;
};

// ── BACKPACKS ─────────────────────────────────────────────────────────────────
const fieldPack: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.3 * b, 0.38 * b, 0.16 * b, body, 0, 0, -0.02)); // pack body
  g.add(box(0.32 * b, 0.1 * b, 0.17 * b, dark, 0, 0.12 * b, -0.02)); // top flap
  for (const s of [-1, 1]) g.add(box(0.04, 0.36 * b, 0.03, dark, s * 0.13 * b, 0, 0.08)); // straps
  gl(box(0.03, 0.03, 0.03, glow, 0.1 * b, 0.1 * b, 0.06)); // status light
  return g;
};
const assaultPack: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.32 * b, 0.36 * b, 0.18 * b, body, 0, 0, -0.02));
  for (let i = 0; i < 3; i++) g.add(box(0.09 * b, 0.09 * b, 0.06, dark, (i - 1) * 0.1 * b, -0.1 * b, -0.11)); // pouch row
  gl(box(0.2 * b, 0.02, 0.03, glow, 0, 0.1 * b, -0.12)); // rig light
  return g;
};
const reconPack: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.24 * b, 0.34 * b, 0.13 * b, body, 0, 0, -0.02)); // slim body
  for (let i = 0; i < 2; i++) g.add(cylY(0.01, 0.26 * b, dark, -0.04 * b + i * 0.08 * b, 0.26 * b, -0.05)); // antennas
  gl(box(0.02, 0.02, 0.02, glow, 0, 0.42 * b, -0.05)); // tip
  return g;
};

// ── POWER CORES ───────────────────────────────────────────────────────────────
const cell: B = (spec, rt) => {
  const { g, b, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.16 * b, 0.16 * b, 0.08, dark, 0, 0, 0)); // housing
  gl(cylZ(0.055 * b, 0.05, glow, 0, 0, 0.05, 14)); // reactor face
  for (const s of [-1, 1]) g.add(box(0.02, 0.12 * b, 0.05, dark, s * 0.09 * b, 0, 0.02)); // side ribs
  return g;
};
const reactor: B = (spec, rt) => {
  const { g, b, dark, glow, moving } = kit(spec, rt);
  g.add(box(0.17 * b, 0.17 * b, 0.09, dark, 0, 0, 0));
  moving(cylZ(0.07 * b, 0.04, glow, 0, 0, 0.06, 12)); // rotating core
  for (let i = 0; i < 3; i++) g.add(box(0.15 * b, 0.02, 0.04, dark, 0, 0.06 * b - i * 0.06 * b, 0.05)); // vents
  return g;
};
const dynamo: B = (spec, rt) => {
  const { g, b, body, glow, gl } = kit(spec, rt);
  g.add(box(0.15 * b, 0.18 * b, 0.08, body, 0, 0, 0));
  for (let i = 0; i < 3; i++) gl(box(0.11 * b, 0.03, 0.04, glow, 0, 0.06 * b - i * 0.06 * b, 0.05)); // stacked cells
  return g;
};

export const OUTRIDER_CHESTS: ArmorProduct[] = [
  { id: 'trooper', name: 'Trooper', noun: 'Cuirass', build: trooper },
  { id: 'carrier', name: 'Carrier', noun: 'Rig', build: carrier },
  { id: 'aegis', name: 'Aegis', noun: 'Plate', build: aegis },
];
export const OUTRIDER_PLATES: ArmorProduct[] = [
  { id: 'guardplate', name: 'Guard', noun: 'Plate', build: guardPlate },
  { id: 'panelplate', name: 'Panel', noun: 'Plate', build: panelPlate },
  { id: 'braceplate', name: 'Brace', noun: 'Plate', build: bracePlate },
];
export const OUTRIDER_PAULDRONS: ArmorProduct[] = [
  { id: 'stdpauldron', name: 'Standard', noun: 'Pauldrons', build: stdPauldron },
  { id: 'combatpauldron', name: 'Combat', noun: 'Pauldrons', build: combatPauldron },
  { id: 'fieldpauldron', name: 'Field', noun: 'Pauldrons', build: fieldPauldron },
];
export const OUTRIDER_BACKPACKS: ArmorProduct[] = [
  { id: 'fieldpack', name: 'Field', noun: 'Pack', build: fieldPack },
  { id: 'assaultpack', name: 'Assault', noun: 'Pack', build: assaultPack },
  { id: 'reconpack', name: 'Recon', noun: 'Pack', build: reconPack },
];
export const OUTRIDER_CORES: ArmorProduct[] = [
  { id: 'cell', name: 'Cell', noun: 'Core', build: cell },
  { id: 'reactor', name: 'Reactor', noun: 'Core', build: reactor },
  { id: 'dynamo', name: 'Dynamo', noun: 'Core', build: dynamo },
];
