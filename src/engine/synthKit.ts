/**
 * synthKit.ts — Small building blocks for synthesized sound: notes, filtered noise and a reverb.
 *
 * Every function takes any `BaseAudioContext`, so the same code plays live (AudioContext) and renders
 * offline (OfflineAudioContext), which is how loudness is measured without listening. Nothing here
 * loads audio files, and the noise is a fixed sequence, so a sound is identical every time it plays.
 */

export type Ctx = BaseAudioContext;

const noiseBuffers = new WeakMap<Ctx, AudioBuffer>();

function noiseBuffer(ctx: Ctx): AudioBuffer {
  let buf = noiseBuffers.get(ctx);
  if (!buf) {
    buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let seed = 7;
    for (let i = 0; i < data.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      data[i] = (seed / 4294967296) * 2 - 1;
    }
    noiseBuffers.set(ctx, buf);
  }
  return buf;
}

export interface ToneOpts {
  t0: number;
  dur: number;
  peak: number;
  f0: number;
  /** End frequency for a glide (exponential). */
  f1?: number;
  type?: OscillatorType;
  attack?: number;
  /** Optional lowpass cutoff in Hz. */
  lowpass?: number;
}

/** One enveloped note (or glide). */
export function tone(ctx: Ctx, dest: AudioNode, o: ToneOpts): void {
  const osc = ctx.createOscillator();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.f0, o.t0);
  if (o.f1) osc.frequency.exponentialRampToValueAtTime(o.f1, o.t0 + o.dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, o.t0);
  g.gain.linearRampToValueAtTime(o.peak, o.t0 + (o.attack ?? 0.006));
  g.gain.exponentialRampToValueAtTime(0.0001, o.t0 + o.dur);
  osc.connect(g);
  if (o.lowpass) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = o.lowpass;
    g.connect(f);
    f.connect(dest);
  } else {
    g.connect(dest);
  }
  osc.start(o.t0);
  osc.stop(o.t0 + o.dur + 0.05);
}

export interface NoiseOpts {
  t0: number;
  dur: number;
  peak: number;
  filter: BiquadFilterType;
  f0: number;
  f1?: number;
  q?: number;
  attack?: number;
}

/** A burst of filtered noise, optionally sweeping from `f0` to `f1`. */
export function noise(ctx: Ctx, dest: AudioNode, o: NoiseOpts): void {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = o.filter;
  f.Q.value = o.q ?? 1;
  f.frequency.setValueAtTime(o.f0, o.t0);
  if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, o.t0 + o.dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, o.t0);
  g.gain.linearRampToValueAtTime(o.peak, o.t0 + (o.attack ?? 0.004));
  g.gain.exponentialRampToValueAtTime(0.0001, o.t0 + o.dur);
  src.connect(f);
  f.connect(g);
  g.connect(dest);
  src.start(o.t0);
  src.stop(o.t0 + o.dur + 0.05);
}

const impulses = new WeakMap<Ctx, Map<number, AudioBuffer>>();

function impulse(ctx: Ctx, seconds: number): AudioBuffer {
  let byLength = impulses.get(ctx);
  if (!byLength) {
    byLength = new Map();
    impulses.set(ctx, byLength);
  }
  let buf = byLength.get(seconds);
  if (!buf) {
    const len = Math.floor(ctx.sampleRate * seconds);
    buf = ctx.createBuffer(2, len, ctx.sampleRate);
    let seed = 99;
    for (let c = 0; c < 2; c++) {
      const data = buf.getChannelData(c);
      for (let i = 0; i < len; i++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        data[i] = ((seed / 4294967296) * 2 - 1) * Math.pow(1 - i / len, 2.4);
      }
    }
    byLength.set(seconds, buf);
  }
  return buf;
}

/** A small decaying-noise reverb. `amount` is the wet level (0-1). Returns the node to send into. */
export function makeReverb(ctx: Ctx, dest: AudioNode, seconds = 1.8, amount = 0.3): AudioNode {
  const conv = ctx.createConvolver();
  conv.buffer = impulse(ctx, seconds);
  const wet = ctx.createGain();
  wet.gain.value = amount;
  conv.connect(wet);
  wet.connect(dest);
  return conv;
}

/** Runs `body` with an output that goes both straight to `dest` and through a reverb at `amount`. */
export function withReverb(ctx: Ctx, dest: AudioNode, amount: number, body: (out: AudioNode) => void): void {
  const bus = ctx.createGain();
  bus.connect(dest);
  bus.connect(makeReverb(ctx, dest, 1.8, amount));
  body(bus);
}
