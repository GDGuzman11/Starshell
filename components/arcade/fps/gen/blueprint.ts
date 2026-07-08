/**
 * WeaponBlueprint — the serialisable contract the Design-DNA generator produces and
 * the parametric assembler consumes. It is the single source of truth for BOTH the
 * AI route (server, site-only) and the client assembler, so it is intentionally
 * DEPENDENCY-FREE: plain TypeScript types + a hand-rolled `parseWeaponBlueprint`
 * validator/clamp (NO zod), keeping this on the pure-client `components/arcade/**`
 * path that syncs to the standalone repo.
 *
 * A blueprint carries everything needed to mint a weapon with zero hand-coding:
 * data (GunDef stats), a procedural model recipe (template + palette + slot specs),
 * an audio profile (family + synth params), a component theme (seeds the parts
 * generator so its 300-part tree inherits the DNA), plus name/lore/DNA signature.
 */
import type { SlotKind } from '../arsenal/categories';
import type { Family } from '../weapons';

/** Silhouette archetypes the assembler knows how to build (see `templates.ts`). */
export const TEMPLATE_IDS = [
  'compactRifle',
  'longPrecision',
  'bullpupMg',
  'rotaryHeavy',
  'energyEmitter',
  'launcherTube',
  'pistol',
] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

export const WEAPON_FAMILIES: Family[] = ['rifle', 'mg', 'laser', 'sniper', 'pistol', 'launcher'];

/** Audio synthesiser families (mirrors `engine/audio.ts` `WType`). */
export const AUDIO_FAMILIES = ['ballistic', 'energy', 'heavy', 'beam', 'electric', 'gravity', 'launcher', 'barrel'] as const;
export type AudioFamily = (typeof AUDIO_FAMILIES)[number];

/** Animatable part tags the viewmodel + preview already know how to move. */
export const MOVING_PART_TAGS = ['spin', 'glow', 'coil', 'muzzle', 'bolt'] as const;
export type MovingPartTag = (typeof MOVING_PART_TAGS)[number];

/** One attachment on the generated model — a `PartModelSpec` minus the runtime-filled
 *  `accent`/`body`/`animated` (the assembler fills those from the palette). */
export interface BlueprintSlot {
  slot: SlotKind;
  len: number; // 0.5..2   along-axis length factor
  girth: number; // 0.6..1.4 cross-section factor
  segs: number; // 0..8    detail segments/plates
  vents: number; // 0..5    vent/fin cutouts
  muzzle: number; // 0..3    muzzle/emitter style
  taper: number; // -0.3..0.3 profile taper
  emissive: number; // 0..1  glow strength
  moving?: MovingPartTag; // tag so the animator can find it (spin/glow/coil/bolt)
}

export interface WeaponStats {
  dmg: number;
  rate: number;
  mag: number;
  reserve: number;
  reload: number;
  auto: boolean;
  scoped: boolean;
  hipFov: number;
  adsFov: number;
  color: number; // tracer colour
  splash?: number;
  burst?: number;
  heat?: boolean;
  charge?: number;
}

export interface WeaponAudio {
  family: AudioFamily;
  vol: number;
  pitch: number;
  jitter: number;
  len: number;
  bass: number;
  grit: number;
  charge?: number;
  loop?: boolean;
}

export interface ModelRecipe {
  template: TemplateId;
  palette: { body: number[]; accent: number };
  slots: BlueprintSlot[];
}

/** DNA-derived seed threaded into the parts generator so a weapon's whole component
 *  tree inherits its identity (palette, naming, geometry + which stats it favours). */
export interface ComponentTheme {
  body: number[];
  accent: number;
  nameVocab: string[];
  geometryBias: { girth?: number; vents?: number; emissive?: number; animated?: number; muzzle?: number };
  statBias: { dmg?: number; rate?: number; mag?: number; reload?: number; handling?: number };
}

export interface WeaponBlueprint {
  id: string;
  name: string;
  family: Family;
  division?: string; // Combat Division this weapon is built for (see gen/divisions)
  stats: WeaponStats;
  audio: WeaponAudio;
  model: ModelRecipe;
  componentTheme: ComponentTheme;
  lore: string;
  dna: { primary: string; secondary: string; featureHash: string };
}

/** Silhouette templates that suit each weapon family (first = the default). */
export function templatesForFamily(f: Family): TemplateId[] {
  switch (f) {
    case 'mg':
      return ['bullpupMg', 'rotaryHeavy'];
    case 'laser':
      return ['energyEmitter'];
    case 'sniper':
      return ['longPrecision'];
    case 'launcher':
      return ['launcherTube'];
    case 'pistol':
      return ['pistol'];
    default:
      return ['compactRifle'];
  }
}

