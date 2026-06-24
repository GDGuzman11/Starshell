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
  // rifles
  { id: 'ar', name: 'PULSE AR', family: 'rifle', dmg: 26, rate: 0.11, mag: 30, reserve: 180, reload: 1.6, auto: true, scoped: false, hipFov: 78, adsFov: 58, color: 0xffe9a8 },
  { id: 'carbine', name: 'CARBINE', family: 'rifle', dmg: 46, rate: 0.22, mag: 20, reserve: 140, reload: 1.5, auto: false, scoped: false, hipFov: 78, adsFov: 55, color: 0xffd27a },
  { id: 'assaultx', name: 'ASSAULT-X', family: 'rifle', dmg: 30, rate: 0.1, mag: 35, reserve: 210, reload: 1.7, auto: true, scoped: false, hipFov: 78, adsFov: 56, color: 0xffe0b0 },
  // MGs
  { id: 'smg', name: 'NOVA SMG', family: 'mg', dmg: 16, rate: 0.07, mag: 40, reserve: 280, reload: 1.7, auto: true, scoped: false, hipFov: 80, adsFov: 64, color: 0xff8a96 },
  { id: 'lmg', name: 'SIEGE LMG', family: 'mg', dmg: 24, rate: 0.09, mag: 75, reserve: 300, reload: 2.6, auto: true, scoped: false, hipFov: 80, adsFov: 64, color: 0xff5d6e },
  { id: 'ripper', name: 'RIPPER', family: 'mg', dmg: 13, rate: 0.05, mag: 50, reserve: 320, reload: 2.0, auto: true, scoped: false, hipFov: 82, adsFov: 68, color: 0xff6f9a },
  // lasers
  { id: 'pulse', name: 'ION REPEATER', family: 'laser', dmg: 22, rate: 0.08, mag: 50, reserve: 250, reload: 1.8, auto: true, scoped: false, hipFov: 78, adsFov: 58, color: 0x7fdfff },
  { id: 'beam', name: 'LANCE BEAM', family: 'laser', dmg: 66, rate: 0.42, mag: 12, reserve: 90, reload: 2.0, auto: false, scoped: false, hipFov: 78, adsFov: 48, color: 0x9af0ff },
  { id: 'arc', name: 'ARC THROWER', family: 'laser', dmg: 30, rate: 0.13, mag: 28, reserve: 168, reload: 1.9, auto: true, scoped: false, hipFov: 78, adsFov: 56, color: 0x6ad0ff },
  // snipers
  { id: 'rail', name: 'RAILGUN', family: 'sniper', dmg: 165, rate: 0.95, mag: 5, reserve: 40, reload: 2.4, auto: false, scoped: true, hipFov: 78, adsFov: 22, color: 0xc8a8ff },
  { id: 'marksman', name: 'MARKSMAN', family: 'sniper', dmg: 95, rate: 0.5, mag: 10, reserve: 60, reload: 2.0, auto: false, scoped: true, hipFov: 78, adsFov: 38, color: 0xd8c0ff },
  { id: 'piercer', name: 'PIERCER', family: 'sniper', dmg: 120, rate: 0.7, mag: 7, reserve: 49, reload: 2.2, auto: false, scoped: true, hipFov: 78, adsFov: 28, color: 0xb890ff },
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

export const PRIMARIES = GUNS.filter((g) => g.family !== 'pistol');
export const SIDEARMS = GUNS.filter((g) => g.family === 'pistol');

/** Throwables — one occupies the loadout's throwable slot. */
export type ThrowKind = 'frag' | 'smoke';
export interface ThrowDef {
  id: string;
  name: string;
  kind: ThrowKind;
  count: number;
  dmg: number;
  radius: number;
  fuse: number; // seconds
  color: number;
}
export const THROWABLES: ThrowDef[] = [
  { id: 'frag', name: 'FRAG', kind: 'frag', count: 3, dmg: 220, radius: 6.5, fuse: 1.4, color: 0xffae3a },
  { id: 'smoke', name: 'SMOKE', kind: 'smoke', count: 3, dmg: 0, radius: 5.5, fuse: 1.0, color: 0x9aa3b8 },
];
export function throwById(id: string): ThrowDef {
  return THROWABLES.find((t) => t.id === id) ?? THROWABLES[0];
}

/** Default loadout (used if you skip the loadout screen). */
export const DEFAULT_LOADOUT = ['ar', 'rail', 'sidearm'];
export const DEFAULT_THROWABLE = 'frag';
