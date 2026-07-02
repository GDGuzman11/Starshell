/**
 * COMBAT DIVISIONS — the Marine's Level-5 graduation. The player permanently picks
 * ONE of five divisions, each a hybrid of two battlefield philosophies with an
 * UNMISTAKABLE silhouette (a distinct `buildHumanoid` base) and its OWN, non-shared
 * engineering set (~10 categories). None of these components are shared between
 * divisions. Registered into the slot registry at import so the generator resolves
 * them like recruit slots.
 *
 * Imported ONLY by the /arcade chunk.
 */
import type { HumanoidOpts } from '../enemies/models/humanoid';
import type { RenderTier } from '../materials';
import { registerArmorSlots, type ArmorFamily, type ArmorSlot, type ArmorStat, type BodyPart } from './slots';

export type DivisionId = 'vanguard' | 'ghost' | 'warden' | 'phantom' | 'lifeline';

export interface Division {
  id: DivisionId;
  name: string;
  primary: string;
  secondary: string;
  philosophy: string; // one-line silhouette language
  accent: number;
  /** Base humanoid options (minus tier) — the division's unmistakable silhouette. */
  base: Omit<HumanoidOpts, 'tier'>;
}

export const DIVISIONS: Division[] = [
  {
    id: 'vanguard', name: 'VANGUARD', primary: 'Assault', secondary: 'Heavy',
    philosophy: 'Aggressive, broad, forward-leaning — a breaching juggernaut.',
    accent: 0xff8a3a,
    base: { scale: 1.05, girth: 1.42, accent: 0xff8a3a, body: 0x5a5048, dark: 0x241d18, legs: 'thick', shoulders: 1.3, heavyArms: true, hunch: 0.12, backpack: 'ammo', antenna: 1 },
  },
  {
    id: 'ghost', name: 'GHOST', primary: 'Recon', secondary: 'Engineer',
    philosophy: 'Slim, angular, tall sensor arrays — mobility over mass.',
    accent: 0x7fdfff,
    base: { scale: 1.16, girth: 0.72, accent: 0x7fdfff, body: 0x2a3540, dark: 0x141a20, legs: 'digi', shoulders: 0.2, backpack: 'tech', antenna: 2, drones: 1 },
  },
  {
    id: 'warden', name: 'WARDEN', primary: 'Heavy', secondary: 'Engineer',
    philosophy: 'Extremely broad, massive shoulders — a walking bunker.',
    accent: 0xaef5c8,
    base: { scale: 1.12, girth: 1.72, accent: 0xaef5c8, body: 0x4a4e44, dark: 0x1e211c, legs: 'piston', shoulders: 1.7, heavyArms: true, spine: true, backpack: 'reactor' },
  },
  {
    id: 'phantom', name: 'PHANTOM', primary: 'Marksman', secondary: 'Recon',
    philosophy: 'Long proportions, slim shoulders — precision incarnate.',
    accent: 0xc08bff,
    base: { scale: 1.28, girth: 0.68, accent: 0xc08bff, body: 0x3a3346, dark: 0x191424, legs: 'normal', shoulders: 0.2, fins: true, antenna: 1 },
  },
  {
    id: 'lifeline', name: 'LIFELINE', primary: 'Medic', secondary: 'Engineer',
    philosophy: 'Compact support frame — drones, injectors, rescue gear.',
    accent: 0xff5d6e,
    base: { scale: 0.98, girth: 0.98, accent: 0xff5d6e, body: 0x4a4048, dark: 0x201a1e, legs: 'normal', shoulders: 0.4, backpack: 'tech', drones: 2, antenna: 1 },
  },
];

export function divisionById(id: string | null | undefined): Division | undefined {
  return id ? DIVISIONS.find((d) => d.id === id) : undefined;
}

/** A division base humanoid config (falls back to a plain recruit-ish body). */
export function divisionBase(id: string | null | undefined, tier: RenderTier): HumanoidOpts {
  const d = divisionById(id);
  if (!d) return { tier, scale: 1.0, girth: 1.15, accent: 0x7fdfff, body: 0x3a4250, dark: 0x1c1f24, legs: 'normal', shoulders: 0.7, weapon: 'none', antenna: 1 };
  return { ...d.base, tier, weapon: 'none' };
}

