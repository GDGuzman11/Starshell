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
import { accent, box, capsuleZ, coneZ, cylZ, metal } from '../models/parts';
import type { BossKind } from '../enemy';

export interface BossParts {
  head: THREE.Group;
  torso: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  tail: THREE.Group;
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

/** Build the 3D model for a boss, or null to keep the legacy sprite (Warlord +
 *  Kraken until P2/P3). */
export function buildBossModel(kind: BossKind, tier: RenderTier): THREE.Group | null {
  if (kind === 'xeno') return buildXenomorph(tier);
  return null;
}
