/**
 * PREMIUM ARSENAL — the prestige tier. Each Premium weapon is a benchmark of human
 * military engineering: an unmistakable silhouette, VISIBLE mechanical systems, and
 * parts that are mechanically ALIVE in the preview (rings named `spin` counter-rotate,
 * reactor conduits/vents named `glow`/`coil` pulse). Primitives only, zero assets,
 * muzzle toward −Z — same rules as the rest of the arsenal.
 *
 * APX-01 "REVENANT" is the FIRST benchmark (Apex tier): an exposed fusion reactor core
 * feeding twin magnetic rails, wrapped in counter-rotating plasma-containment rings,
 * flanked by articulated cooling fins and heavy industrial armor plating.
 *
 * Imported ONLY by the /arcade chunk.
 */
import * as THREE from 'three';
import type { RenderTier } from '../materials';
import { COL, accent, box, coneZ, cylX, cylZ, finStack, grip, metal, model } from './parts';

const PLASMA = 0x7fdfff; // Revenant's plasma cyan-white signature

/** A hollow octagon ring in the XY plane (around the −Z barrel axis), built from
 *  segment bars + glowing vanes so its rotation reads. Tagged `spin` so the preview
 *  turntable counter-rotates it. */
function containmentRing(r: number, z: number, body: THREE.Material, glow: THREE.Material, seg = 8): THREE.Group {
  const g = new THREE.Group();
  g.name = 'spin';
  g.position.set(0, 0.02, z);
  const segLen = 2 * r * Math.sin(Math.PI / seg) * 1.08;
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    const b = box(segLen, 0.02, 0.024, body, Math.cos(a) * r, Math.sin(a) * r, 0);
    b.rotation.z = a + Math.PI / 2;
    g.add(b);
  }
  // three glowing vanes (unequal spacing) make the spin unmistakable
  for (const a of [0, 2.2, 4.3]) {
    g.add(box(0.018, 0.05, 0.02, glow, Math.cos(a) * r, Math.sin(a) * r, 0));
  }
  return g;
}

/** APX-01 "REVENANT" — Apex-tier premium assault rifle. */
export function buildAPX01Revenant(tier: RenderTier): THREE.Group {
  const body = metal(COL.titanium, tier);
  const gun = metal(COL.gunmetal, tier);
  const dark = metal(COL.matteBlack, tier);
  const steel = metal(COL.steel, tier);
  const plasma = accent(PLASMA, tier, 1.9);
  const plasmaHot = accent(PLASMA, tier, 2.8);

  // ── REACTOR CORE (mid-body centerpiece) ──────────────────────────────────────
  const reactorHousing = box(0.18, 0.18, 0.28, gun, 0, 0.01, 0.06); // bulky armored core block
  const reactorTop = box(0.15, 0.03, 0.3, dark, 0, 0.11, 0.06); // top deck / rail base
  const reactorCore = cylX(0.052, 0.22, plasmaHot, 0, 0.02, 0.06); // exposed glowing core drum (across X)
  reactorCore.name = 'glow';
  const coreCapL = cylX(0.06, 0.03, steel, 0.11, 0.02, 0.06); // core end housings
  const coreCapR = cylX(0.06, 0.03, steel, -0.11, 0.02, 0.06);
  // side reactor windows (glow) — heat leaking through the plating
  const windowL = box(0.02, 0.09, 0.16, plasma, 0.092, 0.01, 0.06);
  windowL.name = 'glow';
  const windowR = box(0.02, 0.09, 0.16, plasma, -0.092, 0.01, 0.06);
  windowR.name = 'glow';

  // ── TWIN MAGNETIC RAILS + BARREL ─────────────────────────────────────────────
  const centerBarrel = cylZ(0.024, 0.56, dark, 0, 0.03, -0.32);
  const railL = box(0.022, 0.032, 0.52, steel, 0.06, 0.05, -0.28);
  const railR = box(0.022, 0.032, 0.52, steel, -0.06, 0.05, -0.28);
  const conduitL = box(0.01, 0.012, 0.48, plasma, 0.06, 0.072, -0.28); // glowing rail conduit
  conduitL.name = 'coil';
  const conduitR = box(0.01, 0.012, 0.48, plasma, -0.06, 0.072, -0.28);
  conduitR.name = 'coil';
  const muzzle = coneZ(0.055, 0.032, 0.09, gun, 0, 0.03, -0.58); // heavy muzzle brake
  const muzzleRing = cylZ(0.058, 0.02, plasmaHot, 0, 0.03, -0.6); // plasma emitter ring
  muzzleRing.name = 'glow';
  const muzzleAnchor = new THREE.Object3D();
  muzzleAnchor.name = 'muzzle';
  muzzleAnchor.position.set(0, 0.03, -0.64);

  // ── COUNTER-ROTATING PLASMA-CONTAINMENT RINGS (around the barrel) ─────────────
  const ring1 = containmentRing(0.082, -0.12, steel, plasmaHot); // hero ring (largest)
  const ring2 = containmentRing(0.07, -0.26, steel, plasma);
  const ring3 = containmentRing(0.06, -0.4, steel, plasma, 6);

  // ── ARTICULATED COOLING FINS (top of the shroud) ─────────────────────────────
  const fins = finStack(7, 0.03, 0.15, 0.07, steel, 0, 0.13, -0.02);

  // ── ARMOR PLATING / RECEIVER ─────────────────────────────────────────────────
  const plateL = box(0.022, 0.14, 0.26, body, 0.092, -0.01, 0.05);
  const plateR = box(0.022, 0.14, 0.26, body, -0.092, -0.01, 0.05);
  const optic = box(0.055, 0.045, 0.16, dark, 0, 0.155, 0.02); // heavy sight housing
  const opticLens = box(0.032, 0.032, 0.012, plasma, 0, 0.155, -0.06);
  opticLens.name = 'glow';

  // ── ENERGY CELL (magazine) ───────────────────────────────────────────────────
  const cell = box(0.1, 0.21, 0.14, dark, 0, -0.17, 0.1);
  cell.name = 'mag';
  const cellWindow = box(0.055, 0.15, 0.02, plasma, 0, -0.17, 0.18);
  cellWindow.name = 'glow';
  const cellCap = box(0.11, 0.03, 0.15, steel, 0, -0.28, 0.1);

  // ── GRIP + TRIGGER + ANGULAR ARMORED STOCK ───────────────────────────────────
  const grp = grip(0.072, 0.17, 0.085, dark, 0, -0.15, 0.21);
  const triggerGuard = box(0.05, 0.02, 0.09, dark, 0, -0.065, 0.17);
  const stock = box(0.095, 0.15, 0.24, body, 0, -0.01, 0.36);
  const stockStrut = box(0.03, 0.03, 0.18, steel, 0, 0.08, 0.34);
  const stockPad = box(0.075, 0.17, 0.035, dark, 0, -0.01, 0.49);

  return model([
    reactorHousing, reactorTop, reactorCore, coreCapL, coreCapR, windowL, windowR,
    centerBarrel, railL, railR, conduitL, conduitR, muzzle, muzzleRing, muzzleAnchor,
    ring1, ring2, ring3,
    fins,
    plateL, plateR, optic, opticLens,
    cell, cellWindow, cellCap,
    grp, triggerGuard, stock, stockStrut, stockPad,
  ]);
}