// ── division engineering slots ──────────────────────────────────────────────────
// Default anchor per family (reuses the recruit fit; overridden where two same-family
// items would collide). Coords are local to the named body-part group.
const FAM: Record<ArmorFamily, { parts: BodyPart[]; anchor: [number, number, number] }> = {
  helmet: { parts: ['head'], anchor: [0, 0.1, 0] },
  visor: { parts: ['head'], anchor: [0, 0.08, 0.15] },
  chest: { parts: ['torso'], anchor: [0, 0.3, 0.16] },
  plate: { parts: ['torso'], anchor: [0, 0.3, 0.16] },
  pauldron: { parts: ['torso'], anchor: [0, 0.48, 0] },
  limb: { parts: ['armL', 'armR'], anchor: [0, -0.4, 0] },
  cap: { parts: ['legL', 'legR'], anchor: [0, -0.48, 0.05] },
  glove: { parts: ['armL', 'armR'], anchor: [0, -0.54, 0.02] },
  boot: { parts: ['legL', 'legR'], anchor: [0, -0.88, 0.06] },
  backpack: { parts: ['torso'], anchor: [0, 0.34, -0.24] },
  core: { parts: ['torso'], anchor: [0, 0.16, 0.16] },
  comms: { parts: ['head'], anchor: [0.1, 0.22, -0.05] },
  insignia: { parts: ['torso'], anchor: [0, 0.34, 0.155] },
  coating: { parts: ['torso'], anchor: [0, 0, 0] },
};

type CatDef = {
  key: string; label: string; family: ArmorFamily; primary: ArmorStat; noun: string;
  group?: ArmorSlot['group']; anchor?: [number, number, number]; parts?: BodyPart[];
};

/** Themed name-role pools — every division's pieces read in its own voice. */
const ROLES: Record<DivisionId, string[]> = {
  vanguard: ['Assault', 'Breacher', 'Heavy', 'Storm', 'Vanguard', 'Iron', 'Siege', 'Brawler', 'Juggernaut', 'Bastion', 'Warhound', 'Crusher', 'Onslaught', 'Rampart'],
  ghost: ['Recon', 'Phantom', 'Shadow', 'Scout', 'Stalker', 'Whisper', 'Spectre', 'Cipher', 'Wraith', 'Ghost', 'Veil', 'Silent', 'Nomad', 'Drift'],
  warden: ['Fortress', 'Bulwark', 'Aegis', 'Bastion', 'Rampart', 'Titan', 'Guardian', 'Sentinel', 'Colossus', 'Anvil', 'Warden', 'Redoubt', 'Bunker', 'Keep'],
  phantom: ['Precision', 'Marksman', 'Hawk', 'Falcon', 'Longshot', 'Deadeye', 'Sniper', 'Vantage', 'Reaper', 'Viper', 'Crosshair', 'Apex', 'Talon', 'Sable'],
  lifeline: ['Medic', 'Nano', 'Rescue', 'Guardian', 'Mercy', 'Vital', 'Restore', 'Seraph', 'Lifeline', 'Aegis', 'Field', 'Triage', 'Warden', 'Grace'],
};

