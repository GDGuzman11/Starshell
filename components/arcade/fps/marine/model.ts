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
import { buildArmorPiece } from './partModel';
import type { ArmorPiece } from './parts';

/** The recruit Marine's fixed base build — anchors in slots.ts are baked for this. */
function buildRecruitBase(rt: RenderTier): THREE.Group {
  return buildHumanoid({
    tier: rt,
    scale: 1.0,
    girth: 1.15,
    accent: 0x7fdfff,
    body: 0x3a4250,
    dark: 0x1c1f24,
    legs: 'normal',
    shoulders: 0.7,
    heavyArms: false,
    weapon: 'none',
    backpack: 'none',
    antenna: 1,
  });
}

/** Build the Marine wearing the given equipped pieces (empty = base recruit armor). */
export function buildMarine(equipped: ArmorPiece[], rt: RenderTier): THREE.Group {
  const root = buildRecruitBase(rt);
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
