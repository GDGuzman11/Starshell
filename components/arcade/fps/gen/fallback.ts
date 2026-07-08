/**
 * Deterministic DNA-fusion generator — the rule-based fallback for when the AI route
 * is unavailable (the standalone repo has no backend; offline; or no API key). It
 * implements the doc's fusion rules directly: PRIMARY DNA drives ~70% (silhouette,
 * palette, family, most stats), SECONDARY ~30% (accent nudge, stat lean, extra
 * vocabulary), producing ONE cohesive, DNA-flavoured `WeaponBlueprint` with zero
 * network calls. A `seed` varies the result so "Regenerate" gives fresh guns.
 *
 * Pure + client-safe (no browser globals) — lives on the sync path.
 */
import type { Family } from '../weapons';
import { rng } from '../rand';
import { DNA, type DesignDNA } from './dna';
import { GEN_DIVISIONS, type GenDivisionId } from './divisions';
import type { BlueprintSlot, TemplateId, WeaponBlueprint } from './blueprint';
import { parseWeaponBlueprint, templatesForFamily } from './blueprint';
import { featureHash } from './similarity';

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function familyForTemplate(t: TemplateId): Family {
  switch (t) {
    case 'bullpupMg':
    case 'rotaryHeavy':
      return 'mg';
    case 'energyEmitter':
      return 'laser';
    case 'longPrecision':
      return 'sniper';
    case 'launcherTube':
      return 'launcher';
    case 'pistol':
      return 'pistol';
    default:
      return 'rifle';
  }
}

interface StatBase {
  dmg: number;
  rate: number;
  mag: number;
  reserve: number;
  reload: number;
  auto: boolean;
  scoped: boolean;
  adsFov: number;
}
const FAMILY_BASE: Record<Family, StatBase> = {
  rifle: { dmg: 38, rate: 0.11, mag: 30, reserve: 180, reload: 1.6, auto: true, scoped: false, adsFov: 56 },
  mg: { dmg: 26, rate: 0.07, mag: 50, reserve: 300, reload: 2.2, auto: true, scoped: false, adsFov: 64 },
  laser: { dmg: 30, rate: 0.09, mag: 55, reserve: 250, reload: 1.9, auto: true, scoped: false, adsFov: 56 },
  sniper: { dmg: 220, rate: 0.9, mag: 6, reserve: 40, reload: 2.3, auto: false, scoped: true, adsFov: 26 },
  launcher: { dmg: 200, rate: 1.2, mag: 4, reserve: 16, reload: 2.6, auto: false, scoped: false, adsFov: 60 },
  pistol: { dmg: 40, rate: 0.2, mag: 14, reserve: 90, reload: 1.2, auto: false, scoped: false, adsFov: 60 },
};

/** Slot layout per silhouette — which attachments the frame expects + moving tags. */
const TEMPLATE_SLOTS: Record<TemplateId, { slot: BlueprintSlot['slot']; moving?: BlueprintSlot['moving'] }[]> = {
  compactRifle: [{ slot: 'barrel' }, { slot: 'receiver' }, { slot: 'magazine' }, { slot: 'optic' }, { slot: 'bolt', moving: 'bolt' }],
  longPrecision: [{ slot: 'barrel' }, { slot: 'receiver' }, { slot: 'scope', moving: 'glow' }, { slot: 'magazine' }, { slot: 'bolt', moving: 'bolt' }],
  bullpupMg: [{ slot: 'barrel' }, { slot: 'receiver' }, { slot: 'feed' }, { slot: 'cooling' }, { slot: 'optic' }],
  rotaryHeavy: [{ slot: 'warhead' }, { slot: 'cooling' }, { slot: 'reactor', moving: 'glow' }, { slot: 'magazine' }],
  energyEmitter: [{ slot: 'emitter', moving: 'glow' }, { slot: 'core', moving: 'glow' }, { slot: 'cooling' }, { slot: 'targeting' }, { slot: 'reactor' }],
  launcherTube: [{ slot: 'tube' }, { slot: 'warhead', moving: 'glow' }, { slot: 'core', moving: 'glow' }, { slot: 'targeting' }],
  pistol: [{ slot: 'barrel' }, { slot: 'slide', moving: 'bolt' }, { slot: 'magazine' }, { slot: 'sight' }],
};

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const pick = <T,>(arr: T[], r: number, fallback: T): T => (arr.length ? arr[Math.floor(r * arr.length) % arr.length] : fallback);

export interface FallbackOpts {
  family?: Family; // force a weapon type (undefined = DNA/division decides)
  division?: GenDivisionId; // tag + flavour toward this Combat Division
}

/** Fuse two DNA into one blueprint. `seed` varies the roll so regenerate differs.
 *  An optional `family`/`division` forces the weapon type + biases toward a division. */
