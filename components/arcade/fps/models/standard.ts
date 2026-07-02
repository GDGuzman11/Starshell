/**
 * STANDARD ISSUE ARSENAL — the iconic, industrial weapons every Starshell Marine is
 * issued. Chunky, oversized, rugged, unmistakable in silhouette, and built with VISIBLE
 * attachment points (named `base:*` meshes) so Engineering parts snap onto real hardware
 * — think modular military LEGO. Primitives only, muzzle toward −Z. Added ALONGSIDE the
 * existing arsenal (they don't replace it).
 *
 * Imported ONLY by the /arcade chunk.
 */
import * as THREE from 'three';
import type { RenderTier } from '../materials';
import { ACCENT, COL, accent, box, capsuleZ, coneZ, cylY, cylZ, finStack, grip, metal, model, ventSlats } from './parts';

function muzzleAt(z: number, y = 0): THREE.Object3D {
  const o = new THREE.Object3D();
  o.name = 'muzzle';
  o.position.set(0, y, z);
  return o;
}

/** AR-01 "PULSE" — the iconic Starshell rifle. Chunky receiver, oversized rounded barrel
 *  shroud, heavy carry handle (optics mount), angular stock, rounded magazine, blue status
 *  LEDs. Balanced, reliable, never obsolete. Visible slots: barrel/receiver/mag/optic/rear. */
export function buildAR01Pulse(tier: RenderTier): THREE.Group {
  const body = metal(COL.gunmetal, tier);
  const dark = metal(COL.matteBlack, tier);
  const steel = metal(COL.steel, tier);
  const led = accent(ACCENT.blue, tier, 1.7);

  // Chunky receiver — the big readable core block.
  const receiver = box(0.12, 0.13, 0.42, body, 0, 0, 0.04);
  const receiverTop = box(0.1, 0.03, 0.34, dark, 0, 0.08, 0.02); // flat top deck

  // Oversized rounded barrel shroud + the barrel it wraps (the barrel is the slot piece).
  const shroud = cylZ(0.062, 0.32, steel, 0, 0.02, -0.26); // rounded barrel housing
  const barrel = cylZ(0.026, 0.46, dark, 0, 0.02, -0.34);
  barrel.name = 'base:barrel'; // ← BARREL slot
  const muzzle = cylZ(0.046, 0.06, dark, 0, 0.02, -0.52); // muzzle device
  const handguard = box(0.1, 0.06, 0.22, dark, 0, -0.05, -0.22); // large handguard
  const ventL = box(0.012, 0.03, 0.16, dark, 0.06, 0.02, -0.24); // shroud vents
  const ventR = box(0.012, 0.03, 0.16, dark, -0.06, 0.02, -0.24);

  // Heavy CARRY HANDLE over the receiver — its top rail is the optics mount.
  const handleFront = box(0.03, 0.07, 0.03, dark, 0, 0.13, -0.08);
  const handleRear = box(0.03, 0.07, 0.03, dark, 0, 0.13, 0.14);
  const handleTop = box(0.055, 0.035, 0.3, dark, 0, 0.17, 0.03);
  handleTop.name = 'base:optic'; // ← OPTICS slot (carry-handle rail)
  const frontSight = box(0.022, 0.08, 0.03, dark, 0, 0.13, -0.36); // large front sight

  // Rounded MAGAZINE (slightly curved).
  const mag = box(0.085, 0.19, 0.11, dark, 0, -0.17, 0.06);
  mag.name = 'mag'; // ← MAGAZINE slot
  const magCurve = box(0.085, 0.07, 0.1, dark, 0, -0.27, 0.03);
  magCurve.rotation.x = 0.22;

  // Angular STOCK (rear assembly).
  const stock = box(0.075, 0.12, 0.2, body, 0, -0.01, 0.36);
  stock.name = 'base:stock'; // ← REAR slot
  const stockPad = box(0.065, 0.14, 0.03, dark, 0, -0.01, 0.46);

  const grp = grip(0.065, 0.15, 0.075, dark, 0, -0.14, 0.2);

  // Blue status LEDs on the receiver flank (Starshell signature).
  const led1 = box(0.018, 0.022, 0.05, led, 0.062, 0.03, 0.12);
  const led2 = box(0.018, 0.022, 0.05, led, 0.062, 0.03, 0.02);
  const led3 = box(0.018, 0.022, 0.05, led, 0.062, 0.03, -0.08);

  return model([
    receiver,
    receiverTop,
    shroud,
    barrel,
    muzzle,
    handguard,
    ventL,
    ventR,
    handleFront,
    handleRear,
    handleTop,
    frontSight,
    mag,
    magCurve,
    stock,
    stockPad,
    grp,
    led1,
    led2,
    led3,
    muzzleAt(-0.56, 0.02),
  ]);
}

