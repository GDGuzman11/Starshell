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
import { COL, accent, box, capsuleZ, coilStack, coneZ, cylX, cylZ, finStack, grip, metal, model, ventSlats } from './parts';

const PLASMA = 0x7fdfff; // Revenant's plasma cyan-white signature

/** A muzzle anchor Object3D (for future viewmodel/fire wiring). */
function mzAnchor(z = -0.6, y = 0.02): THREE.Object3D {
  const o = new THREE.Object3D();
  o.name = 'muzzle';
  o.position.set(0, y, z);
  return o;
}

/** Tag a group AND its child meshes as `glow`/`coil` so the preview pulses every mesh
 *  (the animator collects by name + needs a real mesh material, which groups lack). */
function tagGlow(obj: THREE.Object3D, name: 'glow' | 'coil' = 'glow'): THREE.Object3D {
  obj.name = name;
  obj.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.name = name; });
  return obj;
}

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

// ══════════════════════════════════════════════════════════════════════════════
// The other nine — each a COMPLETELY different military research division: its own
// silhouette, its own visible engineering, its own moving mechanism (the `spin`
// group + `glow`/`coil` emissives the preview animates). No two share a mechanism.
// ══════════════════════════════════════════════════════════════════════════════

/** APX-02 "HYDRA" — exposed HYDRAULICS. Twin hydraulic rams + piston rods flank a
 *  stout receiver; a heavy pump flywheel turns and fluid conduits glow. */
export function buildAPX02Hydra(tier: RenderTier): THREE.Group {
  const gun = metal(COL.gunmetal, tier);
  const body = metal(COL.burntSteel, tier);
  const dark = metal(COL.matteBlack, tier);
  const steel = metal(COL.steel, tier);
  const gl = accent(0xff7a2a, tier, 2.2);

  const receiver = box(0.17, 0.16, 0.42, gun, 0, 0, 0.05);
  const barrel = cylZ(0.03, 0.52, dark, 0, 0.02, -0.3);
  const muzzle = box(0.1, 0.1, 0.1, steel, 0, 0.02, -0.55);
  const cylL = cylZ(0.046, 0.3, steel, 0.088, 0.07, -0.08); // hydraulic cylinders
  const cylR = cylZ(0.046, 0.3, steel, -0.088, 0.07, -0.08);
  const rodL = cylZ(0.02, 0.46, body, 0.088, 0.07, -0.22); // piston rods
  const rodR = cylZ(0.02, 0.46, body, -0.088, 0.07, -0.22);
  const fluidL = box(0.011, 0.011, 0.34, gl, 0.088, 0.11, -0.08); fluidL.name = 'coil';
  const fluidR = box(0.011, 0.011, 0.34, gl, -0.088, 0.11, -0.08); fluidR.name = 'coil';
  // heavy pump FLYWHEEL (forward-facing, spins) on the receiver flank
  const fw = new THREE.Group(); fw.name = 'spin'; fw.position.set(0.1, -0.01, 0.16);
  fw.add(cylZ(0.062, 0.03, steel, 0, 0, 0, 8));
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; fw.add(box(0.022, 0.05, 0.036, gl, Math.cos(a) * 0.035, Math.sin(a) * 0.035, 0.005)); }
  const gauge = cylZ(0.03, 0.02, gl, -0.096, 0.06, 0.14); gauge.name = 'glow';
  const mag = box(0.09, 0.2, 0.13, dark, 0, -0.16, 0.1); mag.name = 'mag';
  const grp = grip(0.07, 0.16, 0.08, dark, 0, -0.14, 0.2);
  const guard = box(0.05, 0.02, 0.09, dark, 0, -0.065, 0.16);
  const stock = box(0.09, 0.14, 0.2, body, 0, -0.01, 0.34);
  const pad = box(0.075, 0.16, 0.03, dark, 0, -0.01, 0.46);

  return model([receiver, barrel, muzzle, cylL, cylR, rodL, rodR, fluidL, fluidR, fw, gauge, mag, grp, guard, stock, pad, mzAnchor(-0.6)]);
}

/** APX-03 "CYCLONE" — articulated COOLING FINS + a forward turbine that spins to bleed
 *  heat during sustained fire. Radial fin stack, glowing intake. */
export function buildAPX03Cyclone(tier: RenderTier): THREE.Group {
  const gun = metal(COL.titanium, tier);
  const dark = metal(COL.matteBlack, tier);
  const steel = metal(COL.steel, tier);
  const gl = accent(0x63ff84, tier, 2.1);

  const receiver = box(0.14, 0.14, 0.4, gun, 0, 0, 0.06);
  const barrel = cylZ(0.032, 0.5, dark, 0, 0.03, -0.3);
  const shroud = cylZ(0.07, 0.3, steel, 0, 0.03, -0.22);
  // radial cooling fins down the shroud (thin discs)
  const fins = new THREE.Group();
  for (let i = 0; i < 8; i++) fins.add(cylZ(0.092, 0.012, steel, 0, 0.03, -0.08 - i * 0.036, 12));
  // forward TURBINE (spins) — a bladed disc at the barrel mouth
  const fan = new THREE.Group(); fan.name = 'spin'; fan.position.set(0, 0.03, -0.4);
  fan.add(cylZ(0.03, 0.02, steel, 0, 0, 0, 10));
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const bl = box(0.02, 0.07, 0.014, gl, Math.cos(a) * 0.05, Math.sin(a) * 0.05, 0); bl.rotation.z = a; fan.add(bl); }
  const intake = cylZ(0.05, 0.02, gl, 0, 0.03, -0.46); intake.name = 'glow';
  const vents = tagGlow(ventSlats(4, 0.03, 0.02, 0.02, gl, 0.075, 0.06, 0.06));
  const mag = box(0.08, 0.19, 0.11, dark, 0, -0.15, 0.12); mag.name = 'mag';
  const optic = box(0.05, 0.04, 0.14, dark, 0, 0.13, 0.04);
  const grp = grip(0.065, 0.15, 0.075, dark, 0, -0.13, 0.22);
  const stock = box(0.08, 0.12, 0.2, gun, 0, 0, 0.36);
  const pad = box(0.07, 0.14, 0.03, dark, 0, 0, 0.47);

  return model([receiver, barrel, shroud, fins, fan, intake, vents, mag, optic, grp, stock, pad, mzAnchor(-0.5, 0.03)]);
}

/** APX-04 "BASTION" — massive RECOIL DAMPENERS. Twin spring/buffer towers at the rear,
 *  a huge muzzle brake, a spinning governor regulating the buffers. */
export function buildAPX04Bastion(tier: RenderTier): THREE.Group {
  const gun = metal(COL.gunmetal, tier);
  const body = metal(COL.titanium, tier);
  const dark = metal(COL.matteBlack, tier);
  const steel = metal(COL.steel, tier);
  const gl = accent(0x6ab0ff, tier, 2.0);

  const receiver = box(0.19, 0.17, 0.36, gun, 0, 0, 0.06);
  const barrel = cylZ(0.036, 0.46, dark, 0, 0.03, -0.28);
  const brake = box(0.12, 0.12, 0.12, steel, 0, 0.03, -0.5); // massive muzzle brake
  const brakeVent = ventSlats(3, 0.035, 0.11, 0.02, dark, 0, 0.06, -0.5);
  // twin recoil BUFFER towers at the rear (glowing coil springs)
  const buffL = cylZ(0.04, 0.26, steel, 0.075, 0.11, 0.26);
  const buffR = cylZ(0.04, 0.26, steel, -0.075, 0.11, 0.26);
  const springL = tagGlow(coilStack(6, 0.035, 0.03, gl, 0.075, 0.11, 0.16), 'coil');
  const springR = tagGlow(coilStack(6, 0.035, 0.03, gl, -0.075, 0.11, 0.16), 'coil');
  // spinning GOVERNOR disc (regulates the buffers)
  const gov = new THREE.Group(); gov.name = 'spin'; gov.position.set(0, 0.14, 0.06);
  gov.add(cylZ(0.05, 0.024, steel, 0, 0, 0, 6));
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; gov.add(box(0.018, 0.06, 0.026, gl, Math.cos(a) * 0.04, Math.sin(a) * 0.04, 0)); }
  const mag = box(0.1, 0.18, 0.14, dark, 0, -0.16, 0.08); mag.name = 'mag';
  const grp = grip(0.075, 0.16, 0.085, dark, 0, -0.14, 0.2);
  const stock = box(0.14, 0.12, 0.14, body, 0, -0.02, 0.42);

  return model([receiver, barrel, brake, brakeVent, buffL, buffR, springL, springR, gov, mag, grp, stock, mzAnchor(-0.56, 0.03)]);
}

/** APX-05 "AEGIS" — MECHANICAL SHUTTERS. A rotating iris shutter seals the bore between
 *  shots; sliding shutter plates over the receiver; glowing aperture. */
