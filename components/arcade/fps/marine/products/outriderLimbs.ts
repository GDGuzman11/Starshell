/**
 * OUTRIDER LIMB PRODUCTS — Standard-Issue limb shells (arms/legs), gloves, knee caps, boots.
 * Clean, balanced military hardware. Primitives only.
 */
import * as THREE from 'three';
import type { RenderTier } from '../../materials';
import { box, cylY } from '../../models/parts';
import { kit } from './kit';
import type { ArmorModelSpec } from '../parts';
import type { ArmorProduct } from '../products';

type B = (spec: ArmorModelSpec, rt: RenderTier) => THREE.Group;

// ── LIMBS (upperArms / forearms / thighs / shins) ─────────────────────────────
const bracer: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.2 * b, 0.24 * b, 0.2 * b, body, 0, 0, 0)); // shell
  g.add(box(0.22 * b, 0.03, 0.22 * b, dark, 0, 0.07 * b, 0)); // upper band
  g.add(box(0.22 * b, 0.03, 0.22 * b, dark, 0, -0.07 * b, 0)); // lower band
  gl(box(0.02, 0.16 * b, 0.02, glow, 0.11 * b, 0, 0.02)); // side light
  return g;
};
const guardLimb: B = (spec, rt) => {
  const { g, b, body, dark } = kit(spec, rt);
  g.add(box(0.2 * b, 0.24 * b, 0.2 * b, body, 0, 0, 0));
  g.add(box(0.1 * b, 0.26 * b, 0.06, dark, 0, 0, 0.11 * b)); // front guard plate
  for (const s of [-1, 1]) g.add(box(0.03, 0.22 * b, 0.06, dark, s * 0.1 * b, 0, 0.08 * b)); // side rails
  return g;
};
const ventLimb: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.19 * b, 0.24 * b, 0.19 * b, body, 0, 0, 0));
  for (let i = 0; i < 3; i++) g.add(box(0.16 * b, 0.02, 0.04, dark, 0, 0.06 * b - i * 0.06 * b, 0.1 * b)); // vent ribs
  gl(box(0.1 * b, 0.02, 0.02, glow, 0, 0, 0.11 * b)); // vent glow
  return g;
};

// ── GLOVES ────────────────────────────────────────────────────────────────────
const grip: B = (spec, rt) => {
  const { g, b, body, dark } = kit(spec, rt);
  g.add(box(0.16 * b, 0.14 * b, 0.18 * b, body, 0, 0, 0.02)); // gauntlet
  g.add(box(0.14 * b, 0.06, 0.1, dark, 0, -0.06 * b, 0.1)); // knuckle
  g.add(box(0.15 * b, 0.05 * b, 0.06, dark, 0, 0.07 * b, -0.02)); // cuff
  return g;
};
const tacticalGlove: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.14 * b, 0.13 * b, 0.18 * b, body, 0, 0, 0.02)); // slim gauntlet
  g.add(box(0.13 * b, 0.05, 0.09, dark, 0, -0.05 * b, 0.11)); // knuckle
  gl(box(0.02, 0.02, 0.08, glow, 0.07 * b, 0.03 * b, 0.06)); // wrist light
  return g;
};
const armoredGlove: B = (spec, rt) => {
  const { g, b, body, dark } = kit(spec, rt);
  g.add(box(0.18 * b, 0.16 * b, 0.2 * b, body, 0, 0, 0.02)); // heavy gauntlet
  g.add(box(0.17 * b, 0.08, 0.1, dark, 0, -0.07 * b, 0.11)); // heavy knuckle plate
  for (const s of [-1, 1]) g.add(box(0.03, 0.1 * b, 0.06, dark, s * 0.09 * b, 0, 0.06)); // side plates
  return g;
};

