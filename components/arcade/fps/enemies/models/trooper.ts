/**
 * Generic 3D enemy trooper — the foundation model for the doctrine overhaul,
 * built from the same primitives as the guns (zero asset files). It's a low-poly
 * humanoid RIGGED for transform-based animation: limbs are sub-groups whose origin
 * sits at the joint (hip / shoulder) so the animator can swing them. Forward = +Z
 * (so facing the player = `rotation.y = atan2(dx, dz)`); feet at y=0.
 *
 * `userData.parts` exposes the animatable joints; `userData.bodyMats` is the set
 * of non-glow materials the loop tints red on hit (the glow eye/core is excluded).
 */
import * as THREE from 'three';
import type { RenderTier } from '../../materials';
import { ACCENT, COL, accent, box, cylY, metal } from '../../models/parts';

export interface EnemyParts {
  legL: THREE.Object3D;
  legR: THREE.Object3D;
  torso: THREE.Object3D;
  head: THREE.Object3D;
  armL: THREE.Object3D;
  armR: THREE.Object3D;
  weapon: THREE.Object3D;
}

export function buildTrooper(tier: RenderTier): THREE.Group {
  const armor = metal(COL.gunmetal, tier);
  const dark = metal(COL.matteBlack, tier);
  const gun = metal(0x1a1d24, tier);
  const eye = accent(ACCENT.green, tier, 1.4);

  const root = new THREE.Group();

  // Legs — sub-group pivoting at the hip (y=0.9), mesh extending down to y=0.
  const mkLeg = (sx: number): THREE.Group => {
    const g = new THREE.Group();
    g.position.set(sx, 0.9, 0);
    g.add(box(0.16, 0.5, 0.18, armor, 0, -0.25, 0)); // thigh
    g.add(box(0.15, 0.46, 0.16, dark, 0, -0.68, 0.01)); // shin
    g.add(box(0.2, 0.08, 0.28, dark, 0, -0.9, 0.05)); // foot
    return g;
  };
  const legL = mkLeg(-0.13);
  const legR = mkLeg(0.13);

  // Torso — everything above the hips, so it can bob / lean / rotate independently.
  const torso = new THREE.Group();
  torso.position.set(0, 0.9, 0);
  torso.add(box(0.42, 0.5, 0.28, armor, 0, 0.28, 0)); // chest
  torso.add(box(0.48, 0.13, 0.32, dark, 0, 0.5, 0)); // shoulder yoke
  torso.add(box(0.16, 0.16, 0.1, eye, 0, 0.3, 0.16)); // chest core (glow)

  const head = new THREE.Group();
  head.position.set(0, 0.62, 0);
  head.add(box(0.22, 0.22, 0.24, dark, 0, 0.08, 0)); // helmet
  head.add(box(0.2, 0.06, 0.03, eye, 0, 0.08, 0.13)); // visor (glow)
  head.add(cylY(0.012, 0.12, dark, 0.07, 0.22, -0.05)); // antenna
  torso.add(head);

  const mkArm = (sx: number): THREE.Group => {
    const g = new THREE.Group();
    g.position.set(sx, 0.46, 0);
    g.add(box(0.13, 0.46, 0.14, armor, 0, -0.22, 0)); // arm
    return g;
  };
  const armL = mkArm(-0.28);
  const armR = mkArm(0.28);
  torso.add(armL, armR);

  // Weapon held by the right arm, pointing forward (+Z).
  const weapon = new THREE.Group();
  weapon.position.set(0, -0.36, 0.12);
  weapon.add(box(0.08, 0.11, 0.46, gun, 0, 0, 0.16)); // body
  weapon.add(box(0.05, 0.05, 0.3, gun, 0, 0.02, 0.42)); // barrel
  weapon.add(box(0.06, 0.14, 0.08, gun, 0, -0.1, 0.06)); // mag
  armR.add(weapon);

  root.add(legL, legR, torso);

  const parts: EnemyParts = { legL, legR, torso, head, armL, armR, weapon };
  root.userData.parts = parts;
  root.userData.bodyMats = [armor, dark, gun];
  return root;
}
