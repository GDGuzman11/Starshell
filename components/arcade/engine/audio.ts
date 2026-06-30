/**
 * Generated chiptune SFX via the Web Audio API — no asset files, so nothing for
 * the CSP to allow. Lazily creates the AudioContext on the first user gesture
 * (autoplay policy), and is a no-op when muted or unsupported.
 *
 * Weapon audio (Gabe's "Weapon Audio Design"): each gun has a profile + a
 * FAMILY generator (distinct synthesis per `type`), routed through a master
 * compressor. Profiles are migrated family-by-family; ids without one yet fall
 * back to the legacy `gun()` sound.
 */
type WType = 'ballistic' | 'energy' | 'heavy' | 'beam' | 'electric' | 'gravity' | 'launcher';
interface WProfile {
  type: WType;
  vol: number;
  pitch: number;
  jitter: number; // ± fraction random per shot (so rapid fire never repeats)
  len: number; // duration scale
  bass: number; // 0..1 bass-body amount
  grit: number; // 0..1 distortion amount
  charge?: number; // optional cosmetic charge-swell duration (s) baked into the shot
  loop?: boolean; // sustained-fire weapon (Ripper / Lance Beam) — uses loop start/stop
}
const WEAPON_AUDIO: Record<string, WProfile> = {
  // ballistic — sharp crack + bolt + small bass punch
  carbine: { type: 'ballistic', vol: 0.9, pitch: 1.0, jitter: 0.06, len: 1.0, bass: 0.7, grit: 0.1 },
  smg: { type: 'ballistic', vol: 0.62, pitch: 1.5, jitter: 0.13, len: 0.6, bass: 0.3, grit: 0.05 },
  marksman: { type: 'ballistic', vol: 1.0, pitch: 0.9, jitter: 0.04, len: 1.3, bass: 0.7, grit: 0.1 },
  sidearm: { type: 'ballistic', vol: 0.8, pitch: 1.2, jitter: 0.05, len: 0.7, bass: 0.5, grit: 0.05 },
  machinepistol: { type: 'ballistic', vol: 0.5, pitch: 1.7, jitter: 0.16, len: 0.5, bass: 0.2, grit: 0.05 },
  // heavy — deep bass body + gritty distortion + metallic slam
  assaultx: { type: 'heavy', vol: 1.0, pitch: 1.0, jitter: 0.08, len: 1.0, bass: 0.8, grit: 0.4 },
  lmg: { type: 'heavy', vol: 1.0, pitch: 0.85, jitter: 0.07, len: 1.2, bass: 1.0, grit: 0.3 },
  piercer: { type: 'heavy', vol: 1.0, pitch: 0.7, jitter: 0.05, len: 1.6, bass: 1.0, grit: 0.5 },
  handcannon: { type: 'heavy', vol: 1.0, pitch: 0.9, jitter: 0.04, len: 1.4, bass: 1.0, grit: 0.35 },
  // energy — chirp + filter sweep + sparkle (+ optional charge swell)
  ar: { type: 'energy', vol: 0.75, pitch: 1.4, jitter: 0.08, len: 0.7, bass: 0.2, grit: 0 },
  pulse: { type: 'energy', vol: 0.85, pitch: 1.1, jitter: 0.06, len: 0.9, bass: 0.5, grit: 0, charge: 0.05 },
  rail: { type: 'energy', vol: 1.0, pitch: 0.8, jitter: 0.03, len: 1.0, bass: 1.0, grit: 0.6, charge: 0.08 },
  // electric — chaotic crackle, no traditional gunshot (arc thrower)
  arc: { type: 'electric', vol: 0.7, pitch: 1.0, jitter: 0.2, len: 1.0, bass: 0.2, grit: 0 },
  // launchers — ignition pop + exhaust + low thump (+ plasma swell)
  rocket: { type: 'launcher', vol: 1.0, pitch: 1.0, jitter: 0.05, len: 1.0, bass: 0.8, grit: 0.2 },
  novacannon: { type: 'launcher', vol: 1.0, pitch: 0.85, jitter: 0.05, len: 1.2, bass: 1.0, grit: 0.5, charge: 0.12 },
  // gravity — reverse inhale + implosion boom (singularity)
  singularity: { type: 'gravity', vol: 1.0, pitch: 0.9, jitter: 0.04, len: 1.3, bass: 1.0, grit: 0.5 },
  // loop weapons — sustained (spin-up/loop/down + continuous beam)
  ripper: { type: 'heavy', vol: 0.8, pitch: 1.0, jitter: 0.1, len: 0.5, bass: 0.6, grit: 0.4, loop: true },
  beam: { type: 'beam', vol: 0.9, pitch: 1.0, jitter: 0.04, len: 1.0, bass: 0.3, grit: 0, loop: true },
};

