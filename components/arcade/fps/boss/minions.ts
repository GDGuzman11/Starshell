/**
 * Boss-faction minions — 3D low-poly aliens (primitives only) that fight as the
 * boss's themed squad. Xenomorph hive first: Broodling (fast melee swarm), Spitter
 * (acid ranged support), Stalker (flanker/ambusher). Each is a distinct, readable
 * silhouette — you know the role before it acts. Stats + models + a tiny animator
 * live here; the role AI is a branch in `enemy.ts` (it needs the move/LoS helpers).
 *
 * Imported ONLY by the /arcade chunk.
 */
import * as THREE from 'three';
import type { RenderTier } from '../materials';
import { accent, box, capsuleY, capsuleZ, coneZ, cylY, metal, wraith } from '../models/parts';

export type MinionKind =
  | 'broodling'
  | 'spitter'
  | 'stalker'
  | 'crawler'
  | 'spore'
  | 'sentinel'
  | 'facet'
  | 'constructor'
  | 'sentry'
  | 'rampart'
  | 'grazer'
  | 'sporeback'
  | 'phantom'
  | 'mirror'
  | 'wisp'
  | 'broodworm'
  | 'mawturret'
  | 'leech'
  | 'shard'
  | 'resonator'
  | 'grower'
  | 'rift'
  | 'shade'
  | 'devourer'
  | 'warframe'
  | 'artillery'
  | 'fabricator'
  | 'splice'
  | 'genepod'
  | 'regenerator'
  | 'echo'
  | 'mote'
  | 'seer'
  | 'spawnling'
  | 'host'
  | 'latcher';

export interface MinionDef {
  hp: number;
  speedMul: number; // × the regular enemy base speed
  scale: number;
  melee: number; // melee damage (0 = none)
  ranged: number; // acid-spit / bolt damage (0 = none)
  color: number;
}

export const MINIONS: Record<MinionKind, MinionDef> = {
  // Xenomorph hive (green)
  broodling: { hp: 55, speedMul: 2.0, scale: 1.0, melee: 9, ranged: 0, color: 0x121214 },
  spitter: { hp: 95, speedMul: 1.15, scale: 1.25, melee: 0, ranged: 12, color: 0x2a4a24 },
  stalker: { hp: 120, speedMul: 1.65, scale: 1.4, melee: 15, ranged: 0, color: 0x16161e },
  // Kraken abyss (purple/void)
  crawler: { hp: 70, speedMul: 1.7, scale: 1.0, melee: 11, ranged: 0, color: 0x4a2a6a },
  spore: { hp: 40, speedMul: 0.75, scale: 0.95, melee: 22, ranged: 0, color: 0x7a4ac0 }, // bomber (explodes)
  sentinel: { hp: 135, speedMul: 0.95, scale: 1.3, melee: 0, ranged: 14, color: 0x3a2060 },
  // Archon retinue (machine blue) — geometric ranged drones
  facet: { hp: 60, speedMul: 1.6, scale: 1.0, melee: 0, ranged: 11, color: 0x141824 },
  constructor: { hp: 165, speedMul: 0.85, scale: 1.35, melee: 0, ranged: 13, color: 0x1a2130 },
  sentry: { hp: 185, speedMul: 0.3, scale: 1.3, melee: 0, ranged: 14, color: 0x12161f },
  // Behemoth herd (sandstone/amber) — siege-beasts
  rampart: { hp: 260, speedMul: 0.7, scale: 1.6, melee: 16, ranged: 0, color: 0x5a4a34 }, // walking wall / tank melee
  grazer: { hp: 120, speedMul: 1.9, scale: 1.2, melee: 18, ranged: 0, color: 0x7a5a34 }, // armored charger
  sporeback: { hp: 150, speedMul: 0.8, scale: 1.25, melee: 0, ranged: 12, color: 0x6a6a3a }, // ranged + heals the boss
  // Specter haunt (spectral violet) — wraiths
  phantom: { hp: 80, speedMul: 1.8, scale: 1.35, melee: 15, ranged: 0, color: 0x2a1a44 }, // cloaked ambusher
  mirror: { hp: 1, speedMul: 1.5, scale: 1.35, melee: 0, ranged: 0, color: 0x3a2a5a }, // illusory decoy (pops in 1 hit)
  wisp: { hp: 60, speedMul: 1.3, scale: 0.9, melee: 0, ranged: 10, color: 0x4a2a6a }, // fear/blur floater
  // Leviathan brood (venom green) — burrowers
  broodworm: { hp: 90, speedMul: 1.7, scale: 1.1, melee: 13, ranged: 0, color: 0x4a5a1a }, // burrow rusher
  mawturret: { hp: 200, speedMul: 0.25, scale: 1.3, melee: 0, ranged: 15, color: 0x3a4a18 }, // anchored biter
  leech: { hp: 70, speedMul: 1.9, scale: 0.9, melee: 12, ranged: 0, color: 0x6a8a2a }, // drains → heals boss
  // Monolith lattice (crystal cyan) — crystalline
  shard: { hp: 55, speedMul: 2.1, scale: 0.9, melee: 10, ranged: 0, color: 0x2a4a5a }, // fast crystal dart
  resonator: { hp: 170, speedMul: 0.3, scale: 1.2, melee: 0, ranged: 14, color: 0x1e3a48 }, // beam node
  grower: { hp: 150, speedMul: 0.7, scale: 1.25, melee: 0, ranged: 11, color: 0x24414f }, // grows cover + repairs allies
  // Oblivion void (void violet) — shadows
  rift: { hp: 120, speedMul: 0.4, scale: 1.1, melee: 0, ranged: 13, color: 0x180e26 }, // gravity-well node + pull
  shade: { hp: 75, speedMul: 1.7, scale: 1.3, melee: 14, ranged: 0, color: 0x120a1e }, // shadow melee
  devourer: { hp: 110, speedMul: 1.5, scale: 1.15, melee: 16, ranged: 0, color: 0x0e0818 }, // void crawler
  // Colossus foundry (industrial orange) — war machines
  warframe: { hp: 240, speedMul: 0.7, scale: 1.5, melee: 0, ranged: 15, color: 0x5a5a64 }, // heavy mech
  artillery: { hp: 110, speedMul: 0.5, scale: 1.15, melee: 0, ranged: 14, color: 0x4a4a52 }, // arc shells
  fabricator: { hp: 160, speedMul: 0.8, scale: 1.25, melee: 0, ranged: 11, color: 0x6a5a3a }, // repairs mechs
  // Chimera strain (bio magenta) — mutants
  splice: { hp: 70, speedMul: 2.0, scale: 1.0, melee: 12, ranged: 0, color: 0x7a2a5a }, // fast mutant melee
  genepod: { hp: 180, speedMul: 0.3, scale: 1.2, melee: 0, ranged: 13, color: 0x5a2a4a }, // adaptive spitter/turret
  regenerator: { hp: 150, speedMul: 0.8, scale: 1.2, melee: 0, ranged: 10, color: 0x6a3a5a }, // grafts flesh (heals allies)
  // Oracle choir (temporal gold) — time-entities
  echo: { hp: 65, speedMul: 1.4, scale: 1.2, melee: 0, ranged: 12, color: 0x2a2440 }, // time-clone (ranged)
  mote: { hp: 90, speedMul: 0.3, scale: 0.9, melee: 0, ranged: 9, color: 0x3a3458 }, // slow-field emitter
  seer: { hp: 130, speedMul: 0.7, scale: 1.15, melee: 0, ranged: 11, color: 0x4a4030 }, // marks you → aim buff
  // Infestor brood (ooze green) — parasites
  spawnling: { hp: 45, speedMul: 2.1, scale: 0.85, melee: 10, ranged: 0, color: 0x3a4a1a }, // rush + infect
  host: { hp: 120, speedMul: 0.9, scale: 1.3, melee: 20, ranged: 0, color: 0x2e3a18 }, // bursts into spawn (bomber)
  latcher: { hp: 80, speedMul: 1.6, scale: 0.9, melee: 8, ranged: 0, color: 0x5a6a2a }, // attaches → heals boss
};