/** CB-02 "RANGER" — burst precision rifle. Long barrel, slim receiver, skeleton stock,
 *  thin magazine, rectangular optics rail. Sharp, disciplined silhouette. */
export function buildCB02Ranger(tier: RenderTier): THREE.Group {
  const body = metal(COL.burntSteel, tier);
  const dark = metal(COL.matteBlack, tier);
  const led = accent(ACCENT.blue, tier, 1.5);
  const receiver = box(0.08, 0.1, 0.4, body, 0, 0, 0.06); // slim receiver
  const barrel = cylZ(0.022, 0.66, dark, 0, 0.02, -0.42); // long precision barrel
  barrel.name = 'base:barrel';
  const muzzle = cylZ(0.036, 0.07, dark, 0, 0.02, -0.72);
  const handguard = box(0.06, 0.05, 0.3, body, 0, 0.0, -0.24);
  const rail = box(0.05, 0.03, 0.34, dark, 0, 0.08, 0.02); // rectangular optics rail
  rail.name = 'base:optic';
  const frontSight = box(0.016, 0.06, 0.02, dark, 0, 0.09, -0.52);
  const mag = box(0.05, 0.16, 0.08, dark, 0, -0.13, 0.08); // thin magazine
  mag.name = 'mag';
  // skeleton stock — open thin frame
  const stock = new THREE.Group();
  stock.name = 'base:stock';
  stock.add(box(0.03, 0.02, 0.2, dark, 0, 0.05, 0.34));
  stock.add(box(0.03, 0.02, 0.2, dark, 0, -0.07, 0.34));
  stock.add(box(0.03, 0.14, 0.02, dark, 0, -0.01, 0.44));
  const grp = grip(0.05, 0.13, 0.06, dark, 0, -0.11, 0.2);
  const led1 = box(0.016, 0.02, 0.04, led, 0.042, 0.02, 0.12);
  return model([receiver, barrel, muzzle, handguard, rail, frontSight, mag, stock, grp, led1, muzzleAt(-0.76, 0.02)]);
}

/** VX-04 "TEMPEST" — compact CQB. Very short, oversized side drum, big muzzle brake,
 *  bulky front grip, heavy charging handle, chunky stock. Fast + aggressive. */
export function buildVX04Tempest(tier: RenderTier): THREE.Group {
  const body = metal(COL.titanium, tier);
  const dark = metal(COL.matteBlack, tier);
  const led = accent(ACCENT.red, tier, 1.5);
  const receiver = box(0.12, 0.12, 0.24, body, 0, 0, 0.06); // short chunky body
  const barrel = cylZ(0.032, 0.18, dark, 0, 0.01, -0.16);
  barrel.name = 'base:barrel';
  // big muzzle brake
  const brake = cylZ(0.06, 0.08, dark, 0, 0.01, -0.28);
  for (let i = 0; i < 3; i++) brake.add(box(0.14, 0.014, 0.02, body, 0, 0, -0.02 + i * 0.02));
  // oversized drum magazine (side/under, spins on reload)
  const drum = new THREE.Group();
  drum.name = 'base:feed';
  drum.add(cylY(0.13, 0.09, dark, 0, -0.13, 0.06));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    drum.add(box(0.03, 0.09, 0.03, i % 2 ? led : body, Math.cos(a) * 0.09, -0.13, 0.06 + Math.sin(a) * 0.09));
  }
  const frontGrip = grip(0.05, 0.14, 0.06, dark, 0, -0.1, -0.14); // bulky front grip
  const charge = box(0.03, 0.05, 0.1, body, 0.07, 0.06, 0.14); // heavy charging handle
  const stock = box(0.08, 0.11, 0.16, body, 0, -0.01, 0.28); // chunky stock
  stock.name = 'base:stock';
  const grp = grip(0.06, 0.13, 0.07, dark, 0, -0.12, 0.18);
  const eye = box(0.03, 0.03, 0.03, led, 0, 0.08, 0.1);
  return model([receiver, barrel, brake, drum, frontGrip, charge, stock, grp, eye, muzzleAt(-0.32, 0.01)]);
}

