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

**Mobile**
- Left stick to move, right side to look, auto-fire on target
- On-screen **WPN / ZOOM / THROW** buttons

## The game

- **Arena:** a low-poly "warzone city" — **6-floor towers** (full decks linked by a
  switchback of external ladders), an elevated hill plateau, open platforms,
  bunkers, jump pads, and ziplines strung between distinct rooftops. You and the
  aliens spawn at opposite ends.
- **Arsenal:** ~18 weapons across rifle / MG / laser / sniper / pistol / **launcher**
  (explosive AoE) families, each with its own fire feel, a unique sound, and ADS
  (right-click zoom is a 3-state toggle). Plus **12 throwables** (10 each): frag,
  smoke, molotov, cryo, EMP, flashbang, cluster, toxin, singularity, concussion,
  decoy, plasma — with burn / slow / stun / blind effects and lingering fire / gas /
  cryo / decoy zones.
- **Enemies:** alien-soldier sprites with **4 state-driven poses** (run, fire +
  muzzle flash, crouch). **Realistic perception** — short acquisition range so they
  don't spot you across the map; only the **sniper** reaches far, and it climbs a
  tower to perch. **Squad-coordinated, adaptive AI** (tank / sniper / flanker /
  suppressor roles, shared intel, wall-avoidance, climbing, and **zero-in** aim that
  sharpens the longer they hold line-of-sight on you). Every 5th level is a boss.
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
  engine/audio.ts        Procedural SFX
  screens/               Loadout + armory shop
  ui/                    HUD, CRT frame, touch controls
lib/fonts.ts             The pixel font (Press Start 2P)
```

## Credit

Built by **Gabe De Guzman**. Art and audio are original (procedurally generated).
