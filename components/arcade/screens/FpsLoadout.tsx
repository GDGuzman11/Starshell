'use client';

import { useState } from 'react';
import { PRIMARIES, SIDEARMS, THROWABLES, type GunDef, type ThrowKind } from '../fps/weapons';

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

/** Pre-deploy loadout: 2 primaries + 1 sidearm + 1 throwable, from the pool. */
export function FpsLoadout({
  onDeploy,
  onBack,
}: {
  onDeploy: (p1: string, p2: string, sidearm: string, thrown: string) => void;
  onBack: () => void;
}) {
  const [p1, setP1] = useState('ar');
  const [p2, setP2] = useState('rail');
  const [sa, setSa] = useState('sidearm');
  const [th, setTh] = useState('frag');

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-black/85 px-3 py-3 sm:px-5">
      <div className="flex items-center justify-between">
        <p className="font-pixel text-[10px] text-[#7fdfff] sm:text-[13px]">LOADOUT</p>
        <button type="button" onClick={onBack} className="font-pixel text-[8px] text-white/45 hover:text-white sm:text-[9px]">
          ◂ BACK
        </button>
      </div>

      <div className="mt-2 flex-1 space-y-3 overflow-y-auto pr-1">
        <Picker label="PRIMARY 1" items={PRIMARIES} value={p1} onPick={setP1} />
        <Picker label="PRIMARY 2" items={PRIMARIES} value={p2} onPick={setP2} />
        <Picker label="SIDEARM" items={SIDEARMS} value={sa} onPick={setSa} />
        <div>
          <p className="font-pixel text-[7px] text-white/45 sm:text-[8px]">THROWABLE</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {THROWABLES.map((t) => (
              <Chip key={t.id} label={`${t.name} ×${t.count}`} sub={THROW_SUB[t.kind]} on={th === t.id} color="#ffae3a" onClick={() => setTh(t.id)} />
            ))}
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

function Picker({ label, items, value, onPick }: { label: string; items: GunDef[]; value: string; onPick: (id: string) => void }) {
  return (
    <div>
      <p className="font-pixel text-[7px] text-white/45 sm:text-[8px]">{label}</p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {items.map((g) => (
          <Chip key={g.id} label={g.name} sub={`${g.family} · ${g.dmg}`} on={value === g.id} color="#7fdfff" onClick={() => onPick(g.id)} />
        ))}
      </div>
    </div>
  );
}

function Chip({ label, sub, on, color, onClick }: { label: string; sub: string; on: boolean; color: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start rounded border px-2 py-1 text-left transition-colors ${on ? 'bg-white/10' : 'border-white/10 bg-white/[0.02] opacity-70 hover:opacity-100'}`}
      style={on ? { borderColor: color } : undefined}
    >
      <span className="font-pixel text-[7px] leading-tight text-white sm:text-[8px]">{label}</span>
      <span className="font-pixel text-[5px] uppercase text-white/40 sm:text-[6px]">{sub}</span>
    </button>
  );
}
