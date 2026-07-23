/**
 * CAPITAL SHIP DNA — the "Star Destroyer" generator genome. A seeded roll produces a
 * CapitalDNA spec (PRIMARY 70% / SECONDARY 30% doctrine, per the Capital Ship prompt)
 * that drives the procedural ship in model.ts: silhouette, command-tower placement,
 * engine/turret/bay counts, colours, and a generated name + classification.
 *
 * Deterministic given the seed → a design can be baked + assigned to a level (like the
 * campaign map seeds). Zero-asset: this only picks numbers; the geometry is procedural.
 */
import { rng } from '../rand';

export type CapitalDNAType =
  | 'heavyIndustrial'
  | 'orbitalSiege'
  | 'livingFortress'
  | 'machineCathedral'
  | 'carrier'
  | 'deepSpaceHunter'
  | 'executionVessel'
  | 'voidFortress'
  | 'mobileFactory'
  | 'gravaticManipulator';

// The ~11 SILHOUETTE FAMILIES (the visual bible → geometry). Each has a dedicated
// builder in model.ts; `dagger` supersedes the old `blade` (kept as an alias in the
// clamp path). Together they span the 100 reference designs.
export type HullShape =
  | 'dagger' // long thin sharp wedge (Dread Harbinger, Oblivion Lance, The Guillotine)
  | 'dreadnought' // massive layered city-slab (Iron Oblivion, The Devourer, World Breaker)
  | 'cathedral' // tall gothic spires (Void Cathedral, Ash Prophet)
  | 'ring' // torus/eclipse with a suspended core (Nothingbringer, Singularity Behemoth)
  | 'biomech' // asymmetric organic mass (The Unspeakable, Parasite, The Hive Mother)
  | 'trident' // forward prongs/claws (Oblivion Spear, Abyssal Lancer)
  | 'carrier' // wide flat launch deck (Grave of Stars, The Dark Horizon)
  | 'sphere' // battlestation/moon core (The Void Whale, Maelstrom Heart)
  | 'obelisk' // tall vertical monolith (The Silent Tower, The Silent King)
  | 'catamaran' // twin parallel hulls + spine
  | 'spine' // central spine + wings
  | 'slab'; // boxy fallback
export type BridgePos = 'fore' | 'aft' | 'dorsal' | 'spinal';

export interface CapitalDNA {
  seed: number;
  primary: CapitalDNAType;
  secondary: CapitalDNAType;
  name: string;
  classification: string;
  hull: HullShape;
  bridge: BridgePos;
  length: number; // world units (map is ~200 → ~quarter of the sky)
  engines: number;
  turrets: number;
  bays: number;
  accent: number; // faction glow colour
  body: number; // hull colour
}

export const DNA_TYPES: CapitalDNAType[] = ['heavyIndustrial', 'orbitalSiege', 'livingFortress', 'machineCathedral', 'carrier', 'deepSpaceHunter', 'executionVessel', 'voidFortress', 'mobileFactory', 'gravaticManipulator'];
export const HULLS: HullShape[] = ['dagger', 'dreadnought', 'cathedral', 'ring', 'biomech', 'trident', 'carrier', 'sphere', 'obelisk', 'catamaran', 'spine', 'slab'];
export const BRIDGES: BridgePos[] = ['fore', 'aft', 'dorsal', 'spinal'];
// Near-black charcoal hulls (the references are almost pure black, read by silhouette).
const BODIES = [0x0d0f13, 0x14161b, 0x1a1c22, 0x171a20, 0x0f1216, 0x101319];

