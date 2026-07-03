'use client';

/**
 * PREMIUM STORE (scaffold) — three sections, Weapons / Armor / Levels, each a
 * "coming soon" placeholder for now. The real store (payment processor + secure
 * entitlement backend) is a separate future build; this establishes the shape.
 */
import { useState } from 'react';

type Tab = 'weapons' | 'armor' | 'levels';
const TABS: { id: Tab; label: string; blurb: string }[] = [
  { id: 'weapons', label: 'Weapons', blurb: 'Prestige-tier hardware with unique premium engineering and perks.' },
  { id: 'armor', label: 'Armor', blurb: 'Exclusive armor sets and finishes that set your Marine apart.' },
  { id: 'levels', label: 'Levels', blurb: 'Seasonal battle passes and bonus mission packs.' },
];

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
      <div className="mx-auto mt-2 flex w-full max-w-lg flex-1 flex-col items-center justify-center rounded-xl border border-[#ffd27a]/20 bg-[#ffd27a]/[0.03] p-8 text-center">
        <p className="text-[14px] tracking-[0.2em] text-[#ffd27a]/90 sm:text-[18px]">{active.label.toUpperCase()}</p>
        <p className="mt-3 max-w-sm text-[8px] leading-relaxed text-white/50 sm:text-[9px]">{active.blurb}</p>
        <p className="mt-5 rounded-full border border-white/15 px-4 py-1.5 text-[7px] uppercase tracking-[0.25em] text-white/40">🔒 Coming soon</p>
      </div>
    </div>
  );
}
