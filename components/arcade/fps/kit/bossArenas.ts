/**
 * BOSS ARENAS — bespoke boss-fight levels built from the modular kit (so pickups,
 * buildings, walls, bridges + themes all work, unlike the pickup-less makeArena3D).
 *
 * `bossArena` takes a boss's terrain placements and GUARANTEES the fight is stocked:
 * it scatters ≥N each of ammo/shield/health crates + a couple of resupply stations at
 * free cells, so every boss encounter has plenty of drops to run for. Per-boss arena
 * builders (added per batch) supply the terrain that favors that boss; until then
 * `scatterBuildingsAndWalls` gives a functional building+cover spread with an open
 * centre for the fight.
 *
 * Imported ONLY by the /arcade chunk.
 */
import { rng } from '../rand';
import { CELL, LAYOUT_VERSION, type BridgeSpan, type BuildingKind, type LevelLayout, type Placement, type PropKind, type Rot } from './layout';

const key = (gx: number, gz: number) => `${gx},${gz}`;

export interface BossArenaSpec {
  theme: string;
  size: number; // arena metres (square)
  placements?: Placement[]; // boss-specific buildings / walls / terrain
  bridges?: BridgeSpan[];
  drops?: number; // count EACH of ammo/shield/health (default 12)
  stations?: number; // resupply stations (default 2)
}

/** Build a stocked boss arena: the boss's placements + a guaranteed scatter of
 *  ammo/shield/health pickups + stations, so the player always has drops to run for. */
export function bossArena(spec: BossArenaSpec, seed: number): LevelLayout {
  const r = rng(seed ^ 0x0805);
  const half = spec.size / 2;
  const reach = Math.max(3, Math.floor((half - 10) / CELL));
  // The boss spawns at enemySpawn (generate.ts default +half*0.86); the player at -half*0.86.
  const spawnGz = Math.round((half * 0.86) / CELL);
  // Keep a clear zone (2 cells ≈ 32 m) around BOTH spawns so nothing traps the boss/player.
  const CLEAR = 2;
  const clear = (gx: number, gz: number) => Math.hypot(gx, gz - spawnGz) <= CLEAR || Math.hypot(gx, gz + spawnGz) <= CLEAR;
  const occupied = new Set<string>();
  // Drop any bespoke placement that would land on a spawn — the actual "stuck in a
  // building" fix (buildings previously ignored the spawn zone entirely).
  const placements: Placement[] = (spec.placements ?? []).filter((p) => !clear(p.gx, p.gz));
  for (const p of placements) occupied.add(key(p.gx, p.gz));
  const scatter = (module: PropKind, count: number) => {
    let placed = 0;
    let guard = 0;
    while (placed < count && guard++ < count * 60) {
      const gx = Math.round((r() * 2 - 1) * reach);
      const gz = Math.round((r() * 2 - 1) * reach);
      if (occupied.has(key(gx, gz)) || clear(gx, gz)) continue;
      placements.push({ module, gx, gz, rot: 0 });
      occupied.add(key(gx, gz));
      placed++;
    }
  };
  const d = spec.drops ?? 12;
  scatter('ammocrate', d);
  scatter('shieldcrate', d);
  scatter('healthcrate', d);
  scatter('station', spec.stations ?? 2);
  return { v: LAYOUT_VERSION, theme: spec.theme, size: spec.size, seed, placements, bridges: spec.bridges };
}

/** ARCHON arena — a symmetric NEON geometry: four watchtowers (the vantage points it
 *  blinks between) around a central command hub, with mid-lane cover to break its long
 *  precise sightlines, plus plentiful drops. */
export function bossArenaArchon(seed: number): LevelLayout {
  const p: Placement[] = [{ module: 'command', gx: 0, gz: 0, rot: 0 }];
  for (const [gx, gz] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) p.push({ module: 'watchtower', gx, gz, rot: 0 });
  for (const [gx, gz, rot] of [[-2, 0, 90], [2, 0, 90], [0, -2, 0], [0, 2, 0]] as [number, number, Rot][]) p.push({ module: 'coverwall', gx, gz, rot });
  for (const [gx, gz] of [[-2, -2], [2, 2], [2, -2], [-2, 2]]) p.push({ module: 'container', gx, gz, rot: 0 });
  return bossArena({ theme: 'neon', size: 176, placements: p, drops: 14 }, seed);
}

/** BEHEMOTH arena — a wide VOLCANIC field with a big OPEN centre the fortress dominates,
 *  ringed by bunkers + loose cover the player hugs, and abundant drops so you dart out
 *  from the rim to resupply. */
