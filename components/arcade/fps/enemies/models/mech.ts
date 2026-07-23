/**
 * BLACKSTAR LEGION siege MECH — the Tank (and, later, the Artillery walker). These are far
 * bigger than the humanoid infantry (a towering ~5.5 m siege breaker), so they do NOT use the
 * humanoid rig / animator / body-hit zones — they are their own primitive build with a heavy
 * mech-stomp animator (`animateMech`) and a boss-style hit sphere. Faithful to the concept
 * sheet in RETRO low-poly: white/black armour, molten hex-red seams, asymmetric siege cannon,
 * dual shoulder cannons, a hex shield, reverse-jointed piston legs.
 *
 * Forward = +Z, feet at y=0. `userData.mechAnim` holds the joints the animator drives;
 * `userData.bodyMats` are the plates the loop flashes red on hit.
 */
import * as THREE from 'three';
import type { RenderTier } from '../../materials';
import { accent, box, cylY, cylZ, metal } from '../../models/parts';

export function buildTankMech(tier: RenderTier): THREE.Group {
  const g = new THREE.Group();
  const white = metal(0xcfccc4, tier, 0.55, 0.6);
  const dark = metal(0x2a2c30, tier, 0.6, 0.7);
  const steel = metal(0x6a6d75, tier, 0.5, 0.8);
  const red = accent(0xff3a3a, tier, 1.6) as THREE.MeshStandardMaterial;
  const bodyMats = [white, dark, steel];

  // ── legs: two reverse-jointed piston legs, planted wide ──
  const legGroups: THREE.Group[] = [];
  const HIP_Y = 2.5;
  for (const sx of [-1, 1] as const) {
    const leg = new THREE.Group();
    leg.position.set(sx * 0.72, HIP_Y, 0);
    leg.add(cylY(0.3, 1.2, steel, 0, -0.6, 0.12)); // upper piston (angled fwd)
    leg.add(cylZ(0.12, 0.5, red, 0, -1.15, 0)); // knee actuator glow
    leg.add(cylY(0.26, 1.2, dark, 0, -1.75, -0.06)); // lower piston (angled back)
    leg.add(box(0.72, 0.28, 1.2, dark, 0, -2.4, 0.14)); // splayed foot
    leg.add(box(0.5, 0.05, 0.5, red, 0, -2.52, 0.14)); // foot glow rim
    g.add(leg);
    legGroups.push(leg);
  }

  // ── pelvis + torso ──
  g.add(box(1.5, 0.5, 0.95, white, 0, HIP_Y, 0)); // pelvis
  g.add(box(1.0, 0.1, 0.05, red, 0, HIP_Y - 0.28, 0.5)); // pelvis seam
  const torso = new THREE.Group();
  const TORSO_Y = HIP_Y + 0.95;
  torso.position.set(0, TORSO_Y, 0);
  torso.add(box(1.85, 1.35, 1.15, white, 0, 0, 0)); // chest
  torso.add(box(1.5, 0.5, 0.1, dark, 0, 0.45, 0.6)); // upper chest plate
  torso.add(box(0.9, 0.55, 0.1, dark, 0, -0.35, 0.62)); // lower chest plate
  const core = accent(0xff3a3a, tier, 1.8) as THREE.MeshStandardMaterial;
  torso.add(box(0.32, 0.32, 0.12, core, 0, 0.05, 0.64)); // reactor core (glow)
  for (const sx of [-1, 1]) torso.add(box(0.04, 0.9, 0.05, red, sx * 0.5, 0, 0.6)); // chest seams
  // cockpit head
  torso.add(box(0.55, 0.42, 0.6, dark, 0, 0.95, 0.15));
  torso.add(box(0.42, 0.12, 0.05, red, 0, 0.98, 0.46)); // red visor slit
  // dual shoulder cannons (on top of the torso)
  for (const sx of [-1, 1]) {
    torso.add(box(0.42, 0.34, 0.5, dark, sx * 0.62, 0.62, -0.1)); // shoulder housing
    torso.add(cylZ(0.11, 1.0, steel, sx * 0.62, 0.72, 0.35)); // barrel
    torso.add(cylZ(0.08, 0.12, red, sx * 0.62, 0.72, 0.88)); // muzzle glow
  }

  // ── right arm: the huge ASYMMETRIC SIEGE CANNON ──
  const rArm = new THREE.Group();
  rArm.position.set(1.35, TORSO_Y + 0.1, 0);
  rArm.add(box(0.6, 0.7, 0.7, white, 0, 0, 0)); // pauldron
  rArm.add(box(0.55, 0.06, 0.55, red, 0, 0.36, 0)); // pauldron rim glow
  rArm.add(cylZ(0.34, 2.4, dark, 0, -0.15, 1.2)); // cannon body
  rArm.add(cylZ(0.4, 0.35, steel, 0, -0.15, 0.4)); // breech
  rArm.add(cylZ(0.26, 0.4, red, 0, -0.15, 2.45)); // muzzle glow
  for (let i = 0; i < 3; i++) rArm.add(cylZ(0.37, 0.06, red, 0, -0.15, 0.9 + i * 0.5)); // barrel heat rings
  g.add(rArm);

  // ── left arm: the REFRACTIVE HEX SHIELD (hexagonal prism) ──
  const lArm = new THREE.Group();
  lArm.position.set(-1.4, TORSO_Y, 0.2);
  lArm.add(box(0.5, 0.6, 0.6, white, 0.1, 0.15, -0.2)); // shoulder
  const hex = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.18, 6), steel);
  hex.rotation.x = Math.PI / 2; // face forward
  hex.position.set(-0.1, -0.1, 0.5);
  lArm.add(hex);
  // hex-grid glow lines across the shield face + a glowing hub
  for (let i = -1; i <= 1; i++) lArm.add(box(1.7, 0.05, 0.02, red, -0.1, -0.1 + i * 0.45, 0.6));
  lArm.add(box(0.3, 0.3, 0.08, core, -0.1, -0.1, 0.62)); // shield emitter hub
  g.add(lArm);

  g.add(torso);

  // ── SHIELD PROJECTOR dome — the Tank's main job: a faint protective field over nearby allies ──
  const domeMat = new THREE.MeshBasicMaterial({ color: 0x6ab0ff, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(11, 20, 14), domeMat); // ~= TANK_AURA_R
  dome.position.y = 2.6;
  g.add(dome);

  g.userData.mechAnim = { legL: legGroups[0], legR: legGroups[1], torso, torsoY: TORSO_Y, core, dome: domeMat };
  g.userData.bodyMats = bodyMats;
  g.userData.hipY = 2.3; // drives the health-bar height (via bodyH)
  return g;
}

