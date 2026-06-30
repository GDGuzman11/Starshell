/**
 * Sidearm family — SIDEARM, HAND CANNON, MACHINE PISTOL. Short weapons, each with
 * a clear pistol silhouette: a balanced compact auto; a massive revolver with a
 * fat barrel + prominent cylinder + oversized grip; a tiny machine pistol with a
 * mag through the grip + folding stock. Green accent family; muzzle toward −Z.
 */
import * as THREE from 'three';
import type { RenderTier } from '../materials';
import { ACCENT, COL, accent, box, cylX, cylZ, grip, metal, model } from './parts';

function muzzleAt(z: number, y = 0): THREE.Object3D {
  const o = new THREE.Object3D();
  o.name = 'muzzle';
  o.position.set(0, y, z);
  return o;
}

/** SIDEARM — compact, balanced, reliable military pistol. */
export function buildSidearm(tier: RenderTier): THREE.Group {
  const body = metal(COL.gunmetal, tier);
  const dark = metal(COL.matteBlack, tier);
  const dot = accent(ACCENT.green, tier, 1.1);
  const slide = box(0.05, 0.06, 0.22, body, 0, 0.04, -0.02); // slide
  slide.name = 'bolt';
  const barrel = cylZ(0.016, 0.06, dark, 0, 0.04, -0.14);
  const frame = box(0.045, 0.04, 0.16, dark, 0, 0.0, 0.0);
  const grp = grip(0.05, 0.14, 0.06, dark, 0, -0.09, 0.06);
  const mag = box(0.04, 0.04, 0.05, dark, 0, -0.15, 0.06);
  mag.name = 'mag';
  const guard = box(0.03, 0.05, 0.03, dark, 0, -0.03, 0.0);
  const sight = box(0.012, 0.015, 0.015, dot, 0, 0.08, 0.06);
  return model([slide, barrel, frame, grp, mag, guard, sight, muzzleAt(-0.17, 0.04)]);
}

/** HAND CANNON — large revolver: very thick barrel, massive cylinder, big grip. */
export function buildHandCannon(tier: RenderTier): THREE.Group {
  const body = metal(COL.steel, tier, 0.4, 0.95);
  const dark = metal(COL.matteBlack, tier);
  const dot = accent(ACCENT.green, tier, 1.0);
  const barrel = cylZ(0.032, 0.28, body, 0, 0.05, -0.14); // very thick barrel
  const rib = box(0.02, 0.02, 0.28, dark, 0, 0.08, -0.14); // top rib
  const cylinder = cylX(0.055, 0.09, dark, 0, 0.02, 0.04); // massive cylinder
  cylinder.name = 'spin';
  const cylFace = cylX(0.04, 0.092, body, 0, 0.02, 0.04);
  const frame = box(0.04, 0.1, 0.12, body, 0, 0.0, 0.06);
  const grp = grip(0.06, 0.17, 0.08, dark, 0, -0.11, 0.12, 0.28); // oversized grip
  const hammer = box(0.02, 0.04, 0.03, dark, 0, 0.09, 0.12);
  const tip = box(0.04, 0.04, 0.02, dot, 0, 0.05, -0.28);
  return model([barrel, rib, cylinder, cylFace, frame, grp, hammer, tip, muzzleAt(-0.29, 0.05)]);
}

/** MACHINE PISTOL — tiny SMG: box magazine in the grip, folding stock, aggressive. */
export function buildMachinePistol(tier: RenderTier): THREE.Group {
  const body = metal(COL.matteBlack, tier);
  const steel = metal(COL.gunmetal, tier);
  const dot = accent(ACCENT.green, tier, 1.3);
  const shell = box(0.05, 0.08, 0.22, steel, 0, 0.02, -0.02); // small body
  shell.name = 'bolt';
  const barrel = cylZ(0.014, 0.08, body, 0, 0.03, -0.14);
  const comp = box(0.04, 0.04, 0.04, dot, 0, 0.03, -0.18); // aggressive front compensator
  const magGrip = box(0.045, 0.2, 0.06, body, 0, -0.11, 0.06); // mag through the grip
  magGrip.name = 'mag';
  // folding stock — thin frame folded along the top
  const stockA = box(0.02, 0.015, 0.18, steel, 0.0, 0.07, 0.12);
  const stockB = box(0.02, 0.04, 0.015, steel, 0.0, 0.05, 0.21);
  const vent = box(0.055, 0.01, 0.1, dot, 0, 0.06, -0.06);
  return model([shell, barrel, comp, magGrip, stockA, stockB, vent, muzzleAt(-0.2, 0.03)]);
}