export function bossArenaBehemoth(seed: number): LevelLayout {
  const p: Placement[] = [];
  for (const [gx, gz] of [[-5, -5], [5, -5], [-5, 5], [5, 5], [-5, 0], [5, 0], [0, -5], [0, 5]]) p.push({ module: 'bunker', gx, gz, rot: 0 });
  for (const [gx, gz, rot] of [[-3, -4, 0], [3, 4, 0], [-4, 3, 90], [4, -3, 90]] as [number, number, Rot][]) p.push({ module: 'coverwall', gx, gz, rot });
  for (const [gx, gz] of [[-2, -3], [2, 3], [-3, 2], [3, -2]]) p.push({ module: 'sandbags', gx, gz, rot: 0 });
  return bossArena({ theme: 'volcanic', size: 200, placements: p, drops: 14 }, seed);
}

/** SPECTER arena — a DENSE, dark NEON warren: buildings + alleys + extra loose walls it
 *  phases through to flank you, with extra drops + a third station so you can keep
 *  repositioning against its ambushes. */
export function bossArenaSpecter(seed: number): LevelLayout {
  const p = scatterBuildingsAndWalls(168, seed);
  const occ = new Set(p.map((q) => key(q.gx, q.gz)));
  for (const [gx, gz, rot] of [[-3, -1, 90], [3, 1, 90], [-1, 3, 0], [1, -3, 0], [-2, 2, 90], [2, -2, 0]] as [number, number, Rot][]) {
    if (!occ.has(key(gx, gz))) p.push({ module: 'coverwall', gx, gz, rot });
  }
  return bossArena({ theme: 'neon', size: 168, placements: p, drops: 16, stations: 3 }, seed);
}

/** LEVIATHAN arena — an open DESERT digging-ground the serpent burrows through, dotted
 *  with a few RAISED towers (the "safe" tiles you climb onto) + loose walls, drops
 *  clustered on/near the platforms so you fight to stay up. */
export function bossArenaLeviathan(seed: number): LevelLayout {
  const p: Placement[] = [];
  for (const [gx, gz] of [[-3, -3], [3, -3], [-3, 3], [3, 3], [0, 0]]) p.push({ module: 'watchtower', gx, gz, rot: 0 }); // raised platforms
  for (const [gx, gz, rot] of [[-5, 0, 90], [5, 0, 90], [0, -5, 0], [0, 5, 0]] as [number, number, Rot][]) p.push({ module: 'coverwall', gx, gz, rot });
  for (const [gx, gz] of [[-4, 4], [4, -4], [-4, -4], [4, 4]]) p.push({ module: 'rubble', gx, gz, rot: 0 });
  return bossArena({ theme: 'desert', size: 190, placements: p, drops: 14 }, seed);
}

/** MONOLITH arena — a reflective FROZEN open field the crystal reshapes: a ring of
 *  crystalline cover (containers/walls) it refracts around, starter walls, and drops
 *  scattered between them. */
export function bossArenaMonolith(seed: number): LevelLayout {
  const p: Placement[] = [{ module: 'command', gx: 0, gz: 0, rot: 0 }];
  for (const [gx, gz] of [[-3, -3], [3, -3], [-3, 3], [3, 3], [-4, 0], [4, 0], [0, -4], [0, 4]]) p.push({ module: 'container', gx, gz, rot: 0 });
  for (const [gx, gz, rot] of [[-2, -2, 0], [2, 2, 0], [2, -2, 90], [-2, 2, 90]] as [number, number, Rot][]) p.push({ module: 'coverwall', gx, gz, rot });
  return bossArena({ theme: 'frozen', size: 180, placements: p, drops: 14 }, seed);
}

/** OBLIVION arena — a dark MOON void with scattered cover ISLANDS (bunkers/ruins) amid
 *  open ground the entity warps; drops sit on the islands you fight the pull to reach. */
export function bossArenaOblivion(seed: number): LevelLayout {
  const p: Placement[] = [];
  for (const [gx, gz] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) p.push({ module: 'bunker', gx, gz, rot: 0 });
  for (const [gx, gz] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) p.push({ module: 'ruin', gx, gz, rot: 0 });
  for (const [gx, gz, rot] of [[-3, 3, 90], [3, -3, 90], [-3, -3, 0], [3, 3, 0]] as [number, number, Rot][]) p.push({ module: 'coverwall', gx, gz, rot });
  return bossArena({ theme: 'moon', size: 184, placements: p, drops: 14 }, seed);
}

/** COLOSSUS arena — a fortified INDUSTRIAL yard: hard container cover + bunkers + walls
 *  to weather its barrage from, plenty of drops so you can keep re-arming under fire. */
export function bossArenaColossus(seed: number): LevelLayout {
  const p: Placement[] = [];
  for (const [gx, gz] of [[-4, -4], [4, -4], [-4, 4], [4, 4], [-2, -4], [2, 4]]) p.push({ module: 'container', gx, gz, rot: 0 });
  for (const [gx, gz] of [[-5, 0], [5, 0]]) p.push({ module: 'bunker', gx, gz, rot: 0 });
  for (const [gx, gz, rot] of [[-2, 0, 90], [2, 0, 90], [0, -3, 0], [0, 3, 0], [-3, 2, 90], [3, -2, 90]] as [number, number, Rot][]) p.push({ module: 'coverwall', gx, gz, rot });
  return bossArena({ theme: 'industrial', size: 190, placements: p, drops: 15 }, seed);
}