/** ER-08 "ION" — energy rifle. Circular front emitter, energy conduit, cooling fins,
 *  large rear battery. No traditional magazine — glows blue. */
export function buildER08Ion(tier: RenderTier): THREE.Group {
  const body = metal(COL.gunmetal, tier);
  const dark = metal(COL.matteBlack, tier);
  const glow = accent(ACCENT.blue, tier, 1.9);
  const receiver = box(0.09, 0.11, 0.36, body, 0, 0, 0.02);
  // circular emitter at the front
  const emitter = new THREE.Group();
  emitter.name = 'base:emitter';
  emitter.add(cylZ(0.06, 0.1, dark, 0, 0.02, -0.28));
  emitter.add(cylZ(0.035, 0.12, glow, 0, 0.02, -0.32)); // glowing bore
  emitter.add(cylZ(0.07, 0.02, glow, 0, 0.02, -0.34)); // emitter ring
  // energy conduit running along the top (glow)
  const conduit = box(0.02, 0.02, 0.4, glow, 0, 0.08, 0.0);
  conduit.name = 'base:core';
  // cooling fins
  const fins = finStack(5, 0.04, 0.14, 0.1, dark, 0, 0.03, -0.06);
  fins.name = 'base:cooling';
  // targeting module (small optic)
  const targeting = box(0.05, 0.04, 0.1, dark, 0, 0.1, 0.06);
  targeting.name = 'base:targeting';
  // large rear battery / reactor
  const battery = box(0.11, 0.13, 0.16, dark, 0, -0.01, 0.28);
  battery.name = 'base:reactor';
  const batteryGlow = box(0.02, 0.09, 0.12, glow, 0.06, -0.01, 0.28);
  const grp = grip(0.06, 0.14, 0.07, dark, 0, -0.13, 0.16);
  return model([receiver, emitter, conduit, fins, targeting, battery, batteryGlow, grp, muzzleAt(-0.36, 0.02)]);
}

/** RT-06 "BULLDOG" — rocket tube. Rectangular launch tube, heavy grip, back-blast
 *  vents, big iron sight. Brutally industrial. */
export function buildRT06Bulldog(tier: RenderTier): THREE.Group {
  const body = metal(COL.olive, tier);
  const dark = metal(COL.matteBlack, tier);
  const hot = accent(ACCENT.orange, tier, 1.3);
  // rectangular launch tube
  const tube = box(0.15, 0.15, 0.72, body, 0, 0.02, -0.02);
  tube.name = 'base:tube';
  const bore = box(0.1, 0.1, 0.08, dark, 0, 0.02, -0.38);
  const warhead = coneZ(0.0, 0.05, 0.1, hot, 0, 0.02, -0.34); // loaded warhead tip
  warhead.name = 'base:warhead';
  // back-blast vents
  const vents = ventSlats(4, 0.05, 0.12, 0.03, dark, 0, 0.14, 0.28);
  const rearMouth = box(0.15, 0.15, 0.06, dark, 0, 0.02, 0.34);
  const sight = box(0.02, 0.09, 0.05, hot, 0, 0.14, -0.12); // big iron sight
  sight.name = 'base:sight';
  const grp = grip(0.06, 0.15, 0.08, dark, 0, -0.12, -0.02);
  const rearGrip = grip(0.05, 0.11, 0.06, dark, 0, -0.09, 0.22);
  return model([tube, bore, warhead, vents, rearMouth, sight, grp, rearGrip, muzzleAt(-0.42, 0.02)]);
}

/** GC-03 "HAMMER" — grenade cannon. Short wide barrel, drum-fed (spins), heavy frame,
 *  mechanical loading, industrial recoil dampeners. */
