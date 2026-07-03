/**
 * PREMIUM tiers — the real-cash arsenal (Apex / Sovereign / Legendary). SCAFFOLD ONLY:
 * three prestige tiers, ten TBD weapon slots each, marked "coming soon". No payment
 * processing, no actual guns/components yet — real monetization is a separate future
 * project (needs a payment processor + a backend to store entitlements securely, since a
 * client-only unlock would be trivially cheated). Each future premium weapon will house
 * its own premium components (much pricier, ~2× effect + perks; some real-cash).
 *
 * Imported ONLY by the /arcade chunk.
 */
export interface PremiumTier {
  id: string;
  name: string;
  code: string; // designation prefix (APX / SOV / LGD)
  accent: number;
  blurb: string;
  slots: number;
}

export const PREMIUM_TIERS: PremiumTier[] = [
  { id: 'apex', name: 'APEX', code: 'APX', accent: 0x7fdfff, blurb: 'Elite field-grade prototypes — a decisive edge.', slots: 10 },
  { id: 'sovereign', name: 'SOVEREIGN', code: 'SOV', accent: 0xc8a8ff, blurb: 'Command-tier masterwork arms — engineered without compromise.', slots: 10 },
  { id: 'legendary', name: 'LEGENDARY', code: 'LGD', accent: 0xffd27a, blurb: 'The pinnacle. Mythic-grade hardware few will ever wield.', slots: 10 },
];

/** Storefront categories (the Weapons tab's top level). */
export type WeaponCategory = 'primary' | 'heavy' | 'handheld';
export const PREMIUM_CATEGORIES: { id: WeaponCategory; label: string }[] = [
  { id: 'primary', label: 'Primary' },
  { id: 'heavy', label: 'Heavy' },
  { id: 'handheld', label: 'Hand Held' },
];

/** A showcased premium weapon (catalog entry). SHOWCASE-ONLY for now — the model is
 *  rendered + inspectable in the Premium store, but acquisition is `locked` (real
 *  monetization + in-game realization are a later step). `stats` are display-only
 *  (not wired to gameplay). The `id` must be registered in `fps/models/index.ts`. */
export interface PremiumWeapon {
  id: string; // model id (GUN_BUILDERS key)
  name: string;
  code: string; // tier designation prefix
  tier: string; // PremiumTier id
  category: WeaponCategory; // storefront section
  type: string; // weapon-type group within the category (e.g. 'Assault Rifles')
  accent: number;
  philosophy: string; // its unique engineering identity (one line)
  blurb: string;
  stats: { power: number; rate: number; mag: number; reload: number }; // display only
  locked: boolean;
}

/** The premium weapon catalog — ten Apex-tier assault rifles, each engineered by a
 *  completely different military research division (no shared silhouette or mechanism). */
