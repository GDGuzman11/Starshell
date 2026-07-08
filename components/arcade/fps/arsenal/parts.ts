/**
 * Engineering PARTS — the parametric generator at the heart of the Arsenal system.
 * Rather than hand-authoring thousands of parts, each weapon's tree is GENERATED
 * deterministically (seeded per weapon + category), Starshell-style: 20 Military +
 * 20 Prototype + 20 Legendary per category → 300 unique parts per weapon, each with
 * its own name (curated pools, never placeholders), manufacturer, stat profile, and
 * a parametric MODEL SPEC the renderer turns into visible primitive geometry.
 *
 * Parts are weapon-specific (the seed includes the weapon id) so a Pulse AR barrel
 * family never resembles a Carbine barrel family. Roles/stats are parametric, not
 * 5,400 hand-designed — deliberately, so the system scales to future weapons for free.
 *
 * Imported ONLY by the /arcade chunk.
 */
import { rng } from '../rand';
import type { Family } from '../weapons';
import { categoriesForFamily, type Category, type SlotKind } from './categories';
import { MANUFACTURERS, MANUFACTURER_IDS, type ManufacturerId } from './manufacturers';
import { priceFor, legendaryGate, type PartGate } from './economy';
import type { ComponentTheme } from '../gen/blueprint';
import { getComponentTheme } from '../gen/themeStore';

export type Tier = 'military' | 'prototype' | 'legendary';
export const TIERS: Tier[] = ['military', 'prototype', 'legendary'];
export const PER_TIER = 20; // parts per tier per category

/** Multiplicative stat deltas (e.g. dmg +0.06). rate/reload positive = FASTER. */
export interface PartStats {
  dmg?: number;
  rate?: number;
  mag?: number;
  reload?: number;
  handling?: number;
}

/** Parametric geometry description — the renderer (Phase 2) builds primitives from it. */
export interface PartModelSpec {
  slot: SlotKind;
  len: number; // along-axis length factor
  girth: number; // cross-section factor
  segs: number; // detail segments / plates
  vents: number; // vent/fin cutouts
  muzzle: number; // 0..3 muzzle/emitter style
  taper: number; // -0.3..0.3 profile taper
  emissive: number; // 0..1 glow strength
  animated: boolean; // moving geometry (prototype/legendary)
  accent: number; // manufacturer emissive colour
  body: number; // manufacturer body metal
}

export interface EngPart {
  id: string; // `${weaponId}:${category}:${tier}:${index}`
  weaponId: string;
  family: Family;
  category: string;
  slot: SlotKind;
  tier: Tier;
  name: string;
  manufacturer: ManufacturerId;
  price: number; // AstroDiamonds
  stats: PartStats;
  model: PartModelSpec;
  animated: boolean;
  gate?: PartGate; // legendary only
}

