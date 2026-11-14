/**
 * synth.ts — Sound-effect recipes for the Sound Lab, plus an offline loudness meter.
 *
 * Every recipe is a plain function `play(ctx, dest, t0)` that schedules its notes on any
 * BaseAudioContext, so the same code runs live (AudioContext) and offline (OfflineAudioContext) for
 * measuring peak and loudness without listening. Everything is synthesized: no audio files.
 *
 * Key: D minor, to sit with the menu soundtrack (Dm9 → Bbmaj7 → Gm9 → Asus4). Pitches used below are
 * D5 587.33, F5 698.46, A5 880.00, D6 1174.66.
 */

import { noise, tone, withReverb, type Ctx } from '../../engine/synthKit';
import { launchRaw, missionSelectRaw, nextStepRaw } from '../../engine/uiSounds';

export type VoiceGroup = 'select' | 'step' | 'launch';

export interface Voice {
  id: string;
  group: VoiceGroup;
  name: string;
  blurb: string;
  /** Seconds until the sound has finished (including its tail). */
  duration: number;
  play: (ctx: Ctx, dest: AudioNode, t0: number) => void;
}

const D5 = 587.33;
const F5 = 698.46;
const A5 = 880;
const D6 = 1174.66;

// ── Recipes ──────────────────────────────────────────────────────────────────

export const VOICES: readonly Voice[] = [
  // ── Mission select (what plays when you pick a mission card) ───────────────
  {
    id: 'select-current',
    group: 'select',
    name: 'Current chime (replica)',
    blurb: 'C5 then G5, triangle waves, a lot of reverb. Level reference for the others.',
    duration: 1.1,
    play: (ctx, dest, t0) =>
      withReverb(ctx, dest, 0.55, (out) => {
        tone(ctx, out, { t0, dur: 0.18, peak: 0.07, f0: 523.25, type: 'triangle' });
        tone(ctx, out, { t0: t0 + 0.09, dur: 0.32, peak: 0.07, f0: 784, type: 'triangle' });
      }),
  },
  {
    id: 'select-a',
    group: 'select',
    name: 'A · File open',
    blurb: 'Soft low thump and a paper tick, then one clean D5 ping. Calm and tidy.',
    duration: 0.9,
    play: (ctx, dest, t0) =>
      withReverb(ctx, dest, 0.25, (out) => {
        tone(ctx, out, { t0, dur: 0.18, peak: 0.26, f0: 150, f1: 52, attack: 0.004 });
        noise(ctx, out, { t0, dur: 0.03, peak: 0.05, filter: 'highpass', f0: 3000 });
        tone(ctx, out, { t0: t0 + 0.05, dur: 0.55, peak: 0.09, f0: D5 });
        tone(ctx, out, { t0: t0 + 0.05, dur: 0.35, peak: 0.025, f0: D6 });
      }),
  },
  {
    id: 'select-b',
    group: 'select',
    name: 'B · Launch commit',
    blurb: 'A short rising sweep into a clear D5 + A5 chime. Reads as "mission selected".',
    duration: 1.3,
    play: (ctx, dest, t0) => missionSelectRaw(ctx, dest, t0),
  },
  {
    id: 'select-c',
    group: 'select',
    name: 'C · Console beeps',
    blurb: 'Two quick, dry telemetry beeps (A5, D6). Mission-control feel, no echo.',
    duration: 0.35,
    play: (ctx, dest, t0) => {
      tone(ctx, dest, { t0, dur: 0.07, peak: 0.05, f0: A5, type: 'square', lowpass: 3200, attack: 0.003 });
      tone(ctx, dest, { t0: t0 + 0.11, dur: 0.1, peak: 0.05, f0: D6, type: 'square', lowpass: 3200, attack: 0.003 });
    },
  },
  {
    id: 'select-d',
    group: 'select',
    name: 'D · Radio keying',
    blurb: 'A comms squelch, a carrier blip, then one short beep. Fits the incoming transmission.',
    duration: 0.45,
    play: (ctx, dest, t0) => {
      noise(ctx, dest, { t0, dur: 0.04, peak: 0.09, filter: 'highpass', f0: 2500 });
      tone(ctx, dest, { t0: t0 + 0.03, dur: 0.035, peak: 0.03, f0: 1000 });
      tone(ctx, dest, { t0: t0 + 0.08, dur: 0.1, peak: 0.06, f0: A5 });
      noise(ctx, dest, { t0: t0 + 0.08, dur: 0.14, peak: 0.018, filter: 'bandpass', f0: 3000, q: 0.8 });
    },
  },
  {
    id: 'select-e',
    group: 'select',
    name: 'E · Soft D-minor arpeggio',
    blurb: 'D5, F5, A5 in quick succession. The closest to today’s chime, but in the music’s key.',
    duration: 0.9,
    play: (ctx, dest, t0) =>
      withReverb(ctx, dest, 0.2, (out) => {
        tone(ctx, out, { t0, dur: 0.22, peak: 0.06, f0: D5, type: 'triangle' });
        tone(ctx, out, { t0: t0 + 0.065, dur: 0.22, peak: 0.06, f0: F5, type: 'triangle' });
        tone(ctx, out, { t0: t0 + 0.13, dur: 0.45, peak: 0.07, f0: A5, type: 'triangle' });
      }),
  },

  // ── Next step (Assembly -> Briefing -> Objectives) ─────────────────────────
  {
    id: 'step-1',
    group: 'step',
    name: '1 · Tick up',
    blurb: 'A short upward glide. Light and quick.',
    duration: 0.2,
    play: (ctx, dest, t0) => tone(ctx, dest, { t0, dur: 0.1, peak: 0.05, f0: 660, f1: 990, type: 'triangle' }),
  },
  {
    id: 'step-2',
    group: 'step',
    name: '2 · Two-tone',
    blurb: 'D5 then A5, tight and clean.',
    duration: 0.35,
    play: (ctx, dest, t0) => nextStepRaw(ctx, dest, t0),
  },
  {
    id: 'step-3',
    group: 'step',
    name: '3 · Soft click',
    blurb: 'A tiny air click with a short note under it.',
    duration: 0.2,
    play: (ctx, dest, t0) => {
      noise(ctx, dest, { t0, dur: 0.02, peak: 0.04, filter: 'highpass', f0: 4000 });
      tone(ctx, dest, { t0: t0 + 0.01, dur: 0.08, peak: 0.035, f0: A5 });
    },
  },

  // ── Launch (Play on the Objectives screen) ─────────────────────────────────
  {
    id: 'launch-1',
    group: 'launch',
    name: 'L1 · Short warp',
    blurb: 'A rising whoosh with a deep swell, ending in a D5 + A5 chime. A shorter cousin of the splash warp.',
    duration: 1.6,
    play: (ctx, dest, t0) => launchRaw(ctx, dest, t0),
  },
  {
    id: 'launch-2',
    group: 'launch',
    name: 'L2 · Ignition',
    blurb: 'A low rumble that swells, a rising tone, and a bright ping at liftoff.',
    duration: 1.6,
    play: (ctx, dest, t0) =>
      withReverb(ctx, dest, 0.25, (out) => {
        noise(ctx, out, { t0, dur: 0.95, peak: 0.12, filter: 'lowpass', f0: 120, f1: 900, q: 0.7, attack: 0.55 });
        tone(ctx, out, { t0, dur: 0.9, peak: 0.05, f0: 110, f1: 440, type: 'sawtooth', lowpass: 900, attack: 0.5 });
        tone(ctx, out, { t0: t0 + 0.8, dur: 0.6, peak: 0.05, f0: A5 });
      }),
  },
  {
    id: 'launch-3',
    group: 'launch',
    name: 'L3 · Countdown and go',
    blurb: 'Three quick beeps, then a longer higher tone with a swoosh.',
    duration: 1.2,
    play: (ctx, dest, t0) => {
      [0, 0.16, 0.32].forEach((d) => tone(ctx, dest, { t0: t0 + d, dur: 0.08, peak: 0.06, f0: A5, attack: 0.004 }));
      tone(ctx, dest, { t0: t0 + 0.5, dur: 0.45, peak: 0.08, f0: D6, type: 'triangle' });
      noise(ctx, dest, { t0: t0 + 0.5, dur: 0.35, peak: 0.05, filter: 'highpass', f0: 600, f1: 3000, attack: 0.1 });
    },
  },
];

