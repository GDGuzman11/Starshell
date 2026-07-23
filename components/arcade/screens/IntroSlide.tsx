'use client';

/**
 * OUTLANDER INTRO SLIDE — the cinematic that plays after NEW GAME on the Title Page.
 * ONE full-screen art panel (public/starshell/outlander-intro.png) with a slow Ken-Burns
 * push, an optional sourced music cue (degrades to SILENT if the file is absent — the
 * player never throws), and a short Outlander-POV blurb bottom-right. Advances on
 * `Continue ▸`, a `Skip`, or auto after ~8s → onDone (the loadout screen).
 *
 * Presentation asset (image + music) — a deliberate, contained departure from the game's
 * zero-asset canon; the game world itself stays procedural.
 */
import { useEffect, useRef, useState } from 'react';

const IMG = '/starshell/outlander-intro.png';
const MUSIC = '/audio/outlander-intro.mp3'; // drop a CC0 cue here; silent until present
const AUTO_MS = 8000;

export function IntroSlide({ onDone, reducedMotion = false, volume = 0.85 }: { onDone: () => void; reducedMotion?: boolean; volume?: number }) {
  const [leaving, setLeaving] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    // Fade the music out, then hand off.
    const a = audioRef.current;
    if (a && !a.paused) {
      const fade = setInterval(() => {
        a.volume = Math.max(0, a.volume - 0.08);
        if (a.volume <= 0.001) { clearInterval(fade); a.pause(); }
      }, 40);
    }
    setLeaving(true);
    setTimeout(onDone, reducedMotion ? 0 : 420);
  };

  // Music — this mounts right after the NEW GAME click, so autoplay-with-sound is allowed.
  // Any failure (missing file, blocked) is swallowed → the slide simply plays silent.
  useEffect(() => {
    if (volume <= 0) return;
    const a = new Audio(MUSIC);
    a.loop = true;
    a.volume = 0;
    audioRef.current = a;
    a.play()
      .then(() => {
        const target = Math.min(1, volume) * 0.8;
        const fade = setInterval(() => {
          a.volume = Math.min(target, a.volume + 0.04);
          if (a.volume >= target - 0.001) clearInterval(fade);
        }, 60);
      })
      .catch(() => {}); // no file / autoplay blocked → silent, no error
    return () => { a.pause(); audioRef.current = null; };
  }, [volume]);

  // Auto-advance.
  useEffect(() => {
    const t = setTimeout(finish, AUTO_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`absolute inset-0 z-[80] bg-black ${leaving ? 'opacity-0' : 'opacity-100'} transition-opacity duration-[420ms]`}>
      {/* Keyframe inlined so it ports with the component (globals.css isn't synced to the standalone repo). */}
      <style>{'@keyframes ss-kenburns{from{transform:scale(1) translateY(0)}to{transform:scale(1.09) translateY(-1.5%)}}'}</style>
      {/* The panel — contain on black letterbox so the whole art + its baked caption show. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- full-screen cinematic in the code-split /arcade chunk; next/image adds no value here */}
      <img
        src={IMG}
        alt="The Outlander stands alone over the fallen as the alien fleet fills the sky."
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
        style={reducedMotion ? undefined : { animation: 'ss-kenburns 14s ease-out both' }}
        draggable={false}
      />
      {/* Subtle vignette for depth. */}
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 50% 45%, transparent 55%, rgba(0,0,0,0.55) 100%)' }} />

      {/* Outlander-POV blurb — bottom-right. */}
      <div className="absolute bottom-6 right-4 max-w-[min(88vw,420px)] border-l-2 border-[#ff7a2a]/80 bg-black/55 px-4 py-3 backdrop-blur-sm sm:bottom-10 sm:right-8">
        <p className="font-pixel text-[8px] uppercase tracking-[0.28em] text-[#ff7a2a]/90">{'// OUTLANDER'}</p>
        <p className="mt-2 text-[12px] leading-relaxed text-white/90 sm:text-[13px]">
          Okay so &mdash; everyone&rsquo;s dead, there&rsquo;s a warship the size of my problems parked in the sky,
          and I&rsquo;m standing on what&rsquo;s left of my squad. Command&rsquo;s not answering. Reinforcements aren&rsquo;t
          coming. Fresh out of people to disappoint. Cool. Fuck it &mdash; let&rsquo;s see what I can do.
        </p>
      </div>

      {/* Skip (top-right) + Continue (bottom-center). */}
      <button type="button" onClick={finish} className="absolute right-3 top-3 z-[81] font-pixel text-[9px] uppercase tracking-[0.2em] text-white/50 transition-colors hover:text-white">
        Skip ▸
      </button>
      <button
        type="button"
        onClick={finish}
        className="absolute bottom-6 left-1/2 z-[81] min-h-[44px] -translate-x-1/2 rounded-md border border-[#aef5c8]/40 bg-[#aef5c8]/10 px-8 font-pixel text-[11px] uppercase tracking-[0.15em] text-[#aef5c8] transition-colors hover:bg-[#aef5c8]/20 sm:bottom-8"
      >
        Continue ▸
      </button>
    </div>
  );
}
