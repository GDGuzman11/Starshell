/**
 * Starshell run scoring — the single source of truth for the leaderboard score.
 * Type-only + dependency-free so both the game (match-end card) and the site
 * (server action, which RE-computes authoritatively) share one formula.
 *
 * Balanced model: depth of run is the backbone, kills add volume, headshots
 * reward precision, accuracy discourages spraying, and difficulty scales it all.
 * Gold is deliberately excluded. Raw stats are persisted alongside the result so
 * the weights below can be re-tuned later without a database migration.
 */
export interface ScorePayload {
  level: number; // deepest level reached this run
  kills: number;
  headshots: number;
  shots: number;
  hits: number;
  difficulty: string; // 'normal' | 'hard' | 'nightmare'
  won: boolean;
}

/** Difficulty multiplier — harder runs are worth more. */
export function difficultyMult(difficulty: string): number {
  return difficulty === 'nightmare' ? 1.8 : difficulty === 'hard' ? 1.4 : 1.0;
}

/** Accuracy as an integer percentage 0..100. */
export function accuracyPct(shots: number, hits: number): number {
  return shots > 0 ? Math.round((Math.min(hits, shots) / shots) * 100) : 0;
}

/** The balanced leaderboard score for a finished run. */
export function computeScore(s: ScorePayload): number {
  const acc = accuracyPct(s.shots, s.hits);
  const base = s.level * 100 + s.kills * 10 + s.headshots * 25 + acc * 3;
  return Math.max(0, Math.round(base * difficultyMult(s.difficulty)));
}
