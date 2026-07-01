/**
 * 3D boss models — low-poly, primitives only (same parts toolkit as the guns +
 * enemy classes; zero asset files). Built feet-at-y=0, forward = +Z, with named
 * `userData.parts` joints so `fps/boss/animator.ts` can pose them, and
 * `userData.bodyMats` for the hit-flash emissive. Bosses are scaled up at mount.
 *
 * Decision (Gabe, 2026-06-30): bosses are 3D models to match their 3D minions,
 * replacing the old 2D `bossTex` sprites. Built one boss at a time — Xenomorph
 * first (P1 slice); Warlord + Kraken land in P2/P3, until then they fall back to
 * the existing sprite via `buildBossModel` returning null.
 *
 * Imported ONLY by the /arcade chunk — never the homepage tree.
 */
import * as THREE from 'three';
import type { RenderTier } from '../materials';
import { accent, box, capsuleY, capsuleZ, coneZ, cylZ, metal, wraith } from '../models/parts';
import { buildHumanoid } from '../enemies/models/humanoid';
import type { BossKind } from '../enemy';

export interface BossParts {
  head?: THREE.Group;
  torso?: THREE.Group;
  legL?: THREE.Group; // humanoid / xeno
  legR?: THREE.Group;
  tail?: THREE.Group; // Xenomorph
  ring?: THREE.Group; // ARCHON light-ring (spun)
  orbit?: THREE.Group; // ARCHON orbiting facets (counter-spun)
  core?: THREE.Group; // exposed core group (weak point)
  legs?: THREE.Group[]; // BEHEMOTH quadruped legs (diagonal gait)
}

/** XENOMORPH — the Hive Hunter. Black glossy biomechanical predator: elongated
 *  dome skull, hunched ribbed torso with a glowing acid throat sac, digitigrade
 *  legs, long clawed arms, and a segmented bladed tail. */
function buildXenomorph(tier: RenderTier): THREE.Group {
  const body = metal(0x0c0e12, tier, 0.32, 0.9); // black glossy carapace
  const dark = metal(0x06070a, tier, 0.42, 0.85);
  const glow = accent(0x5cff86, tier, 1.7); // acid green
  const bodyMats: THREE.Material[] = [body, dark];

  const root = new THREE.Group();
  const hipY = 1.0;

  // ── digitigrade legs ────────────────────────────────────────────────────────
  const mkLeg = (sx: number): THREE.Group => {
    const g = new THREE.Group();
    g.position.set(sx, hipY, 0);
    g.add(box(0.16, 0.6, 0.2, body, 0, -0.3, 0.06)); // thigh forward
    g.add(box(0.13, 0.55, 0.16, dark, 0, -0.78, -0.1)); // shin back
    g.add(box(0.14, 0.08, 0.42, dark, 0, -1.04, 0.12)); // long clawed foot
    return g;
  };
  const legL = mkLeg(-0.28);
  const legR = mkLeg(0.28);

  // ── hunched ribbed torso ────────────────────────────────────────────────────
  const torso = new THREE.Group();
  torso.position.set(0, hipY, 0);
  torso.rotation.x = 0.34; // forward hunch
  torso.add(capsuleZ(0.34, 0.5, body, 0, 0.34, 0)); // core
  for (let i = 0; i < 4; i++) torso.add(box(0.42 - i * 0.05, 0.05, 0.06, dark, 0, 0.18 + i * 0.12, 0.22 - i * 0.03)); // ribs
  const throat = box(0.18, 0.16, 0.12, glow, 0, 0.16, 0.26); // acid throat sac (glows on windup)
  throat.name = 'throat';
  torso.add(throat);
  for (const sgn of [-1, 1]) {
    const t = cylZ(0.05, 0.5, dark, sgn * 0.12, 0.5, -0.18); // dorsal back tubes
    t.rotation.x = -0.5;
    torso.add(t);
  }

  // ── elongated dome head ─────────────────────────────────────────────────────
  const head = new THREE.Group();
  head.position.set(0, 0.62, 0.1);
  head.rotation.x = 0.2;
  head.add(coneZ(0, 0.16, 0.52, dark, 0, 0.02, 0.06)); // elongated skull (points back)
  head.add(box(0.16, 0.12, 0.32, body, 0, -0.02, 0.06)); // jaw
  head.add(box(0.05, 0.04, 0.12, glow, 0, 0, 0.2)); // inner-mouth glow
  torso.add(head);

  // ── long clawed arms ────────────────────────────────────────────────────────
  const mkArm = (sx: number): THREE.Group => {
    const g = new THREE.Group();
    g.position.set(sx, 0.5, 0.04);
    g.add(box(0.1, 0.5, 0.1, body, 0, -0.26, 0.04));
    g.add(box(0.08, 0.4, 0.08, dark, 0, -0.6, 0.08));
    for (const c of [-0.05, 0, 0.05]) g.add(box(0.02, 0.18, 0.03, glow, c, -0.86, 0.14)); // claws
    return g;
  };
  torso.add(mkArm(-0.34), mkArm(0.34));

  // ── segmented bladed tail ───────────────────────────────────────────────────
  const tail = new THREE.Group();
  tail.position.set(0, hipY * 0.92, -0.1);
  let seg: THREE.Group = tail;
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Group();
    s.position.set(0, 0, -0.28);
    s.rotation.x = 0.16;
    s.add(box(0.13 - i * 0.02, 0.13 - i * 0.02, 0.28, i % 2 ? dark : body, 0, 0, -0.14));
    seg.add(s);
    seg = s;
  }
  seg.add(coneZ(0.08, 0, 0.34, glow, 0, 0, -0.3)); // green blade tip
  root.add(tail);

  root.add(legL, legR, torso);
  root.userData.parts = { head, torso, legL, legR, tail } satisfies BossParts;
  root.userData.bodyMats = bodyMats;
  root.userData.hipY = hipY;
  return root;
}

