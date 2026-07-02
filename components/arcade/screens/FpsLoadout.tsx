'use client';

import { useState } from 'react';
import { GUNS, PRIMARIES, SECONDARIES, SIDEARMS, THROWABLES, gunById, UNLOCK_GATE_LEVEL, type GunDef, type ThrowKind } from '../fps/weapons';
import { GunPreview } from './GunPreview';
import { loadArsenal, saveArsenal, isWeaponUnlocked, unlockWeapon, type ArsenalSave } from '../fps/arsenal/store';
import { unlockWeaponPrice } from '../fps/arsenal/economy';

// Normalization bounds for the stat bars (computed once over the whole arsenal).
const DMG_MAX = Math.max(...GUNS.map((g) => g.dmg));
const MAG_MAX = Math.max(...GUNS.map((g) => g.mag));
const RELOAD_MIN = Math.min(...GUNS.map((g) => g.reload));
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

const THROW_SUB: Record<ThrowKind, string> = {
  frag: 'AoE damage',
  smoke: 'blocks LoS',
  incendiary: 'fire zone DoT',
  cryo: 'slows + freezes',
  shock: 'EMP stun',
  flash: 'blinds',
  cluster: 'multi-blast',
  gas: 'poison + LoS',
  gravity: 'pull + boom',
  concussion: 'stun + knockback',
  decoy: 'lures enemies',
  plasma: 'huge burst',
};

/** Pre-deploy loadout. Standard Issue guns are free; every other gun is LOCKED and bought
 *  with AstroDiamonds once you've reached level 5. A shared 3D preview shows the last tap. */