/** Heavy mech stomp: legs alternate at the hip, the torso bobs + sways with each footfall,
 *  the reactor core pulses. Called by the loop for mech classes (not `poseEnemy`). */
export function animateMech(model: THREE.Object3D, dt: number, moving: boolean, step: number, now: number): void {
  void dt;
  const a = model.userData.mechAnim as
    | { legL: THREE.Object3D; legR: THREE.Object3D; torso: THREE.Object3D; torsoY: number; core?: THREE.MeshStandardMaterial; dome?: THREE.MeshBasicMaterial }
    | undefined;
  if (!a) return;
  const ph = step * 0.9; // slow, heavy gait
  const sw = moving ? Math.sin(ph) * 0.32 : 0;
  a.legL.rotation.x = sw;
  a.legR.rotation.x = -sw;
  const bob = moving ? Math.abs(Math.sin(ph)) * 0.14 : Math.sin(now * 0.0015) * 0.03;
  a.torso.position.y = a.torsoY + bob;
  a.torso.rotation.z = moving ? Math.sin(ph) * 0.05 : 0;
  if (a.core) a.core.emissiveIntensity = 1.5 + Math.sin(now * 0.004) * 0.5;
  if (a.dome) a.dome.opacity = 0.08 + 0.05 * (0.5 + 0.5 * Math.sin(now * 0.003)); // shield field pulse
}
