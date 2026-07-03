/**
 * LIFELINE HEAD PRODUCTS — Combat Support: rounded, soft, medical helmets + emergency
 * signal systems. Rescue beacons, medical crosses, life scanners. Primitives only.
 */
import * as THREE from 'three';
import type { RenderTier } from '../../materials';
import { box, capsuleY, cylX, cylY, cylZ } from '../../models/parts';
import { kit } from './kit';
import type { ArmorModelSpec } from '../parts';
import type { ArmorProduct } from '../products';

type B = (spec: ArmorModelSpec, rt: RenderTier) => THREE.Group;

// ── HELMETS ───────────────────────────────────────────────────────────────────
const sentinel: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl, moving } = kit(spec, rt);
  g.add(capsuleY(0.15 * b, 0.1 * b, body, 0, 0.0, 0)); // rounded soft dome
  gl(box(0.22 * b, 0.07 * b, 0.03, glow, 0, 0.0, 0.13 * b)); // broad soft visor
  moving(cylY(0.035 * b, 0.06 * b, glow, 0, 0.17 * b, 0)); // rescue beacon
  g.add(capsuleY(0.04 * b, 0.05 * b, dark, 0, 0.22 * b, 0)); // beacon cap
  for (const s of [-1, 1]) g.add(cylX(0.06 * b, 0.06 * b, dark, s * 0.15 * b, 0.0, 0.02)); // medical ear pods
  gl(box(0.03, 0.08 * b, 0.02, glow, 0, 0.08 * b, 0.13 * b)); gl(box(0.08 * b, 0.03, 0.02, glow, 0, 0.08 * b, 0.13 * b)); // brow cross
  return g;
};
const seraph: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(capsuleY(0.15 * b, 0.11 * b, body, 0, 0.0, 0)); // dome
  gl(box(0.2 * b, 0.06 * b, 0.03, glow, 0, 0.0, 0.13 * b)); // visor
  for (const s of [-1, 1]) { const wing = box(0.1 * b, 0.04 * b, 0.02, body, s * 0.13 * b, 0.06 * b, -0.02); wing.rotation.z = s * 0.5; g.add(wing); } // side wings
  g.add(cylY(0.008, 0.14 * b, dark, 0, 0.16 * b, 0)); gl(box(0.03, 0.03, 0.02, glow, 0, 0.24 * b, 0)); // signal mast
  return g;
};
const mercy: B = (spec, rt) => {
  const { g, b, body, glow, gl } = kit(spec, rt);
  g.add(capsuleY(0.16 * b, 0.09 * b, body, 0, 0.0, 0)); // wide soft dome
  gl(box(0.24 * b, 0.06 * b, 0.03, glow, 0, 0.0, 0.13 * b)); // wide visor
  for (const s of [-1, 1]) gl(cylZ(0.025 * b, 0.03, glow, s * 0.11 * b, 0.02 * b, 0.1 * b, 12)); // life-scan optics
  gl(box(0.1 * b, 0.04 * b, 0.03, glow, 0, -0.09 * b, 0.11 * b)); // trauma display
  return g;
};

// ── EMERGENCY SYSTEMS (comms) ─────────────────────────────────────────────────
const beacon: B = (spec, rt) => {
  const { g, b, dark, glow, moving } = kit(spec, rt);
  g.add(box(0.07 * b, 0.06 * b, 0.07 * b, dark, 0, 0, 0)); // module
  moving(cylY(0.035 * b, 0.06 * b, glow, 0, 0.06 * b, 0)); // rotating rescue beacon
  return g;
};
const alert: B = (spec, rt) => {
  const { g, b, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.08 * b, 0.06 * b, 0.06 * b, dark, 0, 0, 0));
  gl(box(0.03, 0.08 * b, 0.02, glow, 0, 0.02 * b, 0.04)); gl(box(0.06 * b, 0.03, 0.02, glow, 0, 0.02 * b, 0.04)); // alert cross
  return g;
};
const rescue: B = (spec, rt) => {
  const { g, b, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.07 * b, 0.07 * b, 0.07 * b, dark, 0, 0, 0));
  g.add(cylY(0.008, 0.16 * b, dark, 0, 0.1 * b, 0)); // signal antenna
  gl(capsuleY(0.02 * b, 0.02, glow, 0, 0.2 * b, 0)); // strobe
  return g;
};

export const LIFELINE_HELMETS: ArmorProduct[] = [
  { id: 'sentinel', name: 'Sentinel', noun: 'Helm', build: sentinel },
  { id: 'seraph', name: 'Seraph', noun: 'Helm', build: seraph },
  { id: 'mercy', name: 'Mercy', noun: 'Helm', build: mercy },
];
export const LIFELINE_EMERGENCY: ArmorProduct[] = [
  { id: 'beacon', name: 'Beacon', noun: 'Emergency', build: beacon },
  { id: 'alert', name: 'Alert', noun: 'Emergency', build: alert },
  { id: 'rescue', name: 'Rescue', noun: 'Emergency', build: rescue },
];
