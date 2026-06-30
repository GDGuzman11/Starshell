/**
 * Parameterized low-poly humanoid — the shared base for all 10 enemy classes.
 * Same RIG as the trooper (named hip/torso/leg/arm/weapon joints) so one animator
 * poses every class, but the proportions, leg style, armor, weapon and back-mounted
 * gear are all option-driven so each class has an instantly-distinct SILHOUETTE.
 * Forward = +Z, feet at y=0. Sets `userData.parts` + `userData.bodyMats`.
 */
import * as THREE from 'three';
import type { RenderTier } from '../../materials';
import { accent, box, cylY, cylZ, metal } from '../../models/parts';
import type { EnemyParts } from './trooper';

export interface HumanoidOpts {
  tier: RenderTier;
  scale?: number; // overall height (1 ≈ 1.8 m)
  girth?: number; // torso/limb width
  accent: number; // visor + core glow
  body?: number; // armor colour
  dark?: number; // secondary dark colour
  legs?: 'normal' | 'digi' | 'piston' | 'thick';
  shoulders?: number; // shoulder-plate size (0 = none)
  heavyArms?: boolean;
  weapon?: 'rifle' | 'long' | 'shotgun' | 'beltfed' | 'cannon' | 'claws' | 'none';
  backpack?: 'none' | 'ammo' | 'tech' | 'reactor';
  fins?: boolean; // back targeting fins
  crest?: boolean; // head crest
  antenna?: number;
  missilePods?: boolean;
  spine?: boolean; // tall reactor spine
  drones?: number; // floating drones above the shoulders
  hunch?: number; // forward torso lean (rad)
}

