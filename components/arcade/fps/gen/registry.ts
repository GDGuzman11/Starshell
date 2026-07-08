/**
 * Generated-weapon REGISTRY — the single runtime hub that makes a blueprint's id
 * resolve everywhere the game already keys off weapon ids: it pushes a `GunDef` into
 * `GUNS` + the right loadout pool, registers an audio profile, and serves the model
 * builder + accent. So once a blueprint is registered, loadout pickers, GunPreview,
 * the viewmodel, combat, upgrades, service records, familiarity and unlock pricing
 * all light up for free (they all look up by id).
 *
 * Two entry points feed it:
 *   • BAKED weapons — `generated.json` (checked-in), registered at module load.
 *   • SESSION weapons — the dev generator registers freshly-made blueprints at runtime.
 * Registration is idempotent (guarded by id), so React double-invokes / hot reloads
 * won't duplicate a gun.
 *
 * Imported ONLY by the /arcade chunk.
 */
import type * as THREE from 'three';
import type { RenderTier } from '../materials';
import { GUNS, PRIMARIES, SECONDARIES, SIDEARMS, type GunDef } from '../weapons';
import { sfx } from '../../engine/audio';
import { buildGeneratedGun } from './buildGenerated';
import { parseWeaponBlueprint, type WeaponBlueprint } from './blueprint';
import { setComponentTheme } from './themeStore';
import bakedRaw from './generated.json';

const REGISTRY = new Map<string, WeaponBlueprint>();

function blueprintToGunDef(bp: WeaponBlueprint): GunDef {
  const s = bp.stats;
  const def: GunDef = {
    id: bp.id,
    name: bp.name,
    family: bp.family,
    dmg: s.dmg,
    rate: s.rate,
    mag: s.mag,
    reserve: s.reserve,
    reload: s.reload,
    auto: s.auto,
    scoped: s.scoped,
    hipFov: s.hipFov,
    adsFov: s.adsFov,
    color: s.color,
  };
  if (s.splash != null) def.splash = s.splash;
  if (s.burst != null) def.burst = s.burst;
  if (s.heat) def.heat = true;
  if (s.charge != null) def.charge = s.charge;
  return def;
}

/** Which loadout pool a generated gun joins, by family (mirrors weapons.ts). */
function poolFor(family: GunDef['family']): GunDef[] | null {
  if (family === 'rifle' || family === 'mg' || family === 'laser') return PRIMARIES;
  if (family === 'sniper' || family === 'launcher') return SECONDARIES;
  if (family === 'pistol') return SIDEARMS;
  return null;
}

/** Register (or live-update) one blueprint across every id-keyed system. Idempotent
 *  by id: re-registering the same id updates its GunDef + audio in place (so the dev
 *  generator can tune a weapon and see it everywhere without duplicating it). */
export function registerBlueprint(bp: WeaponBlueprint): void {
  const existed = REGISTRY.has(bp.id);
  REGISTRY.set(bp.id, bp);
  setComponentTheme(bp.id, bp.componentTheme); // so its parts tree inherits the DNA
  const def = blueprintToGunDef(bp);
  if (existed) {
    const cur = GUNS.find((g) => g.id === bp.id);
    if (cur) Object.assign(cur, def); // live-update the existing GunDef in place
  } else {
    GUNS.push(def);
    poolFor(def.family)?.push(def);
  }
  sfx.registerWeaponAudio(bp.id, {
    type: bp.audio.family,
    vol: bp.audio.vol,
    pitch: bp.audio.pitch,
    jitter: bp.audio.jitter,
    len: bp.audio.len,
    bass: bp.audio.bass,
    grit: bp.audio.grit,
    ...(bp.audio.charge != null ? { charge: bp.audio.charge } : {}),
    ...(bp.audio.loop ? { loop: true } : {}),
  });
}

export function registerGeneratedWeapons(list: WeaponBlueprint[]): void {
  for (const bp of list) registerBlueprint(bp);
}

export function isGenerated(id: string): boolean {
  return REGISTRY.has(id);
}

/** The Combat Division a generated weapon is issued to (undefined = universal). */
export function weaponDivision(id: string): string | undefined {
  return REGISTRY.get(id)?.division;
}

/** Division gating (mirrors armour): a weapon TAGGED for a division only shows for that
 *  exact division; untagged weapons (the whole base arsenal + universal generated guns)
 *  are available to everyone. */
export function isWeaponForDivision(id: string, marineDivision: string | null | undefined): boolean {
  const d = REGISTRY.get(id)?.division;
  if (!d) return true; // untagged = universal standard-issue
  return d === (marineDivision ?? 'outrider');
}

export function getBlueprint(id: string): WeaponBlueprint | undefined {
  return REGISTRY.get(id);
}

export function generatedGun(id: string, tier: RenderTier): THREE.Group | null {
  const bp = REGISTRY.get(id);
  return bp ? buildGeneratedGun(bp, tier) : null;
}

export function generatedAccent(id: string): number | null {
  return REGISTRY.get(id)?.model.palette.accent ?? null;
}

/** All currently-registered generated blueprints (baked + session). */
export function generatedBlueprints(): WeaponBlueprint[] {
  return [...REGISTRY.values()];
}

// ── BAKED weapons: register the checked-in generated.json at module load ─────────
const baked: WeaponBlueprint[] = (Array.isArray(bakedRaw) ? bakedRaw : [])
  .map((r) => parseWeaponBlueprint(r))
  .filter((b): b is WeaponBlueprint => b !== null);
registerGeneratedWeapons(baked);
