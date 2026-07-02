/**
 * Weapon MANUFACTURERS — the eight arms houses of the Arsenal Engineering System.
 * Every engineering part belongs to a manufacturer, and a manufacturer stamps its
 * own visual language on the part: an accent (emissive) colour, a body metal, and a
 * design bias that nudges the part's stat roll + geometry. Full-set synergies reward
 * committing to one house (see parts.ts / economy.ts).
 *
 * Imported ONLY by the /arcade chunk.
 */
export type ManufacturerId = 'orion' | 'titan' | 'nova' | 'helios' | 'aegis' | 'atlas' | 'blackstar' | 'vulcan';

export interface Manufacturer {
  id: ManufacturerId;
  name: string;
  accent: number; // emissive signature colour (Bloom catches it)
  body: number; // body metal tint
  philosophy: string; // one-line design language
  /** Stat bias applied to a part's roll (multiplicative nudges; kept small). */
  bias: { dmg: number; rate: number; mag: number; reload: number; handling: number };
}

export const MANUFACTURERS: Record<ManufacturerId, Manufacturer> = {
  orion: { id: 'orion', name: 'Orion Defense', accent: 0x49a6ff, body: 0x3a4250, philosophy: 'Balanced precision engineering.', bias: { dmg: 0.02, rate: 0, mag: 0, reload: 0.03, handling: 0.04 } },
  titan: { id: 'titan', name: 'Titan Industries', accent: 0xff8a3a, body: 0x5a5a64, philosophy: 'Heavy, durable, unstoppable.', bias: { dmg: 0.06, rate: -0.03, mag: 0.05, reload: -0.02, handling: -0.04 } },
  nova: { id: 'nova', name: 'Nova Systems', accent: 0xff5d6e, body: 0x4a3a44, philosophy: 'Rapid, aggressive, relentless.', bias: { dmg: -0.02, rate: 0.07, mag: 0.02, reload: 0.03, handling: 0.03 } },
  helios: { id: 'helios', name: 'Helios Labs', accent: 0x7fdfff, body: 0x2a4a5a, philosophy: 'Experimental energy systems.', bias: { dmg: 0.04, rate: 0.03, mag: -0.03, reload: 0, handling: 0.02 } },
  aegis: { id: 'aegis', name: 'Aegis Dynamics', accent: 0xaef5c8, body: 0x3a4a3e, philosophy: 'Stability and control above all.', bias: { dmg: 0, rate: 0.02, mag: 0.03, reload: 0.05, handling: 0.06 } },
  atlas: { id: 'atlas', name: 'Atlas Weapon Systems', accent: 0xffd27a, body: 0x50463a, philosophy: 'Reliable, standard-issue service.', bias: { dmg: 0.03, rate: 0.02, mag: 0.03, reload: 0.03, handling: 0.03 } },
  blackstar: { id: 'blackstar', name: 'Blackstar Engineering', accent: 0xc08bff, body: 0x241a30, philosophy: 'Covert, exotic, deniable.', bias: { dmg: 0.05, rate: 0.04, mag: -0.02, reload: 0.02, handling: 0.05 } },
  vulcan: { id: 'vulcan', name: 'Vulcan Armory', accent: 0xff6f4a, body: 0x4a2e28, philosophy: 'Brutal, overwhelming firepower.', bias: { dmg: 0.08, rate: -0.02, mag: 0.04, reload: -0.03, handling: -0.05 } },
};

export const MANUFACTURER_IDS = Object.keys(MANUFACTURERS) as ManufacturerId[];