/** Force a blueprint onto a chosen weapon family: fixes the template + the
 *  family-conditional flags (scoped/auto/splash/heat) so it is TAGGED and POOLED as
 *  that type. Mutates + returns the blueprint. */
export function normalizeForFamily(bp: WeaponBlueprint, family: Family): WeaponBlueprint {
  bp.family = family;
  const tps = templatesForFamily(family);
  if (!tps.includes(bp.model.template)) bp.model.template = tps[0];
  const s = bp.stats;
  if (family === 'sniper') {
    s.scoped = true;
    s.auto = false;
    if (s.adsFov > 40) s.adsFov = 26;
    delete s.splash;
    delete s.heat;
  } else if (family === 'launcher') {
    s.scoped = false;
    s.auto = false;
    if (s.splash == null) s.splash = 6;
    delete s.heat;
  } else {
    s.scoped = false;
    delete s.splash;
    if (family !== 'laser') delete s.heat;
    if (family === 'mg') s.auto = true;
  }
  return bp;
}

// ── validation + clamping (plain, no deps) ─────────────────────────────────────
const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
const num = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const str = (v: unknown, fallback: string): string => (typeof v === 'string' && v.length > 0 ? v : fallback);
const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);

function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

/** A colour can arrive as a number (0xRRGGBB) or a "#rrggbb"/"rrggbb" string. */
function color(v: unknown, fallback: number): number {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v) & 0xffffff;
  if (typeof v === 'string') {
    const n = parseInt(v.replace(/^#/, ''), 16);
    if (Number.isFinite(n)) return n & 0xffffff;
  }
  return fallback;
}

function colorArray(v: unknown, fallback: number[]): number[] {
  if (Array.isArray(v) && v.length) return v.map((c) => color(c, fallback[0] ?? 0x363b43));
  return fallback.slice();
}

const VALID_SLOTS: SlotKind[] = [
  'barrel', 'receiver', 'magazine', 'optic', 'rear', 'feed', 'cooling', 'stability', 'emitter', 'core',
  'targeting', 'reactor', 'scope', 'bolt', 'stock', 'tube', 'warhead', 'stabilizer', 'slide', 'frame', 'grip',
];

function slugId(name: string, raw: unknown): string {
  const fromRaw = typeof raw === 'string' ? raw.trim() : '';
  const base = (fromRaw || name || 'gen').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `gen-${base || 'weapon'}`.slice(0, 40);
}

/** Coerce arbitrary (AI/JSON) input into a valid, in-range WeaponBlueprint. Never
 *  throws — every field is defaulted/clamped, so a partial reply still yields a
 *  buildable weapon (the "repair" step). Returns null only for non-object input. */
export function parseWeaponBlueprint(raw: unknown): WeaponBlueprint | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const rs = (r.stats ?? {}) as Record<string, unknown>;
  const ra = (r.audio ?? {}) as Record<string, unknown>;
  const rm = (r.model ?? {}) as Record<string, unknown>;
  const rmp = (rm.palette ?? {}) as Record<string, unknown>;
  const rc = (r.componentTheme ?? {}) as Record<string, unknown>;
  const rcg = (rc.geometryBias ?? {}) as Record<string, unknown>;
  const rcs = (rc.statBias ?? {}) as Record<string, unknown>;
  const rd = (r.dna ?? {}) as Record<string, unknown>;

  const name = str(r.name, 'PROTOTYPE');
  const family = oneOf<Family>(r.family, WEAPON_FAMILIES as readonly Family[], 'rifle');
  const isLauncher = family === 'launcher';
  const isSniper = family === 'sniper';

  const body = colorArray(rmp.body, [0x363b43, 0x4b505a]);
  const accent = color(rmp.accent, 0x49a6ff);

  const rawSlots = Array.isArray(rm.slots) ? (rm.slots as Record<string, unknown>[]) : [];
  const slots: BlueprintSlot[] = rawSlots.slice(0, 8).map((s) => ({
    slot: oneOf<SlotKind>(s.slot, VALID_SLOTS, 'barrel'),
    len: clamp(num(s.len, 1), 0.5, 2),
    girth: clamp(num(s.girth, 1), 0.6, 1.4),
    segs: Math.round(clamp(num(s.segs, 2), 0, 8)),
    vents: Math.round(clamp(num(s.vents, 1), 0, 5)),
    muzzle: Math.round(clamp(num(s.muzzle, 0), 0, 3)),
    taper: clamp(num(s.taper, 0), -0.3, 0.3),
    emissive: clamp(num(s.emissive, 0.2), 0, 1),
    moving: typeof s.moving === 'string' ? oneOf(s.moving, MOVING_PART_TAGS, 'glow') : undefined,
  }));

  const bp: WeaponBlueprint = {
    id: slugId(name, r.id),
    name: name.toUpperCase().slice(0, 22),
    family,
    ...(typeof r.division === 'string' && r.division ? { division: r.division } : {}),
    stats: {
      dmg: Math.round(clamp(num(rs.dmg, 40), 8, 500)),
      rate: +clamp(num(rs.rate, 0.14), 0.05, 2.6).toFixed(3),
      mag: Math.round(clamp(num(rs.mag, 24), 2, 75)),
      reserve: Math.round(clamp(num(rs.reserve, 168), 0, 400)),
      reload: +clamp(num(rs.reload, 1.7), 1, 3.6).toFixed(2),
      auto: bool(rs.auto, family === 'rifle' || family === 'mg' || family === 'laser'),
      scoped: bool(rs.scoped, isSniper),
      hipFov: Math.round(clamp(num(rs.hipFov, 78), 74, 84)),
      adsFov: Math.round(clamp(num(rs.adsFov, isSniper ? 26 : 58), 20, 70)),
      color: color(rs.color, accent),
    },
    audio: {
      family: oneOf<AudioFamily>(ra.family, AUDIO_FAMILIES, family === 'laser' ? 'energy' : family === 'launcher' ? 'launcher' : 'ballistic'),
      vol: +clamp(num(ra.vol, 0.85), 0.4, 1.1).toFixed(2),
      pitch: +clamp(num(ra.pitch, 1), 0.6, 1.9).toFixed(2),
      jitter: +clamp(num(ra.jitter, 0.06), 0, 0.25).toFixed(2),
      len: +clamp(num(ra.len, 1), 0.4, 1.8).toFixed(2),
      bass: +clamp(num(ra.bass, 0.6), 0, 1).toFixed(2),
      grit: +clamp(num(ra.grit, 0.2), 0, 1).toFixed(2),
    },
    model: {
      template: oneOf<TemplateId>(rm.template, TEMPLATE_IDS, defaultTemplate(family)),
      palette: { body, accent },
      slots,
    },
    componentTheme: {
      body: colorArray(rc.body, body),
      accent: color(rc.accent, accent),
      nameVocab: Array.isArray(rc.nameVocab) ? (rc.nameVocab as unknown[]).filter((x): x is string => typeof x === 'string').slice(0, 16) : [],
      geometryBias: {
        girth: rcg.girth != null ? clamp(num(rcg.girth, 1), 0.6, 1.4) : undefined,
        vents: rcg.vents != null ? clamp(num(rcg.vents, 1), 0, 5) : undefined,
        emissive: rcg.emissive != null ? clamp(num(rcg.emissive, 0.3), 0, 1) : undefined,
        animated: rcg.animated != null ? clamp(num(rcg.animated, 0), 0, 1) : undefined,
        muzzle: rcg.muzzle != null ? clamp(num(rcg.muzzle, 0), 0, 3) : undefined,
      },
      statBias: {
        dmg: rcs.dmg != null ? num(rcs.dmg, 0) : undefined,
        rate: rcs.rate != null ? num(rcs.rate, 0) : undefined,
        mag: rcs.mag != null ? num(rcs.mag, 0) : undefined,
        reload: rcs.reload != null ? num(rcs.reload, 0) : undefined,
        handling: rcs.handling != null ? num(rcs.handling, 0) : undefined,
      },
    },
    lore: str(r.lore, '').slice(0, 400),
    dna: { primary: str(rd.primary, 'Military Standard'), secondary: str(rd.secondary, 'Precision Tactical'), featureHash: str(rd.featureHash, '') },
  };

  // family-conditional extras
  if (isLauncher) bp.stats.splash = clamp(num(rs.splash, 6), 2, 10);
  if (typeof rs.burst === 'number') bp.stats.burst = Math.round(clamp(rs.burst, 2, 5));
  if (family === 'laser' && bool(rs.heat, false)) bp.stats.heat = true;
  if (typeof rs.charge === 'number') bp.stats.charge = clamp(rs.charge, 0, 1.2);
  if (typeof ra.charge === 'number') bp.audio.charge = clamp(ra.charge, 0, 0.3);
  if (bool(ra.loop, false)) bp.audio.loop = true;

  return bp;
}

function defaultTemplate(family: Family): TemplateId {
  switch (family) {
    case 'mg':
      return 'bullpupMg';
    case 'laser':
      return 'energyEmitter';
    case 'sniper':
      return 'longPrecision';
    case 'launcher':
      return 'launcherTube';
    case 'pistol':
      return 'pistol';
    default:
      return 'compactRifle';
  }
}
