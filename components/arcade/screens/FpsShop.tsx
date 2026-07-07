'use client';

/**
 * Between-level armory. Ammo + throwables auto-refill. Gold buys permanent armour
 * plating plus per-next-level CONSUMABLES (stim / overshield / ammo / grenades /
 * revive) whose cost SCALES with the level, so gold always has a meaningful sink
 * all the way to the end of the campaign. Then refit / customize / advance.
 */

/** Purchased-buff totals carried on the run (applied to the next deploy, then spent). */
export interface NextBuffs {
  dmg: number; // +fraction weapon damage
  overshield: number; // +flat overshield
  reserveMul: number; // +fraction reserve ammo
  nades: number; // +throwables
  revive: boolean; // survive one lethal hit
}
export const NO_BUFFS: NextBuffs = { dmg: 0, overshield: 0, reserveMul: 0, nades: 0, revive: false };

export interface ShopItem {
  id: string;
  label: string;
  desc: string;
  cost: (level: number) => number;
  owned?: (b: NextBuffs) => string | null; // a short "owned" badge, if any
}

/** The catalog — costs scale with level so gold never dead-ends. Shared with FpsGame
 *  (which applies the effects), so the price shown == the price charged. */
export const SHOP_ITEMS: ShopItem[] = [
  { id: 'armor', label: 'Armor Plating', desc: '+25 max HP · permanent', cost: (l) => 80 + l * 8 },
  { id: 'stim', label: 'Combat Stim', desc: '+15% weapon damage · next level', cost: (l) => 60 + l * 10, owned: (b) => (b.dmg > 0 ? `+${Math.round(b.dmg * 100)}%` : null) },
  { id: 'shield', label: 'Overshield Cell', desc: '+40 overshield · next level', cost: (l) => 70 + l * 9, owned: (b) => (b.overshield > 0 ? `+${b.overshield}` : null) },
  { id: 'ammo', label: 'Ammo Cache', desc: '+50% reserve ammo · next level', cost: (l) => 50 + l * 7, owned: (b) => (b.reserveMul > 0 ? `+${Math.round(b.reserveMul * 100)}%` : null) },
  { id: 'nades', label: 'Grenade Crate', desc: '+3 throwables · next level', cost: (l) => 40 + l * 6, owned: (b) => (b.nades > 0 ? `+${b.nades}` : null) },
  { id: 'revive', label: 'Nano-Revive', desc: 'Survive one lethal hit · next level', cost: (l) => 120 + l * 12, owned: (b) => (b.revive ? 'ARMED' : null) },
];

export function FpsShop({
  level,
  gold,
  maxHp,
  buffs,
  onBuy,
  onRefit,
  onCustomize,
  onNext,
  onExit,
}: {
  level: number;
  gold: number;
  maxHp: number;
  buffs: NextBuffs;
  onBuy: (id: string) => void;
  onRefit: () => void;
  onCustomize: () => void;
  onNext: () => void;
  onExit: () => void;
}) {
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center gap-2 overflow-auto bg-black/85 px-4 py-6 text-center font-pixel">
      <p className="text-[14px] text-[#aef5c8] sm:text-[18px]">LEVEL {level} CLEAR</p>
      <p className="text-[10px] text-[#ffd27a] sm:text-[12px]">GOLD ⛀ {gold}</p>
      <p className="text-[7px] text-white/45 sm:text-[8px]">AMMO + THROWABLES REFILLED · MAX HP {maxHp}</p>

      {/* consumables + scaling sinks */}
      <div className="mt-2 grid w-full max-w-md grid-cols-1 gap-1.5 sm:grid-cols-2">
        {SHOP_ITEMS.map((it) => {
          const cost = it.cost(level);
          const badge = it.owned?.(buffs) ?? null;
          const afford = gold >= cost;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => afford && onBuy(it.id)}
              disabled={!afford}
              className={`flex flex-col items-start rounded-md border p-2 text-left transition-colors ${afford ? 'border-[#7fdfff]/40 bg-[#7fdfff]/[0.07] hover:bg-[#7fdfff]/15' : 'border-white/10 bg-white/[0.02] opacity-45'}`}
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-[9px] text-[#7fdfff] sm:text-[10px]">{it.label}</span>
                <span className="text-[8px] text-[#ffd27a]">⛀ {cost}</span>
              </div>
              <span className="mt-0.5 text-[6px] leading-relaxed text-white/50 sm:text-[7px]">{it.desc}</span>
              {badge && <span className="mt-0.5 text-[6px] text-[#aef5c8]">◆ {badge}</span>}
            </button>
          );
        })}
      </div>

      {/* weapon systems */}
      <div className="mt-2 flex w-full max-w-md flex-col gap-1.5 sm:flex-row">
        <button type="button" onClick={onCustomize} className="min-h-[38px] flex-1 rounded-md border border-[#c8a8ff]/40 bg-[#c8a8ff]/10 px-4 text-[9px] uppercase text-[#c8a8ff] transition-colors hover:bg-[#c8a8ff]/20 sm:text-[10px]">
          Customize Guns
        </button>
        <button type="button" onClick={onRefit} className="min-h-[38px] flex-1 rounded-md border border-white/20 bg-white/5 px-4 text-[9px] uppercase text-white/75 transition-colors hover:bg-white/10 sm:text-[10px]">
          Refit Loadout
        </button>
      </div>

      <button type="button" onClick={onNext} className="mt-3 min-h-[44px] rounded-md border border-[#aef5c8]/40 bg-[#aef5c8]/10 px-8 text-[11px] uppercase text-[#aef5c8] transition-colors hover:bg-[#aef5c8]/20 sm:text-[13px]">
        Next Level ▸
      </button>
      <button type="button" onClick={onExit} className="mt-0.5 min-h-[36px] rounded-md px-6 text-[8px] uppercase text-white/45 transition-colors hover:text-white/80 sm:text-[9px]">
        ◂ Exit to Menu
      </button>
    </div>
  );
}
