/**
 * Transform-based enemy animator (no skeletal rig). Each class has its OWN gait
 * timing/posture so you read it from movement alone — Scout springy + fast, Tank
 * a slow heavy stomp with a swaying torso, Berserker hunched + frantic, Marksman/
 * Commander steady. Also a death topple. Honors the model's base hip height
 * (`userData.hipY`) and its built-in hunch so scaled classes don't collapse.
 */
import type { Object3D } from 'three';
import type { EnemyParts } from './models/trooper';
import type { EnemyClass } from './types';

interface AnimDef {
  gait: number; // stride frequency
  swing: number; // leg/arm swing amplitude
  bob: number; // torso bob height
  hunch: number; // forward torso lean (rad)
  twist: number; // idle torso sway (rad)
}
const ANIM: Record<EnemyClass, AnimDef> = {
  rifleman: { gait: 2.0, swing: 0.6, bob: 0.05, hunch: 0, twist: 0 },
  scout: { gait: 3.3, swing: 0.95, bob: 0.08, hunch: 0.08, twist: 0 }, // fast, springy
  breacher: { gait: 1.8, swing: 0.5, bob: 0.06, hunch: 0.15, twist: 0 },
  marksman: { gait: 1.6, swing: 0.4, bob: 0.03, hunch: 0, twist: 0 }, // steady
  suppressor: { gait: 1.3, swing: 0.45, bob: 0.05, hunch: 0, twist: 0 }, // methodical
  engineer: { gait: 1.9, swing: 0.5, bob: 0.04, hunch: 0, twist: 0 },
  tank: { gait: 0.95, swing: 0.35, bob: 0.08, hunch: 0, twist: 0.5 }, // slow stomp, torso sway
  elite: { gait: 2.4, swing: 0.7, bob: 0.05, hunch: 0, twist: 0 },
  commander: { gait: 1.5, swing: 0.4, bob: 0.03, hunch: 0, twist: 0 }, // calm
  berserker: { gait: 3.0, swing: 0.85, bob: 0.1, hunch: 0.35, twist: 0 }, // hunched, frantic
  artillery: { gait: 0, swing: 0, bob: 0, hunch: 0, twist: 0 }, // static emplacement (no parts → no-op)
  jetpack: { gait: 2.2, swing: 0.5, bob: 0.06, hunch: 0.12, twist: 0 }, // airborne fighter
};

export function poseEnemy(
  model: Object3D,
  cls: EnemyClass,
  moving: boolean,
  aiming: boolean,
  step: number,
  hitFlash: number,
  now: number,
  dt: number,
  muzzle: number,
): void {
  const P = model.userData.parts as EnemyParts | undefined;
  if (!P) return;
  const A = ANIM[cls];
  const hipY = (model.userData.hipY as number) ?? 0.9;
  const wk = (model.userData.weaponKind as string) ?? 'rifle';
  const melee = wk === 'claws' || wk === 'blades';
  const armed = wk === 'rifle' || wk === 'long' || wk === 'shotgun' || wk === 'beltfed' || wk === 'cannon'; // two-handed firearm
  // (welder / scepter / none fall through to the light carry pose)

  // Eased weapon RAISE: 0 = carried low, 1 = up at the shoulder aiming. Ramps when the enemy
  // acquires the player, lowers when it loses sight — so the gun visibly comes UP, not snaps.
  let aim = (model.userData.aimUp as number) ?? 0;
  aim += ((aiming ? 1 : 0) - aim) * Math.min(1, dt * 8);
  model.userData.aimUp = aim;
  const recoil = Math.max(0, Math.min(1, muzzle / 0.12)); // per-shot kick (muzzle spikes to 0.12)

  const ph = step * A.gait; // gait phase
  // Legs stride opposite each other (bigger, readable steps — no more gliding).
  const swing = moving ? Math.sin(ph) * A.swing * 1.25 : 0;
  P.legL.rotation.x = swing;
  P.legR.rotation.x = -swing;

  if (melee) {
    // Claws: a low guard that RISES into a raised guard when engaging, and lashes forward on a strike.
    const guard = -0.5 - aim * 0.75 - recoil * 0.7;
    P.armR.rotation.x = guard + (moving ? Math.sin(ph) * 0.2 * (1 - aim) : 0);
    P.armL.rotation.x = guard - (moving ? Math.sin(ph) * 0.2 * (1 - aim) : 0);
    P.armR.rotation.z = -0.28 * aim;
    P.armL.rotation.z = 0.28 * aim;
  } else if (armed) {
    // Carry low ↔ shoulder the gun two-handed. `armR` (the gun hand) lifts to level the weapon
    // at the target; `armL` crosses in to support the foregrip; the gun kicks back per shot.
    const carryR = -0.3;
    const aimR = -1.5;
    P.armR.rotation.x = carryR + (aimR - carryR) * aim + recoil * 0.3 - (moving ? swing * 0.15 * (1 - aim) : 0);
    P.weapon.position.z = 0.12 - recoil * 0.07; // recoil jolt (base local z = 0.12)
    const carryL = swing * 0.85 - 0.1;
    P.armL.rotation.x = carryL * (1 - aim) + -1.25 * aim;
    P.armL.rotation.z = 0.5 * aim; // forearm rotates inward under the barrel
  } else {
    // No weapon (engineer/support): natural counter-swing + a small ready-raise when alert.
    P.armR.rotation.x = -swing * 0.85 - 0.1 - aim * 0.5;
    P.armL.rotation.x = swing * 0.85 - 0.1 - aim * 0.5;
  }

  // Body: two dips per stride (foot-plants), a side-to-side weight sway, a lean into the walk,
  // a small square-up when aiming, and a recoil settle — reads like real footfalls + firing.
  const bob = moving ? Math.abs(Math.sin(ph)) * (A.bob + 0.06) : Math.sin(now * 0.002) * 0.012;
  P.torso.position.y = hipY + bob;
  P.torso.rotation.x = A.hunch + (moving ? 0.09 : 0) + aim * 0.05 - recoil * 0.05 + (hitFlash > 0 ? 0.25 * Math.min(1, hitFlash / 0.12) : 0);
  P.torso.rotation.z = moving ? Math.sin(ph) * 0.07 : 0; // hip/shoulder sway
  P.torso.rotation.y = (A.twist ? Math.sin(now * 0.0016) * A.twist * 0.12 : 0) + (moving ? Math.sin(ph) * 0.05 : 0);
}

/** Death topple — tips the model over its feet. Caller manages visibility/timing. */
export function poseDeath(model: Object3D, deadT: number): void {
  model.rotation.x = -Math.min(1, deadT / 0.5) * 1.45;
}
