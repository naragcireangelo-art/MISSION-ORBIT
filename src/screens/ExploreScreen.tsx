/**
 * ExploreScreen.tsx — The flight itself: dodge asteroids, scan each target by typing its name.
 *
 * This file only connects things:
 *   InputRouter  keyboard (flying vs typing) and the scan phases          engine/inputRouter.ts
 *   GameLoop     60 FPS fixed steps, slow-mo, canvas layers               engine/gameLoop.ts
 *   FlightSim    all the rules (asteroids, hull, targets, win / loss)     engine/flightSim.ts
 *   art/         drawSatellite, drawAsteroid, drawStarfield
 *   HUD          MissionHud, ScanReticle, ScanSideToast                   components/flight/
 *   Outcome      reportMissionComplete / reportSignalLost                 store/useOutcomeStore.ts
 *
 * Stacking inside the stage (back to front): starfield canvas → target planet (DOM) → game canvas
 * (asteroids, ship, effects) → HUD. The planet sits behind the ship and rocks on purpose.
 */

import { useEffect, useRef, useState } from 'react';
import { drawAsteroid, drawSatellite, drawStarfield } from '../art';
import { BodyPortrait } from '../components/ui/planet/BodyPortrait';
import { bodyArt } from '../components/flight/bodyLookup';
import { MissionHud } from '../components/flight/MissionHud';
import { ScanReticle } from '../components/flight/ScanReticle';
import { ScanSideToast } from '../components/flight/ScanSideToast';
import { MISSIONS, getMission } from '../data/missions';
import { computeBuildStats } from '../data/parts';
import { audioManager } from '../engine/audioManager';
import { FlightSim } from '../engine/flightSim';
import { GAMEPLAY } from '../engine/flightTypes';
import { FIXED_DT, GameLoop } from '../engine/gameLoop';
import { InputRouter, ScanTelemetry } from '../engine/inputRouter';
import { useAssemblyStore } from '../store/useAssemblyStore';
import { useGameStore } from '../store/useGameStore';
import { reportMissionComplete, reportSignalLost } from '../store/useOutcomeStore';
import '../styles/explore.css';

interface TargetView {
  id: string;
  art: NonNullable<ReturnType<typeof bodyArt>>;
  /** Diameter in world units (fractions of the stage height). */
  size: number;
}

