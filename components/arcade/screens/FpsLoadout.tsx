'use client';

import { useMemo, useState } from 'react';
import { GUNS, PRIMARIES, SECONDARIES, SIDEARMS, THROWABLES, gunById, UNLOCK_GATE_LEVEL, type GunDef, type ThrowKind } from '../fps/weapons';
import { GunPreview } from './GunPreview';
import { loadArsenal, saveArsenal, isWeaponUnlocked, unlockWeapon, equippedParts, type ArsenalSave } from '../fps/arsenal/store';
import { applyEngineering } from '../fps/arsenal/parts';
import { unlockWeaponPrice } from '../fps/arsenal/economy';
import { loadMarine } from '../fps/marine/store';
import { isWeaponForDivision, weaponDivision } from '../fps/gen/registry';
import { GEN_DIVISIONS, type GenDivisionId } from '../fps/gen/divisions';

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
  initial,
  onSpendAstro,
  onConfirm,
  onDeploy,
  onBack,
  config,
}: {
  astro: number;
  best: number;
  initial: { p1: string; p2: string; sa: string; th: string };
  onSpendAstro: (n: number) => void;
  onConfirm: (p1: string, p2: string, sidearm: string, thrown: string) => void;
  onDeploy: (p1: string, p2: string, sidearm: string, thrown: string) => void;
  onBack: () => void;
  // Fresh-deploy run config (difficulty + squads). Omitted on a mid-run shop refit.
  config?: {
    diff: string;
    tiers: readonly string[];
    onDiff: (d: string) => void;
    squads: number;
    squadOptions: readonly number[];
    squadSize: number;
    onSquads: (n: number) => void;
    rewardMult: number;
  };
}) {
  const [save, setSave] = useState<ArsenalSave>(() => loadArsenal());
  const marineDiv = useMemo(() => loadMarine().division ?? 'outrider', []);
  // A weapon is OFFERED in the loadout if it's allowed for the marine's division
  // (untagged = universal; division-tagged only for that division). Owned/recruit guns
  // equip on click; LOCKED guns show with a 🔒 + AstroDiamond price and are BOUGHT on
  // click (see tryPick — needs level 5 + enough ◈). This is the weapon shop.
  const offered = (g: GunDef) => isWeaponForDivision(g.id, marineDiv);
  // The loadout only shows OWNED guns (starters + guns bought in the Store); locked
  // store guns are purchased in the Store, not here.
  const ownedOffered = (g: GunDef) => offered(g) && isWeaponUnlocked(save, g.id);
  const [p1, setP1] = useState(initial.p1);
  const [p2, setP2] = useState(initial.p2);
  const [sa, setSa] = useState(initial.sa);
  const [th, setTh] = useState(initial.th);
  const [focus, setFocus] = useState(initial.p1);

  const fg = GUNS.find((g) => g.id === focus);
  const ft = !fg ? THROWABLES.find((t) => t.id === focus) : undefined;
  const gateOpen = best >= UNLOCK_GATE_LEVEL;
  // Installed (bought + equipped) components for the previewed gun → show on the model + stat bars.
  const focusEquipped = useMemo(() => (fg ? equippedParts(save, focus, fg.family) : []), [save, focus, fg]);
  const enh = fg ? applyEngineering(fg, focusEquipped) : null;

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

      {/* Fresh-deploy run config — difficulty + squads fold in here (was the old menu). */}
      {config && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">
          <span className="font-pixel text-[6px] uppercase tracking-[0.2em] text-white/40">DIFFICULTY</span>
          {config.tiers.map((d) => (
            <button key={d} type="button" onClick={() => config.onDiff(d)} className={`min-h-[26px] rounded border px-2 font-pixel text-[7px] uppercase transition-colors ${config.diff === d ? 'border-[#7fdfff] bg-[#7fdfff]/20 text-[#7fdfff]' : 'border-white/15 bg-white/[0.04] text-white/55 hover:bg-white/10'}`}>
              {d}
            </button>
          ))}
          <span className="ml-1 font-pixel text-[6px] uppercase tracking-[0.2em] text-white/40">SQUADS</span>
          {config.squadOptions.map((n) => (
            <button key={n} type="button" onClick={() => config.onSquads(n)} className={`min-h-[26px] rounded border px-2 font-pixel text-[7px] transition-colors ${config.squads === n ? 'border-[#aef5c8] bg-[#aef5c8]/20 text-[#aef5c8]' : 'border-white/15 bg-white/[0.04] text-white/55 hover:bg-white/10'}`}>
              {n} · {n * config.squadSize}
            </button>
          ))}
          <span className="ml-auto font-pixel text-[6px] text-[#c8a8ff]/70">REWARDS ×{config.rewardMult.toFixed(2)}</span>
        </div>
      )}

      <div className="mt-2 flex min-h-0 flex-1 gap-3">
        <div className="flex w-[42%] shrink-0 flex-col sm:w-[44%]">
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-md border border-white/10 bg-gradient-to-b from-[#4a5568] to-[#26303f]">
            <GunPreview gunId={focus} equipped={fg ? focusEquipped : undefined} />
            <div className="pointer-events-none absolute bottom-1 left-2">
              <p className="font-pixel text-[9px] text-white sm:text-[12px]">{fg?.name ?? ft?.name}</p>
              <p className="font-pixel text-[6px] uppercase text-white/45 sm:text-[8px]">{fg ? fg.family : ft ? THROW_SUB[ft.kind] : ''}</p>
            </div>
          </div>
          <div className="mt-1.5 shrink-0 space-y-1">
            {fg && enh && (
              <>
                <StatBar label="POWER" basePct={Math.sqrt(fg.dmg / DMG_MAX)} enhPct={Math.sqrt(enh.dmg / DMG_MAX)} value={`${enh.dmg}`} delta={enh.dmg > fg.dmg ? `+${enh.dmg - fg.dmg}` : ''} color="#ff5d6e" />
                <StatBar label="MAG" basePct={fg.mag / MAG_MAX} enhPct={enh.mag / MAG_MAX} value={`${enh.mag}`} delta={enh.mag > fg.mag ? `+${enh.mag - fg.mag}` : ''} color="#7fdfff" />
                <StatBar label="RELOAD" basePct={RELOAD_MIN / fg.reload} enhPct={RELOAD_MIN / enh.reload} value={`${enh.reload}s`} delta={enh.reload < fg.reload ? `-${(fg.reload - enh.reload).toFixed(2)}s` : ''} color="#7ad0ff" />
              </>
            )}
            {focusEquipped.length > 0 && <p className="font-pixel text-[5px] text-[#aef5c8]/70 sm:text-[6px]">▮ base · ▮ engineered (+{focusEquipped.length} installed)</p>}
            {ft && (
              <div className="flex items-center justify-between font-pixel text-[7px] text-white/55 sm:text-[8px]">
                <span>CARRY ×{ft.count}</span>
                <span>{ft.blast.dmg > 0 ? `BLAST ${ft.blast.dmg}` : 'UTILITY'}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
          {/* Each pool shows your division's weapons: recruit/owned equip on tap; locked
              ones show 🔒 + a ◈ price and are bought on tap (level 5 + enough AstroDiamonds). */}
          <Picker label="PRIMARY" items={PRIMARIES.filter(ownedOffered)} value={p1} focus={focus} onPick={tryPick(setP1)} save={save} astro={astro} gateOpen={gateOpen} />
          <Picker label="HEAVY" items={SECONDARIES.filter(ownedOffered)} value={p2} focus={focus} onPick={tryPick(setP2)} save={save} astro={astro} gateOpen={gateOpen} />
          <Picker label="SECONDARY" items={SIDEARMS.filter(ownedOffered)} value={sa} focus={focus} onPick={tryPick(setSa)} save={save} astro={astro} gateOpen={gateOpen} />
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

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => onConfirm(p1, p2, sa, th)}
          className="min-h-[44px] rounded-md border border-[#c8a8ff]/40 bg-[#c8a8ff]/10 px-6 font-pixel text-[10px] uppercase text-[#c8a8ff] transition-colors hover:bg-[#c8a8ff]/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c8a8ff] sm:text-[12px]"
        >
          ✓ Confirm
        </button>
        <button
          type="button"
          onClick={() => onDeploy(p1, p2, sa, th)}
          className="min-h-[44px] flex-1 rounded-md border border-[#aef5c8]/40 bg-[#aef5c8]/10 font-pixel text-[11px] uppercase text-[#aef5c8] transition-colors hover:bg-[#aef5c8]/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#aef5c8] sm:text-[13px]"
        >
          Deploy ▸
        </button>
      </div>
    </div>
  );
}

