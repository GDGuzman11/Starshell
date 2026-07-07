/**
 * Mobile touch-control LAYOUT model. Each action button carries its own shape,
 * tier, icon, colour and position (as a % of the screen from the aim-side bottom
 * corner, so it scales across phones/tablets). Layouts are persisted to
 * localStorage and can be mirrored for left-handed play. The renderer
 * (ShapeButton / TouchControls) and the editor (LayoutEditor) both read this.
 *
 * Positions: `x` = % from the AIM-side edge (right by default, left when
 * left-handed via `mirror`), `y` = % from the BOTTOM edge. `size` = base px
 * (scaled by the user's button-size setting). Fire is special-cased by the layer
 * (it also feeds look), but still lives here for placement + sizing.
 */

export type ButtonShape = 'firepad' | 'roundsquare' | 'rectangle' | 'capsule' | 'hexagon' | 'angular' | 'minicircle';
export type ButtonAction = 'fire' | 'jump' | 'reload' | 'swap' | 'throw' | 'grapple' | 'zoom' | 'crouch';

export interface ControlButton {
  id: ButtonAction;
  tier: 1 | 2 | 3;
  shape: ButtonShape;
  icon: string;
  label: string;
  color: string;
  x: number; // % from the aim-side edge (0..100)
  y: number; // % from the bottom edge (0..100)
  size: number; // base px (× user scale)
  opacity?: number; // optional per-button opacity override (0..1)
}

export interface ControlLayout {
  v: number;
  name: string;
  buttons: ControlButton[];
}

const LAYOUT_V = 1;
const STORAGE_KEY = 'starshell.controls.layout';

/** DEFAULT — an ergonomic thumb cluster: the Fire pad sits at the aim-thumb rest
 *  (bottom, aim side); Jump is chained just above it; the Tier-2 actions fan up
 *  and inward along the thumb arc; Zoom/Crouch are small and close. */
export const DEFAULT_LAYOUT: ControlLayout = {
  v: LAYOUT_V,
  name: 'Default',
  buttons: [
    { id: 'fire', tier: 1, shape: 'firepad', icon: '◎', label: 'FIRE', color: '#ff5d6e', x: 11, y: 15, size: 96 },
    { id: 'jump', tier: 1, shape: 'roundsquare', icon: '⤒', label: 'JUMP', color: '#aef5c8', x: 9, y: 37, size: 74 },
    { id: 'reload', tier: 2, shape: 'rectangle', icon: '⟳', label: 'RELOAD', color: '#7fdfff', x: 27, y: 33, size: 58 },
    { id: 'swap', tier: 2, shape: 'capsule', icon: '⇄', label: 'SWAP', color: '#ffffff', x: 29, y: 16, size: 54 },
    { id: 'throw', tier: 2, shape: 'hexagon', icon: '✷', label: 'NADE', color: '#ffae3a', x: 22, y: 50, size: 58 },
    { id: 'grapple', tier: 2, shape: 'angular', icon: '⟰', label: 'GRAPPLE', color: '#ffd27a', x: 41, y: 44, size: 56 },
    { id: 'zoom', tier: 3, shape: 'minicircle', icon: '⊙', label: 'ADS', color: '#7fdfff', x: 44, y: 26, size: 48 },
    { id: 'crouch', tier: 3, shape: 'minicircle', icon: '▼', label: 'CROUCH', color: '#aef5c8', x: 10, y: 56, size: 48 },
  ],
};

/** Built-in presets (deltas over the default). Tablet spreads wider + bigger;
 *  competitive tightens the arc; casual is larger + lower; lefty is a mirror. */
export const PRESETS: Record<string, ControlLayout> = {
  default: DEFAULT_LAYOUT,
  competitive: {
    v: LAYOUT_V,
    name: 'Competitive',
    buttons: DEFAULT_LAYOUT.buttons.map((b) => ({ ...b, size: Math.round(b.size * 0.9), y: Math.max(10, b.y - 2) })),
  },
  tablet: {
    v: LAYOUT_V,
    name: 'Tablet',
    buttons: DEFAULT_LAYOUT.buttons.map((b) => ({ ...b, size: Math.round(b.size * 1.15), x: b.x + 3 })),
  },
  casual: {
    v: LAYOUT_V,
    name: 'Casual',
    buttons: DEFAULT_LAYOUT.buttons.map((b) => ({ ...b, size: Math.round(b.size * 1.12), y: Math.max(8, b.y - 3) })),
  },
  largetouch: {
    v: LAYOUT_V,
    name: 'Large Touch',
    buttons: DEFAULT_LAYOUT.buttons.map((b) => ({ ...b, size: Math.round(b.size * 1.28) })),
  },
};

/** Clamp a layout so a button can never leave the reachable safe area. */
export function clampButton(b: ControlButton): ControlButton {
  return { ...b, x: Math.max(2, Math.min(70, b.x)), y: Math.max(6, Math.min(78, b.y)) };
}

export function loadLayout(): ControlLayout {
  if (typeof window === 'undefined') return DEFAULT_LAYOUT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ControlLayout;
      if (parsed?.v === LAYOUT_V && Array.isArray(parsed.buttons) && parsed.buttons.length) {
        // Merge over the default so a new button id added later still appears.
        const byId = new Map(parsed.buttons.map((b) => [b.id, b]));
        return { ...parsed, buttons: DEFAULT_LAYOUT.buttons.map((d) => ({ ...d, ...(byId.get(d.id) ?? {}) })) };
      }
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_LAYOUT;
}

export function saveLayout(layout: ControlLayout): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    /* ignore */
  }
}
