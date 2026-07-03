'use client';

/**
 * GUN INSPECT — a centered full-screen modal that enlarges the loadout weapon so
 * the player can drag-rotate + read its configured stats. Opens from the loadout
 * preview; a button jumps to the owned Components for this gun.
 */
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { GunPreview } from './GunPreview';
import { ComponentsView } from './ComponentsView';
import { gunById } from '../fps/weapons';
import { applyEngineering, type EngPart } from '../fps/arsenal/parts';

export function GunInspect({ gunId, equipped, onClose }: { gunId: string; equipped: EngPart[]; onClose: () => void }) {
  const [showComponents, setShowComponents] = useState(false);
  const gun = gunById(gunId);
  const enh = useMemo(() => applyEngineering(gun, equipped), [gun, equipped]);
  if (typeof document === 'undefined') return null;

  const stats: { label: string; value: string; up: boolean }[] = [
    { label: 'POWER', value: `${enh.dmg}`, up: enh.dmg > gun.dmg },
    { label: 'RATE', value: enh.rate.toFixed(2), up: enh.rate < gun.rate },
    { label: 'MAG', value: `${enh.mag}`, up: enh.mag > gun.mag },
    { label: 'RELOAD', value: `${enh.reload.toFixed(2)}s`, up: enh.reload < gun.reload },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 px-4 py-6 font-pixel backdrop-blur-sm" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="relative flex h-full max-h-[720px] w-full max-w-md flex-col rounded-xl border border-white/10 bg-gradient-to-b from-[#3a4657] to-[#161d29]">
        <div className="flex items-center justify-between px-4 pt-3">
          <p className="text-[10px] text-[#c8a8ff]">{gun.name}</p>
          <button type="button" onClick={onClose} className="text-[10px] text-white/60 hover:text-white">✕</button>
        </div>
        <div className="relative min-h-0 flex-1">
          <GunPreview gunId={gunId} equipped={equipped} />
          <button
            type="button"
            onClick={() => setShowComponents(true)}
            className="absolute bottom-3 right-3 rounded-md border border-[#c8a8ff]/40 bg-[#c8a8ff]/15 px-3 py-2 text-[8px] uppercase tracking-[0.1em] text-[#c8a8ff] backdrop-blur-sm hover:bg-[#c8a8ff]/25"
          >
            Components
          </button>
        </div>
        {/* configured stats — zoomed in with the picture */}
        <div className="grid grid-cols-4 gap-2 px-4 pb-1">
          {stats.map((s) => (
            <div key={s.label} className="rounded border border-white/10 bg-white/[0.03] p-2 text-center">
              <p className="text-[11px] text-white">{s.value}</p>
              <p className="mt-0.5 text-[5px] tracking-[0.15em] text-white/40">{s.label}{s.up ? ' ▲' : ''}</p>
            </div>
          ))}
        </div>
        <p className="pointer-events-none pb-3 text-center text-[6px] tracking-[0.2em] text-white/35">DRAG TO ROTATE</p>
      </div>
      {showComponents && <ComponentsView mode="weapon" gunId={gunId} onBack={() => setShowComponents(false)} />}
    </div>,
    document.body,
  );
}