/** A stat bar whose base value is `color`, with the component enhancement drawn as a
 *  bright-green EXTENSION on the same track (or a dim segment if a tradeoff reduced it). */
function StatBar({ label, basePct, enhPct, value, delta, color }: { label: string; basePct: number; enhPct: number; value: string; delta: string; color: string }) {
  const base = clamp01(basePct);
  const enh = clamp01(enhPct);
  const lo = Math.min(base, enh);
  const ext = Math.max(0, enh - base); // improvement beyond base
  const down = enh < base - 0.001; // a tradeoff shrank it
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 shrink-0 font-pixel text-[6px] uppercase text-white/45 sm:text-[7px]">{label}</span>
      <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
        <div className="h-full transition-[width] duration-300" style={{ width: `${lo * 100}%`, backgroundColor: down ? '#8a8f9a' : color }} />
        {ext > 0 && <div className="h-full transition-[width] duration-300" style={{ width: `${ext * 100}%`, backgroundColor: '#aef5c8' }} />}
      </div>
      <span className="w-16 shrink-0 text-right font-pixel text-[7px] text-white sm:text-[8px]">
        {value}
        {delta && <span className="text-[#aef5c8]"> {delta}</span>}
      </span>
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
          const dv = weaponDivision(g.id);
          const divName = dv ? GEN_DIVISIONS[dv as GenDivisionId]?.name : null;
          const base = unlocked ? `${g.family} · ${g.dmg}` : !gateOpen ? `🔒 LVL ${UNLOCK_GATE_LEVEL}+` : `🔒 ◈${price}`;
          const sub = divName ? `${base} · ⬡${divName}` : base;
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