export function buildAPX05Aegis(tier: RenderTier): THREE.Group {
  const gun = metal(COL.titanium, tier);
  const dark = metal(COL.matteBlack, tier);
  const steel = metal(COL.steel, tier);
  const gl = accent(0xb15cff, tier, 2.2);

  const receiver = box(0.13, 0.14, 0.42, gun, 0, 0, 0.05);
  const barrel = cylZ(0.03, 0.5, dark, 0, 0.03, -0.3);
  const shroud = box(0.11, 0.11, 0.3, steel, 0, 0.03, -0.24); // armored barrel housing
  // sliding shutter plates (stacked panels)
  const shutters = new THREE.Group();
  for (let i = 0; i < 4; i++) shutters.add(box(0.12, 0.018, 0.06, dark, 0, 0.09 - i * 0.001, -0.14 - i * 0.06));
  // rotating IRIS shutter at the muzzle (overlapping blades, spins)
  const iris = new THREE.Group(); iris.name = 'spin'; iris.position.set(0, 0.03, -0.42);
  iris.add(cylZ(0.065, 0.018, steel, 0, 0, 0, 12));
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const bl = box(0.05, 0.016, 0.02, dark, Math.cos(a) * 0.03, Math.sin(a) * 0.03, 0.006); bl.rotation.z = a + 0.5; iris.add(bl); }
  const aperture = cylZ(0.022, 0.02, gl, 0, 0.03, -0.44); aperture.name = 'glow';
  const optic = box(0.05, 0.05, 0.18, dark, 0, 0.14, 0.02);
  const lens = box(0.03, 0.03, 0.012, gl, 0, 0.14, -0.06); lens.name = 'glow';
  const mag = box(0.08, 0.18, 0.11, dark, 0, -0.15, 0.1); mag.name = 'mag';
  const grp = grip(0.065, 0.15, 0.075, dark, 0, -0.13, 0.2);
  const stock = box(0.08, 0.13, 0.2, gun, 0, -0.01, 0.34);
  const pad = box(0.07, 0.15, 0.03, dark, 0, -0.01, 0.45);

  return model([receiver, barrel, shroud, shutters, iris, aperture, optic, lens, mag, grp, stock, pad, mzAnchor(-0.46, 0.03)]);
}

/** APX-06 "SCAVENGER" — exposed AMMUNITION systems. A rotary drum with visible rounds on
 *  an open track; the drum spins and the chambers glow. */
export function buildAPX06Scavenger(tier: RenderTier): THREE.Group {
  const gun = metal(COL.olive, tier);
  const dark = metal(COL.matteBlack, tier);
  const steel = metal(COL.steel, tier);
  const brass = metal(COL.bronze, tier);
  const gl = accent(0xffc24a, tier, 2.1);

  const receiver = box(0.15, 0.14, 0.36, gun, 0, 0.01, 0.08);
  const barrel = cylZ(0.03, 0.48, dark, 0, 0.04, -0.28);
  const shroud = cylZ(0.05, 0.2, steel, 0, 0.04, -0.2);
  // exposed rotary DRUM with visible cartridges around the rim (forward-facing, spins)
  const drum = new THREE.Group(); drum.name = 'spin'; drum.position.set(0, -0.02, 0.1);
  drum.add(cylZ(0.12, 0.09, steel, 0, 0, 0, 16));
  drum.add(cylZ(0.075, 0.1, dark, 0, 0, 0, 14));
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; drum.add(cylZ(0.014, 0.11, brass, Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0, 8)); const led = box(0.02, 0.02, 0.02, gl, Math.cos(a) * 0.1, Math.sin(a) * 0.1, -0.06); led.name = 'glow'; drum.add(led); }
  const feed = box(0.03, 0.05, 0.14, steel, 0.06, 0.0, 0.0); // feed track to the receiver
  const optic = box(0.05, 0.04, 0.13, dark, 0, 0.13, 0.06);
  const grp = grip(0.07, 0.15, 0.08, dark, 0, -0.13, 0.22);
  const stock = box(0.09, 0.13, 0.18, gun, 0, 0.0, 0.34);
  const pad = box(0.075, 0.15, 0.03, dark, 0, 0.0, 0.44);

  return model([receiver, barrel, shroud, drum, feed, optic, grp, stock, pad, mzAnchor(-0.5, 0.04)]);
}

/** APX-07 "IRONCLAD" — heavy INDUSTRIAL ARMOR PLATING. A riveted, bunker-like slab body;
 *  a shifting armor gear and glowing seams. */
export function buildAPX07Ironclad(tier: RenderTier): THREE.Group {
  const gun = metal(COL.burntSteel, tier);
  const body = metal(COL.gunmetal, tier);
  const dark = metal(COL.matteBlack, tier);
  const steel = metal(COL.steel, tier);
  const gl = accent(0xff3a48, tier, 2.0);

  const core = box(0.18, 0.18, 0.44, dark, 0, 0, 0.04);
  const plateTop = box(0.2, 0.05, 0.4, gun, 0, 0.11, 0.04); // heavy slabs
  const plateL = box(0.05, 0.2, 0.4, body, 0.11, 0, 0.04);
  const plateR = box(0.05, 0.2, 0.4, body, -0.11, 0, 0.04);
  const plateFront = box(0.2, 0.2, 0.05, gun, 0, 0, -0.18);
  // rivets (small studs)
  const rivets = new THREE.Group();
  for (const [x, y, z] of [[0.11, 0.08, -0.1], [-0.11, 0.08, -0.1], [0.11, -0.08, -0.1], [-0.11, -0.08, -0.1], [0.11, 0.08, 0.2], [-0.11, 0.08, 0.2]] as [number, number, number][]) rivets.add(cylZ(0.012, 0.03, steel, x, y, z, 6));
  const barrel = cylZ(0.04, 0.34, dark, 0, 0.0, -0.34);
  const muzzle = box(0.11, 0.11, 0.08, steel, 0, 0.0, -0.5);
  const seamT = box(0.02, 0.012, 0.4, gl, 0, 0.135, 0.04); seamT.name = 'coil';
  const seamS = box(0.012, 0.14, 0.02, gl, 0.135, 0, -0.1); seamS.name = 'coil';
  // shifting armor GEAR (spins) on the flank
  const gear = new THREE.Group(); gear.name = 'spin'; gear.position.set(0.12, 0.06, 0.22);
  gear.add(cylZ(0.045, 0.03, steel, 0, 0, 0, 8));
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; gear.add(box(0.016, 0.016, 0.03, gl, Math.cos(a) * 0.05, Math.sin(a) * 0.05, 0)); }
  const mag = box(0.1, 0.18, 0.14, dark, 0, -0.17, 0.08); mag.name = 'mag';
  const grp = grip(0.078, 0.16, 0.088, dark, 0, -0.15, 0.2);
  const stock = box(0.12, 0.16, 0.16, gun, 0, -0.01, 0.4);

  return model([core, plateTop, plateL, plateR, plateFront, rivets, barrel, muzzle, seamT, seamS, gear, mag, grp, stock, mzAnchor(-0.54, 0)]);
}

/** APX-08 "GYRE" — moving STABILIZATION ARMS + a spinning gyroscope rotor that cancels
 *  recoil; deploying gimbal arms, glowing rotor hub. */
export function buildAPX08Gyre(tier: RenderTier): THREE.Group {
  const gun = metal(COL.titanium, tier);
  const dark = metal(COL.matteBlack, tier);
  const steel = metal(COL.steel, tier);
  const gl = accent(0x49a6ff, tier, 2.2);

  const receiver = capsuleZ(0.075, 0.34, gun, 0, 0.02, 0.06); // sleek rounded body
  const barrel = cylZ(0.026, 0.5, dark, 0, 0.03, -0.3);
  const shroud = cylZ(0.05, 0.24, steel, 0, 0.03, -0.24);
  // GYROSCOPE rotor (forward-facing ring gimbal, spins)
  const gyro = new THREE.Group(); gyro.name = 'spin'; gyro.position.set(0, 0.02, 0.02);
  gyro.add(cylZ(0.09, 0.016, steel, 0, 0, 0, 20)); // outer ring disc
  gyro.add(cylZ(0.055, 0.02, dark, 0, 0, 0, 16));
  const hub = cylZ(0.028, 0.03, gl, 0, 0, 0.005); hub.name = 'glow'; gyro.add(hub);
  for (let i = 0; i < 2; i++) { const a = i * Math.PI; gyro.add(box(0.02, 0.05, 0.02, gl, Math.cos(a) * 0.075, Math.sin(a) * 0.075, 0)); }
  // deploying stabilization ARMS (angled struts)
  const armL = box(0.02, 0.02, 0.14, steel, 0.07, -0.02, -0.02); armL.rotation.z = 0.5;
  const armR = box(0.02, 0.02, 0.14, steel, -0.07, -0.02, -0.02); armR.rotation.z = -0.5;
  const optic = box(0.045, 0.04, 0.13, dark, 0, 0.11, 0.04);
  const mag = box(0.075, 0.18, 0.11, dark, 0, -0.14, 0.14); mag.name = 'mag';
  const grp = grip(0.062, 0.15, 0.072, dark, 0, -0.12, 0.24);
  const stock = box(0.075, 0.11, 0.2, gun, 0, 0.0, 0.36);
  const pad = box(0.065, 0.13, 0.03, dark, 0, 0.0, 0.47);

  return model([receiver, barrel, shroud, gyro, armL, armR, optic, mag, grp, stock, pad, mzAnchor(-0.5, 0.03)]);
}

/** APX-09 "VULCAN" — PRESSURE VALVES / steam release. Reaction vessels with a turning
 *  valve wheel and glowing gauges; exhaust ports. */
