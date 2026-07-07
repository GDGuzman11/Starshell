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
import { FpsArsenal } from './screens/FpsArsenal';
import { FpsArmory } from './screens/FpsArmory';
import { FpsDivision } from './screens/FpsDivision';
import { FpsPremium } from './screens/FpsPremium';
import { AvatarPanel, LoadoutPanel } from './screens/MenuPanels';
import { useFpsLoop, type FpsGameState, type FpsSnapshot } from './useFpsLoop';
import type { Level3D } from './fps/level3d';
import { makeModularArena, buildFromLayout, makeSampleLayout } from './fps/kit/generate';
import { resolveLevel, buildBossArena, campaignTotalLevels, isBossLevel, isGauntletLevel, bossKindFor, GAUNTLET_ORDER } from './fps/kit/levels';
import { LevelEditor } from './screens/LevelEditor';
import type { LevelLayout } from './fps/kit/layout';
import { makePlayer3 } from './fps/physics';
import { spawnEnemies, spawnBosses, spawnBossMinions, makeHuntMemory, assignSquadHomes, fireteamCount, BOSSES, SQUAD_SIZE, type BossKind, type Difficulty, type HuntMemory, type Squad } from './fps/enemy';
import { gunById, throwById } from './fps/weapons';
import { applyUpgrades, basicUpg, freshUpg, costFor, MAX_LEVEL, type Upg, type UpgradeKey } from './fps/customize';
import { applyEngineering } from './fps/arsenal/parts';
import { loadArsenal, saveArsenal, equippedParts, serviceFor, recordOperation } from './fps/arsenal/store';
import { loadMarine, saveMarine, equippedArmorPieces, recordArmorOperation } from './fps/marine/store';
import { emitProgressChanged } from './lib/progressEvent';
import type { RunSlot } from './lib/runSlot';
import type { ScorePayload } from './lib/score';
import { combatBonus } from './fps/marine/stats';
import { milestoneBonus, stageFor } from './fps/arsenal/familiarity';
import { sfx } from './engine/audio';
import { THEME_LIST } from './fps/kit/themes';

type Mode = 'menu' | 'loadout' | 'play' | 'shop' | 'complete' | 'customize' | 'editor' | 'arsenal' | 'armory' | 'division' | 'premium';
type Loadout = { p1: string; p2: string; sa: string; th: string };

