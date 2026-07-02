/**
 * A tiny, dependency-free "progress changed" signal the game fires at its save
 * seams. The SITE listens for it (ArcadeGate → progressSync) to push progress to
 * the player's account. Keeping this a plain DOM event means the game stays
 * decoupled from accounts — the standalone Starshell repo simply has no listener.
 */
export const PROGRESS_EVENT = 'starshell:progress';

export function emitProgressChanged(immediate = false): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(PROGRESS_EVENT, { detail: { immediate } }));
}
