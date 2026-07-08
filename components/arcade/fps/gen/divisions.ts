/**
 * Division descriptors for the weapon generator — a client-safe, dependency-light
 * mirror of the Combat Divisions (see `marine/divisions.ts`) so the generator can
 * (a) TAG a weapon with the division it's built for and (b) flavour it toward that
 * division's identity (accent, naming vocabulary, favoured weapon types) without the
 * generator core importing the heavy marine rendering module. Ids match the real
 * `DivisionId`s so the tag integrates with the rest of the game.
 */
import type { Family } from '../weapons';

export const DIVISION_IDS = ['outrider', 'vanguard', 'ghost', 'warden', 'phantom', 'lifeline'] as const;
export type GenDivisionId = (typeof DIVISION_IDS)[number];

export interface GenDivision {
  id: GenDivisionId;
  name: string;
  accent: number;
  philosophy: string;
  words: string[]; // naming/lore vocabulary in the division's voice
  families: Family[]; // weapon types this division favours (for AUTO type selection)
}

export const GEN_DIVISIONS: Record<GenDivisionId, GenDivision> = {
  outrider: {
    id: 'outrider', name: 'OUTRIDER', accent: 0x9fe8ff,
    philosophy: 'The standard frame — no weakness, no specialty. Ready for anything.',
    words: ['Standard', 'Outrider', 'Ranger', 'Vanguard', 'Field', 'Trailblazer'],
    families: ['rifle', 'mg', 'laser', 'sniper', 'pistol', 'launcher'],
  },
  vanguard: {
    id: 'vanguard', name: 'VANGUARD', accent: 0xff8a3a,
    philosophy: 'Aggressive, broad, forward-leaning — a breaching juggernaut.',
    words: ['Assault', 'Breacher', 'Storm', 'Siege', 'Juggernaut', 'Warhound', 'Onslaught', 'Crusher'],
    families: ['mg', 'launcher', 'rifle'],
  },
  ghost: {
    id: 'ghost', name: 'GHOST', accent: 0x7fdfff,
    philosophy: 'Slim, angular, tall sensor arrays — mobility over mass.',
    words: ['Recon', 'Phantom', 'Shadow', 'Stalker', 'Spectre', 'Cipher', 'Wraith', 'Whisper'],
    families: ['rifle', 'pistol', 'laser'],
  },
  warden: {
    id: 'warden', name: 'WARDEN', accent: 0xaef5c8,
    philosophy: 'Extremely broad, massive shoulders — a walking bunker.',
    words: ['Fortress', 'Bulwark', 'Aegis', 'Bastion', 'Rampart', 'Titan', 'Colossus', 'Anvil'],
    families: ['launcher', 'mg', 'laser'],
  },
  phantom: {
    id: 'phantom', name: 'PHANTOM', accent: 0xc08bff,
    philosophy: 'Long proportions, slim shoulders — precision incarnate.',
    words: ['Precision', 'Marksman', 'Hawk', 'Falcon', 'Longshot', 'Deadeye', 'Vantage', 'Talon'],
    families: ['sniper', 'rifle', 'laser'],
  },
  lifeline: {
    id: 'lifeline', name: 'LIFELINE', accent: 0xff5d6e,
    philosophy: 'Compact support frame — drones, injectors, rescue gear.',
    words: ['Medic', 'Nano', 'Rescue', 'Mercy', 'Vital', 'Seraph', 'Lifeline', 'Grace'],
    families: ['pistol', 'laser', 'rifle'],
  },
};

export function isGenDivision(v: string): v is GenDivisionId {
  return (DIVISION_IDS as readonly string[]).includes(v);
}
