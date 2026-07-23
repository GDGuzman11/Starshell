'use client';

/**
 * PREMIUM INSPECT — a centered full-screen modal that ENLARGES a premium weapon (the
 * click-to-enlarge showcase): a lit gradient backdrop + the bloomed `GunPreview` (drag to
 * rotate), display stats, engineering line, and an AstroDiamond BUY / OWNED action.
 */
import { createPortal } from 'react-dom';
import { GunPreview } from './GunPreview';

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

export interface InspectBuy {
  owned: boolean;
  currency: 'gold' | 'astro';
  amount: number;
  canAfford: boolean;
  onBuy: () => void;
}

export function PremiumInspect({ id, name, accent: accentHex, code, stats, philosophy, event, buy, onClose }: {
  id: string;
  name: string;
  accent: number;
  code?: string;
  stats: { power: number; rate: number; mag: number; reload: number };
  philosophy?: string;
  event?: string;
  buy?: InspectBuy;
  onClose: () => void;
}) {
  if (typeof document === 'undefined') return null;
  const accent = hex(accentHex);
  const cur = (c: 'gold' | 'astro') => (c === 'gold' ? '⛀' : '◈');
  const rows: { label: string; value: string }[] = [
    { label: 'POWER', value: `${stats.power}` },
    { label: 'RATE', value: stats.rate.toFixed(2) },
    { label: 'MAG', value: `${stats.mag}` },
    { label: 'RELOAD', value: `${stats.reload.toFixed(2)}s` },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 px-4 py-6 font-pixel backdrop-blur-sm" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="relative flex h-full max-h-[720px] w-full max-w-md flex-col rounded-xl border border-white/10 bg-gradient-to-b from-[#26303f] to-[#0a0f16]">
        <div className="flex items-center justify-between px-4 pt-3">
          <div>
            <p className="text-[10px]" style={{ color: accent }}>{name}</p>
            <p className="text-[6px] tracking-[0.25em] text-white/40">{code ?? 'PREMIUM'}</p>
          </div>
          <button type="button" onClick={onClose} className="text-[10px] text-white/60 hover:text-white">✕</button>
        </div>
        <div className="relative min-h-0 flex-1">
          <GunPreview gunId={id} />
        </div>
        {philosophy && <p className="px-4 text-center text-[7px] leading-relaxed text-white/55">{philosophy}</p>}
        {event && (
          <p className="mx-4 mt-1.5 rounded border px-2 py-1 text-center text-[6px] leading-relaxed" style={{ borderColor: `${accent}55`, backgroundColor: `${accent}12`, color: accent }}>
            ◈ {event}
          </p>
        )}
        <div className="grid grid-cols-4 gap-2 px-4 pb-1 pt-2">
          {rows.map((s) => (
            <div key={s.label} className="rounded border border-white/10 bg-white/[0.03] p-2 text-center">
              <p className="text-[11px] text-white">{s.value}</p>
              <p className="mt-0.5 text-[5px] tracking-[0.15em] text-white/40">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between px-4 pb-3 pt-2">
          <p className="pointer-events-none text-[6px] tracking-[0.2em] text-white/35">DRAG TO ROTATE</p>
          {buy ? (
            buy.owned ? (
              <span className="rounded-full border border-[#63ff84]/40 bg-[#63ff84]/10 px-4 py-1.5 text-[8px] uppercase tracking-[0.15em] text-[#63ff84]">✓ Owned</span>
            ) : (
              <button type="button" onClick={buy.onBuy} disabled={!buy.canAfford} className={`rounded-full border px-4 py-1.5 text-[8px] uppercase tracking-[0.15em] transition-colors ${buy.canAfford ? 'border-[#c8a8ff]/50 bg-[#c8a8ff]/15 text-[#c8a8ff] hover:bg-[#c8a8ff]/25' : 'cursor-not-allowed border-white/10 bg-white/[0.02] text-white/30'}`}>
                {buy.canAfford ? `BUY · ${cur(buy.currency)} ${buy.amount}` : `${cur(buy.currency)} ${buy.amount} — NOT ENOUGH`}
              </button>
            )
          ) : (
            <span className="rounded-full border border-white/15 px-3 py-1 text-[6px] uppercase tracking-[0.2em] text-white/40">🔒 Coming soon</span>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
