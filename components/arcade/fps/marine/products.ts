/**
 * ARMOR PRODUCTS — the Armor Overhaul Pt2 registry. A "product" is a DISTINCT named
 * military item (its own silhouette + mechanical movement), not a seeded variant of a
 * division's language. The registry is keyed by SLOT id (so slots that share a geometry
 * family — e.g. Ghost's Scanner + Comm both `comms` — can still be different product
 * lines). When a slot has a registered line, the generator (`parts.ts`) assigns each
 * generated piece ONE product template + a product name, and the dispatcher
 * (`partModel.ts`) renders by template.
 *
 * When NO products are registered for a slot, the piece falls back to the existing
 * per-division geometry language — so the rollout is additive and isolated.
 *
 * Imported ONLY by the /arcade chunk.
 */
import type * as THREE from 'three';
import type { RenderTier } from '../materials';
import type { ArmorModelSpec } from './parts';
import { GHOST_HELMETS } from './products/ghostHelmets';
import { GHOST_CHESTS } from './products/ghostChests';
import { GHOST_SENSORPACK } from './products/ghostBackpacks';
import { GHOST_BOOTS } from './products/ghostBoots';
import { GHOST_DRONE, GHOST_CORE } from './products/ghostCores';
import { GHOST_SCANNER, GHOST_COMM } from './products/ghostComms';
import { GHOST_HARNESS } from './products/ghostPlates';
import { OUTRIDER_HELMETS, OUTRIDER_VISORS, OUTRIDER_COMMS } from './products/outriderHead';
import { OUTRIDER_CHESTS, OUTRIDER_PLATES, OUTRIDER_PAULDRONS, OUTRIDER_BACKPACKS, OUTRIDER_CORES } from './products/outriderTorso';
import { OUTRIDER_LIMBS, OUTRIDER_GLOVES, OUTRIDER_CAPS, OUTRIDER_BOOTS } from './products/outriderLimbs';
import { VANGUARD_HELMETS } from './products/vanguardHead';
import { VANGUARD_CHESTS, VANGUARD_PAULDRONS, VANGUARD_HARNESS } from './products/vanguardTorso';
import { VANGUARD_AMMO, VANGUARD_BACKPACK, VANGUARD_BREACH, VANGUARD_CORE } from './products/vanguardSystems';
import { VANGUARD_GLOVES, VANGUARD_BOOTS } from './products/vanguardLimbs';
import { WARDEN_HELMETS } from './products/wardenHead';
import { WARDEN_CHESTS, WARDEN_PAULDRONS, WARDEN_BARRIER } from './products/wardenTorso';
import { WARDEN_EMITTER, WARDEN_CORE, WARDEN_BACKPACK, WARDEN_REACTOR } from './products/wardenSystems';
import { WARDEN_BOOTS, WARDEN_BRACES } from './products/wardenLimbs';

export interface ArmorProduct {
  id: string; // stable template id (stored on the piece's model spec)
  name: string; // product family name, e.g. "Ghostwalker"
  noun: string; // product-type noun, e.g. "Recon Helm"
  build: (spec: ArmorModelSpec, rt: RenderTier) => THREE.Group; // bespoke geometry
}

// slot id → its product line. Grows as the overhaul rolls out, division by division.
const PRODUCTS: Record<string, ArmorProduct[]> = {
  // ── GHOST ──────────────────────────────────────────────────────────────────
  ghost_helmet: GHOST_HELMETS,
  ghost_chest: GHOST_CHESTS,
  ghost_sensorpack: GHOST_SENSORPACK,
  ghost_boots: GHOST_BOOTS,
  ghost_drone: GHOST_DRONE,
  ghost_core: GHOST_CORE,
  ghost_scanner: GHOST_SCANNER,
  ghost_comm: GHOST_COMM,
  ghost_harness: GHOST_HARNESS,
  // ── OUTRIDER (Standard-Issue; recruit slot ids) ──────────────────────────────
  helmet: OUTRIDER_HELMETS,
  visor: OUTRIDER_VISORS,
  comms: OUTRIDER_COMMS,
  chest: OUTRIDER_CHESTS,
  neck: OUTRIDER_PLATES,
  back: OUTRIDER_PLATES,
  belt: OUTRIDER_PLATES,
  hip: OUTRIDER_PLATES,
  shoulders: OUTRIDER_PAULDRONS,
  backpack: OUTRIDER_BACKPACKS,
  core: OUTRIDER_CORES,
  upperArms: OUTRIDER_LIMBS,
  forearms: OUTRIDER_LIMBS,
  thighs: OUTRIDER_LIMBS,
  shins: OUTRIDER_LIMBS,
  gloves: OUTRIDER_GLOVES,
  knees: OUTRIDER_CAPS,
  boots: OUTRIDER_BOOTS,
  // ── VANGUARD (shock trooper) ─────────────────────────────────────────────────
  vanguard_helmet: VANGUARD_HELMETS,
  vanguard_chest: VANGUARD_CHESTS,
  vanguard_shoulders: VANGUARD_PAULDRONS,
  vanguard_harness: VANGUARD_HARNESS,
  vanguard_ammo: VANGUARD_AMMO,
  vanguard_backpack: VANGUARD_BACKPACK,
  vanguard_breach: VANGUARD_BREACH,
  vanguard_core: VANGUARD_CORE,
  vanguard_gloves: VANGUARD_GLOVES,
  vanguard_boots: VANGUARD_BOOTS,
  // ── WARDEN (walking fortress) ────────────────────────────────────────────────
  warden_helmet: WARDEN_HELMETS,
  warden_chest: WARDEN_CHESTS,
  warden_shoulders: WARDEN_PAULDRONS,
  warden_barrier: WARDEN_BARRIER,
  warden_emitter: WARDEN_EMITTER,
  warden_core: WARDEN_CORE,
  warden_backpack: WARDEN_BACKPACK,
  warden_reactor: WARDEN_REACTOR,
  warden_boots: WARDEN_BOOTS,
  warden_braces: WARDEN_BRACES,
};

export function productsForSlot(slotId: string): ArmorProduct[] | undefined {
  return PRODUCTS[slotId];
}

export function productForPiece(slotId: string | undefined, id: string): ArmorProduct | undefined {
  return slotId ? PRODUCTS[slotId]?.find((p) => p.id === id) : undefined;
}