export function buildAPX09Vulcan(tier: RenderTier): THREE.Group {
  const gun = metal(COL.burntSteel, tier);
  const dark = metal(COL.matteBlack, tier);
  const steel = metal(COL.steel, tier);
  const brass = metal(COL.bronze, tier);
  const gl = accent(0xff5a2a, tier, 2.2);

  const receiver = box(0.15, 0.15, 0.38, gun, 0, 0, 0.06);
  const barrel = cylZ(0.032, 0.48, dark, 0, 0.03, -0.28);
  // pressure VESSEL (rounded tank) on top
  const vessel = capsuleZ(0.06, 0.16, steel, 0, 0.12, 0.02);
  const vesselBand = cylZ(0.065, 0.02, brass, 0, 0.12, 0.02, 14);
  const gaugeGlow = cylZ(0.026, 0.02, gl, 0, 0.12, -0.12); gaugeGlow.name = 'glow';
  // turning VALVE WHEEL (forward-facing cross handle, spins)
  const valve = new THREE.Group(); valve.name = 'spin'; valve.position.set(0.098, 0.04, 0.1);
  valve.add(cylZ(0.05, 0.016, brass, 0, 0, 0, 14));
  valve.add(box(0.1, 0.016, 0.016, brass, 0, 0, 0));
  valve.add(box(0.016, 0.1, 0.016, brass, 0, 0, 0));
  const hub = cylZ(0.016, 0.02, gl, 0, 0, 0.006); hub.name = 'glow'; valve.add(hub);
  const exhaust = tagGlow(ventSlats(3, 0.03, 0.02, 0.02, gl, -0.088, 0.06, 0.06), 'coil');
  const mag = box(0.09, 0.19, 0.12, dark, 0, -0.16, 0.1); mag.name = 'mag';
  const grp = grip(0.07, 0.16, 0.08, dark, 0, -0.14, 0.2);
  const stock = box(0.1, 0.13, 0.18, gun, 0, -0.01, 0.36);
  const pad = box(0.08, 0.15, 0.03, dark, 0, -0.01, 0.46);

  return model([receiver, barrel, vessel, vesselBand, gaugeGlow, valve, exhaust, mag, grp, stock, pad, mzAnchor(-0.5, 0.03)]);
}

/** APX-10 "TESLA" — a stacked electromagnetic COIL COLUMN accelerating the slug. Long coil
 *  barrel that pulses, a spinning charge ring, glowing capacitor. The apex charge rifle. */
export function buildAPX10Tesla(tier: RenderTier): THREE.Group {
  const gun = metal(COL.gunmetal, tier);
  const body = metal(COL.titanium, tier);
  const dark = metal(COL.matteBlack, tier);
  const steel = metal(COL.steel, tier);
  const gl = accent(0x9ad8ff, tier, 2.6);

  const receiver = box(0.14, 0.15, 0.34, gun, 0, 0, 0.08);
  const spine = cylZ(0.022, 0.6, dark, 0, 0.05, -0.28); // the rail the slug rides
  // stacked electromagnetic COILS down the barrel (pulse)
  const coils = tagGlow(coilStack(9, 0.052, 0.06, gl, 0, 0.05, -0.06), 'coil');
  const coilCore = new THREE.Group();
  for (let i = 0; i < 9; i++) coilCore.add(cylZ(0.04, 0.026, steel, 0, 0.05, -0.06 - i * 0.052, 12));
  // spinning CHARGE RING at the breech (forward-facing)
  const chargeRing = new THREE.Group(); chargeRing.name = 'spin'; chargeRing.position.set(0, 0.05, 0.12);
  chargeRing.add(cylZ(0.08, 0.02, steel, 0, 0, 0, 16));
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; chargeRing.add(box(0.016, 0.04, 0.024, gl, Math.cos(a) * 0.06, Math.sin(a) * 0.06, 0)); }
  // capacitor block (glow)
  const cap = box(0.1, 0.11, 0.14, dark, 0, -0.02, 0.2);
  const capGlow = box(0.06, 0.07, 0.02, gl, 0, -0.02, 0.28); capGlow.name = 'glow';
  const muzzleGlow = cylZ(0.05, 0.02, gl, 0, 0.05, -0.56); muzzleGlow.name = 'glow';
  const mag = box(0.08, 0.17, 0.11, dark, 0, -0.15, 0.06); mag.name = 'mag';
  const grp = grip(0.066, 0.15, 0.076, dark, 0, -0.13, 0.18);
  const stock = box(0.085, 0.12, 0.18, body, 0, -0.0, 0.32);
  const pad = box(0.07, 0.14, 0.03, dark, 0, -0.0, 0.42);

  return model([receiver, spine, coils, coilCore, chargeRing, cap, capGlow, muzzleGlow, mag, grp, stock, pad, mzAnchor(-0.6, 0.05)]);
}

// ══════════════════════════════════════════════════════════════════════════════
// PREMIUM MACHINE GUNS (Apex tier) — humanity's finest suppression hardware. The
// first benchmark below establishes the standard; the other nine will never share
// its silhouette, mechanism, or feed philosophy.
// ══════════════════════════════════════════════════════════════════════════════

/** A forward-facing FEED SPROCKET (spins) — a toothed wheel with brass rounds seated
 *  between the teeth and a glowing hub, where a belt enters the receiver. */
function feedSprocket(x: number, y: number, z: number, steel: THREE.Material, brass: THREE.Material, gl: THREE.Material): THREE.Group {
  const g = new THREE.Group(); g.name = 'spin'; g.position.set(x, y, z);
  g.add(cylZ(0.05, 0.05, steel, 0, 0, 0, 12)); // hub
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const tooth = box(0.018, 0.03, 0.055, steel, Math.cos(a) * 0.058, Math.sin(a) * 0.058, 0); tooth.rotation.z = a; g.add(tooth);
    g.add(cylZ(0.012, 0.062, brass, Math.cos(a) * 0.05, Math.sin(a) * 0.05, 0, 6)); // seated round
  }
  const hub = cylZ(0.02, 0.055, gl, 0, 0, 0.004); hub.name = 'glow'; g.add(hub);
  return g;
}

/** APX-M1 "LEVIATHAN" — a TWIN-FEED SUPPRESSION PLATFORM. Two exposed ammunition belts
 *  feed converging oscillating sprockets into a dual-chamber receiver under a massive
 *  ribbed cooling jacket; twin recoil pistons ride the top; a folded bipod hangs beneath.
 *  Suppression through sustained fire, not raw damage. Molten-amber reactor accent. */
export function buildAPXM1Leviathan(tier: RenderTier): THREE.Group {
  const gun = metal(COL.gunmetal, tier);
  const body = metal(COL.olive, tier);
  const dark = metal(COL.matteBlack, tier);
  const steel = metal(COL.steel, tier);
  const brass = metal(COL.bronze, tier);
  const gl = accent(0xffa833, tier, 2.4);

  // ── DUAL-CHAMBER RECEIVER (wide, heavy core) ─────────────────────────────────
  const receiver = box(0.24, 0.2, 0.42, gun, 0, 0, 0.06);
  const receiverTop = box(0.16, 0.04, 0.36, dark, 0, 0.12, 0.04);
  const carry = box(0.045, 0.055, 0.14, dark, 0, 0.18, 0.0); // top carry handle
  const chamber = box(0.07, 0.07, 0.16, gl, 0, 0.03, 0.08); chamber.name = 'glow'; // glowing dual chamber
  const reactorHum = cylX(0.03, 0.24, gl, 0, -0.02, 0.1); reactorHum.name = 'coil'; // reactor hum underneath

  // ── MASSIVE RIBBED COOLING JACKET + BARREL ───────────────────────────────────
  const barrel = cylZ(0.05, 0.62, dark, 0, 0.02, -0.36);
  const jacket = cylZ(0.09, 0.44, steel, 0, 0.02, -0.32);
  const ribs = new THREE.Group();
  for (let i = 0; i < 6; i++) ribs.add(cylZ(0.11, 0.016, steel, 0, 0.02, -0.14 - i * 0.06, 16));
  const jacketVentL = tagGlow(ventSlats(4, 0.055, 0.02, 0.02, gl, 0.092, 0.06, -0.24), 'coil');
  const jacketVentR = tagGlow(ventSlats(4, 0.055, 0.02, 0.02, gl, -0.092, 0.06, -0.24), 'coil');
  const brake = box(0.15, 0.15, 0.13, steel, 0, 0.02, -0.64); // massive muzzle brake
  const brakeSlot = ventSlats(3, 0.04, 0.14, 0.02, dark, 0, 0.05, -0.64);

  // ── TWIN BELT FEEDS (exposed ammunition, both flanks) ────────────────────────
  const boxL = box(0.11, 0.17, 0.2, body, 0.2, -0.06, 0.14); // ammo box (left)
  const boxR = box(0.11, 0.17, 0.2, body, -0.2, -0.06, 0.14);
  const beltL = new THREE.Group();
  const beltR = new THREE.Group();
  for (let i = 0; i < 5; i++) { // belt links arcing from each box into the sprockets
    const t = i / 4;
    beltL.add(box(0.03, 0.045, 0.03, brass, 0.18 - t * 0.06, 0.02 - t * 0.0, 0.02 - t * 0.02));
    beltR.add(box(0.03, 0.045, 0.03, brass, -0.18 + t * 0.06, 0.02 - t * 0.0, 0.02 - t * 0.02));
  }
  const sprocketL = feedSprocket(0.115, 0.02, -0.02, steel, brass, gl);
  const sprocketR = feedSprocket(-0.115, 0.02, -0.02, steel, brass, gl);

  // ── TWIN RECOIL PISTONS (top) ────────────────────────────────────────────────
  const pistL = cylZ(0.03, 0.36, steel, 0.055, 0.14, -0.06);
  const pistR = cylZ(0.03, 0.36, steel, -0.055, 0.14, -0.06);
  const rodL = cylZ(0.014, 0.4, gun, 0.055, 0.14, -0.16);
  const rodR = cylZ(0.014, 0.4, gun, -0.055, 0.14, -0.16);

  // ── FOLDED BIPOD (deploying stabilizer legs, stowed) ─────────────────────────
  const legL = box(0.02, 0.02, 0.22, steel, 0.05, -0.11, -0.3); legL.rotation.x = 0.5;
  const legR = box(0.02, 0.02, 0.22, steel, -0.05, -0.11, -0.3); legR.rotation.x = 0.5;

  // ── GRIP + HEAVY STOCK ───────────────────────────────────────────────────────
  const grp = grip(0.082, 0.18, 0.092, dark, 0, -0.16, 0.22);
  const guard = box(0.055, 0.022, 0.1, dark, 0, -0.07, 0.18);
  const stock = box(0.13, 0.17, 0.24, body, 0, -0.02, 0.42);
  const stockPad = box(0.1, 0.19, 0.035, dark, 0, -0.02, 0.55);

  return model([
    receiver, receiverTop, carry, chamber, reactorHum,
    barrel, jacket, ribs, jacketVentL, jacketVentR, brake, brakeSlot,
    boxL, boxR, beltL, beltR, sprocketL, sprocketR,
    pistL, pistR, rodL, rodR,
    legL, legR,
    grp, guard, stock, stockPad,
    mzAnchor(-0.68, 0.02),
  ]);
}

