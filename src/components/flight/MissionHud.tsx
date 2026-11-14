/**
 * MissionHud.tsx — Telemetry overlay for the Explore screen.
 *
 *   ┌ callsign / hull / DSN ┐   ┌── target track ──┐   ┌ WPM / accuracy / near misses ┐
 *
 *                       [ MOVEMENT LOCKED — TYPE TO SCAN ]
 *
 * Usage (inside the Explore stage, which must be `position: relative`):
 *
 *   <MissionHud router={router} telemetry={telemetry} mission={mission}
 *               scanned={scannedThisRun} hull={hull} maxHull={maxHull} nearMisses={nearMisses} />
 *
 * Flight numbers (hull, near misses, signal) come from physics as props. Scan numbers come from the
 * engine directly: the HUD subscribes to `router` and polls `telemetry` a few times a second.
 * The overlay never takes pointer or keyboard input, so it cannot steal typing from a scan.
 */

import type { CSSProperties } from 'react';
import '../../styles/flight.css';
import type { MissionData } from '../../data/missions';
import type { InputRouter, ScanTelemetry } from '../../engine/inputRouter';
import { IconCheck, IconLock } from '../ui/icons';
import { bodyName, findBody, makeScannedMatcher } from './bodyLookup';
import { useFlightPhase, useReticleState, useTelemetrySnapshot } from './flightHooks';

export interface MissionHudProps {
  router: InputRouter;
  telemetry: ScanTelemetry;
  mission: MissionData;
  /** Bodies scanned during this run (ids or display names). */
  scanned: readonly string[];
  hull: number;
  maxHull: number;
  /** DSN signal strength 0..1. Defaults to hull / maxHull. */
  signal?: number;
  nearMisses?: number;
  /** Shown under the mission code; defaults to the mission's spacecraft. */
  satelliteName?: string;
}

const SIGNAL_BARS = 5;

