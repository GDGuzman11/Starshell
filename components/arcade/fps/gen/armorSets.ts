/**
 * Generated armour-set REGISTRY — a leaf store of `ArmorSetBlueprint`s (baked +
 * session). `marine/parts.ts` reads it to (a) build a set's themed pieces for preview
 * and (b) append baked sets' themed pieces into the matching division's Armory slots,
 * so a baked set becomes equippable in the bench. Imports only types + the baked JSON
 * (no cycle with marine/parts).
 */
import { parseArmorSet, type ArmorSetBlueprint } from './armorBlueprint';
import bakedRaw from './generated-armor.json';

const SETS = new Map<string, ArmorSetBlueprint>();

export function registerArmorSet(bp: ArmorSetBlueprint): void {
  SETS.set(bp.id, bp);
}
export function registerArmorSets(list: ArmorSetBlueprint[]): void {
  for (const bp of list) registerArmorSet(bp);
}
export function getArmorSet(id: string): ArmorSetBlueprint | undefined {
  return SETS.get(id);
}
export function armorSets(): ArmorSetBlueprint[] {
  return [...SETS.values()];
}
export function armorSetsForDivision(division: string): ArmorSetBlueprint[] {
  return [...SETS.values()].filter((s) => s.division === division);
}

// BAKED sets: register the checked-in generated-armor.json at module load.
const baked: ArmorSetBlueprint[] = (Array.isArray(bakedRaw) ? bakedRaw : [])
  .map((r) => parseArmorSet(r))
  .filter((b): b is ArmorSetBlueprint => b !== null);
registerArmorSets(baked);
