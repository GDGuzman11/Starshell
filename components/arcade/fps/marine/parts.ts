/**
 * ARMOR PARTS — the parametric generator behind the Marine's Armor Engineering,
 * the twin of the weapon Arsenal's `parts.ts`. Each body slot's tree is GENERATED
 * deterministically (seeded per slot), Starshell-style: 20 Standard + 20 Prototype
 * + 20 Legendary per slot → 60 unique pieces, each with its own curated name,
 * manufacturer, defensive stat profile, and a parametric MODEL SPEC the renderer
 * turns into visible primitive geometry that physically appears on the Marine.
 *
 * Bonuses are small on purpose (armour is prestige-first — "never pay-to-win");
 * the real payoff is the visible evolution across familiarity stages.
 *
 * Imported ONLY by the /arcade chunk.
 */
import { rng } from '../rand';
import { priceFor, legendaryGate, type PartGate } from '../arsenal/economy';
import { MANUFACTURERS, MANUFACTURER_IDS, type ManufacturerId } from '../arsenal/manufacturers';
import { ARMOR_SLOTS, slotById, type ArmorFamily, type ArmorSlot, type ArmorStat } from './slots';
import { productsForSlot } from './products';
import { divisionSlots } from './divisions';
import type { ComponentTheme } from '../gen/blueprint';
import { armorSetsForDivision, getArmorSet } from '../gen/armorSets';

const clampN = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
/** Map an armour defensive stat onto the weapon statBias key its DNA lean uses. */
const ARMOR_BIAS_KEY: Record<ArmorStat, 'dmg' | 'mag' | 'reload' | 'handling'> = {
  armor: 'dmg', shield: 'mag', recovery: 'reload', mobility: 'handling',
};
/** A stable signature so themed trees cache separately from the base slot tree. */
function themeSig(t: ComponentTheme): string {
  return `${t.accent}-${t.body.join(',')}-${t.nameVocab[0] ?? ''}`;
}

export type ArmorTier = 'standard' | 'prototype' | 'legendary';
export const ARMOR_TIERS: ArmorTier[] = ['standard', 'prototype', 'legendary'];
export const PER_TIER = 20; // pieces per tier per slot

/** Multiplicative defensive deltas (small, e.g. armor +0.04). */
export interface ArmorStats {
  armor?: number;
  mobility?: number;
  shield?: number;
  recovery?: number;
}

/** Parametric geometry description — partModel.ts builds primitives from it. */
export interface ArmorModelSpec {
  family: ArmorFamily;
  division?: string; // identity for per-division geometry ('recruit' when undefined)
  seed: number; // per-piece seed → distinct in-language variant
  bulk: number; // overall size factor (0.8..1.5)
  plates: number; // layered plates / detail segments
  vents: number; // vent cutouts / ribs
  spikes: number; // 0..3 aggressive trim
  emissive: number; // 0..1 glow strength
  animated: boolean; // moving geometry (prototype/legendary)
  accent: number; // manufacturer emissive colour
  body: number; // manufacturer body metal
  slot?: string; // owning slot id (Pt2 product lookup)
  template?: string; // Pt2 product id (partModel renders a bespoke product when set)
}

export interface ArmorPiece {
  id: string; // `${slotId}:${tier}:${index}`
  slot: string;
  family: ArmorFamily;
  tier: ArmorTier;
  name: string;
  manufacturer: ManufacturerId;
  price: number; // AstroDiamonds
  stats: ArmorStats;
  model: ArmorModelSpec;
  animated: boolean;
  cosmetic: boolean;
  gate?: PartGate; // legendary only
}

