/**
 * SignalLostScreen.tsx — Shown when Hull Integrity reaches 0.
 *
 * Shows the cause of connection loss, the last telemetry received, and the scan checklist with the
 * worlds still undocumented. `Retry Connection` re-launches Explore with the same satellite build;
 * `Return to Missions` goes back to the Mission Archive.
 *
 * Keyboard: Enter or R = Retry connection, Esc = Return to Missions.
 */

import type { CSSProperties } from 'react';
import { formatClock, useScreenKeys } from '../components/outcome/outcomeUtils';
import { bodyName } from '../components/flight/bodyLookup';
import { IconArrowLeft, IconCheck } from '../components/ui/icons';
import { MISSIONS, getMission } from '../data/missions';
import { uiAudio } from '../engine/uiAudio';
import { useGameStore } from '../store/useGameStore';
import { useOutcomeStore } from '../store/useOutcomeStore';
import '../styles/outcome.css';

/** One heartbeat-style trace that decays into a flat line. */
const TRACE =
  'M0 40 L40 40 L52 18 L62 62 L72 30 L80 40 L130 40 L140 26 L148 52 L156 36 L162 40 L210 40 L216 32 L222 46 L228 40 L600 40';

export function SignalLostScreen() {
  const report = useOutcomeStore((s) => s.lastReport);
  const selectedId = useGameStore((s) => s.selectedMissionId);
  const setScreen = useGameStore((s) => s.setScreen);

  const mission = getMission(report?.missionId ?? selectedId) ?? MISSIONS[0];
  const run = report && report.missionId === mission.id && report.outcome === 'lost' ? report : null;
  const scanned = new Set(run?.scannedIds ?? []);
  const remaining = mission.targetIds.filter((id) => !scanned.has(id));
  const hidden = new Set(mission.hiddenTargetIds ?? []);

  const impacts = run?.flight.hullHits ?? 0;
  const cause =
    run?.lossCause ??
    (impacts > 0
      ? `Hull integrity reached zero after ${impacts} asteroid ${impacts === 1 ? 'impact' : 'impacts'}. The high-gain antenna lost its lock on Earth.`
      : 'Hull integrity reached zero. The high-gain antenna lost its lock on Earth.');

  const retry = (): void => {
    uiAudio.sfx.confirm();
    setScreen('explore');
  };
  const goArchive = (): void => {
    uiAudio.sfx.click();
    setScreen('archive');
  };

  useScreenKeys({ Enter: retry, r: retry, Escape: goArchive });

  return (
    <section className="mo-screen mo-outcome mo-lost" aria-labelledby="mo-lost-title">
      <div className="mo-lost__static" aria-hidden="true" />
      <div className="mo-lost__wrap">
        <header className="mo-lost__head">
          <p className="mo-eyebrow mo-lost__eyebrow">
            <span className="mo-lost__dot" aria-hidden="true" />
            DSN uplink terminated · {mission.code} · {mission.spacecraft}
          </p>
          <h1 id="mo-lost-title" className="mo-title mo-lost__title" data-text="Signal lost">
            Signal lost
          </h1>
          <svg className="mo-lost__trace" viewBox="0 0 600 80" preserveAspectRatio="none" aria-hidden="true">
            <path d={TRACE} />
          </svg>
        </header>

        <div className="mo-lost__grid">
          <article className="mo-lost__panel">
            <p className="mo-outcome__section-label">Cause of connection loss</p>
            <p className="mo-lost__cause">{cause}</p>
            <dl className="mo-lost__last">
              <div>
                <dt>Satellite</dt>
                <dd className="mo-mono">{run?.satelliteName ?? `${mission.callsignBase}-II`}</dd>
              </div>
              <div>
                <dt>Last contact</dt>
                <dd className="mo-mono">T+ {formatClock(run?.flight.flightSeconds ?? 0)}</dd>
              </div>
              <div>
                <dt>Hull</dt>
                <dd className="mo-mono mo-lost__zero">0/{run?.flight.maxHull ?? '--'}</dd>
              </div>
              <div>
                <dt>Asteroids dodged</dt>
                <dd className="mo-mono">{run?.flight.asteroidsDodged ?? 0}</dd>
              </div>
            </dl>
          </article>

          <article className="mo-lost__panel">
            <p className="mo-outcome__section-label">
              Scan checklist · {mission.targetIds.length - remaining.length}/{mission.targetIds.length} documented
            </p>
            <ol className="mo-lost__checklist">
              {mission.targetIds.map((id, i) => {
                const done = scanned.has(id);
                return (
                  <li key={id} className={done ? 'is-done' : 'is-missing'} style={{ '--mo-i': i } as CSSProperties}>
                    <span className="mo-lost__check" aria-hidden="true">
                      {done ? <IconCheck size={11} /> : null}
                    </span>
                    <span className="mo-lost__name">{!done && hidden.has(id) ? 'Unknown target' : bodyName(id)}</span>
                    <span className="mo-lost__status mo-mono">{done ? 'Scanned' : 'Not documented'}</span>
                  </li>
                );
              })}
            </ol>
          </article>
        </div>

        <p className="mo-lost__tip">
          Flight tip: a heavier chassis adds hull integrity, and a stronger thruster helps you slip through
          tighter gaps. Your satellite is invulnerable while a scan is locked on.
        </p>

        <div className="mo-outcome__actions">
          <button type="button" className="mo-btn mo-btn--ghost" onClick={goArchive}>
            <IconArrowLeft size={16} /> Return to missions
          </button>
          <button type="button" className="mo-btn mo-btn--primary mo-btn--retry is-pulsing" onClick={retry}>
            Retry connection
          </button>
        </div>
        <p className="mo-outcome__keys mo-mono" aria-hidden="true">
          ENTER RETRY · ESC MISSIONS
        </p>
      </div>
    </section>
  );
}

export default SignalLostScreen;
