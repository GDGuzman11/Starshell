/**
 * Enemy model dispatcher. Phase 1 ships the generic trooper for every class;
 * Phase 2 adds the 10 per-class builders into ENEMY_BUILDERS. Also a disposal
 * helper that frees a model's geometries + materials on level rebuild.
 */
import * as THREE from 'three';
import type { RenderTier } from '../../materials';
import { type EnemyClass, ROLE_TO_CLASS } from '../types';
import {
  buildBerserker,
  buildBreacher,
  buildCommander,
  buildElite,
  buildEngineer,
  buildMarksman,
  buildRifleman,
  buildScout,
  buildSuppressor,
  buildTank,
} from './classes';

type Builder = (tier: RenderTier) => THREE.Group;

const ENEMY_BUILDERS: Record<EnemyClass, Builder> = {
  rifleman: buildRifleman,
  scout: buildScout,
  breacher: buildBreacher,
  marksman: buildMarksman,
  suppressor: buildSuppressor,
  engineer: buildEngineer,
  tank: buildTank,
  elite: buildElite,
  commander: buildCommander,
  berserker: buildBerserker,
};

/** Build by class id OR by current AI role (resolved through ROLE_TO_CLASS). */
export function buildEnemyModel(key: string, tier: RenderTier): THREE.Group {
  const cls = (key in ENEMY_BUILDERS ? key : (ROLE_TO_CLASS[key] ?? 'rifleman')) as EnemyClass;
  return ENEMY_BUILDERS[cls](tier);
}

export function disposeEnemyModel(obj: THREE.Object3D): void {
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
    else if (mat) mat.dispose();
  });
}
