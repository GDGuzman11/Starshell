'use client';

/**
 * ARSENAL — the Engineering Bay. Browse a weapon's engineering tree (5 categories ×
 * Military/Prototype/Legendary), see each part LIVE-attached on a rotating 3D preview
 * before buying, spend AstroDiamonds to permanently own + equip parts, and read the
 * weapon's Service Record + Familiarity. Everything here is permanent (localStorage).
 * Gold's per-run upgrades live elsewhere — this is the forever layer.
 */
import { useMemo, useState } from 'react';
import { GunPreview } from './GunPreview';
import { GUNS, gunById } from '../fps/weapons';
import { categoriesForFamily } from '../fps/arsenal/categories';
import { partsForCategory, TIERS, type EngPart, type Tier } from '../fps/arsenal/parts';
import { MANUFACTURERS } from '../fps/arsenal/manufacturers';
import { stageProgress } from '../fps/arsenal/familiarity';
import { loadArsenal, saveArsenal, buyPart, equipPart, equippedParts, serviceFor, type ArsenalSave } from '../fps/arsenal/store';
import { hasSlots } from '../fps/arsenal/partModel';

const TIER_LABEL: Record<Tier, string> = { military: 'MILITARY ISSUE', prototype: 'PROTOTYPE', legendary: 'LEGENDARY' };
const TIER_COLOR: Record<Tier, string> = { military: '#9fb4ff', prototype: '#c8a8ff', legendary: '#ffd27a' };
const STAT_LABEL: Record<string, string> = { dmg: 'DMG', rate: 'RATE', mag: 'MAG', reload: 'RELOAD', handling: 'HANDLING' };
const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