export function MissionHud({
  router,
  telemetry,
  mission,
  scanned,
  hull,
  maxHull,
  signal,
  nearMisses = 0,
  satelliteName,
}: MissionHudProps) {
  const phase = useFlightPhase(router);
  const reticle = useReticleState(router);
  const stats = useTelemetrySnapshot(telemetry);

  const locked = phase === 'SCAN';
  const hullSafe = Math.max(0, Math.min(hull, maxHull));
  const hullCritical = hullSafe <= 1 && maxHull > 1;
  const signalLevel = Math.max(0, Math.min(1, signal ?? (maxHull > 0 ? hullSafe / maxHull : 0)));
  const litBars = Math.ceil(signalLevel * SIGNAL_BARS);

  const isScanned = makeScannedMatcher(scanned);
  const scanningId = reticle.status !== 'idle' ? findBody(reticle.progress?.target)?.id : undefined;
  const nextId = mission.targetIds.find((id) => !isScanned(id));
  const doneCount = mission.targetIds.filter(isScanned).length;
  const hidden = new Set(mission.hiddenTargetIds ?? []);

  const accuracyPct = stats.totalKeystrokes > 0 ? Math.round(stats.accuracy * 100) : null;

  return (
    <div className={`mo-hud${locked ? ' is-locked' : ''}${hullCritical ? ' is-critical' : ''}`}>
      {/* ── Left: craft status ─────────────────────────────────────────── */}
      <section className="mo-hud__panel mo-hud__craft" aria-label="Spacecraft status">
        <p className="mo-hud__code">
          {mission.code} · {mission.spacecraft}
        </p>
        <p className="mo-hud__callsign">{(satelliteName || mission.callsignBase).toUpperCase()}</p>

        <div className="mo-hud__row">
          <span className="mo-hud__label">Hull</span>
          <span className="mo-hud__pips" role="meter" aria-valuemin={0} aria-valuemax={maxHull} aria-valuenow={hullSafe} aria-label="Hull integrity">
            {Array.from({ length: maxHull }, (_, i) => (
              <span key={i} className={`mo-hud__pip${i < hullSafe ? ' is-on' : ''}`} />
            ))}
          </span>
          <span className="mo-hud__value mo-mono">
            {hullSafe}/{maxHull}
          </span>
        </div>

        <div className="mo-hud__row">
          <span className="mo-hud__label">DSN</span>
          <span className="mo-hud__bars" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(signalLevel * 100)} aria-label="DSN signal strength">
            {Array.from({ length: SIGNAL_BARS }, (_, i) => (
              <span key={i} className={`mo-hud__bar${i < litBars ? ' is-on' : ''}`} style={{ '--h': `${30 + i * 17}%` } as CSSProperties} />
            ))}
          </span>
          <span className="mo-hud__value mo-mono">{Math.round(signalLevel * 100)}%</span>
        </div>

        {hullCritical && (
          <p className="mo-hud__alert" role="alert">
            Hull critical
          </p>
        )}
      </section>

      {/* ── Center: target track ───────────────────────────────────────── */}
      <section className="mo-hud__track" aria-label="Scan targets">
        <p className="mo-hud__track-count mo-mono">
          <strong>{doneCount}</strong>/{mission.targetIds.length} scanned
        </p>
        <ol className="mo-hud__targets">
          {mission.targetIds.map((id) => {
            const done = isScanned(id);
            const scanning = id === scanningId && !done;
            const next = !scanning && !done && id === nextId;
            const unknown = hidden.has(id) && !done && !scanning;
            const cls = done ? 'is-done' : scanning ? 'is-scanning' : next ? 'is-next' : '';
            return (
              <li key={id} className={`mo-hud__target ${cls}`}>
                <span className="mo-hud__target-dot" aria-hidden="true">
                  {done && <IconCheck size={10} />}
                </span>
                {unknown ? '?' : bodyName(id)}
              </li>
            );
          })}
        </ol>
      </section>

      {/* ── Right: scan telemetry ──────────────────────────────────────── */}
      <section className="mo-hud__panel mo-hud__stats" aria-label="Scan telemetry">
        <div className="mo-hud__stat">
          <span className="mo-hud__label">WPM</span>
          <span className="mo-hud__big mo-mono">{stats.scanSeconds > 0 ? Math.round(stats.wpm) : '--'}</span>
        </div>
        <div className="mo-hud__stat">
          <span className="mo-hud__label">Accuracy</span>
          <span className="mo-hud__big mo-mono">{accuracyPct === null ? '--' : `${accuracyPct}%`}</span>
        </div>
        <div className="mo-hud__stat">
          <span className="mo-hud__label">Near miss</span>
          <span className="mo-hud__big mo-mono">{nearMisses}</span>
        </div>
        {stats.errorAllowance > 0 && (
          <div className="mo-hud__stat mo-hud__stat--wide">
            <span className="mo-hud__label">LiDAR free errors</span>
            <span className="mo-hud__pips">
              {Array.from({ length: stats.errorAllowance }, (_, i) => (
                <span key={i} className={`mo-hud__pip mo-hud__pip--amber${i < stats.allowanceRemaining ? ' is-on' : ''}`} />
              ))}
            </span>
          </div>
        )}
      </section>

      {/* ── Bottom: movement lock badge ────────────────────────────────── */}
      <div className="mo-hud__badge-slot" aria-live="polite">
        {phase === 'SCAN' && (
          <div className="mo-hud__badge mo-hud__badge--locked" key="locked">
            <IconLock size={16} />
            <span>
              <strong>Movement locked — type to scan</strong>
              <small>Time dilation 25% · hull shielded</small>
            </span>
          </div>
        )}
        {phase === 'RESUME' && (
          <div className="mo-hud__badge mo-hud__badge--resume" key="resume">
            <span>
              <strong>Thrusters online</strong>
              <small>WASD / arrows restored</small>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default MissionHud;