class Sfx {
  private ctx: AudioContext | null = null;
  muted = false;
  // Master bus: every voice routes gain → compressor → destination so many
  // overlapping sounds (rapid fire, explosions) stay punchy without clipping.
  private master: GainNode | null = null;
  // Reusable 1 s white-noise buffer — sampled per shot instead of allocating a
  // fresh buffer each time (no GC churn at 20 shots/s).
  private whiteBuf: AudioBuffer | null = null;
  // Active sustained loops (Ripper / Lance Beam) → their stop functions.
  private loops = new Map<string, () => void>();

  /** Call from a user gesture (a menu/fire click) to unlock audio. */
  ensure(): void {
    if (this.muted) return;
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      // Master chain.
      const master = this.ctx.createGain();
      master.gain.value = 0.85;
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -12;
      comp.knee.value = 26;
      comp.ratio.value = 12;
      comp.attack.value = 0.003;
      comp.release.value = 0.25;
      master.connect(comp).connect(this.ctx.destination);
      this.master = master;
      // Shared white-noise buffer.
      const n = Math.floor(this.ctx.sampleRate);
      const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
      this.whiteBuf = buf;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  /** Output node every voice connects to (the master bus). */
  private out(): AudioNode {
    return this.master ?? this.ctx!.destination;
  }

  /** A looping source over the shared white-noise buffer, started at a random
   *  offset for per-shot variety. Caller wires filters/gain + start/stop. */
  private noiseSource(): AudioBufferSourceNode | null {
    const ctx = this.ctx;
    if (!ctx || !this.whiteBuf) return null;
    const src = ctx.createBufferSource();
    src.buffer = this.whiteBuf;
    src.loop = true;
    return src;
  }

  private tone(
    type: OscillatorType,
    f0: number,
    f1: number,
    dur: number,
    gain: number,
  ): void {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.out());
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noise(dur: number, gain: number, cutoff: number): void {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    const src = this.noiseSource();
    if (!src) return;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(cutoff, t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(80, cutoff * 0.2), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(lp).connect(g).connect(this.out());
    const off = Math.random() * Math.max(0, (this.whiteBuf?.duration ?? 1) - dur);
    src.start(t, off);
    src.stop(t + dur);
  }

  fire(): void {
    this.ensure();
    this.tone('square', 520, 120, 0.18, 0.12);
  }
  explosion(): void {
    this.ensure();
    this.noise(0.5, 0.32, 1400);
    this.tone('sine', 90, 40, 0.45, 0.18);
  }
  hit(): void {
    this.ensure();
    this.tone('sawtooth', 260, 80, 0.22, 0.16);
  }
  shoot(): void {
    this.ensure();
    this.noise(0.09, 0.22, 2600);
    this.tone('square', 360, 150, 0.07, 0.08);
  }
  private hash(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }
  /** Per-GUN sound: the family sets the character, then a per-id pitch/length
   *  tweak makes every individual weapon sound distinct. */
  gun(id: string, family: string): void {
    this.ensure();
    const h = this.hash(id);
    const p = 0.82 + ((h % 100) / 100) * 0.5; // pitch factor 0.82..1.32
    const d = 0.88 + (((h >> 5) % 100) / 100) * 0.34; // length factor 0.88..1.22
    switch (family) {
      case 'mg':
        this.noise(0.05 * d, 0.16, 2200 * p);
        this.tone('square', 300 * p, 150 * p, 0.04 * d, 0.06);
        break;
      case 'laser':
        this.tone('sawtooth', 1300 * p, 320 * p, 0.12 * d, 0.09);
        this.tone('sine', 820 * p, 1500 * p, 0.1 * d, 0.05);
        break;
      case 'sniper':
        this.noise(0.22 * d, 0.34, 1500 * p);
        this.tone('square', 170 * p, 55 * p, 0.26 * d, 0.16);
        break;
      case 'launcher':
        this.noise(0.18 * d, 0.3, 1100 * p);
        this.tone('sine', 150 * p, 45 * p, 0.34 * d, 0.18);
        this.tone('square', 90 * p, 38 * p, 0.3 * d, 0.1);
        break;
      case 'pistol':
        this.noise(0.06 * d, 0.18, 2400 * p);
        this.tone('square', 520 * p, 230 * p, 0.05 * d, 0.07);
        break;
      default: // rifle
        this.noise(0.08 * d, 0.2, 2700 * p);
        this.tone('square', 430 * p, 170 * p, 0.06 * d, 0.08);
    }
  }

  // ── weapon synthesis helpers ────────────────────────────────────────────────
  private distCurve: Float32Array | null = null;
  private makeDistCurve(): Float32Array {
    if (this.distCurve) return this.distCurve;
    const n = 1024;
    const c = new Float32Array(n);
    const k = 40;
    for (let i = 0; i < n; i++) {
      const x = (i / n) * 2 - 1;
      c[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x));
    }
    this.distCurve = c;
    return c;
  }
  /** Filtered noise burst (sweeping cutoff), routed through master. */
  private burst(dur: number, gain: number, f0: number, f1: number, type: BiquadFilterType): void {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    const src = this.noiseSource();
    if (!src) return;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(60, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.out());
    const off = Math.random() * Math.max(0, (this.whiteBuf?.duration ?? 1) - dur);
    src.start(t, off);
    src.stop(t + dur);
  }
  /** Distorted (waveshaped) noise burst — gritty heavy-weapon transient. */
  private distNoise(dur: number, gain: number, cutoff: number): void {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    const src = this.noiseSource();
    if (!src) return;
    const ws = ctx.createWaveShaper();
    ws.curve = this.makeDistCurve();
    ws.oversample = '2x';
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(ws).connect(lp).connect(g).connect(this.out());
    const off = Math.random() * Math.max(0, (this.whiteBuf?.duration ?? 1) - dur);
    src.start(t, off);
    src.stop(t + dur);
  }

  // ── family generators (distinct synthesis per weapon type) ──────────────────
  /** Ballistic: sharp filtered-noise crack + bass punch + mechanical click. */
  private genBallistic(p: WProfile): void {
    const pj = p.pitch * (1 + (Math.random() * 2 - 1) * p.jitter);
    this.burst(0.06 * p.len, 0.42 * p.vol, 3200 * pj, 900 * pj, 'highpass');
    this.tone('triangle', 190 * pj, 55 * pj, 0.07 * p.len, 0.42 * p.vol * p.bass);
    this.tone('square', 820 * pj, 460 * pj, 0.02, 0.1 * p.vol);
    if (p.grit > 0.2) this.distNoise(0.04 * p.len, 0.18 * p.vol * p.grit, 2400 * pj);
  }
  /** Heavy: deep bass body + distorted gritty transient + metallic slam. */
  private genHeavy(p: WProfile): void {
    const pj = p.pitch * (1 + (Math.random() * 2 - 1) * p.jitter);
    this.tone('sine', 130 * pj, 42 * pj, 0.16 * p.len, 0.6 * p.vol * (0.5 + 0.5 * p.bass));
    this.distNoise(0.07 * p.len, 0.32 * p.vol * (0.4 + p.grit), 1700 * pj);
    this.burst(0.12 * p.len, 0.3 * p.vol, 1500 * pj, 350 * pj, 'lowpass');
    this.tone('square', 240 * pj, 110 * pj, 0.03, 0.12 * p.vol);
  }
  /** Energy: chirp + filter sweep + sparkle (+ optional charge swell / sub-bass /
   *  compressed snap / metallic ping). Serves Pulse AR, Ion Repeater, Railgun. */
  private genEnergy(p: WProfile): void {
    const pj = p.pitch * (1 + (Math.random() * 2 - 1) * p.jitter);
    if (p.charge) this.tone('sine', 280 * pj, 1500 * pj, p.charge, 0.05 * p.vol);
    this.tone('sawtooth', 1500 * pj, 340 * pj, 0.11 * p.len, 0.1 * p.vol);
    this.tone('sine', 820 * pj, 1700 * pj, 0.08 * p.len, 0.05 * p.vol);
    this.burst(0.045 * p.len, 0.1 * p.vol, 5200 * pj, 1600 * pj, 'highpass');
    if (p.bass > 0.4) this.tone('sine', 150 * pj, 55 * pj, 0.09, 0.2 * p.vol * p.bass);
    if (p.grit > 0.3) this.distNoise(0.05 * p.len, 0.28 * p.vol * p.grit, 2200 * pj);
    this.tone('square', 2400 * pj, 2000 * pj, 0.02, 0.05 * p.vol); // metallic ping
  }
  /** Electric: randomized crackle snaps + HP noise buzz + unstable square layer. */
  private genElectric(p: WProfile): void {
    const pj = p.pitch * (1 + (Math.random() * 2 - 1) * p.jitter);
    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      window.setTimeout(() => {
        const f = (1200 + Math.random() * 2600) * pj;
        this.tone('square', f, f * (0.4 + Math.random() * 0.6), 0.015, 0.06 * p.vol);
      }, Math.random() * 70 * p.len);
    }
    this.burst(0.1 * p.len, 0.14 * p.vol, 6000 * pj, 3000 * pj, 'highpass');
    this.tone('square', 220 * pj, 180 * pj, 0.08 * p.len, 0.05 * p.vol);
  }
  /** Launcher: low launch thump + ignition pop + exhaust whoosh (+ plasma swell). */
  private genLauncher(p: WProfile): void {
    const pj = p.pitch * (1 + (Math.random() * 2 - 1) * p.jitter);
    this.tone('sine', 110 * pj, 38 * pj, 0.22 * p.len, 0.5 * p.vol * (0.6 + 0.4 * p.bass));
    this.distNoise(0.06 * p.len, 0.3 * p.vol, 1800 * pj);
    this.burst(0.4 * p.len, 0.18 * p.vol, 1600 * pj, 300 * pj, 'lowpass'); // exhaust
    if (p.charge) this.tone('sawtooth', 200 * pj, 720 * pj, p.charge, 0.08 * p.vol); // plasma swell
    if (p.grit > 0.3) this.tone('sine', 72 * pj, 60 * pj, 0.5 * p.len, 0.12 * p.vol); // after-hum
  }
  /** Gravity: reverse inhale (rising swell cut off) → deep implosion boom + rumble. */
  private genGravity(p: WProfile): void {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    const pj = p.pitch * (1 + (Math.random() * 2 - 1) * p.jitter);
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(60 * pj, t);
    osc.frequency.exponentialRampToValueAtTime(220 * pj, t + 0.26);
    g.gain.setValueAtTime(0.0008, t);
    g.gain.exponentialRampToValueAtTime(0.18 * p.vol, t + 0.24);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    osc.connect(g).connect(this.out());
    osc.start(t);
    osc.stop(t + 0.32);
    window.setTimeout(() => {
      this.tone('sine', 180 * pj, 28 * pj, 0.42 * p.len, 0.5 * p.vol);
      this.distNoise(0.22 * p.len, 0.3 * p.vol * p.grit, 600 * pj);
      this.tone('sawtooth', 420 * pj, 60 * pj, 0.3, 0.08 * p.vol);
    }, 250);
  }

