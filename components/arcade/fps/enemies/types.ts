/**
 * Enemy class taxonomy for the doctrine overhaul. The 10 classes + a mapping from
 * the current AI roles (Phase 2 renders distinct models per existing role; Phase 3
 * spawns directly by class via doctrine squads).
 */
export type EnemyClass =
  | 'rifleman'
  | 'scout'
  | 'breacher'
  | 'marksman'
  | 'suppressor'
  | 'engineer'
  | 'tank'
  | 'elite'
  | 'commander'
  | 'berserker';

/** Current AI roles → a class model. */
export const ROLE_TO_CLASS: Record<string, EnemyClass> = {
  assault: 'rifleman',
  rifleman: 'rifleman',
  sniper: 'marksman',
  flanker: 'scout',
  suppressor: 'suppressor',
  tank: 'tank',
  skirmisher: 'elite',
};