// ── naming pools ──────────────────────────────────────────────────────────────
const SLOT_NOUN: Record<SlotKind, string> = {
  barrel: 'Barrel', receiver: 'Receiver', magazine: 'Magazine', optic: 'Optic', rear: 'Assembly',
  feed: 'Feed', cooling: 'Cooling', stability: 'Stabilizer', emitter: 'Emitter', core: 'Core',
  targeting: 'Targeter', reactor: 'Reactor', scope: 'Scope', bolt: 'Bolt', stock: 'Stock',
  tube: 'Tube', warhead: 'Warhead', stabilizer: 'Stabilizer', slide: 'Slide', frame: 'Frame',
  sight: 'Sight', grip: 'Grip',
};
const SLOT_ROLES: Record<SlotKind, string[]> = {
  barrel: ['Heavy', 'Recon', 'CQB', 'Precision', 'Carbon', 'Reinforced', 'Field', 'Combat', 'Vented', 'Longbore', 'Marksman', 'Sabot', 'Bulldog', 'Storm', 'Ranger', 'Hammer'],
  receiver: ['Match', 'Rapid', 'Hardened', 'Featherweight', 'Milled', 'Tuned', 'Ambush', 'Service', 'Precision', 'Overclocked', 'Sealed', 'Recoil', 'Assault', 'Sentinel'],
  magazine: ['Extended', 'Drum', 'Quickload', 'Coil', 'Compact', 'Belt', 'Hi-Cap', 'Balanced', 'Tactical', 'Field', 'Boxmag', 'Cellfed', 'Reserve', 'Surge'],
  optic: ['Reflex', 'Holo', 'Recon', 'Thermal', 'Hybrid', 'Micro', 'Combat', 'Wide', 'Marksman', 'Pulse', 'Night', 'Aegis', 'Overwatch', 'Tracker'],
  rear: ['Recoil', 'Folding', 'Cheek', 'Stabilized', 'Buffer', 'Skeleton', 'Combat', 'Precision', 'Weighted', 'Adaptive', 'Service', 'Anchor', 'Brace', 'Guard'],
  feed: ['Belt', 'Twin', 'Rapid', 'Hardened', 'Auto', 'Chain', 'Reinforced', 'Surge', 'Sustained', 'Heavy', 'Cyclic', 'Linked', 'Supply', 'Torrent'],
  cooling: ['Vented', 'Cryo', 'Radiant', 'Heatsink', 'Fluid', 'Finned', 'Vapor', 'Deep', 'Rapid', 'Overpressure', 'Thermal', 'Frost', 'Vent', 'Chill'],
  stability: ['Bipod', 'Anchor', 'Damped', 'Braced', 'Weighted', 'Gyro', 'Locked', 'Steady', 'Recoil', 'Ballast', 'Grounded', 'Fixed', 'Bulwark', 'Keel'],
  emitter: ['Focused', 'Wide', 'Lance', 'Ion', 'Pulse', 'Arc', 'Beam', 'Overcharged', 'Coherent', 'Prism', 'Nova', 'Photon', 'Ray', 'Spectral'],
  core: ['Fusion', 'Cell', 'Overclocked', 'Stable', 'Surge', 'Capacitor', 'Reactor', 'Dense', 'Charged', 'Quantum', 'Plasma', 'Flux', 'Dynamo', 'Ignition'],
  targeting: ['Auto', 'Recon', 'Lockon', 'Predictive', 'Wide', 'Thermal', 'Tracking', 'Smart', 'Guided', 'Sentinel', 'Overwatch', 'Vector', 'Seeker', 'Optic'],
  reactor: ['Rapid', 'Deep', 'Vented', 'Surge', 'Twin', 'Stable', 'Overdrive', 'Charged', 'Coil', 'Backfeed', 'Bloom', 'Cascade', 'Pulse', 'Ember'],
  scope: ['Recon', 'Marksman', 'Variable', 'Thermal', 'Long', 'Precision', 'Ranger', 'Night', 'Hunter', 'Overwatch', 'Sabre', 'Eagle', 'Falcon', 'Vista'],
  bolt: ['Rapid', 'Match', 'Fluted', 'Hardened', 'Cycled', 'Precision', 'Quick', 'Tuned', 'Sealed', 'Ambush', 'Straight', 'Twin', 'Snap', 'Lever'],
  stock: ['Precision', 'Folding', 'Weighted', 'Cheek', 'Adaptive', 'Skeleton', 'Marksman', 'Bipod', 'Anchor', 'Buffer', 'Recoil', 'Steady', 'Brace', 'Frame'],
  tube: ['Heavy', 'Rifled', 'Wide', 'Recoilless', 'Reinforced', 'Long', 'Compact', 'Vented', 'Siege', 'Storm', 'Breach', 'Titan', 'Maw', 'Blast'],
  warhead: ['HE', 'Shaped', 'Cluster', 'Thermal', 'Plasma', 'Frag', 'Penetrator', 'Concussion', 'Incendiary', 'Void', 'Nova', 'Shatter', 'Ruin', 'Ember'],
  stabilizer: ['Gyro', 'Damped', 'Braced', 'Vector', 'Anchor', 'Steady', 'Balanced', 'Locked', 'Fin', 'Ballast', 'Keel', 'Grounded', 'Bulwark', 'Vane'],
  slide: ['Match', 'Ported', 'Lightened', 'Heavy', 'Milled', 'Rapid', 'Hardened', 'Combat', 'Vented', 'Tuned', 'Service', 'Compensated', 'Snap', 'Edge'],
  frame: ['Alloy', 'Polymer', 'Steel', 'Skeleton', 'Balanced', 'Reinforced', 'Compact', 'Combat', 'Service', 'Grip', 'Featherweight', 'Sealed', 'Core', 'Shell'],
  sight: ['Reflex', 'Iron', 'Micro', 'Holo', 'Night', 'Combat', 'Tritium', 'Fiber', 'Snap', 'Low', 'Ranger', 'Dot', 'Notch', 'Bead'],
  grip: ['Combat', 'Textured', 'Angled', 'Vertical', 'Rubber', 'Precision', 'Stippled', 'Compact', 'Ergonomic', 'Service', 'Tactical', 'Steady', 'Hook', 'Palm'],
};
const PROTO_TOKENS = ['Mk-II', 'Experimental', 'Prototype', 'Pulse', 'Overdrive', 'Flux', 'Vanguard', 'Phase', 'Aurora', 'Vortex'];
const LEGEND_TOKENS = ['Apex', 'Warborn', 'Ascendant', 'Immortal', 'Sovereign', 'Eternal', 'Paragon', 'Genesis', 'Zenith', 'Oblivion'];

