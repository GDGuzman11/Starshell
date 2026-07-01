'use client';

/**
 * DEV-ONLY visual level editor (local dev builds only). Authors the campaign as a
 * TIMELINE of levels: a row of numbered squares (insert / renumber / delete), each
 * holding one layout. Click a square to load + edit it on the 2D grid; SAVE writes
 * that level to the local timeline (localStorage) so your own campaign playthrough
 * reflects it immediately. EXPORT CAMPAIGN dumps the authored levels as a code block
 * to bake into levels.ts for real players. Un-saved / un-authored slots fall back to
 * the procedural arena in-game.
 *
 * Rendering is a plain 2D canvas (redraw-on-change). Mouse + touch via pointer events.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BUILDING_KINDS, CELL, LAYOUT_VERSION, PROP_KINDS, ROTATIONS, blankLayout, cellToWorld, footprintOf, roofHeightOf, type BridgeSpan, type CampaignSlot, type LevelLayout, type ModuleKind, type Placement, type Rot } from '../fps/kit/layout';
import { THEME_LIST } from '../fps/kit/themes';
import { makeBattlefieldLayout } from '../fps/kit/generate';
import { loadCampaign, saveCampaign } from '../fps/kit/storage';

const CANVAS = 440;
const RESUPPLY_KINDS: ModuleKind[] = ['station', 'ammocrate', 'shieldcrate'];
// Regular bosses cycle at every 5th campaign level; the campaign ends on a GAUNTLET.
const BOSS_CYCLE = ['XENOMORPH', 'WARLORD', 'KRAKEN'];
const bossNameAt = (level: number) => BOSS_CYCLE[(((Math.floor(level / 5) - 1) % 3) + 3) % 3];

/** The campaign as displayed: authored levels interleaved with the boss slots (a boss
 *  every 5th level) and a final GAUNTLET capstone. Returns items in play order. */
type BeltItem = { type: 'level'; idx: number; level: number } | { type: 'boss'; name: string; level: number };
function buildBelt(count: number): BeltItem[] {
  const belt: BeltItem[] = [];
  let ai = 0;
  let L = 1;
  while (ai < count) {
    if (L % 5 === 0) belt.push({ type: 'boss', name: bossNameAt(L), level: L });
    else belt.push({ type: 'level', idx: ai++, level: L });
    L++;
  }
  if (count > 0) belt.push({ type: 'boss', name: 'GAUNTLET', level: L }); // final capstone
  return belt;
}
const MOD_COLOR: Record<ModuleKind, string> = {
  barracks: '#5aa06a',
  watchtower: '#7a7ad0',
  command: '#c0a050',
  apartment: '#5ab0d0',
  ruin: '#a06a50',
  bunker: '#6a9a7a',
  coverwall: '#8a8a8a',
  sandbags: '#b0a060',
  container: '#c07040',
  barrier: '#9a9aa2',
  dragonteeth: '#808890',
  fueltank: '#c0a040',
  commtower: '#90a0b0',
  guardpost: '#7a8a6a',
  crates: '#b08040',
  rubble: '#8a7a6a',
  wreck: '#70605a',
  station: '#7affa0',
  ammocrate: '#ffcf5a',
  shieldcrate: '#5ad0ff',
};
const MOD_ABBR: Record<ModuleKind, string> = { barracks: 'BRK', watchtower: 'TWR', command: 'CMD', apartment: 'APT', ruin: 'RUIN', bunker: 'BNK', coverwall: 'WALL', sandbags: 'SAND', container: 'CONT', barrier: 'BARR', dragonteeth: 'TEETH', fueltank: 'TANK', commtower: 'ANT', guardpost: 'POST', crates: 'CRAT', rubble: 'RUBL', wreck: 'WRCK', station: 'STN', ammocrate: 'AMMO', shieldcrate: 'SHLD' };