export function FpsArsenal({ astro, onSpend, onBack }: { astro: number; onSpend: (n: number) => void; onBack: () => void }) {
  const [save, setSave] = useState<ArsenalSave>(() => loadArsenal());
  const bosses = save.bosses;
  const [weaponId, setWeaponId] = useState('ar01');
  const gun = gunById(weaponId);
  const cats = categoriesForFamily(gun.family);
  const [catId, setCatId] = useState(cats[0].id);
  const [sel, setSel] = useState<EngPart | null>(null);

  const activeCat = cats.find((c) => c.id === catId) ?? cats[0];
  const parts = useMemo(() => partsForCategory(weaponId, gun.family, activeCat.id), [weaponId, gun.family, activeCat.id]);
  const equipped = useMemo(() => equippedParts(save, weaponId, gun.family), [save, weaponId, gun.family]);
  const equippedIds = useMemo(() => new Set(equipped.map((p) => p.id)), [equipped]);
  const rec = serviceFor(save, weaponId);
  const fam = stageProgress(rec.xp);

  const pick = (id: string) => {
    setWeaponId(id);
    const c = categoriesForFamily(gunById(id).family);
    setCatId(c[0].id);
    setSel(null);
  };
  const owned = (p: EngPart) => save.owned.includes(p.id);
  const locked = (p: EngPart) => p.gate != null && (fam.index < p.gate.familiarity || bosses < p.gate.bosses);
  const gateText = (p: EngPart) => (p.gate ? `NEEDS ${['Recruit', 'Field Tested', 'Combat Ready', 'Veteran', 'Elite', 'Prototype', 'Legendary'][p.gate.familiarity]} · ${p.gate.bosses} BOSSES` : '');

  const buy = (p: EngPart) => {
    if (owned(p) || locked(p) || astro < p.price) return;
    onSpend(p.price);
    setSave((s) => {
      const next = equipPart(buyPart(s, p), p); // buy → auto-equip into its slot
      saveArsenal(next);
      return next;
    });
  };
  const equip = (p: EngPart) => {
    if (!owned(p)) return;
    setSave((s) => {
      const next = equipPart(s, p);
      saveArsenal(next);
      return next;
    });
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col gap-2 overflow-auto bg-black/90 px-3 py-4 font-pixel">
      {/* header */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-[#c8a8ff] sm:text-[15px]">ARSENAL · ENGINEERING BAY</p>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-[#c8a8ff]/30 px-3 py-1 text-[9px] text-[#c8a8ff]">◈ {astro}</span>
          <button type="button" onClick={onBack} className="rounded border border-white/20 px-3 py-1.5 text-[9px] uppercase text-white/70 hover:bg-white/10">◂ Back</button>
        </div>
      </div>

      {/* weapon rack — pick ANY weapon to engineer its own components */}
      <div className="rounded-lg border border-[#c8a8ff]/20 bg-[#c8a8ff]/[0.04] p-2">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-[7px] tracking-[0.2em] text-[#c8a8ff]/80 sm:text-[8px]">▤ SELECT WEAPON — engineer any gun</p>
          <p className="text-[7px] text-white/50 sm:text-[8px]">
            <span className="text-white/85">{gun.name}</span> · {gun.family}
          </p>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {GUNS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => pick(g.id)}
              className={`whitespace-nowrap rounded border px-2.5 py-1.5 text-[7px] uppercase transition-colors sm:text-[8px] ${g.id === weaponId ? 'border-[#c8a8ff] bg-[#c8a8ff]/20 text-[#c8a8ff]' : 'border-white/15 bg-white/[0.03] text-white/60 hover:bg-white/10'}`}
            >
              {g.name}
              {hasSlots(g.id) && <span className="ml-1 text-[#aef5c8]">◆</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 lg:flex-row">
        {/* left: live preview + familiarity + service record */}
        <div className="flex flex-col gap-2 lg:w-[42%]">
          <div className="relative h-52 overflow-hidden rounded-lg border border-white/10 bg-gradient-to-b from-[#4a5568] to-[#26303f] sm:h-64">
            <GunPreview gunId={weaponId} equipped={equipped} previewPart={sel} />
            {!hasSlots(weaponId) && <p className="absolute bottom-1 left-0 right-0 text-center text-[6px] text-white/35">visible attachment coming to this weapon</p>}
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
            <div className="flex items-center justify-between text-[8px]">
              <span className="text-white/70">WEAPON FAMILIARITY</span>
              <span className="text-[#c8a8ff]">{fam.stage}</span>
            </div>
            <div className="my-1.5 h-1.5 overflow-hidden rounded bg-white/10">
              <div className="h-full bg-[#c8a8ff]" style={{ width: `${Math.round(fam.pct * 100)}%` }} />
            </div>
            <div className="grid grid-cols-3 gap-x-2 gap-y-0.5 text-[6px] text-white/45 sm:text-[7px]">
              <span>KILLS {rec.kills}</span>
              <span>BOSSES {rec.bossKills}</span>
              <span>OPS {rec.operations}</span>
              <span>PARTS {rec.partsInstalled}</span>
              <span>◈ INVESTED {rec.astroInvested}</span>
              <span>NEXT {fam.next ?? 'MAX'}</span>
            </div>
          </div>
        </div>

        {/* right: category tabs + part list */}
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex flex-wrap gap-1">
            {cats.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => { setCatId(c.id); setSel(null); }}
                className={`rounded border px-2 py-1 text-[7px] uppercase transition-colors sm:text-[8px] ${c.id === catId ? 'border-[#7fdfff] bg-[#7fdfff]/15 text-[#7fdfff]' : 'border-white/12 bg-white/[0.03] text-white/55 hover:bg-white/10'}`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2 overflow-y-auto pr-1" style={{ maxHeight: '46vh' }}>
            {TIERS.map((tier) => (
              <div key={tier}>
                <p className="mb-1 text-[7px] tracking-[0.2em]" style={{ color: TIER_COLOR[tier] }}>{TIER_LABEL[tier]}</p>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {parts.filter((p) => p.tier === tier).map((p) => {
                    const man = MANUFACTURERS[p.manufacturer];
                    const isOwned = owned(p);
                    const isEquipped = equippedIds.has(p.id);
                    const isLocked = locked(p);
                    const afford = astro >= p.price;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onMouseEnter={() => setSel(p)}
                        onFocus={() => setSel(p)}
                        onClick={() => {
                          setSel(p);
                          if (isEquipped) return;
                          if (isOwned) equip(p);
                          else buy(p);
                        }}
                        className={`rounded border p-1.5 text-left transition-colors ${sel?.id === p.id ? 'border-white/50 bg-white/[0.06]' : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'} ${isLocked && !isOwned ? 'opacity-55' : ''}`}
                      >
                        <div className="flex items-center gap-1">
                          <span className="inline-block h-2 w-2 rounded-sm" style={{ background: hex(man.accent) }} />
                          <span className="flex-1 truncate text-[7px] text-white/85 sm:text-[8px]">{p.name}</span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap gap-x-2 text-[6px]">
                          {Object.entries(p.stats).map(([k, v]) => (
                            <span key={k} style={{ color: (v ?? 0) >= 0 ? '#aef5c8' : '#ff9aa6' }}>
                              {STAT_LABEL[k]} {(v ?? 0) >= 0 ? '+' : ''}{Math.round((v ?? 0) * 100)}%
                            </span>
                          ))}
                        </div>
                        <div className="mt-0.5 text-[6px] sm:text-[7px]">
                          {isEquipped ? (
                            <span className="text-[#aef5c8]">EQUIPPED</span>
                          ) : isOwned ? (
                            <span className="text-[#7fdfff]">OWNED · TAP TO EQUIP</span>
                          ) : isLocked ? (
                            <span className="text-[#ff9aa6]">🔒 {gateText(p)}</span>
                          ) : (
                            <span style={{ color: afford ? '#ffd27a' : '#ff9aa6' }}>◈ {p.price}{afford ? '' : ' · SHORT'}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