  // ── public weapon API ───────────────────────────────────────────────────────
  /** Fire sound for a gun; falls back to legacy gun() until its family lands. */
  playWeaponFire(id: string, family: string): void {
    this.ensure();
    if (!this.ctx || this.muted) return;
    const p = WEAPON_AUDIO[id];
    if (!p) {
      this.gun(id, family);
      return;
    }
    switch (p.type) {
      case 'ballistic':
        this.genBallistic(p);
        break;
      case 'heavy':
        this.genHeavy(p);
        break;
      case 'energy':
        this.genEnergy(p);
        break;
      case 'electric':
        this.genElectric(p);
        break;
      case 'launcher':
        this.genLauncher(p);
        break;
      case 'gravity':
        this.genGravity(p);
        break;
      default:
        this.gun(id, family); // beam — Phase 4 loops
    }
  }
  /** Per-weapon reload — mag-out / mag-in / bolt, weighted by weapon type. */
  playReload(id: string): void {
    this.ensure();
    if (!this.ctx || this.muted) return;
    const p = WEAPON_AUDIO[id];
    const heavy = p?.type === 'heavy';
    const pit = p?.pitch ?? 1;
    this.tone('square', 200 * pit, 200 * pit, 0.04, heavy ? 0.1 : 0.07);
    if (heavy) this.burst(0.06, 0.18, 1200, 400, 'lowpass');
    window.setTimeout(() => this.tone('square', (heavy ? 260 : 320) * pit, (heavy ? 260 : 320) * pit, 0.05, heavy ? 0.11 : 0.07), heavy ? 260 : 180);
    window.setTimeout(() => this.tone('square', 480 * pit, 300 * pit, 0.03, 0.08), heavy ? 420 : 320);
  }
  /** Impact of a shot landing on an enemy (flesh/armour) or a wall (tick). */
  playImpact(id: string, kind: 'enemy' | 'wall'): void {
    this.ensure();
    if (!this.ctx || this.muted) return;
    const p = WEAPON_AUDIO[id];
    const heavy = p?.type === 'heavy' || p?.type === 'launcher' || p?.type === 'gravity';
    if (kind === 'enemy') {
      this.tone('square', heavy ? 700 : 950, heavy ? 1100 : 1300, 0.05, 0.08);
      if (heavy) this.tone('sine', 160, 60, 0.08, 0.1);
    } else {
      this.burst(0.05, 0.16, 2600, 800, 'highpass');
    }
  }
  /** Is this a sustained-fire weapon (use loop start/stop, not per-shot fire)? */
  isLoopWeapon(id: string): boolean {
    return WEAPON_AUDIO[id]?.loop === true;
  }
  /** Begin a sustained loop while fire is held (no-op if already running). */
  playWeaponLoopStart(id: string): void {
    this.ensure();
    const ctx = this.ctx;
    if (!ctx || this.muted || this.loops.has(id)) return;
    if (id === 'ripper') this.loops.set(id, this.startRipper(ctx));
    else if (id === 'beam') this.loops.set(id, this.startBeam(ctx));
  }
  /** Stop a sustained loop (spin-down / shutdown fade). */
  playWeaponLoopStop(id: string): void {
    const stop = this.loops.get(id);
    if (stop) {
      stop();
      this.loops.delete(id);
    }
  }
  /** RIPPER — motor whine spins up, sustained bandpass "rip" loop + rotary clicks,
   *  spins down on stop. */
  private startRipper(ctx: AudioContext): () => void {
    const t = ctx.currentTime;
    const out = this.out();
    const motor = ctx.createOscillator();
    const mg = ctx.createGain();
    motor.type = 'sawtooth';
    motor.frequency.setValueAtTime(40, t);
    motor.frequency.linearRampToValueAtTime(150, t + 0.35);
    mg.gain.setValueAtTime(0.0008, t);
    mg.gain.linearRampToValueAtTime(0.08, t + 0.35);
    motor.connect(mg).connect(out);
    motor.start(t);

    const rip = this.noiseSource();
    const rg = ctx.createGain();
    if (rip) {
      const rf = ctx.createBiquadFilter();
      rf.type = 'bandpass';
      rf.frequency.value = 1200;
      rf.Q.value = 0.8;
      rg.gain.setValueAtTime(0.0008, t);
      rg.gain.linearRampToValueAtTime(0.14, t + 0.35);
      rip.connect(rf).connect(rg).connect(out);
      rip.start(t);
    }

    const click = ctx.createOscillator();
    const cg = ctx.createGain();
    click.type = 'square';
    click.frequency.setValueAtTime(18, t);
    click.frequency.linearRampToValueAtTime(55, t + 0.35);
    cg.gain.value = 0.04;
    click.connect(cg).connect(out);
    click.start(t);

    return () => {
      const tt = ctx.currentTime;
      motor.frequency.cancelScheduledValues(tt);
      motor.frequency.linearRampToValueAtTime(34, tt + 0.4);
      mg.gain.cancelScheduledValues(tt);
      mg.gain.linearRampToValueAtTime(0.0001, tt + 0.4);
      rg.gain.cancelScheduledValues(tt);
      rg.gain.linearRampToValueAtTime(0.0001, tt + 0.35);
      cg.gain.cancelScheduledValues(tt);
      cg.gain.linearRampToValueAtTime(0.0001, tt + 0.3);
      motor.stop(tt + 0.45);
      if (rip) rip.stop(tt + 0.4);
      click.stop(tt + 0.35);
    };
  }
  /** LANCE BEAM — bright start chirp, sustained detuned hum + HP shimmer, soft
   *  shutdown fade + chirp on stop. */
  private startBeam(ctx: AudioContext): () => void {
    const t = ctx.currentTime;
    const out = this.out();
    this.tone('sawtooth', 600, 1600, 0.12, 0.1);
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const bg = ctx.createGain();
    o1.type = 'triangle';
    o1.frequency.value = 1300;
    o2.type = 'sine';
    o2.frequency.value = 1306; // slight detune → beating
    bg.gain.setValueAtTime(0.0008, t);
    bg.gain.linearRampToValueAtTime(0.09, t + 0.08);
    o1.connect(bg);
    o2.connect(bg);
    bg.connect(out);
    o1.start(t);
    o2.start(t);

    const sh = this.noiseSource();
    const shg = ctx.createGain();
    if (sh) {
      const shf = ctx.createBiquadFilter();
      shf.type = 'highpass';
      shf.frequency.value = 4000;
      shg.gain.value = 0.025;
      sh.connect(shf).connect(shg).connect(out);
      sh.start(t);
    }

    return () => {
      const tt = ctx.currentTime;
      bg.gain.cancelScheduledValues(tt);
      bg.gain.linearRampToValueAtTime(0.0001, tt + 0.12);
      shg.gain.cancelScheduledValues(tt);
      shg.gain.linearRampToValueAtTime(0.0001, tt + 0.12);
      o1.stop(tt + 0.16);
      o2.stop(tt + 0.16);
      if (sh) sh.stop(tt + 0.14);
      this.tone('sine', 1200, 500, 0.1, 0.06);
    };
  }

