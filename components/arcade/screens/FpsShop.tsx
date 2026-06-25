'use client';

/** Between-level armory. Ammo + throwables auto-refill; spend gold on armour or
 *  refit your loadout, then advance. */
export function FpsShop({
  level,
  gold,
  maxHp,
  onBuyArmor,
  onRefit,
  onCustomize,
  onNext,
  onExit,
}: {
  level: number;
  gold: number;
  maxHp: number;
  onBuyArmor: () => void;
  onRefit: () => void;
  onCustomize: () => void;
  onNext: () => void;
  onExit: () => void;
}) {
  const ARMOR_COST = 100;
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-black/80 px-4 text-center font-pixel">
      <p className="text-[14px] text-[#aef5c8] sm:text-[18px]">LEVEL {level} CLEAR</p>
      <p className="text-[9px] text-[#ffd27a] sm:text-[11px]">GOLD ⛀ {gold}</p>
      <p className="text-[7px] text-white/45 sm:text-[8px]">AMMO + THROWABLES REFILLED</p>

      <div className="mt-3 flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={onBuyArmor}
          disabled={gold < ARMOR_COST}
          className="min-h-[40px] w-56 rounded-md border border-[#7fdfff]/40 bg-[#7fdfff]/10 px-4 font-pixel text-[9px] uppercase text-[#7fdfff] transition-colors hover:bg-[#7fdfff]/20 disabled:cursor-not-allowed disabled:opacity-30 sm:text-[10px]"
        >
          Armour +25 · {ARMOR_COST}g <span className="text-white/40">(max {maxHp})</span>
        </button>
        <button
          type="button"
          onClick={onCustomize}
          className="min-h-[40px] w-56 rounded-md border border-[#7fdfff]/40 bg-[#7fdfff]/10 px-4 font-pixel text-[9px] uppercase text-[#7fdfff] transition-colors hover:bg-[#7fdfff]/20 sm:text-[10px]"
        >
          Customize Guns
        </button>
        <button
          type="button"
          onClick={onRefit}
          className="min-h-[40px] w-56 rounded-md border border-white/20 bg-white/5 px-4 font-pixel text-[9px] uppercase text-white/75 transition-colors hover:bg-white/10 sm:text-[10px]"
        >
          Refit Loadout
        </button>
      </div>

      <button
        type="button"
        onClick={onNext}
        className="mt-4 min-h-[44px] rounded-md border border-[#aef5c8]/40 bg-[#aef5c8]/10 px-8 font-pixel text-[11px] uppercase text-[#aef5c8] transition-colors hover:bg-[#aef5c8]/20 sm:text-[13px]"
      >
        Next Level ▸
      </button>

      <button
        type="button"
        onClick={onExit}
        className="mt-1 min-h-[40px] rounded-md px-6 font-pixel text-[8px] uppercase text-white/45 transition-colors hover:text-white/80 sm:text-[9px]"
      >
        ◂ Exit to Menu
      </button>
    </div>
  );
}
