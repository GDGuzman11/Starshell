'use client';

/**
 * Control-layout EDITOR. Drag any button to move it, tap to select, then resize /
 * adjust its opacity; pick a built-in preset or save your own named preset. A
 * floating panel (COD-style) holds Scale / Opacity / presets / Reset / Save & Use /
 * Exit. Positions are stored as % of the screen so a layout scales across devices.
 */
import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { ShapeButton } from './ShapeButton';
import {
  DEFAULT_LAYOUT,
  PRESETS,
  clampButton,
  cbColor,
  saveLayout,
  saveCustomPreset,
  deleteCustomPreset,
  loadCustomPresets,
  type ControlLayout,
  type ControlButton,
  type ButtonAction,
  type SavedPreset,
} from './layout';

const clone = (l: ControlLayout): ControlLayout => ({ ...l, buttons: l.buttons.map((b) => ({ ...b })) });

export function LayoutEditor({
  initial,
  cfg,
  onSave,
  onExit,
}: {
  initial: ControlLayout;
  cfg: { leftHanded: boolean; btnScale: number; highContrast: boolean; colorblind: boolean };
  onSave: (layout: ControlLayout) => void;
  onExit: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [working, setWorking] = useState<ControlLayout>(() => clone(initial));
  const [selected, setSelected] = useState<ButtonAction | null>(null);
  const [customs, setCustoms] = useState<SavedPreset[]>(() => loadCustomPresets());
  const [name, setName] = useState('');
  const left = cfg.leftHanded;
  const scale = cfg.btnScale;

  const sel = working.buttons.find((b) => b.id === selected) ?? null;

  const posOf = (b: ControlButton): CSSProperties => ({ left: `${left ? b.x : 100 - b.x}%`, top: `${100 - b.y}%`, transform: 'translate(-50%,-50%)' });

  const drag = (id: ButtonAction, clientX: number, clientY: number) => {
    const r = rootRef.current?.getBoundingClientRect();
    if (!r) return;
    const x = left ? ((clientX - r.left) / r.width) * 100 : ((r.right - clientX) / r.width) * 100;
    const y = ((r.bottom - clientY) / r.height) * 100;
    setWorking((w) => ({ ...w, buttons: w.buttons.map((b) => (b.id === id ? clampButton({ ...b, x, y }) : b)) }));
  };
  const patchSel = (patch: Partial<ControlButton>) => {
    if (!selected) return;
    setWorking((w) => ({ ...w, buttons: w.buttons.map((b) => (b.id === selected ? { ...b, ...patch } : b)) }));
  };
  const applyPreset = (l: ControlLayout) => { setWorking(clone(l)); setSelected(null); };

  return (
    <div ref={rootRef} className="absolute inset-0 z-[60] select-none bg-black/55 font-pixel">
      {/* draggable buttons over a dimmed screen */}
      {working.buttons.map((b) => (
        <ShapeButton
          key={b.id}
          btn={{ ...b, color: cbColor(b.color, cfg.colorblind) }}
          scale={scale}
          highContrast={cfg.highContrast}
          selected={selected === b.id}
          onDown={() => {}}
          onSelect={() => setSelected(b.id)}
          onDragMove={(cx, cy) => drag(b.id, cx, cy)}
          style={posOf(b)}
        />
      ))}

      {/* floating control panel */}
      <div className="absolute left-1/2 top-3 z-[61] w-[min(94vw,560px)] -translate-x-1/2 rounded-lg border border-[#7fdfff]/40 bg-black/85 p-2.5 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-[#7fdfff]">EDIT CONTROLS {sel ? `· ${sel.label || sel.id}` : '· drag a button'}</p>
          <p className="text-[6px] tracking-[0.2em] text-white/40">DRAG TO MOVE · TAP TO SELECT</p>
        </div>

        {/* selected-button sliders */}
        <div className={`mt-2 grid grid-cols-2 gap-2 ${sel ? '' : 'pointer-events-none opacity-40'}`}>
          <label className="text-[7px] text-white/60">
            SIZE {sel ? Math.round(sel.size) : ''}
            <input type="range" min={32} max={140} step={2} value={sel?.size ?? 60} onChange={(e) => patchSel({ size: Number(e.target.value) })} className="mt-0.5 w-full accent-[#7fdfff]" />
          </label>
          <label className="text-[7px] text-white/60">
            OPACITY {sel ? Math.round((sel.opacity ?? 1) * 100) : ''}%
            <input type="range" min={0.2} max={1} step={0.05} value={sel?.opacity ?? 1} onChange={(e) => patchSel({ opacity: Number(e.target.value) })} className="mt-0.5 w-full accent-[#7fdfff]" />
          </label>
        </div>

        {/* presets */}
        <div className="mt-2 flex flex-wrap gap-1">
          {Object.entries(PRESETS).map(([k, l]) => (
            <button key={k} type="button" onClick={() => applyPreset(l)} className="rounded border border-white/15 px-2 py-1 text-[7px] uppercase text-white/70 hover:bg-white/10">
              {l.name}
            </button>
          ))}
          {customs.map((p) => (
            <span key={p.name} className="flex items-center gap-0.5 rounded border border-[#c8a8ff]/30 pl-2 text-[7px] uppercase text-[#c8a8ff]">
              <button type="button" onClick={() => applyPreset(p.layout)} className="py-1">{p.name}</button>
              <button type="button" aria-label={`Delete ${p.name}`} onClick={() => setCustoms(deleteCustomPreset(p.name))} className="px-1 text-[#ff5d6e]/70 hover:text-[#ff5d6e]">✕</button>
            </span>
          ))}
        </div>

        {/* save custom + actions */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="preset name" className="w-24 rounded border border-white/15 bg-black/50 px-2 py-1 text-[8px] text-white outline-none placeholder:text-white/30" />
          <button type="button" disabled={!name.trim()} onClick={() => { setCustoms(saveCustomPreset(name.trim(), working)); setName(''); }} className="rounded border border-[#c8a8ff]/40 bg-[#c8a8ff]/10 px-2 py-1 text-[7px] uppercase text-[#c8a8ff] disabled:opacity-30">Save preset</button>
          <button type="button" onClick={() => applyPreset(DEFAULT_LAYOUT)} className="rounded border border-white/20 px-2 py-1 text-[7px] uppercase text-white/70 hover:bg-white/10">Reset</button>
          <button type="button" onClick={onExit} className="rounded border border-white/20 px-2 py-1 text-[7px] uppercase text-white/60 hover:bg-white/10">Exit</button>
          <button type="button" onClick={() => { saveLayout(working); onSave(working); onExit(); }} className="rounded border border-[#aef5c8]/50 bg-[#aef5c8]/15 px-3 py-1 text-[8px] uppercase text-[#aef5c8] hover:bg-[#aef5c8]/25">Save &amp; Use</button>
        </div>
      </div>
    </div>
  );
}
