/**
 * GHOST HELMET PRODUCTS — Armor Overhaul Pt2 benchmark. Six DISTINCT recon helmets, each
 * a recognizably different silhouette + its own mechanical movement (scanning optic, rotating
 * drone port, camera iris, comms disc), all in Ghost's design language (tall, narrow, angular,
 * technical, sensor-heavy — "I see you before you see me"). Primitives only. Higher tiers use
 * the spec's plates/emissive/animated so craftsmanship + motion read as the piece evolves.
 *
 * Imported ONLY by the /arcade chunk (via products.ts).
 */
import * as THREE from 'three';
import type { RenderTier } from '../../materials';
import { accent, box, capsuleY, coneZ, cylY, cylZ, metal } from '../../models/parts';
import type { ArmorModelSpec } from '../parts';
import type { ArmorProduct } from '../products';

type Build = (spec: ArmorModelSpec, rt: RenderTier) => THREE.Group;

/** Shared setup for a Ghost helmet product. */
function mk(spec: ArmorModelSpec, rt: RenderTier) {
  const g = new THREE.Group();
  // Ghost is SLIM — compress the bulk range (0.85..1.5 → ~0.92..1.09) so the helmet sits
  // snug on the narrow head instead of ballooning at higher tiers (premium ≠ bigger).
  const b = 0.92 + (spec.bulk - 0.85) * 0.26;
  const body = metal(spec.body, rt);
  const dark = metal(0x15171b, rt);
  const glow = accent(spec.accent, rt, 1.3 + spec.emissive);
  const gl = (m: THREE.Mesh): THREE.Mesh => { m.name = 'glow'; g.add(m); return m; };
  // REALISM: a helmet's sensors pulse (glow), they don't spin. Only core/backpack spin.
  const moving = (m: THREE.Mesh): THREE.Mesh => { m.name = 'glow'; g.add(m); return m; };
  return { g, b, body, dark, glow, gl, moving };
}

/** GHOSTWALKER — the recon flagship: long wraparound visor, deployable sensor mast, a
 *  side drone-uplink pod with a rotating port. */
const ghostwalker: Build = (spec, rt) => {
  const { g, b, body, dark, glow, gl, moving } = mk(spec, rt);
  g.add(box(0.18 * b, 0.31 * b, 0.23 * b, body, 0, 0.03, 0)); // tall narrow skull
  const hood = coneZ(0.001, 0.15 * b, 0.22 * b, dark, 0, 0.13 * b, -0.05); hood.rotation.x = 0.5; g.add(hood); // swept hood
  gl(box(0.21 * b, 0.055 * b, 0.03, glow, 0, 0.0, 0.12 * b)); // long wraparound visor
  for (const s of [-1, 1]) gl(box(0.03, 0.05 * b, 0.06, glow, s * 0.1 * b, 0.0, 0.09 * b)); // visor wraps the sides
  g.add(cylY(0.011, 0.17 * b, dark, 0.02 * b, 0.22 * b, -0.04)); // deployable sensor mast
  gl(cylY(0.018, 0.028, glow, 0.02 * b, 0.31 * b, -0.04)); // mast beacon
  g.add(box(0.07 * b, 0.06 * b, 0.06 * b, dark, -0.13 * b, 0.06 * b, 0.02)); // side drone-uplink pod
  moving(cylZ(0.03 * b, 0.02, glow, -0.13 * b, 0.06 * b, 0.06, 8)); // rotating drone port
  g.add(box(0.13 * b, 0.05 * b, 0.08, dark, 0, -0.13 * b, 0.09 * b)); // slim jaw
  return g;
};

/** NIGHTWATCH — a compact scanner helm: short shell, wrap visor + side optics, a brow
 *  target-scanner bar. */
const nightwatch: Build = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = mk(spec, rt);
  g.add(box(0.185 * b, 0.24 * b, 0.22 * b, body, 0, 0.02, 0)); // compact shell
  g.add(box(0.2 * b, 0.05 * b, 0.05, dark, 0, 0.12 * b, 0.02)); // shell cap
  gl(box(0.2 * b, 0.05 * b, 0.03, glow, 0, -0.01, 0.13 * b)); // wrap visor front
  for (const s of [-1, 1]) { const lens = gl(cylZ(0.03 * b, 0.05, glow, s * 0.12 * b, -0.01, 0.07 * b, 12)); lens.rotation.y = s * 0.5; } // side optics
  gl(box(0.19 * b, 0.02, 0.02, glow, 0, 0.07 * b, 0.13 * b)); // brow target-scanner bar
  g.add(box(0.16 * b, 0.06 * b, 0.08, dark, 0, -0.11 * b, 0.09 * b)); // lightweight jaw
  return g;
};

/** VECTOR — an electronic-warfare helm: faceted angular shell, split visor, an integrated
 *  camera on a stalk (iris), a rear data-fin. */
