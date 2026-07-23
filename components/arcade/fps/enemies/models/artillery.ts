/**
 * The two-phase artillery unit's models:
 *  - buildArtilleryGun: a HUGE (~3× Tank) manned alien siege emplacement — carriage +
 *    anchor legs, an upward-angled mortar barrel with a recoil sleeve, a breech with an
 *    emissive charging core (the pre-shot telegraph), a shell rack, a gunner cockpit with
 *    a seated operator, and a sensor mast. Static: no `userData.parts`, so the animator
 *    leaves it still. `bodyMats` set so it flashes on hit.
 *  - buildJetpackPilot: the ejected operator — a regular-sized alien trooper (buildHumanoid)
 *    with a back-mounted twin-thruster jetpack (glowing nozzles = the weak point).
 */
import * as THREE from 'three';
import type { RenderTier } from '../../materials';
import { accent, box, cylY, cylZ, metal } from '../../models/parts';
import { buildHumanoid } from './humanoid';

/** BLACKSTAR LEGION mobile siege PLATFORM — a towering white walker mech on two piston legs,
 *  a 300 mm siege cannon, a manned gunner cockpit (the pilot ejects on death). Static in
 *  gameplay (a dug-in siege position). Forward = +Z (the barrel points at the player). */
export function buildArtilleryGun(tier: RenderTier): THREE.Group {
  const white = metal(0xcfccc4, tier, 0.55, 0.6);
  const dark = metal(0x2a2c30, tier, 0.6, 0.7);
  const steel = metal(0x6a6d75, tier, 0.5, 0.8);
  const glow = accent(0x6ab0ff, tier, 1.8); // ice-blue charge core / telegraph
  const red = accent(0xff3a3a, tier, 1.6); // warning seams
  const g = new THREE.Group();

  // ── bipedal piston legs raising the hull (a WALKER, planted in a siege stance) ──
  const HIP = 2.6;
  for (const sx of [-1, 1]) {
    g.add(cylY(0.34, 1.5, steel, sx * 1.15, 1.7, 0.25)); // upper piston (fwd)
    g.add(cylZ(0.16, 0.6, red, sx * 1.15, 1.0, 0.05)); // knee actuator glow
    g.add(cylY(0.3, 1.5, dark, sx * 1.15, 0.7, -0.2)); // lower piston (back)
    g.add(box(1.0, 0.32, 1.6, dark, sx * 1.15, 0.16, 0.15)); // splayed foot
    g.add(box(0.7, 0.05, 0.7, red, sx * 1.15, 0.34, 0.15)); // foot glow
  }
  // ── hull carriage on the hips ──
  g.add(box(3.6, 0.9, 2.8, white, 0, HIP, 0)); // main hull
  g.add(box(3.2, 0.1, 0.06, red, 0, HIP - 0.3, 1.4)); // hull seam
  // rotating turret ring + breech housing + glowing charging core (the pre-shot tell)
  g.add(cylY(1.25, 0.5, steel, 0, HIP + 0.7, 0));
  g.add(box(1.8, 1.6, 1.8, white, 0, HIP + 1.6, -0.6));
  g.add(box(0.9, 0.9, 0.4, glow, 0, HIP + 1.6, 0.4)); // 300 mm breech charge core

  // barrel: the big upward-angled 300 mm siege cannon + recoil sleeve, muzzle glow, struts
  const barrel = new THREE.Group();
  barrel.position.set(0, HIP + 1.8, 0.2);
  barrel.rotation.x = -0.5;
  barrel.add(cylZ(0.6, 5.0, dark, 0, 0, 2.2)); // main tube
  barrel.add(cylZ(0.78, 1.3, steel, 0, 0, 0.7)); // recoil sleeve
  barrel.add(cylZ(0.66, 0.55, glow, 0, 0, 4.6)); // muzzle glow
  for (let i = 0; i < 3; i++) barrel.add(cylZ(0.63, 0.06, red, 0, 0, 1.4 + i * 0.9)); // heat rings
  for (const sx of [-1, 1]) barrel.add(box(0.12, 0.12, 3.2, steel, sx * 0.55, -0.42, 1.7)); // struts
  g.add(barrel);

  // shell rack (glowing shells) beside the breech
  for (let i = 0; i < 3; i++) g.add(cylY(0.24, 0.85, glow, -1.9, HIP + 1.1, -1.2 + i * 0.5));

  // gunner cockpit + a seated operator (cosmetic — the live pilot ejects on gun death)
  g.add(box(1.2, 0.95, 1.2, dark, 1.7, HIP + 1.3, -0.4));
  g.add(box(0.5, 0.7, 0.5, white, 1.7, HIP + 1.9, -0.4)); // operator torso
  g.add(box(0.4, 0.4, 0.4, steel, 1.7, HIP + 2.4, -0.4)); // operator head
  g.add(box(0.35, 0.1, 0.35, red, 1.7, HIP + 2.45, -0.2)); // operator visor

  // sensor mast
  g.add(cylY(0.08, 2.2, steel, -1.6, HIP + 2.5, 0.4));
  g.add(box(0.3, 0.2, 0.1, glow, -1.6, HIP + 3.6, 0.4));

  // DUAL MACHINE GUNS — deploy out of the turret sides when the player gets close.
  // Stored retracted (scale 0); the loop ramps their scale via the enemy's `mgT`.
  const mgFire = accent(0xffcf6a, tier, 2.2);
  const mkMG = (sx: number): THREE.Group => {
    const pod = new THREE.Group();
    pod.position.set(sx * 1.5, HIP + 1.6, 0.5);
    pod.add(box(0.4, 0.4, 0.7, dark, 0, 0, 0)); // housing
    pod.add(cylZ(0.09, 1.5, steel, -0.1, 0.05, 0.9)); // barrel 1
    pod.add(cylZ(0.09, 1.5, steel, 0.1, -0.05, 0.9)); // barrel 2
    const flash = box(0.28, 0.28, 0.16, mgFire, 0, 0, 1.6); // muzzle flash (dimmed unless firing)
    flash.name = 'mgFlash';
    pod.add(flash);
    pod.scale.setScalar(0.001); // retracted
    return pod;
  };
  const mgL = mkMG(-1);
  const mgR = mkMG(1);
  g.add(mgL, mgR);
  g.userData.mgL = mgL;
  g.userData.mgR = mgR;
  g.userData.mgFlash = mgFire;

  g.userData.bodyMats = [white, dark, steel];
  return g;
}

