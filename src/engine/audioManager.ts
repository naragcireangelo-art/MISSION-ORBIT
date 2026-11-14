/**
 * audioManager.ts — low-latency audio for Mission Orbit (PRD section 9).
 *
 * - Howler.js plays audio files from /public/audio when they exist.
 * - If a file is missing or fails to load, a built-in Web Audio synth plays an
 *   equivalent sound, so the game is fully audible with no assets at all.
 * - The audio context is created and resumed only after a user gesture
 *   (`unlock()`), as browsers require (FR-SPL-03).
 * - This module has no dependency on the Zustand store. The store calls into
 *   it (`configure`, `setMuted`, ...) and never the other way around.
 *
 * Expected files (all optional, OGG with MP3 fallback):
 *   /audio/music/ambient.{ogg,mp3}          looping ambient track (90-120 s)
 *   /audio/music/ambient-intense.{ogg,mp3}  optional intensity layer
 *   /audio/sfx/<name>.{ogg,mp3}             see SFX_FILES below
 */

import { Howl, Howler, type HowlOptions } from 'howler';
import { FlightMusic, type Tier } from './flightMusic';

export type SfxId =
  | 'scanTick' // AUD-02 correct character in a scan
  | 'error' // AUD-03 wrong character
  | 'scanLock' // AUD-04 scan phase starts
  | 'scanComplete' // AUD-05 last character typed
  | 'resume' // AUD-06 speed returns to 100%
  | 'nearMiss' // AUD-07 asteroid passes close
  | 'hullHit' // AUD-08 asteroid collision
  | 'alarm' // AUD-08 loops while Hull is 1
  | 'signalLost' // AUD-09 Signal Lost screen
  | 'toast' // side notification
  | 'uiTick'; // menu navigation

export interface PlayOptions {
  /** Playback rate / pitch multiplier. */
  rate?: number;
  /** Extra gain, 0..1+, on top of the sound's own level. */
  volume?: number;
  /** Stereo pan, -1 (left) to 1 (right). */
  pan?: number;
}

export interface AudioSettings {
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
}

export interface AudioSnapshot extends AudioSettings {
  unlocked: boolean;
  musicPlaying: boolean;
  /** 0..1 music intensity layer. */
  intensity: number;
  /** True when the ambient track is the built-in synth rather than a file. */
  usingSynthMusic: boolean;
}

type ResolvedPlay = Required<PlayOptions>;
type Recipe = (ctx: AudioContext, dest: AudioNode, o: ResolvedPlay) => number;

interface SfxDef {
  files: string[];
  /** Base level of the sound, 0..1. */
  volume: number;
  /** Random pitch variation, +/- fraction (0.03 = +/-3%). */
  jitter: number;
  /** Critical sounds are never dropped when the voice cap is reached. */
  critical?: boolean;
  recipe: Recipe;
}

// --- Tunables ------------------------------------------------------------------

const MAX_SFX_VOICES = 16;
const MUSIC_BASE_LEVEL = 0.55;
const DEFAULT_FADE_IN_MS = 2000;
const DUCK_DB = 6;
const DUCK_HOLD_MS = 1000;
const DUCK_RELEASE_MS = 400;
const ALARM_INTERVAL_MS = 900;
const PRELOAD_TIMEOUT_MS = 4000;

const sfxFiles = (name: string): string[] => [`/audio/sfx/${name}.ogg`, `/audio/sfx/${name}.mp3`];
const MUSIC_FILES = ['/audio/music/ambient.ogg', '/audio/music/ambient.mp3'];
const MUSIC_INTENSE_FILES = ['/audio/music/ambient-intense.ogg', '/audio/music/ambient-intense.mp3'];

// --- Synth building blocks -------------------------------------------------------

interface ToneOpts {
  type?: OscillatorType;
  f0: number;
  f1?: number;
  dur: number;
  peak: number;
  delay?: number;
  attack?: number;
}

function tone(ctx: AudioContext, dest: AudioNode, o: ToneOpts): void {
  const t = ctx.currentTime + (o.delay ?? 0);
  const attack = o.attack ?? 0.004;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(Math.max(o.peak, 0.0002), t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
  gain.connect(dest);

  const osc = ctx.createOscillator();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.f0, t);
  if (o.f1 !== undefined) osc.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur);
  osc.connect(gain);
  osc.start(t);
  osc.stop(t + o.dur + 0.03);
}

