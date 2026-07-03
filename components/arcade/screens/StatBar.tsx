'use client';

/**
 * A layered defensive-stat bar (0..100 point scale). Segments stack left→right and are
 * clamped so their sum never exceeds the track:
 *   • base    — the division's identity (cyan)
 *   • added   — what the EQUIPPED armour contributes on top (green)
 *   • preview — an Armory try-on's extra contribution (amber) — "what this piece adds"
 * Used by the avatar panel, the inspect modal, the division info card, and the Armory.
 */
const COLOR = { base: '#7fdfff', added: '#aef5c8', preview: '#ffd27a', down: '#8a8f9a' };
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function StatBar({
  label,
  base,
  added = 0,
  preview = 0,
  previewDown = false,
  delta,
  compact = false,
}: {
  label: string;
  base: number; // division points (0..100)
  added?: number; // equipped-armor points
  preview?: number; // try-on extra points (Armory)
  previewDown?: boolean; // try-on lowers the stat
  delta?: number; // signed % change label (Armory try-on)
  compact?: boolean; // tighter type for the small side panel
}) {
  const b = clamp(base, 0, 100);
  const a = clamp(added, 0, 100 - b);
  const pv = clamp(preview, 0, 100 - b - a);
  const dTxt = delta != null && Math.abs(delta) > 0.0005 ? `${delta > 0 ? '+' : ''}${Math.round(delta * 100)}%` : '';
  return (
    <div className={`flex items-center ${compact ? 'gap-1.5' : 'gap-2'}`}>
      <span className={`shrink-0 uppercase text-white/45 ${compact ? 'w-12 text-[6px]' : 'w-14 text-[6px] sm:text-[7px]'}`}>{label}</span>
      <div className={`flex flex-1 overflow-hidden rounded-full bg-white/10 ${compact ? 'h-1' : 'h-1.5'}`}>
        <div className="h-full transition-[width] duration-300" style={{ width: `${b}%`, backgroundColor: COLOR.base }} />
        {a > 0 && <div className="h-full transition-[width] duration-300" style={{ width: `${a}%`, backgroundColor: COLOR.added }} />}
        {pv > 0 && <div className="h-full transition-[width] duration-300" style={{ width: `${pv}%`, backgroundColor: previewDown ? COLOR.down : COLOR.preview }} />}
      </div>
      {delta != null && (
        <span className={`shrink-0 text-right ${compact ? 'w-8 text-[6px]' : 'w-10 text-[7px]'}`}>
          {dTxt && <span style={{ color: delta >= 0 ? COLOR.added : '#ff9aa6' }}>{dTxt}</span>}
        </span>
      )}
    </div>
  );
}