/** The ejected operator: a Legion jetpack warrior with a back-mounted twin-thruster pack. */
export function buildJetpackPilot(tier: RenderTier): THREE.Group {
  const g = buildHumanoid({ tier, alien: true, alienHead: 'visor', scale: 1.05, girth: 0.9, accent: 0x6ab0ff, body: 0x2a3340, dark: 0x14181f, shoulders: 0.4, weapon: 'rifle', seams: 0.7 });
  const parts = g.userData.parts as { torso: THREE.Group } | undefined;
  if (!parts) return g;
  const torso = parts.torso;
  const dark = metal(0x191b1f, tier);
  const steel = metal(0x363b43, tier);
  const glow = accent(0x6ad0ff, tier, 1.8); // thruster glow (the weak point)
  torso.add(box(0.36, 0.4, 0.2, dark, 0, 0.36, -0.22)); // pack body
  for (const sx of [-1, 1]) {
    torso.add(cylY(0.09, 0.34, steel, sx * 0.16, 0.34, -0.28)); // fuel tank
    const noz = cylY(0.08, 0.2, glow, sx * 0.16, 0.1, -0.3); // angled thruster nozzle
    noz.rotation.x = 0.3;
    torso.add(noz);
    torso.add(box(0.03, 0.24, 0.14, steel, sx * 0.22, 0.4, -0.28)); // stabilizer fin
  }
  torso.add(box(0.2, 0.1, 0.1, glow, 0, 0.2, -0.3)); // vernier glow
  return g;
}
