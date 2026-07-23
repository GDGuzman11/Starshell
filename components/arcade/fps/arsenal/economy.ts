/**
 * Weapon ENGINEERING economy — AstroDiamond pricing + Legendary gating. Prices are
 * DERIVED (never hardcoded per-part): a tier base + a coefficient on the part's stat
 * magnitude, so a stronger part costs more and the three tiers separate cleanly —
 * Military affordable, Prototype expensive, Legendary very expensive + gated. Legendary
 * parts additionally require progression that ALREADY EXISTS (component familiarity +
 * bosses defeated + AstroDiamonds); Rank/Certifications/Blueprints are future hooks.
 *
 * Imported ONLY by the /arcade chunk. (No import from parts.ts — avoids a cycle.)
 */
type Tier = 'military' | 'prototype' | 'legendary';

/** A Legendary part's non-currency unlock requirements (all currently satisfiable). */
export interface PartGate {
  familiarity: number; // minimum weapon-familiarity stage INDEX (0..6)
  bosses: number; // bosses defeated (lifetime)
  astro: number; // AstroDiamond cost (same as price)
}

// Legendary is pushed high on purpose: the strongest components should cost as much as a
// gun (gun unlocks are 1200–6000 AD), so a top-tier legendary part is a real investment.
const TIER_BASE: Record<Tier, number> = { military: 45, prototype: 240, legendary: 1100 };
const TIER_K: Record<Tier, number> = { military: 900, prototype: 2600, legendary: 8000 };

/** AstroDiamond price for a part of `tier` whose combined stat magnitude is `mag`. */
export function priceFor(tier: Tier, mag: number): number {
  return Math.round(TIER_BASE[tier] + Math.max(0, mag) * TIER_K[tier]);
}

/** Legendary unlock gate, scaled to the part's price. Veteran familiarity + a few
 *  bosses + the AstroDiamond cost — all reachable through normal play. */
export function legendaryGate(price: number): PartGate {
  return { familiarity: 3, bosses: 2 + Math.round(price / 800), astro: price };
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** AstroDiamond cost to permanently UNLOCK a locked gun — derived from its power, and
 *  deliberately HIGHER than component prices (guns are the big, grindy investment). */
export function unlockWeaponPrice(gun: { dmg: number; family: string; splash?: number }): number {
  const mul = gun.family === 'pistol' ? 0.7 : gun.family === 'sniper' ? 1.3 : gun.family === 'launcher' ? 1.4 : 1;
  return clamp(Math.round((800 + gun.dmg * 6 + (gun.splash ?? 0) * 120) * mul), 1200, 6000);
}

// ── OUTLANDER STORE pricing — free-tier guns cost persistent GOLD, premium guns cost
// AstroDiamonds. Priced by category (base) + power (dmg/splash), so within a category
// stronger guns cost more and the categories separate. "Fair but challenging" gold.
export type StoreCurrency = 'gold' | 'astro';
export interface StorePrice {
  currency: StoreCurrency;
  amount: number;
}
const GOLD_BASE: Record<string, number> = { handgun: 550, assault: 1200, alienAssault: 1500, mg: 1450, sniper: 2100, rpg: 2500 };
const ASTRO_BASE: Record<string, number> = { handgun: 900, assault: 1700, alienAssault: 2100, mg: 1900, sniper: 2700, rpg: 3100 };

/** Store price + currency for a gun, by its tier + category + power. */
export function weaponStorePrice(gun: { tier: 'free' | 'premium'; category: string; dmg: number; splash?: number }): StorePrice {
  const power = gun.dmg * 4 + (gun.splash ?? 0) * 100;
  if (gun.tier === 'premium') {
    return { currency: 'astro', amount: clamp(Math.round((ASTRO_BASE[gun.category] ?? 1700) + power * 0.45), 900, 6000) };
  }
  return { currency: 'gold', amount: clamp(Math.round((GOLD_BASE[gun.category] ?? 1200) + power * 1.4), 500, 7000) };
}