export function buildGC03Hammer(tier: RenderTier): THREE.Group {
  const body = metal(COL.steel, tier);
  const dark = metal(COL.matteBlack, tier);
  const hot = accent(ACCENT.green, tier, 1.4);
  const frame = box(0.16, 0.16, 0.24, body, 0, 0, 0.16); // heavy frame
  const barrel = cylZ(0.08, 0.3, body, 0, 0.02, -0.18); // short wide barrel
  barrel.name = 'base:tube';
  const mouth = cylZ(0.1, 0.05, dark, 0, 0.02, -0.34);
  // 6-chamber drum (spins)
  const drum = new THREE.Group();
  drum.name = 'base:feed';
  drum.add(cylZ(0.14, 0.16, dark, 0, -0.01, 0.02));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    drum.add(cylZ(0.034, 0.17, i % 2 ? hot : body, Math.cos(a) * 0.09, -0.01 + Math.sin(a) * 0.09, 0.02));
  }
  const damper = box(0.05, 0.05, 0.16, dark, 0.09, 0.1, 0.0); // recoil dampener
  const damper2 = box(0.05, 0.05, 0.16, dark, -0.09, 0.1, 0.0);
  const sight = box(0.02, 0.07, 0.05, hot, 0, 0.14, -0.06);
  sight.name = 'base:sight';
  const grp = grip(0.06, 0.14, 0.08, dark, 0, -0.14, 0.18);
  return model([frame, barrel, mouth, drum, damper, damper2, sight, grp, muzzleAt(-0.36, 0.02)]);
}

/** PM-09 "METEOR" — plasma mortar. Wide energy chamber, large cooling rings, charging
 *  coils, heavy support frame. Charged energy shells. */
export function buildPM09Meteor(tier: RenderTier): THREE.Group {
  const body = metal(COL.gunmetal, tier);
  const dark = metal(COL.matteBlack, tier);
  const plasma = accent(ACCENT.blue, tier, 1.9);
  const block = box(0.17, 0.17, 0.28, body, 0, 0, 0.16); // heavy body
  const chamber = capsuleZ(0.09, 0.08, plasma, 0, 0.02, 0.08); // glowing energy chamber
  chamber.name = 'base:core';
  const tube = cylZ(0.1, 0.4, body, 0, 0.04, -0.16); // wide tube
  tube.name = 'base:tube';
  // large cooling rings + charging coils (glow)
  const coils = new THREE.Group();
  coils.name = 'base:targeting';
  for (let i = 0; i < 4; i++) coils.add(cylZ(0.125, 0.025, plasma, 0, 0.04, -0.02 - i * 0.09));
  const vents = ventSlats(4, 0.05, 0.03, 0.12, dark, 0.12, 0.11, 0.04);
  vents.name = 'base:stabilizer';
  const mouth = cylZ(0.13, 0.05, dark, 0, 0.04, -0.4);
  const sight = box(0.02, 0.08, 0.05, plasma, 0, 0.16, -0.04);
  const grp = grip(0.07, 0.15, 0.09, dark, 0, -0.16, 0.18);
  return model([block, chamber, tube, coils, vents, mouth, sight, grp, muzzleAt(-0.42, 0.04)]);
}

/** RC-12 "THUNDER" — rail cannon. Long parallel magnetic rails, rectangular profile,
 *  massive rear capacitor, blue energy arcs. Extremely readable silhouette. */
