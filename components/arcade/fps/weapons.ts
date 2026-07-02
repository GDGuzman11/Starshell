/**
 * Player gun arsenal — across the rifle / MG / laser / sniper / pistol families,
 * each with its own feel (auto vs semi, fire rate, damage, mag, reload, ADS
 * zoom, tracer colour). Hitscan. The loadout is 2 primaries + 1 sidearm; the
 * full 20-weapon pool + selection screen + gold shop build on top of this.
 */
export type Family = 'rifle' | 'mg' | 'laser' | 'sniper' | 'pistol' | 'launcher';

export interface GunDef {
  id: string;
  name: string;
  family: Family;
  dmg: number;
  rate: number; // seconds between shots
  mag: number;
  reserve: number;
  reload: number;
  auto: boolean; // hold-to-fire vs one-per-click
  scoped: boolean; // sniper scope overlay on ADS
  hipFov: number;
  adsFov: number;
  color: number; // tracer colour
  splash?: number; // explosive AoE radius (launchers); 0/undefined = hitscan single-target
}

export const GUNS: GunDef[] = [
  // rifles (PRIMARY: +10 dmg pass)
  { id: 'ar', name: 'PULSE AR', family: 'rifle', dmg: 36, rate: 0.11, mag: 30, reserve: 180, reload: 1.6, auto: true, scoped: false, hipFov: 78, adsFov: 58, color: 0xffe9a8 },
  { id: 'carbine', name: 'CARBINE', family: 'rifle', dmg: 56, rate: 0.22, mag: 20, reserve: 140, reload: 1.5, auto: false, scoped: false, hipFov: 78, adsFov: 55, color: 0xffd27a },
  { id: 'assaultx', name: 'ASSAULT-X', family: 'rifle', dmg: 40, rate: 0.1, mag: 35, reserve: 210, reload: 1.7, auto: true, scoped: false, hipFov: 78, adsFov: 56, color: 0xffe0b0 },
  // MGs (PRIMARY: +10 dmg pass)
  { id: 'smg', name: 'NOVA SMG', family: 'mg', dmg: 26, rate: 0.07, mag: 40, reserve: 280, reload: 1.7, auto: true, scoped: false, hipFov: 80, adsFov: 64, color: 0xff8a96 },
  { id: 'lmg', name: 'SIEGE LMG', family: 'mg', dmg: 34, rate: 0.09, mag: 75, reserve: 300, reload: 2.6, auto: true, scoped: false, hipFov: 80, adsFov: 64, color: 0xff5d6e },
  { id: 'ripper', name: 'RIPPER', family: 'mg', dmg: 23, rate: 0.05, mag: 50, reserve: 320, reload: 2.0, auto: true, scoped: false, hipFov: 82, adsFov: 68, color: 0xff6f9a },
  // lasers (PRIMARY: +10 dmg pass)
  { id: 'pulse', name: 'ION REPEATER', family: 'laser', dmg: 32, rate: 0.08, mag: 50, reserve: 250, reload: 1.8, auto: true, scoped: false, hipFov: 78, adsFov: 58, color: 0x7fdfff },
  { id: 'beam', name: 'LANCE BEAM', family: 'laser', dmg: 23, rate: 0.08, mag: 60, reserve: 300, reload: 2.0, auto: true, scoped: false, hipFov: 78, adsFov: 48, color: 0x9af0ff }, // continuous beam: fast low-damage ticks while held
  { id: 'arc', name: 'ARC THROWER', family: 'laser', dmg: 40, rate: 0.13, mag: 28, reserve: 168, reload: 1.9, auto: true, scoped: false, hipFov: 78, adsFov: 56, color: 0x6ad0ff },
  // snipers (+40 dmg pass; RAILGUN gets a bigger "destructive" bump)
  { id: 'rail', name: 'RAILGUN', family: 'sniper', dmg: 350, rate: 0.95, mag: 5, reserve: 40, reload: 2.4, auto: false, scoped: true, hipFov: 78, adsFov: 22, color: 0xc8a8ff },
  { id: 'marksman', name: 'MARKSMAN', family: 'sniper', dmg: 135, rate: 0.5, mag: 10, reserve: 60, reload: 2.0, auto: false, scoped: true, hipFov: 78, adsFov: 38, color: 0xd8c0ff },
  { id: 'piercer', name: 'PIERCER', family: 'sniper', dmg: 160, rate: 0.7, mag: 7, reserve: 49, reload: 2.2, auto: false, scoped: true, hipFov: 78, adsFov: 28, color: 0xb890ff },
  // launchers — explosive, high single-shot damage + AoE splash
  { id: 'rocket', name: 'ROCKET TUBE', family: 'launcher', dmg: 200, rate: 1.2, mag: 4, reserve: 16, reload: 2.6, auto: false, scoped: false, hipFov: 78, adsFov: 62, color: 0xff7a3a, splash: 6 },
  { id: 'novacannon', name: 'NOVA CANNON', family: 'launcher', dmg: 300, rate: 1.8, mag: 3, reserve: 9, reload: 3.0, auto: false, scoped: false, hipFov: 78, adsFov: 60, color: 0xff5d6e, splash: 7.5 },
  { id: 'singularity', name: 'SINGULARITY', family: 'launcher', dmg: 420, rate: 2.6, mag: 2, reserve: 6, reload: 3.4, auto: false, scoped: false, hipFov: 78, adsFov: 58, color: 0xc08bff, splash: 9 },
  // sidearms
  { id: 'sidearm', name: 'SIDEARM', family: 'pistol', dmg: 36, rate: 0.2, mag: 14, reserve: 90, reload: 1.2, auto: false, scoped: false, hipFov: 78, adsFov: 60, color: 0xaef5c8 },
  { id: 'handcannon', name: 'HAND CANNON', family: 'pistol', dmg: 70, rate: 0.5, mag: 7, reserve: 49, reload: 1.6, auto: false, scoped: false, hipFov: 78, adsFov: 58, color: 0x8fe0b0 },
  { id: 'machinepistol', name: 'MACHINE PISTOL', family: 'pistol', dmg: 18, rate: 0.08, mag: 24, reserve: 144, reload: 1.3, auto: true, scoped: false, hipFov: 80, adsFov: 64, color: 0xc8f5d0 },
];

