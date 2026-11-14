/**
 * music.ts — Sound Lab glue for the gameplay music: re-exports the engine's score and adds the
 * offline loudness meter used by the lab page.
 */

import { FlightMusic, type MusicParams, type MusicVariant } from '../../engine/flightMusic';
import type { Level } from './synth';

export { BPM_BY_TIER, FlightMusic as LabMusic } from '../../engine/flightMusic';
export type { MusicParams, MusicVariant, Tier } from '../../engine/flightMusic';

// ── Offline loudness for a variant ───────────────────────────────────────────

/** Render a stretch of a variant offline and measure its loudness (skipping the fade-in). */
export async function measureMusic(variant: MusicVariant, params: MusicParams, seconds = 18): Promise<Level> {
  const sr = 44100;
  const oc = new OfflineAudioContext(1, Math.ceil(seconds * sr), sr);
  const m = new FlightMusic(oc, oc.destination, variant, params);
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