/** Signature silhouette families per DNA (primary picks the first ~70% of the time). */
export const FAMILY_BY_DNA: Record<CapitalDNAType, HullShape[]> = {
  heavyIndustrial: ['dreadnought', 'slab', 'catamaran'],
  orbitalSiege: ['dagger', 'trident', 'obelisk'],
  livingFortress: ['biomech', 'sphere', 'dreadnought'],
  machineCathedral: ['cathedral', 'obelisk', 'spine'],
  carrier: ['carrier', 'catamaran', 'slab'],
  deepSpaceHunter: ['dagger', 'spine', 'trident'],
  executionVessel: ['obelisk', 'dagger', 'cathedral'],
  voidFortress: ['ring', 'sphere', 'dreadnought'],
  mobileFactory: ['dreadnought', 'carrier', 'slab'],
  gravaticManipulator: ['ring', 'sphere', 'biomech'],
};
/** Signature glow (mood) per DNA — ember / amber / toxic / void / frost / blood. */
export const ACCENT_BY_DNA: Record<CapitalDNAType, number> = {
  heavyIndustrial: 0xff7a2a, // ember orange
  orbitalSiege: 0xffc24a, // amber
  livingFortress: 0x63ff84, // toxic green
  machineCathedral: 0xb15cff, // void purple
  carrier: 0x7fe8ff, // frost cyan
  deepSpaceHunter: 0x49a6ff, // cold blue
  executionVessel: 0xff3a48, // blood red
  voidFortress: 0x9d5cff, // violet
  mobileFactory: 0xffa23a, // orange-amber
  gravaticManipulator: 0xc84dff, // magenta-violet
};
const PRE = ['Iron', 'Void', 'Ash', 'Grave', 'Storm', 'Black', 'Dread', 'Siege', 'Wrath', 'Null', 'Cinder', 'Doom', 'Rust', 'Pale'];
const SUF = ['maw', 'crown', 'spire', 'fist', 'hymn', 'reaver', 'warden', 'harbinger', 'sovereign', 'requiem', 'colossus', 'bastion', 'gallows', 'anvil'];
export const CLASS_BY_DNA: Record<CapitalDNAType, string> = {
  heavyIndustrial: 'Siege Dreadnought',
  orbitalSiege: 'Bombardment Platform',
  livingFortress: 'Fortress Hulk',
  machineCathedral: 'Cathedral-Class',
  carrier: 'Deployment Carrier',
  deepSpaceHunter: 'Hunter-Killer',
  executionVessel: 'Execution Barge',
  voidFortress: 'Void Bastion',
  mobileFactory: 'Forgeship',
  gravaticManipulator: 'Gravitic Manipulator',
};

/** Pick a family from a DNA's signature list — the first entry ~70% of the time, else
 *  one of the rest — so a DNA reads consistently while still surprising. */
function weightedFamily(fams: HullShape[], x: number): HullShape {
  if (fams.length <= 1 || x < 0.7) return fams[0];
  const rest = fams.slice(1);
  return rest[Math.min(rest.length - 1, Math.floor(((x - 0.7) / 0.3) * rest.length))];
}

/** Roll a deterministic CapitalDNA from a seed. Family + accent come from the primary
 *  DNA's signature (secondary occasionally tints the accent), so the ten DNA types each
 *  own a recognisable silhouette + palette while length/counts/scatter vary by seed. */
export function rollCapitalDNA(seed: number): CapitalDNA {
  const r = rng(seed ^ 0xca9);
  const pick = <T>(a: T[]): T => a[Math.floor(r() * a.length)];
  const primary = pick(DNA_TYPES);
  let secondary = pick(DNA_TYPES);
  if (secondary === primary) secondary = DNA_TYPES[(DNA_TYPES.indexOf(primary) + 1) % DNA_TYPES.length];
  const hull = weightedFamily(FAMILY_BY_DNA[primary], r());
  // ~75% the primary mood, ~25% the secondary's — a subtle two-tone hint.
  const accent = r() < 0.75 ? ACCENT_BY_DNA[primary] : ACCENT_BY_DNA[secondary];
  return {
    seed,
    primary,
    secondary,
    name: `${pick(PRE)}${pick(SUF)}`,
    classification: CLASS_BY_DNA[primary],
    hull,
    bridge: pick(BRIDGES),
    length: 130 + Math.floor(r() * 60),
    engines: 2 + Math.floor(r() * 4),
    turrets: 6 + Math.floor(r() * 10),
    bays: 1 + Math.floor(r() * 3),
    accent,
    body: pick(BODIES),
  };
}
