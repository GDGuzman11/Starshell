/**
 * Boss-faction minions — 3D low-poly aliens (primitives only) that fight as the
 * boss's themed squad. Xenomorph hive first: Broodling (fast melee swarm), Spitter
 * (acid ranged support), Stalker (flanker/ambusher). Each is a distinct, readable
 * silhouette — you know the role before it acts. Stats + models + a tiny animator
 * live here; the role AI is a branch in `enemy.ts` (it needs the move/LoS helpers).
 *
 * Imported ONLY by the /arcade chunk.
 */
import * as THREE from 'three';
import type { RenderTier } from '../materials';
import { accent, box, capsuleZ, coneZ, metal } from '../models/parts';

export type MinionKind = 'broodling' | 'spitter' | 'stalker';

export interface MinionDef {
  hp: number;
  speedMul: number; // × the regular enemy base speed
  scale: number;
  melee: number; // melee damage (0 = none)
  ranged: number; // acid-spit damage (0 = none)
  color: number;
}

export const MINIONS: Record<MinionKind, MinionDef> = {
  broodling: { hp: 55, speedMul: 2.0, scale: 1.0, melee: 9, ranged: 0, color: 0x121214 },
  spitter: { hp: 95, speedMul: 1.15, scale: 1.25, melee: 0, ranged: 12, color: 0x2a4a24 },
  stalker: { hp: 120, speedMul: 1.65, scale: 1.4, melee: 15, ranged: 0, color: 0x16161e },
};

const GREEN = 0x6aff7a;

/** Tiny low-crawling swarmer: flat dark body, sharp legs, green eyes. */
function buildBroodling(tier: RenderTier): THREE.Group {
  const body = metal(0x121214, tier, 0.35, 0.85);
  const glow = accent(GREEN, tier, 1.6);
  const root = new THREE.Group();
  const core = new THREE.Group();
  core.position.y = 0.4;
  core.add(box(0.34, 0.2, 0.5, body, 0, 0, 0)); // low carapace
  core.add(coneZ(0, 0.1, 0.3, body, 0, 0.02, 0.3)); // snout
  core.add(box(0.05, 0.04, 0.04, glow, -0.08, 0.05, 0.34)); // eyes
  core.add(box(0.05, 0.04, 0.04, glow, 0.08, 0.05, 0.34));
  for (const sx of [-1, 1])
    for (const sz of [-0.15, 0.15]) {
      const leg = box(0.04, 0.34, 0.04, body, sx * 0.22, -0.16, sz);
      leg.rotation.z = sx * 0.5;
      core.add(leg);
    }
  root.add(core);
  root.userData.bodyMats = [body];
  root.userData.core = core;
  return root;
}

/** Hunched acid support: glowing throat sac, stubby tail. */
function buildSpitter(tier: RenderTier): THREE.Group {
  const body = metal(0x1a2e16, tier, 0.4, 0.8);
  const glow = accent(GREEN, tier, 1.7);
  const root = new THREE.Group();
  const core = new THREE.Group();
  core.position.y = 0.7;
  core.rotation.x = 0.3;
  core.add(capsuleZ(0.26, 0.4, body, 0, 0, 0)); // hunched body
  core.add(box(0.22, 0.18, 0.14, glow, 0, -0.04, 0.28)); // throat sac (glows)
  core.add(coneZ(0, 0.12, 0.3, body, 0, 0.16, -0.04)); // head
  const tail = coneZ(0.08, 0, 0.4, body, 0, -0.1, -0.34);
  tail.rotation.x = 0.5;
  core.add(tail);
  root.add(core);
  for (const sx of [-1, 1]) root.add(box(0.08, 0.5, 0.1, body, sx * 0.16, 0.25, 0)); // legs
  root.userData.bodyMats = [body];
  root.userData.core = core;
  return root;
}

/** Tall thin flanker: long limbs, darker, elongated head. */
function buildStalker(tier: RenderTier): THREE.Group {
  const body = metal(0x16161e, tier, 0.34, 0.88);
  const glow = accent(GREEN, tier, 1.5);
  const root = new THREE.Group();
  const core = new THREE.Group();
  core.position.y = 1.0;
  core.add(capsuleZ(0.18, 0.5, body, 0, 0.1, 0)); // slim torso
  core.add(coneZ(0, 0.12, 0.5, body, 0, 0.3, -0.04)); // elongated skull
  core.add(box(0.04, 0.03, 0.06, glow, -0.06, 0.32, 0.16)); // eye glints
  core.add(box(0.04, 0.03, 0.06, glow, 0.06, 0.32, 0.16));
  for (const sx of [-1, 1]) {
    const arm = box(0.06, 0.6, 0.06, body, sx * 0.24, 0.0, 0.05);
    arm.rotation.z = sx * 0.3;
    core.add(arm);
  }
  root.add(core);
  for (const sx of [-1, 1]) {
    const leg = box(0.08, 0.95, 0.1, body, sx * 0.14, 0.5, 0);
    root.add(leg);
  }
  root.userData.bodyMats = [body];
  root.userData.core = core;
  return root;
}

export function buildMinionModel(kind: MinionKind, tier: RenderTier): THREE.Group {
  if (kind === 'broodling') return buildBroodling(tier);
  if (kind === 'spitter') return buildSpitter(tier);
  return buildStalker(tier);
}

/** Per-frame minion animation: a gait/idle sway on the core + a red hit-flash. */
export function poseMinion(model: THREE.Group, _kind: MinionKind, moving: boolean, step: number, hitFlash: number, now: number): void {
  const core = model.userData.core as THREE.Group | undefined;
  if (core) {
    const t = now * 0.001;
    core.rotation.z = Math.sin(t * 2 + step) * (moving ? 0.12 : 0.04);
    core.position.y = (core.userData.baseY ??= core.position.y) + (moving ? Math.abs(Math.sin(step * 2)) * 0.08 : 0);
  }
  const mats = model.userData.bodyMats as THREE.Material[] | undefined;
  if (mats) {
    const hf = hitFlash > 0 ? Math.min(1, hitFlash / 0.12) : 0;
    for (const m of mats) {
      const sm = m as THREE.MeshStandardMaterial;
      if (sm.emissive) sm.emissive.setRGB(hf * 0.8, hf * 0.12, hf * 0.12);
    }
  }
}