export function buildRC12Thunder(tier: RenderTier): THREE.Group {
  const body = metal(COL.titanium, tier, 0.4, 0.9);
  const dark = metal(COL.matteBlack, tier);
  const arc = accent(ACCENT.blue, tier, 2.0);
  const receiver = box(0.12, 0.14, 0.34, body, 0, 0, 0.08); // rectangular body
  // long parallel magnetic rails
  const rails = new THREE.Group();
  rails.name = 'base:barrel';
  rails.add(box(0.03, 0.03, 0.68, dark, 0.05, 0.05, -0.42));
  rails.add(box(0.03, 0.03, 0.68, dark, -0.05, 0.05, -0.42));
  rails.add(box(0.03, 0.03, 0.68, dark, 0.05, -0.03, -0.42));
  rails.add(box(0.03, 0.03, 0.68, dark, -0.05, -0.03, -0.42));
  for (let i = 0; i < 4; i++) rails.add(box(0.12, 0.02, 0.02, arc, 0, 0.01, -0.2 - i * 0.14)); // energy arcs between rails
  // scope
  const scope = box(0.05, 0.05, 0.16, dark, 0, 0.11, 0.06);
  scope.name = 'base:optic';
  scope.add(box(0.02, 0.02, 0.02, arc, 0, 0, 0.09));
  // massive rear capacitor
  const cap = box(0.14, 0.16, 0.2, dark, 0, -0.01, 0.32);
  cap.name = 'base:stock';
  const capGlow = box(0.03, 0.1, 0.14, arc, 0.075, -0.01, 0.32);
  const bolt = box(0.04, 0.05, 0.08, body, 0.08, 0.02, 0.14); // charging bolt
  bolt.name = 'base:bolt';
  const grp = grip(0.06, 0.15, 0.08, dark, 0, -0.14, 0.16);
  return model([receiver, rails, scope, cap, capGlow, bolt, grp, muzzleAt(-0.78, 0.05)]);
}

/** SP-01 "SERVICE PISTOL" — simple, reliable, balanced. The recognizable Marine sidearm. */
export function buildSP01Service(tier: RenderTier): THREE.Group {
  const body = metal(COL.gunmetal, tier);
  const dark = metal(COL.matteBlack, tier);
  const led = accent(ACCENT.green, tier, 1.4);
  const slide = box(0.06, 0.07, 0.28, body, 0, 0.03, -0.02); // slide
  slide.name = 'base:slide';
  const barrel = cylZ(0.018, 0.06, dark, 0, 0.03, -0.16);
  const frame = box(0.055, 0.05, 0.2, dark, 0, -0.03, 0.0); // frame
  frame.name = 'base:frame';
  const mag = box(0.045, 0.12, 0.05, dark, 0, -0.13, 0.06); // magazine (in grip)
  mag.name = 'mag';
  const sight = box(0.014, 0.02, 0.04, dark, 0, 0.08, 0.08);
  sight.name = 'base:sight';
  const frontSight = box(0.014, 0.02, 0.02, dark, 0, 0.08, -0.12);
  const grp = grip(0.05, 0.13, 0.055, dark, 0, -0.1, 0.06);
  const led1 = box(0.012, 0.014, 0.02, led, 0.03, 0.03, 0.08);
  return model([slide, barrel, frame, mag, sight, frontSight, grp, led1, muzzleAt(-0.2, 0.03)]);
}

/** MP-05 "VIPER" — compact automatic sidearm; a miniature SMG. Fast + aggressive. */
export function buildMP05Viper(tier: RenderTier): THREE.Group {
  const body = metal(COL.matteBlack, tier);
  const dark = metal(COL.gunmetal, tier);
  const led = accent(ACCENT.green, tier, 1.5);
  const slide = box(0.06, 0.08, 0.24, body, 0, 0.03, 0.0); // boxy upper
  slide.name = 'base:slide';
  const barrel = cylZ(0.02, 0.12, dark, 0, 0.03, -0.16);
  const shroud = box(0.05, 0.05, 0.12, dark, 0, 0.03, -0.14);
  const frame = box(0.055, 0.05, 0.18, dark, 0, -0.03, 0.02);
  frame.name = 'base:frame';
  const mag = box(0.045, 0.16, 0.05, dark, 0, -0.15, 0.08); // long extended mag
  mag.name = 'mag';
  const sight = box(0.03, 0.025, 0.14, dark, 0, 0.09, 0.02); // top rail
  sight.name = 'base:sight';
  const foreGrip = grip(0.04, 0.09, 0.05, dark, 0, -0.08, -0.1); // front grip
  const grp = grip(0.05, 0.13, 0.06, dark, 0, -0.1, 0.1);
  const led1 = box(0.012, 0.014, 0.03, led, 0.03, 0.04, 0.06);
  return model([slide, barrel, shroud, frame, mag, sight, foreGrip, grp, led1, muzzleAt(-0.24, 0.03)]);
}
