'use client';

import type { ReactNode } from 'react';

/**
 * Retro CRT cabinet that frames the game screen inside the cosmic site. A dark
 * bezel with a 16:9 inner screen, scanline + vignette overlays, and a soft glow.
 * The scanline drift is a CSS animation, so the global reduced-motion guard
 * collapses it automatically.
 */
export function CRTFrame({ children, fullBleed = false }: { children: ReactNode; fullBleed?: boolean }) {
  // fullBleed (mobile): the screen fills its parent edge-to-edge, no bezel; the
  // game decides its own aspect. Otherwise the framed 16:9 cabinet for desktop.
  const outer = fullBleed
    ? 'relative h-full w-full bg-black'
    : 'relative w-full max-w-5xl rounded-[22px] border border-white/10 bg-[#0a0c14] p-3 shadow-[0_30px_120px_-40px_rgba(110,168,255,0.5)] sm:p-5';
  const inner = fullBleed
    ? 'relative h-full w-full overflow-hidden bg-black'
    : 'relative aspect-[16/9] w-full overflow-hidden rounded-[12px] bg-black ring-1 ring-inset ring-[#6ea8ff]/25';
  return (
    <div className={outer}>
      <div className={inner}>
        {children}
        {/* Scanlines */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 opacity-[0.18]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 2px, rgba(0,0,0,0.5) 3px, rgba(0,0,0,0) 4px)',
            animation: 'gdg-scanline 6s linear infinite',
          }}
        />
        {/* Vignette + screen tint */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20"
          style={{
            background:
              'radial-gradient(120% 120% at 50% 40%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)',
          }}
        />
      </div>
    </div>
  );
}
