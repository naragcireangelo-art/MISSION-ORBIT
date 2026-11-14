/**
 * SoundLab.tsx — A dev-only page for auditioning sound effects and gameplay music.
 *
 * Open the dev server with `?sound-lab` (for example http://localhost:5173/?sound-lab). It is not part
 * of the game and is left out of production builds.
 *
 *   1. Click ▶ on each candidate and hear it. "Play with menu music" runs the real menu soundtrack
 *      underneath, so you hear the sound the way it will be heard in the game.
 *   2. Choose your favourite in each group with "Pick".
 *   3. Press "Copy my picks" and paste the text back to the developer.
 *
 * Everything is synthesized live. The level column (peak and loudness, measured offline) is there so
 * candidates can be matched for volume without guessing.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { audioManager } from '../engine/audioManager';
import { uiAudio } from '../engine/uiAudio';
import '../styles/missionControl.css';
import './soundLab.css';
import { BPM_BY_TIER, LabMusic, measureMusic, type MusicVariant, type Tier } from './soundLab/music';
import { VOICES, VOICE_GROUPS, measureVoice, type Level, type Voice } from './soundLab/synth';

type MusicChoice = 'current' | MusicVariant;

const MUSIC_CHOICES: { id: MusicChoice; name: string; blurb: string }[] = [
  { id: 'current', name: 'Current (what the game plays now)', blurb: 'A low drone with random plucks. Intensity works; scan mode does not.' },
  { id: 'drift', name: 'Drift', blurb: 'Calm pad, sparse plucked arpeggio, low drone. No drums.' },
  { id: 'pulse', name: 'Pulse', blurb: 'Driving: bass on eighths, 16th arpeggio, soft kick and hats as it gets busier.' },
  { id: 'orbit', name: 'Orbit', blurb: 'Wide and slow: bells, high shimmer, and a string-like swell as it gets busier.' },
];

const fmt = (n: number): string => `${n.toFixed(1)} dB`;
const signed = (n: number): string => `${n >= 0 ? '+' : ''}${n.toFixed(1)} dB`;

export function SoundLab() {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const musicRef = useRef<LabMusic | null>(null);

  const [volume, setVolume] = useState(0.8);
  const [menuMusic, setMenuMusic] = useState(false);
  const [matchLoudness, setMatchLoudness] = useState(true);
  const [levels, setLevels] = useState<Record<string, Level>>({});
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [copied, setCopied] = useState(false);

  const [choice, setChoice] = useState<MusicChoice>('drift');
  const [playing, setPlaying] = useState(false);
  const [intensity, setIntensity] = useState(0.4);
  const [scan, setScan] = useState(false);
  const [tier, setTier] = useState<Tier>(2);
  const [demo, setDemo] = useState(false);
  const [musicLevels, setMusicLevels] = useState<Record<string, Level>>({});

  // One AudioContext for the lab, created on the first click (browsers require a gesture).
  const ensureAudio = useCallback((): { ctx: AudioContext; master: GainNode } => {
    if (!ctxRef.current) {
      const ctx = new AudioContext();
      const master = ctx.createGain();
      master.gain.value = volume;
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -10;
      limiter.ratio.value = 8;
      master.connect(limiter);
      limiter.connect(ctx.destination);
      ctxRef.current = ctx;
      masterRef.current = master;
    }
    const ctx = ctxRef.current;
    if (ctx.state === 'suspended') void ctx.resume();
    return { ctx, master: masterRef.current as GainNode };
  }, [volume]);

  useEffect(() => {
    if (masterRef.current && ctxRef.current) masterRef.current.gain.setTargetAtTime(volume, ctxRef.current.currentTime, 0.05);
  }, [volume]);

  // Measure every sound and music variant offline (nothing plays).
  useEffect(() => {
    let alive = true;
    void (async () => {
      const out: Record<string, Level> = {};
      for (const v of VOICES) out[v.id] = await measureVoice(v);
      if (alive) setLevels(out);
      const m: Record<string, Level> = {};
      for (const variant of ['drift', 'pulse', 'orbit'] as const) {
        m[`${variant}-calm`] = await measureMusic(variant, { intensity: 0.2, scan: false, tier: 2 });
        m[`${variant}-busy`] = await measureMusic(variant, { intensity: 0.9, scan: false, tier: 2 });
        m[`${variant}-scan`] = await measureMusic(variant, { intensity: 0.5, scan: true, tier: 2 });
      }
      if (alive) setMusicLevels(m);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const refRms = levels['select-current']?.rmsDb;

  // With "match loudness" on, every candidate is trimmed to the average loudness of today's chime, so a
  // sound does not win just by being louder. The trim is limited to a sensible range.
  const trimFor = (v: Voice): number => {
    const lv = levels[v.id];
    if (!matchLoudness || !lv || refRms === undefined) return 1;
    return Math.pow(10, Math.max(-14, Math.min(14, refRms - lv.rmsDb)) / 20);
  };

  const playVoice = (v: Voice): void => {
    const { ctx, master } = ensureAudio();
    const trim = ctx.createGain();
    trim.gain.value = trimFor(v);
    trim.connect(master);
    v.play(ctx, trim, ctx.currentTime + 0.02);
  };

  const playCurrentReal = (): void => {
    uiAudio.start();
    window.setTimeout(() => uiAudio.sfx.confirm(), 80);
  };

  const toggleMenuMusic = (): void => {
    if (menuMusic) {
      uiAudio.stop();
      setMenuMusic(false);
    } else {
      uiAudio.start();
      setMenuMusic(true);
    }
  };

  // ── Music ──────────────────────────────────────────────────────────────────
  const stopMusic = useCallback((): void => {
    musicRef.current?.stop(0.6);
    musicRef.current = null;
    audioManager.setIntensity(0);
    audioManager.stopMusic(500);
    setPlaying(false);
    setDemo(false);
  }, []);

  const startMusic = useCallback(
    (which: MusicChoice): void => {
      musicRef.current?.stop(0.4);
      musicRef.current = null;
      audioManager.stopMusic(300);
      if (which === 'current') {
        void audioManager.unlock().then(() => {
          audioManager.setIntensity(intensity);
          void audioManager.startMusic();
        });
      } else {
        const { ctx, master } = ensureAudio();
        const m = new LabMusic(ctx, master, which, { intensity, scan, tier });
        m.start();
        musicRef.current = m;
      }
      setPlaying(true);
    },
    [ensureAudio, intensity, scan, tier],
  );

  const chooseMusic = (id: MusicChoice): void => {
    setChoice(id);
    if (playing) startMusic(id);
  };

  // Live parameter changes.
  useEffect(() => {
    musicRef.current?.setParams({ intensity, scan, tier });
    if (choice === 'current') audioManager.setIntensity(intensity);
  }, [intensity, scan, tier, choice]);

  // Demo: sweep intensity up and down and drop into scan mode now and then, like a real flight.
  useEffect(() => {
    if (!demo || !playing) return;
    const started = performance.now();
    const id = window.setInterval(() => {
      const t = (performance.now() - started) / 1000;
      setIntensity(Math.round((0.5 + 0.45 * Math.sin((2 * Math.PI * t) / 26 - 1.2)) * 100) / 100);
      setScan(Math.floor(t / 13) % 3 === 2);
    }, 400);
    return () => window.clearInterval(id);
  }, [demo, playing]);

  useEffect(
    () => () => {
      musicRef.current?.stop(0.2);
      audioManager.stopMusic(200);
      uiAudio.stop();
    },
    [],
  );

  // ── Picks ──────────────────────────────────────────────────────────────────
  const pick = (group: string, id: string): void => setPicks((p) => ({ ...p, [group]: id }));

  const summary = useMemo(() => {
    const name = (id: string | undefined): string => VOICES.find((v) => v.id === id)?.name ?? 'no pick';
    const music = MUSIC_CHOICES.find((m) => m.id === picks.music)?.name ?? 'no pick';
    return [
      `Mission select: ${name(picks.select)}`,
      `Next step: ${name(picks.step)}`,
      `Launch: ${name(picks.launch)}`,
      `Gameplay music: ${music}`,
      notes.trim() ? `Notes: ${notes.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }, [picks, notes]);

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt('Copy your picks:', summary);
    }
  };

  return (
    <div className="lab">
      <header className="lab__head">
        <h1>Sound lab</h1>
        <p>
          Click ▶ to hear each candidate, <b>Pick</b> your favourites, then <b>Copy my picks</b> and send them back.
          Everything is synthesized live. Already in the game: Mission select B, Next step 2, Launch L1 and the Pulse music;
          the rest are kept here for comparison.
        </p>
        <div className="lab__bar">
          <label>
            Volume
            <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
          </label>
          <button type="button" className={`mo-btn ${menuMusic ? 'mo-btn--primary' : 'mo-btn--ghost'}`} onClick={toggleMenuMusic}>
            {menuMusic ? '■ Menu music on' : '▶ Play with menu music'}
          </button>
          <label className="lab__check" title="Trim every candidate to the same average loudness as the current chime">
            <input type="checkbox" checked={matchLoudness} onChange={(e) => setMatchLoudness(e.target.checked)} /> Match loudness
          </label>
          <span className="lab__hint">Turn menu music on to hear the effects the way they will sound in the Archive.</span>
        </div>
      </header>

      {VOICE_GROUPS.map((g) => (
        <section key={g.id} className="lab__section">
          <h2>{g.title}</h2>
          <p className="lab__note">{g.note}</p>
          <ul className="lab__list">
            {g.id === 'select' && (
              <li className="lab__row">
                <button type="button" className="lab__play" onClick={playCurrentReal} aria-label="Play the real current sound">
                  ▶
                </button>
                <div className="lab__text">
                  <strong>Current (the real in-game sound)</strong>
                  <span>Plays the actual confirm chime used today, through the game's own audio.</span>
                </div>
              </li>
            )}
            {VOICES.filter((v) => v.group === g.id).map((v) => {
              const lv = levels[v.id];
              return (
                <li key={v.id} className={`lab__row${picks[g.id] === v.id ? ' is-picked' : ''}`}>
                  <button type="button" className="lab__play" onClick={() => playVoice(v)} aria-label={`Play ${v.name}`}>
                    ▶
                  </button>
                  <div className="lab__text">
                    <strong>{v.name}</strong>
                    <span>{v.blurb}</span>
                  </div>
                  <div className="lab__level" title="Peak and average loudness, measured offline">
                    {lv ? (
                      <>
                        <span>peak {fmt(lv.peakDb)}</span>
                        <span>avg {fmt(lv.rmsDb)}</span>
                        {refRms !== undefined && v.id !== 'select-current' && <em>{matchLoudness ? 'matched to current' : `${signed(lv.rmsDb - refRms)} vs current`}</em>}
                      </>
                    ) : (
                      <span>measuring…</span>
                    )}
                  </div>
                  <label className="lab__pick">
                    <input type="radio" name={`pick-${g.id}`} checked={picks[g.id] === v.id} onChange={() => pick(g.id, v.id)} /> Pick
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <section className="lab__section">
        <h2>Gameplay music</h2>
        <p className="lab__note">
          All three new options are in D minor, the same key and chords as the menu music. Press ▶, then move the sliders:
          intensity is how crowded the asteroid field is, and Scan mode is the slow-motion typing phase.
        </p>
        <ul className="lab__list">
          {MUSIC_CHOICES.map((m) => {
            const calm = musicLevels[`${m.id}-calm`];
            const busy = musicLevels[`${m.id}-busy`];
            return (
              <li key={m.id} className={`lab__row${picks.music === m.id ? ' is-picked' : ''}${choice === m.id ? ' is-active' : ''}`}>
                <button
                  type="button"
                  className="lab__play"
                  onClick={() => (choice === m.id && playing ? stopMusic() : (setChoice(m.id), startMusic(m.id)))}
                  aria-label={choice === m.id && playing ? `Stop ${m.name}` : `Play ${m.name}`}
                >
                  {choice === m.id && playing ? '■' : '▶'}
                </button>
                <div className="lab__text">
                  <strong>{m.name}</strong>
                  <span>{m.blurb}</span>
                </div>
                <div className="lab__level">
                  {calm && busy ? (
                    <>
                      <span>calm avg {fmt(calm.rmsDb)}</span>
                      <span>busy avg {fmt(busy.rmsDb)}</span>
                    </>
                  ) : m.id === 'current' ? (
                    <span>n/a</span>
                  ) : (
                    <span>measuring…</span>
                  )}
                </div>
                <label className="lab__pick">
                  <input type="radio" name="pick-music" checked={picks.music === m.id} onChange={() => pick('music', m.id)} /> Pick
                </label>
              </li>
            );
          })}
        </ul>

        <div className="lab__controls" aria-label="Music controls">
          <label>
            Intensity {intensity.toFixed(2)}
            <input type="range" min={0} max={1} step={0.01} value={intensity} onChange={(e) => setIntensity(Number(e.target.value))} />
          </label>
          <label className="lab__check">
            <input type="checkbox" checked={scan} onChange={(e) => setScan(e.target.checked)} disabled={choice === 'current'} /> Scan mode (slow motion)
          </label>
          <label>
            Difficulty tier
            <select value={tier} onChange={(e) => setTier(Number(e.target.value) as Tier)} disabled={choice === 'current'}>
              {([1, 2, 3, 4] as const).map((t) => (
                <option key={t} value={t}>
                  Tier {t} · {BPM_BY_TIER[t]} BPM
                </option>
              ))}
            </select>
          </label>
          <button type="button" className={`mo-btn ${demo ? 'mo-btn--primary' : 'mo-btn--ghost'}`} onClick={() => setDemo((d) => !d)} disabled={!playing || choice === 'current'}>
            {demo ? '■ Stop demo' : '▶ Auto demo of a flight'}
          </button>
        </div>
        {choice === 'current' && <p className="lab__note">The current music has no scan mode or tempo setting; only intensity applies.</p>}
      </section>

      <section className="lab__section lab__picks">
        <h2>Your picks</h2>
        <textarea placeholder="Anything else? (for example: 'Pulse but softer', 'select sound too long')" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        <pre>{summary}</pre>
        <button type="button" className="mo-btn mo-btn--primary" onClick={() => void copy()}>
          {copied ? 'Copied!' : 'Copy my picks'}
        </button>
      </section>
    </div>
  );
}

export default SoundLab;
