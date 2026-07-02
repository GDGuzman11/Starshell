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

const TIER_BASE: Record<Tier, number> = { military: 45, prototype: 240, legendary: 950 };
const TIER_K: Record<Tier, number> = { military: 900, prototype: 2600, legendary: 5200 };

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

/** AstroDiamond cost to permanently UNLOCK a locked weapon — derived from its power
 *  (per-shot damage + splash), weighted by family. Not hardcoded per weapon. */
export function unlockWeaponPrice(gun: { dmg: number; family: string; splash?: number }): number {
  const mul = gun.family === 'pistol' ? 0.7 : gun.family === 'sniper' ? 1.2 : gun.family === 'launcher' ? 1.3 : 1;
  return clamp(Math.round((gun.dmg * 4 + (gun.splash ?? 0) * 60) * mul), 150, 2000);
}

/** AstroDiamond cost to unlock a locked throwable — from its blast + a utility base. */
export function unlockThrowPrice(t: { blast: { dmg: number } }): number {
  return clamp(Math.round(t.blast.dmg * 1.5 + 200), 200, 800);
}
