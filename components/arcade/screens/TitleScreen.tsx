'use client';

/**
 * TITLE PAGE — the cinematic front screen of STARSHELL. A first-person view THROUGH the
 * Outlander's visor onto a war-torn battlefield: a real Three.js scene (reuses the game's
 * buildWorld + post-FX) with a slow surveying camera drift, framed by a helmet-visor
 * overlay (aperture vignette, scanlines, reticle, HUD readouts). Entry buttons:
 * NEW GAME · CONTINUE (if a run is resumable) · ENTER MENU.
 *
 * The scene renderer unmounts before gameplay, so it never runs alongside the game canvas.
 * Degrades to a static backdrop if WebGL is unavailable; reduced-motion freezes the drift.
 */
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { buildWorld } from '../fps/scene';
import { makeComposer } from '../fps/postfx';
import { buildFromLayout, makeBattlefieldLayout } from '../fps/kit/generate';
import type { RenderTier } from '../fps/materials';

export function TitleScreen({
  canResume,
  onNewGame,
  onContinue,
  onHangar,
  onExit,
  reducedMotion = false,
  isTouch = false,
}: {
  canResume: boolean;
  onNewGame: () => void;
  onContinue: () => void;
  onHangar: () => void;
  onExit?: () => void;
  reducedMotion?: boolean;
  isTouch?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [webglOk, setWebglOk] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: THREE.WebGLRenderer | undefined;
    try {
      const r = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
      renderer = r;
      r.setPixelRatio(1);
      const lowMem = typeof navigator !== 'undefined' && (navigator as Navigator & { deviceMemory?: number }).deviceMemory !== undefined && ((navigator as Navigator & { deviceMemory?: number }).deviceMemory as number) < 4;
      const tier: RenderTier = isTouch || lowMem ? 'mobile' : 'desktop';

      const seed = Math.floor(Math.random() * 1e9);
      const level = buildFromLayout(makeBattlefieldLayout('wartorn', 208, seed));
      const world = buildWorld(level, tier);
      const half = level.size / 2;

      const camera = new THREE.PerspectiveCamera(68, 16 / 9, 0.1, 500);
      const baseX = 0;
      const baseY = 2.7; // eye height, surveying over the field
      camera.position.set(baseX, baseY, half * 0.82);
      camera.lookAt(0, 2, -half * 0.3);

      const composer = makeComposer(renderer, world.scene, camera, tier, 640, 360);
      const BASE_H = tier === 'mobile' ? 270 : 360;

      const resize = () => {
        const host = canvas.parentElement;
        const cw = host?.clientWidth || window.innerWidth;
        const ch = host?.clientHeight || window.innerHeight;
        const aspect = cw / ch || 16 / 9;
        canvas.style.width = `${cw}px`;
        canvas.style.height = `${ch}px`;
        const h = BASE_H;
        const w = Math.round(h * aspect);
        r.setSize(w, h, false);
        composer.composer.setSize(w, h);
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
      };
      resize();
      window.addEventListener('resize', resize);

      let raf = 0;
      const t0 = performance.now();
      const loop = () => {
        if (!reducedMotion) {
          const t = (performance.now() - t0) / 1000;
          camera.position.x = baseX + Math.sin(t * 0.05) * 9; // slow lateral survey
          camera.position.y = baseY + Math.sin(t * 0.35) * 0.06; // subtle breath
          camera.lookAt(Math.sin(t * 0.06) * 22, 2.1 + Math.sin(t * 0.2) * 0.3, -half * 0.3);
        }
        composer.composer.render();
        raf = requestAnimationFrame(loop);
      };
      loop();

      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', resize);
        world.dispose();
        composer.composer.dispose();
        r.dispose();
      };
    } catch {
      setWebglOk(false);
      try { renderer?.dispose(); } catch { /* ignore */ }
      return;
    }
  }, [isTouch, reducedMotion]);

  return (
    <div className="absolute inset-0 z-[70] overflow-hidden bg-black">
      <style>{'@keyframes ss-scan{from{transform:translateY(0)}to{transform:translateY(3px)}}@keyframes ss-blink{0%,60%{opacity:1}61%,100%{opacity:0.25}}'}</style>

      {/* Battlefield (WebGL) or a static fallback backdrop. */}
      {webglOk ? (
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full [image-rendering:pixelated]" />
      ) : (
        <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 50% 40%, #2a1c12 0%, #120a08 55%, #000 100%)' }} />
      )}

      {/* ── VISOR OVERLAY ─────────────────────────────────────────────────────── */}
      {/* Aperture vignette — darkens the frame edges into a helmet slit. */}
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(135% 100% at 50% 50%, transparent 38%, rgba(0,0,0,0.82) 76%, #000 100%)' }} />
      {/* Faint HUD glass tint at the edges. */}
      <div className="pointer-events-none absolute inset-0" style={{ boxShadow: 'inset 0 0 120px 20px rgba(127,223,255,0.06)' }} />
      {/* Scanlines. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{ background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.28) 0px, rgba(0,0,0,0.28) 1px, transparent 1px, transparent 3px)', animation: reducedMotion ? undefined : 'ss-scan 0.5s steps(3) infinite' }}
      />

      {/* Reticle. */}
      <svg className="pointer-events-none absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 text-[#7fdfff]/70" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1">
        <circle cx="20" cy="20" r="1.6" fill="currentColor" stroke="none" />
        <path d="M20 4v7M20 29v7M4 20h7M29 20h7" />
        <path d="M8 8l3 3M32 8l-3 3M8 32l3-3M32 32l-3-3" opacity="0.5" />
      </svg>

      {/* Exit to the Pilot Console (/play). */}
      {onExit && (
        <button type="button" onClick={onExit} className="absolute right-3 top-3 z-[71] min-h-[36px] rounded-md border border-white/20 bg-black/40 px-3 font-pixel text-[8px] uppercase tracking-[0.15em] text-white/60 backdrop-blur-sm transition-colors hover:text-white sm:text-[9px]">
          ◂ Console
        </button>
      )}
      {/* HUD readouts. */}
      <div className="pointer-events-none absolute left-3 top-3 font-pixel text-[8px] leading-relaxed tracking-[0.2em] text-[#7fdfff]/80">
        <div>STARSHELL // OUTLANDER</div>
        <div className="text-[#ff7a2a]/80">UNIT 0-41 · SOLE ACTIVE</div>
        <div style={{ animation: reducedMotion ? undefined : 'ss-blink 1.6s steps(1) infinite' }}>◉ LINK: LIVE</div>
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 font-pixel text-[8px] tracking-[0.2em] text-white/45">SECTOR: CONTESTED · THREAT: EXTREME</div>

      {/* ── TITLE + ENTRY BUTTONS ─────────────────────────────────────────────── */}
      <div className="absolute inset-x-0 top-[16%] flex flex-col items-center px-4 text-center">
        <h1 className="font-pixel text-[34px] leading-none tracking-[0.14em] text-white drop-shadow-[0_2px_18px_rgba(127,223,255,0.35)] sm:text-[54px]">STARSHELL</h1>
        <p className="mt-3 font-pixel text-[8px] uppercase tracking-[0.32em] text-[#ff7a2a]/90 sm:text-[10px]">They wrote you off as the last one</p>
      </div>

      <div className="absolute inset-x-0 bottom-[14%] flex flex-col items-center gap-3 px-4">
        <button type="button" onClick={onNewGame} className="min-h-[48px] w-[240px] rounded-md border border-[#aef5c8]/50 bg-[#aef5c8]/10 font-pixel text-[13px] uppercase tracking-[0.18em] text-[#aef5c8] transition-colors hover:bg-[#aef5c8]/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#aef5c8]">
          New Game
        </button>
        {canResume && (
          <button type="button" onClick={onContinue} className="min-h-[44px] w-[240px] rounded-md border border-[#7fdfff]/40 bg-[#7fdfff]/10 font-pixel text-[11px] uppercase tracking-[0.18em] text-[#7fdfff] transition-colors hover:bg-[#7fdfff]/20">
            Continue
          </button>
        )}
        <button type="button" onClick={onHangar} className="min-h-[44px] w-[240px] rounded-md border border-white/25 bg-black/30 font-pixel text-[11px] uppercase tracking-[0.18em] text-white/70 transition-colors hover:text-white hover:bg-black/50">
          Hangar
        </button>
      </div>
    </div>
  );
}
