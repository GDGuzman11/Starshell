'use client';

/**
 * PREMIUM TAB — the AstroDiamond storefront. Holds every premium-tier gun (moved out of
 * the Gold Store): grouped SECTION (Primary / Heavy / Secondary) → TYPE, shown as lit
 * thumbnail cards. Clicking a card ENLARGES it (PremiumInspect: bloomed 3D preview on a lit
 * backdrop, drag to rotate) with an AstroDiamond BUY. Buying unlocks the gun (shared arsenal
 * save) so it appears in the loadout.
 */
import { useEffect, useMemo, useState } from 'react';
import { GUNS, CATEGORY_LABEL, SECTION_LABEL, type GunDef, type WeaponSection, type WeaponCategory } from '../fps/weapons';
import { PremiumInspect } from './PremiumInspect';
import { weaponThumb, disposeWeaponThumbRenderer } from './weaponThumb';
import { loadArsenal, saveArsenal, isWeaponUnlocked, unlockWeapon, type ArsenalSave } from '../fps/arsenal/store';
import { weaponStorePrice } from '../fps/arsenal/economy';

const SECTION_ORDER: WeaponSection[] = ['primary', 'heavy', 'secondary'];
const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

function WeaponCard({ gun, owned, onOpen }: { gun: GunDef; owned: boolean; onOpen: () => void }) {
  const thumb = useMemo(() => weaponThumb(gun.id), [gun.id]);
  const accent = hex(gun.color);
  const price = weaponStorePrice(gun);
  return (
    <button type="button" onClick={onOpen} className="group flex flex-col rounded-lg border border-white/10 bg-white/[0.03] p-2 text-left transition-colors hover:border-white/25 hover:bg-white/[0.06]">
      <div className="relative h-24 w-full overflow-hidden rounded-md bg-gradient-to-b from-[#1a2330] to-[#080c12] sm:h-28">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt={gun.name} className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-110" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[7px] text-white/30">rendering…</div>
        )}
        <span className="pointer-events-none absolute right-1 top-1 text-[8px] text-white/40 opacity-0 transition-opacity group-hover:opacity-100">⤢</span>
        {owned ? (
          <span className="absolute left-1 top-1 rounded bg-[#63ff84]/20 px-1 text-[6px] text-[#63ff84]">✓</span>
        ) : (
          <span className="absolute bottom-1 right-1 rounded bg-black/50 px-1 text-[6px] text-[#c8a8ff]">◈{price.amount}</span>
        )}
      </div>
      <p className="mt-1.5 truncate text-[8px]" style={{ color: accent }}>{gun.name}</p>
      <div className="mt-1 grid grid-cols-4 gap-1 text-center">
        {[['PWR', gun.dmg], ['RATE', gun.rate], ['MAG', gun.mag], ['RLD', `${gun.reload}s`]].map(([l, v]) => (
          <div key={l as string}>
            <p className="text-[7px] text-white/85">{v}</p>
            <p className="text-[4px] tracking-[0.1em] text-white/35">{l}</p>
          </div>
        ))}
      </div>
    </button>
  );
}

export function FpsPremium({ astro, onSpend, onBack }: { astro: number; onSpend: (n: number) => void; onBack: () => void }) {
  const [save, setSave] = useState<ArsenalSave>(() => loadArsenal());
  const [inspect, setInspect] = useState<GunDef | null>(null);

  const premium = useMemo(() => GUNS.filter((g) => g.tier === 'premium'), []);
  // SECTION → CATEGORY → guns.
  const bySection = useMemo(() => {
    const m = new Map<WeaponSection, Map<WeaponCategory, GunDef[]>>();
    for (const g of premium) {
      let cat = m.get(g.section);
      if (!cat) m.set(g.section, (cat = new Map()));
      const list = cat.get(g.category) ?? [];
      list.push(g);
      cat.set(g.category, list);
    }
    return m;
  }, [premium]);

  const sections = SECTION_ORDER.filter((s) => bySection.has(s));
  const [section, setSection] = useState<WeaponSection>(sections[0] ?? 'primary');
  const cats = useMemo(() => [...(bySection.get(section)?.keys() ?? [])], [bySection, section]);
  const [type, setType] = useState<WeaponCategory | null>(null);
  const activeType = type && cats.includes(type) ? type : cats[0] ?? null;
  const guns = activeType ? bySection.get(section)?.get(activeType) ?? [] : [];

  useEffect(() => () => disposeWeaponThumbRenderer(), []);

  const buy = (gun: GunDef) => {
    const price = weaponStorePrice(gun);
    if (isWeaponUnlocked(save, gun.id) || astro < price.amount) return;
    onSpend(price.amount);
    setSave((s) => {
      const n = unlockWeapon(s, gun.id);
      saveArsenal(n);
      return n;
    });
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col gap-3 overflow-auto bg-[#05070c]/97 px-4 py-4 font-pixel">
      <div className="flex items-center justify-between">
        <p className="text-[12px] tracking-[0.2em] text-[#ffd27a] sm:text-[16px]">✦ PREMIUM</p>
        <div className="flex items-center gap-3">
          <span className="text-[9px] text-[#c8a8ff]">◈ {astro}</span>
          <button type="button" onClick={onBack} className="rounded border border-white/20 px-3 py-1.5 text-[9px] uppercase text-white/70 hover:bg-white/10">◂ Back</button>
        </div>
      </div>

      {/* section chips */}
      <div className="flex gap-2">
        {sections.map((s) => (
          <button key={s} type="button" onClick={() => { setSection(s); setType(null); }} className={`rounded-md border px-4 py-1.5 text-[8px] uppercase tracking-[0.15em] transition-colors sm:text-[9px] ${s === section ? 'border-[#ffd27a] bg-[#ffd27a]/15 text-[#ffd27a]' : 'border-white/15 bg-white/[0.03] text-white/55 hover:bg-white/10'}`}>
            {SECTION_LABEL[s]}
          </button>
        ))}
      </div>

      {/* type chips */}
      <div className="flex flex-wrap gap-2">
        {cats.map((c) => (
          <button key={c} type="button" onClick={() => setType(c)} className={`rounded border px-3 py-1 text-[7px] uppercase tracking-[0.1em] transition-colors sm:text-[8px] ${c === activeType ? 'border-white/60 bg-white/10 text-white' : 'border-white/12 bg-white/[0.02] text-white/50 hover:bg-white/10'}`}>
            {CATEGORY_LABEL[c]} <span className="text-white/35">· {bySection.get(section)?.get(c)?.length ?? 0}</span>
          </button>
        ))}
      </div>

      {/* card grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {guns.map((g) => (
          <WeaponCard key={g.id} gun={g} owned={isWeaponUnlocked(save, g.id)} onOpen={() => setInspect(g)} />
        ))}
      </div>

      {inspect && (
        <PremiumInspect
          id={inspect.id}
          name={inspect.name}
          accent={inspect.color}
          code={`${SECTION_LABEL[inspect.section].toUpperCase()} · PREMIUM`}
          stats={{ power: inspect.dmg, rate: inspect.rate, mag: inspect.mag, reload: inspect.reload }}
          philosophy={inspect.tagline}
          buy={{ owned: isWeaponUnlocked(save, inspect.id), currency: 'astro', amount: weaponStorePrice(inspect).amount, canAfford: astro >= weaponStorePrice(inspect).amount, onBuy: () => buy(inspect) }}
          onClose={() => setInspect(null)}
        />
      )}
    </div>
  );
}