/** CHIMERA arena — a mixed JUNGLE of both close cover (ruins/rubble) and open lanes so
 *  both its melee + ranged limb-sets matter; strong drops so you can swap weapons to
 *  break its adaptation. */
export function bossArenaChimera(seed: number): LevelLayout {
  const p = scatterBuildingsAndWalls(172, seed);
  const occ = new Set(p.map((q) => key(q.gx, q.gz)));
  for (const [gx, gz] of [[-2, -2], [2, 2], [-2, 2], [2, -2]] as [number, number][]) {
    if (!occ.has(key(gx, gz))) p.push({ module: 'ruin', gx, gz, rot: 0 });
  }
  return bossArena({ theme: 'jungle', size: 172, placements: p, drops: 16 }, seed);
}

/** ORACLE arena — a sparse MOON expanse: scattered ruins + watchtower platforms to hold,
 *  long open sightlines for its convergence beams, drops on the safe platforms so you
 *  rotate through cover. */
export function bossArenaOracle(seed: number): LevelLayout {
  const p: Placement[] = [];
  for (const [gx, gz] of [[-4, -4], [4, 4], [-4, 4], [4, -4]]) p.push({ module: 'watchtower', gx, gz, rot: 0 });
  for (const [gx, gz] of [[-2, 0], [2, 0], [0, -3], [0, 3], [-3, 2], [3, -2]]) p.push({ module: 'ruin', gx, gz, rot: 0 });
  for (const [gx, gz, rot] of [[-2, -2, 90], [2, 2, 90]] as [number, number, Rot][]) p.push({ module: 'coverwall', gx, gz, rot });
  return bossArena({ theme: 'moon', size: 186, placements: p, drops: 14 }, seed);
}

/** INFESTOR arena — a dense JUNGLE of functional buildings it infests + rubble
 *  everywhere; heavy drops so you keep moving ahead of the flood. */
export function bossArenaInfestor(seed: number): LevelLayout {
  const p = scatterBuildingsAndWalls(176, seed);
  const occ = new Set(p.map((q) => key(q.gx, q.gz)));
  for (const [gx, gz] of [[-2, -1], [2, 1], [-1, 2], [1, -2], [0, 3], [3, 0]] as [number, number][]) {
    if (!occ.has(key(gx, gz))) p.push({ module: 'rubble', gx, gz, rot: 0 });
  }
  return bossArena({ theme: 'jungle', size: 176, placements: p, drops: 16, stations: 3 }, seed);
}

/** Functional buildings + loose cover walls scattered across a boss arena, leaving the
 *  centre + spawns open for the fight. A default terrain until a boss gets bespoke one. */
export function scatterBuildingsAndWalls(size: number, seed: number): Placement[] {
  const r = rng(seed ^ 0x01b0);
  const half = size / 2;
  const reach = Math.max(3, Math.floor((half - 12) / CELL));
  const spawnGz = Math.round((half * 0.82) / CELL);
  const out: Placement[] = [];
  const occ = new Set<string>();
  const pick = <T,>(a: T[]): T => a[Math.floor(r() * a.length)];
  const rotOf = (a: Rot[]): Rot => pick(a);
  const place = (module: BuildingKind | PropKind, gx: number, gz: number, rot: Rot, params?: { levels?: number }) => {
    if (occ.has(key(gx, gz)) || (gx === 0 && gz === 0)) return;
    if (Math.abs(gx) <= 1 && Math.abs(Math.abs(gz) - spawnGz) <= 1) return; // keep spawns clear
    out.push({ module, gx, gz, rot, params });
    occ.add(key(gx, gz));
  };
  const buildings: BuildingKind[] = ['watchtower', 'barracks', 'ruin', 'bunker', 'apartment', 'command'];
  const walls: PropKind[] = ['coverwall', 'sandbags', 'barrier', 'rubble', 'wreck', 'container', 'dragonteeth'];
  // Buildings on even cells, keeping the centre open for the boss.
  for (let gx = -reach; gx <= reach; gx += 2)
    for (let gz = -reach; gz <= reach; gz += 2) {
      if (Math.hypot(gx, gz) < 2) continue;
      if (r() < 0.4) {
        const k = pick(buildings);
        place(k, gx, gz, rotOf([0, 90, 180, 270]), k === 'apartment' ? { levels: 2 + Math.floor(r() * 3) } : undefined);
      }
    }
  // Loose cover walls on the odd-cell lanes across the whole map.
  for (let gx = -reach; gx <= reach; gx++)
    for (let gz = -reach; gz <= reach; gz++) {
      if (gx % 2 === 0 && gz % 2 === 0) continue;
      if (r() < 0.3) place(pick(walls), gx, gz, rotOf([0, 90]));
    }
  return out;
}
