'use client';

/**
 * PREMIUM INSPECT — the premium twin of GunInspect: a centered full-screen modal that
 * enlarges a Premium weapon so the player can drag-rotate + read its display stats and
 * engineering philosophy. Same preview mechanics as the loadout inspect, but showcase-
 * only (acquisition is locked; no owned components).
 */
import { createPortal } from 'react-dom';
import { GunPreview } from './GunPreview';
import type { PremiumWeapon } from '../fps/arsenal/premium';

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

export function PremiumInspect({ weapon, onClose }: { weapon: PremiumWeapon; onClose: () => void }) {
  if (typeof document === 'undefined') return null;
  const accent = hex(weapon.accent);
  const stats: { label: string; value: string }[] = [
    { label: 'POWER', value: `${weapon.stats.power}` },
    { label: 'RATE', value: weapon.stats.rate.toFixed(2) },
    { label: 'MAG', value: `${weapon.stats.mag}` },
    { label: 'RELOAD', value: `${weapon.stats.reload.toFixed(2)}s` },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 px-4 py-6 font-pixel backdrop-blur-sm" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="relative flex h-full max-h-[720px] w-full max-w-md flex-col rounded-xl border border-white/10 bg-gradient-to-b from-[#26303f] to-[#0a0f16]">
        <div className="flex items-center justify-between px-4 pt-3">
          <div>
            <p className="text-[10px]" style={{ color: accent }}>{weapon.name}</p>
            <p className="text-[6px] tracking-[0.25em] text-white/40">{weapon.code} · PREMIUM</p>
          </div>
          <button type="button" onClick={onClose} className="text-[10px] text-white/60 hover:text-white">✕</button>
        </div>
        <div className="relative min-h-0 flex-1">
          <GunPreview gunId={weapon.id} />
        </div>
        <p className="px-4 text-center text-[7px] leading-relaxed text-white/55">{weapon.philosophy}</p>
        {/* display stats — zoomed in with the picture */}
        <div className="grid grid-cols-4 gap-2 px-4 pb-1 pt-2">
          {stats.map((s) => (
            <div key={s.label} className="rounded border border-white/10 bg-white/[0.03] p-2 text-center">
              <p className="text-[11px] text-white">{s.value}</p>
              <p className="mt-0.5 text-[5px] tracking-[0.15em] text-white/40">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between px-4 pb-3 pt-2">
          <p className="pointer-events-none text-[6px] tracking-[0.2em] text-white/35">DRAG TO ROTATE</p>
          <span className="rounded-full border border-white/15 px-3 py-1 text-[6px] uppercase tracking-[0.2em] text-white/40">🔒 Coming soon</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
