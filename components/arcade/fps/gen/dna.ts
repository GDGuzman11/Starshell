/**
 * Design DNA — the 20 engineering-philosophy categories from Gabe's "Design DNA
 * System" doc. Every generated weapon/armor fuses a PRIMARY (~70%) + SECONDARY
 * (~30%) DNA into one dominant identity.
 *
 * Each profile carries concrete, buildable hints: a one-line philosophy + palette +
 * accent + preferred silhouettes + geometry/stat/audio leanings + a naming vocabulary.
 * These feed TWO consumers:
 *   1. the AI route's prompt (so the model reasons from the same facts), and
 *   2. the deterministic fallback generator (when the AI route is unavailable, e.g.
 *      the standalone repo has no backend) — a rule-based fusion that still produces
 *      a coherent, DNA-flavoured blueprint with zero network calls.
 * Pure data + a leaf import of the model palette — safe on the client sync path.
 */
import { ACCENT, COL } from '../models/parts';
import type { AudioFamily, TemplateId } from './blueprint';

export const DESIGN_DNA = [
  'Military Standard',
  'Heavy Industrial',
  'Precision Tactical',
  'Frontier Salvaged',
  'Prototype',
  'Experimental',
  'Alien Reverse Engineered',
  'Siege Platform',
  'High Mobility',
  'Urban Combat',
  'Arctic Operations',
  'Volcanic Warfare',
  'Jungle Expedition',
  'Deep Space Boarding',
  'Shock Trooper',
  'Covert Operations',
  'Orbital Warfare',
  'Hazard Response',
  'Engineer Corps',
  'Recon Division',
] as const;
export type DesignDNA = (typeof DESIGN_DNA)[number];

export interface DnaProfile {
  philosophy: string; // one line — the manufacturer's engineering ethos (prompt + lore seed)
  body: number[]; // candidate body metals
  accent: number; // signature accent/glow
  silhouettes: TemplateId[]; // preferred silhouette archetypes
  audio: AudioFamily[]; // preferred audio families
  geometry: { girth: number; vents: number; emissive: number; animated: number; muzzle: number }; // 0..1-ish leanings
  stat: { dmg: number; rate: number; mag: number; reload: number; handling: number }; // relative stat bias (−1..1)
  words: string[]; // naming/lore vocabulary
}

const g = COL.gunmetal;
const ti = COL.titanium;
const mb = COL.matteBlack;
const st = COL.steel;

