/**
 * Weapon model dispatcher — maps a gun id (from `weapons.ts`) to its primitive
 * builder, plus the per-weapon accent colour and a disposal helper. Used by the
 * loadout preview (crisp tier) and, later, the in-game viewmodel (world tier).
 */
import * as THREE from 'three';
import type { RenderTier } from '../materials';
import { generatedAccent, generatedGun, isGenerated } from '../gen/registry';
import { ACCENT } from './parts';
import { buildAssaultX, buildCarbine, buildPulseAR } from './rifles';
import { buildAR01Pulse, buildCB02Ranger, buildER08Ion, buildGC03Hammer, buildMP05Viper, buildPM09Meteor, buildRC12Thunder, buildRT06Bulldog, buildSP01Service, buildVX04Tempest } from './standard';
import { buildNovaSMG, buildRipper, buildSiegeLMG } from './heavy';
import { buildArcThrower, buildIonRepeater, buildLanceBeam } from './energy';
import { buildMarksman, buildPiercer, buildRailgun } from './snipers';
import { buildNovaCannon, buildRocketTube, buildSingularity } from './launchers';
import { buildHandCannon, buildMachinePistol, buildSidearm } from './sidearms';
import { buildAPX01Revenant, buildAPX02Hydra, buildAPX03Cyclone, buildAPX04Bastion, buildAPX05Aegis, buildAPX06Scavenger, buildAPX07Ironclad, buildAPX08Gyre, buildAPX09Vulcan, buildAPX10Tesla, buildAPXM1Leviathan, buildAPXM2Maelstrom, buildAPXM3Ignis, buildAPXM4Bulwark, buildAPXM5Magnetar, buildAPXM6Servitor, buildAPXM7Kiln, buildAPXM8Piledriver, buildAPXM9Dynamo, buildAPXM10Overlord, buildAPXH1Oblivion, buildAPXH2Meridian, buildAPXH3Inferno, buildAPXH4Glacier, buildAPXH5Contagion, buildAPXH6Sunder, buildAPXH7Helios, buildAPXH8Salvo, buildAPXH9Auger, buildAPXH10Nemesis, buildOTR01Obelisk, buildOTR02Stiletto } from './premium';
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
  cb02: buildCB02Ranger,
  vx04: buildVX04Tempest,
  er08: buildER08Ion,
  rt06: buildRT06Bulldog,
  gc03: buildGC03Hammer,
  pm09: buildPM09Meteor,
  rc12: buildRC12Thunder,
  sp01: buildSP01Service,
  mp05: buildMP05Viper,
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
  // PREMIUM (Apex tier) — ten prestige assault rifles, each a unique engineering division
  apx01: buildAPX01Revenant,
  apx02: buildAPX02Hydra,
  apx03: buildAPX03Cyclone,
  apx04: buildAPX04Bastion,
  apx05: buildAPX05Aegis,
  apx06: buildAPX06Scavenger,
  apx07: buildAPX07Ironclad,
  apx08: buildAPX08Gyre,
  apx09: buildAPX09Vulcan,
  apx10: buildAPX10Tesla,
  // PREMIUM machine guns (Apex tier)
  apxm1: buildAPXM1Leviathan,
  apxm2: buildAPXM2Maelstrom,
  apxm3: buildAPXM3Ignis,
  apxm4: buildAPXM4Bulwark,
  apxm5: buildAPXM5Magnetar,
  apxm6: buildAPXM6Servitor,
  apxm7: buildAPXM7Kiln,
  apxm8: buildAPXM8Piledriver,
  apxm9: buildAPXM9Dynamo,
  apxm10: buildAPXM10Overlord,
  // PREMIUM heavy siege platforms (Apex tier)
  apxh1: buildAPXH1Oblivion,
  apxh2: buildAPXH2Meridian,
  apxh3: buildAPXH3Inferno,
  apxh4: buildAPXH4Glacier,
  apxh5: buildAPXH5Contagion,
  apxh6: buildAPXH6Sunder,
  apxh7: buildAPXH7Helios,
  apxh8: buildAPXH8Salvo,
  apxh9: buildAPXH9Auger,
  apxh10: buildAPXH10Nemesis,
  // OUTRIDER premium sniper rifles
  otr01: buildOTR01Obelisk,
  otr02: buildOTR02Stiletto,
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
  cb02: ACCENT.blue,
  vx04: ACCENT.red,
  er08: ACCENT.blue,
  rt06: ACCENT.orange,
  gc03: ACCENT.green,
  pm09: ACCENT.blue,
  rc12: ACCENT.blue,
  sp01: ACCENT.green,
  mp05: ACCENT.green,
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
  apx01: 0x7fdfff, // Revenant plasma cyan-white
  apx02: 0xff7a2a, // Hydra hydraulic orange
  apx03: 0x63ff84, // Cyclone coolant green
  apx04: 0x6ab0ff, // Bastion steel-blue
  apx05: 0xb15cff, // Aegis shutter purple
  apx06: 0xffc24a, // Scavenger brass amber
  apx07: 0xff3a48, // Ironclad warning red
  apx08: 0x49a6ff, // Gyre gyro azure
  apx09: 0xff5a2a, // Vulcan furnace orange-red
  apx10: 0x9ad8ff, // Tesla electric blue-white
  apxm1: 0xffa833, // Leviathan molten amber
  apxm2: 0xff4a3a, // Maelstrom rotary red
  apxm3: 0xb15cff, // Ignis plasma purple
  apxm4: 0xff7a2a, // Bulwark cannon orange
  apxm5: 0x49a6ff, // Magnetar magnetic blue
  apxm6: 0x63ff84, // Servitor servo green
  apxm7: 0x3ad8c0, // Kiln coolant teal
  apxm8: 0xff5a2a, // Piledriver kinetic orange-red
  apxm9: 0xeaf2ff, // Dynamo white reactor
  apxm10: 0xffd27a, // Overlord gold
  apxh1: 0xb15cff, // Oblivion gravity purple
  apxh2: 0xbfe0ff, // Meridian orbital blue-white
  apxh3: 0xff7a2a, // Inferno thermobaric orange
  apxh4: 0x8ff0ff, // Glacier cryo icy-cyan
  apxh5: 0x7dff9a, // Contagion nanite mint
  apxh6: 0xffc23a, // Sunder shockwave amber
  apxh7: 0xf2f6ff, // Helios fusion white
  apxh8: 0xff5a5a, // Salvo micro-missile red
  apxh9: 0xffa040, // Auger drill orange-gold
  apxh10: 0xc8ff3a, // Nemesis radiation yellow-green
  otr01: 0x8fd0ff, // Obelisk gauss blue
  otr02: 0xffb84a, // Stiletto marksman amber
};

/** Build a weapon model. Unknown ids fall back to a plain block (never throws).
 *  Generated (DNA) weapons are assembled parametrically from their blueprint. */
export function buildGun(id: string, tier: RenderTier): THREE.Group {
  const b = GUN_BUILDERS[id];
  if (b) return b(tier);
  const gen = generatedGun(id, tier);
  if (gen) return gen;
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
  return GUN_BUILDERS[id] || isGenerated(id) ? buildGun(id, tier) : buildThrowable(id, tier);
}

export function accentOf(id: string): number {
  return GUN_ACCENT[id] ?? generatedAccent(id) ?? THROW_ACCENT[id] ?? 0xffffff;
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
