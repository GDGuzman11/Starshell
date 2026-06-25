'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CRTFrame } from './ui/CRTFrame';
import { FpsControls } from './ui/FpsControls';
import { FpsHud } from './ui/FpsHud';
import { FpsLoadout } from './screens/FpsLoadout';
import { FpsShop } from './screens/FpsShop';
import { useFpsLoop, type FpsGameState, type FpsSnapshot } from './useFpsLoop';
import { makeArena3D } from './fps/level3d';
import { makePlayer3 } from './fps/physics';
import { spawnEnemies, spawnBosses, type BossKind, type Difficulty } from './fps/enemy';
import { gunById, throwById } from './fps/weapons';

type Mode = 'menu' | 'loadout' | 'play' | 'shop' | 'complete';
type Loadout = { p1: string; p2: string; sa: string; th: string };

const LEVELS = 20;
const ARMOR_COST = 100;
const TIERS: Difficulty[] = ['normal', 'hard', 'nightmare'];
const campaignEnemies = (level: number, base: number) => Math.min(8, base + Math.floor((level - 1) / 2));
const campaignDiff = (base: Difficulty, level: number): Difficulty =>
  TIERS[Math.min(2, TIERS.indexOf(base) + (level > 14 ? 2 : level > 7 ? 1 : 0))];
const goldFor = (level: number, kills: number) => 50 + level * 12 + kills * 15;

function saveBest(level: number) {
  try {
    const b = Number(localStorage.getItem('starshell.best') || 0);
    if (level > b) localStorage.setItem('starshell.best', String(level));
  } catch {
    /* ignore */
  }
}

/**
 * STARSHELL — the "Have Fun!" FPS. A '93-pixel Three.js arena shooter: rifle/MG/
 * laser/sniper/pistol arsenal + frag/smoke throwables vs line-of-sight-gated,
 * squad-coordinated adaptive aliens, across a 20-level campaign with a gold
 * armory between levels.
 */
