/**
 * Uniform spatial grid over a level's boxes (Phase 2 — pure performance).
 *
 * Collision + line-of-sight previously looped over EVERY box in the level, per
 * entity, per axis, per frame. On big maps (200+ boxes) that's the dominant
 * cost. This grid buckets boxes by their XZ footprint into fixed cells, so each
 * query narrows to a small set of LOCAL candidate boxes.
 *
 * Correctness contract (this must not change behavior):
 *  - A box is bucketed into EVERY cell its XZ AABB overlaps, so a query touching
 *    any of those cells returns it.
 *  - Every query returns a SUPERSET of the boxes the full loop would have tested.
 *    The callers run the exact same hit math on the candidates, so results are
 *    byte-for-byte identical — just fewer boxes tested.
 *
 * Hot-path discipline: results are returned in a REUSED scratch array, and dedup
 * uses a frame-stamp Int32Array (bump a counter each query, mark visited boxes
 * with it) instead of a per-call Set — zero allocation on the query path.
 *
 * IMPORTANT: because queries reuse a single scratch array, a caller must finish
 * consuming the result before issuing the next query on the same grid. All
 * current callers iterate the result immediately, which is fine.
 */
import type { Box } from '../level3d';

/** Default cell size in world units. Starting point; tune for the map scale. */
export const GRID_CELL = 6;

export class SpatialGrid {
  private readonly cell: number;
  private readonly inv: number;
  private readonly boxes: Box[];
  /** cellKey → list of box indices whose XZ AABB overlaps that cell. */
  private readonly cells: Map<number, number[]>;
  /** Visited-stamp per box (frame-stamp dedup), sized to box count. */
  private readonly stamp: Int32Array;
  private mark = 0;
  /** Reused output buffer (box references). */
  private out: Box[] = [];