const GREEN = 0x6aff7a;
const VIOLET = 0xc08bff;
const AZURE = 0x49a6ff;
const AMBER = 0xffb14a;
const SPECTRAL = 0xd7a6ff;
const VENOM = 0x9adb3a;
const CRYSTAL = 0x7fe8ff;
const VOIDV = 0xc98bff;
const HAZARD = 0xff8a3a;
const FLESH = 0xff5ac8;
const TEMPORAL = 0xffd98a;
const OOZE = 0x9cd84a;

/** Tiny low-crawling swarmer: flat dark body, sharp legs, green eyes. */
function buildBroodling(tier: RenderTier): THREE.Group {
  const body = metal(0x121214, tier, 0.35, 0.85);
  const glow = accent(GREEN, tier, 1.6);
  const root = new THREE.Group();
  const core = new THREE.Group();
  core.position.y = 0.4;
  core.add(box(0.34, 0.2, 0.5, body, 0, 0, 0)); // low carapace
  core.add(coneZ(0, 0.1, 0.3, body, 0, 0.02, 0.3)); // snout
  core.add(box(0.05, 0.04, 0.04, glow, -0.08, 0.05, 0.34)); // eyes
  core.add(box(0.05, 0.04, 0.04, glow, 0.08, 0.05, 0.34));
  for (const sx of [-1, 1])
    for (const sz of [-0.15, 0.15]) {
      const leg = box(0.04, 0.34, 0.04, body, sx * 0.22, -0.16, sz);
      leg.rotation.z = sx * 0.5;
      core.add(leg);
    }
  root.add(core);
  root.userData.bodyMats = [body];
  root.userData.core = core;
  return root;
}

/** Hunched acid support: glowing throat sac, stubby tail. */
function buildSpitter(tier: RenderTier): THREE.Group {
  const body = metal(0x1a2e16, tier, 0.4, 0.8);
  const glow = accent(GREEN, tier, 1.7);
  const root = new THREE.Group();
  const core = new THREE.Group();
  core.position.y = 0.7;
  core.rotation.x = 0.3;
  core.add(capsuleZ(0.26, 0.4, body, 0, 0, 0)); // hunched body
  core.add(box(0.22, 0.18, 0.14, glow, 0, -0.04, 0.28)); // throat sac (glows)
  core.add(coneZ(0, 0.12, 0.3, body, 0, 0.16, -0.04)); // head
  const tail = coneZ(0.08, 0, 0.4, body, 0, -0.1, -0.34);
  tail.rotation.x = 0.5;
  core.add(tail);
  root.add(core);
  for (const sx of [-1, 1]) root.add(box(0.08, 0.5, 0.1, body, sx * 0.16, 0.25, 0)); // legs
  root.userData.bodyMats = [body];
  root.userData.core = core;
  return root;
}

/** Tall thin flanker: long limbs, darker, elongated head. */
function buildStalker(tier: RenderTier): THREE.Group {
  const body = metal(0x16161e, tier, 0.34, 0.88);
  const glow = accent(GREEN, tier, 1.5);
  const root = new THREE.Group();
  const core = new THREE.Group();
  core.position.y = 1.0;
  core.add(capsuleZ(0.18, 0.5, body, 0, 0.1, 0)); // slim torso
  core.add(coneZ(0, 0.12, 0.5, body, 0, 0.3, -0.04)); // elongated skull
  core.add(box(0.04, 0.03, 0.06, glow, -0.06, 0.32, 0.16)); // eye glints
  core.add(box(0.04, 0.03, 0.06, glow, 0.06, 0.32, 0.16));
  for (const sx of [-1, 1]) {
    const arm = box(0.06, 0.6, 0.06, body, sx * 0.24, 0.0, 0.05);
    arm.rotation.z = sx * 0.3;
    core.add(arm);
  }
  root.add(core);
  for (const sx of [-1, 1]) {
    const leg = box(0.08, 0.95, 0.1, body, sx * 0.14, 0.5, 0);
    root.add(leg);
  }
  root.userData.bodyMats = [body];
  root.userData.core = core;
  return root;
}