/** WARLORD — the Battlefield Commander. A towering armored humanoid (reuses the
 *  shared humanoid rig): bronze/gold armor, big shoulder plates, orange visor +
 *  command core, heavy arm-cannon, crest, antenna, and a back reactor spine. */
function buildWarlord(tier: RenderTier): THREE.Group {
  return buildHumanoid({
    tier,
    scale: 1.15,
    girth: 1.35,
    accent: 0xff9a3a, // orange visor + command core glow
    body: 0x8a6a2a, // bronze/gold commander armor
    dark: 0x3a2e16,
    legs: 'thick',
    shoulders: 1.0,
    heavyArms: true,
    weapon: 'cannon',
    backpack: 'reactor',
    antenna: 2,
    crest: true,
    spine: true,
  });
}

/** Deployable destructible objects (no AI): the Warlord's Command Beacon (a
 *  glowing pylon that buffs the legion) and Shield Wall (a wide blocking panel). */
export function buildDestructibleModel(kind: 'beacon' | 'shield', tier: RenderTier): THREE.Group {
  const root = new THREE.Group();
  const glow = accent(0xff9a3a, tier, 2.0);
  if (kind === 'beacon') {
    const dark = metal(0x2a2620, tier, 0.5, 0.7);
    root.add(box(0.6, 0.24, 0.6, dark, 0, 0.12, 0)); // base
    root.add(box(0.16, 1.4, 0.16, dark, 0, 0.9, 0)); // pylon
    const core = box(0.34, 0.44, 0.34, glow, 0, 1.7, 0); // glowing command core
    core.name = 'core';
    root.add(core);
    root.userData.bodyMats = [dark];
  } else {
    const dark = metal(0x3a2e16, tier, 0.5, 0.75);
    root.add(box(2.8, 2.2, 0.3, dark, 0, 1.1, 0)); // wide shield panel
    root.add(box(2.8, 0.12, 0.34, glow, 0, 2.05, 0)); // glowing rim
    root.userData.bodyMats = [dark];
  }
  return root;
}

/** KRAKEN — the Living Arena. A huge purple/black mantle with glowing eyes, an
 *  exposed violet core (weak point), and six writhing tentacles with bright tips. */
function buildKraken(tier: RenderTier): THREE.Group {
  const body = metal(0x2a1840, tier, 0.42, 0.65);
  const dark = metal(0x140a22, tier, 0.5, 0.6);
  const glow = accent(0xc08bff, tier, 1.9); // void violet
  const root = new THREE.Group();

  // Bulbous mantle.
  const torso = new THREE.Group();
  torso.position.y = 1.5;
  torso.add(capsuleZ(0.62, 0.5, body, 0, 0, 0));
  torso.add(box(0.1, 0.13, 0.06, glow, -0.24, 0.05, 0.46)); // eyes
  torso.add(box(0.1, 0.13, 0.06, glow, 0.24, 0.05, 0.46));
  const core = box(0.32, 0.32, 0.2, glow, 0, -0.24, 0.4); // exposed core (weak point)
  core.name = 'core';
  torso.add(core);
  root.add(torso);

  // Six writhing tentacles radiating from the base.
  const tentacles: THREE.Group[] = [];
  const N = 6;
  for (let i = 0; i < N; i++) {
    const t = new THREE.Group();
    t.rotation.y = (i / N) * Math.PI * 2;
    t.position.y = 0.95;
    let seg: THREE.Group = t;
    let r = 0.17;
    for (let k = 0; k < 4; k++) {
      const s = new THREE.Group();
      s.position.set(0, -0.12, 0.32);
      s.rotation.x = 0.5;
      s.add(box(r, r, 0.34, k % 2 ? dark : body, 0, 0, 0.17));
      seg.add(s);
      seg = s;
      r *= 0.78;
    }
    seg.add(box(0.07, 0.07, 0.22, glow, 0, 0, 0.13)); // glowing claw tip
    tentacles.push(t);
    root.add(t);
  }

  root.userData.parts = { torso } satisfies BossParts;
  root.userData.tentacles = tentacles;
  root.userData.bodyMats = [body, dark];
  return root;
}