export const VOICE_GROUPS: readonly { id: VoiceGroup; title: string; note: string }[] = [
  { id: 'select', title: 'Mission select', note: 'Plays when you pick a mission card in the Archive.' },
  { id: 'step', title: 'Next step', note: 'Plays on Continue / Next in Assembly and Briefing.' },
  { id: 'launch', title: 'Launch', note: 'Plays on Play at the Objectives screen, just before the flight.' },
];

// ── Offline loudness meter ───────────────────────────────────────────────────

export interface Level {
  /** Highest sample, in dB relative to full scale (0 dB is the loudest possible). */
  peakDb: number;
  /** Average loudness over the sound's duration, in dB. */
  rmsDb: number;
}

const toDb = (x: number): number => (x <= 1e-9 ? -120 : 20 * Math.log10(x));

/** Render a voice offline and measure it. Nothing is played. */
export async function measureVoice(v: Voice): Promise<Level> {
  const sr = 44100;
  const lead = 0.02;
  const oc = new OfflineAudioContext(1, Math.ceil((v.duration + 0.3) * sr), sr);
  v.play(oc, oc.destination, lead);
  const buf = await oc.startRendering();
  const data = buf.getChannelData(0);
  let peak = 0;
  let sum = 0;
  const from = Math.floor(lead * sr);
  const to = Math.min(data.length, Math.floor((lead + v.duration) * sr));
  for (let i = from; i < to; i++) {
    const a = Math.abs(data[i]);
    if (a > peak) peak = a;
    sum += data[i] * data[i];
  }
  return { peakDb: toDb(peak), rmsDb: toDb(Math.sqrt(sum / Math.max(1, to - from))) };
}
