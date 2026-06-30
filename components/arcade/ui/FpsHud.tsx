'use client';

import type { FpsSnapshot } from '../useFpsLoop';

// The gun is now a real 3D viewmodel (fps/viewmodel.ts). Flip to true to restore
// the old flat 2D CSS gun + screen-centre muzzle flash.
const SHOW_2D_GUN = false;

/** Combat HUD: crosshair / scope, hitmarker, muzzle flash, hurt vignette,
 *  health, the active weapon + ammo, weapon slots, and a gun view-model. */
export function FpsHud({ snap, level, gold, isTouch }: { snap: FpsSnapshot; level: number; gold: number; isTouch: boolean }) {
  const now = typeof performance !== 'undefined' ? performance.now() : 0;
  const flash = now - snap.fireAt < 70;
  const hit = now - snap.hitAt < 180;
  const hurt = now - snap.hurtAt < 320;
  const scoped = snap.ads; // any zoom level shows the scope view (snipers go deeper)
  const blind = Math.max(0, 1 - (now - snap.flashAt) / 1400); // flashbang white-out
  const stun = Math.max(0, 1 - (now - snap.stunAt) / 1300); // stun/concussion distortion

  // Radar geometry: a circular minimap, player centred, forward = up.
  const RAD = 40; // usable px radius
  const RAD_RANGE = 60; // world units shown to the edge

  return (
    <div className="pointer-events-none absolute inset-0 z-30 font-pixel text-white">
      {hurt && (
        <div aria-hidden className="absolute inset-0" style={{ boxShadow: 'inset 0 0 60px 20px rgba(255,40,60,0.55)' }} />
      )}
      {blind > 0 && <div aria-hidden className="absolute inset-0 bg-white" style={{ opacity: blind }} />}
      {stun > 0 && (
        <div
          aria-hidden
          className="gdg-stun absolute inset-0"
          style={{
            opacity: Math.min(1, stun + 0.15),
            backdropFilter: `blur(${(3 * stun).toFixed(2)}px) hue-rotate(${Math.round(55 * stun)}deg) saturate(${(1 + stun).toFixed(2)})`,
            WebkitBackdropFilter: `blur(${(3 * stun).toFixed(2)}px) hue-rotate(${Math.round(55 * stun)}deg) saturate(${(1 + stun).toFixed(2)})`,
            boxShadow: 'inset 0 0 140px 50px rgba(90,130,255,0.4)',
          }}
        />
      )}

      {/* Radar / minimap (player centred, forward = up) */}
      <div className="absolute left-3 top-11 h-[88px] w-[88px] rounded-full border border-[#7fdfff]/30 bg-black/45 sm:top-12">
        <div className="absolute left-1/2 top-1/2 h-px w-full -translate-x-1/2 -translate-y-1/2 bg-[#7fdfff]/10" />
        <div className="absolute left-1/2 top-1/2 h-full w-px -translate-x-1/2 -translate-y-1/2 bg-[#7fdfff]/10" />
        <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#aef5c8]" />
        <div className="absolute left-1/2 top-[6px] h-2 w-px -translate-x-1/2 bg-[#aef5c8]/70" />
        {snap.radar.map((r, i) => {
          let px = (r.x / RAD_RANGE) * RAD;
          let py = -(r.z / RAD_RANGE) * RAD;
          const m = Math.hypot(px, py);
          if (m > RAD) {
            px = (px / m) * RAD;
            py = (py / m) * RAD;
          }
          return (
            <div
              key={i}
              className={`absolute rounded-full ${r.boss ? 'h-2 w-2 bg-[#ff9a3a]' : 'h-1.5 w-1.5 bg-[#ff5d6e]'}`}
              style={{ left: `calc(50% + ${px}px)`, top: `calc(50% + ${py}px)`, transform: 'translate(-50%,-50%)' }}
            />
          );
        })}
      </div>

      {/* Zoom scope — a big circle filling almost the whole screen, dark only in
          the corners, with a clearly visible crosshair (gap + centre dot). */}
      {scoped && (
        <div aria-hidden className="absolute inset-0">
          <div
            className="absolute inset-0"
            style={{ background: 'radial-gradient(circle closest-side at 50% 50%, transparent 0%, transparent 84%, rgba(0,0,0,0.55) 91%, rgba(0,0,0,0.94) 100%)' }}
          />
          {/* scope ring */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#aef5c8]/35"
            style={{ width: 'min(94vw, 94vh)', height: 'min(94vw, 94vh)' }}
          />
          {/* crosshair ticks with a centre gap */}
          <span className="absolute left-1/2 w-[3px] -translate-x-1/2 bg-[#aef5c8]" style={{ top: 'calc(50% - 110px)', height: 86 }} />
          <span className="absolute left-1/2 w-[3px] -translate-x-1/2 bg-[#aef5c8]" style={{ top: 'calc(50% + 24px)', height: 86 }} />
          <span className="absolute top-1/2 h-[3px] -translate-y-1/2 bg-[#aef5c8]" style={{ left: 'calc(50% - 110px)', width: 86 }} />
          <span className="absolute top-1/2 h-[3px] -translate-y-1/2 bg-[#aef5c8]" style={{ left: 'calc(50% + 24px)', width: 86 }} />
          <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ff5d6e]" />
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

      {/* muzzle flash + gun view-model (hidden while scoped) — superseded by the 3D viewmodel */}
      {SHOW_2D_GUN && !scoped && (
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

      {/* wave · enemies · gold (glass objective pill) */}
      <div className="absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[8px] backdrop-blur-sm sm:text-[10px]">
        <span className="text-[#7fdfff]">WAVE {level}</span>
        <span className="text-white/25"> · </span>
        <span className="text-[#ff8a96]">{snap.enemiesLeft} LEFT</span>
        <span className="text-white/25"> · </span>
        <span className="text-[#ffd27a]">⛀ {gold}</span>
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

      {/* health (glass) */}
      <div className="absolute bottom-4 left-4 rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 backdrop-blur-sm">
        <div className="mb-1 text-[7px] text-white/55 sm:text-[8px]">
          HP {Math.round(snap.health)}/{snap.maxHp}
        </div>
        <div className="h-2 w-28 overflow-hidden rounded-full bg-white/15 sm:w-36">
          <div
            className="h-full transition-[width] duration-150"
            style={{ width: `${(snap.health / snap.maxHp) * 100}%`, backgroundColor: snap.health / snap.maxHp > 0.35 ? '#aef5c8' : '#ff5d6e' }}
          />
        </div>
      </div>

      {/* weapon + ammo + slots (glass). On touch it sits bottom-centre, clear of
          the action buttons; on desktop bottom-right. */}
      <div
        className={`absolute bottom-4 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 backdrop-blur-sm ${
          isTouch ? 'left-1/2 -translate-x-1/2 text-center' : 'right-4 text-right'
        }`}
      >
        <div className="text-[8px] text-[#7fdfff] sm:text-[10px]">
          {snap.weapon} <span className="text-white/40">· {snap.family}</span>
        </div>
        {snap.reloading ? (
          <div className="text-[9px] text-[#7fdfff] sm:text-[12px]">RELOADING…</div>
        ) : (
          <div className="text-[13px] sm:text-[17px]">
            <span className={snap.mag <= 3 ? 'text-[#ff5d6e]' : 'text-white'}>{snap.mag}</span>
            <span className="text-white/40"> / {snap.reserve}</span>
          </div>
        )}
        <div className={`mt-1 flex gap-1 ${isTouch ? 'justify-center' : 'justify-end'}`}>
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
          {snap.throwName} ×{snap.throwCount}
        </div>
      </div>
    </div>
  );
}