/** ARCHON — Ancient AI. A hovering black octahedral core inside a slow rotating
 *  light-ring, with a counter-spun cluster of orbiting facets. No legs — it floats.
 *  Machine-blue glow; the inner core is the exposed weak point after a blink. */
function buildArchon(tier: RenderTier): THREE.Group {
  const body = metal(0x0a0c14, tier, 0.3, 0.9); // obsidian machine shell
  const dark = metal(0x141824, tier, 0.42, 0.8);
  const glow = accent(0x49a6ff, tier, 2.0); // machine blue
  const root = new THREE.Group();
  const cy = 1.7; // hover height

  const core = new THREE.Group();
  core.position.y = cy;
  core.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0), body)); // faceted shell
  const inner = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), glow);
  inner.name = 'core';
  core.add(inner);
  root.add(core);

  const ring = new THREE.Group();
  ring.position.y = cy;
  const torus = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.06, 8, 32), glow);
  torus.rotation.x = Math.PI * 0.42;
  ring.add(torus);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ring.add(box(0.14, 0.14, 0.14, dark, Math.cos(a) * 0.95, 0, Math.sin(a) * 0.95));
  }
  root.add(ring);

  const orbit = new THREE.Group();
  orbit.position.y = cy;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), dark);
    m.position.set(Math.cos(a) * 1.35, 0, Math.sin(a) * 1.35);
    orbit.add(m);
  }
  root.add(orbit);
  root.add(box(0.5, 0.06, 0.5, glow, 0, 0.05, 0)); // faint hover disc (no legs)

  root.userData.parts = { ring, orbit, core } satisfies BossParts;
  root.userData.bodyMats = [body, dark];
  return root;
}

/** BEHEMOTH — Planet Siege Beast / Living Fortress. A massive armored QUADRUPED
 *  with fortress structures grown on its back, a low horned head, and a glowing
 *  molten weak-plate on its rear flank (exposed after a stomp). Sandstone armor. */
function buildBehemoth(tier: RenderTier): THREE.Group {
  const body = metal(0x5a4a34, tier, 0.75, 0.35); // sandstone armor
  const dark = metal(0x2e2418, tier, 0.72, 0.3);
  const glow = accent(0xffb14a, tier, 1.7); // molten core
  const root = new THREE.Group();
  const hipY = 1.5;

  // Bulk armored hull + upper deck.
  const torso = new THREE.Group();
  torso.position.y = hipY;
  torso.add(box(1.9, 1.1, 2.7, body, 0, 0, 0)); // main hull
  torso.add(box(1.6, 0.5, 2.3, dark, 0, 0.7, 0)); // upper deck
  // Fortress structures grown on the back (little towers + spikes).
  torso.add(box(0.42, 0.9, 0.42, dark, -0.55, 1.15, -0.55));
  torso.add(box(0.42, 1.15, 0.42, dark, 0.5, 1.28, 0.25));
  for (const [sx, sz] of [[-0.55, 0.7], [0.6, -0.7], [0, 0.95]]) torso.add(coneZ(0, 0.16, 0.6, dark, sx, 1.0, sz)); // ridge spikes
  // Molten shed-plate weak core on the rear flank.
  const core = box(0.7, 0.6, 0.32, glow, 0, 0.35, -1.42);
  core.name = 'core';
  torso.add(core);
  root.add(torso);

  // Low horned head at the front.
  const head = new THREE.Group();
  head.position.set(0, hipY - 0.25, 1.55);
  head.add(box(0.95, 0.75, 0.85, dark, 0, 0, 0));
  head.add(box(0.12, 0.1, 0.1, glow, -0.27, 0.12, 0.44)); // eyes
  head.add(box(0.12, 0.1, 0.1, glow, 0.27, 0.12, 0.44));
  head.add(coneZ(0, 0.09, 0.4, body, -0.32, 0.3, 0.2)); // horns
  head.add(coneZ(0, 0.09, 0.4, body, 0.32, 0.3, 0.2));
  root.add(head);

  // Four pillar legs (diagonal-trot gait posed in the animator).
  const legs: THREE.Group[] = [];
  for (const [lx, lz] of [[-0.85, 1.05], [0.85, 1.05], [-0.85, -1.05], [0.85, -1.05]]) {
    const g = new THREE.Group();
    g.position.set(lx, hipY, lz);
    g.add(box(0.38, 1.0, 0.38, dark, 0, -0.55, 0)); // upper
    g.add(box(0.32, 0.85, 0.32, body, 0, -1.2, 0.04)); // lower
    g.add(box(0.46, 0.22, 0.54, dark, 0, -1.6, 0.08)); // foot
    legs.push(g);
    root.add(g);
  }

  root.userData.parts = { torso, head, legs } satisfies BossParts;
  root.userData.bodyMats = [body, dark];
  root.userData.hipY = hipY;
  return root;
}

