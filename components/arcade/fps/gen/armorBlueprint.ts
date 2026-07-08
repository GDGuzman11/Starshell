/**
 * ArmorSetBlueprint — the serialisable contract for a generated DNA armour SET: a
 * cohesive, division-issued outfit whose whole per-slot piece tree inherits one DNA
 * identity (palette, naming vocabulary, geometry + stat lean, all carried in a reused
 * `ComponentTheme`). Dependency-free (plain TS + a hand-rolled parse), so it stays on
 * the pure-client sync path like the weapon blueprint.
 */
import type { ComponentTheme } from './blueprint';

export interface ArmorSetBlueprint {
  id: string;
  name: string;
  division: string; // GenDivisionId — the Combat Division this set is issued to
  theme: ComponentTheme; // seeds every slot's piece tree with the set's DNA identity
  lore: string;
  dna: { primary: string; secondary: string; featureHash: string };
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const num = (v: unknown, f: number) => (typeof v === 'number' && Number.isFinite(v) ? v : f);
const str = (v: unknown, f: string) => (typeof v === 'string' && v.length ? v : f);

function color(v: unknown, fallback: number): number {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v) & 0xffffff;
  if (typeof v === 'string') {
    const n = parseInt(v.replace(/^#/, ''), 16);
    if (Number.isFinite(n)) return n & 0xffffff;
  }
  return fallback;
}
function colorArray(v: unknown, f: number[]): number[] {
  return Array.isArray(v) && v.length ? v.map((c) => color(c, f[0] ?? 0x3a4250)) : f.slice();
}

/** Coerce arbitrary (baked JSON) input into a valid ArmorSetBlueprint. Never throws. */
export function parseArmorSet(raw: unknown): ArmorSetBlueprint | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const rt = (r.theme ?? {}) as Record<string, unknown>;
  const rg = (rt.geometryBias ?? {}) as Record<string, unknown>;
  const rs = (rt.statBias ?? {}) as Record<string, unknown>;
  const rd = (r.dna ?? {}) as Record<string, unknown>;
  const body = colorArray(rt.body, [0x3a4250, 0x1c1f24]);
  const accent = color(rt.accent, 0x9fe8ff);
  const name = str(r.name, 'ISSUE SET').toUpperCase().slice(0, 24);
  return {
    id: str(r.id, `gen-armor-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`).slice(0, 48),
    name,
    division: str(r.division, 'outrider'),
    theme: {
      body,
      accent,
      nameVocab: Array.isArray(rt.nameVocab) ? (rt.nameVocab as unknown[]).filter((x): x is string => typeof x === 'string').slice(0, 16) : [],
      geometryBias: {
        girth: rg.girth != null ? clamp(num(rg.girth, 0), 0, 1) : undefined,
        vents: rg.vents != null ? clamp(num(rg.vents, 0), 0, 1) : undefined,
        emissive: rg.emissive != null ? clamp(num(rg.emissive, 0), 0, 1) : undefined,
      },
      statBias: {
        dmg: rs.dmg != null ? num(rs.dmg, 0) : undefined,
        mag: rs.mag != null ? num(rs.mag, 0) : undefined,
        reload: rs.reload != null ? num(rs.reload, 0) : undefined,
        handling: rs.handling != null ? num(rs.handling, 0) : undefined,
      },
    },
    lore: str(r.lore, '').slice(0, 400),
    dna: { primary: str(rd.primary, 'Military Standard'), secondary: str(rd.secondary, 'Precision Tactical'), featureHash: str(rd.featureHash, '') },
  };
}

/** Short signature for an armour set (division + DNA + palette) — uniqueness/dedup. */
export function armorSetHash(bp: ArmorSetBlueprint): string {
  const s = `${bp.division}|${bp.dna.primary}>${bp.dna.secondary}|${bp.theme.accent}|${bp.theme.body.join(',')}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}