export function gunById(id: string): GunDef {
  return GUNS.find((g) => g.id === id) ?? GUNS[0];
}

// Loadout pools by FIRE ROLE (disjoint, so the primary/secondary lists never
// repeat a gun): PRIMARY = sustained-fire weapons (assault rifles, machine guns,
// rapid energy); SECONDARY = slow, high-damage-per-shot weapons (snipers, rail
// guns, launchers); SIDEARM = pistols.
const PRIMARY_FAMILIES: Family[] = ['rifle', 'mg', 'laser'];
const SECONDARY_FAMILIES: Family[] = ['sniper', 'launcher'];
export const PRIMARIES = GUNS.filter((g) => PRIMARY_FAMILIES.includes(g.family));
export const SECONDARIES = GUNS.filter((g) => SECONDARY_FAMILIES.includes(g.family));
export const SIDEARMS = GUNS.filter((g) => g.family === 'pistol');

/** Throwables — one occupies the loadout's throwable slot.
 *  Each detonation can do up to four things: an instant blast (AoE damage), a
 *  status applied to enemies in radius (stun/slow/burn/blind), a lingering zone
 *  (fire/gas/cryo/smoke/decoy), and a pull/push impulse. */
export type ThrowKind =
  | 'frag'
  | 'smoke'
  | 'incendiary'
  | 'cryo'
  | 'shock'
  | 'flash'
  | 'cluster'
  | 'gas'
  | 'gravity'
  | 'concussion'
  | 'decoy'
  | 'plasma';
export type ZoneKind = 'fire' | 'gas' | 'cryo' | 'smoke' | 'decoy';
export interface ThrowDef {
  id: string;
  name: string;
  kind: ThrowKind;
  count: number;
  fuse: number; // seconds
  color: number;
  blast: { dmg: number; radius: number };
  status?: { radius: number; duration: number; stun?: number; slow?: number; burn?: number; blind?: number };
  zone?: { kind: ZoneKind; radius: number; duration: number; dps?: number; slow?: number; blocksLoS?: boolean; lure?: boolean };
  cluster?: number; // number of delayed secondary blasts
  pull?: number; // yank enemies toward the blast (gravity)
  push?: number; // shove enemies away from the blast (concussion)
}

