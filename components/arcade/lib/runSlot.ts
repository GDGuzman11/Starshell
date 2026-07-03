/**
 * A resumable campaign run slot — the persistable snapshot of an in-progress run.
 * Type-only + dependency-free so the game and the site (progress actions) share it
 * without coupling the game to accounts. `upgrades` is opaque here (the game casts
 * it back to its Upg map on resume).
 */
export interface RunSlotLoadout {
  p1: string;
  p2: string;
  sa: string;
  th: string;
}

export interface RunSlot {
  id: string;
  level: number;
  gold: number;
  maxHp: number;
  upgrades: Record<string, unknown>;
  difficulty: string;
  squads: number;
  loadout: RunSlotLoadout;
  startedAt: number;
  updatedAt: number;
}
