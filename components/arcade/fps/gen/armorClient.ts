/**
 * Client bridge for the DNA armour-set generator. Tries the dev-only AI route first;
 * if it's absent/unavailable (production, standalone repo with no backend, offline, or
 * no API key) it degrades gracefully to the deterministic fallback — so the armour
 * generator always produces a coherent set. The requested division is always enforced.
 */
import type { DesignDNA } from './dna';
import type { GenDivisionId } from './divisions';
import { generateArmorSet } from './armorFallback';
import { armorSetHash, parseArmorSet, type ArmorSetBlueprint } from './armorBlueprint';

export interface ArmorGenArgs {
  primary: DesignDNA;
  secondary: DesignDNA;
  division: GenDivisionId;
  existing?: string[]; // feature hashes / names to avoid
  seed?: number;
}

export interface ArmorGenResult {
  blueprint: ArmorSetBlueprint;
  source: 'ai' | 'fallback';
  note?: string;
}

export async function generateArmorBlueprint(args: ArmorGenArgs): Promise<ArmorGenResult> {
  const { primary, secondary, division, existing = [], seed = Date.now() } = args;
  try {
    const res = await fetch('/api/dev/armor-gen', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ primary, secondary, division, existing }),
    });
    if (res.ok) {
      const data = (await res.json()) as { ok?: boolean; blueprint?: unknown };
      const bp = data.ok ? parseArmorSet(data.blueprint) : null;
      if (bp) {
        bp.division = division; // enforce the requested division
        bp.dna.featureHash = armorSetHash(bp);
        return { blueprint: bp, source: 'ai' };
      }
    }
  } catch {
    // network/route missing — fall through to the deterministic generator
  }
  return { blueprint: generateArmorSet(primary, secondary, division, seed), source: 'fallback', note: 'Deterministic fallback (AI route unavailable).' };
}
