/**
 * Generated chiptune SFX via the Web Audio API — no asset files, so nothing for
 * the CSP to allow. Lazily creates the AudioContext on the first user gesture
 * (autoplay policy), and is a no-op when muted or unsupported.
 */
class Sfx {
  private ctx: AudioContext | null = null;
  muted = false;

  /** Call from a user gesture (a menu/fire click) to unlock audio. */
  ensure(): void {
    if (this.muted) return;
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
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
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noise(dur: number, gain: number, cutoff: number): void {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(cutoff, t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(80, cutoff * 0.2), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(lp).connect(g).connect(ctx.destination);
    src.start(t);
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
  /** Per-family gun sound (rifle / mg / laser / sniper / pistol). */
  gun(kind: string): void {
    this.ensure();
    switch (kind) {
      case 'mg':
        this.noise(0.05, 0.16, 2200);
        this.tone('square', 300, 150, 0.04, 0.06);
        break;
      case 'laser':
        this.tone('sawtooth', 1300, 320, 0.12, 0.09);
        this.tone('sine', 820, 1500, 0.1, 0.05);
        break;
      case 'sniper':
        this.noise(0.22, 0.34, 1500);
        this.tone('square', 170, 55, 0.26, 0.16);
        break;
      case 'pistol':
        this.noise(0.06, 0.18, 2400);
        this.tone('square', 520, 230, 0.05, 0.07);
        break;
      default: // rifle
        this.noise(0.08, 0.2, 2700);
        this.tone('square', 430, 170, 0.06, 0.08);
    }
  }
  enemyHit(): void {
    this.ensure();
    this.tone('square', 900, 1200, 0.05, 0.08);
  }
  hurt(): void {
    this.ensure();
    this.noise(0.16, 0.26, 900);
    this.tone('sawtooth', 200, 70, 0.18, 0.12);
  }
  reload(): void {
    this.ensure();
    this.tone('square', 220, 220, 0.04, 0.07);
    window.setTimeout(() => this.tone('square', 300, 300, 0.05, 0.07), 180);
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
