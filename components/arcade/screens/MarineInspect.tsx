'use client';

/**
 * MARINE INSPECT — a centered full-screen modal that enlarges the Marine so the
 * player can drag-rotate and inspect their armor. Opens from the menu avatar
 * preview; a bottom-right button jumps to the owned Armory Components.
 */
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { MarinePreview } from './MarinePreview';
import { ComponentsView } from './ComponentsView';
import { aggregateArmor } from '../fps/marine/stats';
import { ARMOR_STAT_LABEL, type ArmorStat } from '../fps/marine/slots';
import type { ArmorPiece } from '../fps/marine/parts';

const STAT_ORDER: ArmorStat[] = ['armor', 'mobility', 'shield', 'recovery'];

export function MarineInspect({ equipped, divisionId, rank, onClose }: { equipped: ArmorPiece[]; divisionId?: string | null; rank: string; onClose: () => void }) {
  const [showComponents, setShowComponents] = useState(false);
  const totals = useMemo(() => aggregateArmor(equipped), [equipped]);
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 px-4 py-6 font-pixel backdrop-blur-sm" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="relative flex h-full max-h-[720px] w-full max-w-md flex-col rounded-xl border border-white/10 bg-gradient-to-b from-[#3a4657] to-[#161d29]">
        <div className="flex items-center justify-between px-4 pt-3">
          <p className="text-[9px] tracking-[0.2em] text-[#7fdfff]">{rank}</p>
          <button type="button" onClick={onClose} className="text-[10px] text-white/60 hover:text-white">✕</button>
        </div>
        <div className="relative min-h-0 flex-1">
          <MarinePreview equipped={equipped} divisionId={divisionId} />
          <button
            type="button"
            onClick={() => setShowComponents(true)}
            className="absolute bottom-3 right-3 rounded-md border border-[#7fdfff]/40 bg-[#7fdfff]/15 px-3 py-2 text-[8px] uppercase tracking-[0.1em] text-[#7fdfff] backdrop-blur-sm hover:bg-[#7fdfff]/25"
          >
            ⛨ Armory Components
          </button>
        </div>
        {/* armor stats — zoomed in with the picture */}
        <div className="px-4 pb-1">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[7px] tracking-[0.2em] text-white/50">ARMOR</span>
            <span className="text-[8px] text-[#aef5c8]/80">RATING ◈ {totals.rating}</span>
          </div>
          <div className="flex flex-col gap-1">
            {STAT_ORDER.map((k) => (
              <div key={k} className="flex items-center gap-2">
                <span className="w-14 text-[6px] uppercase text-white/40">{ARMOR_STAT_LABEL[k]}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                  <span className="block h-full rounded-full bg-[#7fdfff]/70" style={{ width: `${Math.min(100, Math.max(0, totals[k]) * 260)}%` }} />
                </span>
              </div>
            ))}
          </div>
        </div>
        <p className="pointer-events-none pb-3 text-center text-[6px] tracking-[0.2em] text-white/35">DRAG TO ROTATE</p>
      </div>
      {showComponents && <ComponentsView mode="armor" onBack={() => setShowComponents(false)} />}
    </div>,
    document.body,
  );
}