export const PREMIUM_WEAPONS: PremiumWeapon[] = [
  {
    id: 'apx01',
    name: 'APX-01 REVENANT',
    code: 'APX',
    tier: 'apex',
    category: 'primary',
    type: 'Assault Rifles',
    accent: 0x7fdfff,
    philosophy: 'Exposed fusion reactor feeding twin magnetic rails, wrapped in counter-rotating plasma-containment rings.',
    blurb: 'The absolute pinnacle of human military engineering — engineered without compromise.',
    stats: { power: 95, rate: 0.14, mag: 40, reload: 2.1 },
    locked: true,
  },
  {
    id: 'apx02',
    name: 'APX-02 HYDRA',
    code: 'APX',
    tier: 'apex',
    category: 'primary',
    type: 'Assault Rifles',
    accent: 0xff7a2a,
    philosophy: 'Exposed hydraulic rams cycle the action under crushing pressure — every shot is a piston strike.',
    blurb: 'Industrial hydraulics turned into a weapon. It hits like a hammer press.',
    stats: { power: 118, rate: 0.5, mag: 20, reload: 2.6 },
    locked: true,
  },
  {
    id: 'apx03',
    name: 'APX-03 CYCLONE',
    code: 'APX',
    tier: 'apex',
    category: 'primary',
    type: 'Assault Rifles',
    accent: 0x63ff84,
    philosophy: 'A forward turbine and radial cooling fins bleed heat so the barrel never stops — sustained fire without mercy.',
    blurb: 'Spin it up and it simply does not overheat. Hold the trigger.',
    stats: { power: 40, rate: 0.06, mag: 80, reload: 2.4 },
    locked: true,
  },
  {
    id: 'apx04',
    name: 'APX-04 BASTION',
    code: 'APX',
    tier: 'apex',
    category: 'primary',
    type: 'Assault Rifles',
    accent: 0x6ab0ff,
    philosophy: 'Twin recoil dampeners swallow the kick of oversized rounds — a bunker you carry into the fight.',
    blurb: 'Absurd rounds, zero muzzle climb. Immovable.',
    stats: { power: 140, rate: 0.9, mag: 8, reload: 3.0 },
    locked: true,
  },
  {
    id: 'apx05',
    name: 'APX-05 AEGIS',
    code: 'APX',
    tier: 'apex',
    category: 'primary',
    type: 'Assault Rifles',
    accent: 0xb15cff,
    philosophy: 'A rotating iris shutter seals the bore between shots — surgical, sealed, immaculate.',
    blurb: 'Every shot leaves a perfect, sealed chamber. Precision as ritual.',
    stats: { power: 74, rate: 0.2, mag: 30, reload: 1.8 },
    locked: true,
  },
  {
    id: 'apx06',
    name: 'APX-06 SCAVENGER',
    code: 'APX',
    tier: 'apex',
    category: 'primary',
    type: 'Assault Rifles',
    accent: 0xffc24a,
    philosophy: 'An exposed rotary magazine feeds visible rounds on an open track — it eats everything you give it.',
    blurb: 'You can watch it devour the drum. It never asks for less.',
    stats: { power: 34, rate: 0.08, mag: 100, reload: 3.2 },
    locked: true,
  },
  {
    id: 'apx07',
    name: 'APX-07 IRONCLAD',
    code: 'APX',
    tier: 'apex',
    category: 'primary',
    type: 'Assault Rifles',
    accent: 0xff3a48,
    philosophy: 'Riveted industrial armor slabs over every system — engineered to be shot AND to shoot.',
    blurb: 'A gun built like a blast door. It outlives its operator.',
    stats: { power: 96, rate: 0.35, mag: 24, reload: 2.5 },
    locked: true,
  },
  {
    id: 'apx08',
    name: 'APX-08 GYRE',
    code: 'APX',
    tier: 'apex',
    category: 'primary',
    type: 'Assault Rifles',
    accent: 0x49a6ff,
    philosophy: 'A spinning gyroscope and deploying stabilizer arms lock the aim — recoil simply does not exist.',
    blurb: 'Point it and it stays pointed. The rounds go exactly where you look.',
    stats: { power: 66, rate: 0.13, mag: 36, reload: 2.0 },
    locked: true,
  },
  {
    id: 'apx09',
    name: 'APX-09 VULCAN',
    code: 'APX',
    tier: 'apex',
    category: 'primary',
    type: 'Assault Rifles',
    accent: 0xff5a2a,
    philosophy: 'Pressurized reaction vessels vent through mechanical valves — controlled industrial detonation.',
    blurb: 'A furnace with a trigger. Each shot is a metered explosion.',
    stats: { power: 82, rate: 0.25, mag: 28, reload: 2.3 },
    locked: true,
  },
  {
    id: 'apx10',
    name: 'APX-10 TESLA',
    code: 'APX',
    tier: 'apex',
    category: 'primary',
    type: 'Assault Rifles',
    accent: 0x9ad8ff,
    philosophy: 'A stacked electromagnetic coil column accelerates the slug to a blinding rail-line — charge and release.',
    blurb: 'The apex charge rifle. Coils sequence, then the world tears open.',
    stats: { power: 150, rate: 0.7, mag: 12, reload: 2.8 },
    locked: true,
  },
  // ── PRIMARY · MACHINE GUNS ───────────────────────────────────────────────────
  {
    id: 'apxm1',
    name: 'APX-M1 LEVIATHAN',
    code: 'APX',
    tier: 'apex',
    category: 'primary',
    type: 'Machine Guns',
    accent: 0xffa833,
    philosophy: 'A twin-feed suppression platform: two exposed belts feed oscillating sprockets into a dual chamber under a massive ribbed cooling jacket.',
    blurb: 'The finest suppression weapon humanity has ever built. It does not stop.',
    stats: { power: 30, rate: 0.05, mag: 150, reload: 3.5 },
    locked: true,
  },
  {
    id: 'apxm2', name: 'APX-M2 MAELSTROM', code: 'APX', tier: 'apex', category: 'primary', type: 'Machine Guns', accent: 0xff4a3a,
    philosophy: 'A six-barrel rotary cluster spins to a suppression storm — walls of fire that never relent.',
    blurb: 'Spin it up and the air itself becomes hostile.',
    stats: { power: 26, rate: 0.04, mag: 200, reload: 4.0 }, locked: true,
  },
  {
    id: 'apxm3', name: 'APX-M3 IGNIS', code: 'APX', tier: 'apex', category: 'primary', type: 'Machine Guns', accent: 0xb15cff,
    philosophy: 'No belt, no brass — a pressurized plasma reservoir feeds superheated cells through a cycling injector.',
    blurb: 'It does not fire rounds. It exhales fire.',
    stats: { power: 38, rate: 0.07, mag: 120, reload: 2.8 }, locked: true,
  },
  {
    id: 'apxm4', name: 'APX-M4 BULWARK', code: 'APX', tier: 'apex', category: 'primary', type: 'Machine Guns', accent: 0xff7a2a,
    philosophy: 'A heavy assault cannon: a reciprocating breech and rotating lock throw oversized rounds like artillery.',
    blurb: 'Suppression by demolition. Cover is a suggestion.',
    stats: { power: 65, rate: 0.12, mag: 60, reload: 3.6 }, locked: true,
  },
  {
    id: 'apxm5', name: 'APX-M5 MAGNETAR', code: 'APX', tier: 'apex', category: 'primary', type: 'Machine Guns', accent: 0x49a6ff,
    philosophy: 'The barrel floats inside a cage of magnetic stabilizer rings — recoil is caught by the field, not your shoulder.',
    blurb: 'Perfectly still under full auto. Eerily precise.',
    stats: { power: 34, rate: 0.06, mag: 140, reload: 3.0 }, locked: true,
  },
  {
    id: 'apxm6', name: 'APX-M6 SERVITOR', code: 'APX', tier: 'apex', category: 'primary', type: 'Machine Guns', accent: 0x63ff84,
    philosophy: 'Exposed servo motors and an articulated loader arm cycle ammunition with tireless mechanical precision.',
    blurb: 'It reloads itself like a machine servicing a machine.',
    stats: { power: 30, rate: 0.055, mag: 160, reload: 3.2 }, locked: true,
  },
  {
    id: 'apxm7', name: 'APX-M7 KILN', code: 'APX', tier: 'apex', category: 'primary', type: 'Machine Guns', accent: 0x3ad8c0,
    philosophy: 'A colossal rotating cooling drum and deploying fins dump heat continuously — the barrel refuses to quit.',
    blurb: 'Overheating is a problem it engineered away.',
    stats: { power: 32, rate: 0.05, mag: 180, reload: 3.0 }, locked: true,
  },
  {
    id: 'apxm8', name: 'APX-M8 PILEDRIVER', code: 'APX', tier: 'apex', category: 'primary', type: 'Machine Guns', accent: 0xff5a2a,
    philosophy: 'Pneumatic accumulators pressurize between shots, driving a kinetic ram that hammers rounds downrange.',
    blurb: 'Each burst lands like an industrial press.',
    stats: { power: 48, rate: 0.09, mag: 100, reload: 3.4 }, locked: true,
  },
  {
    id: 'apxm9', name: 'APX-M9 DYNAMO', code: 'APX', tier: 'apex', category: 'primary', type: 'Machine Guns', accent: 0xeaf2ff,
    philosophy: 'A spinning reactor turbine powers an open belt feed — humanity’s engine of suppression, laid bare.',
    blurb: 'You can watch the reactor drive every round.',
    stats: { power: 36, rate: 0.06, mag: 150, reload: 3.0 }, locked: true,
  },
  {
    id: 'apxm10', name: 'APX-M10 OVERLORD', code: 'APX', tier: 'apex', category: 'primary', type: 'Machine Guns', accent: 0xffd27a,
    philosophy: 'Concentric power-regulator rings and a wide industrial frame command the battlefield through sheer sustained dominance.',
    blurb: 'The last word in suppression. Nothing advances.',
    stats: { power: 44, rate: 0.05, mag: 175, reload: 3.3 }, locked: true,
  },
];

/** Distinct weapon-type labels present in a category, in catalog order. */
export function typesIn(category: WeaponCategory): string[] {
  const out: string[] = [];
  for (const w of PREMIUM_WEAPONS) if (w.category === category && !out.includes(w.type)) out.push(w.type);
  return out;
}

/** The weapons in a category + type (in catalog order). */
export function weaponsIn(category: WeaponCategory, type: string): PremiumWeapon[] {
  return PREMIUM_WEAPONS.filter((w) => w.category === category && w.type === type);
}
