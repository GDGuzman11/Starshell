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
import { loadMarine } from '../fps/marine/store';
import { isWeaponForDivision, weaponDivision } from '../fps/gen/registry';
import { categoriesForFamily } from '../fps/arsenal/categories';
import { partsForCategory, applyEngineering, TIERS, type EngPart, type Tier } from '../fps/arsenal/parts';
import { MANUFACTURERS } from '../fps/arsenal/manufacturers';
import { stageProgress } from '../fps/arsenal/familiarity';
import { loadArsenal, saveArsenal, buyPart, equipPart, equippedParts, serviceFor, type ArsenalSave } from '../fps/arsenal/store';
import { emitProgressChanged } from '../lib/progressEvent';
import { hasSlots } from '../fps/arsenal/partModel';

const TIER_LABEL: Record<Tier, string> = { military: 'MILITARY ISSUE', prototype: 'PROTOTYPE', legendary: 'LEGENDARY' };
const TIER_COLOR: Record<Tier, string> = { military: '#9fb4ff', prototype: '#c8a8ff', legendary: '#ffd27a' };
const STAT_LABEL: Record<string, string> = { dmg: 'DMG', rate: 'RATE', mag: 'MAG', reload: 'RELOAD', handling: 'HANDLING' };
const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
const DMG_MAX = Math.max(...GUNS.map((g) => g.dmg));
const MAG_MAX = Math.max(...GUNS.map((g) => g.mag));
const RELOAD_MIN = Math.min(...GUNS.map((g) => g.reload));
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export function FpsArsenal({ astro, onSpend, onBack }: { astro: number; onSpend: (n: number) => void; onBack: () => void }) {
  const [save, setSave] = useState<ArsenalSave>(() => loadArsenal());
  const bosses = save.bosses;
  // Division-tagged generated weapons only show for that division (untagged = universal).
  const marineDiv = useMemo(() => loadMarine().division ?? 'outrider', []);
  const guns = useMemo(() => GUNS.filter((g) => isWeaponForDivision(g.id, marineDiv)), [marineDiv]);
  const [weaponId, setWeaponId] = useState('ar01');
  const gun = gunById(weaponId);
  const cats = categoriesForFamily(gun.family);
  const [catId, setCatId] = useState(cats[0].id);
  const [sel, setSel] = useState<EngPart | null>(null); // focused component (for buy/equip)
  const [hover, setHover] = useState<EngPart | null>(null); // transient preview
  const [previewSel, setPreviewSel] = useState<Record<string, EngPart>>({}); // one try-on part per category

  const activeCat = cats.find((c) => c.id === catId) ?? cats[0];
  const parts = useMemo(() => partsForCategory(weaponId, gun.family, activeCat.id), [weaponId, gun.family, activeCat.id]);
  const equipped = useMemo(() => equippedParts(save, weaponId, gun.family), [save, weaponId, gun.family]);
  const equippedIds = useMemo(() => new Set(equipped.map((p) => p.id)), [equipped]);
  // The preview config = equipped parts, overridden per-category by the player's try-on
  // selections. This is what the 3D model + stat bars reflect (build a full gun visually).
  const previewParts = useMemo(() => {
    const byCat = new Map<string, EngPart>();
    for (const p of equipped) byCat.set(p.category, p);
    for (const p of Object.values(previewSel)) byCat.set(p.category, p);
    return Array.from(byCat.values());
  }, [equipped, previewSel]);
  const previewIds = useMemo(() => new Set(previewParts.map((p) => p.id)), [previewParts]);
  const enh = applyEngineering(gun, previewParts);
  const rec = serviceFor(save, weaponId);
  const fam = stageProgress(rec.xp);

  const pick = (id: string) => {
    setWeaponId(id);
    const c = categoriesForFamily(gunById(id).family);
    setCatId(c[0].id);
    setSel(null);
    setHover(null);
    setPreviewSel({});
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
    emitProgressChanged();
  };
  const equip = (p: EngPart) => {
    if (!owned(p)) return;
    setSave((s) => {
      const next = equipPart(s, p);
      saveArsenal(next);
      return next;
    });
    emitProgressChanged();
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
          {guns.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => pick(g.id)}
              className={`whitespace-nowrap rounded border px-2.5 py-1.5 text-[7px] uppercase transition-colors sm:text-[8px] ${g.id === weaponId ? 'border-[#c8a8ff] bg-[#c8a8ff]/20 text-[#c8a8ff]' : 'border-white/15 bg-white/[0.03] text-white/60 hover:bg-white/10'}`}
            >
              {g.name}
              {hasSlots(g.id) && <span className="ml-1 text-[#aef5c8]">◆</span>}
              {weaponDivision(g.id) && <span className="ml-1 text-[#ffd27a]">⬡</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 lg:flex-row">
        {/* left: live preview + familiarity + service record */}
        <div className="flex flex-col gap-2 lg:w-[42%]">
          <div className="relative h-52 overflow-hidden rounded-lg border border-white/10 bg-gradient-to-b from-[#4a5568] to-[#26303f] sm:h-64">
            <GunPreview gunId={weaponId} equipped={previewParts} previewPart={hover} />
            {!hasSlots(weaponId) && <p className="absolute bottom-1 left-0 right-0 text-center text-[6px] text-white/35">visible attachment coming to this weapon</p>}
          </div>

          {/* configured stats — base + component enhancement (what the parts do to the gun) */}
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
            <div className="mb-1 flex items-center justify-between text-[7px] sm:text-[8px]">
              <span className="text-white/70">CONFIGURED STATS</span>
              <span className="text-[#aef5c8]/80">{Object.keys(previewSel).length}/{cats.length} components</span>
            </div>
            <StatRow label="POWER" basePct={Math.sqrt(gun.dmg / DMG_MAX)} enhPct={Math.sqrt(enh.dmg / DMG_MAX)} value={`${enh.dmg}`} delta={enh.dmg - gun.dmg} color="#ff5d6e" />
            <StatRow label="MAG" basePct={gun.mag / MAG_MAX} enhPct={enh.mag / MAG_MAX} value={`${enh.mag}`} delta={enh.mag - gun.mag} color="#7fdfff" />
            <StatRow label="RELOAD" basePct={RELOAD_MIN / gun.reload} enhPct={RELOAD_MIN / enh.reload} value={`${enh.reload}s`} delta={gun.reload - enh.reload} color="#7ad0ff" unit="s" />
          </div>

          {/* focused component — buy / equip it for real */}
          {sel && (
            <div className="rounded-lg border p-2" style={{ borderColor: `${hex(MANUFACTURERS[sel.manufacturer].accent)}55` }}>
              <p className="truncate text-[8px] text-white/85">{sel.name}</p>
              <p className="text-[6px] uppercase text-white/40">{MANUFACTURERS[sel.manufacturer].name} · {sel.tier}</p>
              <button
                type="button"
                onClick={() => { if (equippedIds.has(sel.id)) return; if (owned(sel)) equip(sel); else buy(sel); }}
                disabled={equippedIds.has(sel.id) || (!owned(sel) && (locked(sel) || astro < sel.price))}
                className="mt-1.5 w-full rounded border border-[#aef5c8]/40 bg-[#aef5c8]/10 py-1 text-[7px] uppercase text-[#aef5c8] transition-colors hover:bg-[#aef5c8]/20 disabled:cursor-not-allowed disabled:opacity-40 sm:text-[8px]"
              >
                {equippedIds.has(sel.id) ? 'EQUIPPED ✓' : owned(sel) ? 'EQUIP' : locked(sel) ? `🔒 ${gateText(sel)}` : `BUY & EQUIP · ◈${sel.price}${astro < sel.price ? ' (SHORT)' : ''}`}
              </button>
            </div>
          )}
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
                onClick={() => { setCatId(c.id); setSel(null); setHover(null); }}
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
                        onMouseEnter={() => setHover(p)}
                        onMouseLeave={() => setHover(null)}
                        onFocus={() => setHover(p)}
                        onClick={() => {
                          setSel(p);
                          setPreviewSel((prev) => ({ ...prev, [p.category]: p })); // try it on (persists in the preview)
                        }}
                        className={`rounded border p-1.5 text-left transition-colors ${previewIds.has(p.id) ? 'border-[#aef5c8]/70 bg-[#aef5c8]/[0.06]' : sel?.id === p.id ? 'border-white/50 bg-white/[0.06]' : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'} ${isLocked && !isOwned ? 'opacity-55' : ''}`}
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
                          ) : previewIds.has(p.id) ? (
                            <span className="text-[#aef5c8]/80">◆ PREVIEWING</span>
                          ) : isOwned ? (
                            <span className="text-[#7fdfff]">OWNED</span>
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

/** A stat bar: base value in `color`, with the component enhancement as a bright-green
 *  EXTENSION on the same track (dim segment if a tradeoff reduced it). */
function StatRow({ label, basePct, enhPct, value, delta, color, unit }: { label: string; basePct: number; enhPct: number; value: string; delta: number; color: string; unit?: string }) {
  const base = clamp01(basePct);
  const e = clamp01(enhPct);
  const lo = Math.min(base, e);
  const ext = Math.max(0, e - base);
  const down = e < base - 0.001;
  const improved = delta > 0.0001;
  const worse = delta < -0.0001;
  const dTxt = unit === 's' ? (improved ? `-${delta.toFixed(2)}s` : worse ? `+${Math.abs(delta).toFixed(2)}s` : '') : improved ? `+${Math.round(delta)}` : worse ? `${Math.round(delta)}` : '';
  return (
    <div className="mt-0.5 flex items-center gap-2 font-pixel">
      <span className="w-12 shrink-0 text-[6px] uppercase text-white/45 sm:text-[7px]">{label}</span>
      <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
        <div className="h-full transition-[width] duration-300" style={{ width: `${lo * 100}%`, backgroundColor: down ? '#8a8f9a' : color }} />
        {ext > 0 && <div className="h-full transition-[width] duration-300" style={{ width: `${ext * 100}%`, backgroundColor: '#aef5c8' }} />}
      </div>
      <span className="w-16 shrink-0 text-right text-[7px] text-white sm:text-[8px]">
        {value}
        {dTxt && <span className={improved ? 'text-[#aef5c8]' : 'text-[#ff9aa6]'}> {dTxt}</span>}
      </span>
    </div>
  );
}
