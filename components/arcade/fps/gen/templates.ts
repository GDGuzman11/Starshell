/**
 * Silhouette templates for the DNA weapon generator. Each archetype lays down a
 * recognisable base FRAME (receiver / grip / stock built from the shared primitive
 * toolkit) plus per-slot ANCHORS telling the assembler where to mount each generated
 * attachment. This is what makes weapons *generatable* instead of hand-coded: the
 * frame guarantees a gun-like silhouette, the anchors give parts sensible positions,
 * and the blueprint's slot specs drive the actual geometry via `buildPartMesh`.
 *
 * Convention (matches the model toolkit): muzzle toward −Z, up +Y, right +X.
 */
import * as THREE from 'three';
import type { RenderTier } from '../materials';
import type { SlotKind } from '../arsenal/categories';
import { accent, box, cylZ, grip, metal, model } from '../models/parts';
import type { TemplateId } from './blueprint';

export interface Anchor {
  pos: [number, number, number];
  rot?: [number, number, number];
}

export interface TemplateCtx {
  tier: RenderTier;
  body: THREE.Material; // primary body metal
  dark: THREE.Material; // secondary/dark metal
  glow: THREE.Material; // accent emissive
}

export interface TemplateDef {
  muzzleZ: number; // where the muzzle marker sits (front)
  frame(ctx: TemplateCtx): THREE.Object3D[];
  anchors: Partial<Record<SlotKind, Anchor>>;
}

/** Small named muzzle marker (the viewmodel positions its flash here). */
export function muzzleAt(z: number, y = 0): THREE.Object3D {
  const o = new THREE.Object3D();
  o.name = 'muzzle';
  o.position.set(0, y, z);
  return o;
}

const compactRifle: TemplateDef = {
  muzzleZ: -0.46,
  frame: ({ body, dark }) => [
    box(0.1, 0.11, 0.34, body, 0, 0, 0.02), // receiver
    grip(0.06, 0.14, 0.07, dark, 0, -0.13, 0.16), // pistol grip
    box(0.07, 0.08, 0.14, body, 0, -0.01, 0.28), // short stock
  ],
  anchors: {
    barrel: { pos: [0, 0.01, -0.3] },
    receiver: { pos: [0, 0.02, 0.04] },
    magazine: { pos: [0, -0.14, 0.08] },
    optic: { pos: [0, 0.09, 0.02] },
    rear: { pos: [0, -0.01, 0.34] },
    bolt: { pos: [0.07, 0.03, 0.1] },
    cooling: { pos: [0.07, 0.03, -0.12] },
  },
};

const longPrecision: TemplateDef = {
  muzzleZ: -0.64,
  frame: ({ body, dark }) => [
    box(0.09, 0.1, 0.4, body, 0, 0, 0.06),
    grip(0.06, 0.14, 0.07, dark, 0, -0.13, 0.2),
    box(0.08, 0.11, 0.2, body, 0, -0.01, 0.36), // long stock
    box(0.02, 0.03, 0.5, dark, 0, 0.07, -0.2), // top rail
  ],
  anchors: {
    barrel: { pos: [0, 0.01, -0.44] },
    receiver: { pos: [0, 0.0, 0.08] },
    scope: { pos: [0, 0.13, 0.04] },
    optic: { pos: [0, 0.13, 0.04] },
    magazine: { pos: [0, -0.12, 0.1] },
    bolt: { pos: [0.08, 0.02, 0.16] },
    stock: { pos: [0, -0.01, 0.4] },
  },
};

const bullpupMg: TemplateDef = {
  muzzleZ: -0.5,
  frame: ({ body, dark }) => [
    box(0.14, 0.14, 0.42, body, 0, 0, 0.06), // bulky bullpup body
    grip(0.07, 0.15, 0.08, dark, 0, -0.14, -0.02), // grip forward of the mag
    box(0.09, 0.1, 0.14, body, 0, 0.0, 0.32),
  ],
  anchors: {
    barrel: { pos: [0, 0.02, -0.34] },
    receiver: { pos: [0, 0.02, 0.06] },
    feed: { pos: [0, -0.13, 0.14] },
    magazine: { pos: [0, -0.13, 0.14] },
    cooling: { pos: [0.1, 0.06, -0.06] },
    optic: { pos: [0, 0.11, 0.06] },
    stability: { pos: [0, -0.02, 0.34] },
  },
};

