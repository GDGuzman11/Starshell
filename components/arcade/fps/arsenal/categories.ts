/**
 * Engineering CATEGORIES — every weapon family exposes FIVE engineering categories,
 * chosen to make mechanical sense for that family (per the Weapons Overhaul spec).
 * Each category binds to a model SLOT (where the part physically mounts on the
 * procedural weapon) and a PRIMARY STAT it mainly moves, so a category reads as a
 * distinct engineering discipline (a barrel is not a stock).
 *
 * Imported ONLY by the /arcade chunk.
 */
import type { Family } from '../weapons';

/** Where on the weapon a part mounts (drives the attach transform in the renderer). */
export type SlotKind = 'barrel' | 'receiver' | 'magazine' | 'optic' | 'rear' | 'feed' | 'cooling' | 'stability' | 'emitter' | 'core' | 'targeting' | 'reactor' | 'scope' | 'bolt' | 'stock' | 'tube' | 'warhead' | 'stabilizer' | 'slide' | 'frame' | 'sight' | 'grip';

export type PrimaryStat = 'dmg' | 'rate' | 'mag' | 'reload' | 'handling';

export interface Category {
  id: string; // stable id, unique within a family (e.g. 'barrel')
  label: string; // display name
  slot: SlotKind;
  primary: PrimaryStat;
}

const AR: Category[] = [
  { id: 'barrel', label: 'Barrel', slot: 'barrel', primary: 'dmg' },
  { id: 'receiver', label: 'Receiver', slot: 'receiver', primary: 'rate' },
  { id: 'magazine', label: 'Magazine', slot: 'magazine', primary: 'mag' },
  { id: 'optics', label: 'Optics', slot: 'optic', primary: 'handling' },
  { id: 'rear', label: 'Rear Assembly', slot: 'rear', primary: 'reload' },
];

const LMG: Category[] = [
  { id: 'barrel', label: 'Heavy Barrel', slot: 'barrel', primary: 'dmg' },
  { id: 'receiver', label: 'Receiver', slot: 'receiver', primary: 'rate' },
  { id: 'feed', label: 'Ammo Feed', slot: 'feed', primary: 'mag' },
  { id: 'cooling', label: 'Cooling System', slot: 'cooling', primary: 'rate' },
  { id: 'stability', label: 'Stability Assembly', slot: 'stability', primary: 'handling' },
];

const ENERGY: Category[] = [
  { id: 'emitter', label: 'Emitter', slot: 'emitter', primary: 'dmg' },
  { id: 'core', label: 'Power Core', slot: 'core', primary: 'rate' },
  { id: 'cooling', label: 'Cooling Chamber', slot: 'cooling', primary: 'mag' },
  { id: 'targeting', label: 'Targeting Module', slot: 'targeting', primary: 'handling' },
  { id: 'reactor', label: 'Rear Reactor', slot: 'reactor', primary: 'reload' },
];

const SNIPER: Category[] = [
  { id: 'barrel', label: 'Precision Barrel', slot: 'barrel', primary: 'dmg' },
  { id: 'receiver', label: 'Receiver', slot: 'receiver', primary: 'reload' },
  { id: 'scope', label: 'Scope', slot: 'scope', primary: 'handling' },
  { id: 'bolt', label: 'Bolt Assembly', slot: 'bolt', primary: 'rate' },
  { id: 'stock', label: 'Precision Stock', slot: 'stock', primary: 'handling' },
];

const LAUNCHER: Category[] = [
  { id: 'tube', label: 'Launch Tube', slot: 'tube', primary: 'dmg' },
  { id: 'warhead', label: 'Warhead Chamber', slot: 'warhead', primary: 'dmg' },
  { id: 'core', label: 'Power Core', slot: 'core', primary: 'rate' },
  { id: 'targeting', label: 'Targeting Module', slot: 'targeting', primary: 'handling' },
  { id: 'stabilizer', label: 'Stabilizer', slot: 'stabilizer', primary: 'reload' },
];

const SIDEARM: Category[] = [
  { id: 'slide', label: 'Slide', slot: 'slide', primary: 'dmg' },
  { id: 'frame', label: 'Frame', slot: 'frame', primary: 'handling' },
  { id: 'magazine', label: 'Magazine', slot: 'magazine', primary: 'mag' },
  { id: 'sight', label: 'Sight', slot: 'sight', primary: 'handling' },
  { id: 'grip', label: 'Grip', slot: 'grip', primary: 'reload' },
];

const BY_FAMILY: Record<Family, Category[]> = {
  rifle: AR,
  mg: LMG,
  laser: ENERGY,
  sniper: SNIPER,
  launcher: LAUNCHER,
  pistol: SIDEARM,
};

export function categoriesForFamily(family: Family): Category[] {
  return BY_FAMILY[family];
}
