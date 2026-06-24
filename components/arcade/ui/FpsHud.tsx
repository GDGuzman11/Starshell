'use client';

import type { FpsSnapshot } from '../useFpsLoop';

/** Combat HUD: crosshair / scope, hitmarker, muzzle flash, hurt vignette,
 *  health, the active weapon + ammo, weapon slots, and a gun view-model. */
export function FpsHud({ snap }: { snap: FpsSnapshot }) {
  const now = typeof performance !== 'undefined' ? performance.now() : 0;
  const flash = now - snap.fireAt < 70;
  const hit = now - snap.hitAt < 180;
  const hurt = now - snap.hurtAt < 320;
  const scoped = snap.ads && snap.scoped;

  return (
    <div className="pointer-events-none absolute inset-0 z-30 font-pixel text-white">
      {hurt && (
        <div aria-hidden className="absolute inset-0" style={{ boxShadow: 'inset 0 0 60px 20px rgba(255,40,60,0.55)' }} />
      )}

      {/* Sniper scope */}
      {scoped && (
        <div aria-hidden className="absolute inset-0">
          <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 50%, transparent 0%, transparent 27%, rgba(0,0,0,0.96) 30%)' }} />
          <div className="absolute left-1/2 top-1/2 h-px w-40 -translate-x-1/2 -translate-y-1/2 bg-[#aef5c8]/70" />
          <div className="absolute left-1/2 top-1/2 h-40 w-px -translate-x-1/2 -translate-y-1/2 bg-[#aef5c8]/70" />
          <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 bg-[#ff5d6e]" />
        </div>
      )}

      {/* crosshair / hitmarker (hidden while scoped) */}
      {!scoped && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <span className={hit ? 'text-[#ff5d6e]' : 'text-[#aef5c8]/80'} style={{ fontSize: 13 }}>
            {hit ? '✕' : '+'}
          </span>
        </div>
      )}

      {/* muzzle flash + gun view-model (hidden while scoped) */}
      {!scoped && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
          {flash && (
            <div aria-hidden className="absolute -top-5 left-1/2 h-6 w-6 -translate-x-1/2 rounded-full" style={{ background: 'radial-gradient(circle, #fff6c8 0%, #ffae3a 50%, transparent 70%)' }} />
          )}
          <div className="relative h-12 w-24 sm:h-16 sm:w-32">
            <div className="absolute bottom-0 left-1/2 h-10 w-7 -translate-x-1/2 rounded-t-sm bg-[#2a3048]" />
            <div className="absolute bottom-6 left-1/2 h-2.5 w-16 -translate-x-[60%] rounded-sm bg-[#3a4366]" />
            <div className="absolute bottom-[26px] left-1/2 h-1.5 w-3 -translate-x-[150%] bg-[#7fdfff]" />
          </div>
        </div>
      )}

      {/* enemies left */}
      <div className="absolute left-1/2 top-3 -translate-x-1/2 text-[9px] text-[#ff8a96] sm:text-[11px]">
        ENEMIES {snap.enemiesLeft}
      </div>

      {/* boss bars */}
      {snap.bosses.length > 0 && (
        <div className="absolute left-1/2 top-8 z-30 w-60 -translate-x-1/2 space-y-1 sm:w-80">
          {snap.bosses.map((b, i) => (
            <div key={i}>
              <div className="text-center text-[7px] tracking-[0.2em] text-[#ff5d6e] sm:text-[9px]">{b.name}</div>
              <div className="h-2 w-full overflow-hidden rounded border border-[#ff5d6e]/40 bg-black/50">
                <div className="h-full bg-[#ff5d6e] transition-[width] duration-200" style={{ width: `${b.ratio * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* health */}
      <div className="absolute bottom-4 left-4">
        <div className="mb-1 text-[8px] text-white/60 sm:text-[9px]">
          HP {Math.round(snap.health)}/{snap.maxHp}
        </div>
        <div className="h-2.5 w-32 overflow-hidden rounded bg-white/15 sm:w-40">
          <div
            className="h-full transition-[width] duration-150"
            style={{ width: `${(snap.health / snap.maxHp) * 100}%`, backgroundColor: snap.health / snap.maxHp > 0.35 ? '#aef5c8' : '#ff5d6e' }}
          />
        </div>
      </div>

      {/* weapon + ammo + slots */}
      <div className="absolute bottom-4 right-4 text-right">
        <div className="text-[9px] text-[#7fdfff] sm:text-[11px]">
          {snap.weapon} <span className="text-white/40">· {snap.family}</span>
        </div>
        {snap.reloading ? (
          <div className="text-[10px] text-[#7fdfff] sm:text-[12px]">RELOADING…</div>
        ) : (
          <div className="text-[14px] sm:text-[18px]">
            <span className={snap.mag <= 3 ? 'text-[#ff5d6e]' : 'text-white'}>{snap.mag}</span>
            <span className="text-white/40"> / {snap.reserve}</span>
          </div>
        )}
        <div className="mt-1 flex justify-end gap-1">
          {snap.slots.map((s, i) => (
            <span
              key={i}
              className={`rounded px-1.5 py-0.5 text-[6px] sm:text-[7px] ${s.active ? 'bg-[#7fdfff]/25 text-[#7fdfff]' : 'bg-white/5 text-white/40'}`}
            >
              {i + 1}
            </span>
          ))}
        </div>
        <div className="mt-0.5 text-[7px] text-[#ffae3a] sm:text-[8px]">
          {snap.throwName} ×{snap.throwCount} <span className="text-white/30">· G</span>
        </div>
        <div className="mt-0.5 text-[6px] text-white/35 sm:text-[7px]">1-3 / SCROLL SWAP · RMB ZOOM · R RELOAD · G THROW</div>
      </div>
    </div>
  );
}
