/**
 * Navigation graph for the enemy AI. Built ONCE per level (gen-time) from the
 * raw geometry, it lets bots route the whole battlefield — around big structures,
 * up ladders, across ramps/trenches — instead of walking straight into walls and
 * only ever reaching the first deck.
 *
 * Nodes: a coarse walkable ground lattice (flat ground, ramp surfaces, and sunken
 * trench floors all sample naturally), plus feature nodes at ladder ends, ramp
 * ends, and zipline ends. Links: 8-neighbour WALK links on the lattice (clear of
 * ground obstacles, small height delta), LADDER/RAMP links between feature ends,
 * and one-way ZIP links. `pathTo` is bounded A* with a greedy fallback so a bot
 * always makes progress; the loop throttles repaths and hands off to the existing
 * close-range steering on final approach.
 *
 * Purely additive: nothing here runs unless a graph is built and threaded in.
 */
import type { Box, Level3D, Ramp } from '../level3d';
import { rampContains, rampHeightAt } from '../level3d';
import type { SpatialGrid } from './grid';

export type NavLinkKind = 'walk' | 'ladder' | 'ramp' | 'zip';
export interface NavNode {
  x: number;
  y: number;
  z: number;
}
interface Edge {
  to: number;
  cost: number;
  kind: NavLinkKind;
}
export interface NavGraph {
  nodes: NavNode[];
  adj: Edge[][];
}

/** Collision radius used when probing walkability for nav (a touch under a bot's). */
const R_NAV = 0.6;

/** A box is a ground obstacle for a grounded bot only if its base sits low enough
 *  to block walking (raised decks/overhangs don't block the ground beneath them). */
function groundBlocked(boxes: readonly Box[], x: number, z: number, r: number): boolean {
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    if (b.y - b.sy / 2 >= 1.6) continue; // overhead, not a ground obstacle
    if (
      x + r > b.x - b.sx / 2 &&
      x - r < b.x + b.sx / 2 &&
      z + r > b.z - b.sz / 2 &&
      z - r < b.z + b.sz / 2
    ) {
      return true;
    }
  }
  return false;
}

/** Walkable ground height at (x,z): the highest ramp surface there, else 0. */
function groundYAt(lvl: Level3D, x: number, z: number): number {
  let y = 0;
  const ramps = lvl.ramps;
  if (ramps) {
    for (let i = 0; i < ramps.length; i++) {
      const rmp = ramps[i];
      if (rampContains(rmp, x, z)) {
        const h = rampHeightAt(rmp, x, z);
        if (h > y) y = h;
      }
    }
  }
  return y;
}

/** Is the straight ground path between two points clear of obstacles? (sampled) */
function segClear(lvl: Level3D, grid: SpatialGrid | undefined, ax: number, az: number, bx: number, bz: number, r: number): boolean {
  const d = Math.hypot(bx - ax, bz - az);
  const n = Math.max(1, Math.ceil(d / 1.5));
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const x = ax + (bx - ax) * t;
    const z = az + (bz - az) * t;
    const boxes = grid ? grid.queryAABB(x - r, z - r, x + r, z + r) : lvl.boxes;
    if (groundBlocked(boxes, x, z, r)) return false;
  }
  return true;
}

/** Build the nav graph for a level. O(n) lattice + per-feature local linking;
 *  runs once at level load (a few ms even on the 220 m map). */
