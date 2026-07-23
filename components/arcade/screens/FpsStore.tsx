'use client';

/**
 * THE OUTLANDER STORE — buy weapons beyond your 10 starters. Organized by OWNER →
 * SECTION (Primary / Heavy / Secondary) → TYPE (Assault / Alien / MG / Sniper / RPG /
 * Handgun). Free-tier guns cost persistent GOLD; premium-tier guns cost AstroDiamonds.
 * Buying permanently unlocks the gun (shared arsenal save), so it then appears in the
 * loadout. A single 3D preview shows the focused gun (colour-matched, animated lights).
 */
import { useMemo, useState } from 'react';
import { GUNS, CATEGORY_LABEL, SECTION_LABEL, type GunDef, type WeaponSection, type WeaponCategory } from '../fps/weapons';
import { GunPreview } from './GunPreview';
import { loadArsenal, saveArsenal, isWeaponUnlocked, unlockWeapon, type ArsenalSave } from '../fps/arsenal/store';
import { weaponStorePrice } from '../fps/arsenal/economy';

const SECTION_ORDER: WeaponSection[] = ['primary', 'heavy', 'secondary'];
const OWNER_LABEL: Record<string, string> = { outlander: 'OUTLANDER' };

export function FpsStore({ gold, astro, onSpendGold, onSpendAstro, onBack }: {
  gold: number;
  astro: number;
  onSpendGold: (n: number) => void;
  onSpendAstro: (n: number) => void;
  onBack: () => void;
}) {
  const [save, setSave] = useState<ArsenalSave>(() => loadArsenal());
  // The Store sells the FREE (Gold) roster; premium (AstroDiamond) guns live in the Premium tab.
  const STORE_GUNS = useMemo(() => GUNS.filter((g) => g.tier === 'free'), []);
  const [focus, setFocus] = useState<string>(STORE_GUNS[0]?.id ?? GUNS[0]?.id ?? '');

  const fg = GUNS.find((g) => g.id === focus) ?? GUNS[0];
  const owned = fg ? isWeaponUnlocked(save, fg.id) : false;
  const price = fg ? weaponStorePrice(fg) : null;
  const canAfford = price ? (price.currency === 'gold' ? gold >= price.amount : astro >= price.amount) : false;

  const buy = () => {
    if (!fg || owned || !price || !canAfford) return;
    if (price.currency === 'gold') onSpendGold(price.amount);
    else onSpendAstro(price.amount);
    setSave((s) => {
      const n = unlockWeapon(s, fg.id);
      saveArsenal(n);
      return n;
    });
  };

  // OWNER → SECTION → CATEGORY → guns.
  const owners = useMemo(() => {
    const byOwner = new Map<string, Map<WeaponSection, Map<WeaponCategory, GunDef[]>>>();
    for (const g of STORE_GUNS) {
      let sec = byOwner.get(g.owner);
      if (!sec) byOwner.set(g.owner, (sec = new Map()));
      let cat = sec.get(g.section);
      if (!cat) sec.set(g.section, (cat = new Map()));
      const list = cat.get(g.category) ?? [];
      list.push(g);
      cat.set(g.category, list);
    }
    return byOwner;
  }, [STORE_GUNS]);

  const cur = (c: 'gold' | 'astro') => (c === 'gold' ? '⛀' : '◈');

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-black/90 px-3 py-2 sm:px-5 sm:py-3">
      <div className="flex items-center justify-between">
        <p className="font-pixel text-[10px] tracking-[0.2em] text-[#7fdfff] sm:text-[13px]">⛁ STORE</p>
        <div className="flex items-center gap-3">
          <span className="font-pixel text-[8px] text-[#ffd27a] sm:text-[10px]">⛀ {gold}</span>
          <span className="font-pixel text-[8px] text-[#c8a8ff] sm:text-[10px]">◈ {astro}</span>
          <button type="button" onClick={onBack} className="font-pixel text-[8px] text-white/45 hover:text-white sm:text-[9px]">◂ BACK</button>
        </div>
      </div>

      <div className="mt-2 flex min-h-0 flex-1 gap-3">
        {/* preview + buy */}
        <div className="flex w-[40%] shrink-0 flex-col sm:w-[42%]">
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-md border border-white/10 bg-gradient-to-b from-[#3a4453] to-[#20272f]">
            {fg && <GunPreview gunId={fg.id} />}
            {fg && (
              <div className="pointer-events-none absolute bottom-1 left-2">
                <p className="font-pixel text-[9px] text-white sm:text-[12px]">{fg.name}</p>
                <p className="font-pixel text-[6px] uppercase text-white/45 sm:text-[8px]">{CATEGORY_LABEL[fg.category]}{fg.caliber ? ` · ${fg.caliber}` : ''}</p>
              </div>
            )}
          </div>
          {fg && (
            <div className="mt-1.5 shrink-0 rounded-md border border-white/10 bg-white/[0.03] p-2">
              {fg.tagline && <p className="mb-1 font-pixel text-[7px] italic text-white/45">“{fg.tagline}”</p>}
              <div className="mb-1.5 flex flex-wrap gap-x-3 gap-y-0.5 font-pixel text-[7px] uppercase tracking-[0.1em] text-white/50">
                <span>PWR {fg.dmg}</span><span>MAG {fg.mag}</span><span>RLD {fg.reload}s</span>
                <span className={fg.tier === 'premium' ? 'text-[#ffd27a]' : 'text-[#7fdfff]'}>{fg.tier.toUpperCase()}</span>
              </div>
              {owned ? (
                <div className="rounded border border-[#63ff84]/40 bg-[#63ff84]/10 py-1.5 text-center font-pixel text-[9px] uppercase tracking-[0.15em] text-[#63ff84]">✓ Owned</div>
              ) : price ? (
                <button type="button" onClick={buy} disabled={!canAfford} className={`w-full rounded border py-1.5 text-center font-pixel text-[9px] uppercase tracking-[0.15em] transition-colors ${canAfford ? (price.currency === 'gold' ? 'border-[#ffd27a]/50 bg-[#ffd27a]/10 text-[#ffd27a] hover:bg-[#ffd27a]/20' : 'border-[#c8a8ff]/50 bg-[#c8a8ff]/10 text-[#c8a8ff] hover:bg-[#c8a8ff]/20') : 'cursor-not-allowed border-white/10 bg-white/[0.02] text-white/30'}`}>
                  {canAfford ? `BUY · ${cur(price.currency)} ${price.amount}` : `${cur(price.currency)} ${price.amount} — NOT ENOUGH`}
                </button>
              ) : null}
            </div>
          )}
        </div>

        {/* grouped catalogue */}
        <div className="min-h-0 flex-1 overflow-y-auto rounded-md border border-white/10 bg-white/[0.02] p-2">
          {[...owners.entries()].map(([owner, sections]) => (
            <div key={owner} className="mb-2">
              <p className="mb-1 font-pixel text-[9px] tracking-[0.2em] text-[#7fdfff]">{OWNER_LABEL[owner] ?? owner.toUpperCase()}</p>
              {SECTION_ORDER.filter((s) => sections.has(s)).map((section) => (
                <div key={section} className="mb-1.5">
                  <p className="mb-0.5 font-pixel text-[7px] uppercase tracking-[0.2em] text-white/40">{SECTION_LABEL[section]}</p>
                  {[...(sections.get(section)?.entries() ?? [])].map(([category, guns]) => (
                    <div key={category} className="mb-1">
                      <p className="font-pixel text-[6px] uppercase tracking-[0.15em] text-white/30">{CATEGORY_LABEL[category]}</p>
                      <div className="mt-0.5 grid grid-cols-1 gap-0.5 sm:grid-cols-2">
                        {guns.map((g) => {
                          const o = isWeaponUnlocked(save, g.id);
                          const p = weaponStorePrice(g);
                          const active = g.id === focus;
                          return (
                            <button key={g.id} type="button" onClick={() => setFocus(g.id)} className={`flex items-center justify-between rounded border px-2 py-1 text-left ${active ? 'border-[#7fdfff]/60 bg-[#7fdfff]/10' : 'border-white/8 bg-white/[0.02] hover:bg-white/[0.05]'}`}>
                              <span className="flex items-center gap-1.5 truncate">
                                <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: `#${g.color.toString(16).padStart(6, '0')}` }} />
                                <span className="truncate font-pixel text-[8px] text-white/85">{g.name}</span>
                              </span>
                              {o ? (
                                <span className="shrink-0 font-pixel text-[7px] text-[#63ff84]">✓</span>
                              ) : (
                                <span className={`shrink-0 font-pixel text-[7px] ${p.currency === 'gold' ? 'text-[#ffd27a]' : 'text-[#c8a8ff]'}`}>{cur(p.currency)}{p.amount}</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
