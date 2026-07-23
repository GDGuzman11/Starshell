/**
 * Imperative post-processing pipeline for Starshell ("retro res + modern light",
 * plus a readability pass). This is NOT react-three-fiber — the game is an imperative
 * Three.js loop (useFpsLoop), so we drive the `postprocessing` package directly.
 *
 * The composer runs on the SMALL retro render buffer, so everything is cheap AND
 * chunky — which suits the '93 pixel look. We keep setPixelRatio(1), nearest-filtered
 * textures, and the [image-rendering:pixelated] CSS upscale; the post-FX adds glow +
 * grain + a light grade + enemy outlines on top of the retro frame.
 *
 * Desktop pipeline: RenderPass → [Bloom + grade(brightness/contrast/saturation) + grain]
 *                   → [enemy Outline] → [SMAA]. Bloom/Outline/SMAA are convolution
 *                   effects, so each gets its OWN EffectPass (they can't be merged); the
 *                   cheap grade + grain ride along in the bloom pass.
 * Mobile pipeline:  RenderPass → [Bloom + mild contrast] (no outline/SMAA/grain).
 *
 * NOTE: imported ONLY by the /arcade chunk (useFpsLoop). Never pull into the homepage `/`.
 */
import * as THREE from 'three';
import {
  EffectComposer,
  EffectPass,
  RenderPass,
  BloomEffect,
  NoiseEffect,
  BrightnessContrastEffect,
  HueSaturationEffect,
  OutlineEffect,
  SMAAEffect,
  BlendFunction,
  KernelSize,
} from 'postprocessing';
import type { RenderTier } from './materials';

// ── TUNING CONSTANTS (all one-line tunable) ──────────────────────────────────
const BLOOM = {
  desktop: { intensity: 0.95, luminanceThreshold: 0.55, luminanceSmoothing: 0.22, kernelSize: KernelSize.LARGE, radius: 0.7 },
  mobile: { intensity: 0.7, luminanceThreshold: 0.62, luminanceSmoothing: 0.2, kernelSize: KernelSize.SMALL, radius: 0.55 },
} as const;

// Subtle "graded" look — a little more COLOUR so shapes separate from the dark arena.
// Procedural (no LUT asset — keeps the zero-asset canon). NOTE: contrast is kept at 0 —
// positive contrast pushes bright pixels brighter and, stacked on bloom, clipped the
// (large, bright) sky to solid white. Saturation adds vividness WITHOUT brightening, so
// it's sky-safe. To re-introduce punch later, do it highlight-safe via a tone-mapper.
const GRADE = { brightness: 0.0, contrast: 0.0, saturation: 0.12 };

// Bright thin edge on enemies so they pop off dark walls at range (desktop only).
const OUTLINE = { edgeStrength: 3.2, visibleEdgeColor: 0x9fe8ff, hiddenEdgeColor: 0x1a2634 };

const NOISE_OPACITY = 0.06; // film grain — desktop only

export interface ArcadeComposer {
  composer: EffectComposer;
  renderPass: RenderPass;
  outline?: OutlineEffect; // desktop only — selection is refreshed each frame by useFpsLoop
}

export function makeComposer(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  tier: RenderTier,
  width: number,
  height: number,
): ArcadeComposer {
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
    // Bloom pass carries the cheap grade + grain (non-convolution effects merge in).
    const grade = new BrightnessContrastEffect({ brightness: GRADE.brightness, contrast: GRADE.contrast });
    const sat = new HueSaturationEffect({ saturation: GRADE.saturation });
    const noise = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY, premultiply: false });
    noise.blendMode.opacity.value = NOISE_OPACITY;
    composer.addPass(new EffectPass(camera, bloom, grade, sat, noise));

    // Enemy outline — its OWN pass (convolution). Selection set per-frame by the loop;
    // xRay:false so occluded enemies DON'T outline through walls (no wallhack).
    const outline = new OutlineEffect(scene, camera, {
      blendFunction: BlendFunction.SCREEN,
      edgeStrength: OUTLINE.edgeStrength,
      visibleEdgeColor: OUTLINE.visibleEdgeColor,
      hiddenEdgeColor: OUTLINE.hiddenEdgeColor,
      kernelSize: KernelSize.VERY_SMALL,
      blur: false,
      xRay: false,
      resolutionScale: 1,
    });
    composer.addPass(new EffectPass(camera, outline));

    // Subtle edge-smoothing LAST (its own convolution pass). Kept mild so the pixel
    // look survives — first thing to drop if it reads too smooth.
    composer.addPass(new EffectPass(camera, new SMAAEffect()));

    return { composer, renderPass, outline };
  }

  // Mobile: bloom + a mild contrast lift only (cheap; no outline/SMAA/grain).
  const grade = new BrightnessContrastEffect({ contrast: 0.12 });
  composer.addPass(new EffectPass(camera, bloom, grade));
  return { composer, renderPass };
}