function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const TIER_MAG: Record<Tier, number> = { military: 1, prototype: 1.7, legendary: 2.6 }; // stat + price scale
const cache = new Map<string, EngPart[]>();
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/** Generate one category's 60 parts (20 per tier), deterministic per weapon+category.
 *  A DNA `theme` (generated weapons) biases the whole tree: palette from the DNA colours,
 *  names seeded with the DNA vocabulary, geometry + stat lean following the DNA — so a
 *  weapon's components look and feel like their parent. */
function buildCategory(weaponId: string, family: Family, cat: Category, theme?: ComponentTheme): EngPart[] {
  const roles = SLOT_ROLES[cat.slot];
  const noun = SLOT_NOUN[cat.slot];
  const out: EngPart[] = [];
  // 60 DISTINCT (manufacturer, role) combos across the category so names never repeat.
  const combos: [ManufacturerId, string][] = [];
  const seen = new Set<string>();
  const r0 = rng(hashStr(`${weaponId}|${cat.id}|combos`));
  let guard = 0;
  while (combos.length < TIERS.length * PER_TIER && guard++ < 4000) {
    const m = MANUFACTURER_IDS[(r0() * MANUFACTURER_IDS.length) | 0];
    const role = roles[(r0() * roles.length) | 0];
    const key = `${m}:${role}`;
    if (seen.has(key)) continue;
    seen.add(key);
    combos.push([m, role]);
  }

  TIERS.forEach((tier, ti) => {
    for (let i = 0; i < PER_TIER; i++) {
      const idx = ti * PER_TIER + i;
      const [mfr, role] = combos[idx];
      const man = MANUFACTURERS[mfr];
      const r = rng(hashStr(`${weaponId}|${cat.id}|${tier}|${i}`));
      const mag = TIER_MAG[tier];
      // primary stat gets the main lift; a light tradeoff keeps parts non-strictly-better.
      // DNA stat lean: a weapon whose DNA favours this category's primary stat grows
      // slightly stronger parts for it (kept light so parts stay balanced).
      const lean = theme ? 1 + 0.2 * clamp(theme.statBias[cat.primary] ?? 0, -1, 1) : 1;
      const base = (0.02 + r() * 0.04) * mag * lean; // 2-6% (×tier, ×DNA lean)
      const stats: PartStats = {};
      stats[cat.primary] = +(base + man.bias[cat.primary === 'handling' ? 'handling' : cat.primary]).toFixed(3);
      // a small secondary bump (prototype/legendary) + a military tradeoff
      const others: (keyof PartStats)[] = ['dmg', 'rate', 'mag', 'reload', 'handling'];
      const sec = others[(r() * others.length) | 0];
      if (tier === 'military') {
        const trade = others[(r() * others.length) | 0];
        if (trade !== cat.primary) stats[trade] = +(-(0.01 + r() * 0.02)).toFixed(3);
      } else if (sec !== cat.primary) {
        stats[sec] = +((0.015 + r() * 0.03) * (mag - 1)).toFixed(3);
      }
      const shortMfr = man.name.split(' ')[0];
      // DNA naming: seed higher-tier names with a word from the DNA vocabulary. The
      // (manufacturer, role) pair is already unique per part, so names never collide.
      const themeWord = theme && theme.nameVocab.length ? theme.nameVocab[(r() * theme.nameVocab.length) | 0] : null;
      const name =
        tier === 'military'
          ? `${shortMfr} ${role} ${noun}`
          : tier === 'prototype'
            ? `${shortMfr} ${role} ${noun} ${themeWord ?? PROTO_TOKENS[(r() * PROTO_TOKENS.length) | 0]}`
            : `${shortMfr} ${themeWord ?? LEGEND_TOKENS[(r() * LEGEND_TOKENS.length) | 0]} ${role} ${noun}`;
      const animated = tier !== 'military';
      // DNA geometry lean: nudge girth / vents / emissive / muzzle toward the DNA's look.
      const gb = theme?.geometryBias;
      const model: PartModelSpec = {
        slot: cat.slot,
        len: +(0.7 + r() * 0.8 + (tier === 'legendary' ? 0.15 : 0)).toFixed(2),
        girth: +clamp(0.8 + r() * 0.5 + (gb?.girth ?? 0) * 0.3, 0.6, 1.4).toFixed(2),
        segs: 1 + ((r() * 4) | 0) + (tier === 'legendary' ? 2 : tier === 'prototype' ? 1 : 0),
        vents: Math.round(clamp(((r() * 4) | 0) + (gb?.vents ?? 0) * 2, 0, 5)),
        muzzle: gb?.muzzle != null ? Math.round(clamp((((r() * 4) | 0) + gb.muzzle) / 2, 0, 3)) : (r() * 4) | 0,
        taper: +((r() - 0.5) * 0.6).toFixed(2),
        emissive: +clamp((tier === 'military' ? r() * 0.3 : 0.4 + r() * 0.6) + (gb?.emissive ?? 0) * 0.3, 0, 1).toFixed(2),
        animated,
        accent: theme ? theme.accent : man.accent,
        body: theme && theme.body.length ? theme.body[idx % theme.body.length] : man.body,
      };
      const price = priceFor(tier, base + (stats[sec] ?? 0));
      out.push({
        id: `${weaponId}:${cat.id}:${tier}:${i}`,
        weaponId,
        family,
        category: cat.id,
        slot: cat.slot,
        tier,
        name,
        manufacturer: mfr,
        price,
        stats,
        model,
        animated,
        gate: tier === 'legendary' ? legendaryGate(price) : undefined,
      });
    }
  });
  return out;
}

