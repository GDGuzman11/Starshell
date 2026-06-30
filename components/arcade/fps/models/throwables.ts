/**
 * Throwable models — 12 distinct grenade / canister / device silhouettes built
 * from the same primitives as the guns (zero asset files). Each matches its
 * theme + accent: frag pineapple, smoke canister, molotov bottle, cryo crystal,
 * EMP sphere, flashbang, cluster bomblets, toxin canister, gravity orb-ring,
 * concussion, decoy emitter, plasma orb. Glowing cores are named 'glow', rings
 * 'spin' so the preview animates them. Built small + centred for the preview's
 * auto-framing.
 */
import * as THREE from 'three';
import type { RenderTier } from '../materials';
import { ACCENT, COL, accent, box, capsuleY, cylY, cylZ, metal, model } from './parts';

/** A ring of small segments around Y (gravity/plasma containment) — named 'spin'. */
function ring(r: number, segs: number, mat: THREE.Material, y: number): THREE.Group {
  const g = new THREE.Group();
  g.name = 'spin';
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const s = box(0.02, 0.025, 0.035, mat, Math.cos(a) * r, y, Math.sin(a) * r);
    s.rotation.y = a;
    g.add(s);
  }
  return g;
}

/** FRAG — classic pineapple grenade: rounded body + groove rings + fuse lever. */
export function buildFrag(tier: RenderTier): THREE.Group {
  const body = metal(COL.olive, tier);
  const dark = metal(COL.matteBlack, tier);
  const lever = accent(ACCENT.amber, tier, 0.7);
  const core = capsuleY(0.09, 0.07, body);
  const ring1 = cylY(0.095, 0.012, dark, 0, 0.025, 0);
  const ring2 = cylY(0.095, 0.012, dark, 0, -0.025, 0);
  const cap = cylY(0.04, 0.04, dark, 0, 0.11, 0);
  const lev = box(0.018, 0.09, 0.03, lever, 0.035, 0.12, 0);
  return model([core, ring1, ring2, cap, lev]);
}

/** SMOKE — cylindrical canister with a cap + emission ports. */
export function buildSmoke(tier: RenderTier): THREE.Group {
  const body = metal(COL.steel, tier, 0.6, 0.7);
  const dark = metal(COL.matteBlack, tier);
  const band = accent(0x9aa3b8, tier, 0.6);
  const can = cylY(0.06, 0.24, body);
  const capT = cylY(0.065, 0.03, dark, 0, 0.13, 0);
  const capB = cylY(0.065, 0.03, dark, 0, -0.13, 0);
  const stripe = cylY(0.062, 0.02, band, 0, 0.05, 0);
  const port = box(0.03, 0.03, 0.03, dark, 0, 0.15, 0);
  return model([can, capT, capB, stripe, port]);
}

/** MOLOTOV — bottle: tapered body + neck + flaming rag. */
export function buildIncendiary(tier: RenderTier): THREE.Group {
  const glass = metal(0x3a5a45, tier, 0.25, 0.2);
  const fire = accent(ACCENT.orange, tier, 1.6);
  const fluid = accent(0xff7a2a, tier, 0.5);
  const body = capsuleY(0.07, 0.12, glass, 0, -0.02, 0);
  const inside = cylY(0.05, 0.1, fluid, 0, -0.04, 0);
  const neck = cylY(0.025, 0.08, glass, 0, 0.12, 0);
  const rag = box(0.04, 0.05, 0.04, fire, 0, 0.18, 0);
  return model([body, inside, neck, rag]);
}

/** CRYO BOMB — crystalline canister with a glowing frost core. */
export function buildCryo(tier: RenderTier): THREE.Group {
  const body = metal(COL.steel, tier, 0.3, 0.9);
  const dark = metal(COL.matteBlack, tier);
  const ice = accent(0x9fe8ff, tier, 1.4);
  const shell = capsuleY(0.08, 0.05, body);
  const core = cylY(0.045, 0.14, ice, 0, 0, 0);
  core.name = 'glow';
  const capT = cylY(0.05, 0.03, dark, 0, 0.1, 0);
  const fin1 = box(0.14, 0.06, 0.012, body, 0, 0, 0);
  const fin2 = box(0.012, 0.06, 0.14, body, 0, 0, 0);
  return model([shell, core, capT, fin1, fin2]);
}

/** EMP SHOCK — tech sphere with antenna prongs + a charged ring. */
export function buildShock(tier: RenderTier): THREE.Group {
  const body = metal(COL.gunmetal, tier);
  const elec = accent(ACCENT.blue, tier, 1.6);
  const core = capsuleY(0.08, 0.02, body);
  const band = cylY(0.085, 0.02, elec, 0, 0, 0);
  band.name = 'glow';
  const p1 = box(0.012, 0.09, 0.012, elec, 0.05, 0.1, 0.05);
  const p2 = box(0.012, 0.09, 0.012, elec, -0.05, 0.1, -0.05);
  const p3 = box(0.012, 0.09, 0.012, elec, 0.05, 0.1, -0.05);
  return model([core, band, p1, p2, p3]);
}

