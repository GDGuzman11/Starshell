'use client';

/**
 * DIVISION COMPONENTS (info only) — a read-only viewer opened from the Combat Divisions
 * screen. Browse and TRY ON the engineering components of ONE division on its Marine, but
 * nothing can be bought, equipped, or carried out. Shows exclusively that division's own
 * components (Outrider = the Standard-Issue set).
 */
import { useMemo, useState } from 'react';
import { MarinePreview } from './MarinePreview';
import { ARMOR_SLOTS, type ArmorSlot, type ArmorStat, ARMOR_STAT_LABEL } from '../fps/marine/slots';
import { divisionById, divisionSlots } from '../fps/marine/divisions';
import { generateArmor, ARMOR_TIERS, type ArmorPiece, type ArmorTier } from '../fps/marine/parts';
import { MANUFACTURERS } from '../fps/arsenal/manufacturers';

const TIER_LABEL: Record<ArmorTier, string> = { standard: 'STANDARD ISSUE', prototype: 'PROTOTYPE', legendary: 'LEGENDARY' };
const TIER_COLOR: Record<ArmorTier, string> = { standard: '#9fb4ff', prototype: '#c8a8ff', legendary: '#ffd27a' };
const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
const slotsForDiv = (d: string): ArmorSlot[] => (d === 'outrider' ? ARMOR_SLOTS : divisionSlots(d));

export function DivisionComponents({ division, onClose }: { division: string; onClose: () => void }) {
  const slots = useMemo(() => slotsForDiv(division), [division]);
  const [slotId, setSlotId] = useState(slots[0]?.id ?? '');
  const [hover, setHover] = useState<ArmorPiece | null>(null); // transient preview
  const [tryOn, setTryOn] = useState<Record<string, ArmorPiece>>({}); // one try-on per slot
  const slot = slots.find((s) => s.id === slotId) ?? slots[0];
  const pieces = useMemo(() => (slotId ? generateArmor(slotId) : []), [slotId]);
  const div = divisionById(division);
  const accent = div ? hex(div.accent) : '#c8a8ff';

  const previewPieces = useMemo(() => Object.values(tryOn), [tryOn]);
  const tryIds = useMemo(() => new Set(previewPieces.map((p) => p.id)), [previewPieces]);

  return (
    <div className="absolute inset-0 z-50 flex flex-col gap-2 overflow-auto bg-black/95 px-3 py-4 font-pixel">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] sm:text-[14px]" style={{ color: accent }}>{(div?.name ?? 'OUTRIDER')} · COMPONENTS</p>
          <p className="text-[6px] tracking-[0.2em] text-white/40">INFO ONLY · try any piece — nothing here can be bought or carried out</p>
        </div>
        <button type="button" onClick={onClose} className="rounded border border-white/20 px-3 py-1.5 text-[9px] uppercase text-white/70 hover:bg-white/10">◂ Back</button>
      </div>

      {/* slot rack — wraps so every component for the division is visible at once */}
      <div className="flex flex-wrap gap-1.5 pb-0.5">
        {slots.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => { setSlotId(s.id); setHover(null); }}
            className={`whitespace-nowrap rounded border px-2.5 py-1.5 text-[7px] uppercase transition-colors sm:text-[8px] ${s.id === slotId ? 'text-black' : 'border-white/15 bg-white/[0.03] text-white/60 hover:bg-white/10'}`}
            style={s.id === slotId ? { borderColor: accent, backgroundColor: accent } : undefined}
          >
            {s.label}
            {tryOn[s.id] && <span className="ml-1 text-[#aef5c8]">◆</span>}
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col gap-2 lg:flex-row">
        {/* live Marine with the try-ons */}
        <div className="flex flex-col gap-2 lg:w-[42%]">
          <div className="relative h-64 overflow-hidden rounded-lg border border-white/10 bg-gradient-to-b from-[#4a5568] to-[#26303f] sm:h-80">
            <MarinePreview equipped={previewPieces} previewPiece={hover} divisionId={division} />
            <p className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 text-[6px] tracking-[0.2em]" style={{ color: accent }}>{slot?.label}</p>
          </div>
          {Object.keys(tryOn).length > 0 && (
            <button type="button" onClick={() => setTryOn({})} className="rounded border border-white/15 bg-white/[0.03] py-1.5 text-[7px] uppercase tracking-[0.15em] text-white/50 hover:bg-white/10">
              ↺ Reset try-on
            </button>
          )}
        </div>

        {/* tiered piece list — click to try (no buy) */}
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1" style={{ maxHeight: '62vh' }}>
          {ARMOR_TIERS.map((tier) => (
            <div key={tier}>
              <p className="mb-1 text-[7px] tracking-[0.2em]" style={{ color: TIER_COLOR[tier] }}>{TIER_LABEL[tier]}</p>
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {pieces.filter((p) => p.tier === tier).map((p) => {
                  const man = MANUFACTURERS[p.manufacturer];
                  const trying = tryIds.has(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onMouseEnter={() => setHover(p)}
                      onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover(p)}
                      onClick={() => setTryOn((prev) => ({ ...prev, [p.slot]: p }))}
                      className={`rounded border p-1.5 text-left transition-colors ${trying ? 'border-[#aef5c8]/70 bg-[#aef5c8]/[0.06]' : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'}`}
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
                        {trying ? <span className="text-[#aef5c8]">◆ TRYING</span> : <span className="text-white/40">{man.name.split(' ')[0]} · {tier}</span>}
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
  );
}