const CATS: Record<DivisionId, CatDef[]> = {
  vanguard: [
    { key: 'helmet', label: 'Helmet', family: 'helmet', primary: 'armor', noun: 'Helm' },
    { key: 'chest', label: 'Chest Plate', family: 'chest', primary: 'armor', noun: 'Cuirass' },
    { key: 'shoulders', label: 'Shoulders', family: 'pauldron', primary: 'armor', noun: 'Pauldrons' },
    { key: 'gloves', label: 'Gloves', family: 'glove', primary: 'mobility', noun: 'Gauntlets' },
    { key: 'boots', label: 'Boots', family: 'boot', primary: 'armor', noun: 'Sabatons' },
    { key: 'harness', label: 'Combat Harness', family: 'plate', primary: 'recovery', noun: 'Harness', group: 'systems', anchor: [0, 0.02, 0.02] },
    { key: 'ammo', label: 'Ammo Pack', family: 'backpack', primary: 'shield', noun: 'Ammo Pack', group: 'systems', anchor: [0, 0.04, -0.24] },
    { key: 'backpack', label: 'Heavy Backpack', family: 'backpack', primary: 'shield', noun: 'Pack', group: 'systems' },
    { key: 'breach', label: 'Breaching Module', family: 'core', primary: 'armor', noun: 'Ram', group: 'systems', anchor: [0, 0.42, 0.16] },
    { key: 'core', label: 'Power Core', family: 'core', primary: 'shield', noun: 'Core', group: 'systems' },
  ],
  ghost: [
    { key: 'helmet', label: 'Recon Helmet', family: 'helmet', primary: 'mobility', noun: 'Helm' },
    { key: 'visor', label: 'Tactical Visor', family: 'visor', primary: 'recovery', noun: 'Visor' },
    { key: 'scanner', label: 'Scanner Array', family: 'comms', primary: 'recovery', noun: 'Array', group: 'systems', anchor: [-0.1, 0.22, -0.05] },
    { key: 'chest', label: 'Lightweight Chest Plate', family: 'chest', primary: 'mobility', noun: 'Plate' },
    { key: 'sensorpack', label: 'Sensor Backpack', family: 'backpack', primary: 'recovery', noun: 'Pack', group: 'systems' },
    { key: 'drone', label: 'Drone Module', family: 'core', primary: 'shield', noun: 'Drone', group: 'systems', anchor: [0, 0.05, -0.24] },
    { key: 'boots', label: 'Mobility Boots', family: 'boot', primary: 'mobility', noun: 'Boots' },
    { key: 'harness', label: 'Utility Harness', family: 'plate', primary: 'recovery', noun: 'Harness', group: 'systems', anchor: [0, 0.02, 0.02] },
    { key: 'comm', label: 'Communication Array', family: 'comms', primary: 'recovery', noun: 'Uplink', group: 'systems' },
    { key: 'core', label: 'Recon Power Core', family: 'core', primary: 'shield', noun: 'Core', group: 'systems' },
  ],
  warden: [
    { key: 'helmet', label: 'Fortress Helmet', family: 'helmet', primary: 'armor', noun: 'Helm' },
    { key: 'chest', label: 'Heavy Chest Plate', family: 'chest', primary: 'armor', noun: 'Cuirass' },
    { key: 'emitter', label: 'Shield Emitter', family: 'core', primary: 'shield', noun: 'Emitter', group: 'systems', anchor: [0, 0.42, 0.16] },
    { key: 'shoulders', label: 'Reinforced Shoulders', family: 'pauldron', primary: 'armor', noun: 'Pauldrons' },
    { key: 'backpack', label: 'Defensive Backpack', family: 'backpack', primary: 'armor', noun: 'Pack', group: 'systems' },
    { key: 'boots', label: 'Heavy Boots', family: 'boot', primary: 'armor', noun: 'Sabatons' },
    { key: 'barrier', label: 'Barrier Module', family: 'plate', primary: 'shield', noun: 'Barrier', group: 'systems', anchor: [0, 0.14, 0.18] },
    { key: 'reactor', label: 'Reactor Pack', family: 'backpack', primary: 'shield', noun: 'Reactor', group: 'systems', anchor: [0, 0.04, -0.24] },
    { key: 'braces', label: 'Armor Braces', family: 'limb', primary: 'armor', noun: 'Braces' },
    { key: 'core', label: 'Fortress Power Core', family: 'core', primary: 'shield', noun: 'Core', group: 'systems' },
  ],
  phantom: [
    { key: 'helmet', label: 'Precision Helmet', family: 'helmet', primary: 'mobility', noun: 'Helm' },
    { key: 'visor', label: 'Long Range Visor', family: 'visor', primary: 'recovery', noun: 'Visor' },
    { key: 'chest', label: 'Sniper Chest Plate', family: 'chest', primary: 'mobility', noun: 'Plate' },
    { key: 'shoulders', label: 'Stability Shoulders', family: 'pauldron', primary: 'recovery', noun: 'Pauldrons' },
    { key: 'gloves', label: 'Precision Gloves', family: 'glove', primary: 'mobility', noun: 'Gauntlets' },
    { key: 'boots', label: 'Marksman Boots', family: 'boot', primary: 'mobility', noun: 'Boots' },
    { key: 'targeting', label: 'Targeting Module', family: 'comms', primary: 'recovery', noun: 'Targeter', group: 'systems', anchor: [-0.1, 0.22, -0.05] },
    { key: 'rangefind', label: 'Rangefinding Backpack', family: 'backpack', primary: 'recovery', noun: 'Pack', group: 'systems' },
    { key: 'camo', label: 'Camouflage System', family: 'plate', primary: 'mobility', noun: 'Cloak', group: 'systems', anchor: [0, 0.02, 0.02] },
    { key: 'core', label: 'Precision Power Core', family: 'core', primary: 'shield', noun: 'Core', group: 'systems' },
  ],
  lifeline: [
    { key: 'helmet', label: 'Medic Helmet', family: 'helmet', primary: 'recovery', noun: 'Helm' },
    { key: 'chest', label: 'Medical Chest Plate', family: 'chest', primary: 'recovery', noun: 'Plate' },
    { key: 'nanopack', label: 'Nano Backpack', family: 'backpack', primary: 'recovery', noun: 'Pack', group: 'systems' },
    { key: 'gloves', label: 'Repair Gloves', family: 'glove', primary: 'recovery', noun: 'Gauntlets' },
    { key: 'boots', label: 'Support Boots', family: 'boot', primary: 'mobility', noun: 'Boots' },
    { key: 'harness', label: 'Medical Harness', family: 'plate', primary: 'recovery', noun: 'Harness', group: 'systems', anchor: [0, 0.02, 0.02] },
    { key: 'drone', label: 'Drone Station', family: 'core', primary: 'shield', noun: 'Station', group: 'systems', anchor: [0, 0.05, -0.24] },
    { key: 'injector', label: 'Nano Injector', family: 'core', primary: 'recovery', noun: 'Injector', group: 'systems', anchor: [0, 0.42, 0.16] },
    { key: 'emergency', label: 'Emergency System', family: 'comms', primary: 'recovery', noun: 'Beacon', group: 'systems' },
    { key: 'core', label: 'Support Power Core', family: 'core', primary: 'shield', noun: 'Core', group: 'systems' },
  ],
};

function buildDivisionSlots(div: DivisionId): ArmorSlot[] {
  return CATS[div].map((c) => {
    const fam = FAM[c.family];
    return {
      id: `${div}_${c.key}`,
      label: c.label,
      parts: c.parts ?? fam.parts,
      anchor: c.anchor ?? fam.anchor,
      family: c.family,
      primary: c.primary,
      group: c.group ?? 'plating',
      division: div,
      roles: ROLES[div],
      noun: c.noun,
    };
  });
}

const DIVISION_SLOTS: Record<DivisionId, ArmorSlot[]> = {
  vanguard: buildDivisionSlots('vanguard'),
  ghost: buildDivisionSlots('ghost'),
  warden: buildDivisionSlots('warden'),
  phantom: buildDivisionSlots('phantom'),
  lifeline: buildDivisionSlots('lifeline'),
};

// Register every division's slots so the generator/renderer can resolve them by id.
for (const d of DIVISIONS) registerArmorSlots(DIVISION_SLOTS[d.id]);

/** The engineering slots for a division (empty for an unknown/undefined id). */
export function divisionSlots(id: string | null | undefined): ArmorSlot[] {
  return id && id in DIVISION_SLOTS ? DIVISION_SLOTS[id as DivisionId] : [];
}