interface Popup {
  text: string;
  x: number;
  y: number;
  age: number;
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/** Restarting remounts the flight with a fresh sim, router and clocks (same build, same mission). */
export function ExploreScreen() {
  const [run, setRun] = useState(0);
  return <ExploreRun key={run} onRestart={() => setRun((n) => n + 1)} />;
}

function ExploreRun({ onRestart }: { onRestart: () => void }) {
  const selectedId = useGameStore((s) => s.selectedMissionId);
  const setScreen = useGameStore((s) => s.setScreen);
  const mission = getMission(selectedId) ?? MISSIONS[0];
  const build = useAssemblyStore((s) => s.build);

  // Engine objects the HUD needs at render time. Everything else is created in the effect below.
  const [stats] = useState(() => computeBuildStats(build));
  const [engine] = useState(() => {
    const telemetry = new ScanTelemetry({ errorAllowance: stats.freeErrors });
    return { telemetry, router: new InputRouter({ telemetry }) };
  });
  const { router, telemetry } = engine;

  const [hull, setHull] = useState(stats.maxHull);
  const [signal, setSignal] = useState(1);
  const [nearMisses, setNearMisses] = useState(0);
  const [scanned, setScanned] = useState<string[]>([]);
  const [target, setTarget] = useState<TargetView | null>(null);
  const [stageH, setStageH] = useState(700);
  const [paused, setPaused] = useState(false);

  const loopRef = useRef<GameLoop | null>(null);
  const resumeBtnRef = useRef<HTMLButtonElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const backRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const planetRef = useRef<HTMLDivElement | null>(null);
  const simRef = useRef<FlightSim | null>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const back = backRef.current;
    if (!stage || !canvas || !back) return;

    const parts = { body: build.body, antenna: build.antenna, laser: build.laser, thruster: build.thruster };
    const aspectNow = (): number => clamp(stage.clientWidth / Math.max(1, stage.clientHeight), 1.2, 2.6);

    const sim = new FlightSim({
      mission,
      parts,
      stats,
      aspect: aspectNow(),
      seed: (Math.random() * 0xffffffff) >>> 0,
    });
    simRef.current = sim;

    router.reset();
    telemetry.reset();
    telemetry.setErrorAllowance(stats.freeErrors);

    const loop = new GameLoop({
      canvas,
      background: null, // transparent: the starfield and planet live on layers behind this canvas
      onTimeScaleSettled: (scale) => {
        if (scale === 1) router.finishResume();
      },
    });
    loop.reset();
    loopRef.current = loop;

    // Audio needs a user gesture; the player has just clicked Play, so unlock now.
    void audioManager.unlock().then(() => audioManager.setMuted(useGameStore.getState().muted));

    // ── Visual state that is not part of the rules ────────────────────────────
    let scroll = 0; // seconds of flight, advances with game time so stars slow in a scan
    let hitFlash = 0;
    let lastTargetId: string | null = null;
    let sinceHud = 0;
    let ended = false;
    const popups: Popup[] = [];
    const backCtx = back.getContext('2d');

    const sizeBack = (): void => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      if (back.width !== Math.round(w * dpr) || back.height !== Math.round(h * dpr)) {
        back.width = Math.round(w * dpr);
        back.height = Math.round(h * dpr);
      }
      backCtx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // ── Router → loop / sim / sound ───────────────────────────────────────────
    const offs: Array<() => void> = [
      router.on('phase', ({ phase, previous }) => {
        if (phase === 'SCAN') loop.enterSlowMo();
        else loop.exitSlowMo();
        if (phase === 'RESUME' && previous === 'SCAN') audioManager.resume();
      }),
      router.on('scanKey', (e) => {
        if (e.correct) audioManager.scanTick(e.ratio);
        else if (!e.forgiven) audioManager.error();
        else audioManager.scanTick(e.ratio * 0.5);
      }),
      router.on('scanComplete', () => {
        sim.notifyScanComplete();
        setScanned([...sim.scanned]);
        audioManager.scanComplete();
      }),
    ];

    const finish = (): void => {
      if (ended) return;
      ended = true;
      audioManager.stopAlarm();
    };

    // ── Systems (fixed steps) ─────────────────────────────────────────────────
    const offSystems = [
      loop.addSystem('telemetry', (step) => telemetry.tick(step.realDt), 5),
      loop.addSystem(
        'sim',
        (step) => {
          if (ended) return;
          const aspect = aspectNow();
          if (Math.abs(aspect - sim.aspect) > 0.01) sim.setAspect(aspect);
          scroll += step.dt;
          hitFlash = Math.max(0, hitFlash - step.realDt * 1.8);
          for (const p of popups) p.age += step.realDt;
          while (popups.length && popups[0].age > 1.1) popups.shift();

          const events = sim.step(step.dt, step.realDt, { move: router.getMovement(), phase: router.getPhase() });
          for (const e of events) {
            switch (e.type) {
              case 'scanTrigger':
                router.beginScan(e.name);
                audioManager.scanLock();
                break;
              case 'hit':
                audioManager.hullHit();
                hitFlash = 1;
                setHull(e.hull);
                break;
              case 'nearMiss':
                audioManager.nearMiss(e.pan);
                setNearMisses(sim.nearMisses);
                popups.push({ text: 'NEAR MISS', x: sim.ship.x, y: sim.ship.y - 0.12, age: 0 });
                break;
              case 'hullCritical':
                audioManager.startAlarm();
                break;
              case 'complete':
                finish();
                reportMissionComplete({
                  missionId: mission.id,
                  satelliteName: build.name,
                  scanned: sim.scanned,
                  telemetry: telemetry.getSnapshot(),
                  flight: sim.getRunStats(),
                });
                break;
              case 'lost':
                finish();
                audioManager.signalLost();
                reportSignalLost({
                  missionId: mission.id,
                  satelliteName: build.name,
                  scanned: sim.scanned,
                  telemetry: telemetry.getSnapshot(),
                  flight: sim.getRunStats(),
                  lossCause: e.cause,
                });
                break;
              default:
            }
          }

          // The planet element only re-renders when the target changes.
          const id = sim.target?.id ?? null;
          if (id !== lastTargetId) {
            lastTargetId = id;
            const art = id ? bodyArt(id) : null;
            setTarget(id && art && sim.target ? { id, art, size: sim.target.size } : null);
          }

          // HUD numbers that change continuously are throttled to ~10 per second.
          sinceHud += step.realDt;
          if (sinceHud >= 0.1) {
            sinceHud = 0;
            setSignal((prev) => (Math.abs(prev - sim.signal) > 0.015 ? sim.signal : prev));
          }
        },
        20,
      ),
    ];

    // ── Layers (drawn every frame) ────────────────────────────────────────────
    const offLayers = [
      loop.addLayer(
        'backdrop',
        (f) => {
          if (!backCtx) return;
          sizeBack();
          drawStarfield(backCtx, f.width, f.height, scroll, f.realTime);
        },
        0,
      ),
      loop.addLayer(
        'planet',
        (f) => {
          const el = planetRef.current;
          const t = sim.target;
          if (!el) return;
          if (!t) {
            el.style.opacity = '0';
            return;
          }
          el.style.opacity = '1';
          el.style.transform = `translate(${t.x * f.height}px, ${t.y * f.height}px) translate(-50%, -50%)`;
        },
        5,
      ),
      loop.addLayer(
        'asteroids',
        (f) => {
          const k = f.alpha * FIXED_DT * f.timeScale;
          for (const a of sim.asteroids) {
            drawAsteroid(f.ctx, a.shape, {
              x: (a.x + a.vx * k) * f.height,
              y: (a.y + a.vy * k) * f.height,
              r: a.r * f.height,
              rot: a.rot + a.spin * k,
              alpha: a.hit ? 0.55 : 1,
            });
          }
        },
        20,
      ),
      loop.addLayer(
        'satellite',
        (f) => {
          const s = sim.ship;
          const k = f.alpha * FIXED_DT * f.timeScale;
          const speed = Math.hypot(s.vx, s.vy) / Math.max(0.01, stats.moveSpeed);
          const dying = sim.status === 'dying' || sim.status === 'lost';
          let alpha = 1;
          if (s.invuln > 0) alpha = Math.floor(f.realTime * 14) % 2 === 0 ? 0.35 : 1;
          if (dying) alpha = Math.max(0.15, 0.6 - 0.5 * Math.abs(Math.sin(f.realTime * 12)));
          drawSatellite(f.ctx, parts, {
            x: (s.x + s.vx * k) * f.height,
            y: (s.y + s.vy * k) * f.height,
            scale: GAMEPLAY.SHIP_UNIT * f.height,
            t: f.realTime,
            thrust: dying ? 0 : 0.45 + 0.4 * Math.min(1, speed),
            beam: router.isMovementLocked(),
            rotation: clamp(s.vy / Math.max(0.01, stats.moveSpeed), -1, 1) * 0.12,
            alpha,
          });
        },
        30,
      ),
      loop.addLayer(
        'fx',
        (f) => {
          const { ctx, width, height } = f;
          if (hitFlash > 0) {
            const g = ctx.createRadialGradient(width / 2, height / 2, height * 0.35, width / 2, height / 2, height * 0.95);
            g.addColorStop(0, 'rgba(255, 70, 50, 0)');
            g.addColorStop(1, `rgba(255, 70, 50, ${0.55 * hitFlash})`);
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, width, height);
          }
          ctx.textAlign = 'center';
          ctx.font = `600 ${Math.round(height * 0.02)}px ui-monospace, Consolas, monospace`;
          for (const p of popups) {
            const life = p.age / 1.1;
            ctx.globalAlpha = 1 - life;
            ctx.fillStyle = '#ffb84d';
            ctx.fillText(p.text, p.x * height, (p.y - life * 0.06) * height);
          }
          ctx.globalAlpha = 1;
        },
        40,
      ),
    ];

