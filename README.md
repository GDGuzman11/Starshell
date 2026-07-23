# STARSHELL

A **'93-pixel first-person arena shooter** built on Three.js — rendered at a tiny
480×270 internal resolution with nearest-filter textures and CSS-upscaled for the
retro look. Out-gun the combined-arms BLACKSTAR LEGION — a Commander-led squad that flanks,
suppresses, and adapts — plus boss encounters and a Star Destroyer set-piece.

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
- **Enemies — the BLACKSTAR LEGION:** the roster is redesigned from concept sheets into
  a cohesive faction of retro low-poly units — Rifleman, Scout, Breacher, Marksman
  (cloaked sniper), Suppressor (3.1 m HMG), Engineer (bio-tech medic), **Tank** (a white
  siege **MECH** + exterior shield anchor), **Elite** (dual-blade melee assassin),
  **Commander** (crowned, caped, scepter), Berserker (claw monster), plus the
  **Artillery** walker-mech. Every unit now **raises + shoulders its gun with recoil**
  when firing. **Combined-arms squad AI:** an **active Commander** dictates the squad — a
  command aura that sharpens everyone's aim, target-calls, and an order FSM (**advance /
  hold / flank**); **kill the Commander and the squad degrades**. Units run **bounding
  advances** (always covering fire) and **wide pincer flanks**, keep **dispersed** (never
  cluster), the **Suppressor actually pins you** (a screen suppression debuff) while
  flankers move, the **Tank** projects a shield over nearby allies, the **Berserker's
  fear scream** surges the squad, and the **Marksman repositions** between shots — on top
  of the existing LoS/crouch-aware perception, shared intel, zero-in aim, climbing, and
  cross-fight learning. *(Deeper "thinking" utility movement + multi-squad strategy +
  level-1 player-pattern learning are in progress.)*
- **Bosses + OVERDRIVE:** distinct 3D boss encounters (Xenomorph hive predator · Warlord
  battlefield commander with a Command Beacon + Shield Wall · Kraken living arena · a
  final **GAUNTLET**), each a coordinated command unit with themed minions, HP phases,
  telegraphed attacks, and a status HUD. Boss levels open with a cinematic: a camera
  reveal → a **3-gun red-ignition cutscene** → your weapons deal **×2.5** for that fight
  (the held gun glows red), auto-clearing next level.
- **STAR DESTROYER (every 3rd non-boss level):** a huge procedural **capital ship** (from
  a 100-ship catalog) looms over the fight, then on clear a **black-hole rift** opens, the
  camera pans, and it **emerges** for a set-piece — a **killable** Star Destroyer (hull +
  shield, a 3-cannon arsenal: machine-gun / rocket / telegraphed mega-cannon) that
  launches a **void-fighter squadron**. Its gunfire **craters the ground**, **destroys
  buildings**, and **shakes your screen**; shot-down fighters **kamikaze-crash** at you.
- **Campaign:** a long campaign (bosses every 15th level, Star Destroyers every 3rd) with
  a gold armory between levels, a pre-deploy loadout screen, weapon **engineering /
  customization**, a HUD **radar/minimap**, **fullscreen** (with an iOS pseudo-fullscreen
  fallback) + an adjustable **look-sensitivity** slider, regenerating health while hidden,
  and progress saved in `localStorage`.

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
    models/              weapon models (guns + throwables), primitives only
    viewmodel.ts         In-game first-person gun viewmodel
    capital/             Star Destroyer catalog + procedural model + void fighters
    enemies/             BLACKSTAR LEGION classes + siege mech + squad AI + animator
  engine/audio.ts        Procedural Web Audio SFX (per-weapon synthesis)
  screens/               Loadout (+ 3D preview) + armory shop
  ui/                    HUD, CRT frame, touch controls
  mobile/                OrientationGate (landscape gate)
lib/fonts.ts             The pixel font (Press Start 2P)
```

## Credit

Built by **Gabe De Guzman**. Art and audio are original (procedurally generated).
