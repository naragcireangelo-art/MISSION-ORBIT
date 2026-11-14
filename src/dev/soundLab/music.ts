/**
 * music.ts — Procedural gameplay-music candidates for the Sound Lab.
 *
 * Three variants share one score: D minor, an 8-bar loop (Dm9 → Bbmaj7 → Gm9 → A7sus4, two bars each),
 * the same key and chords as the menu soundtrack so the handoff into a flight feels related.
 *
 *   drift  calm pad, a sparse plucked arpeggio, a low drone. No drums.
 *   pulse  driving: bass on eighths, a plucked 16th arpeggio, soft kick and hats as intensity rises.
 *   orbit  wide and slow: bell tones, high shimmer, and a string-like swell as intensity rises.
 *
 * Controls (all live): `intensity` 0-1 (how crowded the field is), `scan` (slow-motion mode: darker,
 * half-time, longer echoes, pitch sagging like tape), and `tier` 1-4 (tempo 84-110 BPM).
 *
 * The scheduler is a plain lookahead loop, and the same scheduling code can fill an OfflineAudioContext,
 * which is how the lab measures loudness without playing anything. No audio files are used.
 */

import { makeReverb, noise, tone, type Ctx, type Level } from './synth';

export type MusicVariant = 'drift' | 'pulse' | 'orbit';
export type Tier = 1 | 2 | 3 | 4;

export interface MusicParams {
  /** 0-1. How crowded / urgent the flight is. */
  intensity: number;
  /** Slow-motion scan phase. */
  scan: boolean;
  tier: Tier;
}

export const BPM_BY_TIER: Record<Tier, number> = { 1: 84, 2: 92, 3: 100, 4: 110 };

interface Chord {
  name: string;
  root: number;
  pad: number[];
}

const CHORDS: readonly Chord[] = [
  { name: 'Dm9', root: 73.42, pad: [146.83, 174.61, 220, 261.63, 329.63] },
  { name: 'Bbmaj7', root: 58.27, pad: [233.08, 293.66, 349.23, 440] },
  { name: 'Gm9', root: 98, pad: [196, 233.08, 293.66, 349.23, 440] },
  { name: 'A7sus4', root: 55, pad: [220, 293.66, 329.63, 392] },
];

const STEPS_PER_BAR = 16;
const STEPS_PER_CHORD = STEPS_PER_BAR * 2;
const DRIFT_PATTERN = [0, 2, 1, 3, 2, 4, 1, 3];

