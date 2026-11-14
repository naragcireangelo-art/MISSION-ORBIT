/**
 * uiAudio.ts — Web Audio synth for the menu screens: ambient space soundtrack + UI sound effects.
 *
 * Nothing is loaded from disk; everything is synthesized, so there are no audio files to ship.
 * Browsers only allow audio after a user gesture, so call `uiAudio.start()` from the Enter /
 * Space / click handler on the Splash Screen.
 *
 *   uiAudio.start()            create the AudioContext and fade the ambient pad in
 *   uiAudio.setMuted(bool)     master mute (the soundtrack keeps its place)
 *   uiAudio.sfx.click()        short button blip        uiAudio.sfx.hover()   soft tick
 *   uiAudio.sfx.confirm()      rising two-note chime    uiAudio.sfx.denied()  low buzz
 *   uiAudio.sfx.warp()         launch whoosh            uiAudio.sfx.type()    transmission tick
 *   uiAudio.sfx.open()         panel-open sweep
 *
 * If Ci's audioManager.ts is added later, fold these into it; this file has no dependencies.
 */

type AudioContextCtor = typeof AudioContext;

const MASTER_LEVEL = 0.8;
const AMBIENT_LEVEL = 0.5;

/** Ambient chord loop (MIDI notes): Dm9 → Bbmaj7 → Gm9 → Asus4. Slow, wide and calm. */
const CHORDS: number[][] = [
  [50, 57, 60, 64, 65],
  [46, 58, 62, 65, 69],
  [43, 55, 58, 62, 69],
  [45, 52, 57, 62, 64],
];
const SHIMMER_SCALE = [74, 77, 79, 81, 84, 86];
const CHORD_SECONDS = 9;

const midiToHz = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

class UiAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambientBus: GainNode | null = null;
  private reverbSend: GainNode | null = null;
  private muted = false;
  private chordIndex = 0;
  private chordTimer: number | null = null;
  private shimmerTimer: number | null = null;
  private started = false;
  private lastTypeAt = 0;
  private lastHoverAt = 0;

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  /** Create / resume the audio context and fade the ambient soundtrack in. Safe to call repeatedly. */
  start(): void {
    try {
      if (!this.ctx) {
        const Ctor: AudioContextCtor | undefined =
          window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
        if (!Ctor) return;
        this.ctx = new Ctor();
        this.buildGraph();
      }
      const ctx = this.ctx;
      if (!ctx) return;
      if (ctx.state === 'suspended') void ctx.resume();
      if (this.started) return;
      this.started = true;
      this.fadeAmbientIn();
      this.playChord();
      this.chordTimer = window.setInterval(() => this.playChord(), CHORD_SECONDS * 1000);
      this.shimmerTimer = window.setInterval(() => this.playShimmer(), 2600);
    } catch {
      /* audio is optional — the game works silently */
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(muted ? 0 : MASTER_LEVEL, t, 0.08);
  }

  isStarted(): boolean {
    return this.started;
  }

  stop(): void {
    if (this.chordTimer !== null) window.clearInterval(this.chordTimer);
    if (this.shimmerTimer !== null) window.clearInterval(this.shimmerTimer);
    this.chordTimer = null;
    this.shimmerTimer = null;
    this.started = false;
    if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend();
  }

  // ── Graph ──────────────────────────────────────────────────────────────────

  private buildGraph(): void {
    const ctx = this.ctx;
    if (!ctx) return;

    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : MASTER_LEVEL;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -14;
    limiter.ratio.value = 6;
    master.connect(limiter);
    limiter.connect(ctx.destination);

    const ambientBus = ctx.createGain();
    ambientBus.gain.value = 0;
    ambientBus.connect(master);

    // Long, dark reverb built from decaying noise.
    const convolver = ctx.createConvolver();
    convolver.buffer = this.makeImpulse(3.4, 2.6);
    const reverbSend = ctx.createGain();
    reverbSend.gain.value = 0.9;
    reverbSend.connect(convolver);
    const reverbOut = ctx.createGain();
    reverbOut.gain.value = 0.7;
    convolver.connect(reverbOut);
    reverbOut.connect(ambientBus);

    this.master = master;
    this.ambientBus = ambientBus;
    this.reverbSend = reverbSend;
  }

  private makeImpulse(seconds: number, decay: number): AudioBuffer {
    const ctx = this.ctx as AudioContext;
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const data = buffer.getChannelData(c);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return buffer;
  }

  private fadeAmbientIn(): void {
    if (!this.ctx || !this.ambientBus) return;
    const t = this.ctx.currentTime;
    this.ambientBus.gain.cancelScheduledValues(t);
    this.ambientBus.gain.setValueAtTime(0, t);
    this.ambientBus.gain.linearRampToValueAtTime(AMBIENT_LEVEL, t + 3.5);
  }

  // ── Ambient soundtrack ─────────────────────────────────────────────────────

  private playChord(): void {
    const ctx = this.ctx;
    if (!ctx || !this.ambientBus || !this.reverbSend) return;
    const notes = CHORDS[this.chordIndex % CHORDS.length];
    this.chordIndex += 1;
    const t0 = ctx.currentTime;
    const attack = 3.2;
    const hold = CHORD_SECONDS - 1;
    const release = 4.5;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, t0);
    filter.frequency.linearRampToValueAtTime(1500, t0 + attack + 1);
    filter.frequency.linearRampToValueAtTime(600, t0 + hold + release);
    filter.Q.value = 0.6;
    filter.connect(this.ambientBus);
    filter.connect(this.reverbSend);

    notes.forEach((note, i) => {
      for (const detune of [-7, 7]) {
        const osc = ctx.createOscillator();
        osc.type = i === 0 ? 'sine' : 'triangle';
        osc.frequency.value = midiToHz(note);
        osc.detune.value = detune;
        const g = ctx.createGain();
        const peak = i === 0 ? 0.11 : 0.05;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(peak, t0 + attack);
        g.gain.setValueAtTime(peak, t0 + hold);
        g.gain.linearRampToValueAtTime(0.0001, t0 + hold + release);
        osc.connect(g);
        g.connect(filter);
        osc.start(t0);
        osc.stop(t0 + hold + release + 0.2);
      }
    });
  }

  private playShimmer(): void {
    const ctx = this.ctx;
    if (!ctx || !this.ambientBus || !this.reverbSend) return;
    if (Math.random() < 0.3) return;
    const note = SHIMMER_SCALE[Math.floor(Math.random() * SHIMMER_SCALE.length)];
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = midiToHz(note);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.045, t0 + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.4);
    osc.connect(g);
    g.connect(this.reverbSend);
    g.connect(this.ambientBus);
    osc.start(t0);
    osc.stop(t0 + 2.6);
  }

  // ── Sound effects ──────────────────────────────────────────────────────────

  private tone(opts: {
    freq: number;
    toFreq?: number;
    type?: OscillatorType;
    duration: number;
    gain: number;
    delay?: number;
    reverb?: number;
  }): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.muted) return;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(opts.freq, t0);
    if (opts.toFreq) osc.frequency.exponentialRampToValueAtTime(opts.toFreq, t0 + opts.duration);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(opts.gain, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.duration);
    osc.connect(g);
    g.connect(this.master);
    if (opts.reverb && this.reverbSend) {
      const send = ctx.createGain();
      send.gain.value = opts.reverb;
      g.connect(send);
      send.connect(this.reverbSend);
    }
    osc.start(t0);
    osc.stop(t0 + opts.duration + 0.05);
  }

  private noiseSweep(duration: number, fromHz: number, toHz: number, gain: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.muted) return;
    const length = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.4;
    const t0 = ctx.currentTime;
    filter.frequency.setValueAtTime(fromHz, t0);
    filter.frequency.exponentialRampToValueAtTime(toHz, t0 + duration);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + duration * 0.55);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t0);
  }

  readonly sfx = {
    click: (): void => {
      this.tone({ freq: 880, toFreq: 1320, type: 'square', duration: 0.07, gain: 0.05 });
    },
    hover: (): void => {
      const now = performance.now();
      if (now - this.lastHoverAt < 70) return;
      this.lastHoverAt = now;
      this.tone({ freq: 1760, type: 'sine', duration: 0.05, gain: 0.025 });
    },
    confirm: (): void => {
      this.tone({ freq: 523.25, type: 'triangle', duration: 0.18, gain: 0.07, reverb: 0.5 });
      this.tone({ freq: 784, type: 'triangle', duration: 0.32, gain: 0.07, delay: 0.09, reverb: 0.6 });
    },
    denied: (): void => {
      this.tone({ freq: 150, toFreq: 90, type: 'sawtooth', duration: 0.22, gain: 0.06 });
    },
    type: (): void => {
      const now = performance.now();
      if (now - this.lastTypeAt < 38) return;
      this.lastTypeAt = now;
      this.tone({ freq: 1400 + Math.random() * 500, type: 'square', duration: 0.018, gain: 0.012 });
    },
    open: (): void => {
      this.noiseSweep(0.45, 400, 3200, 0.07);
      this.tone({ freq: 440, toFreq: 880, type: 'sine', duration: 0.3, gain: 0.04, reverb: 0.4 });
    },
    warp: (): void => {
      this.noiseSweep(1.4, 180, 5200, 0.22);
      this.tone({ freq: 55, toFreq: 220, type: 'sawtooth', duration: 1.3, gain: 0.07, reverb: 0.3 });
      this.tone({ freq: 261.63, type: 'triangle', duration: 1.6, gain: 0.06, delay: 0.5, reverb: 0.9 });
      this.tone({ freq: 392, type: 'triangle', duration: 1.6, gain: 0.05, delay: 0.5, reverb: 0.9 });
    },
  };
}

export const uiAudio = new UiAudio();