  private constructor(boxes: Box[], cell: number) {
    this.boxes = boxes;
    this.cell = cell;
    this.inv = 1 / cell;
    this.cells = new Map();
    this.stamp = new Int32Array(boxes.length);

    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      const minCX = Math.floor((b.x - b.sx / 2) * this.inv);
      const maxCX = Math.floor((b.x + b.sx / 2) * this.inv);
      const minCZ = Math.floor((b.z - b.sz / 2) * this.inv);
      const maxCZ = Math.floor((b.z + b.sz / 2) * this.inv);
      for (let cx = minCX; cx <= maxCX; cx++) {
        for (let cz = minCZ; cz <= maxCZ; cz++) {
          const key = SpatialGrid.key(cx, cz);
          let arr = this.cells.get(key);
          if (!arr) {
            arr = [];
            this.cells.set(key, arr);
          }
          arr.push(i);
        }
      }
    }
  }

  static build(boxes: Box[], cell: number = GRID_CELL): SpatialGrid {
    return new SpatialGrid(boxes, cell);
  }

  /** Pack two (possibly negative) integer cell coords into one number key. */
  private static key(cx: number, cz: number): number {
    // Offset keeps coords non-negative for a stable, collision-free packing
    // across the arena range (|coord| well under 32k cells).
    return (cx + 32768) * 65536 + (cz + 32768);
  }

  /** Begin a fresh dedup pass and clear the scratch output. */
  private begin(): void {
    this.mark++;
    this.out.length = 0;
  }

  /** Add a cell's boxes to the output, skipping already-stamped ones. */
  private collectCell(cx: number, cz: number): void {
    const arr = this.cells.get(SpatialGrid.key(cx, cz));
    if (!arr) return;
    for (let k = 0; k < arr.length; k++) {
      const idx = arr[k];
      if (this.stamp[idx] === this.mark) continue;
      this.stamp[idx] = this.mark;
      this.out.push(this.boxes[idx]);
    }
  }

  /**
   * Candidate boxes whose cells overlap the XZ rectangle [minX,minZ]→[maxX,maxZ].
   * Returns a SUPERSET of boxes overlapping that range (cell-granular).
   */
  queryAABB(minX: number, minZ: number, maxX: number, maxZ: number): Box[] {
    this.begin();
    const minCX = Math.floor(minX * this.inv);
    const maxCX = Math.floor(maxX * this.inv);
    const minCZ = Math.floor(minZ * this.inv);
    const maxCZ = Math.floor(maxZ * this.inv);
    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cz = minCZ; cz <= maxCZ; cz++) {
        this.collectCell(cx, cz);
      }
    }
    return this.out;
  }

  /**
   * Candidate boxes along a ray (origin ox,oz; direction dx,dz; up to maxDist),
   * walking every grid cell the ray crosses via 2D-DDA on x/z. The Y component
   * is irrelevant here — callers keep their own full 3D hit math; this only
   * narrows which boxes to test. Returns a SUPERSET of the boxes the ray could
   * possibly hit within maxDist.
   */
  queryRay(ox: number, oz: number, dx: number, dz: number, maxDist: number): Box[] {
    this.begin();
    return this.walk(ox, oz, dx, dz, maxDist);
  }

  /** Candidate boxes along the segment a→b (2D-DDA on x/z). */
  querySeg(ax: number, az: number, bx: number, bz: number): Box[] {
    this.begin();
    const dx = bx - ax;
    const dz = bz - az;
    const len = Math.hypot(dx, dz);
    if (len < 1e-9) {
      // Degenerate: just the single cell at the point.
      this.collectCell(Math.floor(ax * this.inv), Math.floor(az * this.inv));
      return this.out;
    }
    return this.walk(ax, az, dx / len, dz / len, len);
  }

  /**
   * Shared 2D-DDA cell traversal from (ox,oz) along unit dir (dx,dz) for
   * maxDist world units, collecting every visited cell's boxes. Visits the
   * 3×3 neighborhood of each stepped cell so boxes bucketed into an adjacent
   * cell (a box's footprint can straddle a cell the ray only grazes) are never
   * missed — keeping the result a strict superset.
   */
  private walk(ox: number, oz: number, dx: number, dz: number, maxDist: number): Box[] {
    const cell = this.cell;
    let cx = Math.floor(ox * this.inv);
    let cz = Math.floor(oz * this.inv);

    // Always collect the starting neighborhood.
    this.collectNeighborhood(cx, cz);

    const stepX = dx > 0 ? 1 : dx < 0 ? -1 : 0;
    const stepZ = dz > 0 ? 1 : dz < 0 ? -1 : 0;

    // Distance (along the ray) to the next x / z cell boundary.
    const tDeltaX = dx !== 0 ? Math.abs(cell / dx) : Infinity;
    const tDeltaZ = dz !== 0 ? Math.abs(cell / dz) : Infinity;

    let tMaxX: number;
    if (stepX > 0) tMaxX = ((cx + 1) * cell - ox) / dx;
    else if (stepX < 0) tMaxX = (cx * cell - ox) / dx;
    else tMaxX = Infinity;

    let tMaxZ: number;
    if (stepZ > 0) tMaxZ = ((cz + 1) * cell - oz) / dz;
    else if (stepZ < 0) tMaxZ = (cz * cell - oz) / dz;
    else tMaxZ = Infinity;

    let guard = 0;
    const guardMax = 4096; // safety bound; far beyond any real arena traversal
    while (guard++ < guardMax) {
      if (tMaxX < tMaxZ) {
        if (tMaxX > maxDist) break;
        cx += stepX;
        tMaxX += tDeltaX;
      } else {
        if (tMaxZ > maxDist) break;
        cz += stepZ;
        tMaxZ += tDeltaZ;
      }
      this.collectNeighborhood(cx, cz);
      if (stepX === 0 && stepZ === 0) break;
    }
    return this.out;
  }

  /** Collect a cell and its 8 neighbors (superset safety for straddling boxes). */
  private collectNeighborhood(cx: number, cz: number): void {
    for (let ix = cx - 1; ix <= cx + 1; ix++) {
      for (let iz = cz - 1; iz <= cz + 1; iz++) {
        this.collectCell(ix, iz);
      }
    }
  }
}
