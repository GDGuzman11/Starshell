/**
 * localStorage persistence for hand-authored level layouts (dev editor). Every
 * load is validated + migrated so corrupt / stale data can never crash the game;
 * on any failure it degrades to empty. Keys are namespaced under `starshell.`.
 *
 * Imported ONLY by the /arcade chunk.
 */
import { LAYOUT_VERSION, MODULE_KINDS, ROTATIONS, type BridgeSpan, type CampaignSlot, type LevelLayout, type ModuleKind, type Placement, type Rot } from './layout';
import { THEMES } from './themes';

const INDEX_KEY = 'starshell.layouts'; // JSON array of SavedMeta
const layoutKey = (id: string) => `starshell.layout.${id}`;
const CAMPAIGN_KEY = 'starshell.campaign'; // the editor's ordered level timeline

export interface SavedMeta {
  id: string;
  name: string;
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Coerce arbitrary data into a safe LevelLayout, or null if unusable. */
export function validateLayout(raw: unknown): LevelLayout | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const theme = typeof o.theme === 'string' && o.theme in THEMES ? o.theme : 'wartorn';
  const size = isNum(o.size) ? Math.max(120, Math.min(320, Math.round(o.size))) : 200;
  const seed = isNum(o.seed) ? Math.floor(o.seed) : 12345;
  const cellMax = Math.ceil(size / 16) + 1;
  const inCell = (g: unknown): g is number => isNum(g) && Math.abs(g) <= cellMax;
  const placements: Placement[] = Array.isArray(o.placements)
    ? (o.placements as unknown[])
        .map((p): Placement | null => {
          if (!p || typeof p !== 'object') return null;
          const q = p as Record<string, unknown>;
          if (typeof q.module !== 'string' || !MODULE_KINDS.includes(q.module as ModuleKind)) return null;
          if (!inCell(q.gx) || !inCell(q.gz)) return null;
          const rot = (ROTATIONS.includes(q.rot as Rot) ? q.rot : 0) as Rot;
          const levels = q.params && typeof q.params === 'object' && isNum((q.params as Record<string, unknown>).levels) ? Math.max(2, Math.min(4, Math.round((q.params as Record<string, number>).levels))) : undefined;
          return { module: q.module as ModuleKind, gx: Math.round(q.gx), gz: Math.round(q.gz), rot, params: levels ? { levels } : undefined };
        })
        .filter((p): p is Placement => p !== null)
    : [];
  const bridges: BridgeSpan[] = Array.isArray(o.bridges)
    ? (o.bridges as unknown[])
        .map((b): BridgeSpan | null => {
          if (!b || typeof b !== 'object') return null;
          const q = b as Record<string, unknown>;
          if (!isNum(q.x0) || !isNum(q.z0) || !isNum(q.x1) || !isNum(q.z1) || !isNum(q.y)) return null;
          return { x0: q.x0, z0: q.z0, x1: q.x1, z1: q.z1, y: q.y };
        })
        .filter((b): b is BridgeSpan => b !== null)
    : [];
  const cell = (v: unknown) => (v && typeof v === 'object' && isNum((v as Record<string, unknown>).gx) && isNum((v as Record<string, unknown>).gz) ? { gx: Math.round((v as Record<string, number>).gx), gz: Math.round((v as Record<string, number>).gz) } : undefined);
  return { v: LAYOUT_VERSION, theme, size, seed, placements, bridges, spawn: cell(o.spawn), enemySpawn: cell(o.enemySpawn), name: typeof o.name === 'string' ? o.name.slice(0, 40) : undefined };
}

export function listLayouts(): SavedMeta[] {
  try {
    const raw = JSON.parse(localStorage.getItem(INDEX_KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw.filter((m): m is SavedMeta => m && typeof m.id === 'string' && typeof m.name === 'string');
  } catch {
    return [];
  }
}

export function loadLayout(id: string): LevelLayout | null {
  try {
    return validateLayout(JSON.parse(localStorage.getItem(layoutKey(id)) || 'null'));
  } catch {
    return null;
  }
}

/** Save (or overwrite by name) a layout; returns its id. */
export function saveLayout(name: string, layout: LevelLayout): string {
  const clean = validateLayout({ ...layout, name });
  if (!clean) return '';
  try {
    const index = listLayouts();
    const existing = index.find((m) => m.name === name);
    const id = existing ? existing.id : `L${Date.now().toString(36)}`;
    localStorage.setItem(layoutKey(id), JSON.stringify(clean));
    if (!existing) index.push({ id, name });
    localStorage.setItem(INDEX_KEY, JSON.stringify(index));
    return id;
  } catch {
    return '';
  }
}

// ── Campaign timeline (the ordered list of authored levels) ──────────────────

/** Load the editor's campaign timeline (validated). Empty if none / unusable. */
export function loadCampaign(): CampaignSlot[] {
  try {
    const raw = JSON.parse(localStorage.getItem(CAMPAIGN_KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw
      .map((s): CampaignSlot | null => {
        if (!s || typeof s !== 'object') return null;
        const layout = validateLayout((s as Record<string, unknown>).layout);
        if (!layout) return null;
        return { authored: !!(s as Record<string, unknown>).authored, layout };
      })
      .filter((s): s is CampaignSlot => s !== null);
  } catch {
    return [];
  }
}

export function saveCampaign(slots: CampaignSlot[]): void {
  try {
    localStorage.setItem(CAMPAIGN_KEY, JSON.stringify(slots));
  } catch {
    /* ignore (quota / private mode) */
  }
}
