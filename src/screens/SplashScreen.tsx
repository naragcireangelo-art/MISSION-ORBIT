/**
 * SplashScreen.tsx — The entry screen of Mission Orbit.
 *
 * Arrival sequence: a hyperspace warp decelerates into a starfield, Earth rises with its
 * atmosphere and city lights, satellites orbit through the planet's shadow, the MISSION ORBIT
 * title assembles letter by letter, and a Deep Space Network boot log types itself out.
 *
 * Enter / Space / click initializes audio, fires a warp jump and moves on to the Mission Archive.
 * Corner controls: Celestial Codex (C) and Sound (M).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react';
import '../styles/missionControl.css';
import { CelestialCodexModal } from '../components/ui/CelestialCodexModal';
import { useReducedMotion, useViewport } from '../components/ui/hooks';
import { IconCodex, IconMute, IconSound } from '../components/ui/icons';
import { MissionEmblem } from '../components/ui/MissionEmblem';
import { PlanetSphere, type SphereDecorator, type SphereDrawContext } from '../components/ui/planet/PlanetSphere';
import { SpaceBackdrop } from '../components/ui/SpaceBackdrop';
import { MISSIONS } from '../data/missions';
import { uiAudio } from '../engine/uiAudio';
import { useGameStore } from '../store/useGameStore';

type Stage = 'intro' | 'ready' | 'launching';

const TITLE = 'MISSION ORBIT';

const BOOT_LINES: { lead: string; status: string }[] = [
  { lead: '> DEEP SPACE NETWORK ...... ', status: 'LINKED' },
  { lead: `> NASA MISSION ARCHIVE .... `, status: `${MISSIONS.length} FILES` },
];

// ── Orbit rings and satellites drawn around the planet ───────────────────────

interface OrbitRing {
  /** Semi-major axis in planet radii. */
  a: number;
  /** Ellipse flattening (semi-minor / semi-major). */
  ratio: number;
  /** Roll of the orbit plane (radians). */
  roll: number;
  /** Radians per second; negative orbits the other way. */
  speed: number;
  color: string;
  dashed?: boolean;
  satellites: number;
}

const ORBIT_RINGS: OrbitRing[] = [
  { a: 1.42, ratio: 0.3, roll: -0.38, speed: 0.62, color: '111,243,255', satellites: 1 },
  { a: 1.72, ratio: 0.4, roll: 0.3, speed: -0.38, color: '255,184,77', dashed: true, satellites: 2 },
  { a: 2.05, ratio: 0.22, roll: -0.12, speed: 0.24, color: '160,190,255', satellites: 1 },
];

function drawRingHalf(d: SphereDrawContext, ring: OrbitRing, front: boolean): void {
  const { ctx, cx, cy, radius } = d;
  ctx.save();
  ctx.strokeStyle = `rgba(${ring.color},${front ? 0.5 : 0.3})`;
  ctx.lineWidth = front ? 1.2 : 1;
  ctx.setLineDash(ring.dashed ? [3, 7] : []);
  ctx.beginPath();
  // sin(phi) > 0 is the near side of the orbit (drawn in front of the planet).
  ctx.ellipse(cx, cy, ring.a * radius, ring.a * radius * ring.ratio, ring.roll, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawSatellite(d: SphereDrawContext, ring: OrbitRing, phi: number): void {
  const { ctx, cx, cy, radius } = d;
  const ex = Math.cos(phi) * ring.a * radius;
  const ey = Math.sin(phi) * ring.a * radius * ring.ratio;
  const cr = Math.cos(ring.roll);
  const sr = Math.sin(ring.roll);
  const x = cx + ex * cr - ey * sr;
  const y = cy + ex * sr + ey * cr;
  const near = Math.sin(phi) > 0;
  const s = near ? 1.15 : 0.85;

  ctx.save();
  ctx.translate(x, y);
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 16 * s);
  glow.addColorStop(0, `rgba(${ring.color},0.55)`);
  glow.addColorStop(1, `rgba(${ring.color},0)`);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 16 * s, 0, Math.PI * 2);
  ctx.fill();
  // body + solar panels
  ctx.rotate(ring.roll);
  ctx.fillStyle = '#e8f3ff';
  ctx.fillRect(-2.6 * s, -2.6 * s, 5.2 * s, 5.2 * s);
  ctx.fillStyle = `rgba(${ring.color},0.95)`;
  ctx.fillRect(-11 * s, -1.6 * s, 7 * s, 3.2 * s);
  ctx.fillRect(4 * s, -1.6 * s, 7 * s, 3.2 * s);
  ctx.restore();
}

