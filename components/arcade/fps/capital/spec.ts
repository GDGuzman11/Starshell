/**
 * CAPITAL SPEC — a full "Star Destroyer" design: the model-driving DNA fields (a CapitalSpec
 * IS-A CapitalDNA, so `buildCapital` takes it directly) PLUS optional cinematic text blocks
 * (lore, engineering, arrival, weapons, audio, deployment…). The 100-ship `catalog.ts`
 * produces these; the AI author/parse path was removed.
 */
import type { CapitalDNA } from './dna';

export interface CapitalSpec extends CapitalDNA {
  lore?: string;
  silhouette?: string;
  engineering?: string;
  arrival?: string;
  weapons?: string;
  audio?: string;
  deployment?: string;
  departure?: string;
  whyUnique?: string;
}