export const THROWABLES: ThrowDef[] = [
  { id: 'frag', name: 'FRAG', kind: 'frag', count: 10, fuse: 1.4, color: 0xffae3a, blast: { dmg: 220, radius: 6.5 } },
  { id: 'smoke', name: 'SMOKE', kind: 'smoke', count: 10, fuse: 1.0, color: 0x9aa3b8, blast: { dmg: 0, radius: 0 }, zone: { kind: 'smoke', radius: 5.5, duration: 8, blocksLoS: true } },
  { id: 'incendiary', name: 'MOLOTOV', kind: 'incendiary', count: 10, fuse: 1.1, color: 0xff5a2a, blast: { dmg: 50, radius: 4 }, zone: { kind: 'fire', radius: 4.5, duration: 6, dps: 55 } },
  { id: 'cryo', name: 'CRYO BOMB', kind: 'cryo', count: 10, fuse: 1.3, color: 0x7fdfff, blast: { dmg: 40, radius: 4.5 }, status: { radius: 5.5, duration: 4.5, slow: 0.6 }, zone: { kind: 'cryo', radius: 5, duration: 4.5, slow: 0.5 } },
  { id: 'shock', name: 'EMP SHOCK', kind: 'shock', count: 10, fuse: 1.2, color: 0x9af0ff, blast: { dmg: 70, radius: 5 }, status: { radius: 5.5, duration: 2.4, stun: 2.4 } },
  { id: 'flash', name: 'FLASHBANG', kind: 'flash', count: 10, fuse: 1.4, color: 0xffffff, blast: { dmg: 0, radius: 0 }, status: { radius: 10, duration: 4.5, blind: 4.5 } },
  { id: 'cluster', name: 'CLUSTER', kind: 'cluster', count: 10, fuse: 1.3, color: 0xffd27a, blast: { dmg: 90, radius: 4 }, cluster: 5 },
  { id: 'gas', name: 'TOXIN', kind: 'gas', count: 10, fuse: 1.2, color: 0x9cff6a, blast: { dmg: 0, radius: 0 }, zone: { kind: 'gas', radius: 5.5, duration: 7, dps: 34, blocksLoS: true } },
  { id: 'gravity', name: 'SINGULARITY', kind: 'gravity', count: 10, fuse: 1.6, color: 0xc08bff, blast: { dmg: 220, radius: 7 }, pull: 5 },
  { id: 'concussion', name: 'CONCUSSION', kind: 'concussion', count: 10, fuse: 1.1, color: 0xffe9a8, blast: { dmg: 75, radius: 6 }, status: { radius: 6, duration: 1.3, stun: 1.3 }, push: 5 },
  { id: 'decoy', name: 'DECOY', kind: 'decoy', count: 10, fuse: 0.5, color: 0xaef5c8, blast: { dmg: 0, radius: 0 }, zone: { kind: 'decoy', radius: 1.2, duration: 6, lure: true } },
  { id: 'plasma', name: 'PLASMA ORB', kind: 'plasma', count: 10, fuse: 1.0, color: 0xff5d6e, blast: { dmg: 340, radius: 5 } },
];
export function throwById(id: string): ThrowDef {
  return THROWABLES.find((t) => t.id === id) ?? THROWABLES[0];
}

/** Default loadout (used if you skip the loadout screen). */
export const DEFAULT_LOADOUT = ['ar', 'rail', 'sidearm'];
export const DEFAULT_THROWABLE = 'frag';

/** RECRUIT-ISSUE gear — the starting loadout every Marine is issued, free from level 1.
 *  Everything NOT in these sets starts LOCKED and is unlocked permanently with
 *  AstroDiamonds. Includes the four new recruit weapons (added in later phases). */
export const RECRUIT_WEAPONS = new Set(['ar', 'burstcarbine', 'smg', 'pulse', 'rocket', 'grenadecannon', 'plasmamortar', 'rail', 'sidearm', 'burstpistol']);
export const RECRUIT_THROWABLES = new Set(['frag', 'smoke', 'flash', 'shock', 'cryo', 'decoy']);