/** Abyss Crawler: a low purple crab/tentacle creature with glowing tips. */
function buildCrawler(tier: RenderTier): THREE.Group {
  const body = metal(0x2a1840, tier, 0.42, 0.65);
  const glow = accent(VIOLET, tier, 1.6);
  const root = new THREE.Group();
  const core = new THREE.Group();
  core.position.y = 0.34;
  core.add(box(0.42, 0.22, 0.42, body, 0, 0, 0)); // shell
  core.add(box(0.06, 0.05, 0.05, glow, -0.1, 0.07, 0.22)); // eyes
  core.add(box(0.06, 0.05, 0.05, glow, 0.1, 0.07, 0.22));
  for (const sx of [-1, 1])
    for (const sz of [-0.18, 0.18]) {
      const leg = box(0.04, 0.3, 0.04, body, sx * 0.26, -0.13, sz);
      leg.rotation.z = sx * 0.6;
      core.add(leg);
    }
  core.add(box(0.05, 0.05, 0.22, glow, 0, 0.02, -0.26)); // glowing tail tip
  root.add(core);
  root.userData.bodyMats = [body];
  root.userData.core = core;
  return root;
}

/** Void Spore: a floating purple orb bomber with small tendrils. */
function buildSpore(tier: RenderTier): THREE.Group {
  const body = metal(0x3a2060, tier, 0.5, 0.5);
  const glow = accent(VIOLET, tier, 2.1);
  const root = new THREE.Group();
  const core = new THREE.Group();
  core.position.y = 1.1; // floats above the ground point
  core.add(capsuleZ(0.26, 0.06, body, 0, 0, 0)); // orb
  core.add(box(0.16, 0.16, 0.16, glow, 0, 0, 0.14)); // glowing core
  for (const a of [0, 1, 2, 3]) {
    const ang = (a / 4) * Math.PI * 2;
    core.add(box(0.04, 0.24, 0.04, body, Math.cos(ang) * 0.18, -0.22, Math.sin(ang) * 0.18)); // tendrils
  }
  root.add(core);
  root.userData.bodyMats = [body];
  root.userData.core = core;
  return root;
}

/** Abyss Sentinel: a taller squid-like ranged protector. */
function buildSentinel(tier: RenderTier): THREE.Group {
  const body = metal(0x2a1840, tier, 0.4, 0.66);
  const glow = accent(VIOLET, tier, 1.6);
  const root = new THREE.Group();
  const core = new THREE.Group();
  core.position.y = 0.95;
  core.add(capsuleZ(0.24, 0.5, body, 0, 0.08, 0)); // mantle
  core.add(coneZ(0, 0.16, 0.42, body, 0, 0.26, -0.04)); // head point
  core.add(box(0.05, 0.04, 0.06, glow, -0.08, 0.28, 0.16)); // eyes
  core.add(box(0.05, 0.04, 0.06, glow, 0.08, 0.28, 0.16));
  for (const a of [0, 1, 2, 3, 4]) {
    const ang = (a / 5) * Math.PI * 2;
    const t = box(0.05, 0.5, 0.05, body, Math.cos(ang) * 0.14, -0.2, Math.sin(ang) * 0.14);
    core.add(t);
  }
  root.add(core);
  root.userData.bodyMats = [body];
  root.userData.core = core;
  return root;
}

/** Archon Facet: a small hovering octahedron drone inside a blue micro-ring. */
function buildFacet(tier: RenderTier): THREE.Group {
  const body = metal(0x141824, tier, 0.4, 0.85);
  const glow = accent(AZURE, tier, 1.8);
  const root = new THREE.Group();
  const core = new THREE.Group();
  core.position.y = 1.1; // floats
  core.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 0), body));
  core.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), glow));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.03, 6, 20), glow);
  ring.rotation.x = Math.PI * 0.42;
  core.add(ring);
  root.add(core);
  root.userData.bodyMats = [body];
  root.userData.core = core;
  return root;
}

/** Archon Constructor: a blocky fabricator drone with side arms + a blue eye. */
function buildConstructor(tier: RenderTier): THREE.Group {
  const body = metal(0x1a2130, tier, 0.45, 0.8);
  const glow = accent(AZURE, tier, 1.6);
  const root = new THREE.Group();
  const core = new THREE.Group();
  core.position.y = 0.75;
  core.add(box(0.5, 0.5, 0.5, body, 0, 0, 0)); // body
  core.add(box(0.18, 0.18, 0.16, glow, 0, 0, 0.28)); // eye
  for (const sx of [-1, 1]) core.add(box(0.12, 0.12, 0.42, body, sx * 0.34, 0, 0.1)); // fabricator arms
  root.add(core);
  for (const sx of [-1, 1]) root.add(box(0.1, 0.55, 0.1, body, sx * 0.18, 0.28, 0)); // legs
  root.userData.bodyMats = [body];
  root.userData.core = core;
  return root;
}

/** Archon Sentry: a tripod turret with a barrel + top light — a stationary gun. */
function buildSentry(tier: RenderTier): THREE.Group {
  const body = metal(0x12161f, tier, 0.4, 0.85);
  const glow = accent(AZURE, tier, 1.7);
  const root = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = box(0.08, 0.7, 0.08, body, Math.cos(a) * 0.24, 0.35, Math.sin(a) * 0.24);
    leg.rotation.z = Math.cos(a) * 0.3;
    leg.rotation.x = -Math.sin(a) * 0.3;
    root.add(leg);
  }
  const core = new THREE.Group();
  core.position.y = 0.82;
  core.add(box(0.34, 0.28, 0.34, body, 0, 0, 0)); // turret head
  core.add(box(0.1, 0.1, 0.5, body, 0, 0.02, 0.3)); // barrel
  core.add(box(0.12, 0.12, 0.08, glow, 0, 0.02, 0.52)); // muzzle glow
  core.add(box(0.34, 0.06, 0.34, glow, 0, 0.17, 0)); // top light
  root.add(core);
  root.userData.bodyMats = [body];
  root.userData.core = core;
  return root;
}

/** Behemoth Rampart: a wide low wall-beast with a big front armor plate (mobile cover). */
function buildRampart(tier: RenderTier): THREE.Group {
  const body = metal(0x5a4a34, tier, 0.75, 0.35);
  const dark = metal(0x2e2418, tier, 0.72, 0.3);
  const glow = accent(AMBER, tier, 1.4);
  const root = new THREE.Group();
  const core = new THREE.Group();
  core.position.y = 0.72;
  core.add(box(1.2, 1.0, 0.7, body, 0, 0, 0)); // wide body
  core.add(box(1.45, 1.25, 0.22, dark, 0, 0.12, 0.44)); // big front wall plate
  core.add(box(0.14, 0.1, 0.08, glow, -0.32, 0.4, 0.55)); // eyes over the plate
  core.add(box(0.14, 0.1, 0.08, glow, 0.32, 0.4, 0.55));
  root.add(core);
  for (const sx of [-1, 1])
    for (const sz of [-0.2, 0.2]) root.add(box(0.22, 0.72, 0.22, dark, sx * 0.46, 0.36, sz)); // stubby legs
  root.userData.bodyMats = [body, dark];
  root.userData.core = core;
  return root;
}