// ── the other nine machine guns — each a different suppression philosophy ──────────

/** APX-M2 "MAELSTROM" — heavy ROTARY suppression platform: a six-barrel cluster spins up
 *  to a wall of fire, fed from a saddle drum. */
export function buildAPXM2Maelstrom(tier: RenderTier): THREE.Group {
  const gun = metal(COL.gunmetal, tier);
  const body = metal(COL.burntSteel, tier);
  const dark = metal(COL.matteBlack, tier);
  const steel = metal(COL.steel, tier);
  const gl = accent(0xff4a3a, tier, 2.3);

  const receiver = box(0.2, 0.19, 0.38, gun, 0, 0, 0.08);
  const motor = cylZ(0.09, 0.12, steel, 0, 0.02, -0.06); // spin-up motor housing
  const motorCore = cylZ(0.04, 0.13, gl, 0, 0.02, -0.06); motorCore.name = 'glow';
  // rotating six-barrel CLUSTER (spins around the bore axis)
  const cluster = new THREE.Group(); cluster.name = 'spin'; cluster.position.set(0, 0.02, -0.34);
  cluster.add(cylZ(0.07, 0.06, steel, 0, 0, 0.24, 12)); // front hub
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; cluster.add(cylZ(0.02, 0.56, dark, Math.cos(a) * 0.055, Math.sin(a) * 0.055, 0, 8)); const tip = cylZ(0.024, 0.03, gl, Math.cos(a) * 0.055, Math.sin(a) * 0.055, -0.28, 8); tip.name = 'glow'; cluster.add(tip); }
  const shroud = cylZ(0.1, 0.08, steel, 0, 0.02, -0.6); // muzzle shroud
  const drum = cylX(0.12, 0.14, body, 0, -0.05, 0.2); // saddle ammo drum
  const drumBand = cylX(0.125, 0.02, gl, 0, -0.05, 0.2); drumBand.name = 'coil';
  const grp = grip(0.08, 0.18, 0.09, dark, 0, -0.16, 0.24);
  const stock = box(0.12, 0.16, 0.2, body, 0, -0.02, 0.4);
  const legL = box(0.02, 0.02, 0.2, steel, 0.05, -0.11, -0.3); legL.rotation.x = 0.5;
  const legR = box(0.02, 0.02, 0.2, steel, -0.05, -0.11, -0.3); legR.rotation.x = 0.5;

  return model([receiver, motor, motorCore, cluster, shroud, drum, drumBand, grp, stock, legL, legR, mzAnchor(-0.64, 0.02)]);
}

/** APX-M3 "IGNIS" — industrial PLASMA-FED machine gun: a pressurized plasma reservoir
 *  feeds superheated cells through a cycling injector ring. No belt, no brass. */
export function buildAPXM3Ignis(tier: RenderTier): THREE.Group {
  const gun = metal(COL.titanium, tier);
  const dark = metal(COL.matteBlack, tier);
  const steel = metal(COL.steel, tier);
  const gl = accent(0xb15cff, tier, 2.5);

  const receiver = box(0.17, 0.17, 0.4, gun, 0, 0, 0.06);
  const barrel = cylZ(0.04, 0.56, dark, 0, 0.03, -0.32);
  const conduit = box(0.014, 0.014, 0.44, gl, 0, 0.075, -0.28); conduit.name = 'coil'; // plasma conduit
  // plasma RESERVOIR tank (under-slung, glowing)
  const tank = capsuleZ(0.075, 0.22, steel, 0, -0.12, 0.02);
  const tankWin = box(0.05, 0.05, 0.2, gl, 0, -0.12, 0.02); tankWin.name = 'glow';
  // cycling INJECTOR ring (spins) at the breech
  const inj = new THREE.Group(); inj.name = 'spin'; inj.position.set(0, 0.03, 0.02);
  inj.add(cylZ(0.07, 0.03, steel, 0, 0, 0, 8));
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const c = box(0.02, 0.03, 0.04, gl, Math.cos(a) * 0.05, Math.sin(a) * 0.05, 0); inj.add(c); }
  const muzzle = coneZ(0.06, 0.04, 0.1, steel, 0, 0.03, -0.6);
  const muzzleGlow = cylZ(0.05, 0.02, gl, 0, 0.03, -0.62); muzzleGlow.name = 'glow';
  const grp = grip(0.072, 0.16, 0.082, dark, 0, -0.15, 0.22);
  const stock = box(0.1, 0.14, 0.2, gun, 0, -0.01, 0.38);
  const pad = box(0.08, 0.16, 0.03, dark, 0, -0.01, 0.49);

  return model([receiver, barrel, conduit, tank, tankWin, inj, muzzle, muzzleGlow, grp, stock, pad, mzAnchor(-0.62, 0.03)]);
}

/** APX-M4 "BULWARK" — heavy ASSAULT CANNON: a reciprocating breech and rotating lock throw
 *  oversized rounds like artillery. Massively thick barrel + recoil sleeve. */
export function buildAPXM4Bulwark(tier: RenderTier): THREE.Group {
  const gun = metal(COL.gunmetal, tier);
  const body = metal(COL.burntSteel, tier);
  const dark = metal(COL.matteBlack, tier);
  const steel = metal(COL.steel, tier);
  const gl = accent(0xff7a2a, tier, 2.2);

  const receiver = box(0.22, 0.2, 0.36, gun, 0, 0, 0.08);
  const barrel = cylZ(0.07, 0.6, dark, 0, 0.03, -0.34);
  const sleeve = cylZ(0.11, 0.34, steel, 0, 0.03, -0.28); // recoil sleeve
  const brake = box(0.18, 0.18, 0.14, steel, 0, 0.03, -0.66);
  const brakeVent = ventSlats(3, 0.045, 0.16, 0.02, dark, 0, 0.07, -0.66);
  // reciprocating BREECH + rotating LOCK collar (spins)
  const breech = box(0.13, 0.13, 0.12, dark, 0, 0.03, 0.12);
  const breechGlow = box(0.05, 0.05, 0.13, gl, 0, 0.03, 0.12); breechGlow.name = 'glow';
  const lock = new THREE.Group(); lock.name = 'spin'; lock.position.set(0, 0.03, -0.02);
  lock.add(cylZ(0.09, 0.04, steel, 0, 0, 0, 8));
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; lock.add(box(0.03, 0.03, 0.05, gl, Math.cos(a) * 0.07, Math.sin(a) * 0.07, 0)); }
  const mag = box(0.12, 0.2, 0.16, body, 0, -0.18, 0.1); mag.name = 'mag';
  const grp = grip(0.085, 0.18, 0.095, dark, 0, -0.16, 0.22);
  const stock = box(0.14, 0.18, 0.2, body, 0, -0.02, 0.4);

  return model([receiver, barrel, sleeve, brake, brakeVent, breech, breechGlow, lock, mag, grp, stock, mzAnchor(-0.72, 0.03)]);
}

/** APX-M5 "MAGNETAR" — magnetic recoil STABILIZATION: the barrel floats inside a cage of
 *  rotating magnetic stabilizer rings that catch the recoil in the field. */
export function buildAPXM5Magnetar(tier: RenderTier): THREE.Group {
  const gun = metal(COL.titanium, tier);
  const dark = metal(COL.matteBlack, tier);
  const steel = metal(COL.steel, tier);
  const gl = accent(0x49a6ff, tier, 2.4);

  const receiver = box(0.16, 0.16, 0.4, gun, 0, 0, 0.08);
  const barrel = cylZ(0.03, 0.62, dark, 0, 0.03, -0.34); // slim floating barrel
  // suspension CAGE: four rotating magnetic rings around the barrel (spins)
  const cage = new THREE.Group(); cage.name = 'spin'; cage.position.set(0, 0.03, -0.28);
  for (let k = 0; k < 4; k++) {
    const z = k * 0.13;
    const seg = 10;
    for (let i = 0; i < seg; i++) { const a = (i / seg) * Math.PI * 2; const b = box(0.028, 0.016, 0.016, i % 2 ? gl : steel, Math.cos(a) * 0.075, Math.sin(a) * 0.075, z); b.rotation.z = a + Math.PI / 2; cage.add(b); }
  }
  const strutT = box(0.016, 0.016, 0.5, steel, 0, 0.11, -0.28); // frame struts holding the cage
  const strutB = box(0.016, 0.016, 0.5, steel, 0, -0.05, -0.28);
  const coilPack = tagGlow(coilStack(4, 0.04, 0.05, gl, 0, 0.03, 0.06), 'coil');
  const grp = grip(0.07, 0.16, 0.08, dark, 0, -0.15, 0.24);
  const stock = box(0.1, 0.13, 0.2, gun, 0, -0.01, 0.4);
  const pad = box(0.08, 0.15, 0.03, dark, 0, -0.01, 0.51);

  return model([receiver, barrel, cage, strutT, strutB, coilPack, grp, stock, pad, mzAnchor(-0.66, 0.03)]);
}