const noiseBuffers = new WeakMap<AudioContext, AudioBuffer>();

function getNoise(ctx: AudioContext): AudioBuffer {
  let buffer = noiseBuffers.get(ctx);
  if (!buffer) {
    buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noiseBuffers.set(ctx, buffer);
  }
  return buffer;
}

interface BurstOpts {
  dur: number;
  peak: number;
  type?: BiquadFilterType;
  f0: number;
  f1?: number;
  q?: number;
  delay?: number;
}

function burst(ctx: AudioContext, dest: AudioNode, o: BurstOpts): void {
  const t = ctx.currentTime + (o.delay ?? 0);
  const source = ctx.createBufferSource();
  source.buffer = getNoise(ctx);
  source.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = o.type ?? 'lowpass';
  filter.Q.value = o.q ?? 0.8;
  filter.frequency.setValueAtTime(o.f0, t);
  if (o.f1 !== undefined) filter.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(Math.max(o.peak, 0.0002), t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  source.start(t);
  source.stop(t + o.dur + 0.03);
}

// --- Synth recipes (each returns its duration in seconds) -------------------------

const RECIPES: Record<SfxId, Recipe> = {
  scanTick: (ctx, d, o) => {
    tone(ctx, d, { f0: 880 * o.rate, dur: 0.05, peak: 0.16 * o.volume });
    tone(ctx, d, { type: 'triangle', f0: 1760 * o.rate, dur: 0.03, peak: 0.05 * o.volume });
    return 0.06;
  },
  error: (ctx, d, o) => {
    tone(ctx, d, { type: 'square', f0: 140 * o.rate, f1: 70 * o.rate, dur: 0.14, peak: 0.2 * o.volume });
    burst(ctx, d, { dur: 0.1, peak: 0.12 * o.volume, type: 'lowpass', f0: 300 });
    return 0.16;
  },
  scanLock: (ctx, d, o) => {
    tone(ctx, d, { type: 'triangle', f0: 300, f1: 900, dur: 0.4, peak: 0.12 * o.volume });
    tone(ctx, d, { f0: 1320, dur: 0.12, peak: 0.1 * o.volume, delay: 0.38 });
    return 0.55;
  },
  scanComplete: (ctx, d, o) => {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      tone(ctx, d, { f0: f, dur: 0.9, peak: 0.12 * o.volume, delay: i * 0.07, attack: 0.01 });
    });
    tone(ctx, d, { type: 'triangle', f0: 261.63, dur: 1.1, peak: 0.08 * o.volume, attack: 0.02 });
    return 1.2;
  },
  resume: (ctx, d, o) => {
    burst(ctx, d, { dur: 0.5, peak: 0.12 * o.volume, type: 'bandpass', f0: 200, f1: 1200, q: 1.2 });
    return 0.55;
  },
  nearMiss: (ctx, d, o) => {
    burst(ctx, d, { dur: 0.25, peak: 0.14 * o.volume, type: 'bandpass', f0: 1400, f1: 400, q: 2 });
    return 0.3;
  },
  hullHit: (ctx, d, o) => {
    burst(ctx, d, { dur: 0.35, peak: 0.35 * o.volume, type: 'lowpass', f0: 900, f1: 200 });
    tone(ctx, d, { f0: 90, f1: 40, dur: 0.3, peak: 0.35 * o.volume });
    return 0.4;
  },
  alarm: (ctx, d, o) => {
    tone(ctx, d, { type: 'square', f0: 740, dur: 0.16, peak: 0.1 * o.volume });
    tone(ctx, d, { type: 'square', f0: 740, dur: 0.16, peak: 0.1 * o.volume, delay: 0.22 });
    return 0.4;
  },
  signalLost: (ctx, d, o) => {
    burst(ctx, d, { dur: 0.5, peak: 0.2 * o.volume, type: 'highpass', f0: 2000 });
    tone(ctx, d, { f0: 220, dur: 1.4, peak: 0.12 * o.volume, delay: 0.1, attack: 0.05 });
    return 1.6;
  },
  toast: (ctx, d, o) => {
    tone(ctx, d, { f0: 1200, dur: 0.08, peak: 0.1 * o.volume });
    tone(ctx, d, { f0: 1600, dur: 0.1, peak: 0.1 * o.volume, delay: 0.08 });
    return 0.2;
  },
  uiTick: (ctx, d, o) => {
    tone(ctx, d, { f0: 600 * o.rate, dur: 0.03, peak: 0.08 * o.volume });
    return 0.04;
  },
};

