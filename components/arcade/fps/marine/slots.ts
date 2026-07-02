/**
 * ARMOR SLOTS — the Marine's engineering categories mapped onto a bounded set of
 * VISIBLE body slots so every component physically appears on the humanoid without
 * clipping. This is the armor analog of the weapon Arsenal's `categories.ts` +
 * `partModel.ts` SLOT_ANCHORS: each slot names a body-part group from `buildHumanoid`
 * (`head`/`torso`/`armL`/`armR`/`legL`/`legR`), a local anchor on that group, the
 * geometry family the renderer builds, and the primary defensive stat it favours.
 *
 * The spec's ~20 recruit categories collapse here: the pure body armour maps 1:1,
 * and the "systems / cosmetic" categories fold onto overlays (Comms → head module,
 * Power Core → chest module, Coating → whole-rig tint, Insignia → chest decal).
 *
 * Imported ONLY by the /arcade chunk.
 */

/** The four defensive stats an armour piece can favour. */
export type ArmorStat = 'armor' | 'mobility' | 'shield' | 'recovery';

/** Named rig groups exposed by buildHumanoid's `userData.parts`. */
export type BodyPart = 'head' | 'torso' | 'armL' | 'armR' | 'legL' | 'legR';

/** Geometry family the piece renderer switches on (see partModel.ts). */
export type ArmorFamily =
  | 'helmet' | 'visor' | 'plate' | 'pauldron' | 'limb' | 'cap'
  | 'glove' | 'boot' | 'backpack' | 'core' | 'comms' | 'insignia' | 'coating';

export interface ArmorSlot {
  id: string;
  label: string;
  parts: BodyPart[]; // 1 group, or a symmetric pair (arms/legs) the piece clones onto
  anchor: [number, number, number]; // local offset on each group
  family: ArmorFamily;
  primary: ArmorStat;
  cosmetic?: boolean; // no gameplay stat (coating / insignia)
  group: 'plating' | 'systems' | 'cosmetic'; // bench section
}

/**
 * 20 recruit slots. Anchors are baked for the recruit Marine's fixed build
 * (scale 1.0, girth 1.15) — the numbers track buildHumanoid's geometry so each
 * over-plate sits flush on the standard-issue body.
 */
export const ARMOR_SLOTS: ArmorSlot[] = [
  // ── plating ─────────────────────────────────────────────────────────────────
  { id: 'helmet', label: 'Helmet', parts: ['head'], anchor: [0, 0.1, 0], family: 'helmet', primary: 'armor', group: 'plating' },
  { id: 'visor', label: 'Visor', parts: ['head'], anchor: [0, 0.08, 0.15], family: 'visor', primary: 'recovery', group: 'plating' },
  { id: 'neck', label: 'Neck Guard', parts: ['torso'], anchor: [0, 0.52, 0.02], family: 'plate', primary: 'armor', group: 'plating' },
  { id: 'chest', label: 'Chest Plate', parts: ['torso'], anchor: [0, 0.3, 0.16], family: 'plate', primary: 'armor', group: 'plating' },
  { id: 'back', label: 'Back Plate', parts: ['torso'], anchor: [0, 0.32, -0.16], family: 'plate', primary: 'armor', group: 'plating' },
  { id: 'shoulders', label: 'Shoulders', parts: ['torso'], anchor: [0, 0.48, 0], family: 'pauldron', primary: 'armor', group: 'plating' },
  { id: 'upperArms', label: 'Upper Arms', parts: ['armL', 'armR'], anchor: [0, -0.2, 0], family: 'limb', primary: 'armor', group: 'plating' },
  { id: 'forearms', label: 'Forearms', parts: ['armL', 'armR'], anchor: [0, -0.4, 0], family: 'limb', primary: 'mobility', group: 'plating' },
  { id: 'gloves', label: 'Gloves', parts: ['armL', 'armR'], anchor: [0, -0.54, 0.02], family: 'glove', primary: 'mobility', group: 'plating' },
  { id: 'belt', label: 'Utility Belt', parts: ['torso'], anchor: [0, 0.02, 0.02], family: 'plate', primary: 'recovery', group: 'plating' },
  { id: 'hip', label: 'Hip Armor', parts: ['torso'], anchor: [0, -0.04, 0], family: 'plate', primary: 'armor', group: 'plating' },
  { id: 'thighs', label: 'Thigh Armor', parts: ['legL', 'legR'], anchor: [0, -0.28, 0.03], family: 'limb', primary: 'mobility', group: 'plating' },
  { id: 'knees', label: 'Knees', parts: ['legL', 'legR'], anchor: [0, -0.48, 0.05], family: 'cap', primary: 'mobility', group: 'plating' },
  { id: 'shins', label: 'Shin Guards', parts: ['legL', 'legR'], anchor: [0, -0.7, 0.04], family: 'limb', primary: 'mobility', group: 'plating' },
  { id: 'boots', label: 'Boots', parts: ['legL', 'legR'], anchor: [0, -0.88, 0.06], family: 'boot', primary: 'mobility', group: 'plating' },
  // ── systems ─────────────────────────────────────────────────────────────────
  { id: 'backpack', label: 'Backpack', parts: ['torso'], anchor: [0, 0.34, -0.24], family: 'backpack', primary: 'shield', group: 'systems' },
  { id: 'core', label: 'Power Core', parts: ['torso'], anchor: [0, 0.16, 0.16], family: 'core', primary: 'shield', group: 'systems' },
  { id: 'comms', label: 'Comms Module', parts: ['head'], anchor: [0.1, 0.22, -0.05], family: 'comms', primary: 'recovery', group: 'systems' },
  // ── cosmetic ────────────────────────────────────────────────────────────────
  { id: 'coating', label: 'Armor Coating', parts: ['torso'], anchor: [0, 0, 0], family: 'coating', primary: 'armor', cosmetic: true, group: 'cosmetic' },
  { id: 'insignia', label: 'Insignia', parts: ['torso'], anchor: [0, 0.34, 0.155], family: 'insignia', primary: 'armor', cosmetic: true, group: 'cosmetic' },
];

export const ARMOR_SLOT_IDS = ARMOR_SLOTS.map((s) => s.id);
export function slotById(id: string): ArmorSlot | undefined {
  return ARMOR_SLOTS.find((s) => s.id === id);
}

export const ARMOR_STAT_LABEL: Record<ArmorStat, string> = {
  armor: 'Armor',
  mobility: 'Mobility',
  shield: 'Shield',
  recovery: 'Recovery',
};