/** FLASHBANG — slim perforated cylinder with a bright emitter band. */
export function buildFlash(tier: RenderTier): THREE.Group {
  const body = metal(COL.titanium, tier, 0.4, 0.95);
  const dark = metal(COL.matteBlack, tier);
  const lite = accent(0xffffff, tier, 2.0);
  const can = cylY(0.055, 0.2, body);
  const capT = cylY(0.06, 0.025, dark, 0, 0.11, 0);
  const capB = cylY(0.06, 0.025, dark, 0, -0.11, 0);
  const emitT = cylY(0.05, 0.025, lite, 0, 0.07, 0);
  emitT.name = 'glow';
  const emitB = cylY(0.05, 0.025, lite, 0, -0.07, 0);
  emitB.name = 'glow';
  return model([can, capT, capB, emitT, emitB]);
}

/** CLUSTER — body carrying visible sub-munition bomblets. */
export function buildCluster(tier: RenderTier): THREE.Group {
  const body = metal(COL.burntSteel, tier);
  const dark = metal(COL.matteBlack, tier);
  const warn = accent(ACCENT.amber, tier, 0.9);
  const core = capsuleY(0.07, 0.1, body);
  const bomblets: THREE.Object3D[] = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    bomblets.push(capsuleY(0.03, 0.02, warn, Math.cos(a) * 0.07, -0.08, Math.sin(a) * 0.07));
  }
  const cap = cylY(0.035, 0.04, dark, 0, 0.11, 0);
  return model([core, cap, ...bomblets]);
}

/** TOXIN — canister with a toxic band + vent ports. */
export function buildGas(tier: RenderTier): THREE.Group {
  const body = metal(COL.olive, tier);
  const dark = metal(COL.matteBlack, tier);
  const tox = accent(ACCENT.green, tier, 1.3);
  const can = cylY(0.062, 0.22, body);
  const capT = cylY(0.067, 0.03, dark, 0, 0.12, 0);
  const band1 = cylY(0.064, 0.022, tox, 0, 0.04, 0);
  band1.name = 'glow';
  const band2 = cylY(0.064, 0.022, tox, 0, -0.04, 0);
  band2.name = 'glow';
  const port = cylZ(0.02, 0.1, dark, 0, 0.1, 0);
  return model([can, capT, band1, band2, port]);
}

/** SINGULARITY (gravity) — dark orb inside a spinning gravity ring. */
export function buildGravity(tier: RenderTier): THREE.Group {
  const body = metal(COL.matteBlack, tier, 0.3, 0.9);
  const grav = accent(ACCENT.purple, tier, 1.8);
  const core = capsuleY(0.05, 0.01, grav);
  core.name = 'glow';
  const shell = capsuleY(0.075, 0.01, body);
  const r = ring(0.12, 10, grav, 0);
  return model([shell, core, r]);
}

/** CONCUSSION — fat rounded grenade with a pressure band. */
export function buildConcussion(tier: RenderTier): THREE.Group {
  const body = metal(COL.titanium, tier);
  const dark = metal(COL.matteBlack, tier);
  const warn = accent(ACCENT.amber, tier, 1.0);
  const core = capsuleY(0.1, 0.06, body);
  const band = cylY(0.105, 0.03, warn, 0, 0, 0);
  band.name = 'glow';
  const cap = cylY(0.045, 0.04, dark, 0, 0.11, 0);
  return model([core, band, cap]);
}

/** DECOY — tech device: boxy base + holo-emitter dome + antenna. */
export function buildDecoy(tier: RenderTier): THREE.Group {
  const body = metal(COL.gunmetal, tier);
  const dark = metal(COL.matteBlack, tier);
  const holo = accent(ACCENT.green, tier, 1.5);
  const base = box(0.12, 0.08, 0.12, body, 0, -0.04, 0);
  const dome = capsuleY(0.045, 0.02, holo, 0, 0.03, 0);
  dome.name = 'glow';
  const ant = box(0.01, 0.1, 0.01, dark, 0.04, 0.06, 0.04);
  const tip = capsuleY(0.014, 0.001, holo, 0.04, 0.12, 0.04);
  return model([base, dome, ant, tip]);
}

/** PLASMA ORB — glowing energy core in a containment ring. */
export function buildPlasma(tier: RenderTier): THREE.Group {
  const body = metal(COL.gunmetal, tier);
  const plasma = accent(ACCENT.red, tier, 1.9);
  const core = capsuleY(0.07, 0.02, plasma);
  core.name = 'glow';
  const ringV = cylY(0.095, 0.02, body, 0, 0, 0);
  const ringH = cylZ(0.095, 0.02, body, 0, 0, 0);
  const r = ring(0.1, 8, plasma, 0);
  return model([core, ringV, ringH, r]);
}
