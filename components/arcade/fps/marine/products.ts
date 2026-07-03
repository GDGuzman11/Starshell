/**
 * ARMOR PRODUCTS — the Armor Overhaul Pt2 registry. A "product" is a DISTINCT named
 * military item (its own silhouette + mechanical movement), not a seeded variant of a
 * division's language. Each `division:family` can register a set of products; the
 * generator (`parts.ts`) then assigns each generated piece ONE product template + a
 * product name, and the geometry dispatcher (`partModel.ts`) renders by template.
 *
 * When NO products are registered for a `division:family`, the piece falls back to the
 * existing per-division geometry language — so the rollout is additive and isolated.
 *
 * Imported ONLY by the /arcade chunk.
 */
import type * as THREE from 'three';
import type { RenderTier } from '../materials';
import type { ArmorModelSpec } from './parts';
import { GHOST_HELMETS } from './products/ghostHelmets';

export interface ArmorProduct {
  id: string; // stable template id (stored on the piece's model spec)
  name: string; // product family name, e.g. "Ghostwalker"
  noun: string; // product-type noun, e.g. "Recon Helm"
  build: (spec: ArmorModelSpec, rt: RenderTier) => THREE.Group; // bespoke geometry
}

// division:family → its product line. Grows as the overhaul rolls out.
const REGISTRY: Record<string, ArmorProduct[]> = {
  'ghost:helmet': GHOST_HELMETS,
};

export function productsFor(division: string | undefined, family: string): ArmorProduct[] | undefined {
  return REGISTRY[`${division ?? 'recruit'}:${family}`];
}

export function productById(division: string | undefined, family: string, id: string): ArmorProduct | undefined {
  return productsFor(division, family)?.find((p) => p.id === id);
}
