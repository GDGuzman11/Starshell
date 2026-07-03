'use client';

/**
 * Main-menu side "screens" — arcade-cabinet flanks shown on wide layouts only.
 *  • AvatarPanel (left): the pilot portrait — placeholder for now (TBD).
 *  • LoadoutPanel (right): a weapon picker + a live 3D preview of that weapon with the
 *    engineering parts the player has equipped on it (read from the persistent arsenal),
 *    listing each installed mod by category. Mounted only inside the menu, so it re-reads
 *    the arsenal every time the menu is shown (reflects Armory edits).
 */
import { useMemo, useState } from 'react';
import { GunPreview } from './GunPreview';
import { MarinePreview } from './MarinePreview';
import { MarineInspect } from './MarineInspect';
import { GunInspect } from './GunInspect';
import { gunById, GUNS } from '../fps/weapons';
import { applyEngineering } from '../fps/arsenal/parts';
import { categoriesForFamily } from '../fps/arsenal/categories';
import { loadArsenal, equippedParts } from '../fps/arsenal/store';
import { hasSlots } from '../fps/arsenal/partModel';
import { loadMarine, equippedArmorPieces } from '../fps/marine/store';
import { statLayers } from '../fps/marine/stats';
import { StatBar } from './StatBar';
import { ARMOR_STAT_LABEL, type ArmorStat } from '../fps/marine/slots';
import { divisionById, OUTRIDER } from '../fps/marine/divisions';

const STAT_ORDER: ArmorStat[] = ['armor', 'mobility', 'shield', 'recovery'];
// Weapon stat-bar normalization (mirrors the Arsenal so the loadout preview reads the same).
const DMG_MAX = Math.max(...GUNS.map((g) => g.dmg));
const MAG_MAX = Math.max(...GUNS.map((g) => g.mag));
const RELOAD_MIN = Math.min(...GUNS.map((g) => g.reload));
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** A compact weapon stat bar: base fill + a bright-green extension for what components add. */
function WeaponStatRow({ label, basePct, enhPct, value, delta, color, unit }: { label: string; basePct: number; enhPct: number; value: string; delta: number; color: string; unit?: string }) {
  const base = clamp01(basePct);
  const e = clamp01(enhPct);
  const lo = Math.min(base, e);
  const ext = Math.max(0, e - base);
  const down = e < base - 0.001;
  const improved = delta > 0.0001;
  const worse = delta < -0.0001;
  const dTxt = unit === 's' ? (improved ? `-${delta.toFixed(2)}` : worse ? `+${Math.abs(delta).toFixed(2)}` : '') : improved ? `+${Math.round(delta)}` : worse ? `${Math.round(delta)}` : '';
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-10 shrink-0 text-[5px] uppercase text-white/40">{label}</span>
      <span className="flex h-1 flex-1 overflow-hidden rounded-full bg-white/10">
        <span className="block h-full" style={{ width: `${lo * 100}%`, backgroundColor: down ? '#8a8f9a' : color }} />
        {ext > 0 && <span className="block h-full" style={{ width: `${ext * 100}%`, backgroundColor: '#aef5c8' }} />}
      </span>
      <span className="w-9 shrink-0 text-right text-[5px] text-white/85">{value}{dTxt && <span className={improved ? 'text-[#aef5c8]' : 'text-[#ff9aa6]'}> {dTxt}</span>}</span>
    </div>
  );
}

export function AvatarPanel({ onArmory }: { onArmory?: () => void }) {
  const [save] = useState(() => loadMarine()); // remounts with the menu → always fresh
  const equipped = useMemo(() => equippedArmorPieces(save), [save]);
  const layers = useMemo(() => statLayers(save.division, equipped), [save.division, equipped]);
  const div = divisionById(save.division);
  const rank = `${(div ?? OUTRIDER).name} · LVL ${save.marineLevel}`;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="w-52 rounded-lg border border-[#7fdfff]/20 bg-black/50 p-3 font-pixel backdrop-blur-sm">
      <div className="flex items-baseline justify-between">
        <p className="text-[8px] tracking-[0.25em] text-[#7fdfff]/80">{(div ?? OUTRIDER).name}</p>
        <p className="text-[7px] text-white/45">◈ {layers.rating}</p>
      </div>
      <div className="relative mt-2 h-56 overflow-hidden rounded-md border border-white/10 bg-gradient-to-b from-[#4a5568] to-[#26303f]">
        <MarinePreview equipped={equipped} divisionId={save.division} onExpand={() => setExpanded(true)} />
        <p className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 text-[6px] tracking-[0.2em] text-[#7fdfff]/70">{rank}</p>
        <span className="pointer-events-none absolute right-1.5 top-1.5 text-[8px] text-white/50">⤢</span>
      </div>
      <div className="mt-2 flex flex-col gap-1">
        {STAT_ORDER.map((k) => (
          <StatBar key={k} label={ARMOR_STAT_LABEL[k]} base={layers.base[k]} added={layers.added[k]} compact />
        ))}
      </div>
      <p className="mt-1.5 text-[6px] text-white/35">
        {equipped.length > 0 ? `${equipped.length} COMPONENT${equipped.length > 1 ? 'S' : ''} ENGINEERED` : 'STANDARD ISSUE · no engineering'}
      </p>
      {onArmory && (
        <button type="button" onClick={onArmory} className="pointer-events-auto mt-2 w-full rounded border border-[#7fdfff]/40 bg-[#7fdfff]/10 py-1.5 text-[8px] uppercase tracking-[0.1em] text-[#7fdfff] transition-colors hover:bg-[#7fdfff]/20">
          ⛨ Armory
        </button>
      )}
      {expanded && <MarineInspect equipped={equipped} divisionId={save.division} rank={rank} onClose={() => setExpanded(false)} />}
    </div>
  );
}