export function LevelEditor({ onPlay, onBack }: { onPlay: (layout: LevelLayout) => void; onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Campaign timeline + which slot is being edited.
  const [campaign, setCampaign] = useState<CampaignSlot[]>([{ authored: false, layout: blankLayout() }]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [dirty, setDirty] = useState(false);
  // Working copy of the active level (edited on the canvas; committed by SAVE).
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [bridges, setBridges] = useState<BridgeSpan[]>([]);
  const [theme, setTheme] = useState('wartorn');
  const [size, setSize] = useState(200);
  const [tool, setTool] = useState<ModuleKind | 'bridge' | null>('command');
  const [rot, setRot] = useState<Rot>(0);
  const [apt, setApt] = useState(3);
  const [selected, setSelected] = useState<number | null>(null);
  const [hover, setHover] = useState<{ gx: number; gz: number } | null>(null);
  const [bridgeFrom, setBridgeFrom] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [showCampaign, setShowCampaign] = useState(false); // the roomy campaign window
  const dragRef = useRef(false);
  const cardDragRef = useRef<number | null>(null); // campaign card being dragged
  const loadingRef = useRef(false); // suppress the dirty flag while loading a slot

  const flash = useCallback((m: string) => {
    setNote(m);
    window.setTimeout(() => setNote(''), 1600);
  }, []);

  const loadInto = useCallback((layout: LevelLayout) => {
    loadingRef.current = true;
    setPlacements(layout.placements);
    setBridges(layout.bridges ?? []);
    setTheme(layout.theme);
    setSize(layout.size);
    setSelected(null);
    setBridgeFrom(null);
  }, []);

  // On mount: restore the saved timeline (or start with one blank level).
  useEffect(() => {
    const c = loadCampaign();
    if (c.length) {
      setCampaign(c);
      loadInto(c[0].layout);
    } else {
      loadInto(blankLayout());
    }
    setActiveIdx(0);
    setDirty(false);
  }, [loadInto]);

  // Any edit to the working copy marks the active slot dirty (unless we just loaded).
  useEffect(() => {
    if (loadingRef.current) {
      loadingRef.current = false;
      return;
    }
    setDirty(true);
  }, [placements, bridges, theme, size]);

  const half = size / 2;
  const scale = CANVAS / size;
  const w2p = useCallback((w: number) => (w + half) * scale, [half, scale]);
  const px2cell = useCallback((px: number) => Math.round((px / scale - half) / CELL), [scale, half]);
  const px2world = useCallback((px: number) => px / scale - half, [scale, half]);

  const currentLayout = useCallback((): LevelLayout => ({ v: LAYOUT_VERSION, theme, size, seed: 12345, placements, bridges }), [theme, size, placements, bridges]);

  // ── Timeline actions ───────────────────────────────────────────────────────
  const commit = useCallback((next: CampaignSlot[]) => {
    setCampaign(next);
    saveCampaign(next);
  }, []);

  const selectSlot = (idx: number) => {
    if (idx === activeIdx) return;
    loadInto(campaign[idx].layout);
    setActiveIdx(idx);
    setDirty(false);
  };
  const saveActive = () => {
    const next = campaign.map((s, i) => (i === activeIdx ? { authored: true, layout: currentLayout() } : s));
    commit(next);
    setDirty(false);
    flash(`LEVEL ${activeIdx + 1} SAVED`);
  };
  const insertAt = (idx: number) => {
    const fresh: CampaignSlot = { authored: false, layout: blankLayout(theme, size) };
    const next = [...campaign.slice(0, idx), fresh, ...campaign.slice(idx)];
    commit(next);
    loadInto(fresh.layout);
    setActiveIdx(idx);
    setDirty(false);
  };
  const deleteSlot = (idx: number) => {
    if (campaign.length <= 1) return;
    const next = campaign.filter((_, i) => i !== idx);
    commit(next);
    const na = Math.max(0, idx > activeIdx ? activeIdx : activeIdx - (idx <= activeIdx ? 1 : 0));
    const clamped = Math.min(na, next.length - 1);
    loadInto(next[clamped].layout);
    setActiveIdx(clamped);
    setDirty(false);
  };
  const duplicateSlot = (idx: number) => {
    const src = campaign[idx];
    const copy: CampaignSlot = { authored: src.authored, layout: JSON.parse(JSON.stringify(src.layout)) as LevelLayout };
    const next = [...campaign.slice(0, idx + 1), copy, ...campaign.slice(idx + 1)];
    commit(next);
    loadInto(copy.layout);
    setActiveIdx(idx + 1);
    setDirty(false);
    flash('DUPLICATED');
  };
  const moveSlot = (from: number, to: number) => {
    if (from === to) return;
    const next = [...campaign];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    commit(next);
    // keep the active level selected after the reorder
    const activeItem = campaign[activeIdx];
    setActiveIdx(next.indexOf(activeItem));
  };
  const editSlot = (idx: number) => {
    if (idx !== activeIdx) selectSlot(idx);
    setShowCampaign(false);
  };

  // Redraw the board.
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const x = cv.getContext('2d');
    if (!x) return;
    x.clearRect(0, 0, CANVAS, CANVAS);
    x.fillStyle = '#0a0d14';
    x.fillRect(0, 0, CANVAS, CANVAS);
    x.strokeStyle = 'rgba(255,255,255,0.06)';
    x.lineWidth = 1;
    for (let g = -Math.ceil(half / CELL); g <= Math.ceil(half / CELL); g++) {
      const p = w2p(cellToWorld(g));
      x.beginPath();
      x.moveTo(p, 0);
      x.lineTo(p, CANVAS);
      x.moveTo(0, p);
      x.lineTo(CANVAS, p);
      x.stroke();
    }
    x.strokeStyle = 'rgba(255,255,255,0.25)';
    x.lineWidth = 2;
    x.strokeRect(w2p(-half), w2p(-half), size * scale, size * scale);
    const mark = (wz: number, col: string, label: string) => {
      x.fillStyle = col;
      x.beginPath();
      x.arc(w2p(0), w2p(wz), 6, 0, Math.PI * 2);
      x.fill();
      x.fillStyle = 'rgba(255,255,255,0.7)';
      x.font = '8px monospace';
      x.fillText(label, w2p(0) + 8, w2p(wz) + 3);
    };
    mark(-half * 0.86, '#5ad06a', 'YOU');
    mark(half * 0.86, '#ff5d6e', 'ENEMY');
    if (tool && tool !== 'bridge' && hover) {
      const fp = footprintOf({ module: tool, gx: hover.gx, gz: hover.gz, rot });
      x.fillStyle = 'rgba(255,255,255,0.12)';
      x.fillRect(w2p(cellToWorld(hover.gx) - fp.w / 2), w2p(cellToWorld(hover.gz) - fp.d / 2), fp.w * scale, fp.d * scale);
    }
    placements.forEach((p, i) => {
      const fp = footprintOf(p);
      const cx = cellToWorld(p.gx);
      const cz = cellToWorld(p.gz);
      const rx = w2p(cx - fp.w / 2);
      const rz = w2p(cz - fp.d / 2);
      x.fillStyle = MOD_COLOR[p.module] + 'cc';
      x.fillRect(rx, rz, fp.w * scale, fp.d * scale);
      x.strokeStyle = i === selected ? '#ffffff' : 'rgba(0,0,0,0.5)';
      x.lineWidth = i === selected ? 2 : 1;
      x.strokeRect(rx, rz, fp.w * scale, fp.d * scale);
      const ang = (p.rot * Math.PI) / 180;
      x.strokeStyle = 'rgba(255,255,255,0.8)';
      x.lineWidth = 1.5;
      x.beginPath();
      x.moveTo(w2p(cx), w2p(cz));
      x.lineTo(w2p(cx + Math.cos(-ang) * fp.w * 0.4), w2p(cz + Math.sin(-ang) * fp.d * 0.4));
      x.stroke();
      x.fillStyle = '#0a0d14';
      x.font = '8px monospace';
      x.fillText(MOD_ABBR[p.module], w2p(cx) - 9, w2p(cz) + 3);
    });
    x.strokeStyle = '#ffd27a';
    x.lineWidth = 4;
    bridges.forEach((b) => {
      x.beginPath();
      x.moveTo(w2p(b.x0), w2p(b.z0));
      x.lineTo(w2p(b.x1), w2p(b.z1));
      x.stroke();
    });
    if (tool === 'bridge' && bridgeFrom != null && placements[bridgeFrom]) {
      const p = placements[bridgeFrom];
      const fp = footprintOf(p);
      x.strokeStyle = '#ffd27a';
      x.lineWidth = 3;
      x.strokeRect(w2p(cellToWorld(p.gx) - fp.w / 2), w2p(cellToWorld(p.gz) - fp.d / 2), fp.w * scale, fp.d * scale);
    }
  }, [placements, bridges, bridgeFrom, size, selected, tool, rot, hover, half, scale, w2p]);

  const eventCell = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * CANVAS;
    const pz = ((e.clientY - r.top) / r.height) * CANVAS;
    return { gx: px2cell(px), gz: px2cell(pz), wx: px2world(px), wz: px2world(pz) };
  };
  const hitTest = (wx: number, wz: number): number => {
    for (let i = placements.length - 1; i >= 0; i--) {
      const p = placements[i];
      const fp = footprintOf(p);
      if (Math.abs(wx - cellToWorld(p.gx)) <= fp.w / 2 && Math.abs(wz - cellToWorld(p.gz)) <= fp.d / 2) return i;
    }
    return -1;
  };
  const bridgeHitTest = (wx: number, wz: number): number => {
    for (let i = bridges.length - 1; i >= 0; i--) {
      const b = bridges[i];
      const dx = b.x1 - b.x0;
      const dz = b.z1 - b.z0;
      const len2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((wx - b.x0) * dx + (wz - b.z0) * dz) / len2));
      if (Math.hypot(wx - (b.x0 + t * dx), wz - (b.z0 + t * dz)) < 3) return i;
    }
    return -1;
  };
  const tryBridge = (aIdx: number, bIdx: number) => {
    const A = placements[aIdx];
    const B = placements[bIdx];
    const rhA = roofHeightOf(A.module, A.params?.levels ?? 3);
    const rhB = roofHeightOf(B.module, B.params?.levels ?? 3);
    if (rhA == null || rhB == null) return flash('bridge needs two roofed buildings');
    if (rhA !== rhB) return flash('roof heights must match');
    const cxA = cellToWorld(A.gx);
    const czA = cellToWorld(A.gz);
    const fpA = footprintOf(A);
    const cxB = cellToWorld(B.gx);
    const czB = cellToWorld(B.gz);
    const fpB = footprintOf(B);
    const dx = cxB - cxA;
    const dz = czB - czA;
    let span: BridgeSpan;
    if (Math.abs(dx) >= Math.abs(dz)) {
      if (Math.abs(dz) > 8) return flash('align the two buildings on a row');
      const z = (czA + czB) / 2;
      span = { x0: cxA + Math.sign(dx) * (fpA.w / 2), z0: z, x1: cxB - Math.sign(dx) * (fpB.w / 2), z1: z, y: rhA };
    } else {
      if (Math.abs(dx) > 8) return flash('align the two buildings on a column');
      const cxm = (cxA + cxB) / 2;
      span = { x0: cxm, z0: czA + Math.sign(dz) * (fpA.d / 2), x1: cxm, z1: czB - Math.sign(dz) * (fpB.d / 2), y: rhA };
    }
    setBridges((bs) => [...bs, span]);
    flash('BRIDGE SNAPPED');
  };

  const onDown = (e: React.PointerEvent) => {
    const { gx, gz, wx, wz } = eventCell(e);
    const hit = hitTest(wx, wz);
    if (tool === 'bridge') {
      if (hit < 0) return setBridgeFrom(null);
      if (bridgeFrom == null) return setBridgeFrom(hit);
      if (hit !== bridgeFrom) tryBridge(bridgeFrom, hit);
      setBridgeFrom(null);
      return;
    }
    if (tool) {
      if (placements.some((p) => p.gx === gx && p.gz === gz)) {
        setSelected(placements.findIndex((p) => p.gx === gx && p.gz === gz));
        return;
      }
      setPlacements((ps) => [...ps, { module: tool, gx, gz, rot, params: tool === 'apartment' ? { levels: apt } : undefined }]);
      setSelected(placements.length);
    } else if (hit >= 0) {
      setSelected(hit);
      dragRef.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } else {
      const bi = bridgeHitTest(wx, wz);
      if (bi >= 0) setBridges((bs) => bs.filter((_, i) => i !== bi));
      else setSelected(null);
    }
  };
  const onMove = (e: React.PointerEvent) => {
    const { gx, gz } = eventCell(e);
    setHover({ gx, gz });
    if (dragRef.current && selected != null) setPlacements((ps) => ps.map((p, i) => (i === selected ? { ...p, gx, gz } : p)));
  };
  const onUp = () => {
    dragRef.current = false;
  };

  const rotateSel = () => {
    if (selected != null) setPlacements((ps) => ps.map((p, i) => (i === selected ? { ...p, rot: ((p.rot + 90) % 360) as Rot } : p)));
    else setRot((r) => ((r + 90) % 360) as Rot);
  };
  const deleteSel = () => {
    if (selected == null) return;
    setPlacements((ps) => ps.filter((_, i) => i !== selected));
    setSelected(null);
  };
  const doRandomize = () => {
    const l = makeBattlefieldLayout(theme, size, (Math.random() * 1e9) | 0);
    loadingRef.current = true;
    setPlacements(l.placements);
    setBridges(l.bridges ?? []);
    setSelected(null);
    setBridgeFrom(null);
    setDirty(true); // a fresh battlefield is a change to be saved
    flash('BATTLEFIELD GENERATED');
  };
  const doExportCampaign = () => {
    const authored = campaign.map((s, i) => ({ slot: s, level: i + 1 })).filter((e) => e.slot.authored);
    // Code block for pasting into levels.ts (clipboard + console).
    const block = `// Paste into CAMPAIGN in components/arcade/fps/kit/levels.ts (keyed by authored level #):\n${authored.map((e) => `  ${e.level}: ${JSON.stringify(e.slot.layout)},`).join('\n')}`;
    try {
      navigator.clipboard?.writeText(block);
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line no-console
    console.log(block);
    // Download a JSON file so it can be dropped into the repo for review/baking.
    try {
      const json = JSON.stringify({ v: LAYOUT_VERSION, levels: authored.map((e) => ({ level: e.level, layout: e.slot.layout })) }, null, 2);
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'starshell-campaign.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
    flash(`EXPORTED ${authored.length} LEVEL(S) → file + clipboard`);
  };

  const themeName = useMemo(() => THEME_LIST.find((t) => t.id === theme)?.name ?? theme, [theme]);

  return (
    <div className="absolute inset-0 z-40 flex flex-col gap-2 overflow-auto bg-[#05070c] p-3 text-white/80">
      {/* Slim header — the full campaign lives in its own window (▤ CAMPAIGN). */}
      <div className="flex w-full items-center gap-2 font-pixel text-[8px]">
        <button type="button" onClick={() => setShowCampaign(true)} className="rounded border border-[#aef5c8]/50 bg-[#aef5c8]/10 px-3 py-1.5 uppercase text-[#aef5c8] hover:bg-[#aef5c8]/20">▤ CAMPAIGN ({campaign.length})</button>
        <button type="button" onClick={() => activeIdx > 0 && selectSlot(activeIdx - 1)} disabled={activeIdx === 0} className="rounded border border-white/20 px-2 py-1.5 text-white/60 disabled:opacity-30 hover:bg-white/10">◂</button>
        <span className="text-[#aef5c8]">EDITING LEVEL {activeIdx + 1}{dirty ? ' •' : ''}</span>
        <button type="button" onClick={() => activeIdx < campaign.length - 1 && selectSlot(activeIdx + 1)} disabled={activeIdx >= campaign.length - 1} className="rounded border border-white/20 px-2 py-1.5 text-white/60 disabled:opacity-30 hover:bg-white/10">▸</button>
      </div>

      {/* CAMPAIGN WINDOW — a roomy panel: level cards (with boss slots), drag to
          reorder, duplicate / edit / delete, add. */}
      {showCampaign && (
        <div className="absolute inset-0 z-50 flex flex-col gap-3 overflow-auto bg-[#05070c]/98 p-4 font-pixel backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] tracking-[0.2em] text-[#aef5c8]">CAMPAIGN · {campaign.length} LEVELS</p>
            <button type="button" onClick={() => setShowCampaign(false)} className="rounded border border-white/20 px-3 py-1.5 text-[9px] uppercase text-white/70 hover:bg-white/10">✕ CLOSE</button>
          </div>
          <p className="text-[7px] leading-relaxed text-white/40">Drag level cards to reorder. Bosses are fixed at every 5th slot (not editable). EDIT opens a level on the grid; DUP clones it; empty cards fall back to a procedural arena in-game.</p>
          <div className="flex flex-wrap gap-3">
            {buildBelt(campaign.length).map((item) =>
              item.type === 'boss' ? (
                <div key={`b${item.level}`} className="flex h-28 w-32 flex-col items-center justify-center rounded-lg border border-[#ff9a3a]/40 bg-[#ff9a3a]/[0.06] text-center">
                  <span className="text-[16px] text-[#ff9a3a]">★</span>
                  <span className="mt-1 text-[9px] text-[#ff9a3a]">{item.name}</span>
                  <span className="mt-1 text-[7px] text-white/40">BOSS · LVL {item.level}</span>
                </div>
              ) : (
                <div
                  key={`l${item.idx}`}
                  draggable
                  onDragStart={() => (cardDragRef.current = item.idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (cardDragRef.current != null) moveSlot(cardDragRef.current, item.idx);
                    cardDragRef.current = null;
                  }}
                  className={`flex h-28 w-32 cursor-grab flex-col rounded-lg border p-2 active:cursor-grabbing ${item.idx === activeIdx ? 'border-[#aef5c8] ring-1 ring-[#aef5c8]' : 'border-white/20'} ${campaign[item.idx].authored ? 'bg-[#aef5c8]/10' : 'bg-white/[0.03]'}`}
                >
                  <div className="flex items-center justify-between text-[9px]">
                    <span className={campaign[item.idx].authored ? 'text-[#aef5c8]' : 'text-white/50'}>LVL {item.level}</span>
                    <span className="text-white/30">⠿</span>
                  </div>
                  <div className="mt-1 flex-1 text-[7px] leading-relaxed text-white/45">
                    {campaign[item.idx].authored ? (
                      <>
                        {campaign[item.idx].layout.theme}
                        <br />
                        {campaign[item.idx].layout.placements.length} pieces
                        <br />
                        {campaign[item.idx].layout.size} m
                      </>
                    ) : (
                      <span className="text-white/30">empty → procedural</span>
                    )}
                  </div>
                  <div className="flex gap-1 text-[7px]">
                    <button type="button" onClick={() => editSlot(item.idx)} className="flex-1 rounded border border-[#7fdfff]/40 py-0.5 uppercase text-[#7fdfff] hover:bg-[#7fdfff]/15">EDIT</button>
                    <button type="button" onClick={() => duplicateSlot(item.idx)} className="rounded border border-white/20 px-1.5 py-0.5 uppercase text-white/60 hover:bg-white/10">DUP</button>
                    {campaign.length > 1 && (
                      <button type="button" onClick={() => deleteSlot(item.idx)} className="rounded border border-[#ff5d6e]/40 px-1.5 py-0.5 uppercase text-[#ff9aa6] hover:bg-[#ff5d6e]/10">✕</button>
                    )}
                  </div>
                </div>
              ),
            )}
            <button type="button" onClick={() => { insertAt(campaign.length); setShowCampaign(false); }} className="flex h-28 w-32 flex-col items-center justify-center rounded-lg border border-dashed border-[#aef5c8]/40 text-[10px] text-[#aef5c8] hover:bg-[#aef5c8]/10">＋ ADD LEVEL</button>
          </div>
        </div>
      )}

      <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-center">
        <div className="flex flex-col items-center gap-1">
          <canvas
            ref={canvasRef}
            width={CANVAS}
            height={CANVAS}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerLeave={() => setHover(null)}
            className="max-w-full touch-none rounded border border-white/15 bg-black"
            style={{ width: CANVAS, height: CANVAS, imageRendering: 'pixelated' }}
          />
          <p className="font-pixel text-[7px] text-white/40">
            EDITING LEVEL {activeIdx + 1}{dirty ? ' • UNSAVED' : ''} · {placements.length} PIECES · {themeName} · {size} m
          </p>
        </div>

        <div className="flex w-full max-w-xs flex-col gap-2 font-pixel text-[8px]">
          <p className="text-white/45">BUILDINGS</p>
          <div className="flex flex-wrap gap-1">
            {BUILDING_KINDS.map((k) => (
              <button key={k} type="button" onClick={() => { setTool(k); setSelected(null); }} className={`min-h-[26px] rounded border px-2 uppercase transition-colors ${tool === k ? 'border-[#aef5c8] bg-[#aef5c8]/20 text-[#aef5c8]' : 'border-white/15 bg-white/[0.04] text-white/55 hover:bg-white/10'}`}>
                {MOD_ABBR[k]}
              </button>
            ))}
          </div>
          <p className="text-white/45">COVER &amp; PROPS</p>
          <div className="flex flex-wrap gap-1">
            {PROP_KINDS.filter((k) => !RESUPPLY_KINDS.includes(k)).map((k) => (
              <button key={k} type="button" onClick={() => { setTool(k); setSelected(null); }} className={`min-h-[24px] rounded border px-2 text-[7px] uppercase transition-colors ${tool === k ? 'border-[#ffd27a] bg-[#ffd27a]/20 text-[#ffd27a]' : 'border-white/15 bg-white/[0.04] text-white/55 hover:bg-white/10'}`} style={{ borderLeftColor: MOD_COLOR[k], borderLeftWidth: 3 }}>
                {MOD_ABBR[k]}
              </button>
            ))}
          </div>
          <p className="text-white/45">RESUPPLY <span className="text-white/30">(wired to the game)</span></p>
          <div className="flex flex-wrap gap-1">
            {RESUPPLY_KINDS.map((k) => (
              <button key={k} type="button" onClick={() => { setTool(k); setSelected(null); }} className="min-h-[24px] rounded border px-2 text-[7px] uppercase transition-colors" style={{ borderColor: tool === k ? MOD_COLOR[k] : 'rgba(255,255,255,0.15)', background: tool === k ? MOD_COLOR[k] + '22' : 'rgba(255,255,255,0.04)', color: MOD_COLOR[k] }}>
                {k === 'station' ? '⊕ STATION' : k === 'ammocrate' ? '▣ AMMO' : '◆ SHIELD'}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            <button type="button" onClick={() => { setTool('bridge'); setSelected(null); setBridgeFrom(null); }} className={`min-h-[24px] rounded border px-2 uppercase transition-colors ${tool === 'bridge' ? 'border-[#ffd27a] bg-[#ffd27a]/20 text-[#ffd27a]' : 'border-white/15 bg-white/[0.04] text-white/55 hover:bg-white/10'}`}>
              BRIDGE
            </button>
            <button type="button" onClick={() => { setTool(null); setBridgeFrom(null); }} className={`min-h-[24px] rounded border px-2 uppercase transition-colors ${tool === null ? 'border-[#7fdfff] bg-[#7fdfff]/20 text-[#7fdfff]' : 'border-white/15 bg-white/[0.04] text-white/55 hover:bg-white/10'}`}>
              SELECT
            </button>
          </div>
          {tool === 'bridge' && <p className="text-[7px] text-[#ffd27a]/80">Click two aligned, same-height buildings to span a bridge. SELECT + click a bridge to delete.</p>}

          <div className="flex flex-wrap items-center gap-1">
            <button type="button" onClick={rotateSel} className="min-h-[26px] rounded border border-white/20 px-2 uppercase text-white/70 hover:bg-white/10">ROTATE {selected == null ? `↻${rot}°` : ''}</button>
            <button type="button" onClick={deleteSel} disabled={selected == null} className="min-h-[26px] rounded border border-[#ff5d6e]/40 px-2 uppercase text-[#ff9aa6] disabled:opacity-30 hover:bg-[#ff5d6e]/10">DELETE</button>
            <button type="button" onClick={() => { setPlacements([]); setBridges([]); setSelected(null); setBridgeFrom(null); }} className="min-h-[26px] rounded border border-white/20 px-2 uppercase text-white/70 hover:bg-white/10">CLEAR</button>
          </div>

          {tool === 'apartment' && (
            <div className="flex items-center gap-1">
              <span className="text-white/45">APT FLOORS</span>
              {[2, 3, 4].map((n) => (
                <button key={n} type="button" onClick={() => setApt(n)} className={`h-6 w-6 rounded border transition-colors ${apt === n ? 'border-[#aef5c8] bg-[#aef5c8]/20 text-[#aef5c8]' : 'border-white/15 text-white/55 hover:bg-white/10'}`}>{n}</button>
              ))}
            </div>
          )}

          <p className="mt-1 text-white/45">THEME</p>
          <div className="flex flex-wrap gap-1">
            {THEME_LIST.map((t) => (
              <button key={t.id} type="button" onClick={() => setTheme(t.id)} className={`min-h-[24px] rounded border px-2 uppercase transition-colors ${theme === t.id ? 'border-[#aef5c8] bg-[#aef5c8]/20 text-[#aef5c8]' : 'border-white/15 bg-white/[0.04] text-white/55 hover:bg-white/10'}`}>{t.id}</button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-white/45">SIZE</span>
            <button type="button" onClick={() => setSize((s) => Math.max(120, s - 16))} className="h-6 w-6 rounded border border-white/20 text-white/70 hover:bg-white/10">-</button>
            <span className="w-10 text-center text-white/80">{size}</span>
            <button type="button" onClick={() => setSize((s) => Math.min(320, s + 16))} className="h-6 w-6 rounded border border-white/20 text-white/70 hover:bg-white/10">+</button>
          </div>

          <button type="button" onClick={doRandomize} className="mt-1 min-h-[28px] rounded border border-[#ffd27a]/50 bg-[#ffd27a]/10 px-2 uppercase text-[#ffd27a] hover:bg-[#ffd27a]/20">⚄ RANDOMIZE BATTLEFIELD</button>

          <div className="mt-1 flex gap-1">
            <button type="button" onClick={saveActive} className={`min-h-[30px] flex-1 rounded border px-2 uppercase ${dirty ? 'border-[#aef5c8]/60 bg-[#aef5c8]/20 text-[#aef5c8]' : 'border-white/20 text-white/50'} hover:bg-[#aef5c8]/25`}>SAVE LVL {activeIdx + 1}</button>
            <button type="button" onClick={() => onPlay(currentLayout())} className="min-h-[30px] rounded border border-[#7fdfff]/50 bg-[#7fdfff]/10 px-2 uppercase text-[#7fdfff] hover:bg-[#7fdfff]/20">PLAY ▸</button>
          </div>
          <div className="flex gap-1">
            <button type="button" onClick={doExportCampaign} className="min-h-[28px] flex-1 rounded border border-[#7fdfff]/40 px-2 uppercase text-[#7fdfff] hover:bg-[#7fdfff]/15">EXPORT CAMPAIGN</button>
            <button type="button" onClick={onBack} className="min-h-[28px] rounded border border-white/20 px-2 uppercase text-white/60 hover:bg-white/10">◂ BACK</button>
          </div>

          <p className="text-[7px] leading-relaxed text-white/35">Timeline squares = campaign levels (bosses auto-insert every 5th in-game). Click a square to edit it; SAVE writes it to your local campaign so your own playthrough uses it. Empty squares fall back to a procedural arena. EXPORT to ship to real players.{note && <span className="text-[#aef5c8]"> · {note}</span>}</p>
        </div>
      </div>
    </div>
  );
}
