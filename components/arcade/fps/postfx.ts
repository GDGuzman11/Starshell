/**
 * Imperative post-processing pipeline for Starshell (Phase 1 — "retro res +
 * modern light"). This is NOT react-three-fiber — the game is an imperative
 * Three.js loop (useFpsLoop), so we drive the `postprocessing` package directly,
 * exactly like components/world/LensEffect.ts imports from 'postprocessing'.
 *
 * The composer runs on the SMALL 480×270 render buffer (RW×RH), so bloom is
 * cheap AND chunky — which suits the '93 pixel look. We keep setPixelRatio(1),
 * nearest-filtered textures, and the [image-rendering:pixelated] CSS upscale;
 * the post-FX just adds glow + grain on top of the retro frame.
 *
 * Desktop tier: RenderPass → Bloom (LARGE-ish glow) + Noise (subtle grain).
 * Mobile tier:  RenderPass → Bloom only (smaller, cheaper), no grain.
 *
 * NOTE: this module is imported ONLY by the /arcade chunk (useFpsLoop). It must
 * never be pulled into the homepage `/` tree.
 */
import * as THREE from 'three';
import {
  EffectComposer,
  EffectPass,
  RenderPass,
  BloomEffect,
  NoiseEffect,
  BlendFunction,
  KernelSize,
} from 'postprocessing';
import type { RenderTier } from './materials';

// ── TUNING CONSTANTS ─────────────────────────────────────────────────────────
// Mirrors the sane bloom/mobile-tier feel from components/hero/tunnel/PostFX.tsx.
// Bloom is confined to bright pixels (neon seams, tracers, pads, sprites, muzzle
// flashes) by a luminance threshold so the dark arena base stays dark instead of
// fogging into a soft haze. All one-line tunable.
const BLOOM = {
  desktop: {
    intensity: 0.95,
    luminanceThreshold: 0.55,
    luminanceSmoothing: 0.22,
    kernelSize: KernelSize.LARGE,
    radius: 0.7,
  },
  mobile: {
    intensity: 0.7,
    luminanceThreshold: 0.62,
    luminanceSmoothing: 0.2,
    kernelSize: KernelSize.SMALL,
    radius: 0.55,
  },
} as const;

// Subtle film grain — desktop only (extra fragment cost not worth it on phones).
const NOISE_OPACITY = 0.06;

export interface ArcadeComposer {
  composer: EffectComposer;
  renderPass: RenderPass;
}

/**
 * Build the composer ONCE after the renderer is created. Sized to 480×270 (no
 * DPR scaling). When the world is rebuilt, point `renderPass.mainScene` at the
 * new scene (the camera object is stable, so it never needs swapping).
 */
export function makeComposer(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  tier: RenderTier,
  width: number,
  height: number,
): ArcadeComposer {
  // No multisampling — we want the crunchy low-res frame, and MSAA is wasted at
  // 480×270 + it costs GPU. No depth/stencil buffer needed for these passes
  // beyond the default depth.
  const composer = new EffectComposer(renderer, { multisampling: 0 });
  composer.setSize(width, height);

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const b = BLOOM[tier];
  const bloom = new BloomEffect({
    blendFunction: BlendFunction.SCREEN,
    intensity: b.intensity,
    luminanceThreshold: b.luminanceThreshold,
    luminanceSmoothing: b.luminanceSmoothing,
    mipmapBlur: true,
    radius: b.radius,
    kernelSize: b.kernelSize,
  });

  if (tier === 'desktop') {
    const noise = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY, premultiply: false });
    // BlendMode opacity controls grain strength.
    noise.blendMode.opacity.value = NOISE_OPACITY;
    composer.addPass(new EffectPass(camera, bloom, noise));
  } else {
    composer.addPass(new EffectPass(camera, bloom));
  }

  return { composer, renderPass };
}
