/**
 * BossBrain — the Boss Overhaul tactical layer. The boss is a RANGED KITER: it
 * holds a standoff distance and shoots from afar, strafing to stay a hard target,
 * and — crucially — when the player breaks line of sight (ducks behind cover) it
 * maneuvers AROUND the obstacle to regain a clean shot rather than charging in.
 * It never closes to brawl and never tries to climb; it repositions for the angle.
 *
 * Cheap + allocation-free per frame (a sign + two timers on the Enemy). P1+ layers
 * attack selection + minion commands on top via the same per-boss state.
 *
 * Imported ONLY by the /arcade chunk.
 */
export interface BossBrainState {
  strafeSign: 1 | -1;
  losBlockedT: number; // seconds without a clean shot (commit harder / flip to flank)
  flipT: number; // periodic strafe-side flip while holding the line
  // Pounce (Xenomorph signature lunge): windup → leap → resolve; a miss = vulnerable.
  pounce: 'none' | 'windup' | 'leap';
  pounceT: number; // remaining seconds in the current pounce phase
  pounceX: number; // committed landing spot
  pounceZ: number;
  pounceCd: number; // cooldown before the next pounce
  volleyCd: number; // cooldown for a boss special (Warlord grenade volley)
  fogCd: number; // cooldown for the Kraken's void fog
  // Generic slots reused by the new civilization bosses (blink / charge / mutate /
  // erupt / grow cooldowns + a mode/state counter + a committed target point).
  abilityCd: number;
  abilityCd2: number;
  abilityT: number;
  mode: number;
  tgX: number;
  tgZ: number;
}

export interface BossMove {
  wx: number; // desired move direction (normalized-ish)
  wz: number;
  speedMul: number; // multiply the boss base speed
}

export function makeBossBrain(): BossBrainState {
  return { strafeSign: Math.random() < 0.5 ? 1 : -1, losBlockedT: 0, flipT: 1 + Math.random() * 2, pounce: 'none', pounceT: 0, pounceX: 0, pounceZ: 0, pounceCd: 4, volleyCd: 3, fogCd: 7, abilityCd: 3, abilityCd2: 5, abilityT: 0, mode: 0, tgX: 0, tgZ: 0 };
}

const STAND_MIN = 13; // back off if closer than this
const STAND_MAX = 24; // close in if farther than this

/**
 * Advance the brain and return this frame's movement intent. `focus` is where the
 * boss believes the player is (last-known when sight is broken); `canSee` is a true
 * line-of-sight to the player right now (a clean shot).
 */
export function tickBossBrain(
  b: BossBrainState,
  ex: number,
  ez: number,
  focusX: number,
  focusZ: number,
  canSee: boolean,
  dist: number,
  dt: number,
): BossMove {
  let tx = focusX - ex;
  let tz = focusZ - ez;
  const tl = Math.hypot(tx, tz) || 1;
  tx /= tl;
  tz /= tl;
  const perpX = -tz; // tangent (for strafing / orbiting)
  const perpZ = tx;

  // Periodic strafe-side flip so it isn't predictable while holding.
  b.flipT -= dt;
  if (b.flipT <= 0) {
    if (Math.random() < 0.5) b.strafeSign = (b.strafeSign * -1) as 1 | -1;
    b.flipT = 2 + Math.random() * 2;
  }

  if (!canSee) {
    // No clean shot: flank AROUND cover to peek the player, edging toward their
    // last spot. If it's been blocked too long, flip and try the other way.
    b.losBlockedT += dt;
    if (b.losBlockedT > 1.5) {
      b.strafeSign = (b.strafeSign * -1) as 1 | -1;
      b.losBlockedT = 0;
    }
    return { wx: perpX * b.strafeSign + tx * 0.6, wz: perpZ * b.strafeSign + tz * 0.6, speedMul: 1.3 };
  }
  b.losBlockedT = 0;

  if (dist < STAND_MIN) {
    // Too close: back off to standoff while strafing.
    return { wx: -tx * 0.9 + perpX * b.strafeSign * 0.5, wz: -tz * 0.9 + perpZ * b.strafeSign * 0.5, speedMul: 1.15 };
  }
  if (dist > STAND_MAX) {
    // Too far: close into firing range on a slight arc.
    return { wx: tx + perpX * b.strafeSign * 0.3, wz: tz + perpZ * b.strafeSign * 0.3, speedMul: 1.0 };
  }
  // In the pocket with a clean shot: strafe laterally to stay hard to hit.
  return { wx: perpX * b.strafeSign, wz: perpZ * b.strafeSign, speedMul: 0.85 };
}