const vector: Build = (spec, rt) => {
  const { g, b, body, dark, glow, gl, moving } = mk(spec, rt);
  const head = cylY(0.1 * b, 0.28 * b, body, 0, 0.02, 0, 6); head.rotation.y = Math.PI / 6; g.add(head); // hex faceted head
  for (const s of [-1, 1]) { const v = gl(box(0.09 * b, 0.035 * b, 0.03, glow, s * 0.06 * b, 0.0, 0.13 * b)); v.rotation.z = s * 0.35; } // split visor
  g.add(cylZ(0.02, 0.1, dark, 0.12 * b, 0.08 * b, 0.08 * b, 8)); // camera stalk
  g.add(box(0.05 * b, 0.05 * b, 0.05, dark, 0.12 * b, 0.08 * b, 0.14 * b)); // camera housing
  moving(cylZ(0.028 * b, 0.02, glow, 0.12 * b, 0.08 * b, 0.17 * b, 10)); // camera iris
  g.add(box(0.03, 0.2 * b, 0.09, dark, 0, 0.12 * b, -0.12 * b)); // rear data-fin
  gl(box(0.01, 0.16 * b, 0.02, glow, 0.02, 0.12 * b, -0.16 * b)); // fin data-line
  return g;
};

/** SPECTRE — a tri-lens optics helm: three stacked vertical lenses + an antenna fan. */
const spectre: Build = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = mk(spec, rt);
  g.add(box(0.17 * b, 0.3 * b, 0.22 * b, body, 0, 0.03, 0)); // narrow head
  for (let i = 0; i < 3; i++) gl(cylZ(0.035 * b, 0.05, glow, 0, 0.09 * b - i * 0.08 * b, 0.13 * b, 12)); // tri-lens vertical stack
  const n = 3 + (spec.animated ? 1 : 0);
  for (let i = 0; i < n; i++) { const a = box(0.008, 0.15 * b, 0.008, dark, (i - (n - 1) / 2) * 0.04 * b, 0.22 * b, -0.04); a.rotation.z = (i - (n - 1) / 2) * 0.22; g.add(a); } // antenna fan
  g.add(box(0.12 * b, 0.05 * b, 0.08, dark, 0, -0.13 * b, 0.09 * b)); // thin jaw
  return g;
};

/** CIPHER — a signals helm: minimal rounded skull, a wide scanner slit, a rear comms disc
 *  that rotates. */
const cipher: Build = (spec, rt) => {
  const { g, b, body, dark, glow, gl, moving } = mk(spec, rt);
  g.add(capsuleY(0.1 * b, 0.11 * b, body, 0, 0.02, 0)); // minimal rounded skull
  gl(box(0.22 * b, 0.035 * b, 0.03, glow, 0, 0.0, 0.12 * b)); // wide scanner slit
  g.add(cylZ(0.06 * b, 0.02, dark, 0, 0.06 * b, -0.14 * b, 16)); // comms disc mount
  moving(cylZ(0.055 * b, 0.015, glow, 0, 0.06 * b, -0.15 * b, 8)); // rotating comms disc
  g.add(cylY(0.01, 0.16 * b, dark, -0.08 * b, 0.18 * b, -0.02)); // fold-out antenna
  gl(cylY(0.016, 0.02, glow, -0.08 * b, 0.27 * b, -0.02)); // antenna tip
  return g;
};

/** WRAITH — a stealth helm: low hooded shell, a single recessed optic, cheek sensor
 *  cluster, and a long rear neural spine. */
const wraith: Build = (spec, rt) => {
  const { g, b, body, dark, glow, gl } = mk(spec, rt);
  g.add(box(0.18 * b, 0.22 * b, 0.23 * b, body, 0, 0.0, 0)); // low skull
  const hood = coneZ(0.02, 0.17 * b, 0.26 * b, dark, 0, 0.11 * b, -0.03); hood.rotation.x = 0.45; g.add(hood); // big swept hood
  g.add(box(0.14 * b, 0.07 * b, 0.04, dark, 0, 0.0, 0.12 * b)); // recessed brow
  gl(cylZ(0.04 * b, 0.04, glow, 0, 0.0, 0.13 * b, 14)); // single recessed optic
  for (const s of [-1, 1]) for (let i = 0; i < 2; i++) gl(box(0.018, 0.018, 0.018, glow, s * 0.11 * b, -0.03 - i * 0.04, 0.06 * b)); // cheek sensor cluster
  for (let i = 0; i < 4; i++) g.add(box(0.03 * b, 0.02, 0.03, dark, 0, 0.05 * b - i * 0.03, -0.14 * b - i * 0.008)); // rear neural spine segments
  return g;
};

export const GHOST_HELMETS: ArmorProduct[] = [
  { id: 'ghostwalker', name: 'Ghostwalker', noun: 'Recon Helm', build: ghostwalker },
  { id: 'nightwatch', name: 'Nightwatch', noun: 'Scanner Helm', build: nightwatch },
  { id: 'vector', name: 'Vector', noun: 'EW Helm', build: vector },
  { id: 'spectre', name: 'Spectre', noun: 'Optics Helm', build: spectre },
  { id: 'cipher', name: 'Cipher', noun: 'Signals Helm', build: cipher },
  { id: 'wraith', name: 'Wraith', noun: 'Stealth Helm', build: wraith },
];
