'use client';

/**
 * ARMORY — the Marine's Armor Engineering Bay (the armour twin of FpsArsenal).
 * Browse a body slot's engineering tree (20 Standard / 20 Prototype / 20 Legendary),
 * try each piece on a LIVE rotating Marine before buying, spend AstroDiamonds to
 * permanently own + equip pieces, and read the slot's familiarity + Marine Level.
 * Everything here is permanent (localStorage `starshell.marine`). Prestige-first:
 * pieces give small capped bonuses — the visible evolution is the reward.
 */
import { useMemo, useState } from 'react';
import { MarinePreview } from './MarinePreview';
import { ARMOR_SLOTS, ARMOR_STAT_LABEL, type ArmorSlot, type ArmorStat } from '../fps/marine/slots';
import { DIVISIONS, divisionById, divisionSlots, OUTRIDER } from '../fps/marine/divisions';
import { generateArmor, ARMOR_TIERS, type ArmorPiece, type ArmorTier } from '../fps/marine/parts';
import { statLayers } from '../fps/marine/stats';
import { StatBar } from './StatBar';
import { MANUFACTURERS } from '../fps/arsenal/manufacturers';
import { FAMILIARITY_STAGES, stageProgress } from '../fps/arsenal/familiarity';
import { loadMarine, saveMarine, buyArmor, equipArmor, equippedArmorPieces, pieceXp, type MarineSave } from '../fps/marine/store';
import { emitProgressChanged } from '../lib/progressEvent';

const TIER_LABEL: Record<ArmorTier, string> = { standard: 'STANDARD ISSUE', prototype: 'PROTOTYPE', legendary: 'LEGENDARY' };
const TIER_COLOR: Record<ArmorTier, string> = { standard: '#9fb4ff', prototype: '#c8a8ff', legendary: '#ffd27a' };
const STAT_ORDER: ArmorStat[] = ['armor', 'mobility', 'shield', 'recovery'];
const GROUP_LABEL: Record<ArmorSlot['group'], string> = { plating: 'PLATING', systems: 'SYSTEMS', cosmetic: 'FINISH' };
const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

