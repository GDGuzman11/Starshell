/**
 * Material factory for the Starshell arena (Phase 1 — "retro res + modern light").
 *
 * The arena geometry is the same low-poly boxes + nearest-filtered procedural
 * canvas textures as always. This factory only chooses HOW those textures are
 * lit so the neon panel seams BLOOM under the post-FX pipeline (see postfx.ts):
 *
 *  - DESKTOP tier → MeshStandardMaterial with an EMISSIVE channel that reuses the
 *    SAME procedural canvas texture as both `map` and `emissiveMap`. The bright
 *    neon seams in those textures then read as emissive (HDR-ish) pixels that the
 *    BloomEffect picks up, while the dark panel base stays dark. Modest
 *    `emissiveIntensity` keeps it from washing out.
 *  - MOBILE / LOW tier → the original MeshLambertMaterial (no emissive, no PBR
 *    cost). Bloom still runs (cheap on the 480×270 buffer) and the bright UI/
 *    sprite materials still glow; we just don't pay for emissive walls on phones.
 *
 * Nearest filtering is preserved on every texture so the retro pixel look stays.
 */
import * as THREE from 'three';

export type RenderTier = 'desktop' | 'mobile';

/** How strongly the wall/ground neon seams self-illuminate on desktop. Tunable. */
const WALL_EMISSIVE_INTENSITY = 0.85;
const GROUND_EMISSIVE_INTENSITY = 0.55;

/**
 * Wall / box material for a given nearest-filtered texture.
 * `emissiveMap` reuses the same texture instance so the neon seams glow.
 */
export function makeWallMaterial(map: THREE.Texture, tier: RenderTier): THREE.Material {
  if (tier === 'desktop') {
    return new THREE.MeshStandardMaterial({
      map,
      emissive: 0xffffff,
      emissiveMap: map,
      emissiveIntensity: WALL_EMISSIVE_INTENSITY,
      roughness: 0.85,
      metalness: 0.0,
    });
  }
  return new THREE.MeshLambertMaterial({ map });
}

/** Ground material. Same emissive trick at a lower intensity on desktop. */
export function makeGroundMaterial(map: THREE.Texture, tier: RenderTier): THREE.Material {
  if (tier === 'desktop') {
    return new THREE.MeshStandardMaterial({
      map,
      emissive: 0xffffff,
      emissiveMap: map,
      emissiveIntensity: GROUND_EMISSIVE_INTENSITY,
      roughness: 0.9,
      metalness: 0.0,
    });
  }
  return new THREE.MeshLambertMaterial({ map });
}
