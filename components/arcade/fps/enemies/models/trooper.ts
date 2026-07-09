/**
 * EnemyParts — the animatable joint rig shared by every enemy model (built by
 * `buildHumanoid`). Forward = +Z (facing the player = `rotation.y = atan2(dx, dz)`);
 * feet at y=0. `userData.parts` exposes these joints; `userData.bodyMats` is the set
 * of non-glow materials the loop tints red on hit (the glow eye/core is excluded).
 */
import type * as THREE from 'three';

export interface EnemyParts {
  legL: THREE.Object3D;
  legR: THREE.Object3D;
  torso: THREE.Object3D;
  head: THREE.Object3D;
  armL: THREE.Object3D;
  armR: THREE.Object3D;
  weapon: THREE.Object3D;
}
