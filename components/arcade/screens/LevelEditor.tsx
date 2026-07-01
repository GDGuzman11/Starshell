'use client';

/**
 * DEV-ONLY visual level editor (local dev builds only). A 2D top-down grid: pick a
 * module + rotation, click to drop it onto the grid, drag to move, rotate/delete,
 * choose a theme + arena size, then PLAY it (sandbox) or EXPORT the layout JSON to
 * bake into the campaign (levels.ts). Save/Load persists to localStorage.
 *
 * Rendering is a plain 2D canvas (redraw-on-change, no RAF) — cheap and precise;
 * the full 3D "preview" is the Play button. Mouse + touch via pointer events.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BUILDING_KINDS, CELL, LAYOUT_VERSION, PROP_KINDS, ROTATIONS, cellToWorld, footprintOf, type LevelLayout, type ModuleKind, type Placement, type Rot } from '../fps/kit/layout';
import { THEME_LIST } from '../fps/kit/themes';
import { deleteLayout, listLayouts, loadLayout, saveLayout, type SavedMeta } from '../fps/kit/storage';

const CANVAS = 460;
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
};
const MOD_ABBR: Record<ModuleKind, string> = { barracks: 'BRK', watchtower: 'TWR', command: 'CMD', apartment: 'APT', ruin: 'RUIN', bunker: 'BNK', coverwall: 'WALL', sandbags: 'SAND', container: 'CONT', barrier: 'BARR', dragonteeth: 'TEETH', fueltank: 'TANK', commtower: 'ANT', guardpost: 'POST', crates: 'CRAT', rubble: 'RUBL', wreck: 'WRCK' };

export function LevelEditor({ onPlay, onBack }: { onPlay: (layout: LevelLayout) => void; onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [theme, setTheme] = useState('wartorn');
  const [size, setSize] = useState(200);
  const [tool, setTool] = useState<ModuleKind | null>('command');
  const [rot, setRot] = useState<Rot>(0);
  const [apt, setApt] = useState(3);
  const [selected, setSelected] = useState<number | null>(null);
  const [hover, setHover] = useState<{ gx: number; gz: number } | null>(null);
  const [name, setName] = useState('');
  const [saved, setSaved] = useState<SavedMeta[]>([]);
  const [note, setNote] = useState('');
  const dragRef = useRef(false);

  useEffect(() => setSaved(listLayouts()), []);
  const flash = useCallback((m: string) => {
    setNote(m);
    window.setTimeout(() => setNote(''), 1600);
  }, []);

  const half = size / 2;
  const scale = CANVAS / size;
  const w2p = useCallback((w: number) => (w + half) * scale, [half, scale]);
  const px2cell = useCallback((px: number) => Math.round((px / scale - half) / CELL), [scale, half]);
  const px2world = useCallback((px: number) => px / scale - half, [scale, half]);

  const currentLayout = useCallback(
    (): LevelLayout => ({ v: LAYOUT_VERSION, theme, size, seed: 12345, placements, name: name || undefined }),
    [theme, size, placements, name],
  );

  // Redraw the board whenever anything visible changes.
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const x = cv.getContext('2d');
    if (!x) return;
    x.clearRect(0, 0, CANVAS, CANVAS);
    x.fillStyle = '#0a0d14';
    x.fillRect(0, 0, CANVAS, CANVAS);
    // grid
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
    // boundary
    x.strokeStyle = 'rgba(255,255,255,0.25)';
    x.lineWidth = 2;
    x.strokeRect(w2p(-half), w2p(-half), size * scale, size * scale);
    // spawns (player −z green, enemies +z red)
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
    // hover ghost
    if (tool && hover) {
      const fp = footprintOf({ module: tool, gx: hover.gx, gz: hover.gz, rot });
      const cx = cellToWorld(hover.gx);
      const cz = cellToWorld(hover.gz);
      x.fillStyle = 'rgba(255,255,255,0.12)';
      x.fillRect(w2p(cx - fp.w / 2), w2p(cz - fp.d / 2), fp.w * scale, fp.d * scale);
    }
    // placements
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
      // rotation notch — a tick toward the module's local +x after rotation
      const ang = (p.rot * Math.PI) / 180;
      const nx = Math.cos(-ang) * fp.w * 0.4;
      const nz = Math.sin(-ang) * fp.d * 0.4;
      x.strokeStyle = 'rgba(255,255,255,0.8)';
      x.lineWidth = 1.5;
      x.beginPath();
      x.moveTo(w2p(cx), w2p(cz));
      x.lineTo(w2p(cx + nx), w2p(cz + nz));
      x.stroke();
      x.fillStyle = '#0a0d14';
      x.font = '8px monospace';
      x.fillText(MOD_ABBR[p.module], w2p(cx) - 9, w2p(cz) + 3);
    });
  }, [placements, size, selected, tool, rot, hover, half, scale, w2p]);

  const eventCell = (e: React.PointerEvent) => {
    const cv = canvasRef.current!;
    const r = cv.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * CANVAS;
    const pz = ((e.clientY - r.top) / r.height) * CANVAS;
    return { gx: px2cell(px), gz: px2cell(pz), wx: px2world(px), wz: px2world(pz) };
  };
  const hitTest = (wx: number, wz: number): number => {
    for (let i = placements.length - 1; i >= 0; i--) {
      const p = placements[i];
      const fp = footprintOf(p);
      const cx = cellToWorld(p.gx);
      const cz = cellToWorld(p.gz);
      if (Math.abs(wx - cx) <= fp.w / 2 && Math.abs(wz - cz) <= fp.d / 2) return i;
    }
    return -1;
  };

  const onDown = (e: React.PointerEvent) => {
    const { gx, gz, wx, wz } = eventCell(e);
    const hit = hitTest(wx, wz);
    if (tool) {
      if (placements.some((p) => p.gx === gx && p.gz === gz)) {
        setSelected(placements.findIndex((p) => p.gx === gx && p.gz === gz));
        return;
      }
      const np: Placement = { module: tool, gx, gz, rot, params: tool === 'apartment' ? { levels: apt } : undefined };
      setPlacements((ps) => [...ps, np]);
      setSelected(placements.length);
    } else if (hit >= 0) {
      setSelected(hit);
      dragRef.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } else {
      setSelected(null);
    }
  };
  const onMove = (e: React.PointerEvent) => {
    const { gx, gz } = eventCell(e);
    setHover({ gx, gz });
    if (dragRef.current && selected != null) {
      setPlacements((ps) => ps.map((p, i) => (i === selected ? { ...p, gx, gz } : p)));
    }
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
  const doSave = () => {
    const nm = name.trim() || `level-${Date.now().toString(36)}`;
    setName(nm);
    if (saveLayout(nm, currentLayout())) {
      setSaved(listLayouts());
      flash('SAVED');
    } else flash('SAVE FAILED');
  };
  const doLoad = (id: string) => {
    const l = loadLayout(id);
    if (!l) return flash('LOAD FAILED');
    setPlacements(l.placements);
    setTheme(l.theme);
    setSize(l.size);
    setName(l.name ?? '');
    setSelected(null);
    flash('LOADED');
  };
  const doDelete = (id: string) => {
    deleteLayout(id);
    setSaved(listLayouts());
  };
  const doExport = () => {
    const json = JSON.stringify(currentLayout());
    try {
      navigator.clipboard?.writeText(json);
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line no-console
    console.log('[LevelEditor] layout JSON:\n' + json);
    flash('EXPORTED → clipboard + console');
  };

  const themeName = useMemo(() => THEME_LIST.find((t) => t.id === theme)?.name ?? theme, [theme]);

  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center gap-3 overflow-auto bg-[#05070c] p-4 text-white/80 sm:flex-row sm:items-start sm:justify-center">
      <div className="flex flex-col items-center gap-2">
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
        <p className="font-pixel text-[7px] text-white/40">{placements.length} PIECES · {themeName} · {size} m</p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-2 font-pixel text-[8px]">
        <p className="text-[9px] tracking-[0.2em] text-[#aef5c8]">LEVEL EDITOR</p>

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
          {PROP_KINDS.map((k) => (
            <button key={k} type="button" onClick={() => { setTool(k); setSelected(null); }} className={`min-h-[24px] rounded border px-2 text-[7px] uppercase transition-colors ${tool === k ? 'border-[#ffd27a] bg-[#ffd27a]/20 text-[#ffd27a]' : 'border-white/15 bg-white/[0.04] text-white/55 hover:bg-white/10'}`} style={{ borderLeftColor: MOD_COLOR[k], borderLeftWidth: 3 }}>
              {MOD_ABBR[k]}
            </button>
          ))}
          <button type="button" onClick={() => setTool(null)} className={`min-h-[24px] rounded border px-2 uppercase transition-colors ${tool === null ? 'border-[#7fdfff] bg-[#7fdfff]/20 text-[#7fdfff]' : 'border-white/15 bg-white/[0.04] text-white/55 hover:bg-white/10'}`}>
            SELECT
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <button type="button" onClick={rotateSel} className="min-h-[26px] rounded border border-white/20 px-2 uppercase text-white/70 hover:bg-white/10">
            ROTATE {selected == null ? `↻${rot}°` : ''}
          </button>
          <button type="button" onClick={deleteSel} disabled={selected == null} className="min-h-[26px] rounded border border-[#ff5d6e]/40 px-2 uppercase text-[#ff9aa6] disabled:opacity-30 hover:bg-[#ff5d6e]/10">
            DELETE
          </button>
          <button type="button" onClick={() => { setPlacements([]); setSelected(null); }} className="min-h-[26px] rounded border border-white/20 px-2 uppercase text-white/70 hover:bg-white/10">
            CLEAR
          </button>
        </div>

        {tool === 'apartment' && (
          <div className="flex items-center gap-1">
            <span className="text-white/45">APT FLOORS</span>
            {[2, 3, 4].map((n) => (
              <button key={n} type="button" onClick={() => setApt(n)} className={`h-6 w-6 rounded border transition-colors ${apt === n ? 'border-[#aef5c8] bg-[#aef5c8]/20 text-[#aef5c8]' : 'border-white/15 text-white/55 hover:bg-white/10'}`}>
                {n}
              </button>
            ))}
          </div>
        )}

        <p className="mt-1 text-white/45">THEME</p>
        <div className="flex flex-wrap gap-1">
          {THEME_LIST.map((t) => (
            <button key={t.id} type="button" onClick={() => setTheme(t.id)} className={`min-h-[24px] rounded border px-2 uppercase transition-colors ${theme === t.id ? 'border-[#aef5c8] bg-[#aef5c8]/20 text-[#aef5c8]' : 'border-white/15 bg-white/[0.04] text-white/55 hover:bg-white/10'}`}>
              {t.id}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-white/45">SIZE</span>
          <button type="button" onClick={() => setSize((s) => Math.max(120, s - 16))} className="h-6 w-6 rounded border border-white/20 text-white/70 hover:bg-white/10">-</button>
          <span className="w-10 text-center text-white/80">{size}</span>
          <button type="button" onClick={() => setSize((s) => Math.min(320, s + 16))} className="h-6 w-6 rounded border border-white/20 text-white/70 hover:bg-white/10">+</button>
        </div>

        <div className="mt-1 flex items-center gap-1">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="name" className="min-w-0 flex-1 rounded border border-white/15 bg-black/40 px-2 py-1 text-white/80 outline-none placeholder:text-white/30" />
          <button type="button" onClick={doSave} className="min-h-[26px] rounded border border-white/20 px-2 uppercase text-white/70 hover:bg-white/10">SAVE</button>
        </div>
        {saved.length > 0 && (
          <div className="flex max-h-20 flex-col gap-1 overflow-auto">
            {saved.map((m) => (
              <div key={m.id} className="flex items-center gap-1">
                <button type="button" onClick={() => doLoad(m.id)} className="min-h-[22px] flex-1 truncate rounded border border-white/15 px-2 text-left text-white/70 hover:bg-white/10">{m.name}</button>
                <button type="button" onClick={() => doDelete(m.id)} className="min-h-[22px] rounded border border-[#ff5d6e]/30 px-1.5 text-[#ff9aa6] hover:bg-[#ff5d6e]/10">✕</button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-1 flex gap-1">
          <button type="button" onClick={() => onPlay(currentLayout())} className="min-h-[30px] flex-1 rounded border border-[#aef5c8]/50 bg-[#aef5c8]/15 px-2 uppercase text-[#aef5c8] hover:bg-[#aef5c8]/25">PLAY ▸</button>
          <button type="button" onClick={doExport} className="min-h-[30px] rounded border border-[#7fdfff]/40 px-2 uppercase text-[#7fdfff] hover:bg-[#7fdfff]/15">EXPORT</button>
          <button type="button" onClick={onBack} className="min-h-[30px] rounded border border-white/20 px-2 uppercase text-white/60 hover:bg-white/10">◂ BACK</button>
        </div>

        <p className="text-[7px] leading-relaxed text-white/35">Pick a piece → click the grid to place. SELECT to move (drag) / rotate / delete. YOU spawn south, ENEMY north.{note && <span className="text-[#aef5c8]"> · {note}</span>}</p>
      </div>
    </div>
  );
}