export function buildNavGraph(lvl: Level3D, grid?: SpatialGrid): NavGraph {
  const nodes: NavNode[] = [];
  const adj: Edge[][] = [];
  const addNode = (x: number, y: number, z: number): number => {
    nodes.push({ x, y, z });
    adj.push([]);
    return nodes.length - 1;
  };
  const link = (a: number, b: number, kind: NavLinkKind, cost: number): void => {
    adj[a].push({ to: b, cost, kind });
    adj[b].push({ to: a, cost, kind });
  };
  // 1. Ground lattice (regular grid → trivial neighbour links).
  const half = lvl.size / 2;
  const step = Math.min(14, Math.max(9, lvl.size / 14));
  const margin = 4;
  const lo = -half + margin;
  const span = half - margin - lo;
  const n = Math.max(2, Math.floor(span / step) + 1);
  const sp = span / (n - 1);
  const idx: number[][] = [];
  for (let r = 0; r < n; r++) {
    idx[r] = [];
    for (let c = 0; c < n; c++) {
      const x = lo + c * sp;
      const z = lo + r * sp;
      const boxes = grid ? grid.queryAABB(x - R_NAV, z - R_NAV, x + R_NAV, z + R_NAV) : lvl.boxes;
      idx[r][c] = groundBlocked(boxes, x, z, R_NAV) ? -1 : addNode(x, groundYAt(lvl, x, z), z);
    }
  }
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const a = idx[r][c];
      if (a < 0) continue;
      const na = nodes[a];
      const tryLink = (rr: number, cc: number): void => {
        if (rr < 0 || cc < 0 || rr >= n || cc >= n) return;
        const b = idx[rr][cc];
        if (b < 0 || b <= a) return; // b<=a: link each pair once (link() is undirected)
        const nb = nodes[b];
        if (Math.abs(nb.y - na.y) > 1.5) return; // too tall a step for the ground net
        if (!segClear(lvl, grid, na.x, na.z, nb.x, nb.z, R_NAV)) return;
        link(a, b, 'walk', Math.hypot(nb.x - na.x, nb.z - na.z) + Math.abs(nb.y - na.y) * 1.5);
      };
      tryLink(r, c + 1);
      tryLink(r + 1, c);
      tryLink(r + 1, c + 1);
      tryLink(r + 1, c - 1);
    }
  }

  // Connect a feature node to nearby existing nodes (lattice + earlier features).
  const connectLocal = (id: number): void => {
    const a = nodes[id];
    for (let j = 0; j < id; j++) {
      const b = nodes[j];
      const dxz = Math.hypot(b.x - a.x, b.z - a.z);
      if (dxz > sp * 1.7 || dxz < 0.01) continue;
      if (Math.abs(b.y - a.y) > 1.6) continue;
      if (!segClear(lvl, grid, a.x, a.z, b.x, b.z, R_NAV)) continue;
      link(id, j, 'walk', dxz + Math.abs(b.y - a.y) * 1.5);
    }
  };

  // 2. Ladder ends (bottom ↔ top), each connected into the local net.
  for (const l of lvl.ladders) {
    const b = addNode(l.x - l.exX * 0.8, l.y0, l.z - l.exZ * 0.8);
    const t = addNode(l.x + l.exX * 1.2, l.y1 - 0.5, l.z + l.exZ * 1.2);
    link(b, t, 'ladder', (l.y1 - l.y0) * 1.5 + 3);
    connectLocal(b);
    connectLocal(t);
  }

  // 3. Ramp ends (low ↔ high). Endpoints sit just inside each end of the slope.
  const ends = (rmp: Ramp): { loX: number; loZ: number; hiX: number; hiZ: number; len: number } => {
    const hx = rmp.sx / 2 - 0.5;
    const hz = rmp.sz / 2 - 0.5;
    switch (rmp.dir) {
      case '+z':
        return { loX: rmp.x, loZ: rmp.z - hz, hiX: rmp.x, hiZ: rmp.z + hz, len: rmp.sz };
      case '-z':
        return { loX: rmp.x, loZ: rmp.z + hz, hiX: rmp.x, hiZ: rmp.z - hz, len: rmp.sz };
      case '+x':
        return { loX: rmp.x - hx, loZ: rmp.z, hiX: rmp.x + hx, hiZ: rmp.z, len: rmp.sx };
      default: // '-x'
        return { loX: rmp.x + hx, loZ: rmp.z, hiX: rmp.x - hx, hiZ: rmp.z, len: rmp.sx };
    }
  };
  for (const rmp of lvl.ramps ?? []) {
    const e = ends(rmp);
    const a = addNode(e.loX, rmp.yLo, e.loZ);
    const b = addNode(e.hiX, rmp.yHi, e.hiZ);
    link(a, b, 'ramp', e.len + Math.abs(rmp.yHi - rmp.yLo) * 1.2);
    connectLocal(a);
    connectLocal(b);
  }

  // Ziplines are intentionally NOT added as nav links — bots don't ride them yet
  // (player-only traversal), so routing over one would walk a bot off a rooftop.
  // They path via walk/ladder/ramp; bot zip-riding is a later polish add.

  return { nodes, adj };
}

/** Nearest graph node to a point, weighting vertical distance so a bot on a deck
 *  snaps to that deck's node rather than the ground directly below it. */
export function nearestNode(graph: NavGraph, x: number, z: number, y = 0): number {
  let best = 0;
  let bd = Infinity;
  const nodes = graph.nodes;
  for (let i = 0; i < nodes.length; i++) {
    const ndy = (nodes[i].y - y) * 2;
    const d = (nodes[i].x - x) ** 2 + (nodes[i].z - z) ** 2 + ndy * ndy;
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  return best;
}

function reconstruct(came: Map<number, number>, end: number): number[] {
  const out: number[] = [end];
  let c = end;
  while (came.has(c)) {
    c = came.get(c)!;
    out.push(c);
  }
  out.reverse();
  out.shift(); // drop the start node; keep the waypoints (… → goal)
  return out;
}

/** Bounded A* (≤256 expansions) → waypoint node ids from start to goal. If the
 *  goal can't be reached in budget, returns the route to the closest-to-goal node
 *  we expanded (greedy fallback) so the bot still advances. [] = no progress. */
export function pathTo(graph: NavGraph, start: number, goal: number): number[] {
  if (start === goal) return [];
  const { nodes, adj } = graph;
  const gn = nodes[goal];
  const H = (i: number): number => Math.hypot(nodes[i].x - gn.x, nodes[i].z - gn.z) + Math.abs(nodes[i].y - gn.y);
  const came = new Map<number, number>();
  const g = new Map<number, number>();
  const f = new Map<number, number>();
  const open: number[] = [start];
  const inOpen = new Set<number>([start]);
  g.set(start, 0);
  f.set(start, H(start));
  let bestNode = start;
  let bestH = H(start);
  let expansions = 0;
  while (open.length > 0 && expansions < 256) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) {
      if ((f.get(open[i]) ?? Infinity) < (f.get(open[bi]) ?? Infinity)) bi = i;
    }
    const cur = open.splice(bi, 1)[0];
    inOpen.delete(cur);
    expansions++;
    if (cur === goal) return reconstruct(came, goal);
    const hc = H(cur);
    if (hc < bestH) {
      bestH = hc;
      bestNode = cur;
    }
    const edges = adj[cur];
    for (let k = 0; k < edges.length; k++) {
      const e = edges[k];
      const ng = (g.get(cur) ?? Infinity) + e.cost;
      if (ng < (g.get(e.to) ?? Infinity)) {
        came.set(e.to, cur);
        g.set(e.to, ng);
        f.set(e.to, ng + H(e.to));
        if (!inOpen.has(e.to)) {
          open.push(e.to);
          inOpen.add(e.to);
        }
      }
    }
  }
  return reconstruct(came, bestNode);
}