export function generateFallbackBlueprint(primary: DesignDNA, secondary: DesignDNA, seed = 0, opts: FallbackOpts = {}): WeaponBlueprint {
  const P = DNA[primary];
  const S = DNA[secondary];
  const div = opts.division ? GEN_DIVISIONS[opts.division] : null;
  const rand = rng(hashStr(`${primary}>${secondary}>${opts.family ?? ''}>${opts.division ?? ''}`) ^ (seed >>> 0));

  // 70/30 blend helper for numeric leanings.
  const blend = (a: number, b: number) => a * 0.7 + b * 0.3;

  // Weapon type: explicit family wins; else a division's favoured type; else the DNA.
  let family: Family;
  let template: TemplateId;
  if (opts.family) {
    family = opts.family;
    template = pick(templatesForFamily(family), rand(), templatesForFamily(family)[0]);
  } else if (div) {
    family = pick(div.families, rand(), 'rifle');
    template = pick(templatesForFamily(family), rand(), templatesForFamily(family)[0]);
  } else {
    template = pick(P.silhouettes, rand(), 'compactRifle');
    family = familyForTemplate(template);
  }
  const base = FAMILY_BASE[family];

  // palette: primary bodies + secondary's lead body woven in; accent mostly primary,
  // a division's accent when building for one, occasionally the secondary's for contrast.
  const body = [...P.body];
  if (S.body[0] != null && !body.includes(S.body[0])) body.splice(1, 0, S.body[0]);
  const accent = div ? div.accent : rand() < 0.25 ? S.accent : P.accent;

  const gb = {
    girth: blend(P.geometry.girth, S.geometry.girth),
    vents: blend(P.geometry.vents, S.geometry.vents),
    emissive: blend(P.geometry.emissive, S.geometry.emissive),
    muzzle: Math.round(blend(P.geometry.muzzle, S.geometry.muzzle)),
  };
  const sb = {
    dmg: blend(P.stat.dmg, S.stat.dmg),
    rate: blend(P.stat.rate, S.stat.rate),
    mag: blend(P.stat.mag, S.stat.mag),
    reload: blend(P.stat.reload, S.stat.reload),
    handling: blend(P.stat.handling, S.stat.handling),
  };

  const slots: BlueprintSlot[] = TEMPLATE_SLOTS[template].map((sd, i) => {
    const jitter = rng(hashStr(`${primary}${secondary}${sd.slot}`) ^ (seed + i));
    return {
      slot: sd.slot,
      len: clamp(0.9 + (jitter() - 0.5) * 0.5 + (sd.slot === 'barrel' || sd.slot === 'tube' ? 0.2 : 0), 0.5, 2),
      girth: clamp(0.85 + gb.girth * 0.4 + (jitter() - 0.5) * 0.2, 0.6, 1.4),
      segs: Math.round(clamp(2 + gb.vents * 4 + jitter() * 2, 0, 8)),
      vents: Math.round(clamp(gb.vents * 4 + jitter() * 1.5, 0, 5)),
      muzzle: clamp(gb.muzzle, 0, 3),
      taper: clamp((jitter() - 0.5) * 0.4, -0.3, 0.3),
      emissive: clamp((sd.moving === 'glow' ? 0.5 : 0.15) + gb.emissive * 0.6, 0, 1),
      moving: sd.moving,
    };
  });

  // stats: base nudged by the blended stat bias (higher rate/reload bias = FASTER).
  const dmg = base.dmg * (1 + 0.5 * sb.dmg);
  const rate = base.rate * (1 - 0.3 * sb.rate);
  const mag = base.mag * (1 + 0.4 * sb.mag);
  const reload = base.reload * (1 - 0.3 * sb.reload);
  const adsFov = base.adsFov - sb.handling * 6;

  const leadWord = div ? pick(div.words, rand(), 'PROTO') : pick(P.words, rand(), 'PROTO');
  const name = `${leadWord} ${pick(S.words, rand(), 'MK')}`.toUpperCase();
  const audioFamily = pick(P.audio, rand(), 'ballistic');
  const vocab = [...(div ? div.words : []), ...P.words, ...S.words];

  const raw = {
    id: `gen-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${(seed >>> 0).toString(36)}`,
    name,
    family,
    ...(opts.division ? { division: opts.division } : {}),
    stats: {
      dmg,
      rate,
      mag,
      reserve: base.reserve,
      reload,
      auto: base.auto,
      scoped: base.scoped,
      hipFov: family === 'mg' ? 82 : 78,
      adsFov,
      color: accent,
      ...(family === 'launcher' ? { splash: 6 } : {}),
      ...(family === 'laser' && rand() < 0.4 ? { heat: true } : {}),
    },
    audio: {
      family: audioFamily,
      vol: 0.85,
      pitch: clamp(1.1 - sb.dmg * 0.3, 0.6, 1.9),
      jitter: clamp(0.05 + (family === 'mg' ? 0.08 : 0), 0, 0.25),
      len: clamp(0.8 + sb.dmg * 0.4, 0.4, 1.8),
      bass: clamp(0.5 + sb.dmg * 0.4, 0, 1),
      grit: clamp(0.2 + P.geometry.girth * 0.3, 0, 1),
    },
    model: { template, palette: { body, accent }, slots },
    componentTheme: {
      body,
      accent,
      nameVocab: vocab,
      geometryBias: { girth: gb.girth, vents: gb.vents, emissive: gb.emissive, muzzle: gb.muzzle },
      statBias: sb,
    },
    lore: `${div ? div.philosophy + ' ' : ''}${P.philosophy} ${S.philosophy}`.trim(),
    dna: { primary, secondary, featureHash: '' },
  };

  const bp = parseWeaponBlueprint(raw) as WeaponBlueprint; // never null (raw is an object)
  bp.dna.featureHash = featureHash(bp);
  return bp;
}
