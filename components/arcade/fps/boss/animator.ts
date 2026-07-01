/**
 * Transform-based boss animator (no skeleton) — poses the named `userData.parts`
 * of a boss model each frame: idle sway, leg gait while moving, tail sway, and a
 * red hit-flash on the body materials. P1+ will layer attack-windup/release poses
 * (pounce crouch, tail-sweep arc) on top via the optional `attack` argument.
 *
 * Imported ONLY by the /arcade chunk.
 */
import * as THREE from 'three';
import type { BossKind } from '../enemy';
import type { BossParts } from './models';

export function poseBossModel(
  model: THREE.Group,
  kind: BossKind,
  moving: boolean,
  step: number,
  hitFlash: number,
  now: number,
  weak = false,
): void {
  const parts = model.userData.parts as BossParts | undefined;
  if (!parts) return;
  const t = now * 0.001;

  // Idle breathing sway + leg gait (parts vary by boss shape).
  if (parts.torso) parts.torso.rotation.z = Math.sin(t * 1.4) * 0.04;
  const gait = moving ? Math.sin(step * 2.4) : 0;
  if (parts.legL) parts.legL.rotation.x = gait * 0.5;
  if (parts.legR) parts.legR.rotation.x = -gait * 0.5;

  // BEHEMOTH quadruped: a heavy diagonal trot (legs 0/3 vs 1/2) + a ground-shake bob.
  if (parts.legs) {
    const g2 = moving ? Math.sin(step * 2.0) : 0;
    for (let li = 0; li < parts.legs.length; li++) parts.legs[li].rotation.x = g2 * 0.33 * (li === 0 || li === 3 ? 1 : -1);
    if (parts.torso) parts.torso.position.y = (parts.torso.userData.baseY ??= parts.torso.position.y) + (moving ? Math.abs(g2) * 0.06 : 0);
  }

  // SPECTER wisps drift; the whole wraith flickers translucent (solid when weak).
  const wisps = model.userData.wisps as THREE.Group[] | undefined;
  if (wisps) for (let i = 0; i < wisps.length; i++) wisps[i].rotation.x = Math.sin(t * 1.7 + i * 1.3) * 0.28;

  // LEVIATHAN serpent: a travelling side-to-side undulation down the segments.
  const segments = model.userData.segments as THREE.Group[] | undefined;
  if (segments)
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i];
      s.position.x = ((s.userData.baseX ??= s.position.x) as number) + Math.sin(t * 1.6 + i * 0.6) * 0.25 * (1 - i / (segments.length + 1));
      s.rotation.y = Math.sin(t * 1.6 + i * 0.6) * 0.2;
    }

  // Restless tail (Xenomorph) + head sway.
  if (parts.tail) {
    parts.tail.rotation.y = Math.sin(t * 1.1) * 0.3;
    parts.tail.rotation.x = 0.1 + Math.sin(t * 0.8) * 0.1;
  }
  if (parts.head) parts.head.rotation.z = Math.sin(t * 1.6) * 0.05;

  // Writhing tentacles (Kraken).
  const tentacles = model.userData.tentacles as THREE.Group[] | undefined;
  if (tentacles) for (let i = 0; i < tentacles.length; i++) tentacles[i].rotation.z = Math.sin(t * 1.3 + i * 1.1) * 0.18;

  // ARCHON: the light-ring rotates, the orbiting facets counter-spin + bob.
  if (parts.ring) {
    parts.ring.rotation.y = t * 1.1;
    parts.ring.rotation.z = Math.sin(t * 0.6) * 0.12;
  }
  if (parts.orbit) {
    parts.orbit.rotation.y = -t * 1.6;
    parts.orbit.position.y = ((parts.orbit.userData.baseY ??= parts.orbit.position.y) as number) + Math.sin(t * 2) * 0.1;
  }

  // Emissive: a green VULNERABLE pulse during the weak-point window, otherwise a
  // red hit-flash on the carapace.
  const mats = model.userData.bodyMats as THREE.Material[] | undefined;
  if (mats) {
    const hf = hitFlash > 0 ? Math.min(1, hitFlash / 0.12) : 0;
    const wk = weak ? 0.4 + 0.4 * (0.5 + 0.5 * Math.sin(t * 12)) : 0;
    // SPECTER: flicker translucent (phasing); go solid during the weak window.
    const op = kind === 'specter' ? (weak ? 1 : Math.max(0.22, 0.4 + 0.18 * Math.sin(t * 9) + 0.1 * Math.sin(t * 23))) : 0;
    for (const m of mats) {
      const sm = m as THREE.MeshStandardMaterial;
      if (kind === 'specter' && sm.transparent) sm.opacity = op;
      if (sm.emissive) {
        if (wk > 0) sm.emissive.setRGB(wk * 0.2, wk, wk * 0.35);
        else sm.emissive.setRGB(hf * 0.8, hf * 0.12, hf * 0.12);
      }
    }
  }
}

/** Death topple: fall backward and sink as `t` (seconds) runs 0 → ~1.4. */
export function poseBossDeath(model: THREE.Group, t: number): void {
  const k = Math.min(1, t / 1.4);
  model.rotation.x = -k * 1.1;
  model.scale.multiplyScalar(1); // (scale set at mount; topple is rotation-only)
}