export function FpsGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<FpsGameState | null>(null);
  const resolvedRef = useRef(false); // guards one-shot win/lose handling per level
  const [mode, setMode] = useState<Mode>('menu');
  const [diff, setDiff] = useState<Difficulty>('normal');
  const [enemies, setEnemies] = useState(2);
  const [isTouch, setIsTouch] = useState(false);
  const [snap, setSnap] = useState<FpsSnapshot | null>(null);
  const [lastLoadout, setLastLoadout] = useState<Loadout>({ p1: 'ar', p2: 'rail', sa: 'sidearm', th: 'frag' });
  const [run, setRun] = useState({ level: 1, gold: 0, maxHp: 100 });
  const [loadoutReturn, setLoadoutReturn] = useState<'campaign' | 'shop'>('campaign');
  const [best, setBest] = useState(0);
  const [sensitivity, setSensitivityState] = useState(1.5);
  const [fullscreen, setFullscreen] = useState(false);

  const onSnapshot = useCallback((s: FpsSnapshot) => setSnap(s), []);
  const { setMoveAxis, addLook, cycleWeapon, cycleZoom, setSensitivity, throwGrenade } = useFpsLoop(canvasRef, gameRef, mode === 'play', onSnapshot);

  useEffect(() => {
    setIsTouch('ontouchstart' in window);
    try {
      setBest(Number(localStorage.getItem('starshell.best') || 0));
      const s = Number(localStorage.getItem('starshell.sens'));
      if (Number.isFinite(s) && s > 0) setSensitivityState(s);
    } catch {
      /* ignore */
    }
  }, []);

  // Keep the loop's look multiplier + the saved value in sync with the slider.
  useEffect(() => {
    setSensitivity(sensitivity);
    try {
      localStorage.setItem('starshell.sens', String(sensitivity));
    } catch {
      /* ignore */
    }
  }, [sensitivity, setSensitivity]);

  // Track real fullscreen state (covers the OS/escape exit too).
  useEffect(() => {
    const onFs = () => setFullscreen(document.fullscreenElement != null);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      el.requestFullscreen?.()
        .then(() => {
          // Best-effort landscape lock on phones; ignore where unsupported.
          (screen.orientation as unknown as { lock?: (o: string) => Promise<void> })?.lock?.('landscape').catch(() => {});
        })
        .catch(() => {});
    }
  }, []);

  const startLevel = useCallback(
    (level: number, lo: Loadout, maxHp: number) => {
      resolvedRef.current = false;
      const seed = (Date.now() ^ Math.floor(Math.random() * 0xffff)) & 0x7fffffff;
      const isBoss = level % 5 === 0;
      const lvl = makeArena3D(isBoss ? 5 : campaignEnemies(level, enemies), seed);
      const guns = [gunById(lo.p1), gunById(lo.p2), gunById(lo.sa)];
      const thrown = throwById(lo.th);
      const player = makePlayer3(lvl.spawn);
      player.health = maxHp;
      const bossKinds: BossKind[] = level === 20 ? ['xeno', 'warrior', 'octopus'] : level === 15 ? ['octopus'] : level === 10 ? ['warrior'] : ['xeno'];
      const mobs = isBoss ? spawnBosses(lvl, bossKinds, Math.random) : spawnEnemies(lvl, campaignEnemies(level, enemies), Math.random);
      gameRef.current = {
        level: lvl,
        player,
        enemies: mobs,
        difficulty: campaignDiff(diff, level),
        guns,
        active: 0,
        mags: guns.map((g) => g.mag),
        reserves: guns.map((g) => g.reserve),
        ads: false,
        reloading: 0,
        fireCd: 0,
        throwable: thrown,
        throwCount: thrown.count,
        status: 'playing',
        kills: 0,
        regenT: 0,
        squad: { lastKnown: null, t: 0 },
        maxHp,
      };
      setSnap(null);
      setMode('play');
    },
    [enemies, diff],
  );

  const beginCampaign = useCallback(
    (lo: Loadout) => {
      setRun({ level: 1, gold: 0, maxHp: 100 });
      startLevel(1, lo, 100);
    },
    [startLevel],
  );

  // Level cleared / run lost (resolved once per level via the guard ref).
  useEffect(() => {
    if (mode !== 'play' || !snap || snap.status === 'playing' || resolvedRef.current) return;
    resolvedRef.current = true;
    if (snap.status === 'won') {
      setRun((r) => ({ ...r, gold: r.gold + goldFor(r.level, snap.kills) }));
      if (run.level >= LEVELS) {
        saveBest(LEVELS);
        setBest((b) => Math.max(b, LEVELS));
        setMode('complete');
      } else {
        setMode('shop');
      }
    } else {
      saveBest(run.level);
      setBest((b) => Math.max(b, run.level));
    }
  }, [snap, mode, run.level]);

  useEffect(() => {
    if (mode !== 'play') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMode('menu');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode]);

  const dead = mode === 'play' && snap != null && snap.status === 'lost';
  useEffect(() => {
    if (dead && document.pointerLockElement) document.exitPointerLock?.();
  }, [dead]);

  return (
    <div ref={wrapRef} className="flex w-full flex-col items-center gap-4 bg-black">
      <div className="flex w-full max-w-5xl items-center justify-between px-1">
        <h1 className="font-pixel text-[11px] text-[#7fdfff] sm:text-[13px]">STARSHELL</h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleFullscreen}
            className="min-h-[32px] font-pixel text-[8px] text-white/50 transition-colors hover:text-white sm:text-[9px]"
            aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {fullscreen ? 'EXIT FULLSCREEN' : 'FULLSCREEN'}
          </button>
          <Link href="/" className="font-pixel text-[8px] text-white/50 transition-colors hover:text-white sm:text-[9px]">
            ◂ EXIT
          </Link>
        </div>
      </div>

      <CRTFrame>
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none [image-rendering:pixelated]" />

        {mode === 'play' && snap && snap.status === 'playing' && (
          <>
            <FpsHud snap={snap} />
            <div className="pointer-events-none absolute left-3 top-3 z-30 font-pixel text-[8px] text-[#ffd27a] sm:text-[10px]">
              LVL {run.level}/{LEVELS} · ⛀ {run.gold}
            </div>
            <button type="button" onClick={() => setMode('menu')} className="absolute right-3 top-3 z-50 font-pixel text-[8px] text-white/55 transition-colors hover:text-white">
              MENU
            </button>
            {isTouch && (
              <>
                <FpsControls onMove={(s, f) => setMoveAxis(s, f)} onLook={(dx, dy) => addLook(dx, dy)} />
                <button type="button" onClick={() => cycleWeapon(1)} className="pointer-events-auto absolute right-3 top-[26%] z-40 rounded-md border border-white/20 bg-black/40 px-3 py-2 font-pixel text-[8px] text-white/80">
                  WPN ▸
                </button>
                <button type="button" onClick={() => cycleZoom()} className="pointer-events-auto absolute right-3 top-[42%] z-40 rounded-md border border-[#7fdfff]/40 bg-[#7fdfff]/10 px-3 py-2 font-pixel text-[8px] text-[#7fdfff]">
                  ZOOM
                </button>
                <button type="button" onClick={() => throwGrenade()} className="pointer-events-auto absolute right-3 top-[58%] z-40 rounded-md border border-[#ffae3a]/40 bg-[#ffae3a]/10 px-3 py-2 font-pixel text-[8px] text-[#ffae3a]">
                  THROW
                </button>
              </>
            )}
            {!isTouch && (
              <p className="pointer-events-none absolute bottom-1 left-1/2 z-20 -translate-x-1/2 font-pixel text-[6px] text-white/35">
                CLICK=FIRE · RMB ZOOM (TAP TO CYCLE) · WASD · SPACE JUMP · 1-3/SCROLL SWAP · R RELOAD · G THROW · LADDERS/ZIPS WALK IN
              </p>
            )}
          </>
        )}

        {mode === 'menu' && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/60 px-4 backdrop-blur-[2px]">
            <p className="font-pixel text-[18px] text-[#7fdfff] sm:text-[26px]">STARSHELL</p>
            <p className="mt-2 font-pixel text-[8px] text-white/60 sm:text-[10px]">VOID ARENA · 20-LEVEL CAMPAIGN</p>
            {best > 0 && <p className="mt-1 font-pixel text-[7px] text-[#ffd27a] sm:text-[9px]">BEST: LEVEL {best}</p>}

            <p className="mt-5 font-pixel text-[7px] text-white/45 sm:text-[8px]">DIFFICULTY</p>
            <div className="mt-2 flex gap-2">
              {TIERS.map((d) => (
                <button key={d} type="button" onClick={() => setDiff(d)} className={`min-h-[38px] rounded-md border px-3 font-pixel text-[8px] uppercase transition-colors sm:text-[9px] ${diff === d ? 'border-[#7fdfff] bg-[#7fdfff]/20 text-[#7fdfff]' : 'border-white/15 bg-white/[0.04] text-white/55 hover:bg-white/10'}`}>
                  {d}
                </button>
              ))}
            </div>

            <p className="mt-4 font-pixel text-[7px] text-white/45 sm:text-[8px]">STARTING SQUAD SIZE</p>
            <div className="mt-2 flex gap-2">
              {[1, 2, 3, 4].map((n) => (
                <button key={n} type="button" onClick={() => setEnemies(n)} className={`h-9 w-9 rounded-md border font-pixel text-[10px] transition-colors ${enemies === n ? 'border-[#aef5c8] bg-[#aef5c8]/20 text-[#aef5c8]' : 'border-white/15 bg-white/[0.04] text-white/55 hover:bg-white/10'}`}>
                  {n}
                </button>
              ))}
            </div>

            <p className="mt-4 font-pixel text-[7px] text-white/45 sm:text-[8px]">
              LOOK SENSITIVITY · {sensitivity.toFixed(1)}×
            </p>
            <input
              type="range"
              min={0.3}
              max={4}
              step={0.1}
              value={sensitivity}
              onChange={(e) => setSensitivityState(Number(e.target.value))}
              aria-label="Look sensitivity"
              className="mt-2 h-1.5 w-56 cursor-pointer appearance-none rounded-full bg-white/15 accent-[#7fdfff]"
            />

            <button type="button" onClick={() => { setLoadoutReturn('campaign'); setMode('loadout'); }} className="mt-6 min-h-[44px] rounded-md border border-[#aef5c8]/40 bg-[#aef5c8]/10 px-8 font-pixel text-[11px] uppercase text-[#aef5c8] transition-colors hover:bg-[#aef5c8]/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#aef5c8] sm:text-[13px]">
              Loadout ▸
            </button>
            <p className="mt-5 max-w-xs text-center font-pixel text-[6px] leading-relaxed text-white/35 sm:text-[8px]">
              {isTouch ? 'LEFT STICK MOVE · RIGHT LOOK · AUTO-FIRE ON TARGET' : 'CLICK TO CAPTURE MOUSE, THEN AIM + FIRE'}
            </p>
          </div>
        )}

        {mode === 'loadout' && (
          <FpsLoadout
            onDeploy={(p1, p2, sa, th) => {
              const lo = { p1, p2, sa, th };
              setLastLoadout(lo);
              if (loadoutReturn === 'campaign') beginCampaign(lo);
              else setMode('shop');
            }}
            onBack={() => setMode(loadoutReturn === 'campaign' ? 'menu' : 'shop')}
          />
        )}

        {mode === 'shop' && (
          <FpsShop
            level={run.level}
            gold={run.gold}
            maxHp={run.maxHp}
            onBuyArmor={() => setRun((r) => (r.gold >= ARMOR_COST ? { ...r, gold: r.gold - ARMOR_COST, maxHp: r.maxHp + 25 } : r))}
            onRefit={() => { setLoadoutReturn('shop'); setMode('loadout'); }}
            onNext={() => { const next = run.level + 1; setRun((r) => ({ ...r, level: next })); startLevel(next, lastLoadout, run.maxHp); }}
            onExit={() => setMode('menu')}
          />
        )}

        {mode === 'complete' && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/75 px-4 text-center font-pixel">
            <p className="text-[16px] text-[#aef5c8] sm:text-[24px]">CAMPAIGN COMPLETE</p>
            <p className="text-[9px] text-[#ffd27a] sm:text-[11px]">ALL {LEVELS} LEVELS CLEARED · GOLD ⛀ {run.gold}</p>
            <button type="button" onClick={() => setMode('menu')} className="mt-4 min-h-[44px] rounded-md border border-white/20 bg-white/5 px-6 font-pixel text-[10px] uppercase text-white/75 hover:bg-white/10 sm:text-[12px]">
              Menu
            </button>
          </div>
        )}

        {dead && snap && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/70 px-4 text-center font-pixel">
            <p className="text-[16px] text-[#ff5d6e] sm:text-[22px]">YOU DIED</p>
            <p className="text-[9px] text-white/60 sm:text-[11px]">REACHED LEVEL {run.level} · KILLS {snap.kills}</p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => beginCampaign(lastLoadout)} className="min-h-[44px] rounded-md border border-[#aef5c8]/40 bg-[#aef5c8]/10 px-4 font-pixel text-[9px] uppercase text-[#aef5c8] hover:bg-[#aef5c8]/20 sm:text-[11px]">
                Restart Run
              </button>
              <button type="button" onClick={() => setMode('menu')} className="min-h-[44px] rounded-md border border-white/20 bg-white/5 px-4 font-pixel text-[9px] uppercase text-white/70 hover:bg-white/10 sm:text-[11px]">
                Menu
              </button>
            </div>
          </div>
        )}
      </CRTFrame>
    </div>
  );
}