function makeOrbitDecorator(): SphereDecorator {
  const eachSatellite = (
    d: SphereDrawContext,
    wantFront: boolean,
    fn: (ring: OrbitRing, phi: number) => void,
  ): void => {
    for (const ring of ORBIT_RINGS) {
      for (let i = 0; i < ring.satellites; i++) {
        const phi = d.time * ring.speed + (i * Math.PI * 2) / ring.satellites + ring.roll * 4;
        const isFront = Math.sin(phi) > 0;
        if (isFront === wantFront) fn(ring, phi);
      }
    }
  };
  return {
    behind: (d) => {
      for (const ring of ORBIT_RINGS) drawRingHalf(d, ring, false);
      eachSatellite(d, false, (ring, phi) => drawSatellite(d, ring, phi));
    },
    front: (d) => {
      for (const ring of ORBIT_RINGS) drawRingHalf(d, ring, true);
      eachSatellite(d, true, (ring, phi) => drawSatellite(d, ring, phi));
    },
  };
}

// ── Screen ───────────────────────────────────────────────────────────────────

export function SplashScreen() {
  const setScreen = useGameStore((s) => s.setScreen);
  const muted = useGameStore((s) => s.muted);
  const toggleMute = useGameStore((s) => s.toggleMute);
  const openCodex = useGameStore((s) => s.openCodex);
  const codexOpen = useGameStore((s) => s.codexOpen);

  const reduced = useReducedMotion();
  const { width, height } = useViewport();
  const [stage, setStage] = useState<Stage>(reduced ? 'ready' : 'intro');
  const launchTimer = useRef<number | null>(null);
  const readyTimer = useRef<number | null>(null);

  const decorator = useMemo(() => makeOrbitDecorator(), []);
  const earthSize = Math.round(Math.max(200, Math.min(height * 0.42, width * 0.34, 500)));

  // Intro → ready (the prompt starts pulsing once the animation has settled).
  useEffect(() => {
    if (reduced) {
      setStage((s) => (s === 'intro' ? 'ready' : s));
      return;
    }
    readyTimer.current = window.setTimeout(() => setStage((s) => (s === 'intro' ? 'ready' : s)), 4600);
    return () => {
      if (readyTimer.current !== null) window.clearTimeout(readyTimer.current);
    };
  }, [reduced]);

  useEffect(
    () => () => {
      if (launchTimer.current !== null) window.clearTimeout(launchTimer.current);
    },
    [],
  );

  const launch = (): void => {
    if (stage === 'launching') return;
    uiAudio.start();
    uiAudio.setMuted(muted);
    uiAudio.sfx.warp();
    setStage('launching');
    launchTimer.current = window.setTimeout(() => setScreen('archive'), reduced ? 300 : 1500);
  };

  // Enter / Space start; C opens the Codex; M toggles sound.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (codexOpen || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const key = e.key.toLowerCase();
      const target = e.target;
      const onOtherButton =
        target instanceof HTMLElement && target.tagName === 'BUTTON' && !target.classList.contains('mo-splash__start');
      if ((e.key === 'Enter' || e.key === ' ') && !onOtherButton) {
        e.preventDefault();
        launch();
      } else if (key === 'c') {
        e.preventDefault();
        uiAudio.start();
        openCodex();
      } else if (key === 'm') {
        e.preventDefault();
        toggleMute();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codexOpen, stage, muted]);

  useEffect(() => {
    uiAudio.setMuted(muted);
  }, [muted]);

  const onSectionClick = (e: ReactMouseEvent<HTMLElement>): void => {
    if (codexOpen) return;
    if ((e.target as HTMLElement).closest('[data-no-launch]')) return;
    launch();
  };

  const letters = Array.from(TITLE);

  return (
    <section
      className="mo-app mo-splash"
      data-stage={stage}
      onClick={onSectionClick}
      aria-label="Mission Orbit title screen"
      style={{ '--mo-earth': `${earthSize}px` } as CSSProperties}
    >
      <div className="mo-backdrop mo-backdrop--splash" aria-hidden="true">
        <SpaceBackdrop initialWarp asteroids density={1} mode={stage === 'launching' ? 'warp' : 'idle'} />
      </div>
      <div className="mo-splash__nebula" aria-hidden="true" />
      <div className="mo-vignette" aria-hidden="true" />
      <div className="mo-flash" aria-hidden="true" />

      {/* Top row: boot log + controls */}
      <header className="mo-splash__top">
        <div className="mo-boot" aria-hidden="true">
          {BOOT_LINES.map((line, i) => {
            const n = line.lead.length + line.status.length;
            return (
              <p
                key={line.lead}
                className="mo-boot__line"
                style={{ '--n': n, '--d': `${1.4 + i * 0.75}s` } as CSSProperties}
              >
                {line.lead}
                <b>{line.status}</b>
              </p>
            );
          })}
        </div>
        <div className="mo-splash__controls" data-no-launch>
          <button
            type="button"
            className="mo-pillbtn"
            onClick={() => {
              uiAudio.start();
              uiAudio.sfx.click();
              openCodex();
            }}
            title="Celestial Codex (C)"
          >
            <IconCodex size={16} /> Celestial Codex <kbd>C</kbd>
          </button>
          <button
            type="button"
            className={`mo-pillbtn${muted ? ' is-off' : ''}`}
            onClick={toggleMute}
            aria-pressed={muted}
            title="Sound (M)"
          >
            {muted ? <IconMute size={16} /> : <IconSound size={16} />} {muted ? 'Sound off' : 'Sound on'} <kbd>M</kbd>
          </button>
        </div>
      </header>

      {/* Hero */}
      <div className="mo-splash__center">
        <div className="mo-splash__hero">
          <div className="mo-splash__halo" aria-hidden="true" />
          <div className="mo-splash__tickring" aria-hidden="true" />
          <div className="mo-splash__tickring mo-splash__tickring--b" aria-hidden="true" />
          <div className="mo-splash__earth">
            <PlanetSphere
              body="earth"
              size={earthSize}
              pad={2.5}
              fps={30}
              decorator={decorator}
              startAngle={2.4}
              label="Rotating Earth with satellites in orbit"
            />
          </div>
        </div>

        <div className="mo-splash__titleblock">
          <p className="mo-splash__eyebrow">
            <MissionEmblem size={26} /> NASA Space Apps Challenge · 2026
          </p>
          <h1 className="mo-splash__title" aria-label="Mission Orbit">
            {letters.map((ch, i) => (
              <span
                key={i}
                aria-hidden="true"
                className={`mo-splash__letter${ch === ' ' ? ' is-space' : ''}`}
                style={{ '--i': i } as CSSProperties}
              >
                {ch === ' ' ? ' ' : ch}
              </span>
            ))}
          </h1>
          <p className="mo-splash__subtitle">
            An educational space-flight arcade · {MISSIONS.length} real NASA missions · 1973 – 2021
          </p>
        </div>

        <button type="button" className="mo-splash__start" onClick={(e) => { e.stopPropagation(); launch(); }}>
          <span className="mo-splash__chev" aria-hidden="true">
            ▶
          </span>
          Press Enter to initialize uplink
          <span className="mo-splash__chev" aria-hidden="true">
            ◀
          </span>
        </button>
        <p className="mo-splash__hint">or click anywhere · Space</p>
      </div>

      <footer className="mo-splash__bottom">
        <span>Educational simulation inspired by real NASA missions · Not an official NASA product</span>
        <span className="mo-mono">MISSION ORBIT · v2.1</span>
      </footer>

      <CelestialCodexModal />
    </section>
  );
}

export default SplashScreen;