/** Behemoth Grazer: a low horned armored charger. */
function buildGrazer(tier: RenderTier): THREE.Group {
  const body = metal(0x7a5a34, tier, 0.6, 0.4);
  const dark = metal(0x3a2a18, tier, 0.6, 0.4);
  const glow = accent(AMBER, tier, 1.5);
  const root = new THREE.Group();
  const core = new THREE.Group();
  core.position.y = 0.62;
  core.add(capsuleZ(0.34, 0.7, body, 0, 0, 0)); // charging body
  core.add(box(0.42, 0.42, 0.4, dark, 0, 0.02, 0.5)); // armored head
  core.add(coneZ(0, 0.07, 0.4, dark, -0.17, 0.14, 0.72)); // horns
  core.add(coneZ(0, 0.07, 0.4, dark, 0.17, 0.14, 0.72));
  core.add(box(0.06, 0.05, 0.05, glow, -0.14, 0.05, 0.7)); // eyes
  core.add(box(0.06, 0.05, 0.05, glow, 0.14, 0.05, 0.7));
  root.add(core);
  for (const sx of [-1, 1])
    for (const sz of [-0.22, 0.22]) root.add(box(0.12, 0.62, 0.12, dark, sx * 0.24, 0.31, sz)); // legs
  root.userData.bodyMats = [body, dark];
  root.userData.core = core;
  return root;
}

/** Behemoth Sporeback: a hunched beast with a bright heal-pod on its back (regrows
 *  the boss's plates + spits ranged spores). */
function buildSporeback(tier: RenderTier): THREE.Group {
  const body = metal(0x6a6a3a, tier, 0.62, 0.35);
  const dark = metal(0x2e2e18, tier, 0.62, 0.35);
  const glow = accent(0xaef54a, tier, 1.9); // sickly heal-green
  const root = new THREE.Group();
  const core = new THREE.Group();
  core.position.y = 0.78;
  core.rotation.x = 0.24;
  core.add(capsuleZ(0.32, 0.42, body, 0, 0, 0)); // body
  core.add(coneZ(0, 0.12, 0.3, dark, 0, 0.06, 0.34)); // head
  core.add(box(0.34, 0.32, 0.18, glow, 0, 0.3, -0.22)); // heal pod on the back
  core.add(box(0.05, 0.04, 0.05, glow, -0.1, 0.1, 0.42)); // eyes
  core.add(box(0.05, 0.04, 0.05, glow, 0.1, 0.1, 0.42));
  root.add(core);
  for (const sx of [-1, 1]) root.add(box(0.1, 0.6, 0.12, dark, sx * 0.2, 0.3, 0)); // legs
  root.userData.bodyMats = [body, dark];
  root.userData.core = core;
  return root;
}

/** Specter Phantom: a tall thin cloaked wraith with long claws + glowing eyes. */
function buildPhantom(tier: RenderTier): THREE.Group {
  const body = wraith(0x2a1a44, 0.42, 0xb877ff);
  const glow = accent(SPECTRAL, tier, 1.8);
  const root = new THREE.Group();
  const core = new THREE.Group();
  core.position.y = 1.05;
  core.add(capsuleY(0.16, 0.55, body, 0, 0.1, 0)); // thin torso
  core.add(coneZ(0, 0.13, 0.42, body, 0, 0.42, -0.06)); // elongated skull
  core.add(box(0.04, 0.03, 0.06, glow, -0.06, 0.42, 0.14)); // eyes
  core.add(box(0.04, 0.03, 0.06, glow, 0.06, 0.42, 0.14));
  for (const sx of [-1, 1]) {
    const arm = box(0.05, 0.6, 0.05, body, sx * 0.22, 0.02, 0.05);
    arm.rotation.z = sx * 0.28;
    core.add(arm);
  }
  root.add(core);
  for (const sx of [-1, 1]) root.add(box(0.06, 0.85, 0.08, body, sx * 0.12, 0.45, 0)); // wispy legs
  root.userData.bodyMats = [body];
  root.userData.core = core;
  return root;
}

/** Specter Mirror: a faint illusory duplicate — a barely-there humanoid silhouette. */
function buildMirror(tier: RenderTier): THREE.Group {
  const body = wraith(0x3a2a5a, 0.3, 0x9a6aff);
  const glow = accent(SPECTRAL, tier, 1.2);
  const root = new THREE.Group();
  const core = new THREE.Group();
  core.position.y = 1.0;
  core.add(capsuleY(0.18, 0.55, body, 0, 0.1, 0)); // torso
  core.add(new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), body)); // head
  (core.children[1] as THREE.Mesh).position.set(0, 0.5, 0);
  core.add(box(0.04, 0.03, 0.06, glow, 0, 0.5, 0.14)); // single dim eye-slit
  for (const sx of [-1, 1]) {
    const arm = box(0.06, 0.5, 0.06, body, sx * 0.24, 0.04, 0);
    arm.rotation.z = sx * 0.3;
    core.add(arm);
  }
  root.add(core);
  for (const sx of [-1, 1]) root.add(box(0.08, 0.8, 0.1, body, sx * 0.12, 0.42, 0)); // legs
  root.userData.bodyMats = [body];
  root.userData.core = core;
  return root;
}

/** Specter Wisp: a small floating spectral orb with tendrils (fear/blur emitter). */
function buildWisp(tier: RenderTier): THREE.Group {
  const body = wraith(0x4a2a6a, 0.5, 0xb877ff);
  const glow = accent(SPECTRAL, tier, 2.1);
  const root = new THREE.Group();
  const core = new THREE.Group();
  core.position.y = 1.25; // floats
  core.add(new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), body)); // orb
  core.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), glow)); // bright core
  for (const a of [0, 1, 2, 3]) {
    const ang = (a / 4) * Math.PI * 2;
    core.add(box(0.03, 0.28, 0.03, body, Math.cos(ang) * 0.18, -0.22, Math.sin(ang) * 0.18)); // tendrils
  }
  root.add(core);
  root.userData.bodyMats = [body];
  root.userData.core = core;
  return root;
}

