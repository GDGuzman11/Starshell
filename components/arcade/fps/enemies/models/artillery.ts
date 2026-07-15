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

/** ~3× Tank manned siege gun. Forward = +Z (the barrel points at the player). */
export function buildArtilleryGun(tier: RenderTier): THREE.Group {
  const armor = metal(0x474f37, tier); // olive industrial
  const dark = metal(0x191b1f, tier);
  const steel = metal(0x363b43, tier);
  const glow = accent(0xff7a2a, tier, 1.6); // orange charge core / telegraph
  const g = new THREE.Group();

  // carriage base + splayed anchor legs (dug-in emplacement)
  g.add(box(4.2, 0.7, 3.4, dark, 0, 0.35, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = box(0.5, 0.4, 2.0, steel, sx * 2.0, 0.3, sz * 1.5);
    leg.rotation.x = sz * 0.3;
    g.add(leg);
  }
  // rotating turret ring + breech housing + glowing charging core (the pre-shot tell)
  g.add(cylY(1.3, 0.5, steel, 0, 0.8, 0));
  g.add(box(1.8, 1.6, 1.8, armor, 0, 1.7, -0.6));
  g.add(box(0.9, 0.9, 0.4, glow, 0, 1.7, 0.35));

  // barrel: big upward-angled mortar with a recoil sleeve, muzzle glow + bracing struts
  const barrel = new THREE.Group();
  barrel.position.set(0, 1.9, 0.2);
  barrel.rotation.x = -0.5;
  barrel.add(cylZ(0.55, 4.6, dark, 0, 0, 2.0)); // main tube
  barrel.add(cylZ(0.72, 1.2, steel, 0, 0, 0.6)); // recoil sleeve
  barrel.add(cylZ(0.6, 0.5, glow, 0, 0, 4.2)); // muzzle glow
  for (const sx of [-1, 1]) barrel.add(box(0.12, 0.12, 3.0, steel, sx * 0.5, -0.4, 1.6)); // struts
  g.add(barrel);

  // shell rack (glowing shells) beside the breech
  for (let i = 0; i < 3; i++) g.add(cylY(0.22, 0.8, glow, -1.9, 1.2, -1.2 + i * 0.5));

  // gunner cockpit + a seated operator (cosmetic — the live pilot ejects on gun death)
  g.add(box(1.2, 0.9, 1.2, dark, 1.7, 1.4, -0.4));
  g.add(box(0.5, 0.7, 0.5, armor, 1.7, 2.0, -0.4)); // operator torso
  g.add(box(0.4, 0.4, 0.4, steel, 1.7, 2.5, -0.4)); // operator head
  g.add(box(0.35, 0.1, 0.35, glow, 1.7, 2.55, -0.2)); // operator visor

  // sensor mast
  g.add(cylY(0.08, 2.2, steel, -1.6, 2.6, 0.4));
  g.add(box(0.3, 0.2, 0.1, glow, -1.6, 3.7, 0.4));

  // DUAL MACHINE GUNS — deploy out of the turret sides when the player gets close.
  // Stored retracted (scale 0); the loop ramps their scale via the enemy's `mgT`.
  const mgFire = accent(0xffcf6a, tier, 2.2);
  const mkMG = (sx: number): THREE.Group => {
    const pod = new THREE.Group();
    pod.position.set(sx * 1.4, 1.7, 0.5);
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

  g.userData.bodyMats = [armor, dark, steel];
  return g;
}

/** The ejected operator: an alien trooper with a back-mounted twin-thruster jetpack. */
export function buildJetpackPilot(tier: RenderTier): THREE.Group {
  const g = buildHumanoid({ tier, alien: true, alienHead: 'pod', scale: 0.95, girth: 0.85, accent: 0x49a6ff, body: 0x363b43, shoulders: 0.3, weapon: 'rifle' });
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