export function FpsLoadout({
  astro,
  best,
  onSpendAstro,
  onDeploy,
  onBack,
}: {
  astro: number;
  best: number;
  onSpendAstro: (n: number) => void;
  onDeploy: (p1: string, p2: string, sidearm: string, thrown: string) => void;
  onBack: () => void;
}) {
  const [save, setSave] = useState<ArsenalSave>(() => loadArsenal());
  const [p1, setP1] = useState('ar01');
  const [p2, setP2] = useState('rt06');
  const [sa, setSa] = useState('sp01');
  const [th, setTh] = useState('frag');
  const [focus, setFocus] = useState('ar01');

  const fg = GUNS.find((g) => g.id === focus);
  const ft = !fg ? THROWABLES.find((t) => t.id === focus) : undefined;
  const gateOpen = best >= UNLOCK_GATE_LEVEL;

  // Select a gun; if it's locked, unlock it first (needs level 5 + enough AstroDiamonds).
  const tryPick = (set: (id: string) => void) => (id: string) => {
    setFocus(id);
    if (isWeaponUnlocked(save, id)) {
      set(id);
      return;
    }
    if (!gateOpen) return; // still locked behind level 5
    const price = unlockWeaponPrice(gunById(id));
    if (astro < price) return; // can't afford
    onSpendAstro(price);
    setSave((s) => {
      const n = unlockWeapon(s, id);
      saveArsenal(n);
      return n;
    });
    set(id);
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-black/85 px-3 py-2 sm:px-5 sm:py-3">
      <div className="flex items-center justify-between">
        <p className="font-pixel text-[10px] text-[#7fdfff] sm:text-[13px]">LOADOUT</p>
        <div className="flex items-center gap-3">
          <span className="font-pixel text-[8px] text-[#c8a8ff] sm:text-[10px]">◈ {astro}</span>
          <button type="button" onClick={onBack} className="font-pixel text-[8px] text-white/45 hover:text-white sm:text-[9px]">
            ◂ BACK
          </button>
        </div>
      </div>

      <div className="mt-2 flex min-h-0 flex-1 gap-3">
        <div className="flex w-[42%] shrink-0 flex-col sm:w-[44%]">
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-md border border-white/10 bg-gradient-to-b from-[#4a5568] to-[#26303f]">
            <GunPreview gunId={focus} />
            <div className="pointer-events-none absolute bottom-1 left-2">
              <p className="font-pixel text-[9px] text-white sm:text-[12px]">{fg?.name ?? ft?.name}</p>
              <p className="font-pixel text-[6px] uppercase text-white/45 sm:text-[8px]">{fg ? fg.family : ft ? THROW_SUB[ft.kind] : ''}</p>
            </div>
          </div>
          <div className="mt-1.5 shrink-0 space-y-1">
            {fg && (
              <>
                <StatBar label="POWER" pct={Math.sqrt(fg.dmg / DMG_MAX)} value={`${fg.dmg}`} color="#ff5d6e" />
                <StatBar label="MAG" pct={fg.mag / MAG_MAX} value={`${fg.mag}`} color="#7fdfff" />
                <StatBar label="RELOAD" pct={RELOAD_MIN / fg.reload} value={`${fg.reload}s`} color="#aef5c8" />
              </>
            )}
            {ft && (
              <div className="flex items-center justify-between font-pixel text-[7px] text-white/55 sm:text-[8px]">
                <span>CARRY ×{ft.count}</span>
                <span>{ft.blast.dmg > 0 ? `BLAST ${ft.blast.dmg}` : 'UTILITY'}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
          <Picker label="PRIMARY" items={PRIMARIES} value={p1} focus={focus} onPick={tryPick(setP1)} save={save} astro={astro} gateOpen={gateOpen} />
          <Picker label="HEAVY" items={SECONDARIES} value={p2} focus={focus} onPick={tryPick(setP2)} save={save} astro={astro} gateOpen={gateOpen} />
          <Picker label="SIDEARM" items={SIDEARMS} value={sa} focus={focus} onPick={tryPick(setSa)} save={save} astro={astro} gateOpen={gateOpen} />
          <div>
            <p className="font-pixel text-[7px] text-white/45 sm:text-[8px]">THROWABLE</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {THROWABLES.map((t) => (
                <Chip key={t.id} label={`${t.name} ×${t.count}`} sub={THROW_SUB[t.kind]} on={th === t.id} ring={focus === t.id} color="#ffae3a" onClick={() => { setTh(t.id); setFocus(t.id); }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onDeploy(p1, p2, sa, th)}
        className="mt-2 min-h-[44px] rounded-md border border-[#aef5c8]/40 bg-[#aef5c8]/10 font-pixel text-[11px] uppercase text-[#aef5c8] transition-colors hover:bg-[#aef5c8]/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#aef5c8] sm:text-[13px]"
      >
        Deploy ▸
      </button>
    </div>
  );
}

function StatBar({ label, pct, value, color }: { label: string; pct: number; value: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 shrink-0 font-pixel text-[6px] uppercase text-white/45 sm:text-[7px]">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${Math.round(clamp01(pct) * 100)}%`, backgroundColor: color }} />
      </div>
      <span className="w-9 shrink-0 text-right font-pixel text-[7px] text-white sm:text-[8px]">{value}</span>
    </div>
  );
}

function Picker({ label, items, value, focus, onPick, save, astro, gateOpen }: { label: string; items: GunDef[]; value: string; focus: string; onPick: (id: string) => void; save: ArsenalSave; astro: number; gateOpen: boolean }) {
  return (
    <div>
      <p className="font-pixel text-[7px] text-white/45 sm:text-[8px]">{label}</p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {items.map((g) => {
          const unlocked = isWeaponUnlocked(save, g.id);
          const price = unlockWeaponPrice(g);
          const sub = unlocked ? `${g.family} · ${g.dmg}` : !gateOpen ? `🔒 LVL ${UNLOCK_GATE_LEVEL}+` : `🔒 ◈${price}`;
          return <Chip key={g.id} label={g.name} sub={sub} on={value === g.id} ring={focus === g.id} locked={!unlocked} afford={astro >= price && gateOpen} color="#7fdfff" onClick={() => onPick(g.id)} />;
        })}
      </div>
    </div>
  );
}

function Chip({ label, sub, on, ring, locked, afford, color, onClick }: { label: string; sub: string; on: boolean; ring?: boolean; locked?: boolean; afford?: boolean; color: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start rounded border px-2 py-1 text-left transition-colors ${on ? 'bg-white/10' : 'border-white/10 bg-white/[0.02] opacity-70 hover:opacity-100'} ${ring && !on ? 'ring-1 ring-white/30' : ''} ${locked ? 'border-dashed' : ''}`}
      style={on ? { borderColor: color } : locked ? { borderColor: afford ? 'rgba(255,210,122,0.35)' : 'rgba(255,90,110,0.3)' } : undefined}
    >
      <span className={`font-pixel text-[7px] leading-tight sm:text-[8px] ${locked ? 'text-white/55' : 'text-white'}`}>{label}</span>
      <span className={`font-pixel text-[5px] uppercase sm:text-[6px] ${locked ? (afford ? 'text-[#ffd27a]/80' : 'text-[#ff9aa6]/80') : 'text-white/40'}`}>{sub}</span>
    </button>
  );
}