/** Leviathan Broodworm: a low segmented worm with a glowing maw (burrow rusher). */
function buildBroodworm(tier: RenderTier): THREE.Group {
  const body = metal(0x4a5a1a, tier, 0.5, 0.45);
  const dark = metal(0x28320e, tier, 0.55, 0.4);
  const glow = accent(VENOM, tier, 1.7);
  const root = new THREE.Group();
  const core = new THREE.Group();
  core.position.y = 0.35;
  for (let i = 0; i < 4; i++) core.add(capsuleZ(0.2 - i * 0.02, 0.24, i % 2 ? dark : body, 0, 0, 0.3 - i * 0.26)); // body segments
  core.add(coneZ(0.16, 0, 0.28, dark, 0, 0, 0.52)); // maw ring
  core.add(box(0.14, 0.14, 0.08, glow, 0, 0, 0.5)); // glowing maw
  root.add(core);
  root.userData.bodyMats = [body, dark];
  root.userData.core = core;
  return root;
}

/** Leviathan Maw-turret: an anchored fanged maw on a stubby stalk (stationary biter). */
function buildMawturret(tier: RenderTier): THREE.Group {
  const body = metal(0x3a4a18, tier, 0.5, 0.45);
  const dark = metal(0x212a0e, tier, 0.55, 0.4);
  const glow = accent(VENOM, tier, 1.8);
  const root = new THREE.Group();
  root.add(box(0.5, 0.4, 0.5, dark, 0, 0.2, 0)); // rooted base
  const core = new THREE.Group();
  core.position.y = 0.7;
  core.add(capsuleZ(0.28, 0.2, body, 0, 0, 0)); // head
  core.add(coneZ(0.24, 0, 0.34, dark, 0, 0.05, 0.3)); // gaping maw
  core.add(box(0.16, 0.16, 0.08, glow, 0, 0.02, 0.34)); // throat glow
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    core.add(coneZ(0, 0.03, 0.16, body, Math.cos(a) * 0.18, 0.02 + Math.sin(a) * 0.14, 0.32)); // fang ring
  }
  root.add(core);
  root.userData.bodyMats = [body, dark];
  root.userData.core = core;
  return root;
}

/** Leviathan Leech: a small flattened tick with a sucker mouth (drains to heal boss). */
function buildLeech(tier: RenderTier): THREE.Group {
  const body = metal(0x6a8a2a, tier, 0.45, 0.4);
  const glow = accent(VENOM, tier, 1.6);
  const root = new THREE.Group();
  const core = new THREE.Group();
  core.position.y = 0.32;
  core.add(capsuleZ(0.18, 0.34, body, 0, 0, 0)); // flat body
  core.add(coneZ(0.13, 0, 0.2, glow, 0, 0, 0.3)); // sucker mouth
  for (const sx of [-1, 1])
    for (const sz of [-0.12, 0.12]) {
      const leg = box(0.03, 0.24, 0.03, body, sx * 0.16, -0.1, sz);
      leg.rotation.z = sx * 0.6;
      core.add(leg);
    }
  root.add(core);
  root.userData.bodyMats = [body];
  root.userData.core = core;
  return root;
}

/** Monolith Shard: a floating crystal dart (fast). */
function buildShard(tier: RenderTier): THREE.Group {
  const body = metal(0x2a4a5a, tier, 0.2, 0.35);
  const glow = accent(CRYSTAL, tier, 2.0);
  const root = new THREE.Group();
  const core = new THREE.Group();
  core.position.y = 1.0; // floats
  core.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), body));
  core.add(coneZ(0, 0.14, 0.5, glow, 0, 0, 0.24)); // dart point
  root.add(core);
  root.userData.bodyMats = [body];
  root.userData.core = core;
  return root;
}

/** Monolith Resonator: a crystal node on a base with a bright beam core (turret). */
function buildResonator(tier: RenderTier): THREE.Group {
  const body = metal(0x1e3a48, tier, 0.2, 0.35);
  const dark = metal(0x142832, tier, 0.25, 0.3);
  const glow = accent(CRYSTAL, tier, 2.0);
  const root = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.1, 0.7, 4), dark);
    leg.position.set(Math.cos(a) * 0.22, 0.35, Math.sin(a) * 0.22);
    leg.rotation.z = Math.cos(a) * 0.3;
    leg.rotation.x = -Math.sin(a) * 0.3;
    root.add(leg);
  }
  const core = new THREE.Group();
  core.position.y = 0.9;
  core.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.34, 0.8, 5), body)); // crystal head
  core.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), glow)); // beam core
  root.add(core);
  root.userData.bodyMats = [body, dark];
  root.userData.core = core;
  return root;
}

/** Monolith Grower: a crystal-backed support with a bright grow-pod (repairs allies). */
function buildGrower(tier: RenderTier): THREE.Group {
  const body = metal(0x24414f, tier, 0.2, 0.35);
  const dark = metal(0x162a34, tier, 0.25, 0.3);
  const glow = accent(CRYSTAL, tier, 2.0);
  const root = new THREE.Group();
  const core = new THREE.Group();
  core.position.y = 0.7;
  core.add(box(0.44, 0.5, 0.44, body, 0, 0, 0)); // body
  for (let i = 0; i < 3; i++) core.add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.12, 0.6 + i * 0.15, 5), dark)); // back crystals
  (core.children[1] as THREE.Mesh).position.set(-0.2, 0.4, -0.15);
  (core.children[2] as THREE.Mesh).position.set(0.1, 0.5, -0.15);
  (core.children[3] as THREE.Mesh).position.set(0.24, 0.42, -0.1);
  core.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), glow)); // grow-pod
  (core.children[4] as THREE.Mesh).position.set(0, 0.1, 0.28);
  root.add(core);
  for (const sx of [-1, 1]) root.add(box(0.1, 0.5, 0.1, dark, sx * 0.16, 0.25, 0)); // legs
  root.userData.bodyMats = [body, dark];
  root.userData.core = core;
  return root;
}

/** Oblivion Rift: a dark floating gravity-well ring with a bright singular core. */
function buildRift(tier: RenderTier): THREE.Group {
  const body = metal(0x180e26, tier, 0.3, 0.25);
  const glow = accent(VOIDV, tier, 2.0);
  const root = new THREE.Group();
  const core = new THREE.Group();
  core.position.y = 1.1; // floats
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.07, 8, 24), body);
  ring.rotation.x = Math.PI * 0.4;
  core.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.04, 6, 18), glow);
  ring2.rotation.x = Math.PI * 0.4;
  core.add(ring2);
  core.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), glow)); // singularity
  root.add(core);
  root.userData.bodyMats = [body];
  root.userData.core = core;
  return root;
}