/** Deterministic "random" in [0, 1) from a step number and a salt, so a score always plays the same. */
function rnd(n: number, salt: number): number {
  let x = Math.imul(n * 374761393 + salt * 668265263, 1274126177) >>> 0;
  x = (x ^ (x >>> 13)) >>> 0;
  x = Math.imul(x, 1274126177) >>> 0;
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

interface PadVoice {
  osc: OscillatorNode;
  gain: GainNode;
}

export class LabMusic {
  private readonly ctx: Ctx;
  private readonly variant: MusicVariant;
  private params: MusicParams;

  private readonly bus: GainNode;
  private readonly globalFilter: BiquadFilterNode;
  private readonly input: GainNode;
  private readonly padFilter: BiquadFilterNode;
  private readonly padBus: GainNode;
  private readonly dryBus: GainNode;
  private readonly fxBus: GainNode;
  private readonly delay: DelayNode;
  private readonly feedback: GainNode;
  private readonly delayWet: GainNode;
  private readonly reverbWet: GainNode;
  private readonly stringsBus: GainNode;

  private padVoices: PadVoice[] = [];
  private stringVoices: PadVoice[] = [];
  private nextTime = 0;
  private step = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private stopped = false;

  constructor(ctx: Ctx, dest: AudioNode, variant: MusicVariant, params: MusicParams) {
    this.ctx = ctx;
    this.variant = variant;
    this.params = { ...params };

    this.bus = ctx.createGain();
    this.bus.gain.value = 0.0001;
    this.bus.connect(dest);

    this.globalFilter = ctx.createBiquadFilter();
    this.globalFilter.type = 'lowpass';
    this.globalFilter.Q.value = 0.5;
    this.globalFilter.frequency.value = params.scan ? 900 : 7500;
    this.globalFilter.connect(this.bus);

    this.input = ctx.createGain();
    this.input.connect(this.globalFilter);

    // Tempo-synced dotted-eighth echo and a long dark reverb.
    this.delay = ctx.createDelay(2);
    this.delay.delayTime.value = (60 / BPM_BY_TIER[params.tier]) * 0.75;
    this.feedback = ctx.createGain();
    this.feedback.gain.value = params.scan ? 0.55 : 0.36;
    this.delayWet = ctx.createGain();
    this.delayWet.gain.value = 0.3;
    this.delay.connect(this.feedback);
    this.feedback.connect(this.delay);
    this.delay.connect(this.delayWet);
    this.delayWet.connect(this.input);

    this.reverbWet = ctx.createGain();
    this.reverbWet.gain.value = params.scan ? 0.5 : 0.28;
    this.reverbWet.connect(this.input);
    const reverbIn = makeReverb(ctx, this.reverbWet, 2.8, 1);

    this.dryBus = ctx.createGain();
    this.dryBus.connect(this.input);

    this.fxBus = ctx.createGain();
    this.fxBus.connect(this.input);
    const delaySend = ctx.createGain();
    delaySend.gain.value = 0.7;
    this.fxBus.connect(delaySend);
    delaySend.connect(this.delay);
    const reverbSend = ctx.createGain();
    reverbSend.gain.value = 0.5;
    this.fxBus.connect(reverbSend);
    reverbSend.connect(reverbIn);

    this.padFilter = ctx.createBiquadFilter();
    this.padFilter.type = 'lowpass';
    this.padFilter.Q.value = 0.7;
    this.padFilter.frequency.value = this.padCutoff();
    this.padBus = ctx.createGain();
    this.padBus.connect(this.padFilter);
    this.padFilter.connect(this.input);
    const padReverb = ctx.createGain();
    padReverb.gain.value = 0.35;
    this.padFilter.connect(padReverb);
    padReverb.connect(reverbIn);

    this.stringsBus = ctx.createGain();
    this.stringsBus.gain.value = this.stringsLevel();
    const stringsFilter = ctx.createBiquadFilter();
    stringsFilter.type = 'bandpass';
    stringsFilter.frequency.value = 1100;
    stringsFilter.Q.value = 0.6;
    this.stringsBus.connect(stringsFilter);
    stringsFilter.connect(this.input);
    stringsFilter.connect(reverbIn);
  }

  // ── Control ────────────────────────────────────────────────────────────────

  /** Start playing in real time. */
  start(): void {
    const ctx = this.ctx;
    this.nextTime = ctx.currentTime + 0.12;
    this.step = 0;
    this.bus.gain.setValueAtTime(0.0001, ctx.currentTime);
    this.bus.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 1.6);
    this.timer = setInterval(() => this.schedule(ctx.currentTime + 0.4), 40);
  }

  /** Fill an offline context with `seconds` of the score (nothing is played). */
  startOffline(seconds: number): void {
    this.nextTime = 0.02;
    this.step = 0;
    this.bus.gain.value = 0.9;
    this.schedule(seconds);
  }

  stop(fadeSeconds = 0.8): void {
    if (this.stopped) return;
    this.stopped = true;
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    const now = this.ctx.currentTime;
    this.bus.gain.cancelScheduledValues(now);
    this.bus.gain.setValueAtTime(this.bus.gain.value, now);
    this.bus.gain.linearRampToValueAtTime(0.0001, now + fadeSeconds);
    const all = [...this.padVoices, ...this.stringVoices];
    window.setTimeout(() => {
      for (const v of all) {
        try {
          v.osc.stop();
        } catch {
          /* already stopped */
        }
      }
      this.bus.disconnect();
    }, fadeSeconds * 1000 + 200);
  }

  /** Change intensity, scan mode or tier while playing. */
  setParams(next: Partial<MusicParams>): void {
    const prev = this.params;
    this.params = { ...prev, ...next };
    const now = this.ctx.currentTime;
    this.padFilter.frequency.setTargetAtTime(this.padCutoff(), now, 0.4);
    this.stringsBus.gain.setTargetAtTime(this.stringsLevel(), now, 0.8);
    this.delay.delayTime.setTargetAtTime((60 / BPM_BY_TIER[this.params.tier]) * 0.75, now, 0.1);
    if (next.scan !== undefined && next.scan !== prev.scan) {
      const scan = next.scan;
      this.globalFilter.frequency.setTargetAtTime(scan ? 900 : 7500, now, 0.35);
      this.feedback.gain.setTargetAtTime(scan ? 0.55 : 0.36, now, 0.3);
      this.reverbWet.gain.setTargetAtTime(scan ? 0.5 : 0.28, now, 0.4);
      // Pitch sags like slowed tape, then recovers.
      for (const v of [...this.padVoices, ...this.stringVoices]) v.osc.detune.setTargetAtTime(scan ? -380 : 0, now, 0.35);
    }
  }

  // ── Scheduler ──────────────────────────────────────────────────────────────

  private schedule(until: number): void {
    while (this.nextTime < until) {
      this.playStep(this.step, this.nextTime);
      this.nextTime += 60 / BPM_BY_TIER[this.params.tier] / 4;
      this.step += 1;
    }
  }

  private padCutoff(): number {
    return this.params.scan ? 380 : 750 + 1900 * this.params.intensity;
  }

  private stringsLevel(): number {
    return this.variant === 'orbit' ? Math.max(0, this.params.intensity - 0.15) * 1.1 : 0;
  }

  private playStep(n: number, t: number): void {
    const chord = CHORDS[Math.floor(n / STEPS_PER_CHORD) % CHORDS.length];
    const barStep = n % STEPS_PER_BAR;
    if (n % STEPS_PER_CHORD === 0) this.startChord(chord, t);

    if (this.variant === 'drift') this.driftStep(n, barStep, chord, t);
    else if (this.variant === 'pulse') this.pulseStep(n, barStep, chord, t);
    else this.orbitStep(n, barStep, chord, t);
  }

  // ── Chords (pads and drones) ───────────────────────────────────────────────

  private startChord(chord: Chord, t: number): void {
    // Release the previous chord slowly, overlapping the new one.
    for (const v of [...this.padVoices, ...this.stringVoices]) {
      v.gain.gain.cancelScheduledValues(t);
      v.gain.gain.setTargetAtTime(0.0001, t, 0.6);
      try {
        v.osc.stop(t + 4);
      } catch {
        /* already stopped */
      }
    }
    this.padVoices = [];
    this.stringVoices = [];

    const level = this.variant === 'pulse' ? 0.02 : this.variant === 'orbit' ? 0.034 : 0.03;
    const detune0 = this.params.scan ? -380 : 0;
    for (const f of chord.pad) {
      for (const d of [-7, 7]) {
        this.padVoices.push(this.voice(this.padBus, f, d + detune0, this.variant === 'pulse' ? 'triangle' : 'sawtooth', level, t, 1.4));
      }
    }
    if (this.variant === 'orbit') {
      for (const f of chord.pad.slice(1)) {
        for (const d of [-11, 0, 11]) {
          this.stringVoices.push(this.voice(this.stringsBus, f * 2, d + detune0, 'sawtooth', 0.03, t, 2.2));
        }
      }
    }
    if (this.variant !== 'pulse') {
      // A low drone that holds the chord's root.
      tone(this.ctx, this.dryBus, { t0: t, dur: 3.4, peak: this.variant === 'orbit' ? 0.09 : 0.1, f0: chord.root, attack: 0.5 });
    }
  }

  private voice(dest: AudioNode, freq: number, detune: number, type: OscillatorType, level: number, t: number, attack: number): PadVoice {
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(level, t + attack);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    return { osc, gain };
  }

  // ── Variants ───────────────────────────────────────────────────────────────

  private pluck(t: number, freq: number, dur: number, peak: number, pan: number): void {
    const ctx = this.ctx;
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    panner.connect(this.fxBus);
    tone(ctx, panner, { t0: t, dur, peak, f0: freq, type: 'triangle', attack: 0.012 });
    tone(ctx, panner, { t0: t, dur: dur * 0.5, peak: peak * 0.5, f0: freq * 2, attack: 0.008 });
  }

  private driftStep(n: number, barStep: number, chord: Chord, t: number): void {
    if (barStep % 2 !== 0) return;
    const { intensity: I, scan } = this.params;
    const prob = scan ? 0.12 : 0.22 + 0.5 * I;
    if (rnd(n, 1) >= prob) return;
    const pool = chord.pad.map((f) => f * 2);
    const note = pool[DRIFT_PATTERN[(n / 2) % DRIFT_PATTERN.length] % pool.length];
    this.pluck(t, note, scan ? 1.8 : 1.1, 0.05, Math.sin(n * 0.7) * 0.6);
  }

  private pulseStep(n: number, barStep: number, chord: Chord, t: number): void {
    const { intensity: I, scan } = this.params;
    const ctx = this.ctx;

    // Bass on every eighth, with an octave lift near the end of the bar.
    if (barStep % 2 === 0 && (!scan || barStep % 8 === 0)) {
      const f = chord.root * (barStep % 8 === 6 ? 2 : 1);
      const peak = (0.1 + 0.08 * I) * (scan ? 0.7 : 1);
      tone(ctx, this.dryBus, { t0: t, dur: 0.22, peak, f0: f, type: 'sawtooth', lowpass: 260, attack: 0.008 });
      tone(ctx, this.dryBus, { t0: t, dur: 0.24, peak: peak * 0.8, f0: f, attack: 0.008 });
    }
    if (scan) {
      // Half-time: only a sparse, long arpeggio note.
      if (barStep % 4 === 0 && rnd(n, 2) < 0.5) {
        const pool = chord.pad.map((f) => f * 2);
        this.pluck(t, pool[Math.floor(rnd(n, 3) * pool.length)], 1.6, 0.04, Math.sin(n) * 0.5);
      }
      return;
    }
    if (I > 0.45 && barStep % 4 === 0) {
      tone(ctx, this.dryBus, { t0: t, dur: 0.18, peak: 0.24, f0: 130, f1: 42, attack: 0.003 });
    }
    if (I > 0.65 && barStep % 4 === 2) {
      noise(ctx, this.dryBus, { t0: t, dur: 0.03, peak: 0.02 + 0.02 * I, filter: 'highpass', f0: 7000 });
    }
    // Plucked 16th arpeggio climbing through two octaves of the chord.
    if (rnd(n, 4) < 0.4 + 0.55 * I) {
      const pool = [...chord.pad, ...chord.pad.map((f) => f * 2)];
      const note = pool[barStep % pool.length];
      const panner = ctx.createStereoPanner();
      panner.pan.value = Math.sin(n * 0.9) * 0.5;
      panner.connect(this.fxBus);
      tone(ctx, panner, { t0: t, dur: 0.16, peak: barStep % 4 === 0 ? 0.04 : 0.028, f0: note, type: 'square', lowpass: 2200, attack: 0.004 });
    }
  }

  private orbitStep(n: number, barStep: number, chord: Chord, t: number): void {
    const { intensity: I, scan } = this.params;
    const bell = (freq: number, dur: number, peak: number, pan: number): void => {
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = pan;
      panner.connect(this.fxBus);
      tone(this.ctx, panner, { t0: t, dur, peak, f0: freq, attack: 0.008 });
      tone(this.ctx, panner, { t0: t, dur: dur * 0.55, peak: peak * 0.28, f0: freq * 2.76, attack: 0.006 });
      tone(this.ctx, panner, { t0: t, dur: dur * 0.3, peak: peak * 0.12, f0: freq * 5.4, attack: 0.004 });
    };
    if (barStep === 0 || (barStep === 8 && !scan)) {
      const note = chord.pad[Math.floor(rnd(n, 5) * chord.pad.length)] * 2;
      bell(note, scan ? 4.2 : 3.2, 0.045, barStep === 0 ? -0.35 : 0.35);
    }
    if (!scan && barStep % 4 === 0 && rnd(n, 6) < 0.1 + 0.3 * I) {
      bell(chord.pad[Math.floor(rnd(n, 7) * chord.pad.length)] * 4, 1.8, 0.02, Math.sin(n) * 0.8);
    }
  }
}

// ── Offline loudness for a variant ───────────────────────────────────────────

/** Render a stretch of a variant offline and measure its loudness (skipping the fade-in). */
export async function measureMusic(variant: MusicVariant, params: MusicParams, seconds = 18): Promise<Level> {
  const sr = 44100;
  const oc = new OfflineAudioContext(1, Math.ceil(seconds * sr), sr);
  const m = new LabMusic(oc, oc.destination, variant, params);
  m.startOffline(seconds);
  const buf = await oc.startRendering();
  const data = buf.getChannelData(0);
  let peak = 0;
  let sum = 0;
  const from = Math.floor(4 * sr);
  for (let i = from; i < data.length; i++) {
    const a = Math.abs(data[i]);
    if (a > peak) peak = a;
    sum += data[i] * data[i];
  }
  const db = (x: number): number => (x <= 1e-9 ? -120 : 20 * Math.log10(x));
  return { peakDb: db(peak), rmsDb: db(Math.sqrt(sum / Math.max(1, data.length - from))) };
}