export function LoadoutPanel({ guns, onArsenal }: { guns: string[]; onArsenal?: () => void }) {
  const ids = Array.from(new Set(guns)); // the player's selected loadout weapons only
  const [gunId, setGunId] = useState(ids[0] ?? 'ar01');
  const [save] = useState(() => loadArsenal()); // remounts with the menu → always fresh
  const gun = gunById(ids.includes(gunId) ? gunId : ids[0] ?? gunId);
  const cats = categoriesForFamily(gun.family);
  const equipped = useMemo(() => equippedParts(save, gunId, gun.family), [save, gunId, gun.family]);
  const catLabel = (id: string) => cats.find((c) => c.id === id)?.label ?? id;
  const enh = useMemo(() => applyEngineering(gun, equipped), [gun, equipped]); // components → real stats
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="w-56 rounded-lg border border-[#c8a8ff]/25 bg-black/50 p-3 font-pixel backdrop-blur-sm">
      <p className="text-[8px] tracking-[0.25em] text-[#c8a8ff]/80">LOADOUT PREVIEW</p>
      <select
        value={gun.id}
        onChange={(e) => setGunId(e.target.value)}
        className="mt-2 w-full rounded border border-white/15 bg-black/60 px-2 py-1 text-[8px] uppercase text-white/85 outline-none focus:border-[#c8a8ff]/60"
      >
        {ids.map((id) => (
          <option key={id} value={id} className="bg-black text-white">
            {gunById(id).name}
          </option>
        ))}
      </select>
      <div className="relative mt-2 h-40 overflow-hidden rounded-md border border-white/10 bg-gradient-to-b from-[#4a5568] to-[#26303f]">
        <GunPreview gunId={gunId} equipped={equipped} onExpand={() => setExpanded(true)} />
        <span className="pointer-events-none absolute right-1.5 top-1.5 text-[8px] text-white/50">⤢</span>
      </div>
      <p className="mt-2 text-[8px] text-white/85">{gun.name}</p>
      {/* live stats — base + what equipped components add (green), same as the Arsenal */}
      <div className="mt-1.5 flex flex-col gap-1">
        <WeaponStatRow label="POWER" basePct={Math.sqrt(gun.dmg / DMG_MAX)} enhPct={Math.sqrt(enh.dmg / DMG_MAX)} value={`${enh.dmg}`} delta={enh.dmg - gun.dmg} color="#ff5d6e" />
        <WeaponStatRow label="MAG" basePct={gun.mag / MAG_MAX} enhPct={enh.mag / MAG_MAX} value={`${enh.mag}`} delta={enh.mag - gun.mag} color="#7fdfff" />
        <WeaponStatRow label="RELOAD" basePct={RELOAD_MIN / gun.reload} enhPct={RELOAD_MIN / enh.reload} value={`${enh.reload}s`} delta={gun.reload - enh.reload} color="#7ad0ff" unit="s" />
      </div>
      <div className="mt-1.5 flex flex-col gap-0.5">
        {equipped.length > 0 ? (
          equipped.map((p) => (
            <div key={p.id} className="flex justify-between text-[6px] leading-tight text-white/55">
              <span className="text-white/40">{catLabel(p.category)}</span>
              <span className="ml-2 truncate text-[#c8a8ff]/90">{p.name}</span>
            </div>
          ))
        ) : (
          <p className="text-[6px] text-white/35">STOCK · no engineering installed</p>
        )}
        {!hasSlots(gunId) && equipped.length > 0 && <p className="mt-0.5 text-[5px] text-white/25">3D attachment coming to this weapon</p>}
      </div>
      {onArsenal && (
        <button type="button" onClick={onArsenal} className="pointer-events-auto mt-2 w-full rounded border border-[#c8a8ff]/40 bg-[#c8a8ff]/10 py-1.5 text-[8px] uppercase tracking-[0.1em] text-[#c8a8ff] transition-colors hover:bg-[#c8a8ff]/20">
          ◈ Arsenal
        </button>
      )}
      {expanded && <GunInspect gunId={gunId} equipped={equipped} onClose={() => setExpanded(false)} />}
    </div>
  );
}
