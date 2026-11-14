/**
 * uiSounds.ts — The three menu sounds that mark the player's journey into a flight.
 *
 *   select   picking a mission card in the Archive        ("Launch commit": a short rising sweep into a chime)
 *   next     Continue / Next in Assembly and Briefing     ("Two-tone": D5 then A5, tight and clean)
 *   launch   Play on the Objectives screen                ("Short warp": a rising whoosh ending in a chime)
 *
 * Chosen in the Sound Lab. All three are in D minor to sit with the menu soundtrack, and all are
 * synthesized (no audio files). The `*Raw` recipes are the sounds as designed; `playUiSound` applies the
 * level trims the lab used for "match loudness", so each plays at the same average loudness as the old
 * confirm chime and the three are balanced with each other.
 */

import { noise, tone, withReverb, type Ctx } from './synthKit';

export type UiSoundKind = 'select' | 'next' | 'launch';

const D5 = 587.33;
const A5 = 880;

/** Level trims in dB, measured offline against the old chime (-41.9 dB average). */
const TRIM_DB: Record<UiSoundKind, number> = { select: -5.5, next: -3.0, launch: -6.0 };

const dbToGain = (db: number): number => Math.pow(10, db / 20);

/** Mission select: a short rising sweep into a clear D5 + A5 chime. About 1.3 s. */
export function missionSelectRaw(ctx: Ctx, dest: AudioNode, t0: number): void {
  withReverb(ctx, dest, 0.35, (out) => {
    noise(ctx, out, { t0, dur: 0.38, peak: 0.09, filter: 'bandpass', f0: 300, f1: 2600, q: 1.2, attack: 0.15 });
    tone(ctx, out, { t0, dur: 0.38, peak: 0.05, f0: 220, f1: 440, attack: 0.12 });
    tone(ctx, out, { t0: t0 + 0.34, dur: 0.8, peak: 0.07, f0: D5 });
    tone(ctx, out, { t0: t0 + 0.34, dur: 0.7, peak: 0.05, f0: A5 });
  });
}

/** Next step: D5 then A5, tight and clean. About 0.35 s. */
export function nextStepRaw(ctx: Ctx, dest: AudioNode, t0: number): void {
  tone(ctx, dest, { t0, dur: 0.12, peak: 0.06, f0: D5 });
  tone(ctx, dest, { t0: t0 + 0.07, dur: 0.16, peak: 0.06, f0: A5 });
}

/** Launch: a rising whoosh with a deep swell, ending in a D5 + A5 chime. About 1.6 s. */
export function launchRaw(ctx: Ctx, dest: AudioNode, t0: number): void {
  withReverb(ctx, dest, 0.3, (out) => {
    noise(ctx, out, { t0, dur: 0.75, peak: 0.13, filter: 'bandpass', f0: 180, f1: 4200, q: 1.4, attack: 0.3 });
    tone(ctx, out, { t0, dur: 0.7, peak: 0.08, f0: 55, f1: 165, type: 'triangle', attack: 0.25 });
    tone(ctx, out, { t0: t0 + 0.55, dur: 0.9, peak: 0.05, f0: D5 });
    tone(ctx, out, { t0: t0 + 0.55, dur: 0.8, peak: 0.04, f0: A5 });
  });
}

const RECIPES: Record<UiSoundKind, (ctx: Ctx, dest: AudioNode, t0: number) => void> = {
  select: missionSelectRaw,
  next: nextStepRaw,
  launch: launchRaw,
};

/** Play one of the menu sounds, level-matched, into `dest`. */
export function playUiSound(kind: UiSoundKind, ctx: Ctx, dest: AudioNode, t0: number): void {
  const trim = ctx.createGain();
  trim.gain.value = dbToGain(TRIM_DB[kind]);
  trim.connect(dest);
  RECIPES[kind](ctx, trim, t0);
}