  // ── throwables ──────────────────────────────────────────────────────────────
  /** Throwable sound — the toss (clink/bounce/shatter) or the detonation. */
  playThrowable(id: string, phase: 'throw' | 'blast'): void {
    this.ensure();
    if (!this.ctx || this.muted) return;
    if (phase === 'throw') this.throwToss(id);
    else this.throwBlast(id);
  }
  private throwToss(id: string): void {
    switch (id) {
      case 'smoke':
      case 'gas':
        this.tone('sine', 240, 150, 0.06, 0.08); // dull canister thud
        break;
      case 'incendiary':
        this.burst(0.04, 0.12, 5000, 2000, 'highpass'); // glassy tink
        this.tone('triangle', 1200, 800, 0.03, 0.06);
        break;
      case 'decoy':
      case 'gravity':
        this.tone('square', 900, 1500, 0.05, 0.06); // digital chirp
        break;
      case 'plasma':
        this.tone('sine', 500, 720, 0.08, 0.06); // soft plasma toss
        break;
      default: // frag / cluster / cryo / shock / flash / concussion — metal clink
        this.tone('square', 760, 520, 0.03, 0.07);
        this.burst(0.02, 0.06, 4000, 2000, 'highpass');
    }
  }
  private throwBlast(id: string): void {
    switch (id) {
      case 'frag':
        this.tone('sine', 120, 38, 0.4, 0.32);
        this.distNoise(0.18, 0.34, 1500);
        this.burst(0.3, 0.2, 2200, 500, 'lowpass'); // debris/smoke tail
        break;
      case 'cluster':
        this.tone('sine', 130, 40, 0.32, 0.28);
        this.distNoise(0.14, 0.3, 1600);
        for (let k = 0; k < 5; k++) {
          window.setTimeout(() => {
            this.distNoise(0.08, 0.2, 1800);
            this.tone('sine', 160, 60, 0.1, 0.14);
          }, 120 + k * 90 + Math.random() * 60);
        }
        break;
      case 'smoke':
        this.burst(0.7, 0.2, 1400, 300, 'lowpass'); // pressure hiss / expanding air
        this.tone('sine', 200, 120, 0.2, 0.05);
        break;
      case 'incendiary':
        this.burst(0.5, 0.22, 2000, 400, 'lowpass'); // fire whoosh
        this.tone('sawtooth', 260, 90, 0.45, 0.1); // ignite
        break;
      case 'cryo':
        this.tone('sine', 1500, 320, 0.35, 0.12);
        this.tone('triangle', 900, 1800, 0.28, 0.07); // frost shimmer
        this.burst(0.12, 0.14, 6000, 2500, 'highpass'); // ice crack
        break;
      case 'shock':
        this.tone('sawtooth', 1900, 180, 0.18, 0.12); // power-down zap
        this.burst(0.16, 0.16, 4000, 800, 'highpass');
        this.tone('square', 90, 60, 0.2, 0.1); // low digital pulse
        break;
      case 'flash':
        this.burst(0.3, 0.36, 6000, 3000, 'highpass'); // white-noise pop
        this.tone('sine', 2200, 1800, 0.5, 0.1); // high ringing tone
        break;
      case 'gas':
        this.burst(0.5, 0.18, 1000, 400, 'lowpass'); // wet hiss
        this.tone('sawtooth', 140, 110, 0.6, 0.07); // poisonous drone
        break;
      case 'gravity':
        this.genGravity({ type: 'gravity', vol: 0.9, pitch: 0.9, jitter: 0, len: 1.2, bass: 1, grit: 0.5 });
        break;
      case 'concussion':
        this.tone('sine', 100, 34, 0.35, 0.34); // deep air-pressure thud
        this.burst(0.3, 0.18, 800, 200, 'lowpass'); // muffled shockwave
        break;
      case 'decoy':
        [900, 1300, 1700, 1100].forEach((f, i) => window.setTimeout(() => this.tone('square', f, f * 1.1, 0.05, 0.06), i * 70)); // glitchy digital
        break;
      case 'plasma':
        this.tone('sawtooth', 700, 200, 0.18, 0.12);
        this.tone('sine', 400, 1000, 0.12, 0.08);
        this.distNoise(0.1, 0.2, 2200); // energy pop
        break;
      default:
        this.explosion();
    }
  }
  /** Alien death — a short descending squelch + noise puff. */
  enemyDie(): void {
    this.ensure();
    this.tone('sawtooth', 380, 90, 0.22, 0.12);
    this.noise(0.18, 0.13, 1200);
  }
  enemyHit(): void {
    this.ensure();
    this.tone('square', 900, 1200, 0.05, 0.08);
  }
  ignite(): void {
    this.ensure();
    this.noise(0.5, 0.22, 1800);
    this.tone('sawtooth', 240, 90, 0.4, 0.08);
  }
  freeze(): void {
    this.ensure();
    this.tone('sine', 1400, 300, 0.4, 0.1);
    this.tone('triangle', 900, 1700, 0.3, 0.06);
  }
  zap(): void {
    this.ensure();
    this.noise(0.18, 0.2, 4000);
    this.tone('sawtooth', 1800, 200, 0.16, 0.1);
  }
  gas(): void {
    this.ensure();
    this.noise(0.6, 0.16, 800);
  }
  hurt(): void {
    this.ensure();
    this.noise(0.16, 0.26, 900);
    this.tone('sawtooth', 200, 70, 0.18, 0.12);
  }
  swap(): void {
    this.ensure();
    this.tone('square', 520, 380, 0.05, 0.06);
  }
  win(): void {
    this.ensure();
    [523, 659, 784, 1047].forEach((f, i) =>
      window.setTimeout(() => this.tone('square', f, f, 0.14, 0.12), i * 110),
    );
  }
  lose(): void {
    this.ensure();
    [392, 311, 247, 196].forEach((f, i) =>
      window.setTimeout(() => this.tone('square', f, f, 0.18, 0.12), i * 130),
    );
  }
}

export const sfx = new Sfx();
