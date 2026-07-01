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
  const spawnGz = Math.round((half * 0.82) / CELL);
  const occupied = new Set<string>();
  const placements: Placement[] = [...(spec.placements ?? [])];
  for (const p of placements) occupied.add(key(p.gx, p.gz));
  const nearSpawn = (gx: number, gz: number) => Math.abs(gx) <= 1 && Math.abs(Math.abs(gz) - spawnGz) <= 1;
  const scatter = (module: PropKind, count: number) => {
    let placed = 0;
    let guard = 0;
    while (placed < count && guard++ < count * 60) {
      const gx = Math.round((r() * 2 - 1) * reach);
      const gz = Math.round((r() * 2 - 1) * reach);
      if (occupied.has(key(gx, gz)) || nearSpawn(gx, gz)) continue;
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