export function FpsArmory({ astro, onSpend, onBack }: { astro: number; onSpend: (n: number) => void; onBack: () => void }) {
  const [save, setSave] = useState<MarineSave>(() => loadMarine());
  const [slotId, setSlotId] = useState(ARMOR_SLOTS[0].id);
  const [sel, setSel] = useState<ArmorPiece | null>(null); // focused piece (buy/equip)
  const [hover, setHover] = useState<ArmorPiece | null>(null); // transient preview
  const [tryOn, setTryOn] = useState<Record<string, ArmorPiece>>({}); // one try-on per slot
  // Which division's engineering bay to BROWSE (view-only; does not change your real
  // division or the graduation lock). Defaults to your division / Outrider.
  const [browseDiv, setBrowseDiv] = useState<string>(save.division ?? 'outrider');

  // Recruit slots always; the BROWSED division's own engineering slots are appended.
  const slots = useMemo(() => [...ARMOR_SLOTS, ...divisionSlots(browseDiv)], [browseDiv]);
  const slot = slots.find((s) => s.id === slotId) ?? slots[0];
  const div = divisionById(browseDiv);
  const pieces = useMemo(() => generateArmor(slotId), [slotId]);
  const equipped = useMemo(() => equippedArmorPieces(save), [save]);
  const equippedIds = useMemo(() => new Set(equipped.map((p) => p.id)), [equipped]);

  // The preview config = equipped pieces, overridden per-slot by the player's try-ons.
  const previewPieces = useMemo(() => {
    const bySlot = new Map<string, ArmorPiece>();
    for (const p of equipped) bySlot.set(p.slot, p);
    for (const p of Object.values(tryOn)) bySlot.set(p.slot, p);
    return Array.from(bySlot.values());
  }, [equipped, tryOn]);
  const previewIds = useMemo(() => new Set(previewPieces.map((p) => p.id)), [previewPieces]);

  // Bars: division base + what's EQUIPPED (green) + the try-on's extra add (amber).
  const equippedLayers = useMemo(() => statLayers(save.division, equipped), [save.division, equipped]);
  const previewLayers = useMemo(() => statLayers(save.division, previewPieces), [save.division, previewPieces]);

  // Per-slot familiarity: XP the equipped piece has accrued in this slot.
  const slotXp = save.equipped[slotId] ? pieceXp(save, save.equipped[slotId]) : 0;
  const fam = stageProgress(slotXp);

  const owned = (p: ArmorPiece) => save.owned.includes(p.id);
  const locked = (p: ArmorPiece) => p.gate != null && (fam.index < p.gate.familiarity || save.bosses < p.gate.bosses);
  const gateText = (p: ArmorPiece) => (p.gate ? `NEEDS ${FAMILIARITY_STAGES[p.gate.familiarity]} · ${p.gate.bosses} BOSSES` : '');

  const buy = (p: ArmorPiece) => {
    if (owned(p) || locked(p) || astro < p.price) return;
    onSpend(p.price);
    setSave((s) => {
      const next = equipArmor(buyArmor(s, p), p); // buy → auto-equip into its slot
      saveMarine(next);
      return next;
    });
    emitProgressChanged();
  };
  const equip = (p: ArmorPiece) => {
    if (!owned(p)) return;
    setSave((s) => {
      const next = equipArmor(s, p);
      saveMarine(next);
      return next;
    });
    emitProgressChanged();
  };

  const rank = `${(div ?? OUTRIDER).name} · LVL ${save.marineLevel}`;

  return (
    <div className="absolute inset-0 z-40 flex flex-col gap-2 overflow-auto bg-black/90 px-3 py-4 font-pixel">
      {/* header */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-[#7fdfff] sm:text-[15px]">ARMORY · ARMOR ENGINEERING</p>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-[#7fdfff]/30 px-3 py-1 text-[9px] text-[#7fdfff]">◈ {astro}</span>
          <button type="button" onClick={onBack} className="rounded border border-white/20 px-3 py-1.5 text-[9px] uppercase text-white/70 hover:bg-white/10">◂ Back</button>
        </div>
      </div>

      {/* VIEW-DIVISION selector — browse any division's engineering bay (view only; does
          NOT change your real division or the graduation lock). */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
        <span className="shrink-0 text-[7px] tracking-[0.2em] text-white/40">VIEW DIVISION</span>
        {DIVISIONS.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => { setBrowseDiv(d.id); setSlotId(ARMOR_SLOTS[0].id); setSel(null); setHover(null); setTryOn({}); }}
            className={`whitespace-nowrap rounded border px-2.5 py-1 text-[7px] uppercase transition-colors sm:text-[8px] ${d.id === browseDiv ? 'text-black' : 'border-white/15 bg-white/[0.03] text-white/55 hover:bg-white/10'}`}
            style={d.id === browseDiv ? { borderColor: hex(d.accent), backgroundColor: hex(d.accent) } : undefined}
          >
            {d.name}
          </button>
        ))}
      </div>

      {/* slot rack — pick any body slot to engineer */}
      <div className="rounded-lg border border-[#7fdfff]/20 bg-[#7fdfff]/[0.04] p-2">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-[7px] tracking-[0.2em] text-[#7fdfff]/80 sm:text-[8px]">▤ SELECT SLOT — every piece appears on the Marine</p>
          <p className="text-[7px] text-white/50 sm:text-[8px]"><span className="text-white/85">{slot.label}</span> · {GROUP_LABEL[slot.group]}</p>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {slots.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => { setSlotId(s.id); setSel(null); setHover(null); }}
              className={`whitespace-nowrap rounded border px-2.5 py-1.5 text-[7px] uppercase transition-colors sm:text-[8px] ${s.id === slotId ? 'border-[#7fdfff] bg-[#7fdfff]/20 text-[#7fdfff]' : s.division ? 'border-[#c8a8ff]/25 bg-[#c8a8ff]/[0.04] text-white/60 hover:bg-white/10' : 'border-white/15 bg-white/[0.03] text-white/60 hover:bg-white/10'}`}
            >
              {s.label}
              {save.equipped[s.id] && <span className="ml-1 text-[#aef5c8]">✓</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 lg:flex-row">
        {/* left: live Marine + armor stats + focused piece + familiarity */}
        <div className="flex flex-col gap-2 lg:w-[42%]">
          <div className="relative h-56 overflow-hidden rounded-lg border border-white/10 bg-gradient-to-b from-[#4a5568] to-[#26303f] sm:h-72">
            <MarinePreview equipped={previewPieces} previewPiece={hover} divisionId={browseDiv} />
            <p className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 text-[6px] tracking-[0.2em] text-[#7fdfff]/70">{rank}</p>
          </div>

          {/* configured armor — division base (cyan) + equipped armor (green) + the
              live try-on's extra add (amber). RATING reflects division + armor. */}
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
            <div className="mb-1 flex items-center justify-between text-[7px] sm:text-[8px]">
              <span className="text-white/70">DIVISION <span className="text-[#7fdfff]">■</span> ARMOR <span className="text-[#aef5c8]">■</span> ADDS <span className="text-[#ffd27a]">■</span></span>
              <span className="text-[#aef5c8]/80">RATING ◈ {previewLayers.rating}</span>
            </div>
            <div className="flex flex-col gap-1">
              {STAT_ORDER.map((k) => {
                const previewExtra = previewLayers.added[k] - equippedLayers.added[k];
                return (
                  <StatBar
                    key={k}
                    label={ARMOR_STAT_LABEL[k]}
                    base={equippedLayers.base[k]}
                    added={equippedLayers.added[k]}
                    preview={Math.max(0, previewExtra)}
                    previewDown={previewExtra < 0}
                    delta={previewExtra / 100}
                  />
                );
              })}
            </div>
          </div>

          {/* focused piece — buy / equip for real */}
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
              <span className="text-white/70">{slot.label.toUpperCase()} FAMILIARITY</span>
              <span className="text-[#7fdfff]">{fam.stage}</span>
            </div>
            <div className="my-1.5 h-1.5 overflow-hidden rounded bg-white/10">
              <div className="h-full bg-[#7fdfff]" style={{ width: `${Math.round(fam.pct * 100)}%` }} />
            </div>
            <div className="grid grid-cols-3 gap-x-2 gap-y-0.5 text-[6px] text-white/45 sm:text-[7px]">
              <span>MARINE LVL {save.marineLevel}</span>
              <span>BOSSES {save.bosses}</span>
              <span>OWNED {save.owned.length}</span>
              <span>EQUIPPED {equipped.length}/{slots.length}</span>
              <span>NEXT {fam.next ?? 'MAX'}</span>
            </div>
          </div>
        </div>

        {/* right: tiered piece list for the active slot */}
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-2 overflow-y-auto pr-1" style={{ maxHeight: '58vh' }}>
            {ARMOR_TIERS.map((tier) => (
              <div key={tier}>
                <p className="mb-1 text-[7px] tracking-[0.2em]" style={{ color: TIER_COLOR[tier] }}>{TIER_LABEL[tier]}</p>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {pieces.filter((p) => p.tier === tier).map((p) => {
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
                        onClick={() => { setSel(p); setTryOn((prev) => ({ ...prev, [p.slot]: p })); }}
                        className={`rounded border p-1.5 text-left transition-colors ${previewIds.has(p.id) ? 'border-[#aef5c8]/70 bg-[#aef5c8]/[0.06]' : sel?.id === p.id ? 'border-white/50 bg-white/[0.06]' : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'} ${isLocked && !isOwned ? 'opacity-55' : ''}`}
                      >
                        <div className="flex items-center gap-1">
                          <span className="inline-block h-2 w-2 rounded-sm" style={{ background: hex(man.accent) }} />
                          <span className="flex-1 truncate text-[7px] text-white/85 sm:text-[8px]">{p.name}</span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap gap-x-2 text-[6px]">
                          {p.cosmetic ? (
                            <span className="text-white/45">COSMETIC</span>
                          ) : (
                            Object.entries(p.stats).map(([k, v]) => (
                              <span key={k} style={{ color: (v ?? 0) >= 0 ? '#aef5c8' : '#ff9aa6' }}>
                                {ARMOR_STAT_LABEL[k as ArmorStat]} {(v ?? 0) >= 0 ? '+' : ''}{Math.round((v ?? 0) * 100)}%
                              </span>
                            ))
                          )}
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
