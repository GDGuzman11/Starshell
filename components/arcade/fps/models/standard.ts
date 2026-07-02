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
import { ACCENT, COL, accent, box, cylZ, grip, metal, model } from './parts';

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
