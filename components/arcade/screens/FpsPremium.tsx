'use client';

/**
 * PREMIUM STORE — three sections. WEAPONS is a categorized storefront: category chips
 * (Primary / Heavy / Hand Held) → weapon-type chips (Assault Rifles, …) → a grid of small
 * gun cards. Each card is a STATIC 3D thumbnail (zero ongoing WebGL contexts); selecting a
 * gun opens the magnified, auto-spinning, drag-rotatable inspect (same mechanics as the
 * Loadout Preview). Acquisition is LOCKED for now. Armor / Levels stay "coming soon".
 */
import { useEffect, useMemo, useState } from 'react';
import { PremiumInspect } from './PremiumInspect';
import { weaponThumb, disposeWeaponThumbRenderer } from './weaponThumb';
import { PREMIUM_CATEGORIES, typesIn, weaponsIn, type PremiumWeapon, type WeaponCategory } from '../fps/arsenal/premium';

type Tab = 'weapons' | 'armor' | 'levels';
const TABS: { id: Tab; label: string; blurb: string }[] = [
  { id: 'weapons', label: 'Weapons', blurb: 'Prestige-tier hardware with unique premium engineering and perks.' },
  { id: 'armor', label: 'Armor', blurb: 'Exclusive armor sets and finishes that set your Marine apart.' },
  { id: 'levels', label: 'Levels', blurb: 'Seasonal battle passes and bonus mission packs.' },
];
const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

function WeaponCard({ weapon, onOpen }: { weapon: PremiumWeapon; onOpen: () => void }) {
  const thumb = useMemo(() => weaponThumb(weapon.id), [weapon.id]);
  const accent = hex(weapon.accent);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col rounded-lg border border-white/10 bg-white/[0.03] p-2 text-left transition-colors hover:border-white/25 hover:bg-white/[0.06]"
    >
      <div className="relative h-24 w-full overflow-hidden rounded-md bg-gradient-to-b from-[#1a2330] to-[#080c12] sm:h-28">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt={weapon.name} className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-110" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[7px] text-white/30">rendering…</div>
        )}
        <span className="pointer-events-none absolute right-1 top-1 text-[8px] text-white/40 opacity-0 transition-opacity group-hover:opacity-100">⤢</span>
      </div>
      <p className="mt-1.5 truncate text-[8px]" style={{ color: accent }}>{weapon.name}</p>
      <div className="mt-1 grid grid-cols-4 gap-1 text-center">
        {[['PWR', weapon.stats.power], ['RATE', weapon.stats.rate], ['MAG', weapon.stats.mag], ['RLD', `${weapon.stats.reload}s`]].map(([l, v]) => (
          <div key={l as string}>
            <p className="text-[7px] text-white/85">{v}</p>
            <p className="text-[4px] tracking-[0.1em] text-white/35">{l}</p>
          </div>
        ))}
      </div>
    </button>
  );
}

function WeaponsStore() {
  const [category, setCategory] = useState<WeaponCategory>('primary');
  const [type, setType] = useState<string>(() => typesIn('primary')[0] ?? '');
  const [inspect, setInspect] = useState<PremiumWeapon | null>(null);

  const types = useMemo(() => typesIn(category), [category]);
  const activeType = types.includes(type) ? type : types[0] ?? '';
  const weapons = useMemo(() => (activeType ? weaponsIn(category, activeType) : []), [category, activeType]);

  // Free the thumbnail renderer's WebGL context when leaving the store.
  useEffect(() => () => disposeWeaponThumbRenderer(), []);

  const pickCategory = (c: WeaponCategory) => {
    setCategory(c);
    setType(typesIn(c)[0] ?? '');
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* category chips */}
      <div className="flex gap-2">
        {PREMIUM_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => pickCategory(c.id)}
            className={`rounded-md border px-4 py-1.5 text-[8px] uppercase tracking-[0.15em] transition-colors sm:text-[9px] ${c.id === category ? 'border-[#ffd27a] bg-[#ffd27a]/15 text-[#ffd27a]' : 'border-white/15 bg-white/[0.03] text-white/55 hover:bg-white/10'}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {types.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] p-10 text-center">
          <p className="text-[10px] tracking-[0.2em] text-white/50">NO PREMIUM WEAPONS YET</p>
          <p className="mt-3 rounded-full border border-white/15 px-4 py-1.5 text-[7px] uppercase tracking-[0.25em] text-white/40">🔒 Coming soon</p>
        </div>
      ) : (
        <>
          {/* weapon-type chips */}
          <div className="mt-3 flex flex-wrap gap-2">
            {types.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`rounded border px-3 py-1 text-[7px] uppercase tracking-[0.1em] transition-colors sm:text-[8px] ${t === activeType ? 'border-white/60 bg-white/10 text-white' : 'border-white/12 bg-white/[0.02] text-white/50 hover:bg-white/10'}`}
              >
                {t} <span className="text-white/35">· {weaponsIn(category, t).length}</span>
              </button>
            ))}
          </div>

          {/* card grid */}
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {weapons.map((w) => (
              <WeaponCard key={w.id} weapon={w} onOpen={() => setInspect(w)} />
            ))}
          </div>
        </>
      )}

      {inspect && <PremiumInspect weapon={inspect} onClose={() => setInspect(null)} />}
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
          <WeaponsStore />
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
