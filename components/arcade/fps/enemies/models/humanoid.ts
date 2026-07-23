/**
 * Parameterized low-poly humanoid — the shared base for all 10 enemy classes,
 * the player Marine (marine/model.ts) and the boss humanoids (boss/models.ts).
 * Same RIG as the trooper (named hip/torso/leg/arm/weapon joints) so one animator
 * poses every class, but the proportions, leg style, armor, weapon and back-mounted
 * gear are all option-driven so each class has an instantly-distinct SILHOUETTE.
 * Forward = +Z, feet at y=0. Sets `userData.parts` + `userData.bodyMats`.
 *
 * ALIEN FACTION (enemy-only): the `alien*`/`carapace`/`asymShoulder`/`mantle`/
 * `organPack`/`skirt` options restyle the humanoid as an armored ALIEN trooper
 * (non-human sensor-pod head, bio-emissive veins, forward carapace hunch). They all
 * default OFF, so the Marine + boss builders (which never set them) stay HUMAN and
 * the armor:* slot tags are untouched.
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
  weapon?: 'rifle' | 'long' | 'shotgun' | 'beltfed' | 'cannon' | 'claws' | 'none' | 'welder' | 'scepter' | 'blades';
  backpack?: 'none' | 'ammo' | 'tech' | 'reactor';
  // ── BLACKSTAR LEGION armour detailing (retro plate layering + emissive seams) ──
  seams?: number; // emissive trim strips along the armour (0 = none, ~1 = full Legion look)
  abs?: boolean; // segmented abdominal plates under the chest
  collar?: boolean; // raised gorget/neck collar
  kneePads?: boolean; // knee armour
  cape?: 'stealth' | 'command' | null; // a back cloak (marksman drape / commander mantle-cape)
  ammoHose?: boolean; // belt-fed hose looping from the weapon to a back drum (Suppressor)
  fins?: boolean; // back targeting fins
  crest?: boolean; // head crest
  antenna?: number;
  missilePods?: boolean;
  spine?: boolean; // tall reactor spine
  drones?: number; // floating drones above the shoulders
  hunch?: number; // forward torso lean (rad)
  // ── alien faction (enemy-only; Marine/boss builders omit these so they stay human) ──
  alien?: boolean; // restyle as an alien trooper: non-human head, hunch
  alienHead?: 'pod' | 'cyclops' | 'crown' | 'mandible' | 'visor' | 'insect';
  veins?: boolean; // bio-emissive veins (the ORGANIC units: Berserker / Elite / Commander)
  carapace?: number; // back carapace hump size (0 = none)
  asymShoulder?: 'L' | 'R'; // one oversized asymmetric siege shoulder (Tank)
  mantle?: boolean; // officer command shoulder mantle (Captain)
  organPack?: boolean; // bulbous bio-organ backpack + tendrils (Healer)
  skirt?: boolean; // heavy armor skirt over the hips (Tank)
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
    // Tag the thigh / shin / foot shells so the Marine's thigh/shin/boot armour can
    // REPLACE them (metadata only — enemies never hide them, so their look is unchanged).
    const tag = (m: THREE.Object3D, name: string): THREE.Object3D => { m.name = name; g.add(m); return m; };
    if (style === 'digi') {
      // tall thin digitigrade (raptor) leg — bent knee back, long shin
      tag(box(0.1 * G, 0.46 * S, 0.12 * G, armor, 0, -0.23 * S, 0.04 * S), 'armor:thighs'); // thigh fwd
      tag(box(0.09 * G, 0.42 * S, 0.1 * G, dark, 0, -0.62 * S, -0.06 * S), 'armor:shins'); // shin back
      tag(box(0.1 * G, 0.06, 0.3 * S, dark, 0, -0.88 * S, 0.08 * S), 'armor:boots'); // long foot
    } else if (style === 'piston') {
      // hydraulic reverse-jointed leg (Tank) — thick cylinders
      tag(cylY(0.14 * G, 0.42 * S, dark, 0, -0.2 * S, 0.05 * S), 'armor:thighs'); // upper piston
      tag(cylY(0.11 * G, 0.42 * S, armor, 0, -0.6 * S, -0.05 * S), 'armor:shins'); // lower piston
      tag(box(0.28 * G, 0.1, 0.34 * S, dark, 0, -0.86 * S, 0.06 * S), 'armor:boots'); // big foot
      g.add(cylZ(0.06, 0.2 * G, gun, 0, -0.4 * S, 0)); // knee actuator
    } else if (style === 'thick') {
      tag(box(0.22 * G, 0.5 * S, 0.24 * G, armor, 0, -0.25 * S, 0), 'armor:thighs'); // thick thigh
      tag(box(0.2 * G, 0.44 * S, 0.2 * G, dark, 0, -0.68 * S, 0.01), 'armor:shins'); // thick shin
      tag(box(0.26 * G, 0.09, 0.32 * S, dark, 0, -0.9 * S, 0.05), 'armor:boots'); // boot
    } else {
      tag(box(0.16 * G, 0.5 * S, 0.18 * G, armor, 0, -0.25 * S, 0), 'armor:thighs'); // thigh
      tag(box(0.15 * G, 0.46 * S, 0.16 * G, dark, 0, -0.68 * S, 0.01), 'armor:shins'); // shin
      tag(box(0.2 * G, 0.08, 0.28 * S, dark, 0, -0.9 * S, 0.05), 'armor:boots'); // foot
    }
    if (o.kneePads) {
      g.add(box(0.13 * G, 0.11 * S, 0.13 * G, dark, 0, -0.48 * S, 0.07 * G)); // knee guard
      g.add(box(0.1 * G, 0.02, 0.02, glow, 0, -0.44 * S, 0.14 * G)); // knee seam
    }
    return g;
  };
  const stance = (o.legs === 'thick' || o.legs === 'piston' ? 0.2 : 0.13) * G;
  const legL = mkLeg(-stance);
  const legR = mkLeg(stance);

  // ── torso ──────────────────────────────────────────────────────────────────
  const torso = new THREE.Group();
  torso.position.set(0, hipY, 0);
  torso.rotation.x = o.hunch ?? (o.alien ? 0.12 : 0); // alien troopers hunch forward by default
  const chestW = 0.42 * G;
  const chestH = 0.5 * S;
  const chestShell = box(chestW, chestH, 0.28 * G, armor, 0, 0.28 * S, 0); // chest
  chestShell.name = 'armor:chest'; // recruit shell the Marine's chest plate replaces
  torso.add(chestShell);
  torso.add(box(chestW + 0.06, 0.13 * S, 0.32 * G, dark, 0, 0.5 * S, 0)); // shoulder yoke
  torso.add(box(0.16 * G, 0.16 * S, 0.1, glow, 0, 0.3 * S, 0.15 * G)); // chest core (glow)
  // shoulder plates
  const sh = o.shoulders ?? 0.4;
  if (sh > 0) {
    const shL = box(0.16 * sh + 0.1, 0.18 * S, 0.26 * G, armor, -(chestW / 2 + 0.04), 0.46 * S, 0);
    const shR = box(0.16 * sh + 0.1, 0.18 * S, 0.26 * G, armor, chestW / 2 + 0.04, 0.46 * S, 0);
    shL.name = 'armor:shoulders'; // recruit pauldrons the Marine's shoulders replace
    shR.name = 'armor:shoulders';
    torso.add(shL, shR);
  }
  // ONE oversized asymmetric siege carapace shoulder (Tank) — reads from any angle
  if (o.asymShoulder) {
    const sgn = o.asymShoulder === 'R' ? 1 : -1;
    const bx = sgn * (chestW / 2 + 0.16 * G);
    const cap = box(0.44 * G, 0.44 * S, 0.4 * G, armor, bx, 0.5 * S, -0.02);
    torso.add(cap);
    torso.add(box(0.48 * G, 0.1 * S, 0.44 * G, dark, bx, 0.72 * S, -0.02)); // top plate
    torso.add(box(0.06, 0.36 * S, 0.06, glow, bx + sgn * 0.22 * G, 0.5 * S, 0.02)); // glow rib
  }

  // ── head ───────────────────────────────────────────────────────────────────
  const head = new THREE.Group();
  head.position.set(0, 0.62 * S, 0);
  if (o.alien) {
    // Non-human alien head: a sensor-pod skull with a horizontal multi-lens band
    // instead of a human visor. The main skull keeps the `armor:helmet` tag (harmless
    // — enemies never run the Marine replacement, which is what reads that tag).
    const kind = o.alienHead ?? 'pod';
    if (kind === 'cyclops') {
      // Longsight (sniper): elongated narrow skull + ONE big single optic
      const skull = box(0.15 * G, 0.26 * S, 0.22 * G, dark, 0, 0.12, 0);
      skull.name = 'armor:helmet';
      head.add(skull);
      head.add(cylZ(0.11 * G, 0.03, armor, 0, 0.13, 0.1 * G)); // optic housing ring
      head.add(cylZ(0.08 * G, 0.06, glow, 0, 0.13, 0.13 * G)); // big glowing eye
    } else if (kind === 'crown') {
      // Warcaller (captain): skull + a crown of sensor spikes
      const skull = box(0.2 * G, 0.2 * S, 0.24 * G, dark, 0, 0.08, 0);
      skull.name = 'armor:helmet';
      head.add(skull);
      head.add(box(0.16 * G, 0.045, 0.04, glow, 0, 0.09, 0.13 * G)); // sensor band
      for (let i = -2; i <= 2; i++) {
        head.add(cylY(0.014, 0.16 * S + Math.abs(i) * -0.02 * S, i % 2 ? glow : armor, i * 0.05 * G, 0.24 * S, -0.02));
      }
    } else if (kind === 'mandible') {
      // heavy alien: skull + forward mandible tusks
      const skull = box(0.2 * G, 0.2 * S, 0.24 * G, dark, 0, 0.08, 0);
      skull.name = 'armor:helmet';
      head.add(skull);
      head.add(box(0.16 * G, 0.05, 0.04, glow, 0, 0.09, 0.13 * G)); // sensor band
      for (const sgn of [-1, 1]) head.add(box(0.04, 0.06, 0.16, armor, sgn * 0.09 * G, 0.02, 0.12 * G)); // tusks
    } else if (kind === 'visor') {
      // BLACKSTAR LEGION combat helmet — angular armoured skull + T-visor slit + brow + jaw.
      const skull = box(0.2 * G, 0.22 * S, 0.24 * G, armor, 0, 0.09, 0);
      skull.name = 'armor:helmet';
      head.add(skull);
      head.add(box(0.22 * G, 0.05, 0.06, dark, 0, 0.17, 0.11 * G)); // brow ridge
      head.add(box(0.05, 0.14 * S, 0.03, glow, 0, 0.07, 0.14 * G)); // vertical visor slit
      head.add(box(0.15 * G, 0.035, 0.03, glow, 0, 0.11, 0.14 * G)); // horizontal visor slit → T
      head.add(box(0.16 * G, 0.07 * S, 0.06, dark, 0, -0.03, 0.12 * G)); // jaw/chin guard
      for (const sgn of [-1, 1]) head.add(box(0.035, 0.1 * S, 0.12, dark, sgn * 0.11 * G, 0.06, 0.02)); // ear vents
    } else if (kind === 'insect') {
      // Elite carapace head — narrow forward-swept skull + mandibles + compound-eye band.
      const skull = box(0.15 * G, 0.18 * S, 0.28 * G, armor, 0, 0.1, 0.03);
      skull.name = 'armor:helmet';
      head.add(skull);
      head.add(box(0.14 * G, 0.05, 0.05, glow, 0, 0.09, 0.16 * G)); // compound-eye band
      for (const sgn of [-1, 1]) {
        const m = box(0.03, 0.04, 0.16, dark, sgn * 0.06 * G, -0.02, 0.16 * G); // mandible
        m.rotation.y = sgn * 0.2;
        head.add(m);
        head.add(cylY(0.01, 0.14 * S, glow, sgn * 0.05 * G, 0.22 * S, -0.06)); // antenna
      }
    } else {
      // 'pod' — the baseline trooper skull: forward wedge + horizontal sensor band + cheek plates
      const skull = box(0.2 * G, 0.2 * S, 0.26 * G, dark, 0, 0.08, 0);
      skull.name = 'armor:helmet';
      head.add(skull);
      head.add(box(0.17 * G, 0.05, 0.04, glow, 0, 0.09, 0.14 * G)); // multi-lens sensor band (alien eye)
      for (const sgn of [-1, 1]) head.add(box(0.05, 0.1 * S, 0.1, armor, sgn * 0.1 * G, 0.03, 0.06)); // cheek plates
      head.add(box(0.06, 0.06, 0.1, dark, 0, 0.16 * S, -0.08)); // rear vent
    }
  } else {
    const helmetShell = box(0.22 * G, 0.22 * S, 0.24 * G, dark, 0, 0.08, 0); // helmet
    helmetShell.name = 'armor:helmet'; // recruit shell the Marine's helmet replaces
    head.add(helmetShell);
    const baseVisor = box(0.2 * G, 0.06, 0.03, glow, 0, 0.08, 0.13 * G); // visor (glow)
    baseVisor.name = 'hide:helmet'; // a Marine helmet has its own visor — clear this one
    head.add(baseVisor);
    if (o.crest) { const cr = box(0.04, 0.26 * S, 0.16, glow, 0, 0.2 * S, -0.02); cr.name = 'hide:helmet'; head.add(cr); } // crest
    for (let i = 0; i < (o.antenna ?? 0); i++) {
      const ant = cylY(0.012, 0.16 * S, dark, 0.06 - i * 0.12, 0.24 * S, -0.05);
      ant.name = 'hide:helmet';
      head.add(ant);
    }
  }
  torso.add(head);

  // ── arms ───────────────────────────────────────────────────────────────────
  const aw = o.heavyArms ? 0.2 * G : 0.13 * G;
  const mkArm = (sx: number): THREE.Group => {
    const g = new THREE.Group();
    g.position.set(sx, 0.46 * S, 0);
    // Split the arm into upper + fore shells (summed volume = the old single box, so
    // the enemy silhouette is unchanged) so the Marine's upper-arm / forearm armour
    // can each REPLACE their segment.
    const upper = box(aw, 0.23 * S, aw, armor, 0, -0.115 * S, 0);
    upper.name = 'armor:upperArms';
    const fore = box(aw, 0.23 * S, aw, armor, 0, -0.345 * S, 0);
    fore.name = 'armor:forearms';
    g.add(upper, fore);
    if (o.heavyArms) { const hf = box(aw + 0.04, 0.2 * S, aw + 0.04, dark, 0, -0.4 * S, 0); hf.name = 'armor:forearms'; g.add(hf); } // big forearm
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
    // Plasma rifle (PR-9 Lancer) — receiver + barrel + mag + a glowing energy cell.
    weapon.add(box(0.08, 0.11, 0.46, gun, 0, 0, 0.16));
    weapon.add(box(0.05, 0.05, 0.3, gun, 0, 0.02, 0.42));
    weapon.add(box(0.06, 0.14, 0.08, gun, 0, -0.1, 0.06)); // mag
    weapon.add(box(0.05, 0.05, 0.12, glow, 0, 0.06, 0.1)); // energy cell glow
    weapon.add(cylZ(0.025, 0.05, glow, 0, 0.02, 0.58)); // muzzle glow
  } else if (wt === 'long') {
    // Voidsniper VS-9 — long barrel, big scope, a charged glow coil.
    weapon.add(box(0.06, 0.08, 0.5, gun, 0, 0, 0.2));
    weapon.add(box(0.035, 0.035, 0.5, gun, 0, 0.02, 0.6)); // long barrel
    weapon.add(box(0.05, 0.06, 0.2, dark, 0, 0.09, 0.2)); // scope body
    weapon.add(box(0.03, 0.03, 0.04, glow, 0, 0.09, 0.31)); // scope lens glow
    weapon.add(cylZ(0.02, 0.28, glow, 0, 0, 0.5)); // charge coil under the barrel
  } else if (wt === 'welder') {
    // Plasma welder / UTL-7 multi-tool (Engineer) — short emitter + glowing tip + prongs.
    weapon.add(box(0.07, 0.09, 0.2, gun, 0, 0, 0.1));
    weapon.add(cylZ(0.03, 0.16, dark, 0, 0.01, 0.24));
    weapon.add(cylZ(0.05, 0.05, glow, 0, 0.01, 0.34)); // plasma tip
    for (const sgn of [-1, 1]) weapon.add(box(0.015, 0.015, 0.1, glow, sgn * 0.03, 0.01, 0.3)); // prongs
  } else if (wt === 'scepter') {
    // Command scepter (Commander) — a tall haft topped with a glowing command orb.
    weapon.add(cylZ(0.02, 0.7, dark, 0, -0.2, 0.05));
    weapon.rotation.x = -0.2;
    weapon.add(box(0.09, 0.09, 0.09, glow, 0, 0.18, 0.05)); // command orb
    weapon.add(box(0.13, 0.02, 0.02, glow, 0, 0.12, 0.05)); // cross vane
  } else if (wt === 'blades') {
    // Dual carapace blades (Elite) — a curved monomolecular blade off the forearm.
    weapon.add(box(0.03, 0.05, 0.5, glow, 0, 0, 0.28)); // main blade
    weapon.add(box(0.05, 0.09, 0.14, dark, 0, 0, 0.04)); // wrist mount
    const tip = box(0.02, 0.03, 0.14, glow, 0.01, 0.02, 0.5);
    tip.rotation.x = 0.3; // hooked tip
    weapon.add(tip);
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
  // Melee classes dual-wield — mirror the blade/claw onto the off-hand.
  if (wt === 'claws' || wt === 'blades') {
    const wl = weapon.clone();
    wl.scale.x = -1;
    armL.add(wl);
  }

  // ── back-mounted gear ────────────────────────────────────────────────────────
  if (o.organPack) {
    // Bio-weaver (healer): a bulbous glowing organ pack sprouting tendril heal-emitters
    torso.add(box(0.34 * G, 0.42 * S, 0.26, dark, 0, 0.34 * S, -0.22 * G)); // organ shell
    torso.add(box(0.2 * G, 0.28 * S, 0.14, glow, 0, 0.34 * S, -0.28 * G)); // glowing organ core
    for (const sgn of [-1, 1]) {
      const t = cylY(0.02, 0.3 * S, glow, sgn * 0.16 * G, 0.24 * S, -0.28 * G);
      t.rotation.x = -0.5; // tendril curling down/out
      torso.add(t);
    }
  } else if (o.backpack && o.backpack !== 'none') {
    const bp = o.backpack === 'reactor' ? glow : dark;
    torso.add(box(0.3 * G, 0.38 * S, 0.18, o.backpack === 'tech' ? armor : bp, 0, 0.34 * S, -0.22 * G));
    if (o.backpack === 'ammo') torso.add(cylZ(0.13, 0.12, dark, 0, 0.3 * S, -0.3)); // ammo drum
    if (o.backpack === 'reactor') torso.add(box(0.12, 0.3 * S, 0.12, glow, 0, 0.34 * S, -0.24));
  }
  // officer command mantle (Captain) — a wide shoulder collar that reads as rank
  if (o.mantle) {
    torso.add(box(chestW + 0.34, 0.12 * S, 0.36 * G, armor, 0, 0.54 * S, -0.03));
    torso.add(box(chestW + 0.38, 0.04, 0.06, glow, 0, 0.6 * S, 0.16 * G)); // glow trim
  }
  // heavy armor skirt over the hips (Tank)
  if (o.skirt) {
    for (const sgn of [-1, 1]) torso.add(box(0.22 * G, 0.22 * S, 0.36 * G, armor, sgn * 0.2 * G, -0.02 * S, 0));
    torso.add(box(0.5 * G, 0.06, 0.04, glow, 0, 0.06 * S, 0.2 * G)); // skirt glow rim
  }
  // back carapace hump (alien faction signature)
  if (o.carapace && o.carapace > 0) {
    const c = o.carapace;
    torso.add(box(0.34 * G * c, 0.3 * S * c, 0.2 * c, armor, 0, 0.44 * S, -0.16 * G)); // carapace shell
    torso.add(box(0.06, 0.26 * S * c, 0.06, glow, 0, 0.46 * S, -0.16 * G)); // spinal glow ridge
  }
  // bio-emissive veins running the armor (the ORGANIC units: Berserker / Elite / Commander)
  if (o.veins) {
    torso.add(box(0.025, 0.3 * S, 0.02, glow, 0, 0.24 * S, 0.15 * G)); // chest vein
    for (const sgn of [-1, 1]) torso.add(box(0.02, 0.22 * S, 0.02, glow, sgn * (chestW / 2 - 0.02), 0.28 * S, 0.13 * G)); // side veins
  }
  // BLACKSTAR LEGION armour detailing — layered plates + emissive seam trim (the soldiers).
  if (o.collar) {
    torso.add(box(0.26 * G, 0.1 * S, 0.24 * G, dark, 0, 0.52 * S, 0.02)); // gorget
    torso.add(box(0.24 * G, 0.03, 0.04, glow, 0, 0.54 * S, 0.13 * G)); // collar seam
  }
  if (o.abs) {
    for (let i = 0; i < 2; i++) torso.add(box(chestW - 0.06, 0.09 * S, 0.24 * G, i ? dark : armor, 0, 0.06 * S - i * 0.11 * S, 0.02)); // ab plates
    torso.add(box(0.04, 0.22 * S, 0.03, glow, 0, 0.02 * S, 0.15 * G)); // ab seam
  }
  if (o.seams && o.seams > 0) {
    const s2 = o.seams;
    torso.add(box(0.03, 0.34 * S, 0.02, glow, 0, 0.28 * S, 0.16 * G)); // sternum seam
    for (const sgn of [-1, 1]) {
      torso.add(box(0.02, 0.2 * S * s2, 0.02, glow, sgn * (chestW / 2 + 0.02), 0.42 * S, 0.02)); // shoulder seam
      torso.add(box(0.02, 0.16 * S * s2, 0.02, glow, sgn * 0.16 * G, 0.2 * S, 0.15 * G)); // flank seam
    }
  }
  // Back cloak — a stealth drape (Marksman) or a wide command mantle-cape (Commander).
  if (o.cape) {
    const wide = o.cape === 'command';
    const cw = (wide ? 0.64 : 0.44) * G;
    const clen = (wide ? 1.35 : 1.15) * S;
    const cloth = metal(wide ? darkC : 0x1c1e26, tier);
    const cloak = box(cw, clen, 0.03, cloth, 0, 0.42 * S - clen / 2, -0.2 * G);
    cloak.rotation.x = 0.13; // drapes back off the shoulders
    torso.add(cloak);
    torso.add(box(cw * 0.92, 0.03, 0.02, glow, 0, 0.42 * S - clen + 0.06, -0.22 * G)); // hem trim glow
    if (wide) for (const sgn of [-1, 1]) { const side = box(0.22 * G, clen * 0.82, 0.03, cloth, sgn * cw * 0.5, 0.42 * S - clen * 0.44, -0.15 * G); side.rotation.z = sgn * 0.12; torso.add(side); }
  }
  // Belt-fed ammo hose looping from the weapon feed to the back drum (Suppressor).
  if (o.ammoHose) {
    for (let i = 0; i <= 4; i++) {
      const t = i / 4;
      const hx = 0.15 * G - t * 0.06 * G;
      const hy = 0.02 * S - Math.sin(t * Math.PI) * 0.14 * S;
      const hz = 0.08 - t * 0.34 * G;
      torso.add(cylZ(0.028, 0.11, dark, hx, hy, hz));
    }
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
  root.userData.weaponKind = wt; // 'rifle'|'long'|...|'claws'|'none' — drives the aim/fire pose
  return root;
}
