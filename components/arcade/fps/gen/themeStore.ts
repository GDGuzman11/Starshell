/**
 * Tiny leaf store mapping a generated weapon id → its DNA `componentTheme`. The
 * registry writes here on registration; the parts generator reads here so a generated
 * weapon's whole 300-part upgrade tree inherits its DNA (palette, naming, geometry,
 * stat lean) — WITHOUT threading the theme through every parts caller and WITHOUT an
 * import cycle (this module imports nothing but a type).
 */
import type { ComponentTheme } from './blueprint';

const THEMES = new Map<string, ComponentTheme>();

export function setComponentTheme(weaponId: string, theme: ComponentTheme): void {
  THEMES.set(weaponId, theme);
}

export function getComponentTheme(weaponId: string): ComponentTheme | undefined {
  return THEMES.get(weaponId);
}
