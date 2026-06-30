# STARSHELL

A **'93-pixel first-person arena shooter** built on Three.js — rendered at a tiny
480×270 internal resolution with nearest-filter textures and CSS-upscaled for the
retro look. Out-gun adaptive alien squads across a 20-level campaign.

Originally built as the "Have Fun!" arcade tab of
[gdgquantum.com](https://gdgquantum.com); this repo is the **standalone, runnable
game** extracted into its own minimal Next.js app.

## Run it

```bash
npm install
npm run dev
```

Then open <http://localhost:3000> and click into the canvas to lock the pointer.

```bash
npm run build && npm run start   # production build
```

## Controls

**Desktop**
- **Move:** `W` `A` `S` `D` · **Jump:** `Space`
- **Look:** mouse (click the canvas to lock the pointer)
- **Fire:** left mouse · **Zoom:** right mouse (tap to cycle hip → zoom → deep zoom)
- **Swap weapon:** `1`–`3` or scroll · **Reload:** `R` · **Throw:** `G`
- **Ladders / ziplines:** walk into them

**Mobile** — a near-native, landscape-only experience
- Full-bleed fullscreen + safe-area; a **rotate-to-landscape** gate
- **Floating joystick** (spawns under your thumb) to move; right side to look
- **Auto-fire on target** with subtle **aim assist** (slowdown + magnetism)
- Big glass buttons: **RELOAD · WPN · ZOOM · NADE · JUMP**
- A **Settings** panel: aim assist, invert-Y, left-handed, joystick opacity, button size (persisted)
- **Dynamic render resolution** that flexes with device performance to hold a stable frame

## The game

- **Arena:** a low-poly "warzone city" — **6-floor towers** (full decks linked by a
  switchback of external ladders), an elevated hill plateau, open platforms,
  bunkers, jump pads, and ziplines strung between distinct rooftops. You and the
  aliens spawn at opposite ends.
- **Arsenal:** **18 guns** across rifle / MG / laser / sniper / pistol / **launcher**
  (explosive AoE) families. Each has a **unique 3D model built from primitives** (zero
  assets), shown in a rotating **loadout preview** with POWER / MAG / RELOAD bars and
  as an in-game **first-person viewmodel** (bob / recoil / reload / muzzle-flash), plus
  a fully **procedural per-weapon sound** (distinct synthesis per family + per-shot
  variation; Ripper & Lance Beam are sustained loops). The loadout splits into disjoint
  **Primary** (sustained-fire) and **Secondary** (slow, high-damage) pools. ADS is a
  3-state right-click zoom. Plus **12 throwables** (each its own 3D model): frag, smoke,
  molotov, cryo, EMP, flashbang, cluster, toxin, singularity, concussion, decoy, plasma
  — with burn / slow / stun / blind effects and lingering fire / gas / cryo / decoy zones.
- **Enemies:** **10 low-poly 3D doctrine classes** — Rifleman, Scout, Breacher,
  Marksman, Suppressor, Engineer, Tank, Elite, Commander, Berserker — each a distinct
  silhouette / movement / weapon, built from primitives. They spawn as **doctrine
  squads** (patrol / assault / defensive / heavy-push / elite-strike) by level.
  **Squad-coordinated, adaptive AI** (LoS-gated perception, shared intel, coordinated
  HUNT, per-class behaviour, wall discipline, climbing, **zero-in** aim, cross-fight
  learning). The Tank breaks down + detonates on death; the Berserker charges to melee.
- **Bosses (every 5th level):** three distinct 3D boss encounters, each a coordinated
  command unit with its own themed minions, multiple HP phases, telegraphed attacks
  (read the warning, dodge, punish), and a status HUD. **Xenomorph** — a ranged hive
  predator (acid spit + puddles, a telegraphed pounce that leaves it exposed on a
  miss) leading a broodling/spitter/stalker hive. **Warlord** — a battlefield
  commander (suppressive fire, arcing grenade volleys, a destructible Command Beacon
  that buffs its legion, a shot-blocking Shield Wall) commanding a real doctrine
  squad. **Kraken** — a living arena (tentacle eruptions, slam waves, pull vortices,
  vision-clouding void fog) with a purple abyss swarm. **Level 20 is the GAUNTLET:**
  all three, ENHANCED, fought back-to-back with recovery windows.
- **Campaign:** 20 levels with a gold armory between them, a pre-deploy loadout
  screen, **per-gun customization** (upgrade damage / fire-rate / magazine / reload
  with stage gold), a HUD **radar/minimap**, **fullscreen** (with an iOS
  pseudo-fullscreen fallback) and an adjustable **look-sensitivity** slider,
  regenerating health while hidden, and a local best-level in `localStorage`.

## Stack

Next.js 14 (App Router) · TypeScript (strict) · Tailwind CSS · Three.js (imperative,
not R3F) · procedural Web Audio SFX. No asset files — all art and audio are
generated at runtime.

## Layout

```
app/                     Minimal Next.js shell that mounts the game at /
components/arcade/        The game
  FpsGame.tsx            Root: menu / loadout / play / shop / complete state machine
  useFpsLoop.ts          The rAF game loop (renderer, camera, input, combat)
  fps/                   Engine: level3d, physics, scene, combat, enemy, weapons, textures
    level/               SpatialGrid + nav graph (A* enemy pathing)
    postfx.ts/materials  Bloom + emissive (imperative EffectComposer)
    models/              30 weapon models (18 guns + 12 throwables), primitives only
    viewmodel.ts         In-game first-person gun viewmodel
    enemies/             10 low-poly 3D classes + the transform animator
  engine/audio.ts        Procedural Web Audio SFX (per-weapon synthesis)
  screens/               Loadout (+ 3D preview) + armory shop
  ui/                    HUD, CRT frame, touch controls
  mobile/                OrientationGate (landscape gate)
lib/fonts.ts             The pixel font (Press Start 2P)
```

## Credit

Built by **Gabe De Guzman**. Art and audio are original (procedurally generated).
