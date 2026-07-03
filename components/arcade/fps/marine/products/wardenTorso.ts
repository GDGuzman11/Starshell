/**
 * WARDEN TORSO PRODUCTS — enormous layered chests, huge reactor-crowned pauldrons, barrier
 * modules. Massive, square, shielded. Primitives only.
 */
import * as THREE from 'three';
import type { RenderTier } from '../../materials';
import { box, cylY, cylZ } from '../../models/parts';
import { kit } from './kit';
import type { ArmorModelSpec } from '../parts';
import type { ArmorProduct } from '../products';

type B = (spec: ArmorModelSpec, rt: RenderTier) => THREE.Group;

// ── CHESTS ────────────────────────────────────────────────────────────────────
const bulwark: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.56 * b, 0.44 * b, 0.14, body, 0, 0, 0.04)); // enormous slab
  for (let i = 0; i < 3; i++) g.add(box(0.54 * b, 0.06 * b, 0.05, dark, 0, 0.14 * b - i * 0.14 * b, 0.11)); // horizontal bands
  g.add(box(0.18 * b, 0.18 * b, 0.08, dark, 0, 0, 0.11)); // reactor housing
  gl(cylZ(0.07 * b, 0.05, glow, 0, 0, 0.15, 8)); // reactor core
  return g;
};
const aegis: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.54 * b, 0.44 * b, 0.14, body, 0, 0, 0.04)); // slab
  for (const s of [-1, 1]) g.add(box(0.12 * b, 0.42 * b, 0.1, dark, s * 0.2 * b, 0, 0.09)); // side shield columns
  for (const s of [-1, 1]) gl(cylZ(0.04 * b, 0.05, glow, s * 0.22 * b, 0.15 * b, 0.11, 8)); // shield-emitter nubs
  g.add(box(0.16 * b, 0.4 * b, 0.06, dark, 0, 0, 0.12)); // central spine
  return g;
};
const titan: B = (spec, rt) => {
  const { g, b, body, dark, glow, moving } = kit(spec, rt);
  g.add(box(0.56 * b, 0.46 * b, 0.16, body, 0, 0, 0.04)); // huge slab
  g.add(box(0.24 * b, 0.24 * b, 0.1, dark, 0, 0, 0.11)); // big reactor housing
  moving(cylZ(0.1 * b, 0.05, glow, 0, 0, 0.16, 12)); // rotating reactor
  for (let i = 0; i < 4; i++) g.add(box(0.52 * b, 0.03, 0.05, dark, 0, 0.18 * b - i * 0.12 * b, 0.11)); // rivet bands
  return g;
};

// ── PAULDRONS (both shoulders) — huge, reactor-crowned ────────────────────────
const rampart: B = (spec, rt) => {
  const { g, b, body, dark, glow, moving } = kit(spec, rt);
  for (const s of [-1, 1]) {
    const x = s * 0.36;
    g.add(box(0.34 * b, 0.14 * b, 0.4 * b, body, x, 0.04 * b, 0)); // main slab
    g.add(box(0.3 * b, 0.1 * b, 0.36 * b, dark, x, -0.08 * b, 0)); // lower slab
    g.add(box(0.36 * b, 0.05, 0.42 * b, dark, x, 0.13 * b, 0)); // top cap band
    moving(cylY(0.04 * b, 0.1 * b, glow, x, 0.2 * b, 0)); // shield emitter
  }
  return g;
};
const colossus: B = (spec, rt) => {
  const { g, b, body, dark } = kit(spec, rt);
  for (const s of [-1, 1]) {
    const x = s * 0.36;
    g.add(box(0.36 * b, 0.2 * b, 0.42 * b, body, x, 0.02 * b, 0)); // massive block
    for (let i = 0; i < 3; i++) g.add(box(0.38 * b, 0.03, 0.42 * b, dark, x, 0.1 * b - i * 0.1 * b, 0)); // layer bands
  }
  return g;
};
const redoubt: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  for (const s of [-1, 1]) {
    const x = s * 0.36;
    g.add(box(0.32 * b, 0.16 * b, 0.4 * b, body, x, 0.02 * b, 0)); // slab
    for (let k = 0; k < 3; k++) g.add(box(0.02, 0.1 * b, 0.36 * b, dark, x - 0.1 * b + k * 0.1 * b, 0.06 * b, 0.02)); // vent fins
    gl(box(0.28 * b, 0.02, 0.03, glow, x, -0.02 * b, 0.2 * b)); // status
  }
  return g;
};

// ── BARRIER MODULES (plate, front) ────────────────────────────────────────────
const barrier: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.34 * b, 0.34 * b, 0.05, body, 0, 0, 0.02)); // barrier plate
  g.add(box(0.36 * b, 0.05, 0.06, dark, 0, 0.15 * b, 0.03)); // top emitter bar
  gl(box(0.3 * b, 0.03, 0.03, glow, 0, 0.15 * b, 0.05)); // barrier field line
  gl(box(0.03, 0.28 * b, 0.03, glow, 0, 0, 0.05)); // central conduit
  return g;
};
const deflector: B = (spec, rt) => {
  const { g, b, body, dark, glow, moving } = kit(spec, rt);
  g.add(box(0.3 * b, 0.3 * b, 0.05, body, 0, 0, 0.02));
  moving(cylZ(0.13 * b, 0.03, glow, 0, 0, 0.05, 16)); // rotating deflector ring
  for (const s of [-1, 1]) g.add(box(0.04, 0.3 * b, 0.05, dark, s * 0.15 * b, 0, 0.02)); // side rails
  return g;
};
const shieldWall: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.38 * b, 0.32 * b, 0.06, body, 0, 0, 0.02)); // wide plate
  for (let i = 0; i < 4; i++) g.add(box(0.36 * b, 0.04 * b, 0.03, dark, 0, 0.13 * b - i * 0.09 * b, 0.05)); // layered slats
  gl(box(0.34 * b, 0.02, 0.03, glow, 0, 0.14 * b, 0.06)); // emitter line
  return g;
};

export const WARDEN_CHESTS: ArmorProduct[] = [
  { id: 'bulwark', name: 'Bulwark', noun: 'Cuirass', build: bulwark },
  { id: 'aegis', name: 'Aegis', noun: 'Plate', build: aegis },
  { id: 'titan', name: 'Titan', noun: 'Plate', build: titan },
];
export const WARDEN_PAULDRONS: ArmorProduct[] = [
  { id: 'rampart', name: 'Rampart', noun: 'Pauldrons', build: rampart },
  { id: 'colossus', name: 'Colossus', noun: 'Pauldrons', build: colossus },
  { id: 'redoubt', name: 'Redoubt', noun: 'Pauldrons', build: redoubt },
];
export const WARDEN_BARRIER: ArmorProduct[] = [
  { id: 'barrier', name: 'Barrier', noun: 'Module', build: barrier },
  { id: 'deflector', name: 'Deflector', noun: 'Module', build: deflector },
  { id: 'shieldwall', name: 'Shield Wall', noun: 'Module', build: shieldWall },
];