/** APX-M6 "SERVITOR" — servo-assisted support weapon: exposed servo motors and an
 *  articulated loader arm cycle ammunition with tireless mechanical precision. */
export function buildAPXM6Servitor(tier: RenderTier): THREE.Group {
  const gun = metal(COL.gunmetal, tier);
  const body = metal(COL.olive, tier);
  const dark = metal(COL.matteBlack, tier);
  const steel = metal(COL.steel, tier);
  const gl = accent(0x63ff84, tier, 2.2);

  const receiver = box(0.19, 0.17, 0.4, gun, 0, 0, 0.06);
  const barrel = cylZ(0.042, 0.56, dark, 0, 0.03, -0.32);
  const shroud = cylZ(0.07, 0.26, steel, 0, 0.03, -0.24);
  // exposed SERVO motors (drums with glow indicators)
  const servoL = cylX(0.05, 0.08, steel, 0.11, 0.06, 0.14);
  const servoR = cylX(0.05, 0.08, steel, -0.11, 0.06, 0.14);
  const servoLg = cylX(0.02, 0.085, gl, 0.11, 0.06, 0.14); servoLg.name = 'glow';
  const servoRg = cylX(0.02, 0.085, gl, -0.11, 0.06, 0.14); servoRg.name = 'glow';
  // articulated LOADER ARM (mid-cycle, angled)
  const arm1 = box(0.025, 0.025, 0.14, steel, 0.09, -0.02, 0.08); arm1.rotation.z = 0.6;
  const arm2 = box(0.022, 0.022, 0.1, steel, 0.13, -0.08, 0.04); arm2.rotation.z = -0.3;
  // servo GEARTRAIN (spins)
  const gear = new THREE.Group(); gear.name = 'spin'; gear.position.set(-0.1, 0.0, 0.02);
  gear.add(cylZ(0.05, 0.03, steel, 0, 0, 0, 10));
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; gear.add(box(0.014, 0.014, 0.03, gl, Math.cos(a) * 0.055, Math.sin(a) * 0.055, 0)); }
  const mag = box(0.09, 0.19, 0.13, dark, 0, -0.16, 0.1); mag.name = 'mag';
  const grp = grip(0.078, 0.17, 0.088, dark, 0, -0.15, 0.22);
  const stock = box(0.11, 0.15, 0.2, body, 0, -0.02, 0.4);

  return model([receiver, barrel, shroud, servoL, servoR, servoLg, servoRg, arm1, arm2, gear, mag, grp, stock, mzAnchor(-0.62, 0.03)]);
}

/** APX-M7 "KILN" — adaptive cooling platform: a colossal rotating cooling drum + deploying
 *  fins dump heat continuously so the barrel refuses to quit. */
export function buildAPXM7Kiln(tier: RenderTier): THREE.Group {
  const gun = metal(COL.titanium, tier);
  const dark = metal(COL.matteBlack, tier);
  const steel = metal(COL.steel, tier);
  const gl = accent(0x3ad8c0, tier, 2.3);

  const receiver = box(0.18, 0.17, 0.38, gun, 0, 0, 0.08);
  const barrel = cylZ(0.038, 0.58, dark, 0, 0.03, -0.34);
  // rotating COOLING DRUM around the barrel (spins) — thick finned cylinder
  const drum = new THREE.Group(); drum.name = 'spin'; drum.position.set(0, 0.03, -0.26);
  drum.add(cylZ(0.075, 0.36, steel, 0, 0, 0, 16));
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; const fin = box(0.014, 0.04, 0.34, gl, Math.cos(a) * 0.088, Math.sin(a) * 0.088, 0); fin.rotation.z = a; drum.add(fin); }
  const coolant = box(0.09, 0.1, 0.14, dark, 0, -0.12, 0.14); // coolant reservoir
  const coolantWin = box(0.05, 0.06, 0.15, gl, 0, -0.12, 0.14); coolantWin.name = 'glow';
  const grp = grip(0.076, 0.17, 0.086, dark, 0, -0.16, 0.22);
  const stock = box(0.11, 0.15, 0.2, gun, 0, -0.02, 0.4);
  const legL = box(0.02, 0.02, 0.2, steel, 0.05, -0.11, -0.34); legL.rotation.x = 0.5;
  const legR = box(0.02, 0.02, 0.2, steel, -0.05, -0.11, -0.34); legR.rotation.x = 0.5;

  return model([receiver, barrel, drum, coolant, coolantWin, grp, stock, legL, legR, mzAnchor(-0.66, 0.03)]);
}

/** APX-M8 "PILEDRIVER" — high-pressure KINETIC weapon: pneumatic accumulators pressurize
 *  between shots, driving a kinetic ram that hammers rounds downrange. */
export function buildAPXM8Piledriver(tier: RenderTier): THREE.Group {
  const gun = metal(COL.burntSteel, tier);
  const dark = metal(COL.matteBlack, tier);
  const steel = metal(COL.steel, tier);
  const brass = metal(COL.bronze, tier);
  const gl = accent(0xff5a2a, tier, 2.3);

  const receiver = box(0.19, 0.18, 0.4, gun, 0, 0, 0.06);
  const barrel = cylZ(0.05, 0.54, dark, 0, 0.02, -0.32);
  // pneumatic ACCUMULATOR tanks (twin capsules on top)
  const tankL = capsuleZ(0.045, 0.18, steel, 0.06, 0.13, -0.02);
  const tankR = capsuleZ(0.045, 0.18, steel, -0.06, 0.13, -0.02);
  const tankGl = box(0.14, 0.012, 0.16, gl, 0, 0.17, -0.02); tankGl.name = 'coil';
  // kinetic RAM (piston into the breech)
  const ram = cylZ(0.035, 0.24, brass, 0, 0.02, 0.16);
  // pressure REGULATOR wheel (spins)
  const reg = new THREE.Group(); reg.name = 'spin'; reg.position.set(0.1, 0.0, 0.1);
  reg.add(cylZ(0.05, 0.02, brass, 0, 0, 0, 12));
  reg.add(box(0.1, 0.016, 0.016, brass, 0, 0, 0));
  reg.add(box(0.016, 0.1, 0.016, brass, 0, 0, 0));
  const regHub = cylZ(0.016, 0.02, gl, 0, 0, 0.006); regHub.name = 'glow'; reg.add(regHub);
  const muzzle = box(0.12, 0.12, 0.1, steel, 0, 0.02, -0.58);
  const mag = box(0.1, 0.19, 0.13, dark, 0, -0.17, 0.1); mag.name = 'mag';
  const grp = grip(0.08, 0.17, 0.09, dark, 0, -0.16, 0.22);
  const stock = box(0.11, 0.15, 0.2, gun, 0, -0.02, 0.4);

  return model([receiver, barrel, tankL, tankR, tankGl, ram, reg, muzzle, mag, grp, stock, mzAnchor(-0.62, 0.02)]);
}

/** APX-M9 "DYNAMO" — belt-fed REACTOR machine gun: a spinning reactor turbine powers an
 *  open belt feed. Humanity's engine of suppression, laid bare. */
export function buildAPXM9Dynamo(tier: RenderTier): THREE.Group {
  const gun = metal(COL.gunmetal, tier);
  const body = metal(COL.olive, tier);
  const dark = metal(COL.matteBlack, tier);
  const steel = metal(COL.steel, tier);
  const brass = metal(COL.bronze, tier);
  const gl = accent(0xeaf2ff, tier, 2.6);

  const receiver = box(0.19, 0.18, 0.38, gun, 0, 0, 0.06);
  const barrel = cylZ(0.044, 0.56, dark, 0, 0.03, -0.32);
  const shroud = cylZ(0.07, 0.24, steel, 0, 0.03, -0.24);
  // reactor TURBINE (spins) — bladed disc with a white-hot core at the breech
  const turbine = new THREE.Group(); turbine.name = 'spin'; turbine.position.set(0, 0.03, 0.04);
  turbine.add(cylZ(0.08, 0.04, steel, 0, 0, 0, 16));
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const bl = box(0.03, 0.06, 0.02, steel, Math.cos(a) * 0.06, Math.sin(a) * 0.06, 0); bl.rotation.z = a + 0.4; turbine.add(bl); }
  const core = cylZ(0.032, 0.05, gl, 0, 0, 0.006); core.name = 'glow'; turbine.add(core);
  // open BELT feed (visible brass links from a box)
  const boxA = box(0.1, 0.15, 0.18, body, 0.16, -0.06, 0.16);
  const belt = new THREE.Group();
  for (let i = 0; i < 5; i++) { const t = i / 4; belt.add(box(0.03, 0.045, 0.03, brass, 0.14 - t * 0.05, 0.01, 0.06 - t * 0.02)); }
  const grp = grip(0.078, 0.17, 0.088, dark, 0, -0.15, 0.22);
  const stock = box(0.11, 0.15, 0.2, body, 0, -0.02, 0.4);

  return model([receiver, barrel, shroud, turbine, boxA, belt, grp, stock, mzAnchor(-0.62, 0.03)]);
}

