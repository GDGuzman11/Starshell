/**
 * Laser/energy family — ION REPEATER, LANCE BEAM, ARC THROWER. Differentiated
 * hard by silhouette: the Ion is a twin-rail coilgun with floating coils; the
 * Lance is a long, clean rectangular beam projector with a big rear battery; the
 * Arc is a dangerous forked tesla emitter with exposed coils + a rear transformer.
 * Coil rings are named 'coil' (pulse animation); muzzle toward −Z.
 */
import * as THREE from 'three';
import type { RenderTier } from '../materials';
import { ACCENT, COL, accent, box, coilStack, cylY, cylZ, finStack, grip, metal, model } from './parts';

function muzzleAt(z: number, y = 0): THREE.Object3D {
  const o = new THREE.Object3D();
  o.name = 'muzzle';
  o.position.set(0, y, z);
  return o;
}

/** ION REPEATER — coilgun: twin rails, floating coils, long receiver, energy cell. */
export function buildIonRepeater(tier: RenderTier): THREE.Group {
  const body = metal(COL.titanium, tier);
  const dark = metal(COL.matteBlack, tier);
  const glow = accent(ACCENT.blue, tier);
  const receiver = box(0.08, 0.09, 0.46, body, 0, 0, 0.0); // long receiver
  const railT = cylZ(0.012, 0.5, dark, 0, 0.07, -0.16); // twin electromagnetic rails
  const railB = cylZ(0.012, 0.5, dark, 0, -0.04, -0.16);
  const coils = coilStack(4, 0.07, 0.05, glow, 0, 0.015, -0.1); // floating energy coils
  coils.name = 'coil';
  const cell = box(0.06, 0.1, 0.12, glow, 0, -0.13, 0.1); // energy cell (no magazine)
  cell.name = 'mag';
  const grp = grip(0.05, 0.13, 0.06, dark, 0, -0.11, 0.18);
  const tip = cylZ(0.02, 0.06, glow, 0, 0.015, -0.42); // minimal muzzle
  return model([receiver, railT, railB, coils, cell, grp, tip, muzzleAt(-0.46, 0.015)]);
}

/** LANCE BEAM — clean shoulder laser: long rectangular emitter, rear battery, fins. */
export function buildLanceBeam(tier: RenderTier): THREE.Group {
  const body = metal(COL.steel, tier, 0.45, 0.9);
  const dark = metal(COL.matteBlack, tier);
  const glow = accent(ACCENT.blue, tier, 1.7);
  const emitter = box(0.08, 0.08, 0.6, body, 0, 0.02, -0.18); // long rectangular emitter
  const core = box(0.025, 0.025, 0.62, glow, 0, 0.02, -0.18); // glowing beam channel
  core.name = 'coil';
  const battery = box(0.12, 0.14, 0.18, dark, 0, -0.01, 0.26); // large rear battery
  const fins = finStack(5, 0.05, 0.13, 0.07, dark, 0, 0.08, -0.05); // cooling fins
  const aperture = box(0.06, 0.06, 0.03, glow, 0, 0.02, -0.48);
  const grp = grip(0.06, 0.13, 0.07, dark, 0, -0.11, 0.16);
  return model([emitter, core, battery, fins, aperture, grp, muzzleAt(-0.5, 0.02)]);
}

/** ARC THROWER — tesla: forked emitter, exposed coils, capacitors, rear transformer. */
export function buildArcThrower(tier: RenderTier): THREE.Group {
  const body = metal(COL.gunmetal, tier);
  const dark = metal(COL.matteBlack, tier);
  const elec = accent(ACCENT.purple, tier, 1.8);
  const block = box(0.1, 0.11, 0.26, body, 0, 0, 0.06); // main block
  const transformer = box(0.15, 0.17, 0.16, dark, 0, 0.0, 0.26); // heavy rear transformer
  const capL = cylY(0.025, 0.1, dark, -0.05, 0.12, 0.2); // capacitors
  const capR = cylY(0.025, 0.1, dark, 0.05, 0.12, 0.2);
  const coils = coilStack(3, 0.06, 0.07, elec, 0, 0.01, -0.04); // exposed coils
  coils.name = 'coil';
  // forked emitter: two prongs splaying outward at the front
  const prongL = box(0.025, 0.025, 0.24, body, -0.05, 0.02, -0.26);
  prongL.rotation.y = 0.22;
  const prongR = box(0.025, 0.025, 0.24, body, 0.05, 0.02, -0.26);
  prongR.rotation.y = -0.22;
  const tipL = box(0.03, 0.03, 0.03, elec, -0.08, 0.02, -0.36);
  const tipR = box(0.03, 0.03, 0.03, elec, 0.08, 0.02, -0.36);
  const spark = box(0.18, 0.012, 0.012, elec, 0, 0.02, -0.37); // arc between prongs
  spark.name = 'coil';
  const grp = grip(0.06, 0.14, 0.07, dark, 0, -0.12, 0.16);
  return model([block, transformer, capL, capR, coils, prongL, prongR, tipL, tipR, spark, grp, muzzleAt(-0.4, 0.02)]);
}
