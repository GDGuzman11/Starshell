/**
 * MG family — NOVA SMG, SIEGE LMG, RIPPER. The SMG is a stubby bullpup with a fat
 * shroud; the LMG is a wide drum-fed beast with a carry handle + bipod; the Ripper
 * is a brutalist rotary cannon with a spinning barrel cluster + gears + pistons.
 * Muzzle toward −Z. The Ripper's barrel cluster is named 'spin' for the animator.
 */
import * as THREE from 'three';
import type { RenderTier } from '../materials';
import { ACCENT, COL, accent, box, cylX, cylZ, finStack, grip, metal, model } from './parts';

function muzzleAt(z: number, y = 0): THREE.Object3D {
  const o = new THREE.Object3D();
  o.name = 'muzzle';
  o.position.set(0, y, z);
  return o;
}

/** NOVA SMG — bullpup, short, with a large suppressor-style barrel shroud. */
export function buildNovaSMG(tier: RenderTier): THREE.Group {
  const body = metal(COL.gunmetal, tier);
  const dark = metal(COL.matteBlack, tier);
  const hot = accent(ACCENT.red, tier);
  const shell = box(0.09, 0.12, 0.34, body, 0, 0, 0.04); // compact bullpup shell
  const shroud = cylZ(0.05, 0.26, dark, 0, 0.02, -0.24); // fat suppressor shroud
  shroud.name = 'base:barrel';
  const shroudRib = finStack(3, 0.06, 0.11, 0.005, body, 0, 0.02, -0.16);
  shroudRib.name = 'base:cooling';
  const mag = box(0.06, 0.16, 0.09, dark, 0, -0.12, 0.16); // magazine BEHIND grip (bullpup)
  mag.name = 'mag';
  const grp = grip(0.06, 0.13, 0.07, dark, 0, -0.11, 0.0);
  const stock = box(0.07, 0.1, 0.05, body, 0, 0.0, 0.22); // compact stock
  stock.name = 'base:stability';
  const eye = box(0.03, 0.03, 0.03, hot, 0, 0.08, 0.06);
  return model([shell, shroud, shroudRib, mag, grp, stock, eye, muzzleAt(-0.4, 0.02)]);
}

/** SIEGE LMG — massive, very thick barrel, drum mag, carry handle, bipod. */
export function buildSiegeLMG(tier: RenderTier): THREE.Group {
  const body = metal(COL.olive, tier);
  const dark = metal(COL.matteBlack, tier);
  const warn = accent(ACCENT.red, tier, 1.2);
  const receiver = box(0.16, 0.14, 0.42, body, 0, 0, 0.04); // wide receiver
  const barrel = cylZ(0.05, 0.5, dark, 0, 0.02, -0.36); // very thick barrel
  barrel.name = 'base:barrel';
  const barrelFins = finStack(5, 0.05, 0.13, 0.13, dark, 0, 0.02, -0.2);
  barrelFins.name = 'base:cooling';
  const drum = cylX(0.13, 0.08, dark, 0, -0.16, 0.06); // drum magazine
  drum.name = 'mag';
  const drumFace = cylX(0.09, 0.082, warn, 0, -0.16, 0.06);
  drumFace.name = 'mag';
  // carry handle: arch over the top
  const handleTop = box(0.04, 0.025, 0.2, body, 0, 0.14, 0.02);
  const handleF = box(0.04, 0.06, 0.03, body, 0, 0.11, -0.08);
  const handleB = box(0.04, 0.06, 0.03, body, 0, 0.11, 0.12);
  // bipod legs near the muzzle
  const legL = box(0.015, 0.16, 0.015, dark, -0.06, -0.12, -0.42);
  legL.rotation.z = 0.4;
  const legR = box(0.015, 0.16, 0.015, dark, 0.06, -0.12, -0.42);
  legR.rotation.z = -0.4;
  const grp = grip(0.08, 0.15, 0.09, dark, 0, -0.14, 0.2);
  return model([receiver, barrel, barrelFins, drum, drumFace, handleTop, handleF, handleB, legL, legR, grp, muzzleAt(-0.62, 0.02)]);
}

/** RIPPER — brutalist rotary cannon, spinning barrel cluster, gears, pistons. */
export function buildRipper(tier: RenderTier): THREE.Group {
  const body = metal(COL.burntSteel, tier);
  const dark = metal(COL.matteBlack, tier);
  const steel = metal(COL.steel, tier, 0.4, 0.95);
  const hot = accent(ACCENT.orange, tier);
  const block = box(0.16, 0.16, 0.3, body, 0, 0, 0.1); // brutalist body block
  const gearL = cylX(0.09, 0.03, steel, -0.085, 0, 0.06); // visible gears
  const gearR = cylX(0.09, 0.03, steel, 0.085, 0, 0.06);
  const pistonT = cylZ(0.018, 0.3, steel, 0, 0.09, -0.08); // hydraulic pistons
  const pistonB = cylZ(0.018, 0.3, steel, 0, -0.09, -0.08);
  // rotating barrel cluster (6 barrels in a ring around Z) — named 'spin'
  const spin = new THREE.Group();
  spin.name = 'spin';
  const hub = cylZ(0.05, 0.3, dark, 0, 0, -0.14);
  spin.add(hub);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    spin.add(cylZ(0.022, 0.34, steel, Math.cos(a) * 0.06, Math.sin(a) * 0.06, -0.16));
  }
  spin.position.set(0, 0.01, 0);
  const muzzleRing = cylZ(0.1, 0.04, hot, 0, 0.01, -0.32);
  const grp = grip(0.08, 0.16, 0.09, dark, 0, -0.15, 0.24);
  const ammoBox = box(0.1, 0.12, 0.12, dark, 0.12, -0.08, 0.18);
  ammoBox.name = 'mag';
  return model([block, gearL, gearR, pistonT, pistonB, spin, muzzleRing, grp, ammoBox, muzzleAt(-0.34, 0.01)]);
}