// ── KNEE CAPS ─────────────────────────────────────────────────────────────────
const pad: B = (spec, rt) => {
  const { g, b, body, glow, gl } = kit(spec, rt);
  g.add(cylY(0.11 * b, 0.1 * b, body, 0, 0, 0.04)); // knee dome
  gl(box(0.06, 0.02, 0.02, glow, 0, 0, 0.12 * b)); // dome light
  return g;
};
const guardCap: B = (spec, rt) => {
  const { g, b, body, dark } = kit(spec, rt);
  g.add(box(0.16 * b, 0.14 * b, 0.1, body, 0, 0, 0.05)); // angular cap
  g.add(box(0.12 * b, 0.06 * b, 0.06, dark, 0, -0.06 * b, 0.09)); // lower lip
  return g;
};
const braceCap: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(cylY(0.1 * b, 0.1 * b, body, 0, 0, 0.04)); // dome
  for (const s of [-1, 1]) g.add(box(0.03, 0.14 * b, 0.05, dark, s * 0.1 * b, 0, 0.03)); // side braces
  gl(box(0.04, 0.02, 0.02, glow, 0, 0.05 * b, 0.11 * b)); // light
  return g;
};

// ── BOOTS ─────────────────────────────────────────────────────────────────────
const trooperBoot: B = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = kit(spec, rt);
  g.add(box(0.2 * b, 0.14 * b, 0.24 * b, body, 0, 0, 0.02)); // boot upper
  g.add(box(0.22 * b, 0.06, 0.34 * b, dark, 0, -0.06 * b, 0.06)); // sole + toe
  g.add(box(0.2 * b, 0.08 * b, 0.06, dark, 0, 0.06 * b, 0.14)); // toe cap
  gl(box(0.03, 0.03, 0.1, glow, 0.09 * b, 0, 0)); // side light
  return g;
};
const trekBoot: B = (spec, rt) => {
  const { g, b, body, dark } = kit(spec, rt);
  g.add(box(0.19 * b, 0.2 * b, 0.24 * b, body, 0, 0.03 * b, 0.02)); // tall upper
  g.add(box(0.21 * b, 0.08, 0.34 * b, dark, 0, -0.06 * b, 0.06)); // treaded sole
  for (let i = 0; i < 3; i++) g.add(box(0.21 * b, 0.02, 0.03, dark, 0, -0.1 * b, 0.14 - i * 0.1)); // tread bars
  return g;
};
const assaultBoot: B = (spec, rt) => {
  const { g, b, body, dark } = kit(spec, rt);
  g.add(box(0.22 * b, 0.16 * b, 0.26 * b, body, 0, 0.02 * b, 0.02)); // heavy boot
  g.add(box(0.24 * b, 0.08, 0.36 * b, dark, 0, -0.07 * b, 0.06)); // heavy sole
  g.add(box(0.22 * b, 0.12 * b, 0.08, dark, 0, 0.02 * b, 0.16)); // toe plate
  return g;
};

export const OUTRIDER_LIMBS: ArmorProduct[] = [
  { id: 'bracer', name: 'Bracer', noun: 'Guard', build: bracer },
  { id: 'guardlimb', name: 'Guard', noun: 'Plating', build: guardLimb },
  { id: 'ventlimb', name: 'Vent', noun: 'Guard', build: ventLimb },
];
export const OUTRIDER_GLOVES: ArmorProduct[] = [
  { id: 'grip', name: 'Grip', noun: 'Gauntlets', build: grip },
  { id: 'tacticalglove', name: 'Tactical', noun: 'Gauntlets', build: tacticalGlove },
  { id: 'armoredglove', name: 'Armored', noun: 'Gauntlets', build: armoredGlove },
];
export const OUTRIDER_CAPS: ArmorProduct[] = [
  { id: 'pad', name: 'Pad', noun: 'Knees', build: pad },
  { id: 'guardcap', name: 'Guard', noun: 'Knees', build: guardCap },
  { id: 'bracecap', name: 'Brace', noun: 'Knees', build: braceCap },
];
export const OUTRIDER_BOOTS: ArmorProduct[] = [
  { id: 'trooperboot', name: 'Trooper', noun: 'Boots', build: trooperBoot },
  { id: 'trekboot', name: 'Trek', noun: 'Boots', build: trekBoot },
  { id: 'assaultboot', name: 'Assault', noun: 'Boots', build: assaultBoot },
];
