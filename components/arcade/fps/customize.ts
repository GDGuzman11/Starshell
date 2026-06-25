/**
 * Per-gun customization. Each weapon can be upgraded across four tracks, paid
 * for with the gold earned per stage. Every gun also starts with a free "basic"
 * enhancement. Upgrades are applied on top of the base GunDef at deploy time.
 */
import type { GunDef } from './weapons';

export type UpgradeKey = 'dmg' | 'rate' | 'mag' | 'reload';
export type Upg = Record<UpgradeKey, number>; // level 0..MAX_LEVEL per track

export const MAX_LEVEL = 4;

export const UPGRADE_INFO: { key: UpgradeKey; label: string }[] = [
  { key: 'dmg', label: 'DAMAGE' },
  { key: 'rate', label: 'FIRE RATE' },
  { key: 'mag', label: 'MAGAZINE' },
  { key: 'reload', label: 'RELOAD' },
];

export function freshUpg(): Upg {
  return { dmg: 0, rate: 0, mag: 0, reload: 0 };
}

/** The free starting enhancement every gun ships with (+1 damage tier). */
export function basicUpg(): Upg {
  return { dmg: 1, rate: 0, mag: 0, reload: 0 };
}

/** Gold cost to buy the NEXT level up from `level`. */
export function costFor(level: number): number {
  return 60 + level * 60; // 60 / 120 / 180 / 240
}

/** Apply a gun's upgrade levels, returning a tuned copy (id/name/family kept). */
export function applyUpgrades(gun: GunDef, up: Upg | undefined): GunDef {
  if (!up) return gun;
  return {
    ...gun,
    dmg: Math.round(gun.dmg * (1 + 0.12 * up.dmg)),
    rate: +(gun.rate * (1 - 0.07 * up.rate)).toFixed(3),
    mag: Math.round(gun.mag * (1 + 0.18 * up.mag)),
    reload: +(gun.reload * (1 - 0.1 * up.reload)).toFixed(2),
  };
}