const SFX: Record<SfxId, SfxDef> = {
  scanTick: { files: sfxFiles('scan-tick'), volume: 0.8, jitter: 0.03, recipe: RECIPES.scanTick },
  error: { files: sfxFiles('error-thud'), volume: 0.9, jitter: 0, critical: true, recipe: RECIPES.error },
  scanLock: { files: sfxFiles('scan-lock'), volume: 0.8, jitter: 0, critical: true, recipe: RECIPES.scanLock },
  scanComplete: { files: sfxFiles('scan-complete'), volume: 0.9, jitter: 0, critical: true, recipe: RECIPES.scanComplete },
  resume: { files: sfxFiles('resume'), volume: 0.7, jitter: 0, recipe: RECIPES.resume },
  nearMiss: { files: sfxFiles('near-miss'), volume: 0.7, jitter: 0.05, recipe: RECIPES.nearMiss },
  hullHit: { files: sfxFiles('hull-hit'), volume: 1, jitter: 0, critical: true, recipe: RECIPES.hullHit },
  alarm: { files: sfxFiles('alarm'), volume: 0.7, jitter: 0, recipe: RECIPES.alarm },
  signalLost: { files: sfxFiles('signal-lost'), volume: 1, jitter: 0, critical: true, recipe: RECIPES.signalLost },
  toast: { files: sfxFiles('toast'), volume: 0.7, jitter: 0, recipe: RECIPES.toast },
  uiTick: { files: sfxFiles('ui-tick'), volume: 0.6, jitter: 0, recipe: RECIPES.uiTick },
};

// --- The manager ---------------------------------------------------------------------

type Listener = () => void;

const clamp01 = (n: number): number => Math.min(1, Math.max(0, Number.isFinite(n) ? n : 0));
const dbToGain = (db: number): number => Math.pow(10, -db / 20);

