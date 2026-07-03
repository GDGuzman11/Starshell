'use client';

/**
 * PREMIUM STORE — three sections. WEAPONS is a live showcase of the prestige arsenal:
 * each Premium weapon renders as a rotating 3D model (same preview mechanics as the
 * Loadout Preview — drag-rotate + auto-spin + tap-to-expand inspect) with its stats and
 * engineering philosophy. Acquisition is LOCKED for now (real monetization + in-game
 * realization are a separate future build). Armor / Levels stay "coming soon".
 */
import { useState } from 'react';
import { GunPreview } from './GunPreview';
import { PremiumInspect } from './PremiumInspect';
import { PREMIUM_WEAPONS } from '../fps/arsenal/premium';

type Tab = 'weapons' | 'armor' | 'levels';
const TABS: { id: Tab; label: string; blurb: string }[] = [
  { id: 'weapons', label: 'Weapons', blurb: 'Prestige-tier hardware with unique premium engineering and perks.' },
  { id: 'armor', label: 'Armor', blurb: 'Exclusive armor sets and finishes that set your Marine apart.' },
  { id: 'levels', label: 'Levels', blurb: 'Seasonal battle passes and bonus mission packs.' },
];
const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

function WeaponsShowcase() {
  const [selId, setSelId] = useState(PREMIUM_WEAPONS[0]?.id ?? '');
  const [inspect, setInspect] = useState(false);
  const weapon = PREMIUM_WEAPONS.find((w) => w.id === selId) ?? PREMIUM_WEAPONS[0];
  if (!weapon) {
    return <p className="mt-8 text-center text-[8px] text-white/40">No premium weapons yet.</p>;
  }
  const accent = hex(weapon.accent);
  const stats: { label: string; value: string }[] = [
    { label: 'POWER', value: `${weapon.stats.power}` },
    { label: 'RATE', value: weapon.stats.rate.toFixed(2) },
    { label: 'MAG', value: `${weapon.stats.mag}` },
    { label: 'RELOAD', value: `${weapon.stats.reload.toFixed(2)}s` },
  ];

  return (
    <div className="mx-auto w-full max-w-lg">
      {/* weapon chips (grows as the catalog fills to ten) */}
      {PREMIUM_WEAPONS.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {PREMIUM_WEAPONS.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => setSelId(w.id)}
              className={`rounded border px-3 py-1.5 text-[8px] uppercase tracking-[0.1em] transition-colors ${w.id === selId ? 'text-black' : 'border-white/15 bg-white/[0.03] text-white/60 hover:bg-white/10'}`}
              style={w.id === selId ? { borderColor: hex(w.accent), backgroundColor: hex(w.accent) } : undefined}
            >
              {w.name}
            </button>
          ))}
        </div>
      )}

      {/* live rotating preview (tap to inspect) */}
      <div className="relative h-56 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-[#1a2330] to-[#080c12] sm:h-64">
        <GunPreview gunId={weapon.id} onExpand={() => setInspect(true)} />
        <span className="pointer-events-none absolute right-2 top-2 text-[9px] text-white/50">⤢</span>
        <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 text-[6px] tracking-[0.2em] text-white/40">TAP TO INSPECT · DRAG TO ROTATE</span>
      </div>

      {/* identity */}
      <div className="mt-3 flex items-baseline justify-between">
        <p className="text-[12px]" style={{ color: accent }}>{weapon.name}</p>
        <p className="text-[7px] tracking-[0.25em] text-white/40">{weapon.code} · PREMIUM</p>
      </div>
      <p className="mt-1 text-[7px] leading-relaxed text-white/55">{weapon.philosophy}</p>

      {/* display stats */}
      <div className="mt-3 grid grid-cols-4 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded border border-white/10 bg-white/[0.03] p-2 text-center">
            <p className="text-[11px] text-white">{s.value}</p>
            <p className="mt-0.5 text-[5px] tracking-[0.15em] text-white/40">{s.label}</p>
          </div>
        ))}
      </div>

      {/* locked acquire */}
      <button
        type="button"
        disabled
        className="mt-4 w-full cursor-not-allowed rounded-md border border-white/15 bg-white/[0.03] py-2 text-[8px] uppercase tracking-[0.2em] text-white/40"
      >
        🔒 Coming soon
      </button>

      {inspect && <PremiumInspect weapon={weapon} onClose={() => setInspect(false)} />}
    </div>
  );
}

export function FpsPremium({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<Tab>('weapons');
  const active = TABS.find((t) => t.id === tab) ?? TABS[0];

  return (
    <div className="absolute inset-0 z-40 flex flex-col gap-3 overflow-auto bg-[#05070c]/97 px-4 py-4 font-pixel">
      <div className="flex items-center justify-between">
        <p className="text-[12px] tracking-[0.2em] text-[#ffd27a] sm:text-[16px]">✦ PREMIUM</p>
        <button type="button" onClick={onBack} className="rounded border border-white/20 px-3 py-1.5 text-[9px] uppercase text-white/70 hover:bg-white/10">◂ Back</button>
      </div>

      {/* tabs */}
      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded border px-4 py-1.5 text-[8px] uppercase tracking-[0.15em] transition-colors sm:text-[9px] ${t.id === tab ? 'border-[#ffd27a] bg-[#ffd27a]/15 text-[#ffd27a]' : 'border-white/15 bg-white/[0.03] text-white/55 hover:bg-white/10'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* content */}
      {tab === 'weapons' ? (
        <div className="mt-1 flex-1">
          <WeaponsShowcase />
        </div>
      ) : (
        <div className="mx-auto mt-2 flex w-full max-w-lg flex-1 flex-col items-center justify-center rounded-xl border border-[#ffd27a]/20 bg-[#ffd27a]/[0.03] p-8 text-center">
          <p className="text-[14px] tracking-[0.2em] text-[#ffd27a]/90 sm:text-[18px]">{active.label.toUpperCase()}</p>
          <p className="mt-3 max-w-sm text-[8px] leading-relaxed text-white/50 sm:text-[9px]">{active.blurb}</p>
          <p className="mt-5 rounded-full border border-white/15 px-4 py-1.5 text-[7px] uppercase tracking-[0.25em] text-white/40">🔒 Coming soon</p>
        </div>
      )}
    </div>
  );
}