/** All 300 engineering parts for a weapon (memoized). Generated weapons pass (or look
 *  up) a DNA `theme` so their component tree inherits the parent's identity; built-in
 *  weapons pass nothing and are unchanged. */
export function generateParts(weaponId: string, family: Family, theme?: ComponentTheme): EngPart[] {
  const hit = cache.get(weaponId);
  if (hit) return hit;
  const th = theme ?? getComponentTheme(weaponId);
  const parts: EngPart[] = [];
  for (const cat of categoriesForFamily(family)) parts.push(...buildCategory(weaponId, family, cat, th));
  cache.set(weaponId, parts);
  return parts;
}

/** The 60 parts of one category. */
export function partsForCategory(weaponId: string, family: Family, catId: string): EngPart[] {
  return generateParts(weaponId, family).filter((p) => p.category === catId);
}

/** Look up a single part by id (regenerates its weapon's tree as needed). */
export function partById(id: string): EngPart | undefined {
  const weaponId = id.split(':')[0];
  return cache.get(weaponId)?.find((p) => p.id === id);
}

/** Fold a set of EQUIPPED parts' stat deltas onto a base gun (multiplicative). rate +
 *  reload deltas make the weapon FASTER. `famDmg` is the weapon's small familiarity
 *  damage bonus (see familiarity.milestoneBonus). Mirrors customize.applyUpgrades. */
export function applyEngineering<T extends { dmg: number; rate: number; mag: number; reload: number }>(gun: T, parts: EngPart[], famDmg = 0): T {
  let dmg = 1 + famDmg;
  let rate = 1;
  let mag = 1;
  let reload = 1;
  for (const p of parts) {
    dmg *= 1 + (p.stats.dmg ?? 0);
    rate *= 1 - (p.stats.rate ?? 0);
    mag *= 1 + (p.stats.mag ?? 0);
    reload *= 1 - (p.stats.reload ?? 0);
  }
  return {
    ...gun,
    dmg: Math.round(gun.dmg * dmg),
    rate: +(gun.rate * Math.max(0.2, rate)).toFixed(3),
    mag: Math.max(1, Math.round(gun.mag * mag)),
    reload: +(gun.reload * Math.max(0.3, reload)).toFixed(2),
  };
}