export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;

  private sfxHowls = new Map<SfxId, Howl>();
  private sfxFileOk = new Map<SfxId, boolean>();
  private music: Howl | null = null;
  private musicIntense: Howl | null = null;
  private musicFileOk = false;
  private musicIntenseFileOk = false;
  /** The procedural gameplay score (the "Pulse" pick from the Sound Lab). */
  private flightMusic: FlightMusic | null = null;
  private musicTier: Tier = 2;
  private musicScan = false;
  private preloadPromise: Promise<void> | null = null;

  private voices = 0;
  private duck = 1;
  private duckTimer: ReturnType<typeof setTimeout> | null = null;
  private alarmTimer: ReturnType<typeof setInterval> | null = null;
  private alarmHowlId: number | null = null;
  private stopTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<Listener>();
  private snapshot: AudioSnapshot;

  constructor() {
    this.snapshot = {
      unlocked: false,
      muted: false,
      musicVolume: 0.7,
      sfxVolume: 0.8,
      musicPlaying: false,
      intensity: 0,
      usingSynthMusic: false,
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibility);
    }
  }

  // --- State access (works with React's useSyncExternalStore) ---------------------

  getSnapshot = (): AudioSnapshot => this.snapshot;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private update(patch: Partial<AudioSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((l) => l());
  }

  // --- Setup -------------------------------------------------------------------------

  /** Applies saved settings. Safe to call before `unlock()`. */
  configure(settings: Partial<AudioSettings>): void {
    const next: Partial<AudioSnapshot> = {};
    if (settings.musicVolume !== undefined) next.musicVolume = clamp01(settings.musicVolume);
    if (settings.sfxVolume !== undefined) next.sfxVolume = clamp01(settings.sfxVolume);
    if (settings.muted !== undefined) next.muted = settings.muted;
    this.update(next);
    this.applyLevels();
  }

  /**
   * Creates and resumes the audio context. Must be called from a user gesture
   * (Enter, Space or click on the splash screen).
   */
  async unlock(): Promise<void> {
    if (this.snapshot.unlocked || typeof window === 'undefined') return;
    if (!this.ctx) this.createContext();
    try {
      await this.ctx?.resume();
      if (Howler.ctx && Howler.ctx.state === 'suspended') await Howler.ctx.resume();
    } catch {
      // Resume can be rejected outside a gesture; the next call will retry.
      return;
    }
    this.update({ unlocked: true });
    this.applyLevels();
  }

  /**
   * Starts loading every audio file. Missing files are fine: those sounds use
   * the synth fallback. Resolves when everything has loaded, failed, or 4 s passed.
   */
  preload(): Promise<void> {
    if (this.preloadPromise) return this.preloadPromise;
    if (typeof window === 'undefined') return Promise.resolve();

    const pending: Promise<void>[] = [];
    const track = (
      files: string[],
      options: Omit<HowlOptions, 'src'>,
      onResult: (ok: boolean) => void,
    ): Howl => {
      let finish: () => void = () => undefined;
      pending.push(new Promise<void>((resolve) => (finish = resolve)));
      return new Howl({
        ...options,
        src: files,
        preload: true,
        onload: () => {
          onResult(true);
          finish();
        },
        onloaderror: () => {
          onResult(false);
          finish();
        },
      });
    };

    (Object.keys(SFX) as SfxId[]).forEach((id) => {
      const def = SFX[id];
      this.sfxHowls.set(
        id,
        track(def.files, { volume: def.volume, loop: id === 'alarm' }, (ok) => this.sfxFileOk.set(id, ok)),
      );
    });
    this.music = track(MUSIC_FILES, { loop: true, volume: 0 }, (ok) => {
      this.musicFileOk = ok;
    });
    this.musicIntense = track(MUSIC_INTENSE_FILES, { loop: true, volume: 0 }, (ok) => {
      this.musicIntenseFileOk = ok;
    });

    const timeout = new Promise<void>((resolve) => setTimeout(resolve, PRELOAD_TIMEOUT_MS));
    this.preloadPromise = Promise.race([Promise.all(pending).then(() => undefined), timeout]);
    return this.preloadPromise;
  }

  private createContext(): void {
    const Ctor: typeof AudioContext =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctor({ latencyHint: 'interactive' });
    this.master = this.ctx.createGain();
    this.musicBus = this.ctx.createGain();
    this.sfxBus = this.ctx.createGain();
    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);
    this.master.connect(this.ctx.destination);
  }

  // --- Levels, mute, volume -----------------------------------------------------------

  private effectiveMusicLevel(): number {
    return this.snapshot.musicVolume * MUSIC_BASE_LEVEL * this.duck;
  }

  private applyLevels(): void {
    const { muted, sfxVolume } = this.snapshot;
    Howler.mute(muted);
    if (this.ctx && this.master && this.sfxBus && this.musicBus) {
      const t = this.ctx.currentTime;
      this.master.gain.setTargetAtTime(muted ? 0 : 1, t, 0.04);
      this.sfxBus.gain.setTargetAtTime(sfxVolume, t, 0.03);
      this.musicBus.gain.setTargetAtTime(this.effectiveMusicLevel(), t, 0.05);
    }
    if (this.music && this.musicFileOk && this.snapshot.musicPlaying) {
      this.music.volume(this.effectiveMusicLevel() * (1 - this.snapshot.intensity * 0.5));
    }
    if (this.musicIntense && this.musicIntenseFileOk && this.snapshot.musicPlaying) {
      this.musicIntense.volume(this.effectiveMusicLevel() * this.snapshot.intensity);
    }
  }

  setMuted(muted: boolean): void {
    this.update({ muted });
    this.applyLevels();
  }

  toggleMuted(): boolean {
    this.setMuted(!this.snapshot.muted);
    return this.snapshot.muted;
  }

  setMusicVolume(volume: number): void {
    this.update({ musicVolume: clamp01(volume) });
    this.applyLevels();
  }

  setSfxVolume(volume: number): void {
    this.update({ sfxVolume: clamp01(volume) });
    this.applyLevels();
  }

  // --- Music ------------------------------------------------------------------------------

  /** Fades in the ambient soundtrack (AUD-01). Needs `unlock()` first. */
  async startMusic(fadeMs = DEFAULT_FADE_IN_MS): Promise<void> {
    if (!this.snapshot.unlocked || this.snapshot.musicPlaying) return;
    if (this.stopTimer !== null) {
      clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }
    await this.preload();
    if (this.snapshot.musicPlaying) return;

    const target = this.effectiveMusicLevel();
    if (this.music && this.musicFileOk) {
      this.music.volume(0);
      this.music.play();
      this.music.fade(0, target * (1 - this.snapshot.intensity * 0.5), fadeMs);
      if (this.musicIntense && this.musicIntenseFileOk) {
        this.musicIntense.volume(0);
        this.musicIntense.play();
      }
      this.update({ musicPlaying: true, usingSynthMusic: false });
    } else {
      this.startSynthMusic(fadeMs);
      this.update({ musicPlaying: true, usingSynthMusic: true });
    }
  }

  /** Fades the music out and stops it. */
  stopMusic(fadeMs = 800): void {
    if (!this.snapshot.musicPlaying) return;
    if (this.music && this.musicFileOk && !this.snapshot.usingSynthMusic) {
      this.music.fade(this.music.volume(), 0, fadeMs);
      if (this.musicIntense && this.musicIntenseFileOk) this.musicIntense.fade(this.musicIntense.volume(), 0, fadeMs);
      this.stopTimer = setTimeout(() => {
        this.music?.stop();
        this.musicIntense?.stop();
        this.stopTimer = null;
      }, fadeMs + 50);
    } else {
      this.stopSynthMusic(fadeMs);
    }
    this.update({ musicPlaying: false });
  }

  /** Intensity layer for fast waves (0..1). Called by the engine as asteroid count changes. */
  setIntensity(intensity: number): void {
    const value = clamp01(intensity);
    if (Math.abs(value - this.snapshot.intensity) < 0.01) return;
    this.update({ intensity: value });
    this.flightMusic?.setParams({ intensity: value });
    this.applyLevels();
  }

  /** Difficulty tier of the level (1-4). Sets the music tempo, 84 to 110 BPM. */
  setMusicTier(tier: 1 | 2 | 3 | 4): void {
    this.musicTier = tier;
    this.flightMusic?.setParams({ tier });
  }

  /** The slow-motion scan phase: the music darkens, drops to half-time and sags in pitch. */
  setScanMode(scan: boolean): void {
    if (scan === this.musicScan) return;
    this.musicScan = scan;
    this.flightMusic?.setParams({ scan });
  }

  /** Lowers the music by 6 dB for 1 s (used under the scan-complete chime). */
  duckMusic(db = DUCK_DB, holdMs = DUCK_HOLD_MS): void {
    if (!this.snapshot.unlocked) return;
    this.duck = dbToGain(db);
    this.applyLevels();
    if (this.duckTimer !== null) clearTimeout(this.duckTimer);
    this.duckTimer = setTimeout(() => {
      this.duck = 1;
      this.applyLevels();
      this.duckTimer = null;
    }, holdMs + DUCK_RELEASE_MS);
  }

  private startSynthMusic(fadeMs: number): void {
    const ctx = this.ctx;
    const musicBus = this.musicBus;
    if (!ctx || !musicBus || this.flightMusic) return;
    const music = new FlightMusic(ctx, musicBus, 'pulse', {
      intensity: this.snapshot.intensity,
      scan: this.musicScan,
      tier: this.musicTier,
    });
    music.start(fadeMs / 1000);
    this.flightMusic = music;
    this.applyLevels();
  }

  private stopSynthMusic(fadeMs: number): void {
    this.flightMusic?.stop(fadeMs / 1000);
    this.flightMusic = null;
  }

  // --- Sound effects --------------------------------------------------------------------

  /** Plays a one-shot sound effect. Silently does nothing when muted or locked. */
  play(id: SfxId, options: PlayOptions = {}): void {
    if (!this.snapshot.unlocked || this.snapshot.muted) return;
    const def = SFX[id];
    if (this.voices >= MAX_SFX_VOICES && !def.critical) return;

    const jitter = def.jitter > 0 ? 1 + (Math.random() * 2 - 1) * def.jitter : 1;
    const resolved: ResolvedPlay = {
      rate: (options.rate ?? 1) * jitter,
      volume: options.volume ?? 1,
      pan: Math.max(-1, Math.min(1, options.pan ?? 0)),
    };

    const howl = this.sfxHowls.get(id);
    if (howl && this.sfxFileOk.get(id)) {
      this.playFile(howl, def, resolved);
    } else {
      this.playSynth(def, resolved);
    }
  }

  private playFile(howl: Howl, def: SfxDef, o: ResolvedPlay): void {
    const soundId = howl.play();
    howl.rate(o.rate, soundId);
    howl.volume(def.volume * o.volume * this.snapshot.sfxVolume, soundId);
    if (o.pan !== 0) howl.stereo(o.pan, soundId);
    this.voices++;
    howl.once('end', () => (this.voices = Math.max(0, this.voices - 1)), soundId);
  }

  private playSynth(def: SfxDef, o: ResolvedPlay): void {
    const ctx = this.ctx;
    const sfxBus = this.sfxBus;
    if (!ctx || !sfxBus) return;

    let dest: AudioNode = sfxBus;
    if (o.pan !== 0 && typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.value = o.pan;
      panner.connect(sfxBus);
      dest = panner;
    }
    const duration = def.recipe(ctx, dest, { ...o, volume: o.volume * def.volume });
    this.voices++;
    setTimeout(() => (this.voices = Math.max(0, this.voices - 1)), duration * 1000);
  }

  // --- Game-event helpers (names follow the PRD audio table) ------------------------------

  /** AUD-02: correct character. Pitch rises with scan progress (0..1). */
  scanTick(progress: number): void {
    this.play('scanTick', { rate: 1 + clamp01(progress) * 0.5 });
  }

  /** AUD-03: wrong character. */
  error(): void {
    this.play('error');
  }

  /** AUD-04: scan phase starts. */
  scanLock(): void {
    this.play('scanLock');
  }

  /** AUD-05: scan complete chime, with the toast ping and a music duck. */
  scanComplete(): void {
    this.play('scanComplete');
    this.play('toast');
    this.duckMusic();
  }

  /** AUD-06: speed returns to normal. */
  resume(): void {
    this.play('resume');
  }

  /** AUD-07: near miss, panned by the asteroid's horizontal position (-1..1). */
  nearMiss(pan = 0): void {
    this.play('nearMiss', { pan });
  }

  /** AUD-08: asteroid collision. */
  hullHit(): void {
    this.play('hullHit');
  }

  /** AUD-09: signal lost. Fades the music out under static and a flat tone. */
  signalLost(): void {
    this.stopAlarm();
    this.play('signalLost');
    this.stopMusic(900);
  }

  /** AUD-08: warning alarm that loops while Hull is 1. */
  startAlarm(): void {
    if (this.alarmTimer !== null || this.alarmHowlId !== null) return;
    const howl = this.sfxHowls.get('alarm');
    if (howl && this.sfxFileOk.get('alarm')) {
      if (this.snapshot.unlocked) {
        this.alarmHowlId = howl.play();
        howl.volume(SFX.alarm.volume * this.snapshot.sfxVolume, this.alarmHowlId);
      }
      return;
    }
    this.play('alarm');
    this.alarmTimer = setInterval(() => this.play('alarm'), ALARM_INTERVAL_MS);
  }

  stopAlarm(): void {
    if (this.alarmTimer !== null) {
      clearInterval(this.alarmTimer);
      this.alarmTimer = null;
    }
    if (this.alarmHowlId !== null) {
      this.sfxHowls.get('alarm')?.stop(this.alarmHowlId);
      this.alarmHowlId = null;
    }
  }

  /** Menu navigation tick. */
  uiTick(): void {
    this.play('uiTick');
  }

  // --- Lifecycle -------------------------------------------------------------------------------

  /** Suspends audio while the tab is hidden and resumes it when it returns. */
  private handleVisibility = (): void => {
    if (!this.snapshot.unlocked) return;
    const hidden = document.visibilityState === 'hidden';
    const contexts = [this.ctx, Howler.ctx].filter((c): c is AudioContext => !!c);
    contexts.forEach((c) => {
      if (hidden && c.state === 'running') void c.suspend();
      else if (!hidden && c.state === 'suspended') void c.resume();
    });
  };

  /** Stops everything and releases resources (tests and hot reload). */
  dispose(): void {
    this.stopAlarm();
    this.stopMusic(0);
    this.sfxHowls.forEach((h) => h.unload());
    this.sfxHowls.clear();
    this.music?.unload();
    this.musicIntense?.unload();
    this.music = null;
    this.musicIntense = null;
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibility);
    }
    void this.ctx?.close();
    this.ctx = null;
    this.master = this.musicBus = this.sfxBus = null;
    this.preloadPromise = null;
    this.listeners.clear();
  }
}

/** Shared instance used by the store and the engine. */
export const audioManager = new AudioManager();