/** APX-M10 "OVERLORD" — the apex flagship: concentric power-regulator rings and a wide
 *  industrial frame command the field through sheer sustained dominance. Gold markings. */
export function buildAPXM10Overlord(tier: RenderTier): THREE.Group {
  const gun = metal(COL.gunmetal, tier);
  const body = metal(COL.titanium, tier);
  const dark = metal(COL.matteBlack, tier);
  const steel = metal(COL.steel, tier);
  const gl = accent(0xffd27a, tier, 2.4);

  const receiver = box(0.26, 0.2, 0.42, gun, 0, 0, 0.06); // wide industrial frame
  const receiverTop = box(0.16, 0.04, 0.34, dark, 0, 0.12, 0.04);
  const barrel = cylZ(0.05, 0.6, dark, 0, 0.02, -0.34);
  const jacket = cylZ(0.085, 0.34, steel, 0, 0.02, -0.28);
  const ribs = new THREE.Group();
  for (let i = 0; i < 5; i++) ribs.add(cylZ(0.1, 0.014, steel, 0, 0.02, -0.16 - i * 0.055, 14));
  // concentric power-regulator RINGS (spins) at the breech
  const rings = new THREE.Group(); rings.name = 'spin'; rings.position.set(0, 0.02, 0.02);
  for (const r of [0.09, 0.065]) { const seg = 12; for (let i = 0; i < seg; i++) { const a = (i / seg) * Math.PI * 2; const b = box(2 * r * Math.sin(Math.PI / seg) * 1.1, 0.02, 0.02, i % 3 ? steel : gl, Math.cos(a) * r, Math.sin(a) * r, 0); b.rotation.z = a + Math.PI / 2; rings.add(b); } }
  const cellL = box(0.05, 0.1, 0.16, dark, 0.14, -0.02, 0.16); const cellLg = box(0.02, 0.07, 0.14, gl, 0.165, -0.02, 0.16); cellLg.name = 'glow'; // power cells
  const cellR = box(0.05, 0.1, 0.16, dark, -0.14, -0.02, 0.16); const cellRg = box(0.02, 0.07, 0.14, gl, -0.165, -0.02, 0.16); cellRg.name = 'glow';
  const carry = box(0.045, 0.055, 0.14, dark, 0, 0.18, 0.02);
  const grp = grip(0.084, 0.18, 0.094, dark, 0, -0.16, 0.22);
  const stock = box(0.14, 0.18, 0.22, body, 0, -0.02, 0.42);
  const legL = box(0.02, 0.02, 0.22, steel, 0.06, -0.11, -0.32); legL.rotation.x = 0.5;
  const legR = box(0.02, 0.02, 0.22, steel, -0.06, -0.11, -0.32); legR.rotation.x = 0.5;

  return model([receiver, receiverTop, barrel, jacket, ribs, rings, cellL, cellLg, cellR, cellRg, carry, grp, stock, legL, legR, mzAnchor(-0.66, 0.02)]);
}

// ══════════════════════════════════════════════════════════════════════════════
// PREMIUM HEAVY WEAPONS (Apex tier) — classified military SIEGE PLATFORMS. Each is a
// piece of machinery, not a firearm; each leaves a signature Battlefield Event. The
// two benchmarks below share no silhouette or mechanism with each other or any weapon.
// ══════════════════════════════════════════════════════════════════════════════

/** APX-H1 "OBLIVION" — a GRAVITY PROJECTOR siege cannon. A collapsing core glows inside a
 *  ring of rotating reactor SHUTTERS; a wide focusing cone projects the field. Deploys
 *  support arms + hydraulic recoil cylinders. Battlefield Event: a Gravity Well. */
export function buildAPXH1Oblivion(tier: RenderTier): THREE.Group {
  const gun = metal(COL.gunmetal, tier);
  const body = metal(COL.titanium, tier);
  const dark = metal(COL.matteBlack, tier);
  const steel = metal(COL.steel, tier);
  const gl = accent(0xb15cff, tier, 2.6);

  // ── heavy shoulder frame ─────────────────────────────────────────────────────
  const frame = box(0.24, 0.22, 0.5, gun, 0, 0, 0.12);
  const frameTop = box(0.16, 0.05, 0.4, dark, 0, 0.14, 0.08);
  const shoulder = box(0.16, 0.2, 0.12, body, 0, -0.04, 0.42); // shoulder brace/pad
  // ── GRAVITY CHAMBER (mid-front centerpiece) ──────────────────────────────────
  const chamberHousing = cylZ(0.15, 0.22, dark, 0, 0.02, -0.14, 20); // dark containment housing
  const core = capsuleZ(0.07, 0.1, gl, 0, 0.02, -0.14); core.name = 'glow'; // collapsing core
  const coreRing = cylZ(0.09, 0.03, gl, 0, 0.02, -0.24); coreRing.name = 'glow';
  // rotating reactor SHUTTERS around the chamber (spins around the bore axis)
  const shutters = new THREE.Group(); shutters.name = 'spin'; shutters.position.set(0, 0.02, -0.14);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const bl = box(0.06, 0.02, 0.2, steel, Math.cos(a) * 0.145, Math.sin(a) * 0.145, 0); bl.rotation.z = a + 0.6; shutters.add(bl); }
  // ── wide FOCUSING CONE (projects the gravity field) ──────────────────────────
  const cone = coneZ(0.17, 0.09, 0.24, steel, 0, 0.02, -0.4);
  const coneLip = cylZ(0.18, 0.03, gl, 0, 0.02, -0.52); coneLip.name = 'glow';
  // ── hydraulic recoil cylinders (top) ─────────────────────────────────────────
  const hydL = cylZ(0.032, 0.36, steel, 0.06, 0.16, 0.02);
  const hydR = cylZ(0.032, 0.36, steel, -0.06, 0.16, 0.02);
  const hydGl = box(0.14, 0.012, 0.28, gl, 0, 0.2, 0.02); hydGl.name = 'coil';
  // ── deploying SUPPORT ARMS (angled, bracing) ─────────────────────────────────
  const armL = box(0.03, 0.03, 0.28, steel, 0.11, -0.1, -0.06); armL.rotation.z = 0.5;
  const armR = box(0.03, 0.03, 0.28, steel, -0.11, -0.1, -0.06); armR.rotation.z = -0.5;
  // cooling vents (glow) on the frame flanks
  const ventL = tagGlow(ventSlats(4, 0.045, 0.02, 0.02, gl, 0.122, 0.06, 0.16), 'coil');
  const ventR = tagGlow(ventSlats(4, 0.045, 0.02, 0.02, gl, -0.122, 0.06, 0.16), 'coil');
  const grp = grip(0.085, 0.19, 0.095, dark, 0, -0.17, 0.24);
  const guard = box(0.06, 0.022, 0.1, dark, 0, -0.08, 0.2);

  return model([frame, frameTop, shoulder, chamberHousing, core, coreRing, shutters, cone, coneLip, hydL, hydR, hydGl, armL, armR, ventL, ventR, grp, guard, mzAnchor(-0.56, 0.02)]);
}

/** APX-H2 "MERIDIAN" — an ORBITAL KINETIC ACCELERATOR (rail siege). A long twin-rail spine
 *  with sequential acceleration coils drives a loaded high-density slug from a massive
 *  breech; deploys ground anchors to brace. Battlefield Event: an Orbital Impact Crater. */
export function buildAPXH2Meridian(tier: RenderTier): THREE.Group {
  const gun = metal(COL.titanium, tier);
  const body = metal(COL.gunmetal, tier);
  const dark = metal(COL.matteBlack, tier);
  const steel = metal(COL.steel, tier);
  const gl = accent(0xbfe0ff, tier, 2.6);

  // ── massive BREECH (rear core) with the loaded slug ──────────────────────────
  const breech = box(0.2, 0.2, 0.26, gun, 0, 0.02, 0.24);
  const breechCap = box(0.22, 0.22, 0.05, dark, 0, 0.02, 0.38);
  const slug = capsuleZ(0.05, 0.1, gl, 0, 0.04, 0.2); slug.name = 'glow'; // high-density slug, loaded
  const counterweight = box(0.14, 0.14, 0.1, steel, 0, 0.02, 0.42); // rear counterweight
  // ── long TWIN RAILS + sequential acceleration coils ──────────────────────────
  const spine = box(0.04, 0.06, 0.86, dark, 0, 0.04, -0.28);
  const railL = box(0.026, 0.04, 0.8, steel, 0.06, 0.06, -0.26);
  const railR = box(0.026, 0.04, 0.8, steel, -0.06, 0.06, -0.26);
  const coilsL = tagGlow(coilStack(8, 0.075, 0.055, gl, 0.06, 0.06, -0.12), 'coil');
  const coilsR = tagGlow(coilStack(8, 0.075, 0.055, gl, -0.06, 0.06, -0.12), 'coil');
  const muzzle = box(0.11, 0.11, 0.08, steel, 0, 0.05, -0.66);
  const muzzleGl = cylZ(0.05, 0.02, gl, 0, 0.05, -0.7); muzzleGl.name = 'glow';
  // spinning accelerator RING at the breech (forward-facing)
  const ring = new THREE.Group(); ring.name = 'spin'; ring.position.set(0, 0.04, 0.06);
  ring.add(cylZ(0.085, 0.02, steel, 0, 0, 0, 16));
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; ring.add(box(0.018, 0.04, 0.024, gl, Math.cos(a) * 0.065, Math.sin(a) * 0.065, 0)); }
  // ── deploying GROUND ANCHOR braces (it must brace to fire) ────────────────────
  const anchorL = box(0.03, 0.03, 0.3, steel, 0.09, -0.12, -0.02); anchorL.rotation.x = 0.7; anchorL.rotation.z = 0.4;
  const anchorR = box(0.03, 0.03, 0.3, steel, -0.09, -0.12, -0.02); anchorR.rotation.x = 0.7; anchorR.rotation.z = -0.4;
  const footL = box(0.06, 0.02, 0.06, dark, 0.16, -0.24, -0.12);
  const footR = box(0.06, 0.02, 0.06, dark, -0.16, -0.24, -0.12);
  // ── long-range TARGETING module (top) ────────────────────────────────────────
  const scope = box(0.05, 0.05, 0.3, dark, 0, 0.15, -0.06);
  const lens = box(0.032, 0.032, 0.012, gl, 0, 0.15, -0.22); lens.name = 'glow';
  const grp = grip(0.078, 0.18, 0.088, dark, 0, -0.14, 0.16);
  const stock = box(0.1, 0.14, 0.12, body, 0, -0.04, 0.34);

  return model([breech, breechCap, slug, counterweight, spine, railL, railR, coilsL, coilsR, muzzle, muzzleGl, ring, anchorL, anchorR, footL, footR, scope, lens, grp, stock, mzAnchor(-0.74, 0.05)]);
}