export const DNA: Record<DesignDNA, DnaProfile> = {
  'Military Standard': {
    philosophy: 'Rugged, standardised, field-proven — nothing fancy, everything reliable.',
    body: [g, mb, ti], accent: ACCENT.blue,
    silhouettes: ['compactRifle', 'bullpupMg'], audio: ['ballistic', 'barrel'],
    geometry: { girth: 0.5, vents: 0.4, emissive: 0.2, animated: 0.1, muzzle: 1 },
    stat: { dmg: 0.1, rate: 0.1, mag: 0.1, reload: 0.2, handling: 0.2 },
    words: ['Standard', 'Service', 'Regiment', 'Doctrine', 'Vanguard', 'Sentinel'],
  },
  'Heavy Industrial': {
    philosophy: 'Massive hydraulic engineering, reinforced armour, brute mechanical mass.',
    body: [COL.burntSteel, g, st], accent: ACCENT.orange,
    silhouettes: ['rotaryHeavy', 'bullpupMg'], audio: ['heavy', 'barrel'],
    geometry: { girth: 1, vents: 0.7, emissive: 0.3, animated: 0.6, muzzle: 3 },
    stat: { dmg: 0.6, rate: -0.2, mag: 0.5, reload: -0.4, handling: -0.5 },
    words: ['Foundry', 'Hydra', 'Piston', 'Anvil', 'Forge', 'Ironworks', 'Bulwark'],
  },
  'Precision Tactical': {
    philosophy: 'Refined optics, stabilised barrels, recoil compensation — surgical accuracy.',
    body: [ti, mb, g], accent: ACCENT.blue,
    silhouettes: ['longPrecision', 'compactRifle'], audio: ['ballistic', 'energy'],
    geometry: { girth: 0.4, vents: 0.3, emissive: 0.35, animated: 0.15, muzzle: 1 },
    stat: { dmg: 0.4, rate: -0.1, mag: -0.2, reload: 0.1, handling: 0.4 },
    words: ['Marksman', 'Precision', 'Vector', 'Meridian', 'Reticle', 'Longshot'],
  },
  'Frontier Salvaged': {
    philosophy: 'Field repairs, visible welding, mixed materials, recovered military parts.',
    body: [COL.bronze, COL.burntSteel, mb], accent: ACCENT.amber,
    silhouettes: ['compactRifle', 'launcherTube'], audio: ['ballistic', 'heavy'],
    geometry: { girth: 0.7, vents: 0.6, emissive: 0.2, animated: 0.2, muzzle: 2 },
    stat: { dmg: 0.3, rate: -0.1, mag: 0.2, reload: -0.2, handling: -0.1 },
    words: ['Scavenger', 'Salvage', 'Rust', 'Drifter', 'Outrider', 'Patchwork'],
  },
  Prototype: {
    philosophy: 'Advanced experimental engineering with visible testing hardware.',
    body: [ti, g, mb], accent: 0x7fdfff,
    silhouettes: ['energyEmitter', 'compactRifle'], audio: ['energy', 'electric'],
    geometry: { girth: 0.5, vents: 0.4, emissive: 0.7, animated: 0.6, muzzle: 3 },
    stat: { dmg: 0.4, rate: 0.2, mag: 0.1, reload: 0.1, handling: 0.2 },
    words: ['Prototype', 'Revenant', 'Vertex', 'Catalyst', 'Nexus', 'Paragon'],
  },
  Experimental: {
    philosophy: 'High-risk unstable tech — exposed coils, unpredictable power, raw output.',
    body: [mb, ti, g], accent: ACCENT.purple,
    silhouettes: ['energyEmitter', 'rotaryHeavy'], audio: ['electric', 'gravity', 'energy'],
    geometry: { girth: 0.6, vents: 0.5, emissive: 0.9, animated: 0.8, muzzle: 3 },
    stat: { dmg: 0.7, rate: 0.1, mag: -0.2, reload: -0.2, handling: -0.1 },
    words: ['Anomaly', 'Flux', 'Rupture', 'Cascade', 'Singularity', 'Overload'],
  },
  'Alien Reverse Engineered': {
    philosophy: 'Alien engineering rebuilt by human hands — exposed reactor, uneasy fusion.',
    body: [0x2a3340, mb, 0x3a4a5a], accent: 0x63ff84,
    silhouettes: ['energyEmitter', 'longPrecision'], audio: ['energy', 'gravity', 'beam'],
    geometry: { girth: 0.6, vents: 0.3, emissive: 0.95, animated: 0.7, muzzle: 3 },
    stat: { dmg: 0.6, rate: 0.2, mag: 0.1, reload: 0, handling: 0.1 },
    words: ['Xeno', 'Aether', 'Wraith', 'Chorus', 'Halo', 'Umbra', 'Voidborn'],
  },
  'Siege Platform': {
    philosophy: 'Emplaced firepower — enormous barrels, deep magazines, immovable mass.',
    body: [g, COL.burntSteel, st], accent: ACCENT.red,
    silhouettes: ['rotaryHeavy', 'launcherTube'], audio: ['heavy', 'launcher'],
    geometry: { girth: 1, vents: 0.6, emissive: 0.3, animated: 0.5, muzzle: 3 },
    stat: { dmg: 0.8, rate: -0.4, mag: 0.7, reload: -0.5, handling: -0.7 },
    words: ['Siege', 'Bastion', 'Rampart', 'Citadel', 'Warlord', 'Obliterator'],
  },
  'High Mobility': {
    philosophy: 'Lightweight, fast-handling, quick to reload — built to keep moving.',
    body: [ti, mb, g], accent: 0x9ad8ff,
    silhouettes: ['compactRifle', 'pistol'], audio: ['ballistic', 'energy'],
    geometry: { girth: 0.3, vents: 0.3, emissive: 0.3, animated: 0.2, muzzle: 1 },
    stat: { dmg: -0.2, rate: 0.4, mag: -0.1, reload: 0.6, handling: 0.7 },
    words: ['Swift', 'Dart', 'Zephyr', 'Skirmish', 'Runner', 'Flicker'],
  },
  'Urban Combat': {
    philosophy: 'Close-quarters, compact, high rate of fire for tight corridors.',
    body: [mb, g, ti], accent: ACCENT.amber,
    silhouettes: ['compactRifle', 'bullpupMg', 'pistol'], audio: ['ballistic'],
    geometry: { girth: 0.5, vents: 0.4, emissive: 0.25, animated: 0.2, muzzle: 2 },
    stat: { dmg: 0, rate: 0.5, mag: 0.2, reload: 0.2, handling: 0.4 },
    words: ['Precinct', 'Breach', 'Enforcer', 'Warden', 'Concrete', 'Grid'],
  },
  'Arctic Operations': {
    philosophy: 'Cold-hardened, sealed against ice, pale weathered coatings.',
    body: [0x8a97a6, st, 0xbfd0dc], accent: 0x9fe8ff,
    silhouettes: ['longPrecision', 'compactRifle'], audio: ['ballistic', 'energy'],
    geometry: { girth: 0.5, vents: 0.2, emissive: 0.4, animated: 0.2, muzzle: 1 },
    stat: { dmg: 0.2, rate: -0.1, mag: 0, reload: 0.1, handling: 0.2 },
    words: ['Glacier', 'Frost', 'Whiteout', 'Tundra', 'Boreal', 'Permafrost'],
  },
  'Volcanic Warfare': {
    philosophy: 'Heat-forged, thermal venting, molten glow bleeding through the seams.',
    body: [0x2a201c, COL.burntSteel, mb], accent: 0xff5a2a,
    silhouettes: ['rotaryHeavy', 'launcherTube'], audio: ['heavy', 'launcher'],
    geometry: { girth: 0.8, vents: 0.9, emissive: 0.8, animated: 0.5, muzzle: 3 },
    stat: { dmg: 0.6, rate: 0.1, mag: 0.2, reload: -0.2, handling: -0.3 },
    words: ['Magma', 'Ember', 'Kiln', 'Inferno', 'Cinder', 'Pyre', 'Vulcan'],
  },
  'Jungle Expedition': {
    philosophy: 'Corrosion-proofed, camouflaged, minimal snag profile for dense terrain.',
    body: [COL.olive, 0x3a4630, mb], accent: 0x7dff9a,
    silhouettes: ['compactRifle', 'longPrecision'], audio: ['ballistic', 'barrel'],
    geometry: { girth: 0.5, vents: 0.3, emissive: 0.2, animated: 0.2, muzzle: 1 },
    stat: { dmg: 0.2, rate: 0.1, mag: 0.1, reload: 0.1, handling: 0.3 },
    words: ['Canopy', 'Verdant', 'Thicket', 'Predator', 'Foliage', 'Ghillie'],
  },
  'Deep Space Boarding': {
    philosophy: 'Zero-G breaching gear — magnetic grips, sealed systems, hull-cutter output.',
    body: [0x2c3440, ti, mb], accent: 0x6ab0ff,
    silhouettes: ['bullpupMg', 'energyEmitter'], audio: ['energy', 'heavy'],
    geometry: { girth: 0.6, vents: 0.3, emissive: 0.6, animated: 0.4, muzzle: 2 },
    stat: { dmg: 0.3, rate: 0.2, mag: 0.2, reload: 0, handling: 0.1 },
    words: ['Airlock', 'Breacher', 'Vacuum', 'Hull', 'Orbital', 'Boarding'],
  },
  'Shock Trooper': {
    philosophy: 'Aggressive frontline suppression — powerful, punchy, built to push.',
    body: [g, mb, COL.burntSteel], accent: ACCENT.red,
    silhouettes: ['bullpupMg', 'compactRifle'], audio: ['heavy', 'ballistic'],
    geometry: { girth: 0.7, vents: 0.5, emissive: 0.3, animated: 0.3, muzzle: 2 },
    stat: { dmg: 0.5, rate: 0.3, mag: 0.3, reload: -0.1, handling: 0 },
    words: ['Shock', 'Assault', 'Onslaught', 'Berserker', 'Charger', 'Havoc'],
  },
  'Covert Operations': {
    philosophy: 'Suppressed, matte, low-signature — precise and quiet.',
    body: [mb, 0x22252b, g], accent: 0x5a6470,
    silhouettes: ['compactRifle', 'pistol', 'longPrecision'], audio: ['ballistic'],
    geometry: { girth: 0.4, vents: 0.2, emissive: 0.15, animated: 0.1, muzzle: 3 },
    stat: { dmg: 0.2, rate: 0, mag: -0.1, reload: 0.2, handling: 0.5 },
    words: ['Shadow', 'Cipher', 'Phantom', 'Silent', 'Nocturne', 'Specter'],
  },
  'Orbital Warfare': {
    philosophy: 'Satellite-grade energy weaponry — clean lines, cold light, long reach.',
    body: [ti, 0xbfe0ff, mb], accent: 0xbfe0ff,
    silhouettes: ['energyEmitter', 'longPrecision'], audio: ['energy', 'beam'],
    geometry: { girth: 0.5, vents: 0.3, emissive: 0.85, animated: 0.5, muzzle: 3 },
    stat: { dmg: 0.5, rate: 0.1, mag: 0, reload: 0, handling: 0.2 },
    words: ['Orbit', 'Meridian', 'Helios', 'Apogee', 'Zenith', 'Skyfall'],
  },
  'Hazard Response': {
    philosophy: 'Chem/rad-sealed, high-visibility warning livery, containment-grade builds.',
    body: [0x2a2d33, mb, g], accent: 0xffc23a,
    silhouettes: ['launcherTube', 'bullpupMg'], audio: ['launcher', 'electric'],
    geometry: { girth: 0.7, vents: 0.7, emissive: 0.5, animated: 0.4, muzzle: 2 },
    stat: { dmg: 0.4, rate: 0, mag: 0.2, reload: -0.1, handling: -0.1 },
    words: ['Hazmat', 'Quarantine', 'Contagion', 'Toxin', 'Warning', 'Biohazard'],
  },
  'Engineer Corps': {
    philosophy: 'Modular, over-built, tool-like — exposed fasteners and utility rails.',
    body: [st, g, COL.bronze], accent: 0xffd27a,
    silhouettes: ['bullpupMg', 'compactRifle'], audio: ['barrel', 'heavy'],
    geometry: { girth: 0.6, vents: 0.5, emissive: 0.35, animated: 0.4, muzzle: 1 },
    stat: { dmg: 0.2, rate: 0.1, mag: 0.4, reload: 0.3, handling: 0 },
    words: ['Sapper', 'Servitor', 'Dynamo', 'Fabricator', 'Wrench', 'Rivet'],
  },
  'Recon Division': {
    philosophy: 'Sensor-forward, lightweight, marksman optics — see first, hit first.',
    body: [ti, mb, g], accent: 0x8fd0ff,
    silhouettes: ['longPrecision', 'compactRifle'], audio: ['ballistic', 'energy'],
    geometry: { girth: 0.4, vents: 0.3, emissive: 0.4, animated: 0.2, muzzle: 1 },
    stat: { dmg: 0.3, rate: 0, mag: -0.1, reload: 0.2, handling: 0.5 },
    words: ['Recon', 'Scout', 'Sentry', 'Overwatch', 'Pathfinder', 'Lookout'],
  },
};

/** A DNA is valid iff it's one of the 20 known categories. */
export function isDesignDNA(v: string): v is DesignDNA {
  return (DESIGN_DNA as readonly string[]).includes(v);
}
