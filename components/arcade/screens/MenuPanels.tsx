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
import { GUNS, gunById } from '../fps/weapons';
import { categoriesForFamily } from '../fps/arsenal/categories';
import { loadArsenal, equippedParts } from '../fps/arsenal/store';
import { hasSlots } from '../fps/arsenal/partModel';

export function AvatarPanel() {
  return (
    <div className="w-52 rounded-lg border border-[#7fdfff]/20 bg-black/50 p-3 font-pixel backdrop-blur-sm">
      <p className="text-[8px] tracking-[0.25em] text-[#7fdfff]/80">PILOT</p>
      <div className="mt-2 flex h-56 items-center justify-center rounded-md border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent">
        {/* placeholder silhouette — avatar TBD */}
        <div className="flex flex-col items-center gap-2 opacity-60">
          <div className="h-10 w-10 rounded-full border border-[#7fdfff]/40 bg-[#7fdfff]/10" />
          <div className="h-14 w-16 rounded-t-2xl border border-[#7fdfff]/40 bg-[#7fdfff]/10" />
        </div>
      </div>
      <p className="mt-2 text-center text-[7px] text-white/35">AVATAR · TBD</p>
    </div>
  );
}

export function LoadoutPanel() {
  const [gunId, setGunId] = useState('ar');
  const [save] = useState(() => loadArsenal()); // remounts with the menu → always fresh
  const gun = gunById(gunId);
  const cats = categoriesForFamily(gun.family);
  const equipped = useMemo(() => equippedParts(save, gunId, gun.family), [save, gunId, gun.family]);
  const catLabel = (id: string) => cats.find((c) => c.id === id)?.label ?? id;

  return (
    <div className="w-56 rounded-lg border border-[#c8a8ff]/25 bg-black/50 p-3 font-pixel backdrop-blur-sm">
      <p className="text-[8px] tracking-[0.25em] text-[#c8a8ff]/80">LOADOUT PREVIEW</p>
      <select
        value={gunId}
        onChange={(e) => setGunId(e.target.value)}
        className="mt-2 w-full rounded border border-white/15 bg-black/60 px-2 py-1 text-[8px] uppercase text-white/85 outline-none focus:border-[#c8a8ff]/60"
      >
        {GUNS.map((g) => (
          <option key={g.id} value={g.id} className="bg-black text-white">
            {g.name}
          </option>
        ))}
      </select>
      <div className="relative mt-2 h-40 overflow-hidden rounded-md border border-white/10 bg-white/[0.02]">
        <GunPreview gunId={gunId} equipped={equipped} />
      </div>
      <p className="mt-2 text-[8px] text-white/85">{gun.name}</p>
      <div className="mt-1 flex flex-col gap-0.5">
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
    </div>
  );
}
