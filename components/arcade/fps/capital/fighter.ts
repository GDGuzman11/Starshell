import * as THREE from 'three';
import type { RenderTier } from '../materials';
import { box, coneZ, cylZ, capsuleZ, metal, accent } from '../models/parts';

/**
 * VOID FIGHTER — the strike craft a Star Destroyer launches at the player. An ORIGINAL
 * STARSHELL silhouette (aggressive angular void-fighter mood — bladed fuselage, swept
 * forward wings, twin engine nacelles with molten thruster glow, wing cannons), built from
 * primitives only and tinted to the capital ship's faction accent. Faces -Z (nose forward),
 * so orienting the Group to a flight direction is a lookAt down the velocity vector.
 *
 * Animation sink lives on `userData.fAnim`, driven by `animateFighter` (thruster pulse).
 */
interface FighterAnim {
  thrusters: THREE.MeshStandardMaterial[];
  glow: THREE.MeshStandardMaterial[];
}

export function buildFighter(tier: RenderTier, accentColor: number): THREE.Group {
  const g = new THREE.Group();
  const hull = metal(0x14161b, tier, 0.6, 0.7); // near-black charcoal, matches the SD bible
  const plate = metal(0x2b2f36, tier, 0.5, 0.8);
  const glowMat = accent(accentColor, tier, 1.8) as THREE.MeshStandardMaterial;
  const thrust = accent(0x8fd8ff, tier, 2.2) as THREE.MeshStandardMaterial;
  const anim: FighterAnim = { thrusters: [thrust], glow: [glowMat] };

  // Bladed central fuselage — a long tapered wedge, pointed nose forward (-Z).
  g.add(coneZ(0.12, 0.42, 2.6, hull, 0, 0, -0.1));
  g.add(box(0.5, 0.34, 1.5, plate, 0, 0, 0.2)); // dorsal spine block
  // Cockpit core — a glowing sensor eye up front.
  g.add(capsuleZ(0.16, 0.4, glowMat, 0, 0.12, -0.7));

  // Swept forward wings — angled blades either side.
  for (const s of [-1, 1] as const) {
    const wing = box(1.3, 0.09, 0.9, plate, s * 0.95, -0.02, 0.35);
    wing.rotation.y = s * 0.5;   // sweep the leading edge forward
    wing.rotation.z = s * -0.22; // slight anhedral cant
    g.add(wing);
    // Wingtip cannon.
    g.add(cylZ(0.07, 1.0, hull, s * 1.5, -0.02, -0.35, 8));
    g.add(capsuleZ(0.05, 0.16, glowMat, s * 1.5, -0.02, -0.9)); // muzzle glow
    // Engine nacelle slung under each wing root, with a molten thruster ring at the rear.
    g.add(cylZ(0.18, 1.1, plate, s * 0.55, -0.14, 0.55, 10));
    g.add(cylZ(0.19, 0.16, thrust, s * 0.55, -0.14, 1.14, 10)); // thruster mouth
  }
  // Tail fin.
  const fin = box(0.08, 0.6, 0.7, plate, 0, 0.28, 0.7);
  g.add(fin);

  g.scale.setScalar(1.15);
  g.userData.fAnim = anim;
  return g;
}

/** Per-frame: pulse the thruster + accent glow. Orientation + bank roll are applied by the
 *  caller after a lookAt down the velocity vector. */
export function animateFighter(model: THREE.Object3D, now: number): void {
  const a = model.userData.fAnim as FighterAnim | undefined;
  if (!a) return;
  for (const m of a.thrusters) m.emissiveIntensity = 1.8 + Math.sin(now * 0.02) * 0.6;
  for (const m of a.glow) m.emissiveIntensity = 1.6 + Math.sin(now * 0.008) * 0.3;
}