// ── the other eight siege platforms — each a different siege program + event ────────

/** APX-H3 "INFERNO" — a THERMOBARIC launcher: twin fuel-air reservoirs feed a wide
 *  combustion throat through a spinning injector. Event: Thermobaric Firestorm. */
export function buildAPXH3Inferno(tier: RenderTier): THREE.Group {
  const gun = metal(COL.burntSteel, tier);
  const body = metal(COL.gunmetal, tier);
  const dark = metal(COL.matteBlack, tier);
  const steel = metal(COL.steel, tier);
  const gl = accent(0xff7a2a, tier, 2.5);

  const frame = box(0.2, 0.2, 0.44, gun, 0, 0, 0.1);
  const barrel = cylZ(0.06, 0.4, dark, 0, 0.02, -0.28);
  const throat = coneZ(0.17, 0.07, 0.26, steel, 0, 0.02, -0.42); // wide combustion throat
  const throatGlow = cylZ(0.14, 0.03, gl, 0, 0.02, -0.54); throatGlow.name = 'glow';
  const tankL = capsuleZ(0.062, 0.2, body, 0.14, -0.02, 0.06); // fuel-air reservoirs
  const tankR = capsuleZ(0.062, 0.2, body, -0.14, -0.02, 0.06);
  const tankBandL = cylZ(0.066, 0.02, gl, 0.14, -0.02, 0.02); tankBandL.name = 'coil';
  const tankBandR = cylZ(0.066, 0.02, gl, -0.14, -0.02, 0.02); tankBandR.name = 'coil';
  const igniter = tagGlow(coilStack(4, 0.045, 0.09, gl, 0, 0.02, -0.24), 'coil'); // ignition coils
  // spinning fuel INJECTOR impeller at the breech
  const inj = new THREE.Group(); inj.name = 'spin'; inj.position.set(0, 0.02, 0.02);
  inj.add(cylZ(0.05, 0.05, steel, 0, 0, 0, 8));
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const bl = box(0.02, 0.06, 0.03, gl, Math.cos(a) * 0.05, Math.sin(a) * 0.05, 0); bl.rotation.z = a + 0.5; inj.add(bl); }
  const grp = grip(0.084, 0.19, 0.094, dark, 0, -0.17, 0.24);
  const stock = box(0.12, 0.16, 0.16, body, 0, -0.03, 0.42);

  return model([frame, barrel, throat, throatGlow, tankL, tankR, tankBandL, tankBandR, igniter, inj, grp, stock, mzAnchor(-0.58, 0.02)]);
}

/** APX-H4 "GLACIER" — a CRYOGENIC siege platform: a rotating condenser fan super-cools the
 *  charge; frost-rimed barrel + coolant pipes. Event: Cryogenic Ice Field. */
export function buildAPXH4Glacier(tier: RenderTier): THREE.Group {
  const gun = metal(COL.titanium, tier);
  const body = metal(COL.steel, tier);
  const dark = metal(COL.matteBlack, tier);
  const steel = metal(COL.steel, tier);
  const gl = accent(0x8ff0ff, tier, 2.4);

  const frame = box(0.19, 0.19, 0.42, gun, 0, 0, 0.1);
  const barrel = cylZ(0.05, 0.5, dark, 0, 0.02, -0.32);
  const rime = cylZ(0.07, 0.34, body, 0, 0.02, -0.28); // frost-rimed sleeve
  const coolant = tagGlow(coilStack(6, 0.05, 0.08, gl, 0, 0.02, -0.2), 'coil'); // coolant pipes wrapping
  const tankL = capsuleZ(0.05, 0.16, steel, 0.13, 0.04, 0.08); // cryo tanks
  const tankR = capsuleZ(0.05, 0.16, steel, -0.13, 0.04, 0.08);
  const tankGl = box(0.012, 0.05, 0.14, gl, 0.155, 0.04, 0.08); tankGl.name = 'glow';
  const tankGr = box(0.012, 0.05, 0.14, gl, -0.155, 0.04, 0.08); tankGr.name = 'glow';
  // rotating CONDENSER fan (forward-facing) on the flank
  const fan = new THREE.Group(); fan.name = 'spin'; fan.position.set(0.1, -0.02, 0.12);
  fan.add(cylZ(0.045, 0.03, steel, 0, 0, 0, 10));
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; const bl = box(0.016, 0.055, 0.012, gl, Math.cos(a) * 0.045, Math.sin(a) * 0.045, 0); bl.rotation.z = a; fan.add(bl); }
  const muzzle = cylZ(0.07, 0.06, steel, 0, 0.02, -0.56);
  const muzzleGl = cylZ(0.055, 0.02, gl, 0, 0.02, -0.58); muzzleGl.name = 'glow';
  const grp = grip(0.08, 0.18, 0.09, dark, 0, -0.16, 0.24);
  const stock = box(0.11, 0.15, 0.18, gun, 0, -0.03, 0.42);

  return model([frame, barrel, rime, coolant, tankL, tankR, tankGl, tankGr, fan, muzzle, muzzleGl, grp, stock, mzAnchor(-0.6, 0.02)]);
}

/** APX-H5 "CONTAGION" — a NANITE dispersal cannon: a rotating carousel of nanomachine pods
 *  vents a swarm through a dispersal aperture. Event: Nanite Swarm. */
export function buildAPXH5Contagion(tier: RenderTier): THREE.Group {
  const gun = metal(COL.olive, tier);
  const body = metal(COL.gunmetal, tier);
  const dark = metal(COL.matteBlack, tier);
  const steel = metal(COL.steel, tier);
  const gl = accent(0x7dff9a, tier, 2.4);

  const frame = box(0.19, 0.18, 0.4, gun, 0, 0.01, 0.1);
  const barrel = cylZ(0.045, 0.36, dark, 0, 0.03, -0.28);
  const aperture = coneZ(0.13, 0.06, 0.18, steel, 0, 0.03, -0.42); // dispersal aperture
  const apertureGl = cylZ(0.09, 0.02, gl, 0, 0.03, -0.5); apertureGl.name = 'glow';
  // rotating POD CAROUSEL (forward-facing drum of nanite pods)
  const carousel = new THREE.Group(); carousel.name = 'spin'; carousel.position.set(0, -0.02, 0.06);
  carousel.add(cylZ(0.11, 0.12, steel, 0, 0, 0, 14));
  carousel.add(cylZ(0.07, 0.13, dark, 0, 0, 0, 12));
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; carousel.add(capsuleZ(0.018, 0.05, body, Math.cos(a) * 0.09, Math.sin(a) * 0.09, 0)); const led = box(0.02, 0.02, 0.02, gl, Math.cos(a) * 0.09, Math.sin(a) * 0.09, -0.07); led.name = 'glow'; carousel.add(led); }
  const vents = tagGlow(ventSlats(4, 0.04, 0.02, 0.02, gl, 0.098, 0.08, 0.14), 'coil');
  const grp = grip(0.078, 0.17, 0.088, dark, 0, -0.15, 0.22);
  const stock = box(0.11, 0.14, 0.18, body, 0, -0.02, 0.4);

  return model([frame, barrel, aperture, apertureGl, carousel, vents, grp, stock, mzAnchor(-0.52, 0.03)]);
}

/** APX-H6 "SUNDER" — a SHOCKWAVE projector: pressure accumulators discharge through a
 *  concussion dish — it fires force, not a shell. Event: Shockwave Ring. */
