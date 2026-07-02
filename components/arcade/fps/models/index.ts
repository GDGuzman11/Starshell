/**
 * Weapon model dispatcher — maps a gun id (from `weapons.ts`) to its primitive
 * builder, plus the per-weapon accent colour and a disposal helper. Used by the
 * loadout preview (crisp tier) and, later, the in-game viewmodel (world tier).
 */
import * as THREE from 'three';
import type { RenderTier } from '../materials';
import { ACCENT } from './parts';
import { buildAssaultX, buildCarbine, buildPulseAR } from './rifles';
import { buildAR01Pulse } from './standard';
import { buildNovaSMG, buildRipper, buildSiegeLMG } from './heavy';
import { buildArcThrower, buildIonRepeater, buildLanceBeam } from './energy';
import { buildMarksman, buildPiercer, buildRailgun } from './snipers';
import { buildNovaCannon, buildRocketTube, buildSingularity } from './launchers';
import { buildHandCannon, buildMachinePistol, buildSidearm } from './sidearms';
import {
  buildCluster,
  buildConcussion,
  buildCryo,
  buildDecoy,
  buildFlash,
  buildFrag,
  buildGas,
  buildGravity,
  buildIncendiary,
  buildPlasma,
  buildShock,
  buildSmoke,
} from './throwables';

type Builder = (tier: RenderTier) => THREE.Group;

const GUN_BUILDERS: Record<string, Builder> = {
  ar01: buildAR01Pulse,
  ar: buildPulseAR,
  carbine: buildCarbine,
  assaultx: buildAssaultX,
  smg: buildNovaSMG,
  lmg: buildSiegeLMG,
  ripper: buildRipper,
  pulse: buildIonRepeater,
  beam: buildLanceBeam,
  arc: buildArcThrower,
  rail: buildRailgun,
  marksman: buildMarksman,
  piercer: buildPiercer,
  rocket: buildRocketTube,
  novacannon: buildNovaCannon,
  singularity: buildSingularity,
  sidearm: buildSidearm,
  handcannon: buildHandCannon,
  machinepistol: buildMachinePistol,
};

const THROW_BUILDERS: Record<string, Builder> = {
  frag: buildFrag,
  smoke: buildSmoke,
  incendiary: buildIncendiary,
  cryo: buildCryo,
  shock: buildShock,
  flash: buildFlash,
  cluster: buildCluster,
  gas: buildGas,
  gravity: buildGravity,
  concussion: buildConcussion,
  decoy: buildDecoy,
  plasma: buildPlasma,
};

const THROW_ACCENT: Record<string, number> = {
  frag: ACCENT.amber,
  smoke: 0x9aa3b8,
  incendiary: ACCENT.orange,
  cryo: 0x9fe8ff,
  shock: ACCENT.blue,
  flash: 0xffffff,
  cluster: ACCENT.amber,
  gas: ACCENT.green,
  gravity: ACCENT.purple,
  concussion: ACCENT.amber,
  decoy: ACCENT.green,
  plasma: ACCENT.red,
};

/** Per-weapon ONE accent colour (drives the preview rim light + matches the model). */
const GUN_ACCENT: Record<string, number> = {
  ar01: ACCENT.blue,
  ar: ACCENT.blue,
  carbine: ACCENT.amber,
  assaultx: ACCENT.orange,
  smg: ACCENT.red,
  lmg: ACCENT.red,
  ripper: ACCENT.orange,
  pulse: ACCENT.blue,
  beam: ACCENT.blue,
  arc: ACCENT.purple,
  rail: ACCENT.purple,
  marksman: ACCENT.purple,
  piercer: ACCENT.purple,
  rocket: ACCENT.orange,
  novacannon: ACCENT.red,
  singularity: ACCENT.purple,
  sidearm: ACCENT.green,
  handcannon: ACCENT.green,
  machinepistol: ACCENT.green,
};

/** Build a weapon model. Unknown ids fall back to a plain block (never throws). */
export function buildGun(id: string, tier: RenderTier): THREE.Group {
  const b = GUN_BUILDERS[id];
  if (b) return b(tier);
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.1), new THREE.MeshStandardMaterial({ color: 0x555555 })));
  return g;
}

/** Build a throwable model. Unknown ids fall back to a plain orb (never throws). */
export function buildThrowable(id: string, tier: RenderTier): THREE.Group {
  const b = THROW_BUILDERS[id];
  if (b) return b(tier);
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), new THREE.MeshStandardMaterial({ color: 0x888888 })));
  return g;
}

/** Build any weapon OR throwable model by id (used by the loadout preview). */
export function buildModel(id: string, tier: RenderTier): THREE.Group {
  return GUN_BUILDERS[id] ? buildGun(id, tier) : buildThrowable(id, tier);
}

export function accentOf(id: string): number {
  return GUN_ACCENT[id] ?? THROW_ACCENT[id] ?? 0xffffff;
}

/** Free all geometries + materials under a model group (call before discarding). */
export function disposeModel(obj: THREE.Object3D): void {
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
    else if (mat) mat.dispose();
  });
}