const ARMOR_COST = 100;
// Final gauntlet: the 5 TOUGHEST bosses (by HP), one per round, ordered hardest-last.
const GAUNTLET_BOSSES: BossKind[] = ['leviathan', 'monolith', 'infestor', 'behemoth', 'colossus'];
const TIERS: Difficulty[] = ['normal', 'hard', 'nightmare'];
// Player picks a squad count at the menu; it holds for every non-boss level (the
// map is huge). Each squad is a 5-man fireteam → soldiers = squads × SQUAD_SIZE.
const SQUAD_OPTIONS = [2, 4, 6, 8]; // → 10 / 20 / 30 / 40 soldiers
// A modest map-size proxy (the arena grows with squads but never explodes to the
// literal soldier count). Boss levels keep their compact 5-count arena.
const mapCountFor = (squads: number) => 8 + squads;
// The chosen difficulty tier is FIXED for the whole run (no hidden escalation). The
// campaign ramps WITHIN the tier by level — more/tougher enemies (see spawnEnemies).
// Reward scaling: harder difficulty + more enemy squads pay out more of BOTH currencies.
const diffMult = (d: Difficulty) => 1 + TIERS.indexOf(d) * 0.5; // normal ×1 · hard ×1.5 · nightmare ×2
const squadMult = (squads: number) => 1 + (squads - 1) * 0.35; // 1→×1 · 2→×1.35 · 3→×1.7 · 4→×2.05
// GOLD (per-run, spent on damage upgrades between levels): a base + per-level + per-kill.
const goldFor = (level: number, kills: number, diff: Difficulty, squads: number) => Math.round((50 + level * 12 + kills * 15) * diffMult(diff) * squadMult(squads));
// ASTRODIAMONDS (persistent premium wallet, kept across runs): rarer — a small base per
// level + a bit per kill, scaled the same way. Earned every level (win OR loss).
const astroFor = (level: number, kills: number, diff: Difficulty, squads: number) => Math.round((2 + level * 0.3 + kills * 0.5) * diffMult(diff) * squadMult(squads));

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
export function FpsGame({ initialRun, initialScreen, onRunSave, onRunEnd, onScore, onExit }: {
  initialRun?: RunSlot | null; // resume this slot on mount (account-backed)
  initialScreen?: string | null; // open straight to a screen on mount (e.g. 'division')
  onRunSave?: (slot: RunSlot) => void; // persist the run slot at level transitions
  onRunEnd?: (id: string) => void; // the run completed → drop the slot
  onScore?: (s: ScorePayload) => void; // a run resolved (win/loss) → submit to the leaderboard
  onExit?: () => void; // back to the pilot console (site only)
} = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<FpsGameState | null>(null);
  const slotIdRef = useRef<string>(''); // current run-slot id (empty = no account slot)
  const startedAtRef = useRef<number>(0);
  const resumedRef = useRef(false);
  const resolvedRef = useRef(false); // guards one-shot win/lose handling per level
  const sandboxRef = useRef(false); // editor "Play" sandbox → win/lose returns to the editor
  const bossOverrideRef = useRef<BossKind | null>(null); // dev: force a specific boss on warp
  // Squad learning, persisted across a run's levels (reset on a new campaign) so
  // later fights hunt the player smarter. The SAME object feeds every level's squad.
  const huntMemRef = useRef<HuntMemory | null>(null);
  const [mode, setMode] = useState<Mode>('menu');
  const [diff, setDiff] = useState<Difficulty>('normal');
  const [squads, setSquads] = useState(2); // number of enemy fireteams per non-boss level
  const [isTouch, setIsTouch] = useState(false);
  const [portrait, setPortrait] = useState(false);
  const [snap, setSnap] = useState<FpsSnapshot | null>(null);
  const [lastLoadout, setLastLoadout] = useState<Loadout>({ p1: 'ar01', p2: 'rt06', sa: 'sp01', th: 'frag' }); // Standard Issue recruit kit
  const [run, setRun] = useState<{ level: number; gold: number; maxHp: number; upgrades: Record<string, Upg> }>({ level: 1, gold: 0, maxHp: 100, upgrades: {} });
  const [loadoutReturn, setLoadoutReturn] = useState<'campaign' | 'shop'>('campaign');
  // Cumulative run stats (across all levels of one campaign) for the match-end card.
  const [runStats, setRunStats] = useState({ kills: 0, headshots: 0, shots: 0, hits: 0, dmg: 0, startedAt: 0, endedAt: 0 });
  // Per-level cinematic intro (wave title + countdown), cleared by its own timer.
  const [intro, setIntro] = useState<{ level: number; boss: boolean } | null>(null);
  // Gauntlet (lvl 20): current round 1-3, and the between-rounds recovery overlay.
  const gauntletRef = useRef(0);
  const [recovery, setRecovery] = useState<number | null>(null); // upcoming round shown during recovery
  const [best, setBest] = useState(0);
  const [astro, setAstro] = useState(0); // Astrodiamonds — persistent premium wallet (across runs)
  const [lastAstro, setLastAstro] = useState(0); // AD earned on the level just finished (for the end/shop card)
  const [famNote, setFamNote] = useState<string | null>(null); // transient "Familiarity Increased" toast
  const spendAstro = useCallback((n: number) => {
    setAstro((a) => {
      const v = Math.max(0, a - n);
      try {
        localStorage.setItem('starshell.astro', String(v));
      } catch {
        /* ignore */
      }
      return v;
    });
  }, []);
  const [campaignLen, setCampaignLen] = useState(20); // display only; real value read on mount (client)
  const [sensitivity, setSensitivityState] = useState(1.5);
  const [fullscreen, setFullscreen] = useState(false); // real Fullscreen API active
  const [pseudoFs, setPseudoFs] = useState(false); // CSS fallback (iOS Safari)
  const fsActive = fullscreen || pseudoFs;
  const [isStandalone, setIsStandalone] = useState(false); // launched from the iOS Home Screen
  const [iosNoFs, setIosNoFs] = useState(false); // iPhone Safari: no web-fullscreen API at all
  const [iosHint, setIosHint] = useState(false); // show the "Add to Home Screen" instructions
  const [showSettings, setShowSettings] = useState(false);
  const [cfg, setCfg] = useState({ aimAssist: true, invertY: false, leftHanded: false, joyOpacity: 1, btnScale: 1, masterVol: 0.85 });
  const [dev, setDev] = useState(false); // dev tools (npm run dev only)
  const [god, setGodState] = useState(false); // dev god-mode (invincible)
  const godRef = useRef(false);
  const setGod = useCallback((v: boolean) => {
    godRef.current = v;
    setGodState(v);
    if (gameRef.current) gameRef.current.god = v; // apply live to an in-progress level
  }, []);
  const [devTheme, setDevThemeState] = useState<string>(''); // dev: force a map theme ('' = default)
  const devThemeRef = useRef<string>('');
  const setDevTheme = useCallback((v: string) => {
    devThemeRef.current = v;
    setDevThemeState(v);
  }, []);
  const [kit, setKitState] = useState(false); // dev: load the modular KIT test arena
  const kitRef = useRef(false);
  const setKit = useCallback((v: boolean) => {
    kitRef.current = v;
    setKitState(v);
  }, []);
  const [layoutTest, setLayoutTestState] = useState(false); // dev: rotation-test layout
  const layoutTestRef = useRef(false);
  const setLayoutTest = useCallback((v: boolean) => {
    layoutTestRef.current = v;
    setLayoutTestState(v);
  }, []);

  const portraitPaused = isTouch && portrait; // landscape-only on phones
  const onSnapshot = useCallback((s: FpsSnapshot) => setSnap(s), []);
  const { setMoveAxis, addLook, cycleWeapon, cycleZoom, setSensitivity, setAimAssist, setInvertY, setFire, setCrouch, throwGrenade, jump, reload, grapple } = useFpsLoop(canvasRef, gameRef, mode === 'play' && !portraitPaused && recovery == null, onSnapshot);
  const [crouched, setCrouched] = useState(false);
  const [restarts, setRestarts] = useState(0); // per-level death restarts used (max 5)
  const MAX_RESTARTS = 5;
  const [runActive, setRunActive] = useState(false); // a campaign is in progress (menu shows a live tracker instead of the run config)
  const [gradReady, setGradReady] = useState(false); // Marine hit Level 5 with no division → one-time graduation

  // Re-check division-graduation eligibility whenever we return to the menu (a
  // level-clear may have promoted the Marine to Level 5).
  useEffect(() => {
    if (mode !== 'menu') return;
    const m = loadMarine();
    setGradReady(m.marineLevel >= 5 && !m.division);
  }, [mode]);

  // Launched straight to a screen (e.g. the pilot console's Combat Divisions tile).
  useEffect(() => {
    if (initialScreen === 'division') setMode('division');
  }, [initialScreen]);

  useEffect(() => {
    setIsTouch('ontouchstart' in window);
    try {
      setBest(Number(localStorage.getItem('starshell.best') || 0));
      setAstro(Number(localStorage.getItem('starshell.astro') || 0));
      const savedLo = localStorage.getItem('starshell.loadout');
      if (savedLo) {
        const lo = JSON.parse(savedLo);
        if (lo && typeof lo.p1 === 'string' && typeof lo.p2 === 'string' && typeof lo.sa === 'string' && typeof lo.th === 'string') setLastLoadout(lo);
      }
      const s = Number(localStorage.getItem('starshell.sens'));
      if (Number.isFinite(s) && s > 0) setSensitivityState(s);
      setCampaignLen(campaignTotalLevels()); // client-only (reads localStorage) → avoids SSR mismatch
      // Dev tools (God Mode / level-warp / Kit Arena / Level Editor) are LOCAL-DEV
      // ONLY — they never appear on the deployed public site, and there is no URL
      // that unlocks them. Author + test levels locally; only the results ship.
      setDev(process.env.NODE_ENV !== 'production');
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
    sfx.setMasterVolume(cfg.masterVol);
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

  // Detect iOS Safari (no web-fullscreen) + Home-Screen standalone, once on mount.
  useEffect(() => {
    const nav = navigator as Navigator & { standalone?: boolean };
    const standalone = nav.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches === true;
    const isIOS = /ip(hone|od|ad)/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const doc = document as Document & { webkitFullscreenEnabled?: boolean };
    const realFs = document.fullscreenEnabled || doc.webkitFullscreenEnabled;
    setIsStandalone(standalone);
    setIosNoFs(isIOS && !standalone && !realFs);
  }, []);

  // Track real fullscreen state (covers the OS/escape exit too; standard + webkit).
  useEffect(() => {
    const doc = document as Document & { webkitFullscreenElement?: Element };
    const onFs = () => setFullscreen((doc.fullscreenElement ?? doc.webkitFullscreenElement) != null);
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('webkitfullscreenchange', onFs);
    return () => {
      document.removeEventListener('fullscreenchange', onFs);
      document.removeEventListener('webkitfullscreenchange', onFs);
    };
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
    const el = wrapRef.current as (HTMLDivElement & { webkitRequestFullscreen?: () => Promise<void> | void }) | null;
    if (!el) return;
    const doc = document as Document & {
      webkitFullscreenElement?: Element;
      webkitExitFullscreen?: () => void;
      webkitFullscreenEnabled?: boolean;
    };
    // Already in some fullscreen → leave it (standard or webkit-prefixed).
    if (doc.fullscreenElement || doc.webkitFullscreenElement) {
      (doc.exitFullscreen ?? doc.webkitExitFullscreen)?.call(doc);
      setPseudoFs(false);
      return;
    }
    if (pseudoFs) {
      setPseudoFs(false);
      return;
    }
    // Prefer the real API — many mobile browsers (Android/Samsung) expose ONLY the
    // webkit-prefixed form. iOS Safari (iPhone) has no element fullscreen at all →
    // fall back to the CSS pseudo-fullscreen overlay.
    const req = el.requestFullscreen ?? el.webkitRequestFullscreen;
    const enabled = doc.fullscreenEnabled || doc.webkitFullscreenEnabled;
    if (req && enabled) {
      try {
        const r = req.call(el);
        (screen.orientation as unknown as { lock?: (o: string) => Promise<void> })?.lock?.('landscape').catch(() => {});
        if (r && typeof (r as Promise<void>).catch === 'function') (r as Promise<void>).catch(() => setPseudoFs(true));
      } catch {
        setPseudoFs(true);
      }
    } else {
      setPseudoFs(true);
    }
  }, [pseudoFs]);

  const startLevel = useCallback(
    (level: number, lo: Loadout, maxHp: number, ups: Record<string, Upg>, presetLevel?: Level3D) => {
      resolvedRef.current = false;
      const seed = (Date.now() ^ Math.floor(Math.random() * 0xffff)) & 0x7fffffff;
      const total = campaignTotalLevels(); // flexible campaign length (follows authored levels)
      const forcedBoss = bossOverrideRef.current; // dev: warp straight into a specific boss
      const isBoss = forcedBoss != null || isBossLevel(level, total);
      const mapCount = isBoss ? 5 : mapCountFor(squads);
      // Level source: a forced boss (dev) → its arena; then editor sandbox preset; then
      // dev toggles (rotation sample / war-torn city); otherwise the campaign resolver.
      const lvl = presetLevel ?? (forcedBoss ? buildBossArena(forcedBoss, mapCount, seed) : layoutTestRef.current ? buildFromLayout(makeSampleLayout(devThemeRef.current || 'wartorn')) : kitRef.current ? makeModularArena(mapCount, seed) : resolveLevel(level, mapCount, seed));
      if (!presetLevel && devThemeRef.current) lvl.theme = devThemeRef.current; // dev theme override (preset carries its own)
      // Deploy stats = base → per-run GOLD upgrades → PERMANENT engineering parts +
      // the weapon's small familiarity milestone bonus.
      const arsenal = loadArsenal();
      const guns = [gunById(lo.p1), gunById(lo.p2), gunById(lo.sa)].map((g) => {
        const withGold = applyUpgrades(g, ups[g.id]);
        const parts = equippedParts(arsenal, g.id, g.family);
        const famDmg = milestoneBonus(serviceFor(arsenal, g.id).xp).dmg;
        return applyEngineering(withGold, parts, famDmg);
      });
      const thrown = throwById(lo.th);
      // DIVISION identity + equipped ARMOR → the deploy combat bonus (bounded; heavy
      // divisions are genuinely slower/tankier, light ones faster/squishier).
      const marine = loadMarine();
      const cb = combatBonus(marine.division, equippedArmorPieces(marine));
      const deployHp = maxHp + cb.maxHp;
      const player = makePlayer3(lvl.spawn);
      player.health = deployHp;
      player.armor = Math.min(player.maxArmor, cb.overshield); // start with overshield
      player.speedMul = cb.moveMul;
      // The FINAL level is the GAUNTLET: one ENHANCED boss per round (Xeno → Warlord →
      // Kraken). Regular boss levels (every 5th) cycle through the three boss kinds.
      const gauntlet = forcedBoss == null && isGauntletLevel(level, total);
      const round = gauntlet ? gauntletRef.current || 1 : 0;
      const bossKinds: BossKind[] = forcedBoss ? [forcedBoss] : gauntlet ? [GAUNTLET_BOSSES[round - 1]] : [bossKindFor(level)];
      const mobs = isBoss ? spawnBosses(lvl, bossKinds, Math.random, gauntlet) : spawnEnemies(lvl, squads, level, diff, Math.random);
      // Boss encounters bring a themed minion squad.
      if (isBoss) for (const k of bossKinds) mobs.push(...spawnBossMinions(lvl, k, Math.random));
      // One shared-intel object per fireteam (boss levels are a single squad); the count
      // must match spawnEnemies' level ramp. All squads share the persistent HuntMemory.
      const mem = (huntMemRef.current ??= makeHuntMemory());
      const squadStates: Squad[] = Array.from({ length: isBoss ? 1 : fireteamCount(squads, level) }, () => ({ lastKnown: null, t: 0, mem }));
      if (!isBoss) assignSquadHomes(lvl, squadStates); // spread each squad to its own territory
      gameRef.current = {
        level: lvl,
        player,
        enemies: mobs,
        difficulty: diff,
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
        headshots: 0,
        shotsFired: 0,
        shotsHit: 0,
        dmgDealt: 0,
        regenT: 0,
        regenDelay: 2 * cb.regenDelayMul, // RECOVERY: division shortens/lengthens the wait
        regenRate: 24 * cb.regenRateMul, //  …and speeds/slows the heal
        squads: squadStates,
        maxHp: deployHp, // regen caps at the armor-boosted max
        god: godRef.current,
        elapsed: 0,
      };
      setSnap(null);
      setIntro({ level, boss: isBoss });
      setMode('play');
    },
    [squads, diff],
  );

  // Persist the current run to its account slot (level transitions + start/restart).
  const persistSlot = useCallback(
    (level: number, gold: number, maxHp: number, upgrades: Record<string, Upg>, lo: Loadout) => {
      if (!onRunSave || !slotIdRef.current) return;
      onRunSave({
        id: slotIdRef.current,
        level,
        gold,
        maxHp,
        upgrades: upgrades as Record<string, unknown>,
        difficulty: diff,
        squads,
        loadout: lo,
        startedAt: startedAtRef.current,
        updatedAt: Date.now(),
      });
    },
    [onRunSave, diff, squads],
  );

  const beginCampaign = useCallback(
    (lo: Loadout) => {
      // Every loadout gun starts with the free basic enhancement.
      const ups: Record<string, Upg> = {};
      for (const id of [lo.p1, lo.p2, lo.sa]) ups[id] = basicUpg();
      huntMemRef.current = makeHuntMemory(); // fresh learning each new campaign
      gauntletRef.current = 0;
      sandboxRef.current = false;
      setRecovery(null);
      setRestarts(0); // fresh campaign → reset the per-level restart budget
      setRunActive(true); // a run is now in progress
      if (!slotIdRef.current) slotIdRef.current = (globalThis.crypto?.randomUUID?.() ?? String(Date.now()));
      startedAtRef.current = Date.now();
      setRun({ level: 1, gold: 0, maxHp: 100, upgrades: ups });
      setRunStats({ kills: 0, headshots: 0, shots: 0, hits: 0, dmg: 0, startedAt: Date.now(), endedAt: 0 });
      startLevel(1, lo, 100, ups);
      persistSlot(1, 0, 100, ups, lo);
    },
    [startLevel, persistSlot],
  );

  // Resume a saved run (from the account) into the LOBBY — restore state + show the
  // menu tracker; the player presses Resume to deploy into their current level.
  useEffect(() => {
    if (resumedRef.current || !initialRun) return;
    resumedRef.current = true;
    slotIdRef.current = initialRun.id;
    startedAtRef.current = initialRun.startedAt || Date.now();
    setDiff(initialRun.difficulty as Difficulty);
    setSquads(initialRun.squads);
    setLastLoadout(initialRun.loadout as Loadout);
    huntMemRef.current = makeHuntMemory();
    setRun({ level: initialRun.level, gold: initialRun.gold, maxHp: initialRun.maxHp, upgrades: initialRun.upgrades as Record<string, Upg> });
    setRunStats({ kills: 0, headshots: 0, shots: 0, hits: 0, dmg: 0, startedAt: Date.now(), endedAt: 0 });
    setRunActive(true);
    setMode('menu'); // land in the lobby (tracker), not straight into play
  }, [initialRun]);

  // Resume from the lobby: continue a paused level, or (re)deploy the current level.
  const resumeRun = useCallback(() => {
    if (gameRef.current && gameRef.current.status === 'playing') setMode('play');
    else startLevel(run.level, lastLoadout, run.maxHp, run.upgrades);
  }, [startLevel, run, lastLoadout]);

  // DEV editor "Play": drop straight into a hand-authored layout as a one-off
  // sandbox (default loadout). Win/lose returns to the editor, not the campaign.
  const playLayout = useCallback(
    (layout: LevelLayout) => {
      const lo = lastLoadout;
      const ups: Record<string, Upg> = {};
      for (const id of [lo.p1, lo.p2, lo.sa]) ups[id] = basicUpg();
      huntMemRef.current = makeHuntMemory();
      gauntletRef.current = 0;
      sandboxRef.current = true;
      setRun({ level: 1, gold: 0, maxHp: 100, upgrades: ups });
      setRunStats({ kills: 0, headshots: 0, shots: 0, hits: 0, dmg: 0, startedAt: Date.now(), endedAt: 0 });
      startLevel(1, lo, 100, ups, buildFromLayout(layout));
    },
    [lastLoadout, startLevel],
  );

  // DEV: warp straight into a specific BOSS + its bespoke arena (to test each boss
  // regardless of where it lands in the cycle). Win/lose returns to the menu.
  const devWarpBoss = useCallback(
    (kind: BossKind) => {
      const lo = lastLoadout;
      const ups: Record<string, Upg> = {};
      for (const id of [lo.p1, lo.p2, lo.sa]) ups[id] = basicUpg();
      huntMemRef.current = makeHuntMemory();
      gauntletRef.current = 0;
      sandboxRef.current = false;
      setRun({ level: 5, gold: 0, maxHp: 100, upgrades: ups });
      setRunStats({ kills: 0, headshots: 0, shots: 0, hits: 0, dmg: 0, startedAt: Date.now(), endedAt: 0 });
      if (isTouch && !fsActive) toggleFullscreen();
      bossOverrideRef.current = kind; // startLevel reads this synchronously
      startLevel(5, lo, 100, ups);
      bossOverrideRef.current = null; // one-shot: only this warp is forced
    },
    [lastLoadout, startLevel, isTouch, fsActive, toggleFullscreen],
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
    if (sandboxRef.current) {
      // Editor sandbox: win or lose, just bounce back to the editor.
      setMode('editor');
      return;
    }
    setRunStats((rs) => ({
      ...rs,
      kills: rs.kills + snap.kills,
      headshots: rs.headshots + snap.headshots,
      shots: rs.shots + snap.shotsFired,
      hits: rs.hits + snap.shotsHit,
      dmg: rs.dmg + snap.dmgDealt,
      endedAt: Date.now(),
    }));
    // Cumulative run totals (this level folded in) for the leaderboard submit below.
    const runTotals = {
      kills: runStats.kills + snap.kills,
      headshots: runStats.headshots + snap.headshots,
      shots: runStats.shots + snap.shotsFired,
      hits: runStats.hits + snap.shotsHit,
    };
    // ASTRODIAMONDS accrue every level (win OR loss — you keep what you collected) and
    // persist to the wallet immediately, scaled by difficulty + squad count.
    const adEarned = astroFor(run.level, snap.kills, diff, squads);
    setLastAstro(adEarned);
    setAstro((a) => {
      const n = a + adEarned;
      try {
        localStorage.setItem('starshell.astro', String(n));
      } catch {
        /* ignore */
      }
      return n;
    });
    // ARSENAL: every deployed weapon (+ its equipped parts) earns permanent familiarity;
    // a cleared boss level bumps lifetime bosses (the Legendary gate).
    {
      const won = snap.status === 'won';
      const lg = [lastLoadout.p1, lastLoadout.p2, lastLoadout.sa].map((id) => ({ id, family: gunById(id).family }));
      const { save: nextArsenal, xp } = recordOperation(loadArsenal(), lg, { kills: snap.kills, shots: snap.shotsFired, hits: snap.shotsHit, won, bossWin: won && isBossLevel(run.level) });
      saveArsenal(nextArsenal);
      if (xp > 0) {
        const p1 = gunById(lastLoadout.p1);
        setFamNote(`${p1.name} · FAMILIARITY ${stageFor(serviceFor(nextArsenal, p1.id).xp).toUpperCase()} (+${xp})`);
      }
      // MARINE: equipped armour gains familiarity; the Marine earns experience toward
      // the next Marine Level (Recruit spans 1..5), separate from campaign progression.
      const { save: nextMarine, leveledTo } = recordArmorOperation(loadMarine(), { kills: snap.kills, shots: snap.shotsFired, hits: snap.shotsHit, won, bossWin: won && isBossLevel(run.level) });
      saveMarine(nextMarine);
      if (leveledTo != null) setFamNote(`MARINE PROMOTED · LEVEL ${leveledTo}`);
    }
    if (snap.status === 'won') {
      const total = campaignTotalLevels();
      setRun((r) => ({ ...r, gold: r.gold + goldFor(r.level, snap.kills, diff, squads) }));
      if (run.level >= total) {
        // GAUNTLET: advance through the five enhanced bosses with a recovery window.
        if (gauntletRef.current > 0 && gauntletRef.current < GAUNTLET_BOSSES.length) {
          gauntletRef.current += 1;
          setRecovery(gauntletRef.current); // overlay handles the heal + next-round start
        } else {
          saveBest(total);
          setBest((b) => Math.max(b, total));
          onScore?.({ level: total, ...runTotals, difficulty: diff, won: true });
          if (onRunEnd && slotIdRef.current) onRunEnd(slotIdRef.current);
          slotIdRef.current = '';
          setRunActive(false);
          setMode('complete');
        }
      } else {
        setMode('shop');
      }
    } else {
      saveBest(run.level);
      setBest((b) => Math.max(b, run.level));
      onScore?.({ level: run.level, ...runTotals, difficulty: diff, won: false });
    }
    // Persist this operation's arsenal/marine/astro/best to the account.
    emitProgressChanged(true);
  }, [snap, mode, run.level, diff, squads, lastLoadout, runStats, onRunEnd, onScore]);

  // Auto-dismiss the familiarity toast.
  useEffect(() => {
    if (!famNote) return;
    const t = setTimeout(() => setFamNote(null), 4000);
    return () => clearTimeout(t);
  }, [famNote]);

  useEffect(() => {
    if (mode !== 'play') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMode(sandboxRef.current ? 'editor' : 'menu');
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
          <>
            <Link href="/" className="absolute left-3 top-3 z-[60] font-pixel text-[8px] text-white/60 transition-colors hover:text-white">
              ◂ EXIT
            </Link>
            {/* Video-style maximize button (phones). Real fullscreen where the browser
                supports it (Android); iPhone has no web-fullscreen API → show the
                Add-to-Home-Screen path. Hidden when already launched standalone. */}
            {!isStandalone && (
              <button
                type="button"
                onClick={() => { if (iosNoFs) setIosHint(true); else toggleFullscreen(); }}
                aria-label={fsActive ? 'Exit fullscreen' : 'Enter fullscreen'}
                className="absolute right-3 top-3 z-[60] flex h-9 w-9 items-center justify-center rounded-md border border-white/20 bg-black/40 font-pixel text-[13px] text-white/70 backdrop-blur-sm transition-colors hover:text-white"
              >
                {fsActive ? '⤡' : '⛶'}
              </button>
            )}
          </>
        )}

        {mode === 'play' && snap && snap.status === 'playing' && (
          <>
            <FpsHud snap={snap} level={run.level} gold={run.gold} astro={astro} isTouch={isTouch} />
            <button type="button" onClick={() => setMode('menu')} className="absolute right-3 top-3 z-50 font-pixel text-[8px] text-white/55 transition-colors hover:text-white">
              MENU
            </button>
            {isTouch && (
              <>
                <FpsControls onMove={(s, f) => setMoveAxis(s, f)} onLook={(dx, dy) => addLook(dx, dy)} leftHanded={cfg.leftHanded} opacity={cfg.joyOpacity} />
                {/* Manual FIRE — hold to shoot (a reliable fallback when auto-fire won't
                    engage, e.g. sniping). Sits on the movement side, clear of the aim thumb. */}
                <button
                  type="button"
                  aria-label="Fire"
                  onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setFire(true); }}
                  onPointerUp={() => setFire(false)}
                  onPointerCancel={() => setFire(false)}
                  onPointerLeave={() => setFire(false)}
                  className={`pointer-events-auto absolute bottom-24 z-40 flex items-center justify-center rounded-full border border-[#ff5d6e]/50 bg-[#ff5d6e]/15 font-pixel text-[9px] text-[#ff5d6e] backdrop-blur-sm active:bg-[#ff5d6e]/35 ${cfg.leftHanded ? 'right-4' : 'left-4'}`}
                  style={{ width: 78 * cfg.btnScale, height: 78 * cfg.btnScale }}
                >
                  FIRE
                </button>
                {/* Big action buttons, opposite the joystick, clear of the aim region. */}
                <div className={`pointer-events-none absolute bottom-4 z-40 flex flex-col gap-2 ${cfg.leftHanded ? 'left-3 items-start' : 'right-3 items-end'}`}>
                  <div className="flex gap-2">
                    <TouchBtn onTap={() => { const n = !crouched; setCrouched(n); setCrouch(n); }} label={crouched ? 'STAND' : 'CROUCH'} color="#aef5c8" scale={cfg.btnScale} />
                    <TouchBtn onTap={reload} label="RELOAD" color="#7fdfff" scale={cfg.btnScale} />
                    <TouchBtn onTap={() => cycleWeapon(1)} label="WPN ▸" color="#ffffff" scale={cfg.btnScale} />
                  </div>
                  <div className="flex gap-2">
                    <TouchBtn onTap={() => cycleZoom()} label="ZOOM" color="#7fdfff" scale={cfg.btnScale} />
                    <TouchBtn onTap={() => throwGrenade()} label="NADE" color="#ffae3a" scale={cfg.btnScale} />
                  </div>
                  <div className="flex gap-2">
                    <TouchBtn onTap={() => grapple()} label={snap.grappleReady ? '⟰ GO!' : 'GRAPPLE'} color={snap.grappleReady ? '#ffd27a' : '#7fdfff'} scale={cfg.btnScale} />
                    <button
                      type="button"
                      onPointerDown={jump}
                      className="pointer-events-auto flex items-center justify-center rounded-2xl border border-[#aef5c8]/40 bg-[#aef5c8]/10 font-pixel text-[9px] text-[#aef5c8] backdrop-blur-sm active:bg-[#aef5c8]/25"
                      style={{ width: 80 * cfg.btnScale, height: 64 * cfg.btnScale }}
                    >
                      JUMP
                    </button>
                  </div>
                </div>
              </>
            )}
            {!isTouch && (
              <p className="pointer-events-none absolute bottom-1 left-1/2 z-20 -translate-x-1/2 font-pixel text-[6px] text-white/35">
                CLICK=FIRE · RMB ZOOM · WASD · SPACE JUMP · C CROUCH · 1-3/SCROLL SWAP · R RELOAD · G THROW · F GRAPPLE (AIM A ROOFTOP RING) · LADDERS/ZIPS WALK IN
              </p>
            )}
          </>
        )}

        {mode === 'play' && intro && <MatchIntro key={intro.level} level={intro.level} boss={intro.boss} onDone={() => setIntro(null)} />}

        {mode === 'play' && recovery != null && (
          <RecoveryOverlay key={recovery} round={recovery} onDone={() => { setRecovery(null); startLevel(campaignTotalLevels(), lastLoadout, run.maxHp, run.upgrades); }} />
        )}

        {/* Weapon-familiarity notification — small, transient (auto-dismiss). */}
        {famNote && (
          <div className="pointer-events-none absolute left-1/2 top-14 z-[60] -translate-x-1/2 rounded-full border border-[#c8a8ff]/40 bg-black/70 px-4 py-1.5 text-center font-pixel backdrop-blur-sm [animation:gdg-fade-in_0.4s_ease-out]">
            <p className="text-[7px] tracking-[0.25em] text-[#c8a8ff]/80 sm:text-[8px]">WEAPON FAMILIARITY INCREASED</p>
            <p className="mt-0.5 text-[8px] text-white/85 sm:text-[10px]">{famNote}</p>
          </div>
        )}

        {mode === 'menu' && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/60 px-4 backdrop-blur-[2px]">
            {onExit && (
              <button type="button" onClick={onExit} className="absolute left-4 top-4 z-50 min-h-[36px] rounded-md border border-white/20 bg-white/5 px-4 font-pixel text-[8px] uppercase text-white/60 transition-colors hover:bg-white/10 hover:text-white sm:text-[9px]">
                ◂ Back
              </button>
            )}
            {/* Arcade-cabinet side screens (wide layouts only): pilot avatar (+ Armory) +
                loadout preview (+ Arsenal). */}
            <div className="absolute left-5 top-1/2 hidden -translate-y-1/2 xl:block">
              <AvatarPanel onArmory={() => setMode('armory')} />
            </div>
            <div className="absolute right-5 top-1/2 hidden -translate-y-1/2 xl:block">
              <LoadoutPanel guns={[lastLoadout.p1, lastLoadout.p2, lastLoadout.sa]} onArsenal={() => setMode('arsenal')} />
            </div>
            <p className="font-pixel text-[18px] text-[#7fdfff] sm:text-[26px]">STARSHELL</p>
            {/* Always-visible currency indicators (GOLD + ASTRODIAMONDS) — sit below the title. */}
            <div className="mt-3 flex items-center justify-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1.5 rounded-full border border-[#ffd27a]/45 bg-[#ffd27a]/10 px-3 py-1.5">
                <span className="text-[14px] leading-none text-[#ffd27a] sm:text-[16px]">⛀</span>
                <span className="font-pixel text-[6px] tracking-[0.15em] text-[#ffd27a]/70 sm:text-[7px]">GOLD</span>
                <span className="font-pixel text-[11px] text-[#ffd27a] sm:text-[13px]">{run.gold}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-[#c8a8ff]/45 bg-[#c8a8ff]/10 px-3 py-1.5">
                <span className="text-[14px] leading-none text-[#c8a8ff] sm:text-[16px]">◈</span>
                <span className="font-pixel text-[6px] tracking-[0.15em] text-[#c8a8ff]/70 sm:text-[7px]">ASTRODIAMONDS</span>
                <span className="font-pixel text-[11px] text-[#c8a8ff] sm:text-[13px]">{astro}</span>
              </div>
            </div>
            {best > 0 && <p className="mt-2 font-pixel text-[7px] text-[#ffd27a]/80 sm:text-[9px]">BEST: LEVEL {best}</p>}

            {runActive ? (
              /* A run is in progress — swap the config for a live tracker + restart. */
              <>
                <div className="mt-5 w-full max-w-xs rounded-lg border border-[#7fdfff]/25 bg-white/[0.03] p-4 text-center">
                  <p className="font-pixel text-[8px] tracking-[0.2em] text-[#7fdfff]/80">MISSION IN PROGRESS</p>
                  <p className="mt-2 font-pixel text-[20px] text-[#aef5c8] sm:text-[26px]">LEVEL {run.level}</p>
                  <p className="font-pixel text-[6px] tracking-[0.2em] text-white/40">OF {campaignLen}</p>
                  <div className="mt-3 grid grid-cols-3 gap-2 font-pixel">
                    <div><p className="text-[12px] text-white">{runStats.kills}</p><p className="mt-0.5 text-[5px] tracking-[0.2em] text-white/40">KILLS</p></div>
                    <div><p className="text-[12px] text-[#ffd27a]">⛀ {run.gold}</p><p className="mt-0.5 text-[5px] tracking-[0.2em] text-white/40">GOLD</p></div>
                    <div><p className="text-[12px] text-[#aef5c8]">{best}</p><p className="mt-0.5 text-[5px] tracking-[0.2em] text-white/40">BEST</p></div>
                  </div>
                </div>
                <button type="button" onClick={resumeRun} className="mt-4 min-h-[44px] rounded-md border border-[#aef5c8]/40 bg-[#aef5c8]/10 px-8 font-pixel text-[11px] uppercase text-[#aef5c8] transition-colors hover:bg-[#aef5c8]/20 sm:text-[13px]">
                  ▸ Resume
                </button>
                <button type="button" onClick={() => beginCampaign(lastLoadout)} className="mt-3 min-h-[44px] w-full max-w-xs rounded-md border border-[#ff5d6e]/50 bg-[#ff5d6e]/10 px-6 font-pixel text-[10px] uppercase tracking-[0.1em] text-[#ff5d6e] transition-colors hover:bg-[#ff5d6e]/20 sm:text-[11px]">
                  ⟲ Restart Run from the beginning
                </button>
              </>
            ) : (
              <>
                <p className="mt-5 font-pixel text-[7px] text-white/45 sm:text-[8px]">DIFFICULTY</p>
                <div className="mt-2 flex gap-2">
                  {TIERS.map((d) => (
                    <button key={d} type="button" onClick={() => setDiff(d)} className={`min-h-[38px] rounded-md border px-3 font-pixel text-[8px] uppercase transition-colors sm:text-[9px] ${diff === d ? 'border-[#7fdfff] bg-[#7fdfff]/20 text-[#7fdfff]' : 'border-white/15 bg-white/[0.04] text-white/55 hover:bg-white/10'}`}>
                      {d}
                    </button>
                  ))}
                </div>

                <p className="mt-4 font-pixel text-[7px] text-white/45 sm:text-[8px]">ENEMY SQUADS · {squads * SQUAD_SIZE} SOLDIERS</p>
                <div className="mt-2 flex gap-2">
                  {SQUAD_OPTIONS.map((n) => (
                    <button key={n} type="button" onClick={() => setSquads(n)} className={`flex h-9 flex-col items-center justify-center rounded-md border px-2 font-pixel transition-colors ${squads === n ? 'border-[#aef5c8] bg-[#aef5c8]/20 text-[#aef5c8]' : 'border-white/15 bg-white/[0.04] text-white/55 hover:bg-white/10'}`}>
                      <span className="text-[10px] leading-none">{n}</span>
                      <span className="mt-0.5 text-[5px] leading-none opacity-70">{n * SQUAD_SIZE}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-2 font-pixel text-[6px] text-[#c8a8ff]/70 sm:text-[8px]">REWARDS ×{(diffMult(diff) * squadMult(squads)).toFixed(2)} · harder + more squads earn more ⛀ &amp; ◈</p>

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
              </>
            )}
            {/* Graduation nudge — appears once the Marine reaches Level 5 with no division. */}
            {gradReady && (
              <button type="button" onClick={() => setMode('division')} className="mt-4 min-h-[44px] w-full max-w-xs rounded-md border border-[#c8a8ff]/50 bg-[#c8a8ff]/10 px-6 font-pixel text-[9px] uppercase tracking-[0.1em] text-[#c8a8ff] transition-colors hover:bg-[#c8a8ff]/20 sm:text-[10px] [animation:gdg-fade-in_0.5s_ease-out]">
                ⬢ Graduation available — choose your division
              </button>
            )}
            {/* Arsenal + Armory live under the Loadout / Marine previews; Combat Divisions
                now lives on the pilot console (main page). Central grid keeps Premium. */}
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={() => setMode('premium')} className="min-h-[40px] rounded-md border border-[#ffd27a]/40 bg-[#ffd27a]/10 px-6 font-pixel text-[9px] uppercase text-[#ffd27a] transition-colors hover:bg-[#ffd27a]/20 sm:text-[10px]">
                ✦ Premium
              </button>
            </div>
            <button type="button" onClick={() => setShowSettings(true)} className="mt-3 min-h-[36px] font-pixel text-[8px] uppercase text-white/50 transition-colors hover:text-white sm:text-[9px]">
              ⚙ Settings
            </button>

            {dev && (
              <div className="mt-4 flex flex-col items-center gap-2 rounded-md border border-[#ffd27a]/30 bg-[#ffd27a]/[0.05] px-3 py-2">
                <button type="button" onClick={() => setMode('editor')} className="min-h-[30px] rounded border border-[#aef5c8]/50 bg-[#aef5c8]/10 px-4 font-pixel text-[8px] uppercase text-[#aef5c8] transition-colors hover:bg-[#aef5c8]/20">
                  ▸ Level Editor
                </button>
                <p className="font-pixel text-[7px] tracking-[0.2em] text-[#ffd27a]/80">⚙ DEV · WARP TO BOSS</p>
                <div className="flex flex-wrap justify-center gap-1">
                  {GAUNTLET_ORDER.map((k) => (
                    <button key={k} type="button" onClick={() => devWarpBoss(k)} className="min-h-[26px] rounded border border-[#ff9a3a]/50 bg-[#ff9a3a]/10 px-2 font-pixel text-[7px] uppercase text-[#ff9a3a] transition-colors hover:bg-[#ff9a3a]/20">
                      {k}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setGod(!god)}
                    className={`min-h-[30px] rounded border px-3 font-pixel text-[8px] uppercase transition-colors ${god ? 'border-[#ffd27a] bg-[#ffd27a]/20 text-[#ffd27a]' : 'border-white/20 bg-white/[0.04] text-white/55 hover:bg-white/10'}`}
                  >
                    God: {god ? 'ON' : 'OFF'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setKit(!kit)}
                    className={`min-h-[30px] rounded border px-3 font-pixel text-[8px] uppercase transition-colors ${kit ? 'border-[#7fdfff] bg-[#7fdfff]/20 text-[#7fdfff]' : 'border-white/20 bg-white/[0.04] text-white/55 hover:bg-white/10'}`}
                  >
                    Kit Arena: {kit ? 'ON' : 'OFF'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLayoutTest(!layoutTest)}
                    className={`min-h-[30px] rounded border px-3 font-pixel text-[8px] uppercase transition-colors ${layoutTest ? 'border-[#aef5c8] bg-[#aef5c8]/20 text-[#aef5c8]' : 'border-white/20 bg-white/[0.04] text-white/55 hover:bg-white/10'}`}
                  >
                    Layout Test: {layoutTest ? 'ON' : 'OFF'}
                  </button>
                </div>
                <p className="mt-1 font-pixel text-[6px] tracking-[0.2em] text-white/40">THEME</p>
                <div className="flex flex-wrap gap-1">
                  <button type="button" onClick={() => setDevTheme('')} className={`min-h-[26px] rounded border px-2 font-pixel text-[7px] uppercase transition-colors ${devTheme === '' ? 'border-[#aef5c8] bg-[#aef5c8]/20 text-[#aef5c8]' : 'border-white/20 bg-white/[0.04] text-white/55 hover:bg-white/10'}`}>
                    DEFAULT
                  </button>
                  {THEME_LIST.map((t) => (
                    <button key={t.id} type="button" onClick={() => setDevTheme(t.id)} className={`min-h-[26px] rounded border px-2 font-pixel text-[7px] uppercase transition-colors ${devTheme === t.id ? 'border-[#aef5c8] bg-[#aef5c8]/20 text-[#aef5c8]' : 'border-white/20 bg-white/[0.04] text-white/55 hover:bg-white/10'}`}>
                      {t.id}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <p className="mt-5 max-w-xs text-center font-pixel text-[6px] leading-relaxed text-white/35 sm:text-[8px]">
              {isTouch ? 'LEFT STICK MOVE · RIGHT LOOK · AUTO-FIRE ON TARGET' : 'CLICK TO CAPTURE MOUSE, THEN AIM + FIRE'}
            </p>
          </div>
        )}

        {mode === 'loadout' && (
          <FpsLoadout
            astro={astro}
            best={best}
            initial={lastLoadout}
            onSpendAstro={spendAstro}
            onConfirm={(p1, p2, sa, th) => {
              const lo = { p1, p2, sa, th };
              setLastLoadout(lo);
              try {
                localStorage.setItem('starshell.loadout', JSON.stringify(lo));
              } catch {
                /* ignore */
              }
              emitProgressChanged();
              setMode('menu');
            }}
            onDeploy={(p1, p2, sa, th) => {
              const lo = { p1, p2, sa, th };
              setLastLoadout(lo);
              try {
                localStorage.setItem('starshell.loadout', JSON.stringify(lo));
              } catch {
                /* ignore */
              }
              emitProgressChanged();
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
            onNext={() => { const next = run.level + 1; if (isGauntletLevel(next)) gauntletRef.current = 1; setRestarts(0); setRun((r) => ({ ...r, level: next })); persistSlot(next, run.gold, run.maxHp, run.upgrades, lastLoadout); startLevel(next, lastLoadout, run.maxHp, run.upgrades); }}
            onExit={() => { setRunActive(false); setMode('menu'); }}
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

        {mode === 'editor' && <LevelEditor onPlay={playLayout} onBack={() => setMode('menu')} />}

        {mode === 'arsenal' && <FpsArsenal astro={astro} onSpend={spendAstro} onBack={() => setMode('menu')} />}

        {mode === 'armory' && <FpsArmory astro={astro} onSpend={spendAstro} onBack={() => setMode('menu')} />}

        {mode === 'division' && <FpsDivision onBack={() => setMode('menu')} />}

        {mode === 'premium' && <FpsPremium onBack={() => setMode('menu')} />}

        {mode === 'complete' && (
          <RunStatsCard
            title="CAMPAIGN COMPLETE"
            titleColor="#aef5c8"
            subtitle={`ALL ${run.level} LEVELS CLEARED`}
            level={run.level}
            gold={run.gold}
            astro={astro}
            earnedAstro={lastAstro}
            stats={runStats}
            onRestart={() => beginCampaign(lastLoadout)}
            onMenu={() => { setRunActive(false); setMode('menu'); }}
          />
        )}

        {dead && snap && (
          <RunStatsCard
            title="YOU DIED"
            titleColor="#ff5d6e"
            subtitle={`FELL ON LEVEL ${run.level}`}
            level={run.level}
            gold={run.gold}
            astro={astro}
            earnedAstro={lastAstro}
            stats={runStats}
            restartsLeft={MAX_RESTARTS - restarts}
            onRestartLevel={() => { setRestarts((n) => n + 1); startLevel(run.level, lastLoadout, run.maxHp, run.upgrades); }}
            onRestart={() => beginCampaign(lastLoadout)}
            onMenu={() => { setRunActive(false); setMode('menu'); }}
          />
        )}
      </CRTFrame>

      <OrientationGate show={fullBleed && portrait} />

      {iosHint && (
        <div
          className="fixed inset-0 z-[220] flex items-center justify-center bg-black/85 px-4 backdrop-blur-md"
          style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
          onClick={() => setIosHint(false)}
        >
          <div className="w-full max-w-sm rounded-xl border border-white/10 bg-[#0a0c14]/95 p-5 font-pixel" onClick={(e) => e.stopPropagation()}>
            <p className="text-[12px] text-[#7fdfff]">FULLSCREEN ON IPHONE</p>
            <p className="mt-3 text-[9px] leading-relaxed text-white/70">
              iOS blocks true fullscreen for web games in Safari. For a no-bars, edge-to-edge experience, install Starshell to your Home Screen:
            </p>
            <ol className="mt-3 space-y-1.5 text-[9px] leading-relaxed text-white/80">
              <li>1 · Tap the <span className="text-[#7fdfff]">Share</span> button in Safari (the □ with an ↑).</li>
              <li>2 · Choose <span className="text-[#7fdfff]">Add to Home Screen</span>.</li>
              <li>3 · Open <span className="text-[#aef5c8]">STARSHELL</span> from your Home Screen — it launches fullscreen.</li>
            </ol>
            <p className="mt-3 text-[7px] leading-relaxed text-white/40">Until then the game already fills the screen edge-to-edge; only Safari&apos;s bars remain.</p>
            <button type="button" onClick={() => setIosHint(false)} className="mt-4 min-h-[40px] w-full rounded-md border border-[#7fdfff]/40 bg-[#7fdfff]/10 text-[10px] uppercase text-[#7fdfff] hover:bg-[#7fdfff]/20">
              Got it
            </button>
          </div>
        </div>
      )}

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
              <Slider label="Master Volume" value={cfg.masterVol} min={0} max={1} step={0.05} onChange={(v) => setCfg((c) => ({ ...c, masterVol: v }))} />
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
/** Gauntlet between-rounds recovery: a breather with a countdown to the next
 *  enhanced boss (health is fully restored when the next round spawns). */
function RecoveryOverlay({ round, onDone }: { round: number; onDone: () => void }) {
  const [n, setN] = useState(6);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      const t = setTimeout(() => onDoneRef.current(), 600);
      return () => clearTimeout(t);
    }
    let cur = 6;
    setN(6);
    const iv = setInterval(() => {
      cur -= 1;
      setN(cur);
      if (cur <= 0) {
        clearInterval(iv);
        onDoneRef.current();
      }
    }, 1000);
    return () => clearInterval(iv);
  }, []);
  const kind = GAUNTLET_BOSSES[round - 1];
  const boss = kind ? BOSSES[kind].name : '';
  return (
    <div className="gdg-cine absolute inset-0 z-[55] flex flex-col items-center justify-center bg-black/85 px-4 text-center font-pixel [animation:gdg-fade-in_0.4s_ease-out]">
      <p className="text-[10px] tracking-[0.3em] text-[#ffd27a] sm:text-[13px]">GAUNTLET · ROUND {round} / {GAUNTLET_BOSSES.length}</p>
      <p className="mt-2 text-[14px] text-[#ff5d6e] sm:text-[20px] [animation:gdg-rise-in_0.5s_ease-out]">ENHANCED {boss} INBOUND</p>
      <p className="mt-1 text-[7px] tracking-[0.25em] text-[#aef5c8]/80 sm:text-[9px]">RECOVER · SHIELDS RESTORED</p>
      <p key={n} className="mt-5 text-[40px] leading-none text-white sm:text-[56px] [animation:gdg-count-pop_0.9s_ease-out]">
        {n > 0 ? n : 'GO'}
      </p>
    </div>
  );
}

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
  astro,
  earnedAstro,
  stats,
  onRestart,
  onRestartLevel,
  restartsLeft,
  onMenu,
}: {
  title: string;
  titleColor: string;
  subtitle: string;
  level: number;
  gold: number;
  astro: number;
  earnedAstro: number;
  stats: { kills: number; headshots: number; shots: number; hits: number; dmg: number; startedAt: number; endedAt: number };
  onRestart: () => void;
  onRestartLevel?: () => void;
  restartsLeft?: number;
  onMenu: () => void;
}) {
  const secs = stats.startedAt && stats.endedAt ? Math.max(0, Math.round((stats.endedAt - stats.startedAt) / 1000)) : 0;
  const time = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  const acc = stats.shots > 0 ? Math.round((stats.hits / stats.shots) * 100) : 0;
  const rows: [string, string][] = [
    ['LEVEL', String(level)],
    ['KILLS', String(stats.kills)],
    ['HEADSHOTS', String(stats.headshots)],
    ['TIME', time],
    ['ACCURACY', `${acc}%`],
    ['DAMAGE', stats.dmg.toLocaleString()],
    ['GOLD', `⛀ ${gold}`],
    ['ASTRODIAMONDS', `◈ ${astro}${earnedAstro ? `  (+${earnedAstro})` : ''}`],
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
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {onRestartLevel && (restartsLeft ?? 0) > 0 && (
            <button type="button" onClick={onRestartLevel} className="min-h-[44px] rounded-md border border-[#ffd27a]/50 bg-[#ffd27a]/15 px-4 font-pixel text-[9px] uppercase text-[#ffd27a] hover:bg-[#ffd27a]/25 sm:text-[11px]">
              Restart Level ({restartsLeft} left)
            </button>
          )}
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
