'use client';

/**
 * COMPONENTS — a read-only library of the parts/pieces a player has PURCHASED.
 *  • weapon mode: the owned engineering parts for one gun, grouped by category.
 *  • armor  mode: the owned armor pieces across the Marine, grouped by slot.
 * Rendered as a full-screen overlay from the loadout/marine previews.
 */
import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { loadArsenal } from '../fps/arsenal/store';
import { partById, type EngPart, type Tier } from '../fps/arsenal/parts';
import { categoriesForFamily } from '../fps/arsenal/categories';
import { gunById } from '../fps/weapons';
import { loadMarine } from '../fps/marine/store';
import { generateArmor, type ArmorPiece, type ArmorTier } from '../fps/marine/parts';
import { ARMOR_SLOTS } from '../fps/marine/slots';
import { divisionSlots } from '../fps/marine/divisions';

const TIER_COLOR: Record<string, string> = { military: '#9fb4ff', standard: '#9fb4ff', prototype: '#c8a8ff', legendary: '#ffd27a' };

function Row({ name, tier, accent, stats }: { name: string; tier: Tier | ArmorTier; accent: string; stats: [string, number][] }) {
  return (
    <div className="flex items-center justify-between rounded border border-white/10 bg-white/[0.02] px-2 py-1.5">
      <span className="flex-1 truncate text-[8px] text-white/85">{name}</span>
      <span className="ml-2 flex gap-2">
        {stats.map(([k, v]) => (
          <span key={k} className="text-[6px]" style={{ color: v >= 0 ? '#aef5c8' : '#ff9aa6' }}>
            {k} {v >= 0 ? '+' : ''}{Math.round(v * 100)}%
          </span>
        ))}
        <span className="text-[6px] uppercase" style={{ color: accent }}>{tier}</span>
      </span>
    </div>
  );
}

export function ComponentsView(props: ({ mode: 'weapon'; gunId: string } | { mode: 'armor' }) & { onBack: () => void }) {
  const groups = useMemo(() => {
    if (props.mode === 'weapon') {
      const save = loadArsenal();
      const gun = gunById(props.gunId);
      const out: { label: string; items: EngPart[] }[] = [];
      for (const cat of categoriesForFamily(gun.family)) {
        const parts: EngPart[] = [];
        for (const id of save.owned) {
          const p = partById(id);
          if (p && p.weaponId === props.gunId && p.category === cat.id) parts.push(p);
        }
        if (parts.length) out.push({ label: cat.label, items: parts });
      }
      return { title: `COMPONENTS · ${gun.name}`, sections: out };
    }
    const save = loadMarine();
    const owned = new Set(save.owned);
    const slots = [...ARMOR_SLOTS, ...divisionSlots(save.division)];
    const out: { label: string; items: ArmorPiece[] }[] = [];
    for (const slot of slots) {
      const pieces = generateArmor(slot.id).filter((p) => owned.has(p.id));
      if (pieces.length) out.push({ label: slot.label, items: pieces });
    }
    return { title: 'ARMORY COMPONENTS', sections: out };
  }, [props]);

  const empty = groups.sections.length === 0;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[95] flex flex-col gap-2 overflow-auto bg-black/95 px-4 py-4 font-pixel" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-[#7fdfff] sm:text-[14px]">{groups.title}</p>
        <button type="button" onClick={props.onBack} className="rounded border border-white/20 px-3 py-1.5 text-[9px] uppercase text-white/70 hover:bg-white/10">◂ Back</button>
      </div>
      {empty ? (
        <p className="mt-8 text-center text-[9px] text-white/40">No components purchased yet.</p>
      ) : (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3">
          {groups.sections.map((sec) => (
            <div key={sec.label}>
              <p className="mb-1 text-[7px] tracking-[0.2em] text-white/45">{sec.label.toUpperCase()}</p>
              <div className="flex flex-col gap-1">
                {sec.items.map((it) => (
                  <Row
                    key={it.id}
                    name={it.name}
                    tier={it.tier}
                    accent={TIER_COLOR[it.tier] ?? '#9fb4ff'}
                    stats={Object.entries(it.stats).filter(([, v]) => typeof v === 'number') as [string, number][]}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