export function buildHumanoid(o: HumanoidOpts): THREE.Group {
  const tier = o.tier;
  const S = o.scale ?? 1;
  const G = o.girth ?? 1;
  const armorC = o.body ?? 0x363b43;
  const darkC = o.dark ?? 0x191b1f;
  const armor = metal(armorC, tier);
  const dark = metal(darkC, tier);
  const gun = metal(0x1a1d24, tier);
  const glow = accent(o.accent, tier, 1.4);
  const bodyMats = [armor, dark, gun];

  const root = new THREE.Group();
  const hipY = 0.9 * S;

  // ── legs ───────────────────────────────────────────────────────────────────
  const mkLeg = (sx: number): THREE.Group => {
    const g = new THREE.Group();
    g.position.set(sx, hipY, 0);
    const style = o.legs ?? 'normal';
    if (style === 'digi') {
      // tall thin digitigrade (raptor) leg — bent knee back, long shin
      g.add(box(0.1 * G, 0.46 * S, 0.12 * G, armor, 0, -0.23 * S, 0.04 * S)); // thigh fwd
      g.add(box(0.09 * G, 0.42 * S, 0.1 * G, dark, 0, -0.62 * S, -0.06 * S)); // shin back
      g.add(box(0.1 * G, 0.06, 0.3 * S, dark, 0, -0.88 * S, 0.08 * S)); // long foot
    } else if (style === 'piston') {
      // hydraulic reverse-jointed leg (Tank) — thick cylinders
      g.add(cylY(0.14 * G, 0.42 * S, dark, 0, -0.2 * S, 0.05 * S)); // upper piston
      g.add(cylY(0.11 * G, 0.42 * S, armor, 0, -0.6 * S, -0.05 * S)); // lower piston
      g.add(box(0.28 * G, 0.1, 0.34 * S, dark, 0, -0.86 * S, 0.06 * S)); // big foot
      g.add(cylZ(0.06, 0.2 * G, gun, 0, -0.4 * S, 0)); // knee actuator
    } else if (style === 'thick') {
      g.add(box(0.22 * G, 0.5 * S, 0.24 * G, armor, 0, -0.25 * S, 0)); // thick thigh
      g.add(box(0.2 * G, 0.44 * S, 0.2 * G, dark, 0, -0.68 * S, 0.01)); // thick shin
      g.add(box(0.26 * G, 0.09, 0.32 * S, dark, 0, -0.9 * S, 0.05)); // boot
    } else {
      g.add(box(0.16 * G, 0.5 * S, 0.18 * G, armor, 0, -0.25 * S, 0)); // thigh
      g.add(box(0.15 * G, 0.46 * S, 0.16 * G, dark, 0, -0.68 * S, 0.01)); // shin
      g.add(box(0.2 * G, 0.08, 0.28 * S, dark, 0, -0.9 * S, 0.05)); // foot
    }
    return g;
  };
  const stance = (o.legs === 'thick' || o.legs === 'piston' ? 0.2 : 0.13) * G;
  const legL = mkLeg(-stance);
  const legR = mkLeg(stance);

  // ── torso ──────────────────────────────────────────────────────────────────
  const torso = new THREE.Group();
  torso.position.set(0, hipY, 0);
  torso.rotation.x = o.hunch ?? 0;
  const chestW = 0.42 * G;
  const chestH = 0.5 * S;
  torso.add(box(chestW, chestH, 0.28 * G, armor, 0, 0.28 * S, 0)); // chest
  torso.add(box(chestW + 0.06, 0.13 * S, 0.32 * G, dark, 0, 0.5 * S, 0)); // shoulder yoke
  torso.add(box(0.16 * G, 0.16 * S, 0.1, glow, 0, 0.3 * S, 0.15 * G)); // chest core (glow)
  // shoulder plates
  const sh = o.shoulders ?? 0.4;
  if (sh > 0) {
    torso.add(box(0.16 * sh + 0.1, 0.18 * S, 0.26 * G, armor, -(chestW / 2 + 0.04), 0.46 * S, 0));
    torso.add(box(0.16 * sh + 0.1, 0.18 * S, 0.26 * G, armor, chestW / 2 + 0.04, 0.46 * S, 0));
  }

  // ── head ───────────────────────────────────────────────────────────────────
  const head = new THREE.Group();
  head.position.set(0, 0.62 * S, 0);
  head.add(box(0.22 * G, 0.22 * S, 0.24 * G, dark, 0, 0.08, 0)); // helmet
  head.add(box(0.2 * G, 0.06, 0.03, glow, 0, 0.08, 0.13 * G)); // visor (glow)
  if (o.crest) head.add(box(0.04, 0.26 * S, 0.16, glow, 0, 0.2 * S, -0.02)); // crest
  for (let i = 0; i < (o.antenna ?? 0); i++) {
    head.add(cylY(0.012, 0.16 * S, dark, 0.06 - i * 0.12, 0.24 * S, -0.05));
  }
  torso.add(head);

  // ── arms ───────────────────────────────────────────────────────────────────
  const aw = o.heavyArms ? 0.2 * G : 0.13 * G;
  const mkArm = (sx: number): THREE.Group => {
    const g = new THREE.Group();
    g.position.set(sx, 0.46 * S, 0);
    g.add(box(aw, 0.46 * S, aw, armor, 0, -0.22 * S, 0));
    if (o.heavyArms) g.add(box(aw + 0.04, 0.2 * S, aw + 0.04, dark, 0, -0.4 * S, 0)); // big forearm
    return g;
  };
  const shoulderX = chestW / 2 + aw / 2 + 0.02;
  const armL = mkArm(-shoulderX);
  const armR = mkArm(shoulderX);
  torso.add(armL, armR);

  // ── weapon (held by the right arm) ───────────────────────────────────────────
  const weapon = new THREE.Group();
  weapon.position.set(0, -0.36 * S, 0.12);
  const wt = o.weapon ?? 'rifle';
  if (wt === 'rifle') {
    weapon.add(box(0.08, 0.11, 0.46, gun, 0, 0, 0.16));
    weapon.add(box(0.05, 0.05, 0.3, gun, 0, 0.02, 0.42));
    weapon.add(box(0.06, 0.14, 0.08, gun, 0, -0.1, 0.06));
  } else if (wt === 'long') {
    weapon.add(box(0.06, 0.08, 0.5, gun, 0, 0, 0.2));
    weapon.add(box(0.035, 0.035, 0.5, gun, 0, 0.02, 0.6)); // long barrel
    weapon.add(box(0.04, 0.05, 0.16, glow, 0, 0.08, 0.18)); // scope
  } else if (wt === 'shotgun') {
    weapon.add(box(0.11, 0.13, 0.36, gun, 0, 0, 0.14));
    weapon.add(cylZ(0.06, 0.3, dark, 0, 0.01, 0.34)); // fat barrel
    weapon.add(cylZ(0.08, 0.05, gun, 0, 0.01, 0.5)); // wide muzzle
  } else if (wt === 'beltfed') {
    weapon.add(box(0.12, 0.13, 0.5, gun, 0, 0, 0.18));
    weapon.add(cylZ(0.045, 0.5, dark, 0, 0.02, 0.42)); // heavy barrel
    weapon.add(box(0.16, 0.16, 0.12, dark, 0.12, -0.04, 0.06)); // side ammo box
  } else if (wt === 'cannon') {
    weapon.add(cylZ(0.13, 0.5, dark, 0, 0, 0.28)); // big arm cannon
    weapon.add(cylZ(0.1, 0.06, glow, 0, 0, 0.54)); // glowing muzzle
    weapon.add(box(0.18, 0.18, 0.16, armor, 0, 0, 0.02)); // breech
  } else if (wt === 'claws') {
    for (const sgn of [-1, 1]) {
      weapon.add(box(0.03, 0.04, 0.4, glow, sgn * 0.05, 0, 0.24)); // energy blade
      weapon.add(box(0.06, 0.1, 0.12, dark, sgn * 0.05, 0, 0.04)); // gauntlet base
    }
  }
  if (wt !== 'none') armR.add(weapon);

  // ── back-mounted gear ────────────────────────────────────────────────────────
  if (o.backpack && o.backpack !== 'none') {
    const bp = o.backpack === 'reactor' ? glow : dark;
    torso.add(box(0.3 * G, 0.38 * S, 0.18, o.backpack === 'tech' ? armor : bp, 0, 0.34 * S, -0.22 * G));
    if (o.backpack === 'ammo') torso.add(cylZ(0.13, 0.12, dark, 0, 0.3 * S, -0.3)); // ammo drum
    if (o.backpack === 'reactor') torso.add(box(0.12, 0.3 * S, 0.12, glow, 0, 0.34 * S, -0.24));
  }
  if (o.spine) {
    torso.add(box(0.1, 0.6 * S, 0.1, dark, 0, 0.62 * S, -0.18));
    torso.add(box(0.06, 0.5 * S, 0.06, glow, 0, 0.6 * S, -0.18)); // glowing spine rod
  }
  if (o.fins) {
    for (const sgn of [-1, 1]) {
      const f = box(0.02, 0.3 * S, 0.22, glow, sgn * 0.12, 0.5 * S, -0.2);
      f.rotation.x = -0.3;
      torso.add(f);
    }
  }
  if (o.missilePods) {
    for (const sgn of [-1, 1]) {
      torso.add(box(0.16, 0.16, 0.22, dark, sgn * (chestW / 2 + 0.16), 0.56 * S, -0.04));
      for (let r = 0; r < 4; r++) {
        torso.add(cylZ(0.025, 0.04, glow, sgn * (chestW / 2 + 0.16) + (r % 2 ? 0.04 : -0.04), 0.56 * S + (r < 2 ? 0.04 : -0.04), 0.08));
      }
    }
  }
  if (o.drones) {
    for (let i = 0; i < o.drones; i++) {
      const d = new THREE.Group();
      const ang = (i / o.drones) * Math.PI * 2;
      d.position.set(Math.cos(ang) * 0.5, 1.7 * S + Math.sin(i) * 0.06, Math.sin(ang) * 0.5 - 0.1);
      d.add(box(0.12, 0.06, 0.12, dark));
      d.add(box(0.05, 0.05, 0.05, glow, 0, -0.04, 0));
      root.add(d);
    }
  }

  root.add(legL, legR, torso);
  const parts: EnemyParts = { legL, legR, torso, head, armL, armR, weapon };
  root.userData.parts = parts;
  root.userData.bodyMats = bodyMats;
  root.userData.hipY = hipY; // base torso height (the animator offsets bob from here)
  return root;
}