    const ro = new ResizeObserver(() => setStageH(stage.clientHeight));
    ro.observe(stage);
    setStageH(stage.clientHeight);

    router.attach();
    loop.start();

    return () => {
      ended = true;
      loop.stop();
      router.detach();
      ro.disconnect();
      offs.forEach((off) => off());
      offSystems.forEach((off) => off());
      offLayers.forEach((off) => off());
      audioManager.stopAlarm();
      simRef.current = null;
      loopRef.current = null;
    };
    // The mission and build are fixed for the lifetime of a flight; Retry remounts this screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Pause ────────────────────────────────────────────────────────────────────
  // Esc toggles the pause menu; losing the window or tab pauses automatically. While paused the loop
  // is frozen (so the scan clock and WPM stop too) and the router is detached, so typed letters
  // cannot advance a scan behind the menu.
  const pausedRef = useRef(false);
  const applyPause = (next: boolean): void => {
    const sim = simRef.current;
    const loop = loopRef.current;
    if (!sim || !loop || pausedRef.current === next) return;
    if (next && sim.status !== 'flying') return; // nothing to pause once the run is ending
    pausedRef.current = next;
    setPaused(next);
    if (next) {
      loop.pause();
      router.detach();
      audioManager.stopAlarm();
    } else {
      loop.resume();
      router.attach();
      if (sim.hull === 1 && sim.maxHull > 1) audioManager.startAlarm();
      (document.activeElement as HTMLElement | null)?.blur();
    }
  };
  const applyPauseRef = useRef(applyPause);
  applyPauseRef.current = applyPause;

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        applyPauseRef.current(!pausedRef.current);
      } else if (pausedRef.current) {
        const k = e.key.toLowerCase();
        if (k === 'r') onRestart();
        else if (k === 'q') setScreen('archive');
      }
    };
    const onHide = (): void => {
      if (document.hidden) applyPauseRef.current(true);
    };
    const onBlur = (): void => applyPauseRef.current(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [onRestart, setScreen]);

  useEffect(() => {
    if (paused) resumeBtnRef.current?.focus();
  }, [paused]);

  const getAnchor = () => {
    const t = simRef.current?.target;
    const stage = stageRef.current;
    if (!t || !stage) return null;
    return { x: t.x * stage.clientHeight, y: t.y * stage.clientHeight, radius: (t.size * stage.clientHeight) / 2 };
  };

  const planetPx = target ? Math.round(target.size * stageH * (target.art === 'saturn' ? 0.62 : 1)) : 0;

  return (
    <section className="mo-screen mo-explore">
      <div ref={stageRef} className="mo-explore__stage">
        <canvas ref={backRef} className="mo-explore__back" aria-hidden="true" />
        <div ref={planetRef} className="mo-explore__planet" aria-hidden="true">
          {target ? <BodyPortrait art={target.art} size={planetPx} /> : null}
        </div>
        <canvas ref={canvasRef} className="mo-explore__canvas" role="img" aria-label="Flight view" />
        <MissionHud
          router={router}
          telemetry={telemetry}
          mission={mission}
          scanned={scanned}
          hull={hull}
          maxHull={stats.maxHull}
          signal={signal}
          nearMisses={nearMisses}
          satelliteName={build.name}
        />
        <ScanReticle router={router} getAnchor={getAnchor} />
        <ScanSideToast router={router} />
        {!paused && <p className="mo-explore__hint">ESC · PAUSE</p>}
        {paused && (
          <div className="mo-pause" role="dialog" aria-modal="true" aria-labelledby="mo-pause-title">
            <div className="mo-pause__card">
              <p className="mo-eyebrow">
                {mission.code} · {mission.spacecraft}
              </p>
              <h2 id="mo-pause-title" className="mo-pause__title">
                Paused
              </h2>
              <p className="mo-pause__note">The flight is frozen. Your scan progress is kept.</p>
              <div className="mo-pause__actions">
                <button ref={resumeBtnRef} type="button" className="mo-btn mo-btn--primary" onClick={() => applyPause(false)}>
                  Resume <kbd>Esc</kbd>
                </button>
                <button type="button" className="mo-btn mo-btn--ghost" onClick={onRestart}>
                  Restart mission <kbd>R</kbd>
                </button>
                <button type="button" className="mo-btn mo-btn--ghost" onClick={() => setScreen('archive')}>
                  Quit to Archive <kbd>Q</kbd>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default ExploreScreen;
