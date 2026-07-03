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

/** A showcased premium weapon (catalog entry). SHOWCASE-ONLY for now — the model is
 *  rendered + inspectable in the Premium store, but acquisition is `locked` (real
 *  monetization + in-game realization are a later step). `stats` are display-only
 *  (not wired to gameplay). The `id` must be registered in `fps/models/index.ts`. */
export interface PremiumWeapon {
  id: string; // model id (GUN_BUILDERS key)
  name: string;
  code: string; // tier designation prefix
  tier: string; // PremiumTier id
  accent: number;
  philosophy: string; // its unique engineering identity (one line)
  blurb: string;
  stats: { power: number; rate: number; mag: number; reload: number }; // display only
  locked: boolean;
}

/** The premium weapon catalog. The first benchmark only for now; grows to ten. */
export const PREMIUM_WEAPONS: PremiumWeapon[] = [
  {
    id: 'apx01',
    name: 'APX-01 REVENANT',
    code: 'APX',
    tier: 'apex',
    accent: 0x7fdfff,
    philosophy: 'Exposed fusion reactor feeding twin magnetic rails, wrapped in counter-rotating plasma-containment rings.',
    blurb: 'The absolute pinnacle of human military engineering — engineered without compromise.',
    stats: { power: 95, rate: 0.14, mag: 40, reload: 2.1 },
    locked: true,
  },
];