/** Oblivion Shade: a wispy dark humanoid shadow (translucent, glowing void eyes). */
function buildShade(tier: RenderTier): THREE.Group {
  const body = wraith(0x120a1e, 0.4, 0xc98bff);
  const glow = accent(VOIDV, tier, 1.7);
  const root = new THREE.Group();
  const core = new THREE.Group();
  core.position.y = 1.0;
  core.add(capsuleY(0.2, 0.5, body, 0, 0.1, 0)); // torso
  core.add(new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), body)); // head
  (core.children[1] as THREE.Mesh).position.set(0, 0.5, 0);
  core.add(box(0.04, 0.03, 0.06, glow, -0.06, 0.5, 0.14)); // eyes
  core.add(box(0.04, 0.03, 0.06, glow, 0.06, 0.5, 0.14));
  for (const sx of [-1, 1]) {
    const arm = box(0.06, 0.55, 0.06, body, sx * 0.24, 0.02, 0);
    arm.rotation.z = sx * 0.32;
    core.add(arm);
  }
  root.add(core);
  for (const sx of [-1, 1]) root.add(box(0.07, 0.7, 0.09, body, sx * 0.12, 0.4, 0)); // wispy legs
  root.userData.bodyMats = [body];
  root.userData.core = core;
  return root;
}

/** Oblivion Devourer: a low void crawler with a wide fanged maw. */
function buildDevourer(tier: RenderTier): THREE.Group {
  const body = metal(0x0e0818, tier, 0.3, 0.3);
  const dark = metal(0x060310, tier, 0.35, 0.25);
  const glow = accent(VOIDV, tier, 1.8);
  const root = new THREE.Group();
  const core = new THREE.Group();
  core.position.y = 0.4;
  core.add(box(0.5, 0.34, 0.5, body, 0, 0, 0)); // bulk
  core.add(box(0.56, 0.24, 0.2, dark, 0, -0.02, 0.32)); // wide maw
  for (let i = 0; i < 5; i++) core.add(coneZ(0, 0.035, 0.14, glow, -0.2 + i * 0.1, 0.02, 0.42)); // teeth
  core.add(box(0.06, 0.05, 0.05, glow, -0.14, 0.14, 0.26)); // eyes
  core.add(box(0.06, 0.05, 0.05, glow, 0.14, 0.14, 0.26));
  for (const sx of [-1, 1])
    for (const sz of [-0.16, 0.16]) {
      const leg = box(0.05, 0.34, 0.05, dark, sx * 0.28, -0.16, sz);
      leg.rotation.z = sx * 0.6;
      core.add(leg);
    }
  root.add(core);
  root.userData.bodyMats = [body, dark];
  root.userData.core = core;
  return root;
}

/** Colossus Warframe: a boxy heavy mech with an arm-cannon + visor (ranged tank). */
function buildWarframe(tier: RenderTier): THREE.Group {
  const body = metal(0x5a5a64, tier, 0.5, 0.7);
  const dark = metal(0x2e2e34, tier, 0.55, 0.65);
  const glow = accent(HAZARD, tier, 1.7);
  const root = new THREE.Group();
  const core = new THREE.Group();
  core.position.y = 0.95;
  core.add(box(0.6, 0.7, 0.5, body, 0, 0, 0)); // chest
  core.add(box(0.4, 0.3, 0.4, dark, 0, 0.5, 0.02)); // head block
  core.add(box(0.28, 0.1, 0.08, glow, 0, 0.52, 0.22)); // visor
  core.add(box(0.16, 0.16, 0.6, dark, 0.4, 0.05, 0.15)); // arm cannon
  core.add(box(0.14, 0.14, 0.1, glow, 0.4, 0.05, 0.47)); // muzzle
  core.add(box(0.2, 0.5, 0.2, body, -0.42, -0.05, 0)); // other arm
  root.add(core);
  for (const sx of [-1, 1]) root.add(box(0.22, 0.7, 0.24, dark, sx * 0.2, 0.35, 0)); // legs
  root.userData.bodyMats = [body, dark];
  root.userData.core = core;
  return root;
}

/** Colossus Artillery drone: a hovering shell-lobber with an upward mortar tube. */
function buildArtillery(tier: RenderTier): THREE.Group {
  const body = metal(0x4a4a52, tier, 0.5, 0.65);
  const dark = metal(0x26262c, tier, 0.55, 0.6);
  const glow = accent(HAZARD, tier, 1.8);
  const root = new THREE.Group();
  const core = new THREE.Group();
  core.position.y = 1.0; // hovers
  core.add(box(0.5, 0.4, 0.5, body, 0, 0, 0)); // body
  core.add(cylY(0.13, 0.5, dark, 0, 0.4, 0)); // mortar tube (points up)
  core.add(box(0.16, 0.08, 0.16, glow, 0, 0.66, 0)); // muzzle glow
  for (const a of [0, 1, 2, 3]) {
    const ang = (a / 4) * Math.PI * 2;
    core.add(box(0.05, 0.2, 0.05, dark, Math.cos(ang) * 0.22, -0.24, Math.sin(ang) * 0.22)); // thruster legs
  }
  root.add(core);
  root.userData.bodyMats = [body, dark];
  root.userData.core = core;
  return root;
}

/** Colossus Fabricator: a squat welder-drone with a bright repair torch (heals mechs). */
function buildFabricator(tier: RenderTier): THREE.Group {
  const body = metal(0x6a5a3a, tier, 0.5, 0.6);
  const dark = metal(0x342c1c, tier, 0.55, 0.55);
  const glow = accent(0xffd24a, tier, 2.0); // welding torch
  const root = new THREE.Group();
  const core = new THREE.Group();
  core.position.y = 0.7;
  core.add(box(0.5, 0.44, 0.5, body, 0, 0, 0)); // body
  core.add(box(0.16, 0.16, 0.14, glow, 0, 0.1, 0.28)); // sensor eye
  for (const sx of [-1, 1]) {
    core.add(box(0.1, 0.1, 0.4, dark, sx * 0.3, 0.05, 0.16)); // welder arms
    core.add(box(0.08, 0.08, 0.1, glow, sx * 0.3, 0.05, 0.4)); // torch tips
  }
  root.add(core);
  for (const sx of [-1, 1]) root.add(box(0.1, 0.5, 0.1, dark, sx * 0.18, 0.25, 0)); // legs
  root.userData.bodyMats = [body, dark];
  root.userData.core = core;
  return root;
}

