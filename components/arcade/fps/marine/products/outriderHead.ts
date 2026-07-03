/**
 * OUTRIDER HEAD PRODUCTS — Standard-Issue helmets, visors, comms. Outrider is the balanced
 * all-rounder: clean, versatile, modular military hardware (no extreme). Distinct products.
 * Primitives only.
 */
import * as THREE from 'three';
import type { RenderTier } from '../../materials';
import { box, cylY, cylZ } from '../../models/parts';
import { kit } from './kit';
import type { ArmorModelSpec } from '../parts';
import type { ArmorProduct } from '../products';

type B = (spec: ArmorModelSpec, rt: RenderTier) => THREE.Group;

// ── HELMETS ───────────────────────────────────────────────────────────────────
const sentinel: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.27 * b, 0.22 * b, 0.29 * b, body, 0, 0.01, 0)); // rounded skull
  g.add(box(0.23 * b, 0.05 * b, 0.06 * b, dark, 0, 0.12 * b, 0)); // dome cap
  g.add(box(0.29 * b, 0.05, 0.06, dark, 0, 0.06 * b, 0.13 * b)); // brow
  gl(box(0.23 * b, 0.05 * b, 0.03, glow, 0, 0, 0.15 * b)); // visor slit
  g.add(box(0.15 * b, 0.06 * b, 0.09, dark, 0, -0.11 * b, 0.1 * b)); // chin guard
  for (const s of [-1, 1]) g.add(box(0.04, 0.1 * b, 0.14 * b, body, s * 0.14 * b, -0.03, 0.02)); // cheek guards
  return g;
};
const ranger: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.25 * b, 0.23 * b, 0.3 * b, body, 0, 0.02, 0)); // skull
  g.add(box(0.26 * b, 0.06 * b, 0.1, dark, 0, 0.11 * b, -0.06)); // swept rear top
  gl(box(0.24 * b, 0.05 * b, 0.03, glow, 0, 0.0, 0.15 * b)); // wide visor
  g.add(box(0.06 * b, 0.06 * b, 0.06 * b, dark, 0.15 * b, 0.05 * b, 0.02)); // side comms
  g.add(cylY(0.01, 0.14 * b, dark, -0.1 * b, 0.16 * b, -0.04)); // antenna
  return g;
};
const warrant: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.28 * b, 0.23 * b, 0.28 * b, body, 0, 0.02, 0)); // skull
  g.add(box(0.1 * b, 0.08 * b, 0.26 * b, dark, 0, 0.14 * b, -0.02)); // raised command ridge
  for (const s of [-1, 1]) gl(box(0.09 * b, 0.05 * b, 0.03, glow, s * 0.06 * b, 0, 0.14 * b)); // split visor
  g.add(box(0.16 * b, 0.08 * b, 0.1, dark, 0, -0.11 * b, 0.11 * b)); // heavy jaw
  return g;
};

// ── VISORS ────────────────────────────────────────────────────────────────────
const stdVisor: B = (spec, rt) => {
  const { g, b, dark, glow, gl } = kit(spec, rt);
  gl(box(0.24 * b, 0.06 * b, 0.02, glow, 0, 0, 0.02)); // band
  g.add(box(0.26 * b, 0.02, 0.03, dark, 0, 0.05 * b, 0.02)); // frame
  return g;
};
const wideVisor: B = (spec, rt) => {
  const { g, b, dark, glow, gl } = kit(spec, rt);
  gl(box(0.28 * b, 0.055 * b, 0.02, glow, 0, 0, 0.02)); // wide band
  g.add(box(0.3 * b, 0.02, 0.03, dark, 0, 0.05 * b, 0.02)); // frame
  for (const s of [-1, 1]) g.add(box(0.03 * b, 0.05 * b, 0.04, dark, s * 0.15 * b, 0, 0.01)); // side sensors
  return g;
};
const tacnetVisor: B = (spec, rt) => {
  const { g, b, dark, glow, gl, moving } = kit(spec, rt);
  gl(box(0.24 * b, 0.05 * b, 0.02, glow, 0, 0, 0.02)); // band
  g.add(box(0.26 * b, 0.02, 0.03, dark, 0, 0.05 * b, 0.02)); // frame
  moving(cylZ(0.03 * b, 0.02, glow, 0.08 * b, 0, 0.03, 10)); // targeting optic
  return g;
};

// ── COMMS ─────────────────────────────────────────────────────────────────────
const mast: B = (spec, rt) => {
  const { g, b, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.08 * b, 0.08 * b, 0.08 * b, dark, 0, 0, 0)); // module
  g.add(cylY(0.008, 0.2 * b, dark, 0, 0.14 * b, 0)); // antenna
  gl(box(0.02, 0.02, 0.02, glow, 0, 0.25 * b, 0)); // tip
  return g;
};
const commRelay: B = (spec, rt) => {
  const { g, b, dark, glow, moving } = kit(spec, rt);
  g.add(box(0.08 * b, 0.08 * b, 0.07 * b, dark, 0, 0, 0));
  moving(cylZ(0.05 * b, 0.02, glow, 0, 0.02 * b, 0.05, 10)); // dish
  return g;
};
const beacon: B = (spec, rt) => {
  const { g, b, dark, glow, moving } = kit(spec, rt);
  g.add(box(0.08 * b, 0.06 * b, 0.08 * b, dark, 0, 0, 0));
  moving(cylY(0.03 * b, 0.05 * b, glow, 0, 0.07 * b, 0)); // beacon
  return g;
};

export const OUTRIDER_HELMETS: ArmorProduct[] = [
  { id: 'sentinel', name: 'Sentinel', noun: 'Helm', build: sentinel },
  { id: 'ranger', name: 'Ranger', noun: 'Helm', build: ranger },
  { id: 'warrant', name: 'Warrant', noun: 'Helm', build: warrant },
];
export const OUTRIDER_VISORS: ArmorProduct[] = [
  { id: 'stdvisor', name: 'Standard', noun: 'Visor', build: stdVisor },
  { id: 'widevisor', name: 'Wide', noun: 'Visor', build: wideVisor },
  { id: 'tacnet', name: 'Tacnet', noun: 'Visor', build: tacnetVisor },
];
export const OUTRIDER_COMMS: ArmorProduct[] = [
  { id: 'mast', name: 'Mast', noun: 'Comms', build: mast },
  { id: 'commrelay', name: 'Relay', noun: 'Comms', build: commRelay },
  { id: 'beacon', name: 'Beacon', noun: 'Comms', build: beacon },
];
