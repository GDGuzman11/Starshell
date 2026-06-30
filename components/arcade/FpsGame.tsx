'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CRTFrame } from './ui/CRTFrame';
import { FpsControls } from './ui/FpsControls';
import { FpsHud } from './ui/FpsHud';
import { FpsLoadout } from './screens/FpsLoadout';
import { OrientationGate } from './mobile/OrientationGate';
import { FpsShop } from './screens/FpsShop';
import { FpsCustomize } from './screens/FpsCustomize';
import { useFpsLoop, type FpsGameState, type FpsSnapshot } from './useFpsLoop';
import { makeArena3D } from './fps/level3d';
import { makePlayer3 } from './fps/physics';
import { spawnEnemies, spawnBosses, makeHuntMemory, type BossKind, type Difficulty, type HuntMemory } from './fps/enemy';
import { gunById, throwById } from './fps/weapons';
import { applyUpgrades, basicUpg, freshUpg, costFor, MAX_LEVEL, type Upg, type UpgradeKey } from './fps/customize';

type Mode = 'menu' | 'loadout' | 'play' | 'shop' | 'complete' | 'customize';
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
  // Squad learning, persisted across a run's levels (reset on a new campaign) so
  // later fights hunt the player smarter. The SAME object feeds every level's squad.
  const huntMemRef = useRef<HuntMemory | null>(null);
  const [mode, setMode] = useState<Mode>('menu');
  const [diff, setDiff] = useState<Difficulty>('normal');
  const [enemies, setEnemies] = useState(2);
  const [isTouch, setIsTouch] = useState(false);
  const [portrait, setPortrait] = useState(false);
  const [snap, setSnap] = useState<FpsSnapshot | null>(null);
  const [lastLoadout, setLastLoadout] = useState<Loadout>({ p1: 'ar', p2: 'rail', sa: 'sidearm', th: 'frag' });
  const [run, setRun] = useState<{ level: number; gold: number; maxHp: number; upgrades: Record<string, Upg> }>({ level: 1, gold: 0, maxHp: 100, upgrades: {} });
  const [loadoutReturn, setLoadoutReturn] = useState<'campaign' | 'shop'>('campaign');
  // Cumulative run stats (across all levels of one campaign) for the match-end card.
  const [runStats, setRunStats] = useState({ kills: 0, shots: 0, hits: 0, dmg: 0, startedAt: 0, endedAt: 0 });
  // Per-level cinematic intro (wave title + countdown), cleared by its own timer.
  const [intro, setIntro] = useState<{ level: number; boss: boolean } | null>(null);
  const [best, setBest] = useState(0);
  const [sensitivity, setSensitivityState] = useState(1.5);
  const [fullscreen, setFullscreen] = useState(false); // real Fullscreen API active
  const [pseudoFs, setPseudoFs] = useState(false); // CSS fallback (iOS Safari)
  const fsActive = fullscreen || pseudoFs;
  const [showSettings, setShowSettings] = useState(false);
  const [cfg, setCfg] = useState({ aimAssist: true, invertY: false, leftHanded: false, joyOpacity: 1, btnScale: 1 });

  const portraitPaused = isTouch && portrait; // landscape-only on phones
  const onSnapshot = useCallback((s: FpsSnapshot) => setSnap(s), []);
  const { setMoveAxis, addLook, cycleWeapon, cycleZoom, setSensitivity, setAimAssist, setInvertY, throwGrenade, jump, reload } = useFpsLoop(canvasRef, gameRef, mode === 'play' && !portraitPaused, onSnapshot);

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

  // Load saved touch/aim settings once.
  useEffect(() => {
    try {
      const raw = localStorage.getItem('starshell.cfg');
      if (raw) setCfg((c) => ({ ...c, ...JSON.parse(raw) }));
    } catch {
      /* ignore */
    }
  }, []);

  // Push settings into the loop + persist on change.
  useEffect(() => {
    setAimAssist(cfg.aimAssist);
    setInvertY(cfg.invertY);
    try {
      localStorage.setItem('starshell.cfg', JSON.stringify(cfg));
    } catch {
      /* ignore */
    }
  }, [cfg, setAimAssist, setInvertY]);

  // Track portrait/landscape (phones only) to gate the landscape-only game.
  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)');
    const update = () => setPortrait(mq.matches);
    update();
    mq.addEventListener('change', update);
    window.addEventListener('resize', update);
    return () => {
      mq.removeEventListener('change', update);
      window.removeEventListener('resize', update);
    };
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

  // Pseudo-fullscreen (iOS fallback): lock page scroll while the CSS overlay is
  // covering the viewport, and let the hardware Back / Esc key drop out of it.
  useEffect(() => {
    if (!pseudoFs) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPseudoFs(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [pseudoFs]);

  const toggleFullscreen = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    // Already in some fullscreen → leave it.
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
      setPseudoFs(false);
      return;
    }
    if (pseudoFs) {
      setPseudoFs(false);
      return;
    }
    // Prefer the real API; on iOS Safari (no element fullscreen) or a rejection,
    // fall back to the CSS pseudo-fullscreen overlay.
    const canReal = document.fullscreenEnabled && typeof el.requestFullscreen === 'function';
    if (canReal) {
      el.requestFullscreen()
        .then(() => {
          // Best-effort landscape lock on phones; ignore where unsupported.
          (screen.orientation as unknown as { lock?: (o: string) => Promise<void> })?.lock?.('landscape').catch(() => {});
        })
        .catch(() => setPseudoFs(true));
    } else {
      setPseudoFs(true);
    }
  }, [pseudoFs]);

  const startLevel = useCallback(
    (level: number, lo: Loadout, maxHp: number, ups: Record<string, Upg>) => {
      resolvedRef.current = false;
      const seed = (Date.now() ^ Math.floor(Math.random() * 0xffff)) & 0x7fffffff;
      const isBoss = level % 5 === 0;
      const lvl = makeArena3D(isBoss ? 5 : campaignEnemies(level, enemies), seed);
      const guns = [gunById(lo.p1), gunById(lo.p2), gunById(lo.sa)].map((g) => applyUpgrades(g, ups[g.id]));
      const thrown = throwById(lo.th);
      const player = makePlayer3(lvl.spawn);
      player.health = maxHp;
      const bossKinds: BossKind[] = level === 20 ? ['xeno', 'warrior', 'octopus'] : level === 15 ? ['octopus'] : level === 10 ? ['warrior'] : ['xeno'];
      const mobs = isBoss ? spawnBosses(lvl, bossKinds, Math.random) : spawnEnemies(lvl, campaignEnemies(level, enemies), level, Math.random);
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
        shotsFired: 0,
        shotsHit: 0,
        dmgDealt: 0,
        regenT: 0,
        squad: { lastKnown: null, t: 0, mem: (huntMemRef.current ??= makeHuntMemory()) },
        maxHp,
      };
      setSnap(null);
      setIntro({ level, boss: isBoss });
      setMode('play');
    },
    [enemies, diff],
  );

  const beginCampaign = useCallback(
    (lo: Loadout) => {
      // Every loadout gun starts with the free basic enhancement.
      const ups: Record<string, Upg> = {};
      for (const id of [lo.p1, lo.p2, lo.sa]) ups[id] = basicUpg();
      huntMemRef.current = makeHuntMemory(); // fresh learning each new campaign
      setRun({ level: 1, gold: 0, maxHp: 100, upgrades: ups });
      setRunStats({ kills: 0, shots: 0, hits: 0, dmg: 0, startedAt: Date.now(), endedAt: 0 });
      startLevel(1, lo, 100, ups);
    },
    [startLevel],
  );

  const buyUpgrade = useCallback((gunId: string, key: UpgradeKey) => {
    setRun((r) => {
      const up = r.upgrades[gunId] ?? freshUpg();
      if (up[key] >= MAX_LEVEL) return r;
      const cost = costFor(up[key]);
      if (r.gold < cost) return r;
      return { ...r, gold: r.gold - cost, upgrades: { ...r.upgrades, [gunId]: { ...up, [key]: up[key] + 1 } } };
    });
  }, []);

  // Level cleared / run lost (resolved once per level via the guard ref).
  useEffect(() => {
    if (mode !== 'play' || !snap || snap.status === 'playing' || resolvedRef.current) return;
    resolvedRef.current = true;
    setRunStats((rs) => ({
      ...rs,
      kills: rs.kills + snap.kills,
      shots: rs.shots + snap.shotsFired,
      hits: rs.hits + snap.shotsHit,
      dmg: rs.dmg + snap.dmgDealt,
      endedAt: Date.now(),
    }));
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

  const fullBleed = isTouch; // phones go edge-to-edge; desktop keeps the CRT cabinet
  return (
    <div
      ref={wrapRef}
      className={
        fullBleed
          ? 'fixed inset-0 z-[60] overflow-hidden bg-black'
          : `flex w-full flex-col items-center gap-4 bg-black ${pseudoFs ? 'fixed inset-0 z-[999] justify-center overflow-auto p-2' : ''}`
      }
      style={
        fullBleed
          ? { height: '100dvh', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)', paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }
          : pseudoFs
            ? { paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }
            : undefined
      }
    >
      {!fullBleed && (
        <div className="flex w-full max-w-5xl items-center justify-between px-1">
          <h1 className="font-pixel text-[11px] text-[#7fdfff] sm:text-[13px]">STARSHELL</h1>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="min-h-[32px] font-pixel text-[8px] text-white/50 transition-colors hover:text-white sm:text-[9px]"
              aria-label={fsActive ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {fsActive ? 'EXIT FULLSCREEN' : 'FULLSCREEN'}
            </button>
            <Link href="/" className="font-pixel text-[8px] text-white/50 transition-colors hover:text-white sm:text-[9px]">
              ◂ EXIT
            </Link>
          </div>
        </div>
      )}

      <CRTFrame fullBleed={fullBleed}>
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none [image-rendering:pixelated]" />

        {fullBleed && mode === 'menu' && (
          <Link href="/" className="absolute left-3 top-3 z-[60] font-pixel text-[8px] text-white/60 transition-colors hover:text-white">
            ◂ EXIT
          </Link>
        )}

        {mode === 'play' && snap && snap.status === 'playing' && (
          <>
            <FpsHud snap={snap} level={run.level} gold={run.gold} isTouch={isTouch} />
            <button type="button" onClick={() => setMode('menu')} className="absolute right-3 top-3 z-50 font-pixel text-[8px] text-white/55 transition-colors hover:text-white">
              MENU
            </button>
            {isTouch && (
              <>
                <FpsControls onMove={(s, f) => setMoveAxis(s, f)} onLook={(dx, dy) => addLook(dx, dy)} leftHanded={cfg.leftHanded} opacity={cfg.joyOpacity} />
                {/* Big action buttons, opposite the joystick, clear of the aim region. */}
                <div className={`pointer-events-none absolute bottom-4 z-40 flex flex-col gap-2 ${cfg.leftHanded ? 'left-3 items-start' : 'right-3 items-end'}`}>
                  <div className="flex gap-2">
                    <TouchBtn onTap={reload} label="RELOAD" color="#7fdfff" scale={cfg.btnScale} />
                    <TouchBtn onTap={() => cycleWeapon(1)} label="WPN ▸" color="#ffffff" scale={cfg.btnScale} />
                  </div>
                  <div className="flex gap-2">
                    <TouchBtn onTap={() => cycleZoom()} label="ZOOM" color="#7fdfff" scale={cfg.btnScale} />
                    <TouchBtn onTap={() => throwGrenade()} label="NADE" color="#ffae3a" scale={cfg.btnScale} />
                  </div>
                  <button
                    type="button"
                    onPointerDown={jump}
                    className="pointer-events-auto flex items-center justify-center rounded-2xl border border-[#aef5c8]/40 bg-[#aef5c8]/10 font-pixel text-[9px] text-[#aef5c8] backdrop-blur-sm active:bg-[#aef5c8]/25"
                    style={{ width: 148 * cfg.btnScale, height: 48 * cfg.btnScale }}
                  >
                    JUMP
                  </button>
                </div>
              </>
            )}
            {!isTouch && (
              <p className="pointer-events-none absolute bottom-1 left-1/2 z-20 -translate-x-1/2 font-pixel text-[6px] text-white/35">
                CLICK=FIRE · RMB ZOOM (TAP TO CYCLE) · WASD · SPACE JUMP · 1-3/SCROLL SWAP · R RELOAD · G THROW · LADDERS/ZIPS WALK IN
              </p>
            )}
          </>
        )}

        {mode === 'play' && intro && <MatchIntro key={intro.level} level={intro.level} boss={intro.boss} onDone={() => setIntro(null)} />}

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

            <button type="button" onClick={() => { if (fullBleed && !fsActive) toggleFullscreen(); setLoadoutReturn('campaign'); setMode('loadout'); }} className="mt-6 min-h-[44px] rounded-md border border-[#aef5c8]/40 bg-[#aef5c8]/10 px-8 font-pixel text-[11px] uppercase text-[#aef5c8] transition-colors hover:bg-[#aef5c8]/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#aef5c8] sm:text-[13px]">
              Loadout ▸
            </button>
            <button type="button" onClick={() => setShowSettings(true)} className="mt-3 min-h-[36px] font-pixel text-[8px] uppercase text-white/50 transition-colors hover:text-white sm:text-[9px]">
              ⚙ Settings
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
            onCustomize={() => setMode('customize')}
            onNext={() => { const next = run.level + 1; setRun((r) => ({ ...r, level: next })); startLevel(next, lastLoadout, run.maxHp, run.upgrades); }}
            onExit={() => setMode('menu')}
          />
        )}

        {mode === 'customize' && (
          <FpsCustomize
            gunIds={[lastLoadout.p1, lastLoadout.p2, lastLoadout.sa]}
            upgrades={run.upgrades}
            gold={run.gold}
            onBuy={buyUpgrade}
            onBack={() => setMode('shop')}
          />
        )}

        {mode === 'complete' && (
          <RunStatsCard
            title="CAMPAIGN COMPLETE"
            titleColor="#aef5c8"
            subtitle={`ALL ${LEVELS} LEVELS CLEARED`}
            level={run.level}
            gold={run.gold}
            stats={runStats}
            onRestart={() => beginCampaign(lastLoadout)}
            onMenu={() => setMode('menu')}
          />
        )}

        {dead && snap && (
          <RunStatsCard
            title="YOU DIED"
            titleColor="#ff5d6e"
            subtitle={`FELL ON LEVEL ${run.level}`}
            level={run.level}
            gold={run.gold}
            stats={runStats}
            onRestart={() => beginCampaign(lastLoadout)}
            onMenu={() => setMode('menu')}
          />
        )}
      </CRTFrame>

      <OrientationGate show={fullBleed && portrait} />

      {showSettings && (
        <div
          className="fixed inset-0 z-[210] flex items-center justify-center bg-black/85 px-4 backdrop-blur-md"
          style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="w-full max-w-sm rounded-xl border border-white/10 bg-[#0a0c14]/90 p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-pixel text-[12px] text-[#7fdfff]">SETTINGS</p>
              <button type="button" onClick={() => setShowSettings(false)} className="min-h-[32px] font-pixel text-[9px] text-white/55 hover:text-white">
                DONE
              </button>
            </div>
            <div className="space-y-3">
              <Toggle label="Invert Look Y" on={cfg.invertY} onToggle={() => setCfg((c) => ({ ...c, invertY: !c.invertY }))} />
              {isTouch && (
                <>
                  <Toggle label="Aim Assist" on={cfg.aimAssist} onToggle={() => setCfg((c) => ({ ...c, aimAssist: !c.aimAssist }))} />
                  <Toggle label="Left-handed" on={cfg.leftHanded} onToggle={() => setCfg((c) => ({ ...c, leftHanded: !c.leftHanded }))} />
                  <Slider label="Joystick Opacity" value={cfg.joyOpacity} min={0.2} max={1} step={0.1} onChange={(v) => setCfg((c) => ({ ...c, joyOpacity: v }))} />
                  <Slider label="Button Size" value={cfg.btnScale} min={0.8} max={1.5} step={0.1} onChange={(v) => setCfg((c) => ({ ...c, btnScale: v }))} />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className="flex min-h-[36px] w-full items-center justify-between font-pixel text-[8px] text-white/80 sm:text-[9px]">
      <span>{label}</span>
      <span className={`rounded px-2 py-1 text-[7px] ${on ? 'bg-[#aef5c8]/20 text-[#aef5c8]' : 'bg-white/10 text-white/45'}`}>{on ? 'ON' : 'OFF'}</span>
    </button>
  );
}

function Slider({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <div>
      <p className="font-pixel text-[7px] text-white/55 sm:text-[8px]">
        {label} · {value.toFixed(1)}
      </p>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-[#7fdfff]"
      />
    </div>
  );
}

/** Cinematic per-level intro: wave title + objective + a 3·2·1·GO countdown that
 *  plays over the live arena, then clears itself. Non-blocking (pointer-events-none)
 *  so the player can start moving immediately; reduced-motion skips to GO. */
function MatchIntro({ level, boss, onDone }: { level: number; boss: boolean; onDone: () => void }) {
  const [n, setN] = useState(3);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const t = setTimeout(() => onDoneRef.current(), 500);
      return () => clearTimeout(t);
    }
    let cur = 3;
    setN(3);
    const iv = setInterval(() => {
      cur -= 1;
      setN(cur);
      if (cur <= 0) {
        clearInterval(iv);
        setTimeout(() => onDoneRef.current(), 650);
      }
    }, 700);
    return () => clearInterval(iv);
  }, []);
  return (
    <div className="gdg-cine pointer-events-none absolute inset-0 z-[45] flex flex-col items-center justify-center bg-gradient-to-b from-black/75 via-black/25 to-black/75 font-pixel [animation:gdg-fade-in_0.35s_ease-out]">
      <p className="text-[11px] tracking-[0.3em] text-[#7fdfff] sm:text-[15px] [animation:gdg-rise-in_0.5s_ease-out]">
        {boss ? 'BOSS WAVE' : `WAVE ${level}`}
      </p>
      <p className="mt-2 text-[7px] tracking-[0.28em] text-white/55 sm:text-[9px] [animation:gdg-rise-in_0.6s_ease-out]">
        {boss ? 'ELIMINATE THE BOSS' : 'CLEAR ALL HOSTILES'}
      </p>
      <p key={n} className="mt-6 text-[44px] leading-none text-white sm:text-[60px] [animation:gdg-count-pop_0.7s_ease-out]">
        {n > 0 ? n : 'GO'}
      </p>
    </div>
  );
}

/** Cinematic match-end card: a slow-rising glass panel of run stats (kills, time,
 *  accuracy, damage) shared by the death + campaign-complete screens. */
function RunStatsCard({
  title,
  titleColor,
  subtitle,
  level,
  gold,
  stats,
  onRestart,
  onMenu,
}: {
  title: string;
  titleColor: string;
  subtitle: string;
  level: number;
  gold: number;
  stats: { kills: number; shots: number; hits: number; dmg: number; startedAt: number; endedAt: number };
  onRestart: () => void;
  onMenu: () => void;
}) {
  const secs = stats.startedAt && stats.endedAt ? Math.max(0, Math.round((stats.endedAt - stats.startedAt) / 1000)) : 0;
  const time = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  const acc = stats.shots > 0 ? Math.round((stats.hits / stats.shots) * 100) : 0;
  const rows: [string, string][] = [
    ['LEVEL', String(level)],
    ['KILLS', String(stats.kills)],
    ['TIME', time],
    ['ACCURACY', `${acc}%`],
    ['DAMAGE', stats.dmg.toLocaleString()],
    ['GOLD', `⛀ ${gold}`],
  ];
  return (
    <div className="gdg-cine absolute inset-0 z-50 flex items-center justify-center bg-black/80 px-4 text-center font-pixel [animation:gdg-fade-in_0.5s_ease-out]">
      <div className="w-full max-w-sm [animation:gdg-rise-in_0.55s_ease-out]">
        <p className="text-[18px] sm:text-[26px]" style={{ color: titleColor }}>
          {title}
        </p>
        <p className="mt-1 text-[8px] text-white/55 sm:text-[10px]">{subtitle}</p>
        <div className="mx-auto mt-5 max-w-xs rounded-xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm">
          {rows.map(([k, v], i) => (
            <div
              key={k}
              className="flex items-center justify-between border-b border-white/[0.06] py-1.5 last:border-0 [animation:gdg-fade-in_0.4s_ease-out_both]"
              style={{ animationDelay: `${0.25 + i * 0.08}s` }}
            >
              <span className="text-[8px] text-white/45 sm:text-[9px]">{k}</span>
              <span className="text-[11px] text-white sm:text-[13px]">{v}</span>
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-center gap-2">
          <button type="button" onClick={onRestart} className="min-h-[44px] rounded-md border border-[#aef5c8]/40 bg-[#aef5c8]/10 px-4 font-pixel text-[9px] uppercase text-[#aef5c8] hover:bg-[#aef5c8]/20 sm:text-[11px]">
            Restart Run
          </button>
          <button type="button" onClick={onMenu} className="min-h-[44px] rounded-md border border-white/20 bg-white/5 px-4 font-pixel text-[9px] uppercase text-white/70 hover:bg-white/10 sm:text-[11px]">
            Menu
          </button>
        </div>
      </div>
    </div>
  );
}

/** A large glass action button for touch (fires on press, not click). */
function TouchBtn({ onTap, label, color, scale = 1 }: { onTap: () => void; label: string; color: string; scale?: number }) {
  return (
    <button
      type="button"
      onPointerDown={onTap}
      className="pointer-events-auto flex items-center justify-center rounded-2xl border bg-black/40 font-pixel text-[8px] backdrop-blur-sm active:brightness-150"
      style={{ borderColor: `${color}66`, color, width: 64 * scale, height: 64 * scale }}
    >
      {label}
    </button>
  );
}
