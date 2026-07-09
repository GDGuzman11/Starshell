/**
 * Launcher family — ROCKET TUBE, NOVA CANNON, SINGULARITY. The Rocket Tube is a
 * brutally simple oversized tube; the Nova Cannon is an unstable plasma cannon
 * with a front chamber + spinning plasma rings + heavy fins; the Singularity is
 * the most alien weapon — a large circular gravity ring with a floating core and
 * an asymmetric body. Muzzle toward −Z. Spinning/glowing parts named for the animator.
 */
import * as THREE from 'three';
import type { RenderTier } from '../materials';
import { ACCENT, COL, accent, box, capsuleZ, coneZ, cylZ, finStack, grip, metal, model } from './parts';

function muzzleAt(z: number, y = 0): THREE.Object3D {
  const o = new THREE.Object3D();
  o.name = 'muzzle';
  o.position.set(0, y, z);
  return o;
}

/** ROCKET TUBE — single oversized launch tube, rear loading, brutal + simple. */
export function buildRocketTube(tier: RenderTier): THREE.Group {
  const body = metal(COL.olive, tier);
  const dark = metal(COL.matteBlack, tier);
  const hot = accent(ACCENT.orange, tier);
  const tube = cylZ(0.08, 0.78, body, 0, 0.02, -0.06); // one big tube
  tube.name = 'base:tube';
  const mouth = cylZ(0.095, 0.06, dark, 0, 0.02, -0.44); // flared muzzle
  const rearMouth = cylZ(0.095, 0.06, dark, 0, 0.02, 0.32); // rear loading
  const warhead = coneZ(0.0, 0.05, 0.12, hot, 0, 0.02, -0.42); // loaded warhead tip
  warhead.name = 'base:warhead';
  const sight = box(0.02, 0.06, 0.04, hot, 0, 0.12, -0.18); // top sight
  sight.name = 'base:sight';
  const sideGrip = grip(0.05, 0.12, 0.07, dark, 0, -0.1, -0.04);
  const rearGrip = grip(0.05, 0.11, 0.06, dark, 0, -0.09, 0.2);
  const heatBand = cylZ(0.085, 0.03, hot, 0, 0.02, -0.28);
  return model([tube, mouth, rearMouth, warhead, sight, sideGrip, rearGrip, heatBand, muzzleAt(-0.47, 0.02)]);
}

/** NOVA CANNON — huge plasma cannon, front chamber, spinning rings, heavy fins. */
export function buildNovaCannon(tier: RenderTier): THREE.Group {
  const body = metal(COL.gunmetal, tier);
  const dark = metal(COL.matteBlack, tier);
  const plasma = accent(ACCENT.red, tier, 1.8);
  const block = box(0.16, 0.16, 0.34, body, 0, 0, 0.12); // heavy body
  const battery = box(0.2, 0.18, 0.14, dark, 0, -0.01, 0.3); // oversized battery = core
  battery.name = 'base:core';
  const fins = finStack(6, 0.045, 0.18, 0.16, dark, 0, 0.02, 0.0); // heavy cooling fins
  const chamber = capsuleZ(0.09, 0.1, plasma, 0, 0.01, -0.26); // front energy chamber
  chamber.name = 'coil';
  // rotating plasma rings at the front
  const spin = new THREE.Group();
  spin.name = 'spin';
  for (let i = 0; i < 3; i++) spin.add(cylZ(0.11 - i * 0.005, 0.02, plasma, 0, 0, -0.32 - i * 0.05));
  spin.position.set(0, 0.01, 0);
  const mouth = cylZ(0.12, 0.04, dark, 0, 0.01, -0.46);
  const grp = grip(0.07, 0.16, 0.09, dark, 0, -0.16, 0.18);
  return model([block, battery, fins, chamber, spin, mouth, grp, muzzleAt(-0.5, 0.01)]);
}

/** SINGULARITY — experimental black-hole launcher: gravity ring, floating core, asymmetric. */
export function buildSingularity(tier: RenderTier): THREE.Group {
  const body = metal(COL.titanium, tier, 0.4, 0.9);
  const dark = metal(COL.matteBlack, tier);
  const grav = accent(ACCENT.purple, tier, 2.0);
  // asymmetric body — offset block + an angled side pod
  const block = box(0.12, 0.13, 0.32, body, 0.01, -0.01, 0.14);
  const pod = box(0.07, 0.09, 0.16, dark, 0.1, 0.05, 0.08);
  pod.rotation.z = -0.25;
  // large circular gravity ring at the front (12 segments → a ring)
  const ring = new THREE.Group();
  ring.name = 'spin';
  const RR = 0.15;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const seg = box(0.035, 0.05, 0.05, i % 2 ? grav : dark, Math.cos(a) * RR, Math.sin(a) * RR, -0.28);
    seg.rotation.z = a;
    ring.add(seg);
  }
  ring.position.set(0, 0.0, 0);
  // floating internal core — offset from centre for an unstable look
  const core = box(0.07, 0.07, 0.07, grav, 0.02, 0.01, -0.28);
  core.name = 'coil';
  const arm = box(0.03, 0.03, 0.22, body, 0, 0.0, -0.12); // arm reaching to the ring
  const grp = grip(0.06, 0.15, 0.08, dark, -0.01, -0.15, 0.18);
  const emitter = box(0.05, 0.05, 0.05, grav, 0.02, 0.01, -0.28);
  return model([block, pod, ring, core, arm, grp, emitter, muzzleAt(-0.32, 0.01)]);
}
