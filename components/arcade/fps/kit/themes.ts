/**
 * Map THEMES — pure look, zero geometry impact. A theme swaps the sky gradient,
 * fog colour, the 3 wall/panel palettes (texture indices 0/1/2), and the ground
 * palette. The `tex` index a box carries is unchanged; only what that index
 * RENDERS as changes, so a theme never regresses collision/nav and an undefined
 * theme falls back to the original seeded look (see scene.ts / textures.ts).
 *
 * Imported ONLY by the /arcade chunk.
 */
export type ThemeId = 'wartorn' | 'frozen' | 'desert' | 'industrial' | 'neon' | 'jungle' | 'volcanic' | 'moon';

export interface PanelPalette {
  base: string;
  seam: string;
  rivet: string;
}
export interface Theme {
  id: ThemeId;
  name: string;
  sky: [string, string, string]; // [zenith, mid, horizon] → skyTexture gradient
  fog: string;
  panels: [PanelPalette, PanelPalette, PanelPalette]; // texture indices 0, 1, 2
  ground: { base: string; seam: string };
}

export const THEMES: Record<ThemeId, Theme> = {
  // The original STARSHELL look — the default when no theme is set.
  wartorn: {
    id: 'wartorn',
    name: 'WAR-TORN CITY',
    sky: ['#0a1330', '#243a72', '#5b7fc4'],
    fog: '#0e1426',
    panels: [
      { base: '#1c2233', seam: '#3a6ea5', rivet: '#5a7fb5' },
      { base: '#241c2e', seam: '#7a4bb0', rivet: '#a06fd0' },
      { base: '#22201a', seam: '#b06a2a', rivet: '#d08a4a' },
    ],
    ground: { base: '#0e1018', seam: '#243047' },
  },
  frozen: {
    id: 'frozen',
    name: 'FROZEN WASTE',
    sky: ['#0b1a2e', '#2a4a6e', '#9cc4e4'],
    fog: '#1a2836',
    panels: [
      { base: '#1e2a38', seam: '#5a9ad0', rivet: '#a0d0f0' },
      { base: '#243040', seam: '#7ab0e0', rivet: '#c0e0ff' },
      { base: '#2a3644', seam: '#8ac0e8', rivet: '#d0eaff' },
    ],
    ground: { base: '#1a2430', seam: '#3a5a7a' },
  },
  desert: {
    id: 'desert',
    name: 'DUST BASIN',
    sky: ['#3a2a1a', '#8a6a3a', '#e0c080'],
    fog: '#4a3a26',
    panels: [
      { base: '#3a2e1e', seam: '#c09040', rivet: '#e0b060' },
      { base: '#33281a', seam: '#b0803a', rivet: '#d0a050' },
      { base: '#2e2416', seam: '#a07030', rivet: '#c89840' },
    ],
    ground: { base: '#2e2418', seam: '#5a4428' },
  },
  industrial: {
    id: 'industrial',
    name: 'STEEL YARDS',
    sky: ['#1a1c20', '#3a3e44', '#6a7078'],
    fog: '#26282c',
    panels: [
      { base: '#26282e', seam: '#e0a040', rivet: '#8a9098' },
      { base: '#2a2c32', seam: '#c88830', rivet: '#98a0a8' },
      { base: '#202226', seam: '#a07028', rivet: '#788088' },
    ],
    ground: { base: '#1c1e22', seam: '#3a3e44' },
  },
  neon: {
    id: 'neon',
    name: 'NEON SPRAWL',
    sky: ['#08060e', '#1a0e26', '#2a1840'],
    fog: '#0a0812',
    panels: [
      { base: '#100a1a', seam: '#ff3ac0', rivet: '#ff8ae0' },
      { base: '#0a1018', seam: '#3affd0', rivet: '#8affe8' },
      { base: '#140a1e', seam: '#a040ff', rivet: '#c88aff' },
    ],
    ground: { base: '#0a0812', seam: '#3a1a5a' },
  },
  jungle: {
    id: 'jungle',
    name: 'OVERGROWTH',
    sky: ['#0a1a14', '#1e4a38', '#5aa080'],
    fog: '#14261e',
    panels: [
      { base: '#1a2a20', seam: '#4aa060', rivet: '#7ad090' },
      { base: '#16241c', seam: '#3a9070', rivet: '#6ac0a0' },
      { base: '#1e2e22', seam: '#5aa050', rivet: '#8ad080' },
    ],
    ground: { base: '#14201a', seam: '#2a4a38' },
  },
  volcanic: {
    id: 'volcanic',
    name: 'ASH & EMBER',
    sky: ['#1a0a0a', '#4a1a12', '#a04030'],
    fog: '#1c0e0a',
    panels: [
      { base: '#1a1216', seam: '#ff5a2a', rivet: '#ffa060' },
      { base: '#160e12', seam: '#e04020', rivet: '#ff8040' },
      { base: '#20140e', seam: '#ff7030', rivet: '#ffb070' },
    ],
    ground: { base: '#160e0e', seam: '#4a2018' },
  },
  moon: {
    id: 'moon',
    name: 'DEAD MOON',
    sky: ['#02030a', '#0a0e18', '#2a3040'],
    fog: '#04050a',
    panels: [
      { base: '#2a2c30', seam: '#6a7078', rivet: '#a0a8b0' },
      { base: '#26282c', seam: '#5a6068', rivet: '#909aa0' },
      { base: '#303238', seam: '#7a8088', rivet: '#b0b8c0' },
    ],
    ground: { base: '#24262a', seam: '#44484e' },
  },
};

export const THEME_LIST: Theme[] = Object.values(THEMES);

/** Resolve a theme id → Theme, or undefined for the original seeded look. */
export function themeById(id?: string): Theme | undefined {
  return id && id in THEMES ? THEMES[id as ThemeId] : undefined;
}
