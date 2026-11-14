/**
 * FlightHudPreview.tsx — DEV ONLY. A stand-in Explore stage for testing the HUD, reticle, toast and
 * the outcome screens before the real ExploreScreen lands. Open the dev server with `?hud-preview`.
 *
 * It wires a real InputRouter + ScanTelemetry exactly as ENGINE_GUIDE.md describes, but replaces
 * physics with buttons (lock next target, take a hit, near miss, end the run).
 * Delete this file (and its two lines in App.tsx) once ExploreScreen is in.
 */

import { useEffect, useRef, useState } from 'react';
import { getBody } from '../../data/celestialBodies';
import { MISSIONS, getMission } from '../../data/missions';
import { InputRouter, ScanTelemetry } from '../../engine/inputRouter';
import { useGameStore } from '../../store/useGameStore';
import { reportMissionComplete, reportSignalLost } from '../../store/useOutcomeStore';
import { BodyPortrait } from '../ui/planet/BodyPortrait';
import { bodyArt, findBody } from './bodyLookup';
import { MissionHud } from './MissionHud';
import { ScanReticle, type ReticleAnchor } from './ScanReticle';
import { ScanSideToast } from './ScanSideToast';

const MAX_HULL = 4;

export function FlightHudPreview() {
  const selectedId = useGameStore((s) => s.selectedMissionId);
  const satelliteName = useGameStore((s) => s.satelliteName);
  const mission = getMission(selectedId) ?? MISSIONS[3];

  const [engine] = useState(() => {
    const telemetry = new ScanTelemetry({ errorAllowance: 1 });
    return { telemetry, router: new InputRouter({ telemetry }) };
  });
  const { router, telemetry } = engine;

  const [scanned, setScanned] = useState<string[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [hull, setHull] = useState(MAX_HULL);
  const [hits, setHits] = useState(0);
  const [nearMisses, setNearMisses] = useState(0);
  const [dodged, setDodged] = useState(0);
  const startedAt = useRef(performance.now());
  const stageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    router.reset();
    telemetry.reset();
    router.attach();
    const clock = window.setInterval(() => {
      telemetry.tick(0.1);
      if (router.getPhase() === 'APPROACH') setDodged((d) => d + (Math.random() < 0.25 ? 1 : 0));
    }, 100);
    const offs = [
      router.on('scanComplete', (e) => {
        const id = findBody(e.target)?.id ?? e.target;
        setScanned((s) => (s.includes(id) ? s : [...s, id]));
        window.setTimeout(() => setCurrent(null), 900);
      }),
      // No game loop here: pretend the time scale is back at 1.0 after the usual ease.
      router.on('phase', (p) => {
        if (p.phase === 'RESUME') window.setTimeout(() => router.finishResume(), 1200);
      }),
    ];
    return () => {
      window.clearInterval(clock);
      offs.forEach((off) => off());
      router.detach();
    };
  }, [router, telemetry]);

  const nextId = mission.targetIds.find((id) => !scanned.includes(id));

  const flight = () => ({
    hull,
    maxHull: MAX_HULL,
    hullHits: hits,
    nearMisses,
    asteroidsDodged: dodged,
    flightSeconds: (performance.now() - startedAt.current) / 1000,
  });

  const lockNext = (): void => {
    if (!nextId || router.isMovementLocked()) return;
    setCurrent(nextId);
    router.beginScan(getBody(nextId)?.name ?? nextId);
  };
  const takeHit = (): void => {
    if (router.isMovementLocked()) return;
    const h = hull - 1;
    setHull(h);
    setHits((n) => n + 1);
    if (h <= 0) {
      reportSignalLost({
        missionId: mission.id,
        satelliteName,
        scanned,
        telemetry: telemetry.getSnapshot(),
        flight: { ...flight(), hull: 0, hullHits: hits + 1 },
        lossCause: `A tumbling asteroid struck the bus on approach to ${getBody(nextId ?? '')?.name ?? 'the target'}. The high-gain antenna lost its lock on Earth.`,
      });
    }
  };
  const finish = (): void => {
    reportMissionComplete({
      missionId: mission.id,
      satelliteName,
      scanned: mission.targetIds,
      telemetry: telemetry.getSnapshot(),
      flight: flight(),
    });
  };

  const getAnchor = (): ReticleAnchor | null => {
    const el = stageRef.current;
    if (!el) return null;
    const t = performance.now() / 1000;
    return { x: el.clientWidth * 0.62 + Math.sin(t * 0.6) * 24, y: el.clientHeight * 0.42 + Math.cos(t * 0.5) * 10, radius: 70 };
  };
  const art = current ? bodyArt(current) : null;
  const [, force] = useState(0);
  useEffect(() => {
    if (!current) return;
    let raf = 0;
    const loop = (): void => {
      force((n) => (n + 1) % 1e6);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [current]);
  const anchor = current ? getAnchor() : null;

  const btn = (label: string, fn: () => void, disabled = false) => (
    <button
      type="button"
      className="mo-btn mo-btn--ghost"
      style={{ padding: '7px 12px', fontSize: 11 }}
      // Keep focus off the button so typed letters go to the router, not a "click".
      onMouseDown={(e) => e.preventDefault()}
      onClick={fn}
      disabled={disabled}
    >
      {label}
    </button>
  );

  return (
    <section className="mo-screen" style={{ padding: 0, gap: 0 }}>
      <div ref={stageRef} style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {art && anchor && (
          <div style={{ position: 'absolute', left: anchor.x, top: anchor.y, transform: 'translate(-50%, -50%)' }}>
            <BodyPortrait art={art} size={art === 'saturn' ? 60 : 130} />
          </div>
        )}
        <MissionHud
          router={router}
          telemetry={telemetry}
          mission={mission}
          scanned={scanned}
          hull={hull}
          maxHull={MAX_HULL}
          nearMisses={nearMisses}
          satelliteName={satelliteName}
        />
        <ScanReticle router={router} getAnchor={getAnchor} />
        <ScanSideToast router={router} />
      </div>
      <div
        style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '10px 16px', borderTop: '1px solid var(--mo-line)', alignItems: 'center' }}
      >
        <span className="mo-mono" style={{ fontSize: 11, color: 'var(--mo-amber)', letterSpacing: '0.14em' }}>
          HUD PREVIEW · {mission.code}
        </span>
        {btn(nextId ? `Lock ${getBody(nextId)?.name}` : 'All scanned', lockNext, !nextId || current !== null)}
        {btn('Take hit', takeHit, current !== null)}
        {btn('Near miss', () => setNearMisses((n) => n + 1))}
        {btn('Mission complete →', finish)}
        {btn('Outro →', () => useGameStore.getState().setScreen('outro'))}
      </div>
    </section>
  );
}

export default FlightHudPreview;
