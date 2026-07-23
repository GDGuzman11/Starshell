'use client';

import type { FpsSnapshot } from '../useFpsLoop';
import { deriveHudState } from './controls/combatState';

// The gun is now a real 3D viewmodel (fps/viewmodel.ts). Flip to true to restore
// the old flat 2D CSS gun + screen-centre muzzle flash.
const SHOW_2D_GUN = false;

/** Combat HUD: crosshair / scope, hitmarker, muzzle flash, hurt vignette,
 *  health, the active weapon + ammo, weapon slots, and a gun view-model. */
export function FpsHud({ snap, level, gold, astro, isTouch }: { snap: FpsSnapshot; level: number; gold: number; astro: number; isTouch: boolean }) {
  const now = typeof performance !== 'undefined' ? performance.now() : 0;
  const flash = now - snap.fireAt < 70;
  const hit = now - snap.hitAt < 180;
  const headshot = now - snap.headshotAt < 240; // gold crit marker
  const hurt = now - snap.hurtAt < 320;
  const pickup = now - snap.pickupAt < 400; // ammo/shield pickup flash
  const scoped = snap.ads; // any zoom level shows the scope view (snipers go deeper)
  const blind = Math.max(0, 1 - (now - snap.flashAt) / 1400); // flashbang white-out
  const stun = Math.max(0, 1 - (now - snap.stunAt) / 1300); // stun/concussion distortion
  const fog = Math.max(0, 1 - (now - snap.fogAt) / 4500); // Kraken void fog
  const hud = deriveHudState(snap, now); // dynamic combat HUD emphasis
  const shake = snap.shakeMag > 0 && now - snap.shakeAt < 450 ? snap.shakeMag : 0; // blast HUD shake
  const suppress = snap.suppressMag && now - (snap.suppressAt ?? 0) < 220 ? snap.suppressMag : 0; // suppressor pin

  // Radar geometry: a circular minimap, player centred, forward = up.
  const RAD = 40; // usable px radius
  const RAD_RANGE = 60; // world units shown to the edge

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-30 font-pixel text-white transition-opacity duration-500 ${shake > 0 ? 'gdg-shake' : ''}`}
      style={{ opacity: hud.inCombat ? 1 : 0.62, ['--shake' as string]: shake.toFixed(2), animationDuration: `${(0.28 + 0.22 * (1 - shake)).toFixed(2)}s` }}
    >
      {hurt && (
        <div aria-hidden className="absolute inset-0" style={{ boxShadow: 'inset 0 0 60px 20px rgba(255,40,60,0.55)' }} />
      )}
      {/* SUPPRESSED: a Suppressor is raking your position — edges close in, telling you to move/take cover */}
      {suppress > 0 && (
        <div aria-hidden className="absolute inset-0" style={{ boxShadow: `inset 0 0 ${(80 + 90 * suppress).toFixed(0)}px ${(24 + 40 * suppress).toFixed(0)}px rgba(255,120,40,${(0.14 + 0.22 * suppress).toFixed(2)})`, backdropFilter: `blur(${(0.6 * suppress).toFixed(2)}px)` }} />
      )}
      {/* boss encounter: a restrained red combat tint */}
      {hud.boss && <div aria-hidden className="absolute inset-0" style={{ boxShadow: 'inset 0 0 100px 26px rgba(255,45,55,0.12)' }} />}
      {blind > 0 && <div aria-hidden className="absolute inset-0 bg-white" style={{ opacity: blind }} />}
      {fog > 0 && (
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ opacity: fog * 0.8, background: 'radial-gradient(circle at 50% 50%, rgba(120,70,180,0.25) 0%, rgba(60,30,110,0.7) 70%, rgba(30,12,60,0.92) 100%)' }}
        />
      )}
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
          <span
            className={headshot ? 'text-[#ffd27a]' : hit ? 'text-[#ff5d6e]' : snap.grappleReady ? 'text-[#ffd27a]' : 'text-[#aef5c8]/80'}
            style={{ fontSize: headshot ? 17 : 13, textShadow: headshot ? '0 0 6px rgba(255,210,122,0.9)' : undefined }}
          >
            {headshot ? '✖' : hit ? '✕' : snap.grappleReady ? '⟰' : '+'}
          </span>
        </div>
      )}
      {/* grapple-ready prompt */}
      {snap.grappleReady && !scoped && (
        <div className="absolute left-1/2 top-[54%] -translate-x-1/2 whitespace-nowrap font-pixel text-[7px] tracking-[0.2em] text-[#ffd27a] sm:text-[9px]">{isTouch ? 'TAP GRAPPLE' : 'F · GRAPPLE'}</div>
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

      {/* wave · enemies · gold · astrodiamonds (glass objective pill) */}
      <div className="absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[8px] backdrop-blur-sm sm:text-[10px]">
        <span className="text-[#7fdfff]">WAVE {level}</span>
        <span className="text-white/25"> · </span>
        <span className="text-[#ff8a96]">{snap.enemiesLeft} LEFT</span>
        <span className="text-white/25"> · </span>
        <span className="text-[#ffd27a]">⛀ {gold}</span>
        <span className="text-white/25"> · </span>
        <span className="text-[#c8a8ff]">◈ {astro}</span>
      </div>

      {/* boss bars + status (name · phase · state · brood count) */}
      {snap.bosses.length > 0 && (
        <div className="absolute left-1/2 top-8 z-30 w-60 -translate-x-1/2 space-y-1 sm:w-80">
          {snap.bosses.map((b, i) => {
            const vuln = b.status === 'VULNERABLE';
            return (
              <div key={i}>
                <div className="flex items-center justify-between text-[7px] tracking-[0.2em] sm:text-[9px]">
                  <span className="text-[#ff5d6e]">{b.name}</span>
                  <span className={vuln ? 'text-[#aef5c8]' : b.status === 'POUNCING' ? 'text-[#ffd27a]' : 'text-white/45'}>
                    PHASE {['I', 'II', 'III', 'IV'][b.phase - 1]} · {b.status}
                  </span>
                </div>
                {b.shield != null && b.shield > 0 && (
                  <div className="mb-0.5 h-1 w-full overflow-hidden rounded border border-[#7fdfff]/40 bg-black/50">
                    <div className="h-full transition-[width] duration-200" style={{ width: `${b.shield * 100}%`, backgroundColor: '#7fdfff' }} />
                  </div>
                )}
                <div className={`h-2 w-full overflow-hidden rounded border bg-black/50 ${vuln ? 'border-[#aef5c8]/70' : 'border-[#ff5d6e]/40'}`}>
                  <div
                    className="h-full transition-[width] duration-200"
                    style={{ width: `${b.ratio * 100}%`, backgroundColor: vuln ? '#aef5c8' : '#ff5d6e' }}
                  />
                </div>
                {b.brood > 0 && <div className="text-right text-[6px] tracking-[0.15em] text-[#9cff6a]/70 sm:text-[7px]">{b.name === 'STAR DESTROYER' ? 'FIGHTERS' : 'BROOD ACTIVE'}: {b.brood}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* Boss OVERDRIVE: weapons empowered ×2.5 for the fight */}
      {snap.overdrive && (
        <div className="absolute bottom-24 left-1/2 z-30 -translate-x-1/2 rounded border border-[#ff3a3a]/60 bg-[#ff2a2a]/15 px-3 py-1 text-[8px] tracking-[0.25em] text-[#ff8a8a] sm:text-[10px]" style={{ textShadow: '0 0 8px rgba(255,50,50,0.7)' }}>
          ⚡ OVERDRIVE ×2.5
        </div>
      )}

      {/* health + overshield (glass) — becomes visually dominant at low HP */}
      <div
        className={`absolute bottom-4 left-4 rounded-lg border px-2.5 py-1.5 backdrop-blur-sm transition-all duration-200 ${hud.lowHealth ? 'origin-bottom-left scale-110 border-[#ff5d6e] bg-[#ff5d6e]/15' : pickup ? 'border-[#aef5c8]/70 bg-[#aef5c8]/10' : 'border-white/10 bg-black/40'}`}
        style={hud.lowHealth ? { boxShadow: '0 0 14px rgba(255,93,110,0.5)', opacity: 1 } : undefined}
      >
        <div className="mb-1 flex items-center gap-1.5 text-[7px] text-white/55 sm:text-[8px]">
          <span>HP {Math.round(snap.health)}/{snap.maxHp}</span>
          {snap.armor > 0 && <span className="text-[#5ad0ff]">◆ {Math.round(snap.armor)}</span>}
          {snap.shieldOverloaded && <span className="text-[#ff8a3a]">⚠ OVERLOAD</span>}
        </div>
        <div className="h-2 w-28 overflow-hidden rounded-full bg-white/15 sm:w-36">
          <div
            className="h-full transition-[width] duration-150"
            style={{ width: `${(snap.health / snap.maxHp) * 100}%`, backgroundColor: snap.health / snap.maxHp > 0.35 ? '#aef5c8' : '#ff5d6e' }}
          />
        </div>
        {/* overshield bar (cyan), shown only while armor > 0 */}
        {snap.armor > 0 && (
          <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-white/10 sm:w-36">
            <div className="h-full bg-[#5ad0ff] transition-[width] duration-150" style={{ width: `${(snap.armor / snap.maxArmor) * 100}%` }} />
          </div>
        )}
        {/* stamina bar (amber) — shown while depleting/refilling */}
        {snap.stamina != null && snap.stamina < 0.999 && (
          <div className="mt-1 h-1 w-28 overflow-hidden rounded-full bg-white/10 sm:w-36">
            <div className="h-full bg-[#ffd27a] transition-[width] duration-100" style={{ width: `${snap.stamina * 100}%` }} />
          </div>
        )}
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
        ) : snap.heat != null ? (
          <div className={`text-[9px] sm:text-[11px] ${isTouch ? 'flex flex-col items-center' : 'flex flex-col items-end'}`}>
            <span className={snap.overheated ? 'text-[#ff5d6e]' : 'text-[#7fdfff]'}>{snap.overheated ? 'OVERHEAT' : 'ENERGY'}</span>
            <div className="mt-0.5 h-1.5 w-20 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full" style={{ width: `${Math.round(snap.heat * 100)}%`, backgroundColor: snap.overheated ? '#ff5d6e' : snap.heat > 0.7 ? '#ffd27a' : '#7fdfff' }} />
            </div>
          </div>
        ) : (
          <div className="text-[13px] sm:text-[17px]">
            <span className={snap.mag <= 3 ? 'text-[#ff5d6e]' : 'text-white'}>{snap.mag}</span>
            <span className="text-white/40"> / {snap.reserve}</span>
            {snap.charge != null && snap.charge > 0 && (
              <div className={`mt-0.5 h-1 w-20 overflow-hidden rounded-full bg-white/10 ${isTouch ? 'mx-auto' : 'ml-auto'}`}>
                <div className="h-full rounded-full bg-[#9ec8ff]" style={{ width: `${Math.round(snap.charge * 100)}%` }} />
              </div>
            )}
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
