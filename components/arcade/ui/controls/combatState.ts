/**
 * The Dynamic Combat HUD state — derived every frame from the snapshot, it tells
 * the buttons + HUD how PROMINENT to be (buttons never move, only their emphasis
 * changes). Out of combat everything dims; when it matters (enemy near, low HP,
 * reloading, grapple ready, boss) the relevant controls light up / pulse.
 */
import type { FpsSnapshot } from '../../useFpsLoop';
import type { ButtonAction } from './layout';

export interface HudState {
  inCombat: boolean;
  enemyNear: boolean;
  takingDamage: boolean;
  lowHealth: boolean;
  reloading: boolean;
  reloadProgress: number; // 0..1
  grenadeReady: boolean;
  grappleReady: boolean;
  boss: boolean;
  baseOpacity: number; // out-of-combat dim → in-combat full
}

const NEAR = 28; // world units counted as "enemy nearby" on the radar

export function deriveHudState(snap: FpsSnapshot, now: number): HudState {
  const recent = (t: number, ms = 2200) => now - t < ms;
  const enemyNear = snap.radar.some((r) => !r.kind && Math.hypot(r.x, r.z) < NEAR);
  const takingDamage = now - snap.hurtAt < 900;
  const boss = snap.bosses.length > 0;
  const inCombat = enemyNear || boss || takingDamage || recent(snap.fireAt) || recent(snap.hitAt);
  const lowHealth = snap.maxHp > 0 && snap.health / snap.maxHp < 0.3;
  return {
    inCombat,
    enemyNear,
    takingDamage,
    lowHealth,
    reloading: snap.reloading,
    reloadProgress: snap.reloadProgress ?? 0,
    grenadeReady: snap.throwCount > 0,
    grappleReady: snap.grappleReady,
    boss,
    baseOpacity: inCombat ? 1 : 0.45,
  };
}

/** Per-button emphasis: how bright, whether to pulse, and any cooldown/progress ring. */
export function buttonState(id: ButtonAction, hud: HudState): { prominence: number; pulse: boolean; cooldown: number } {
  const base = hud.baseOpacity;
  const combat = hud.inCombat ? 0.92 : base;
  switch (id) {
    case 'fire':
      return { prominence: hud.enemyNear || hud.inCombat ? 1 : base, pulse: false, cooldown: 0 };
    case 'jump':
      return { prominence: hud.takingDamage || hud.lowHealth ? 1 : combat, pulse: hud.enemyNear, cooldown: 0 };
    case 'grapple':
      return { prominence: hud.grappleReady ? 1 : base * 0.7, pulse: hud.grappleReady, cooldown: 0 };
    case 'reload':
      return { prominence: hud.reloading ? 1 : combat, pulse: false, cooldown: hud.reloading ? hud.reloadProgress : 0 };
    case 'throw':
      return { prominence: hud.grenadeReady && hud.inCombat ? 1 : base, pulse: false, cooldown: 0 };
    case 'crouch':
      return { prominence: hud.takingDamage || hud.lowHealth ? 1 : combat, pulse: false, cooldown: 0 };
    case 'swap':
    case 'zoom':
    default:
      return { prominence: combat, pulse: false, cooldown: 0 };
  }
}
