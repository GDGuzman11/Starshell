/**
 * Rifle family — PULSE AR, CARBINE, ASSAULT-X. Each a distinct silhouette per the
 * bible: the AR is compact/rounded with a blue energy chamber; the Carbine is
 * long, slim, skeleton-stocked; the Assault-X is a chunky heavy rifle with dual
 * cooling vents. Muzzle toward −Z.
 */
import * as THREE from 'three';
import type { RenderTier } from '../materials';
import { ACCENT, COL, accent, box, capsuleZ, cylZ, finStack, grip, metal, model, ventSlats } from './parts';

function muzzleAt(z: number, y = 0): THREE.Object3D {
  const o = new THREE.Object3D();
  o.name = 'muzzle';
  o.position.set(0, y, z);
  return o;
}

/** PULSE AR — compact energy assault rifle, rounded receiver, blue energy chamber. */
export function buildPulseAR(tier: RenderTier): THREE.Group {
  const body = metal(COL.gunmetal, tier);
  const dark = metal(COL.matteBlack, tier);
  const glow = accent(ACCENT.blue, tier);
  const receiver = capsuleZ(0.075, 0.34, body, 0, 0, 0.02); // rounded futuristic body
  const chamber = box(0.07, 0.07, 0.16, glow, 0, 0.02, 0.06); // integrated blue energy chamber
  chamber.name = 'glow';
  const barrel = cylZ(0.028, 0.32, dark, 0, 0.01, -0.3); // short barrel
  barrel.name = 'base:barrel'; // engineering barrel slot hides this
  const vent = ventSlats(3, 0.045, 0.09, 0.02, dark, 0.07, 0.04, 0.02); // small side vents
  const mag = box(0.07, 0.17, 0.1, dark, 0, -0.15, 0.08); // medium magazine
  mag.name = 'mag';
  const grp = grip(0.06, 0.14, 0.07, dark, 0, -0.13, 0.18);
  const sight = box(0.02, 0.03, 0.12, glow, 0, 0.09, 0.04);
  sight.name = 'base:optic'; // engineering optic slot hides this
  return model([receiver, chamber, barrel, vent, mag, grp, sight, muzzleAt(-0.46, 0.01)]);
}

/** CARBINE — classic long-barrel rifle, skeleton stock, slim box magazine. */
export function buildCarbine(tier: RenderTier): THREE.Group {
  const body = metal(COL.burntSteel, tier);
  const dark = metal(COL.matteBlack, tier);
  const hot = accent(ACCENT.amber, tier, 1.1);
  const receiver = box(0.07, 0.09, 0.36, body, 0, 0, 0.04); // slim receiver
  const barrel = cylZ(0.022, 0.6, dark, 0, 0.02, -0.42); // long barrel
  const handguard = box(0.06, 0.06, 0.26, body, 0, 0.01, -0.22);
  const frontSight = box(0.015, 0.05, 0.02, hot, 0, 0.07, -0.66);
  // skeleton stock: an open thin frame at the rear
  const stockTop = box(0.03, 0.02, 0.18, dark, 0, 0.05, 0.3);
  const stockBot = box(0.03, 0.02, 0.18, dark, 0, -0.06, 0.3);
  const stockEnd = box(0.03, 0.13, 0.02, dark, 0, 0, 0.38);
  const mag = box(0.05, 0.16, 0.07, dark, 0, -0.13, 0.06); // straight box mag
  mag.name = 'mag';
  const grp = grip(0.05, 0.13, 0.06, dark, 0, -0.11, 0.16);
  return model([receiver, barrel, handguard, frontSight, stockTop, stockBot, stockEnd, mag, grp, muzzleAt(-0.72, 0.02)]);
}

/** ASSAULT-X — heavy assault rifle, large receiver, thick barrel, dual vents. */
export function buildAssaultX(tier: RenderTier): THREE.Group {
  const body = metal(COL.titanium, tier);
  const dark = metal(COL.matteBlack, tier);
  const hot = accent(ACCENT.orange, tier);
  const receiver = box(0.12, 0.12, 0.4, body, 0, 0, 0.02); // large chunky receiver
  const barrel = cylZ(0.04, 0.4, dark, 0, 0.01, -0.34); // thick barrel
  const shroud = box(0.1, 0.09, 0.2, body, 0, 0.01, -0.24);
  const ventL = finStack(4, 0.04, 0.02, 0.08, hot, -0.065, 0.02, -0.18); // dual cooling vents
  const ventR = finStack(4, 0.04, 0.02, 0.08, hot, 0.065, 0.02, -0.18);
  const mag = box(0.09, 0.22, 0.13, dark, 0, -0.18, 0.06); // large magazine
  mag.name = 'mag';
  const grp = grip(0.07, 0.15, 0.08, dark, 0, -0.14, 0.18);
  const stock = box(0.08, 0.1, 0.16, body, 0, -0.01, 0.3);
  const optic = box(0.05, 0.04, 0.14, hot, 0, 0.1, 0.02);
  return model([receiver, barrel, shroud, ventL, ventR, mag, grp, stock, optic, muzzleAt(-0.56, 0.01)]);
}