/** Chimera Splice: a small asymmetric mutant with mismatched claws (fast melee). */
function buildSplice(tier: RenderTier): THREE.Group {
  const body = metal(0x7a2a5a, tier, 0.5, 0.35);
  const dark = metal(0x3a1430, tier, 0.55, 0.35);
  const glow = accent(FLESH, tier, 1.7);
  const root = new THREE.Group();
  const core = new THREE.Group();
  core.position.y = 0.5;
  core.add(capsuleZ(0.24, 0.3, body, 0, 0, 0)); // lumpy body
  core.add(box(0.2, 0.18, 0.16, dark, 0.14, 0.14, 0.1)); // asymmetric growth
  core.add(box(0.05, 0.04, 0.05, glow, -0.08, 0.1, 0.24)); // eyes
  core.add(box(0.05, 0.04, 0.05, glow, 0.08, 0.1, 0.24));
  core.add(box(0.06, 0.4, 0.06, dark, -0.26, 0, 0.05)); // long claw arm
  core.add(box(0.08, 0.24, 0.08, body, 0.24, 0.02, 0.05)); // short claw arm
  root.add(core);
  for (const sx of [-1, 1]) root.add(box(0.07, 0.42, 0.08, body, sx * 0.14, 0.21, 0)); // legs
  root.userData.bodyMats = [body, dark];
  root.userData.core = core;
  return root;
}

/** Chimera Gene-pod: a rooted fleshy pod that spits adaptive bolts (turret). */
function buildGenepod(tier: RenderTier): THREE.Group {
  const body = metal(0x5a2a4a, tier, 0.5, 0.3);
  const dark = metal(0x2e1428, tier, 0.55, 0.3);
  const glow = accent(FLESH, tier, 2.0);
  const root = new THREE.Group();
  root.add(box(0.5, 0.3, 0.5, dark, 0, 0.15, 0)); // rooted base
  const core = new THREE.Group();
  core.position.y = 0.65;
  core.add(new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), body)); // pod
  core.add(box(0.2, 0.24, 0.12, glow, 0, 0.02, 0.3)); // glowing orifice
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    core.add(box(0.05, 0.3, 0.05, dark, Math.cos(a) * 0.2, 0.28, Math.sin(a) * 0.2)); // sinew struts
  }
  root.add(core);
  root.userData.bodyMats = [body, dark];
  root.userData.core = core;
  return root;
}

/** Chimera Regenerator: a bio-support with a pulsing graft-sac (heals allies). */
function buildRegenerator(tier: RenderTier): THREE.Group {
  const body = metal(0x6a3a5a, tier, 0.5, 0.3);
  const dark = metal(0x341c2c, tier, 0.55, 0.3);
  const glow = accent(0xff8adf, tier, 2.0); // graft-glow
  const root = new THREE.Group();
  const core = new THREE.Group();
  core.position.y = 0.72;
  core.rotation.x = 0.2;
  core.add(capsuleZ(0.3, 0.4, body, 0, 0, 0)); // body
  core.add(coneZ(0, 0.12, 0.3, dark, 0, 0.06, 0.34)); // head
  core.add(new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), glow)); // graft-sac
  (core.children[2] as THREE.Mesh).position.set(0, 0.28, -0.18);
  core.add(box(0.05, 0.04, 0.05, glow, -0.1, 0.1, 0.42)); // eyes
  core.add(box(0.05, 0.04, 0.05, glow, 0.1, 0.1, 0.42));
  root.add(core);
  for (const sx of [-1, 1]) root.add(box(0.1, 0.55, 0.12, dark, sx * 0.2, 0.28, 0)); // legs
  root.userData.bodyMats = [body, dark];
  root.userData.core = core;
  return root;
}

/** Oracle Echo: a translucent floating time-clone — a small fractal bud (ranged). */
function buildEcho(tier: RenderTier): THREE.Group {
  const body = wraith(0x2a2440, 0.4, 0xffd98a);
  const glow = accent(TEMPORAL, tier, 1.9);
  const root = new THREE.Group();
  const core = new THREE.Group();
  core.position.y = 1.1; // floats
  core.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), body));
  core.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), glow));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    core.add(coneZ(0, 0.06, 0.34, body, Math.cos(a) * 0.22, 0, Math.sin(a) * 0.22)); // petal buds
  }
  root.add(core);
  root.userData.bodyMats = [body];
  root.userData.core = core;
  return root;
}

/** Oracle Mote: a low hovering slow-field emitter — a ringed lantern. */
function buildMote(tier: RenderTier): THREE.Group {
  const body = metal(0x3a3458, tier, 0.4, 0.5);
  const glow = accent(TEMPORAL, tier, 2.0);
  const root = new THREE.Group();
  const core = new THREE.Group();
  core.position.y = 0.9; // hovers
  core.add(capsuleY(0.16, 0.14, body, 0, 0, 0)); // lantern body
  core.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), glow)); // glow heart
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.03, 6, 20), glow);
  ring.rotation.x = Math.PI * 0.5;
  core.add(ring);
  root.add(core);
  root.userData.bodyMats = [body];
  root.userData.core = core;
  return root;
}

/** Oracle Seer: a tall robed marker with a glowing single eye (buffs the choir's aim). */
function buildSeer(tier: RenderTier): THREE.Group {
  const body = metal(0x4a4030, tier, 0.5, 0.4);
  const dark = metal(0x28221a, tier, 0.55, 0.4);
  const glow = accent(TEMPORAL, tier, 2.0);
  const root = new THREE.Group();
  const core = new THREE.Group();
  core.position.y = 0.5;
  const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.4, 1.0, 7), body); // upright robe (wide base)
  robe.position.y = 0.1;
  core.add(robe);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), dark);
  head.position.y = 0.7;
  core.add(head);
  core.add(box(0.16, 0.16, 0.1, glow, 0, 0.72, 0.16)); // single eye
  root.add(core);
  root.userData.bodyMats = [body, dark];
  root.userData.core = core;
  return root;
}

