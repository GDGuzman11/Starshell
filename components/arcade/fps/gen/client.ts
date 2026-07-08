/**
 * Client bridge for the DNA weapon generator. Tries the dev-only AI route first; if
 * it's absent/unavailable (production, standalone repo with no backend, offline, or no
 * API key) it degrades gracefully to the deterministic fallback generator — so the dev
 * tool always produces a coherent weapon. Returns which source produced it.
 *
 * After generation it ENFORCES the requested weapon type (family) and DIVISION tag, so
 * the weapon is always pooled/tagged correctly regardless of what the AI returned.
 */
import type { Family } from '../weapons';
import type { DesignDNA } from './dna';
import type { GenDivisionId } from './divisions';
import { normalizeForFamily, parseWeaponBlueprint, type WeaponBlueprint } from './blueprint';
import { generateFallbackBlueprint } from './fallback';

export interface GenerateArgs {
  primary: DesignDNA;
  secondary: DesignDNA;
  family?: Family; // undefined = let the DNA/division decide
  division?: GenDivisionId; // which Combat Division this weapon is built for
  existing?: string[]; // feature hashes / names to avoid
  seed?: number; // varies the fallback roll (Regenerate)
}

export interface GenerateResult {
  blueprint: WeaponBlueprint;
  source: 'ai' | 'fallback';
  note?: string;
}

/** Apply the caller's weapon-type + division choices to a finished blueprint. */
function finalize(bp: WeaponBlueprint, args: GenerateArgs): WeaponBlueprint {
  if (args.family) normalizeForFamily(bp, args.family);
  if (args.division) bp.division = args.division;
  return bp;
}

/** Generate a weapon blueprint, preferring the AI route, falling back deterministically. */
export async function generateWeapon(args: GenerateArgs): Promise<GenerateResult> {
  const { primary, secondary, family, division, existing = [], seed = Date.now() } = args;
  try {
    const res = await fetch('/api/dev/weapon-gen', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ primary, secondary, family, division, existing }),
    });
    if (res.ok) {
      const data = (await res.json()) as { ok?: boolean; blueprint?: unknown };
      const bp = data.ok ? parseWeaponBlueprint(data.blueprint) : null;
      if (bp) return { blueprint: finalize(bp, args), source: 'ai' };
    }
  } catch {
    // network/route missing — fall through to the deterministic generator
  }
  const bp = generateFallbackBlueprint(primary, secondary, seed, { family, division });
  return { blueprint: finalize(bp, args), source: 'fallback', note: 'Deterministic fallback (AI route unavailable).' };
}
