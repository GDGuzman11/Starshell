/**
 * Deterministic DNA armour-set generator — fuses PRIMARY (~70%) + SECONDARY (~30%)
 * DNA for a chosen Combat Division into one cohesive `ArmorSetBlueprint`. Client-safe
 * (no network), so the armour generator always works (standalone / offline / no key).
 * `seed` varies the roll so "Regenerate" gives a fresh set.
 */
import { rng } from '../rand';
import { DNA, type DesignDNA } from './dna';
import { GEN_DIVISIONS, type GenDivisionId } from './divisions';
import { armorSetHash, type ArmorSetBlueprint } from './armorBlueprint';

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
const pick = <T,>(arr: T[], r: number, fb: T): T => (arr.length ? arr[Math.floor(r * arr.length) % arr.length] : fb);

export function generateArmorSet(primary: DesignDNA, secondary: DesignDNA, division: GenDivisionId, seed = 0): ArmorSetBlueprint {
  const P = DNA[primary];
  const S = DNA[secondary];
  const div = GEN_DIVISIONS[division];
  const rand = rng(hashStr(`${primary}>${secondary}>${division}`) ^ (seed >>> 0));
  const blend = (a: number, b: number) => a * 0.7 + b * 0.3;

  // Palette: primary bodies + secondary's lead woven in; accent = the division's colour
  // (armour is division-issued, so the set reads in its division's voice).
  const body = [...P.body];
  if (S.body[0] != null && !body.includes(S.body[0])) body.splice(1, 0, S.body[0]);
  const accent = div.accent;

  const name = `${pick(div.words, rand(), 'ISSUE')} ${pick(P.words, rand(), 'SET')}`.toUpperCase();
  const bp: ArmorSetBlueprint = {
    id: `gen-armor-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${(seed >>> 0).toString(36)}`,
    name,
    division,
    theme: {
      body,
      accent,
      nameVocab: [...div.words, ...P.words, ...S.words],
      geometryBias: {
        girth: blend(P.geometry.girth, S.geometry.girth),
        vents: blend(P.geometry.vents, S.geometry.vents),
        emissive: blend(P.geometry.emissive, S.geometry.emissive),
      },
      statBias: {
        dmg: blend(P.stat.dmg, S.stat.dmg), // → armour
        mag: blend(P.stat.mag, S.stat.mag), // → shield
        reload: blend(P.stat.reload, S.stat.reload), // → recovery
        handling: blend(P.stat.handling, S.stat.handling), // → mobility
      },
    },
    lore: `${div.philosophy} ${P.philosophy} ${S.philosophy}`.trim(),
    dna: { primary, secondary, featureHash: '' },
  };
  bp.dna.featureHash = armorSetHash(bp);
  return bp;
}
