'use client';

import { gunById } from '../fps/weapons';
import { UPGRADE_INFO, MAX_LEVEL, costFor, freshUpg, type Upg, type UpgradeKey } from '../fps/customize';

/** Spend stage gold to upgrade each of your loadout guns across four tracks. */
export function FpsCustomize({
  gunIds,
  upgrades,
  gold,
  onBuy,
  onBack,
}: {
  gunIds: string[];
  upgrades: Record<string, Upg>;
  gold: number;
  onBuy: (gunId: string, key: UpgradeKey) => void;
  onBack: () => void;
}) {
  const ids = Array.from(new Set(gunIds));
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center gap-3 overflow-auto bg-black/85 px-4 py-6 font-pixel">
      <p className="text-[14px] text-[#7fdfff] sm:text-[18px]">CUSTOMIZE GUNS</p>
      <p className="text-[9px] text-[#ffd27a] sm:text-[11px]">GOLD ⛀ {gold}</p>
      <p className="text-[6px] text-white/40 sm:text-[7px]">SPEND STAGE GOLD TO ENHANCE EACH WEAPON</p>

      <div className="flex w-full max-w-md flex-col gap-3">
        {ids.map((id) => {
          const gun = gunById(id);
          const up = upgrades[id] ?? freshUpg();
          return (
            <div key={id} className="rounded-md border border-white/12 bg-white/[0.03] p-3">
              <div className="mb-2 text-[10px] text-white sm:text-[11px]">
                {gun.name} <span className="text-white/40">· {gun.family}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {UPGRADE_INFO.map((info) => {
                  const lvl = up[info.key];
                  const maxed = lvl >= MAX_LEVEL;
                  const cost = costFor(lvl);
                  const afford = gold >= cost;
                  return (
                    <button
                      key={info.key}
                      type="button"
                      disabled={maxed || !afford}
                      onClick={() => onBuy(id, info.key)}
                      className="rounded border border-[#7fdfff]/25 bg-[#7fdfff]/[0.06] px-2 py-1.5 text-left text-[7px] text-[#7fdfff] transition-colors hover:bg-[#7fdfff]/15 disabled:cursor-not-allowed disabled:opacity-35 sm:text-[8px]"
                    >
                      <div className="text-white/70">{info.label}</div>
                      <div className="my-0.5 tracking-[0.15em] text-[#aef5c8]">
                        {'■'.repeat(lvl)}
                        <span className="text-white/20">{'□'.repeat(MAX_LEVEL - lvl)}</span>
                      </div>
                      <div className="text-[#ffd27a]">{maxed ? 'MAX' : `${cost}g`}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onBack}
        className="mt-1 min-h-[40px] rounded-md border border-white/20 bg-white/5 px-6 font-pixel text-[9px] uppercase text-white/75 transition-colors hover:bg-white/10 sm:text-[10px]"
      >
        ◂ Back
      </button>
    </div>
  );
}
