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
