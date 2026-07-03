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
};

export function productsForSlot(slotId: string): ArmorProduct[] | undefined {
  return PRODUCTS[slotId];
}

export function productForPiece(slotId: string | undefined, id: string): ArmorProduct | undefined {
  return slotId ? PRODUCTS[slotId]?.find((p) => p.id === id) : undefined;
}