const rotaryHeavy: TemplateDef = {
  muzzleZ: -0.4,
  frame: ({ body, dark, glow }) => {
    // a rotating barrel cluster so the animator's 'spin' tag has something to turn
    const spin = new THREE.Group();
    spin.name = 'spin';
    spin.position.set(0, 0.01, 0);
    spin.add(cylZ(0.05, 0.34, dark, 0, 0, -0.16));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      spin.add(cylZ(0.02, 0.36, dark, Math.cos(a) * 0.06, Math.sin(a) * 0.06, -0.18));
    }
    return [
      box(0.18, 0.18, 0.3, body, 0, 0, 0.12), // massive block
      spin,
      cylZ(0.1, 0.04, glow, 0, 0.01, -0.32), // glowing muzzle ring
      grip(0.08, 0.16, 0.09, dark, 0, -0.15, 0.22),
      box(0.1, 0.12, 0.12, dark, 0.13, -0.06, 0.18), // ammo box
    ];
  },
  anchors: {
    receiver: { pos: [0, 0.0, 0.12] },
    magazine: { pos: [0.13, -0.06, 0.18] },
    feed: { pos: [0.13, -0.06, 0.18] },
    cooling: { pos: [-0.11, 0.06, 0.04] },
    reactor: { pos: [0, 0.0, 0.28] },
    warhead: { pos: [0, 0.01, -0.34] },
  },
};

const energyEmitter: TemplateDef = {
  muzzleZ: -0.48,
  frame: ({ body, dark, glow }) => [
    box(0.11, 0.12, 0.36, body, 0, 0, 0.04),
    cylZ(0.03, 0.16, glow, 0, 0.02, -0.28), // glowing bore
    grip(0.06, 0.14, 0.07, dark, 0, -0.13, 0.18),
    box(0.07, 0.09, 0.14, body, 0, -0.01, 0.3),
  ],
  anchors: {
    emitter: { pos: [0, 0.02, -0.34] },
    barrel: { pos: [0, 0.02, -0.34] },
    core: { pos: [0, 0.02, 0.06] },
    reactor: { pos: [0, -0.01, 0.32] },
    cooling: { pos: [0.09, 0.06, -0.02] },
    targeting: { pos: [0, 0.12, 0.04] },
    optic: { pos: [0, 0.12, 0.04] },
  },
};

const launcherTube: TemplateDef = {
  muzzleZ: -0.5,
  frame: ({ body, dark }) => [
    cylZ(0.08, 0.6, body, 0, 0.02, -0.1), // big tube
    grip(0.07, 0.15, 0.08, dark, 0, -0.14, 0.18),
    box(0.09, 0.1, 0.14, body, 0, -0.02, 0.28),
  ],
  anchors: {
    tube: { pos: [0, 0.02, -0.44] },
    warhead: { pos: [0, 0.02, -0.36] },
    barrel: { pos: [0, 0.02, -0.4] },
    core: { pos: [0.12, 0.02, 0.1] },
    targeting: { pos: [0, 0.15, -0.1] },
    optic: { pos: [0, 0.15, -0.1] },
    stabilizer: { pos: [0, 0.15, 0.26] },
  },
};

const pistol: TemplateDef = {
  muzzleZ: -0.2,
  frame: ({ body, dark }) => [
    box(0.06, 0.08, 0.24, body, 0, 0.03, -0.02), // slide
    box(0.06, 0.06, 0.14, dark, 0, -0.02, 0.0), // frame
    grip(0.06, 0.13, 0.06, dark, 0, -0.1, 0.06),
  ],
  anchors: {
    barrel: { pos: [0, 0.03, -0.14] },
    slide: { pos: [0, 0.03, -0.02] },
    frame: { pos: [0, -0.03, 0.0] },
    magazine: { pos: [0, -0.12, 0.06] },
    sight: { pos: [0, 0.09, 0.04] },
    optic: { pos: [0, 0.09, 0.04] },
    grip: { pos: [0, -0.1, 0.06] },
  },
};

export const TEMPLATES: Record<TemplateId, TemplateDef> = {
  compactRifle,
  longPrecision,
  bullpupMg,
  rotaryHeavy,
  energyEmitter,
  launcherTube,
  pistol,
};

/** Fallback anchor for a slot the chosen template doesn't position explicitly. */
export function defaultAnchor(slot: SlotKind): Anchor {
  switch (slot) {
    case 'barrel':
    case 'tube':
    case 'emitter':
    case 'warhead':
      return { pos: [0, 0.01, -0.34] };
    case 'optic':
    case 'scope':
    case 'sight':
    case 'targeting':
      return { pos: [0, 0.12, 0.02] };
    case 'magazine':
    case 'feed':
      return { pos: [0, -0.13, 0.08] };
    case 'rear':
    case 'stock':
    case 'reactor':
      return { pos: [0, -0.01, 0.34] };
    case 'cooling':
      return { pos: [0.09, 0.05, -0.02] };
    case 'core':
      return { pos: [0, 0.0, 0.1] };
    case 'bolt':
      return { pos: [0.07, 0.03, 0.12] };
    case 'grip':
      return { pos: [0, -0.12, 0.08] };
    default:
      return { pos: [0, 0.0, 0.0] };
  }
}

/** Shared unused re-export so callers can build materials with the same helpers. */
export { metal, accent, model };
