/**
 * Arsenal PERSISTENCE + Service Records. Everything the player engineers is PERMANENT
 * (owned parts, equipped configuration, per-weapon service record, familiarity XP) and
 * survives across runs in localStorage (`starshell.arsenal`) — the spec's core promise
 * that nothing purchased is ever lost. Gold/customize stay per-run and are untouched.
 *
 * Imported ONLY by the /arcade chunk.
 */
import { RECRUIT_WEAPONS, type Family } from '../weapons';
import { generateParts, type EngPart } from './parts';
import { xpForOperation } from './familiarity';

const KEY = 'starshell.arsenal';

/** Everything a weapon permanently remembers (shown in the Arsenal). */
export interface ServiceRecord {
  kills: number;
  headshots: number;
  bossKills: number;
  operations: number;
  shots: number;
  hits: number;
  bestStreak: number;
  astroInvested: number;
  partsInstalled: number;
  xp: number; // weapon familiarity XP
}

export interface ArsenalSave {
  owned: string[]; // owned part ids
  equipped: Record<string, Partial<Record<string, string>>>; // weaponId → categoryId → partId
  partXp: Record<string, number>; // partId → familiarity XP
  service: Record<string, ServiceRecord>; // weaponId → record
  bosses: number; // lifetime bosses defeated (Legendary gate signal)
  unlockedWeapons: string[]; // NON-recruit guns bought with AstroDiamonds (permanent)
}

export function blankRecord(): ServiceRecord {
  return { kills: 0, headshots: 0, bossKills: 0, operations: 0, shots: 0, hits: 0, bestStreak: 0, astroInvested: 0, partsInstalled: 0, xp: 0 };
}
function blank(): ArsenalSave {
  return { owned: [], equipped: {}, partXp: {}, service: {}, bosses: 0, unlockedWeapons: [] };
}

export function loadArsenal(): ArsenalSave {
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
      unlockedWeapons: Array.isArray(raw.unlockedWeapons) ? raw.unlockedWeapons.filter((x: unknown) => typeof x === 'string') : b.unlockedWeapons,
    };
  } catch {
    return blank();
  }
}

export function saveArsenal(s: ArsenalSave): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore (quota / private mode) */
  }
}

export function serviceFor(s: ArsenalSave, weaponId: string): ServiceRecord {
  return s.service[weaponId] ?? blankRecord();
}

/** The EngParts currently equipped on a weapon (resolves the saved ids to parts). */
export function equippedParts(s: ArsenalSave, weaponId: string, family: Family): EngPart[] {
  const map = s.equipped[weaponId];
  if (!map) return [];
  const all = generateParts(weaponId, family);
  const ids = new Set(Object.values(map).filter(Boolean) as string[]);
  return all.filter((p) => ids.has(p.id));
}

/** Buy + own a part (records the AstroDiamond investment on the weapon). Returns a new
 *  save; the caller is responsible for deducting the AstroDiamonds from the wallet. */
export function buyPart(s: ArsenalSave, p: EngPart): ArsenalSave {
  if (s.owned.includes(p.id)) return s;
  const rec = serviceFor(s, p.weaponId);
  return {
    ...s,
    owned: [...s.owned, p.id],
    service: { ...s.service, [p.weaponId]: { ...rec, astroInvested: rec.astroInvested + p.price, partsInstalled: rec.partsInstalled + 1 } },
  };
}

/** Equip an owned part into its category slot (one part per category). */
export function equipPart(s: ArsenalSave, p: EngPart): ArsenalSave {
  const map = { ...(s.equipped[p.weaponId] ?? {}) };
  map[p.category] = p.id;
  return { ...s, equipped: { ...s.equipped, [p.weaponId]: map } };
}

/** Standard Issue guns are always usable; every other gun must be unlocked with AD. */
export function isWeaponUnlocked(s: ArsenalSave, id: string): boolean {
  return RECRUIT_WEAPONS.has(id) || s.unlockedWeapons.includes(id);
}
/** Permanently unlock a gun (caller deducts the AstroDiamonds). */
export function unlockWeapon(s: ArsenalSave, id: string): ArsenalSave {
  if (isWeaponUnlocked(s, id)) return s;
  return { ...s, unlockedWeapons: [...s.unlockedWeapons, id] };
}

/** Record a completed operation: every weapon that DEPLOYED (and each of its equipped
 *  parts) gains familiarity XP + service stats; a cleared boss level bumps lifetime
 *  bosses (the Legendary gate). Returns the new save + the XP each weapon earned. */
export function recordOperation(
  s: ArsenalSave,
  guns: { id: string; family: Family }[],
  o: { kills: number; shots: number; hits: number; won: boolean; bossWin: boolean },
): { save: ArsenalSave; xp: number } {
  const acc = o.shots > 0 ? o.hits / o.shots : 0;
  const xp = xpForOperation({ kills: o.kills, accuracy: acc, won: o.won });
  const service = { ...s.service };
  const partXp = { ...s.partXp };
  const seen = new Set<string>();
  for (const g of guns) {
    if (seen.has(g.id)) continue;
    seen.add(g.id);
    const rec = { ...serviceFor(s, g.id) };
    rec.xp += xp;
    rec.kills += o.kills;
    rec.operations += 1;
    rec.shots += o.shots;
    rec.hits += o.hits;
    if (o.bossWin) rec.bossKills += 1;
    service[g.id] = rec;
    for (const p of equippedParts(s, g.id, g.family)) partXp[p.id] = (partXp[p.id] ?? 0) + xp;
  }
  return { save: { ...s, service, partXp, bosses: s.bosses + (o.bossWin ? 1 : 0) }, xp };
}
