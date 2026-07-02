/**
 * buildMarine — the player's permanent Marine, assembled from the shared low-poly
 * `buildHumanoid` rig (the same base as the enemy classes) wearing Standard Issue
 * Recruit Armor, with every EQUIPPED engineering piece physically overlaid on the
 * correct named body-part group at its slot anchor. Paired slots (arms/legs) build a
 * fresh piece per side. The `coating` slot recolours the whole rig; the `insignia`
 * slot stamps a chest decal. Menu-avatar only — the game stays first-person.
 *
 * Imported ONLY by the /arcade chunk.
 */
import * as THREE from 'three';
import type { RenderTier } from '../materials';
import { buildHumanoid } from '../enemies/models/humanoid';
import type { EnemyParts } from '../enemies/models/trooper';
import { slotById, type BodyPart } from './slots';
import { divisionBase } from './divisions';
import { buildArmorPiece } from './partModel';
import type { ArmorPiece } from './parts';

/** Build the Marine wearing the given equipped pieces (empty = base armour). A
 *  `divisionId` swaps the base silhouette to that Combat Division; undefined = Recruit. */
export function buildMarine(equipped: ArmorPiece[], rt: RenderTier, divisionId?: string | null): THREE.Group {
  const root = buildHumanoid(divisionBase(divisionId, rt));
  const parts = root.userData.parts as EnemyParts;
  const groupOf = (p: BodyPart): THREE.Object3D => parts[p];

  for (const piece of equipped) {
    const slot = slotById(piece.slot);
    if (!slot) continue;
    if (slot.family === 'coating') {
      // Whole-rig tint: recolour the base armour material to the coating's metal.
      const mats = root.userData.bodyMats as THREE.Material[] | undefined;
      const m = mats?.[0] as (THREE.MeshStandardMaterial | THREE.MeshLambertMaterial) | undefined;
      m?.color.setHex(piece.model.body);
      continue;
    }
    for (const bp of slot.parts) {
      const target = groupOf(bp);
      if (!target) continue;
      const mesh = buildArmorPiece(piece.model, rt);
      mesh.position.set(slot.anchor[0], slot.anchor[1], slot.anchor[2]);
      target.add(mesh);
    }
  }
  return root;
}
