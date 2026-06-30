/**
 * BossBrain — the Boss Overhaul tactical layer. A boss never just walks at the
 * player: every couple of seconds it re-assesses (distance, whether the player is
 * camping, its own phase) and picks a movement TACTIC — approach in an arc, strafe
 * a ring, reposition to a fresh angle, or back off — plus occasional lateral dashes.
 *
 * P0 ships the movement brain (used by the boss block in `enemy.ts`); P1+ layers
 * attack selection + minion commands on top via the same per-boss state. Cheap +
 * allocation-free per frame (timers + a couple of scalars on the Enemy).
 *
 * Imported ONLY by the /arcade chunk.
 */
export type BossTactic = 'approach' | 'strafe' | 'reposition' | 'retreat';

export interface BossBrainState {
  tactic: BossTactic;
  tacticT: number; // seconds until the next re-assessment
  strafeSign: 1 | -1;
  repos: { x: number; z: number } | null; // chosen reposition point
  campT: number; // how long the player has held roughly one spot
  dashT: number; // remaining seconds of a lateral burst
  dashCd: number; // cooldown before the next dash
}

export interface BossMove {
  wx: number; // desired move direction (normalized-ish)
  wz: number;
  speedMul: number; // multiply the boss base speed
}

export function makeBossBrain(): BossBrainState {
  return { tactic: 'approach', tacticT: 0, strafeSign: Math.random() < 0.5 ? 1 : -1, repos: null, campT: 0, dashT: 0, dashCd: 2 };
}

/**
 * Advance the brain and return this frame's movement intent toward `focus` (where
 * the boss believes the player is). `pvx/pvz` = player velocity (for camp reads).
 */
export function tickBossBrain(
  b: BossBrainState,
  ex: number,
  ez: number,
  focusX: number,
  focusZ: number,
  pvx: number,
  pvz: number,
  dist: number,
  dt: number,
): BossMove {
  // Direction to the focus + the tangent (perpendicular) for arcs/strafes.
  let tx = focusX - ex;
  let tz = focusZ - ez;
  const tl = Math.hypot(tx, tz) || 1;
  tx /= tl;
  tz /= tl;
  const gx = -tz; // tangent
  const gz = tx;

  // Player-habit read: stationary play accrues a camp timer (decays when moving).
  const pSpeed = Math.hypot(pvx, pvz);
  if (pSpeed < 1.6) b.campT += dt;
  else b.campT = Math.max(0, b.campT - dt * 2);

  // Lateral dash cadence (sudden sidestep to break the player's aim).
  b.dashCd -= dt;
  if (b.dashT > 0) b.dashT -= dt;
  else if (b.dashCd <= 0 && (b.tactic === 'strafe' || b.tactic === 'approach')) {
    if (Math.random() < 0.5) {
      b.dashT = 0.4;
      b.strafeSign = (Math.random() < 0.5 ? 1 : -1) as 1 | -1;
    }
    b.dashCd = 2.2 + Math.random() * 2;
  }

  // Re-assess the tactic on a timer.
  b.tacticT -= dt;
  if (b.tacticT <= 0) {
    if (dist > 14) b.tactic = 'approach';
    else if (b.campT > 2.5) {
      b.tactic = 'reposition'; // punish camping: flank in from a new angle
      const a = Math.atan2(ex - focusX, ez - focusZ) + (Math.random() < 0.5 ? 1 : -1) * (1.2 + Math.random() * 0.6);
      b.repos = { x: focusX + Math.sin(a) * 9, z: focusZ + Math.cos(a) * 9 };
      b.campT = 0;
    } else if (dist < 6.5) b.tactic = Math.random() < 0.5 ? 'reposition' : 'strafe';
    else b.tactic = 'strafe';
    if (b.tactic === 'reposition' && !b.repos) {
      const a = Math.atan2(ex - focusX, ez - focusZ) + (Math.random() < 0.5 ? 1 : -1) * 1.3;
      b.repos = { x: focusX + Math.sin(a) * 9, z: focusZ + Math.cos(a) * 9 };
    }
    if (b.tactic !== 'reposition') b.repos = null;
    if (Math.random() < 0.4) b.strafeSign = (b.strafeSign * -1) as 1 | -1;
    b.tacticT = 1.6 + Math.random() * 1.8;
  }

  const dash = b.dashT > 0 ? 1.9 : 1;
  switch (b.tactic) {
    case 'approach': {
      // Close distance, but on an arc rather than a straight line.
      return { wx: tx + gx * 0.45 * b.strafeSign, wz: tz + gz * 0.45 * b.strafeSign, speedMul: 1.0 * dash };
    }
    case 'strafe': {
      // Circle the player with a slight inward bias to keep pressure.
      return { wx: gx * b.strafeSign + tx * 0.15, wz: gz * b.strafeSign + tz * 0.15, speedMul: 1.05 * dash };
    }
    case 'reposition': {
      if (!b.repos) return { wx: tx, wz: tz, speedMul: 1.1 };
      let rx = b.repos.x - ex;
      let rz = b.repos.z - ez;
      const rl = Math.hypot(rx, rz) || 1;
      rx /= rl;
      rz /= rl;
      if (rl < 1.5) {
        b.repos = null;
        b.tactic = 'approach';
        b.tacticT = 0.1;
      }
      return { wx: rx, wz: rz, speedMul: 1.15 };
    }
    case 'retreat':
    default:
      return { wx: -tx, wz: -tz, speedMul: 1.1 };
  }
}
