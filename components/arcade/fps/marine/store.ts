/**
 * MARINE PERSISTENCE — everything the Marine permanently remembers: owned armour
 * pieces, the equipped configuration (one per slot), per-slot familiarity XP + a
 * lightweight service record, lifetime bosses (the Legendary gate), and the Marine
 * Level (military experience, separate from campaign progression). Survives across
 * runs in localStorage (`starshell.marine`) — the spec's core promise that the
 * Marine evolves and nothing purchased is ever lost.
 *
 * The armor twin of arsenal/store.ts. Imported ONLY by the /arcade chunk.
 */
import { xpForOperation } from '../arsenal/familiarity';
import { generateArmor, armorById, type ArmorPiece } from './parts';

const KEY = 'starshell.marine';

export interface ArmorService {
  operations: number;
  xp: number;
}

export interface MarineSave {
  owned: string[]; // owned piece ids
  equipped: Record<string, string>; // slotId → pieceId
  partXp: Record<string, number>; // pieceId → familiarity XP
  service: Record<string, ArmorService>; // slotId → record
  bosses: number; // lifetime bosses defeated (Legendary gate signal)
  marineLevel: number; // 1..; ≤5 = Recruit
  marineXp: number; // toward the next Marine Level
}

function blank(): MarineSave {
  return { owned: [], equipped: {}, partXp: {}, service: {}, bosses: 0, marineLevel: 1, marineXp: 0 };
}

export function loadMarine(): MarineSave {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!raw || typeof raw !== 'object') return blank();
    const b = blank();
    return {
      owned: Array.isArray(raw.owned) ? raw.owned.filter((x: unknown) => typeof x === 'string') : b.owned,
      equipped: raw.equipped && typeof raw.equipped === 'object' ? raw.equipped : b.equipped,
      partXp: raw.partXp && typeof raw.partXp === 'object' ? raw.partXp : b.partXp,
      service: raw.service && typeof raw.service === 'object' ? raw.service : b.service,
      bosses: Number.isFinite(raw.bosses) ? raw.bosses : b.bosses,
      marineLevel: Number.isFinite(raw.marineLevel) ? Math.max(1, raw.marineLevel) : b.marineLevel,
      marineXp: Number.isFinite(raw.marineXp) ? raw.marineXp : b.marineXp,
    };
  } catch {
    return blank();
  }
}

export function saveMarine(s: MarineSave): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore (quota / private mode) */
  }
}

/** The pieces currently equipped across all slots (resolves saved ids to pieces). */
export function equippedArmorPieces(s: MarineSave): ArmorPiece[] {
  const out: ArmorPiece[] = [];
  for (const id of Object.values(s.equipped)) {
    const p = armorById(id);
    if (p) out.push(p);
  }
  return out;
}

/** Buy + own a piece. Returns a new save; caller deducts the AstroDiamonds. */
export function buyArmor(s: MarineSave, p: ArmorPiece): MarineSave {
  if (s.owned.includes(p.id)) return s;
  return { ...s, owned: [...s.owned, p.id] };
}

/** Equip an owned piece into its slot (one per slot). */
export function equipArmor(s: MarineSave, p: ArmorPiece): MarineSave {
  return { ...s, equipped: { ...s.equipped, [p.slot]: p.id } };
}

/** Familiarity XP a piece has accrued (for its evolution stage). */
export function pieceXp(s: MarineSave, id: string): number {
  return s.partXp[id] ?? 0;
}

const MARINE_LEVEL_XP = 400; // XP per Marine Level (Recruit spans 1..5)

/** Record a completed operation: every EQUIPPED piece gains familiarity XP, the
 *  Marine gains experience toward the next level, and a cleared boss bumps lifetime
 *  bosses. Returns the new save + whether the Marine levelled up. */
export function recordArmorOperation(
  s: MarineSave,
  o: { kills: number; shots: number; hits: number; won: boolean; bossWin: boolean },
): { save: MarineSave; leveledTo: number | null } {
  const acc = o.shots > 0 ? o.hits / o.shots : 0;
  const xp = xpForOperation({ kills: o.kills, accuracy: acc, won: o.won });
  const partXp = { ...s.partXp };
  const service = { ...s.service };
  for (const [slotId, pieceId] of Object.entries(s.equipped)) {
    partXp[pieceId] = (partXp[pieceId] ?? 0) + xp;
    const rec = service[slotId] ?? { operations: 0, xp: 0 };
    service[slotId] = { operations: rec.operations + 1, xp: rec.xp + xp };
  }
  const marineXp = s.marineXp + xp;
  const levels = Math.floor(marineXp / MARINE_LEVEL_XP);
  const marineLevel = Math.max(s.marineLevel, 1 + levels);
  const leveledTo = marineLevel > s.marineLevel ? marineLevel : null;
  return {
    save: { ...s, partXp, service, marineXp, marineLevel, bosses: s.bosses + (o.bossWin ? 1 : 0) },
    leveledTo,
  };
}

/** Re-export for callers that render the bench without importing parts.ts directly. */
export { generateArmor, armorById };