export function buildAPXH6Sunder(tier: RenderTier): THREE.Group {
  const gun = metal(COL.gunmetal, tier);
  const body = metal(COL.titanium, tier);
  const dark = metal(COL.matteBlack, tier);
  const steel = metal(COL.steel, tier);
  const gl = accent(0xffc23a, tier, 2.4);

  const frame = box(0.2, 0.2, 0.38, gun, 0, 0, 0.14);
  const neck = cylZ(0.08, 0.2, steel, 0, 0.02, -0.06);
  // wide concussion DISH (shallow forward cone) — the emitter
  const dish = coneZ(0.22, 0.08, 0.16, steel, 0, 0.02, -0.24);
  const dishRim = cylZ(0.23, 0.03, steel, 0, 0.02, -0.32, 24);
  const emitterRing = cylZ(0.1, 0.03, gl, 0, 0.02, -0.28); emitterRing.name = 'glow'; // pulsing emitter
  const emitterCore = capsuleZ(0.05, 0.06, gl, 0, 0.02, -0.16); emitterCore.name = 'glow';
  // rotating RESONATOR behind the dish
  const res = new THREE.Group(); res.name = 'spin'; res.position.set(0, 0.02, 0.04);
  res.add(cylZ(0.075, 0.03, steel, 0, 0, 0, 6));
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; res.add(box(0.024, 0.06, 0.03, gl, Math.cos(a) * 0.06, Math.sin(a) * 0.06, 0)); }
  const accL = capsuleZ(0.05, 0.14, body, 0.13, -0.02, 0.16); // pressure accumulators
  const accR = capsuleZ(0.05, 0.14, body, -0.13, -0.02, 0.16);
  const grp = grip(0.082, 0.18, 0.092, dark, 0, -0.16, 0.26);
  const stock = box(0.12, 0.16, 0.16, body, 0, -0.02, 0.44);

  return model([frame, neck, dish, dishRim, emitterRing, emitterCore, res, accL, accR, grp, stock, mzAnchor(-0.4, 0.02)]);
}

/** APX-H7 "HELIOS" — a FUSION cannon: an open containment lattice cradles a blazing fusion
 *  core focused down a hardened throat; orbiting arms rotate. Event: Fusion Storm. */
export function buildAPXH7Helios(tier: RenderTier): THREE.Group {
  const gun = metal(COL.titanium, tier);
  const body = metal(COL.gunmetal, tier);
  const dark = metal(COL.matteBlack, tier);
  const steel = metal(COL.steel, tier);
  const gl = accent(0xf2f6ff, tier, 3.0);

  const frame = box(0.18, 0.18, 0.4, gun, 0, 0, 0.12);
  const throat = coneZ(0.12, 0.05, 0.22, steel, 0, 0.02, -0.42); // hardened focusing throat
  const throatGl = cylZ(0.07, 0.02, gl, 0, 0.02, -0.52); throatGl.name = 'glow';
  // open fusion CORE (blazing) held in the lattice
  const core = capsuleZ(0.06, 0.06, gl, 0, 0.03, -0.16); core.name = 'glow';
  const coreHalo = cylZ(0.1, 0.02, gl, 0, 0.03, -0.16, 20); coreHalo.name = 'glow';
  // orbiting CONTAINMENT ARMS (rotate around the core)
  const arms = new THREE.Group(); arms.name = 'spin'; arms.position.set(0, 0.03, -0.16);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; const arm = box(0.02, 0.02, 0.22, steel, Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0); arm.rotation.z = a; arms.add(arm); const tip = box(0.03, 0.03, 0.03, gl, Math.cos(a) * 0.1, Math.sin(a) * 0.1, -0.09); arms.add(tip); }
  const collar = cylZ(0.09, 0.05, dark, 0, 0.03, 0.0);
  const grp = grip(0.078, 0.18, 0.088, dark, 0, -0.15, 0.24);
  const stock = box(0.1, 0.14, 0.18, body, 0, -0.02, 0.42);

  return model([frame, throat, throatGl, core, coreHalo, arms, collar, grp, stock, mzAnchor(-0.56, 0.02)]);
}

/** APX-H8 "SALVO" — MICRO-MISSILE artillery: a honeycomb of tubes saturates a zone under a
 *  rotating radar. Event: Saturation Barrage. */
export function buildAPXH8Salvo(tier: RenderTier): THREE.Group {
  const gun = metal(COL.gunmetal, tier);
  const body = metal(COL.olive, tier);
  const dark = metal(COL.matteBlack, tier);
  const steel = metal(COL.steel, tier);
  const gl = accent(0xff5a5a, tier, 2.4);

  const frame = box(0.26, 0.2, 0.34, gun, 0, 0, 0.16);
  // honeycomb MISSILE-TUBE cluster (grid of tubes with glowing tips)
  const tubes = new THREE.Group();
  const cols = [-0.08, 0, 0.08];
  const rows = [-0.06, 0.02, 0.1];
  for (const x of cols) for (const y of rows) { tubes.add(cylZ(0.028, 0.24, dark, x, y, -0.14, 8)); const tip = cylZ(0.026, 0.02, gl, x, y, -0.26, 8); tip.name = 'glow'; tubes.add(tip); }
  const shroud = box(0.22, 0.22, 0.06, steel, 0, 0.02, -0.02);
  // rotating RADAR dish on top
  const radar = new THREE.Group(); radar.name = 'spin'; radar.position.set(0, 0.16, 0.06);
  radar.add(coneZ(0.08, 0.02, 0.04, steel, 0, 0, 0));
  radar.add(box(0.012, 0.09, 0.012, gl, 0, 0, -0.02));
  const grp = grip(0.084, 0.18, 0.094, dark, 0, -0.16, 0.26);
  const stock = box(0.13, 0.16, 0.16, body, 0, -0.02, 0.44);

  return model([frame, tubes, shroud, radar, grp, stock, mzAnchor(-0.28, 0.02)]);
}

/** APX-H9 "AUGER" — a DRILL-MISSILE launcher: a rotating penetrator bit burrows before it
 *  detonates beneath cover. Event: Seismic Rupture. */
export function buildAPXH9Auger(tier: RenderTier): THREE.Group {
  const gun = metal(COL.burntSteel, tier);
  const body = metal(COL.gunmetal, tier);
  const dark = metal(COL.matteBlack, tier);
  const steel = metal(COL.steel, tier);
  const gl = accent(0xffa040, tier, 2.4);

  const frame = box(0.21, 0.2, 0.42, gun, 0, 0, 0.12);
  const breechGl = box(0.06, 0.06, 0.16, gl, 0, 0.02, 0.14); breechGl.name = 'glow';
  const housing = cylZ(0.1, 0.34, steel, 0, 0.02, -0.16); // launch housing around the drill
  // rotating DRILL BIT loaded in the muzzle (helical fins on a tapered core)
  const drill = new THREE.Group(); drill.name = 'spin'; drill.position.set(0, 0.02, -0.34);
  drill.add(coneZ(0.02, 0.07, 0.28, steel, 0, 0, 0)); // tapered core, point toward −Z
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 * 2; const z = -0.1 + (i / 12) * 0.22; const r = 0.05 - (i / 12) * 0.03; const fin = box(0.02, 0.03, 0.02, i % 2 ? gl : dark, Math.cos(a) * r, Math.sin(a) * r, z); fin.rotation.z = a; drill.add(fin); }
  const tipGl = coneZ(0.008, 0.02, 0.04, gl, 0, 0, -0.16); tipGl.name = 'glow';
  drill.add(tipGl);
  const vents = tagGlow(ventSlats(4, 0.045, 0.02, 0.02, gl, 0.108, 0.06, 0.14), 'coil');
  const grp = grip(0.084, 0.19, 0.094, dark, 0, -0.17, 0.24);
  const stock = box(0.12, 0.16, 0.18, body, 0, -0.03, 0.44);

  return model([frame, breechGl, housing, drill, vents, grp, stock, mzAnchor(-0.6, 0.02)]);
}

/** APX-H10 "NEMESIS" — a REACTOR-MELTDOWN siege gun: exposed fuel rods vent an unstable core
 *  that seeds a radiation field. Event: Radiation Zone. */
export function buildAPXH10Nemesis(tier: RenderTier): THREE.Group {
  const gun = metal(COL.gunmetal, tier);
  const body = metal(COL.burntSteel, tier);
  const dark = metal(COL.matteBlack, tier);
  const steel = metal(COL.steel, tier);
  const gl = accent(0xc8ff3a, tier, 2.6);

  const frame = box(0.22, 0.2, 0.42, gun, 0, 0, 0.1);
  // hazard-striped plating (alternating dark / glow bands)
  const stripes = new THREE.Group();
  for (let i = 0; i < 4; i++) { const b = box(0.05, 0.012, 0.4, i % 2 ? gl : dark, 0.1 - i * 0.02 * 0, 0.11, 0.06); b.position.x = -0.06 + i * 0.04; stripes.add(b); }
  const barrel = cylZ(0.05, 0.4, dark, 0, 0.02, -0.3);
  const muzzle = box(0.12, 0.12, 0.1, steel, 0, 0.02, -0.5);
  const muzzleGl = cylZ(0.05, 0.02, gl, 0, 0.02, -0.54); muzzleGl.name = 'glow';
  // exposed unstable REACTOR: a glowing meltdown core + venting fuel rods (rotating)
  const core = capsuleZ(0.06, 0.08, gl, 0, 0.02, 0.06); core.name = 'glow';
  const rods = new THREE.Group(); rods.name = 'spin'; rods.position.set(0, 0.02, 0.06);
  rods.add(cylZ(0.1, 0.06, dark, 0, 0, 0, 8));
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; rods.add(cylZ(0.014, 0.14, steel, Math.cos(a) * 0.09, Math.sin(a) * 0.09, 0, 6)); const cap = box(0.024, 0.024, 0.02, gl, Math.cos(a) * 0.09, Math.sin(a) * 0.09, -0.07); cap.name = 'glow'; rods.add(cap); }
  const vents = tagGlow(ventSlats(4, 0.045, 0.02, 0.02, gl, 0.114, 0.06, 0.18), 'coil');
  const grp = grip(0.084, 0.19, 0.094, dark, 0, -0.17, 0.24);
  const stock = box(0.12, 0.16, 0.16, body, 0, -0.03, 0.44);

  return model([frame, stripes, barrel, muzzle, muzzleGl, core, rods, vents, grp, stock, mzAnchor(-0.56, 0.02)]);
}