/** Infestor Spawnling: a tiny fast parasite with a snapping maw (rush + infect). */
function buildSpawnling(tier: RenderTier): THREE.Group {
  const body = metal(0x3a4a1a, tier, 0.55, 0.3);
  const glow = accent(OOZE, tier, 1.7);
  const root = new THREE.Group();
  const core = new THREE.Group();
  core.position.y = 0.3;
  core.add(capsuleZ(0.16, 0.24, body, 0, 0, 0)); // little body
  core.add(coneZ(0.12, 0, 0.2, glow, 0, 0, 0.28)); // maw
  for (const sx of [-1, 1])
    for (const sz of [-0.1, 0.1]) {
      const leg = box(0.03, 0.2, 0.03, body, sx * 0.14, -0.1, sz);
      leg.rotation.z = sx * 0.6;
      core.add(leg);
    }
  root.add(core);
  root.userData.bodyMats = [body];
  root.userData.core = core;
  return root;
}

/** Infestor Host: a bloated husk swollen with spawn (bursts on contact). */
function buildHost(tier: RenderTier): THREE.Group {
  const body = metal(0x2e3a18, tier, 0.6, 0.3);
  const glow = accent(OOZE, tier, 1.9);
  const root = new THREE.Group();
  const core = new THREE.Group();
  core.position.y = 0.7;
  core.add(new THREE.Mesh(new THREE.SphereGeometry(0.44, 10, 8), body)); // bloated body
  for (const [ex, ey, ez] of [
    [0.18, 0.1, 0.34],
    [-0.16, 0.2, 0.32],
    [0.02, 0.32, 0.3],
    [0.24, -0.12, 0.26],
  ] as [number, number, number][])
    core.add(box(0.09, 0.09, 0.09, glow, ex, ey, ez)); // glowing pustules
  root.add(core);
  for (const sx of [-1, 1]) root.add(box(0.09, 0.4, 0.1, body, sx * 0.16, 0.2, 0)); // stubby legs
  root.userData.bodyMats = [body];
  root.userData.core = core;
  return root;
}

/** Infestor Latcher: a flat clinging parasite with a barbed sucker (heals the boss). */
function buildLatcher(tier: RenderTier): THREE.Group {
  const body = metal(0x5a6a2a, tier, 0.5, 0.3);
  const glow = accent(OOZE, tier, 1.7);
  const root = new THREE.Group();
  const core = new THREE.Group();
  core.position.y = 0.3;
  core.add(capsuleZ(0.16, 0.3, body, 0, 0, 0)); // flat body
  core.add(coneZ(0.14, 0, 0.22, glow, 0, 0, 0.28)); // barbed sucker
  core.add(box(0.04, 0.03, 0.05, glow, -0.08, 0.06, 0.1)); // eyes
  core.add(box(0.04, 0.03, 0.05, glow, 0.08, 0.06, 0.1));
  for (const sx of [-1, 1])
    for (const sz of [-0.12, 0.12]) {
      const leg = box(0.03, 0.22, 0.03, body, sx * 0.15, -0.09, sz);
      leg.rotation.z = sx * 0.7;
      core.add(leg);
    }
  root.add(core);
  root.userData.bodyMats = [body];
  root.userData.core = core;
  return root;
}

export function buildMinionModel(kind: MinionKind, tier: RenderTier): THREE.Group {
  if (kind === 'broodling') return buildBroodling(tier);
  if (kind === 'spitter') return buildSpitter(tier);
  if (kind === 'stalker') return buildStalker(tier);
  if (kind === 'crawler') return buildCrawler(tier);
  if (kind === 'spore') return buildSpore(tier);
  if (kind === 'facet') return buildFacet(tier);
  if (kind === 'constructor') return buildConstructor(tier);
  if (kind === 'sentry') return buildSentry(tier);
  if (kind === 'rampart') return buildRampart(tier);
  if (kind === 'grazer') return buildGrazer(tier);
  if (kind === 'sporeback') return buildSporeback(tier);
  if (kind === 'phantom') return buildPhantom(tier);
  if (kind === 'mirror') return buildMirror(tier);
  if (kind === 'wisp') return buildWisp(tier);
  if (kind === 'broodworm') return buildBroodworm(tier);
  if (kind === 'mawturret') return buildMawturret(tier);
  if (kind === 'leech') return buildLeech(tier);
  if (kind === 'shard') return buildShard(tier);
  if (kind === 'resonator') return buildResonator(tier);
  if (kind === 'grower') return buildGrower(tier);
  if (kind === 'rift') return buildRift(tier);
  if (kind === 'shade') return buildShade(tier);
  if (kind === 'devourer') return buildDevourer(tier);
  if (kind === 'warframe') return buildWarframe(tier);
  if (kind === 'artillery') return buildArtillery(tier);
  if (kind === 'fabricator') return buildFabricator(tier);
  if (kind === 'splice') return buildSplice(tier);
  if (kind === 'genepod') return buildGenepod(tier);
  if (kind === 'regenerator') return buildRegenerator(tier);
  if (kind === 'echo') return buildEcho(tier);
  if (kind === 'mote') return buildMote(tier);
  if (kind === 'seer') return buildSeer(tier);
  if (kind === 'spawnling') return buildSpawnling(tier);
  if (kind === 'host') return buildHost(tier);
  if (kind === 'latcher') return buildLatcher(tier);
  return buildSentinel(tier);
}

/** Per-frame minion animation: a gait/idle sway on the core + a red hit-flash. */
export function poseMinion(model: THREE.Group, _kind: MinionKind, moving: boolean, step: number, hitFlash: number, now: number): void {
  const core = model.userData.core as THREE.Group | undefined;
  if (core) {
    const t = now * 0.001;
    core.rotation.z = Math.sin(t * 2 + step) * (moving ? 0.12 : 0.04);
    core.position.y = (core.userData.baseY ??= core.position.y) + (moving ? Math.abs(Math.sin(step * 2)) * 0.08 : 0);
  }
  const mats = model.userData.bodyMats as THREE.Material[] | undefined;
  if (mats) {
    const hf = hitFlash > 0 ? Math.min(1, hitFlash / 0.12) : 0;
    for (const m of mats) {
      const sm = m as THREE.MeshStandardMaterial;
      if (sm.emissive) sm.emissive.setRGB(hf * 0.8, hf * 0.12, hf * 0.12);
    }
  }
}