// ── naming pools ──────────────────────────────────────────────────────────────
const SLOT_NOUN: Record<string, string> = {
  helmet: 'Helm', visor: 'Visor', neck: 'Gorget', chest: 'Cuirass', back: 'Backplate',
  shoulders: 'Pauldrons', upperArms: 'Rerebrace', forearms: 'Vambrace', gloves: 'Gauntlets',
  belt: 'Harness', hip: 'Faulds', thighs: 'Cuisse', knees: 'Poleyns', shins: 'Greaves',
  boots: 'Sabatons', backpack: 'Pack', core: 'Core', comms: 'Array', coating: 'Coating', insignia: 'Crest',
};
const SLOT_ROLES: Record<string, string[]> = {
  helmet: ['Recruit', 'Sentry', 'Bulwark', 'Recon', 'Assault', 'Guardian', 'Vanguard', 'Iron', 'Combat', 'Field', 'Warden', 'Sentinel', 'Ranger', 'Storm'],
  visor: ['Recon', 'Wide', 'Thermal', 'Tactical', 'Hawk', 'Night', 'Combat', 'Ranger', 'Optic', 'Scanner', 'Falcon', 'Vista', 'Eagle', 'Overwatch'],
  neck: ['Reinforced', 'Sealed', 'Combat', 'Guardian', 'Iron', 'Layered', 'Field', 'Bulwark', 'Storm', 'Warden', 'Riot', 'Anchor', 'Ridge', 'Collar'],
  chest: ['Reinforced', 'Bulwark', 'Assault', 'Combat', 'Iron', 'Guardian', 'Storm', 'Vanguard', 'Layered', 'Riot', 'Warden', 'Aegis', 'Titan', 'Fortress'],
  back: ['Reinforced', 'Sealed', 'Combat', 'Layered', 'Iron', 'Guardian', 'Field', 'Storm', 'Bulwark', 'Warden', 'Ridge', 'Anchor', 'Spine', 'Carapace'],
  shoulders: ['Broad', 'Heavy', 'Bulwark', 'Assault', 'Guardian', 'Iron', 'Storm', 'Vanguard', 'Riot', 'Combat', 'Warden', 'Titan', 'Ridge', 'Anvil'],
  upperArms: ['Reinforced', 'Combat', 'Field', 'Iron', 'Guardian', 'Layered', 'Assault', 'Storm', 'Bulwark', 'Riot', 'Ranger', 'Anchor', 'Ridge', 'Brace'],
  forearms: ['Combat', 'Field', 'Ranger', 'Recon', 'Light', 'Agile', 'Storm', 'Iron', 'Guardian', 'Sealed', 'Runner', 'Swift', 'Brace', 'Vector'],
  gloves: ['Combat', 'Grip', 'Tactical', 'Ranger', 'Field', 'Precision', 'Storm', 'Assault', 'Iron', 'Riot', 'Sure', 'Swift', 'Hook', 'Palm'],
  belt: ['Utility', 'Field', 'Combat', 'Supply', 'Ranger', 'Service', 'Tactical', 'Recon', 'Storm', 'Support', 'Carrier', 'Pack', 'Rig', 'Sling'],
  hip: ['Reinforced', 'Combat', 'Guardian', 'Iron', 'Layered', 'Field', 'Bulwark', 'Storm', 'Riot', 'Warden', 'Ridge', 'Skirt', 'Anchor', 'Plate'],
  thighs: ['Combat', 'Ranger', 'Field', 'Agile', 'Light', 'Recon', 'Storm', 'Runner', 'Iron', 'Guardian', 'Swift', 'Vector', 'Brace', 'Stride'],
  knees: ['Combat', 'Reinforced', 'Ranger', 'Field', 'Iron', 'Guardian', 'Storm', 'Riot', 'Brace', 'Ridge', 'Anchor', 'Cap', 'Guard', 'Lock'],
  shins: ['Combat', 'Ranger', 'Field', 'Agile', 'Recon', 'Storm', 'Iron', 'Guardian', 'Runner', 'Swift', 'Vector', 'Brace', 'Stride', 'Splint'],
  boots: ['Combat', 'Ranger', 'Field', 'Grip', 'Assault', 'Storm', 'Runner', 'Iron', 'Tactical', 'Riot', 'Swift', 'Tread', 'Cleat', 'Stomp'],
  backpack: ['Field', 'Supply', 'Combat', 'Recon', 'Storm', 'Support', 'Ranger', 'Tactical', 'Reserve', 'Carrier', 'Cell', 'Rig', 'Load', 'Frame'],
  core: ['Fusion', 'Cell', 'Stable', 'Surge', 'Capacitor', 'Reactor', 'Charged', 'Dense', 'Plasma', 'Flux', 'Dynamo', 'Ember', 'Pulse', 'Ignition'],
  comms: ['Recon', 'Field', 'Tactical', 'Wide', 'Signal', 'Relay', 'Storm', 'Ranger', 'Uplink', 'Beacon', 'Vector', 'Scanner', 'Aerial', 'Node'],
  coating: ['Matte', 'Gloss', 'Urban', 'Desert', 'Arctic', 'Woodland', 'Carbon', 'Chrome', 'Ember', 'Void', 'Storm', 'Ash', 'Steel', 'Onyx'],
  insignia: ['Recruit', 'Valor', 'Honor', 'Vanguard', 'Sentinel', 'Storm', 'Iron', 'Eagle', 'Wolf', 'Reaper', 'Aegis', 'Nova', 'Falcon', 'Legion'],
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

const TIER_MAG: Record<ArmorTier, number> = { standard: 1, prototype: 1.7, legendary: 2.6 };
const STATS: ArmorStat[] = ['armor', 'mobility', 'shield', 'recovery'];
// Manufacturer weapon-bias reused as an armour-flavour nudge (kept tiny).
const BIAS: Record<ArmorStat, keyof (typeof MANUFACTURERS)['orion']['bias']> = {
  armor: 'dmg', mobility: 'handling', shield: 'mag', recovery: 'reload',
};
const cache = new Map<string, ArmorPiece[]>();

/** One slot's 60 pieces (20 per tier), deterministic per slot. An optional DNA `theme`
 *  (generated armour sets) makes the whole tree DNA-cohesive: palette from the DNA
 *  colours, names in the DNA voice, geometry + stat lean following the DNA. */
function buildSlot(slot: ArmorSlot, theme?: ComponentTheme): ArmorPiece[] {
  const roles = slot.roles ?? SLOT_ROLES[slot.id] ?? ['Combat'];
  const noun = slot.noun ?? SLOT_NOUN[slot.id] ?? 'Plate';
  // Pt2: if this SLOT has a bespoke PRODUCT line, each piece becomes one product
  // (distinct silhouette + product name) instead of a seeded language variant. Themed
  // sets use the manufacturer/role naming path so pieces read in the DNA voice.
  const products = theme ? undefined : productsForSlot(slot.id);
  const out: ArmorPiece[] = [];
  // 60 DISTINCT (manufacturer, role) combos so names never repeat within a slot.
  const combos: [ManufacturerId, string][] = [];
  const seen = new Set<string>();
  const r0 = rng(hashStr(`${slot.id}|combos`));
  let guard = 0;
  while (combos.length < ARMOR_TIERS.length * PER_TIER && guard++ < 4000) {
    const m = MANUFACTURER_IDS[(r0() * MANUFACTURER_IDS.length) | 0];
    const role = roles[(r0() * roles.length) | 0];
    const key = `${m}:${role}`;
    if (seen.has(key)) continue;
    seen.add(key);
    combos.push([m, role]);
  }

  ARMOR_TIERS.forEach((tier, ti) => {
    for (let i = 0; i < PER_TIER; i++) {
      const idx = ti * PER_TIER + i;
      const [mfr, role] = combos[idx];
      const man = MANUFACTURERS[mfr];
      const r = rng(hashStr(`${slot.id}|${tier}|${i}`));
      const mag = TIER_MAG[tier];
      const stats: ArmorStats = {};
      if (!slot.cosmetic) {
        // DNA lean: a set whose DNA favours this slot's primary stat grows stronger there.
        const lean = theme ? 1 + 0.2 * clampN(theme.statBias[ARMOR_BIAS_KEY[slot.primary]] ?? 0, -1, 1) : 1;
        // primary defensive lift + a small tradeoff (standard) or secondary (higher tiers).
        const base = (0.02 + r() * 0.04) * mag * lean; // 2-6% (×tier, ×DNA lean)
        stats[slot.primary] = +(base + man.bias[BIAS[slot.primary]] * 0.5).toFixed(3);
        const sec = STATS[(r() * STATS.length) | 0];
        if (tier === 'standard') {
          const trade = STATS[(r() * STATS.length) | 0];
          if (trade !== slot.primary) stats[trade] = +(-(0.008 + r() * 0.016)).toFixed(3);
        } else if (sec !== slot.primary) {
          stats[sec] = +((0.012 + r() * 0.024) * (mag - 1)).toFixed(3);
        }
      }
      const shortMfr = man.name.split(' ')[0];
      // Pt2 product line → a catalog-style product name; otherwise the manufacturer/role name.
      const product = products?.[idx % products.length];
      // DNA naming: seed higher-tier names with a word from the set's DNA vocabulary.
      const themeWord = theme && theme.nameVocab.length ? theme.nameVocab[(r() * theme.nameVocab.length) | 0] : null;
      const name = product
        ? tier === 'standard'
          ? `${product.name} ${product.noun}`
          : tier === 'prototype'
            ? `${product.name} ${product.noun} · Mk-II`
            : `${product.name} ${product.noun} · Apex`
        : tier === 'standard'
          ? `${shortMfr} ${role} ${noun}`
          : tier === 'prototype'
            ? `${shortMfr} ${role} ${noun} ${themeWord ?? PROTO_TOKENS[(r() * PROTO_TOKENS.length) | 0]}`
            : `${shortMfr} ${themeWord ?? LEGEND_TOKENS[(r() * LEGEND_TOKENS.length) | 0]} ${role} ${noun}`;
      const animated = tier !== 'standard';
      const gb = theme?.geometryBias;
      const model: ArmorModelSpec = {
        family: slot.family,
        division: slot.division ?? 'recruit',
        seed: hashStr(`${slot.id}|${tier}|${i}|geo${theme ? '|' + themeSig(theme) : ''}`),
        bulk: +clampN(0.85 + r() * 0.5 + (tier === 'legendary' ? 0.15 : 0) + (gb?.girth ?? 0) * 0.3, 0.8, 1.6).toFixed(2),
        plates: 1 + ((r() * 3) | 0) + (tier === 'legendary' ? 2 : tier === 'prototype' ? 1 : 0),
        vents: Math.round(clampN(((r() * 4) | 0) + (gb?.vents ?? 0) * 2, 0, 5)),
        spikes: (r() * 4) | 0,
        emissive: +clampN((tier === 'standard' ? r() * 0.3 : 0.4 + r() * 0.6) + (gb?.emissive ?? 0) * 0.3, 0, 1).toFixed(2),
        animated,
        accent: theme ? theme.accent : man.accent,
        body: theme && theme.body.length ? theme.body[idx % theme.body.length] : man.body,
        slot: slot.id,
        template: product?.id,
      };
      const magSum = Math.abs(stats[slot.primary] ?? 0.03) + Math.abs(stats[STATS[(r() * STATS.length) | 0]] ?? 0);
      const price = priceFor(tier === 'standard' ? 'military' : tier, magSum);
      out.push({
        id: `${slot.id}:${tier}:${i}`,
        slot: slot.id,
        family: slot.family,
        tier,
        name,
        manufacturer: mfr,
        price,
        stats,
        model,
        animated,
        cosmetic: !!slot.cosmetic,
        gate: tier === 'legendary' ? legendaryGate(price) : undefined,
      });
    }
  });
  return out;
}

/** All 60 pieces for a slot (memoized). An optional DNA `theme` (generated armour
 *  sets) produces a DNA-cohesive tree cached separately from the base slot tree. The
 *  BASE call also appends any baked generated-set pieces that target this slot, so a
 *  baked set is equippable in the Armory bench. */
export function generateArmor(slotId: string, theme?: ComponentTheme): ArmorPiece[] {
  const key = theme ? `${slotId}::${themeSig(theme)}` : slotId;
  const hit = cache.get(key);
  if (hit) return hit;
  const slot = slotById(slotId);
  let parts = slot ? buildSlot(slot, theme) : [];
  if (slot && !theme) parts = parts.concat(bakedSetPiecesForSlot(slotId)); // surface baked sets
  if (slot) cache.set(key, parts); // don't cache misses (slot may register later)
  return parts;
}

// ── generated ARMOUR SETS ────────────────────────────────────────────────────────
/** The body slots an armour set covers (Outrider = the recruit set; specialists own theirs). */
function setSlots(division: string): ArmorSlot[] {
  return (division === 'outrider' ? ARMOR_SLOTS : divisionSlots(division)).filter((s) => !s.cosmetic);
}
/** A stable "hero" piece from a themed tree (a legendary, varied per set+slot). */
function representative(themed: ArmorPiece[], setTag: string, slotId: string): ArmorPiece | null {
  const legs = themed.filter((p) => p.tier === 'legendary');
  const pool = legs.length ? legs : themed;
  if (!pool.length) return null;
  return pool[hashStr(`${setTag}|${slotId}`) % pool.length];
}
/** One themed piece per covered slot for a set — its equippable/previewable outfit. */
export function armorSetPieces(setId: string): ArmorPiece[] {
  const set = getArmorSet(setId);
  if (!set) return [];
  const out: ArmorPiece[] = [];
  for (const slot of setSlots(set.division)) {
    const rep = representative(generateArmor(slot.id, set.theme), set.dna.featureHash, slot.id);
    if (rep) out.push({ ...rep, id: `${slot.id}:set:${set.dna.featureHash}` });
  }
  return out;
}
/** Baked-set pieces that mount on a given slot (appended into that slot's base tree). */
function bakedSetPiecesForSlot(slotId: string): ArmorPiece[] {
  const slot = slotById(slotId);
  if (!slot) return [];
  const div = slot.division ?? 'outrider';
  const out: ArmorPiece[] = [];
  for (const set of armorSetsForDivision(div)) {
    if (!setSlots(div).some((s) => s.id === slotId)) continue;
    const rep = representative(generateArmor(slotId, set.theme), set.dna.featureHash, slotId);
    if (rep) out.push({ ...rep, id: `${slotId}:set:${set.dna.featureHash}` });
  }
  return out;
}

/** Look up a single piece by id (regenerates its slot's tree as needed). */
export function armorById(id: string): ArmorPiece | undefined {
  const slotId = id.split(':')[0];
  return generateArmor(slotId).find((p) => p.id === id);
}