/** SPECTER — Stealth Civilization. An impossibly THIN, TALL wraith of translucent
 *  plates that flicker (opacity posed in the animator); elongated skull, long claw
 *  arms, trailing wisps instead of legs (it hovers). Goes solid + flashing right
 *  after a phase-strike (the weak-point window). */
function buildSpecter(tier: RenderTier): THREE.Group {
  const body = wraith(0x2a1a44, 0.5, 0xb877ff); // spectral violet ghost plate
  const dark = wraith(0x18102c, 0.45, 0x8844ff);
  const glow = accent(0xd7a6ff, tier, 2.1); // bright spectral eyes (opaque)
  const root = new THREE.Group();

  // Tall thin floating torso.
  const torso = new THREE.Group();
  torso.position.y = 2.0;
  torso.add(capsuleY(0.2, 1.1, body, 0, 0, 0)); // elongated core
  for (let i = 0; i < 3; i++) torso.add(box(0.5 - i * 0.08, 0.05, 0.08, dark, 0, 0.2 - i * 0.28, 0.14)); // chest ribs

  // Elongated skull with glowing slit eyes.
  const head = new THREE.Group();
  head.position.set(0, 0.9, 0.06);
  head.add(coneZ(0, 0.16, 0.6, dark, 0, 0, -0.1)); // skull points back
  head.add(box(0.04, 0.14, 0.05, glow, -0.09, 0.02, 0.16)); // slit eyes
  head.add(box(0.04, 0.14, 0.05, glow, 0.09, 0.02, 0.16));
  torso.add(head);

  // Long thin claw arms.
  for (const sx of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(sx * 0.28, 0.35, 0.04);
    arm.rotation.z = sx * 0.35;
    arm.add(box(0.07, 0.9, 0.07, body, 0, -0.45, 0));
    for (const c of [-0.05, 0, 0.05]) arm.add(box(0.02, 0.22, 0.03, glow, c, -0.98, 0.02)); // claws
    torso.add(arm);
  }

  // Trailing wisps (no solid legs — it hovers).
  const wisps: THREE.Group[] = [];
  for (const sx of [-0.16, 0, 0.16]) {
    const w = new THREE.Group();
    w.position.set(sx, -0.55, 0);
    let seg: THREE.Group = w;
    let r = 0.13;
    for (let k = 0; k < 4; k++) {
      const s = new THREE.Group();
      s.position.set(0, -0.28, 0);
      s.add(box(r, 0.28, r, k % 2 ? dark : body, 0, -0.14, 0));
      seg.add(s);
      seg = s;
      r *= 0.75;
    }
    wisps.push(w);
    torso.add(w);
  }
  root.add(torso);

  root.userData.parts = { torso, head, core: head } satisfies BossParts;
  root.userData.wisps = wisps;
  root.userData.bodyMats = [body, dark];
  return root;
}

/** Build the 3D model for a boss. */
export function buildBossModel(kind: BossKind, tier: RenderTier): THREE.Group | null {
  if (kind === 'xeno') return buildXenomorph(tier);
  if (kind === 'warrior') return buildWarlord(tier);
  if (kind === 'octopus') return buildKraken(tier);
  if (kind === 'archon') return buildArchon(tier);
  if (kind === 'behemoth') return buildBehemoth(tier);
  if (kind === 'specter') return buildSpecter(tier);
  return null;
}
