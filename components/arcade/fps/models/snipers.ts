/**
 * Sniper family — RAILGUN, MARKSMAN, PIERCER. The Railgun is very long with
 * massive twin rails + a glowing core; the Marksman is a slim precision rifle with
 * a big integrated optic + adjustable stock; the Piercer is a stocky anti-material
 * rifle dominated by a huge muzzle brake. Muzzle toward −Z.
 */
import * as THREE from 'three';
import type { RenderTier } from '../materials';
import { ACCENT, COL, accent, box, cylZ, finStack, grip, metal, model } from './parts';

function muzzleAt(z: number, y = 0): THREE.Object3D {
  const o = new THREE.Object3D();
  o.name = 'muzzle';
  o.position.set(0, y, z);
  return o;
}

/** RAILGUN — very long, massive electromagnetic rails, glowing core, tiny mag. */
export function buildRailgun(tier: RenderTier): THREE.Group {
  const body = metal(COL.titanium, tier, 0.4, 0.95);
  const dark = metal(COL.matteBlack, tier);
  const glow = accent(ACCENT.purple, tier, 1.7);
  const spine = box(0.07, 0.08, 0.7, body, 0, 0, -0.1); // long rectangular body
  const railT = box(0.04, 0.05, 0.78, dark, 0, 0.07, -0.12); // massive rails
  const railB = box(0.04, 0.05, 0.78, dark, 0, -0.07, -0.12);
  const core = box(0.1, 0.1, 0.14, glow, 0, 0, 0.16); // large energy core
  core.name = 'coil';
  const coreCage = box(0.12, 0.12, 0.02, dark, 0, 0, 0.24);
  const mag = box(0.04, 0.07, 0.05, dark, 0, -0.1, 0.08); // tiny magazine
  mag.name = 'mag';
  const muzzleGlow = cylZ(0.045, 0.05, glow, 0, 0, -0.5);
  const grp = grip(0.05, 0.13, 0.06, dark, 0, -0.11, 0.22);
  const stock = box(0.06, 0.1, 0.16, body, 0, -0.01, 0.34);
  return model([spine, railT, railB, core, coreCage, mag, muzzleGlow, grp, stock, muzzleAt(-0.52)]);
}

/** MARKSMAN — slim precision rifle, long thin barrel, big optic, adjustable stock. */
export function buildMarksman(tier: RenderTier): THREE.Group {
  const body = metal(COL.gunmetal, tier);
  const dark = metal(COL.matteBlack, tier);
  const lens = accent(ACCENT.purple, tier, 1.2);
  const receiver = box(0.06, 0.08, 0.34, body, 0, 0, 0.04); // slim receiver
  const barrel = cylZ(0.02, 0.66, dark, 0, 0.02, -0.46); // long thin barrel
  // integrated optic housing on top
  const scope = cylZ(0.035, 0.26, dark, 0, 0.1, 0.0);
  const scopeBell = cylZ(0.045, 0.05, dark, 0, 0.1, -0.13);
  const scopeLens = cylZ(0.03, 0.02, lens, 0, 0.1, -0.155);
  const scopeMnt = box(0.03, 0.05, 0.16, dark, 0, 0.06, 0.0);
  // adjustable stock with a raised comb
  const stock = box(0.05, 0.09, 0.2, body, 0, -0.02, 0.28);
  const comb = box(0.04, 0.04, 0.12, body, 0, 0.05, 0.26);
  const mag = box(0.04, 0.1, 0.06, dark, 0, -0.11, 0.08); // small magazine
  mag.name = 'mag';
  const grp = grip(0.05, 0.13, 0.06, dark, 0, -0.11, 0.18);
  return model([receiver, barrel, scope, scopeBell, scopeLens, scopeMnt, stock, comb, mag, grp, muzzleAt(-0.78, 0.02)]);
}

/** PIERCER — anti-material rifle: massive barrel + huge muzzle brake/compensator. */
export function buildPiercer(tier: RenderTier): THREE.Group {
  const body = metal(COL.olive, tier);
  const dark = metal(COL.matteBlack, tier);
  const warn = accent(ACCENT.purple, tier, 1.0);
  const receiver = box(0.14, 0.13, 0.4, body, 0, 0, 0.08); // heavy reinforced receiver
  const barrel = cylZ(0.045, 0.46, dark, 0, 0.01, -0.34); // massive barrel
  // huge muzzle brake: a chunky slotted block + side ports
  const brake = box(0.13, 0.11, 0.18, dark, 0, 0.01, -0.56);
  const portL = box(0.04, 0.06, 0.1, body, -0.085, 0.01, -0.56);
  const portR = box(0.04, 0.06, 0.1, body, 0.085, 0.01, -0.56);
  const brakeFins = finStack(3, 0.05, 0.15, 0.12, dark, 0, 0.01, -0.5);
  const mag = box(0.06, 0.13, 0.09, dark, 0, -0.14, 0.1); // box mag
  mag.name = 'mag';
  const grp = grip(0.07, 0.15, 0.08, dark, 0, -0.14, 0.22);
  const stock = box(0.08, 0.11, 0.18, body, 0, -0.01, 0.34);
  const optic = box(0.04, 0.04, 0.16, warn, 0, 0.1, 0.06);
  return model([receiver, barrel, brake, portL, portR, brakeFins, mag, grp, stock, optic, muzzleAt(-0.66, 0.01)]);
}
