/**
 * MissionCompleteScreen.tsx — Shown when every target in the mission has been scanned.
 *
 * Reads the run written by `reportMissionComplete` (store/useOutcomeStore.ts): scan accuracy,
 * typing WPM (measured only during scans), near misses, hull, a 3-star rating with its rules,
 * the worlds documented, and the mission's Historical Discovery Unlocked card.
 *
 * Keyboard: Enter = Next mission (or Campaign Outro after the final mission), R = Fly again,
 *           Esc = Return to the Mission Archive.
 */

import type { CSSProperties } from 'react';
import { HistoricalDiscoveryCard } from '../components/outcome/HistoricalDiscoveryCard';
import { formatClock, formatInt, useScreenKeys } from '../components/outcome/outcomeUtils';
import { StarRating } from '../components/outcome/StarRating';
import { bodyArt, bodyName } from '../components/flight/bodyLookup';
import { IconArrowLeft, IconArrowRight } from '../components/ui/icons';
import { BodyPortrait } from '../components/ui/planet/BodyPortrait';
import { FINAL_MISSION_LEVEL, MISSIONS, getMission, getMissionByLevel } from '../data/missions';
import { uiAudio } from '../engine/uiAudio';
import { useGameStore } from '../store/useGameStore';
import { rateRun, useOutcomeStore } from '../store/useOutcomeStore';
import '../styles/outcome.css';

export function MissionCompleteScreen() {
  const report = useOutcomeStore((s) => s.lastReport);
  const selectedId = useGameStore((s) => s.selectedMissionId);
  const setScreen = useGameStore((s) => s.setScreen);
  const selectMission = useGameStore((s) => s.selectMission);

  const mission = getMission(report?.missionId ?? selectedId) ?? MISSIONS[0];
  const run = report && report.missionId === mission.id && report.outcome === 'complete' ? report : null;
  // Without telemetry we only know the mission was completed: one star.
  const criteria = run?.criteria ?? rateRun('complete', 0, 0, 1);
  const scannedIds = run?.scannedIds.length ? run.scannedIds : [...mission.targetIds];

  const isFinal = mission.levelNumber >= FINAL_MISSION_LEVEL;
  const next = isFinal ? undefined : getMissionByLevel(mission.levelNumber + 1);

  const goArchive = (): void => {
    uiAudio.sfx.click();
    setScreen('archive');
  };
  const flyAgain = (): void => {
    uiAudio.sfx.click();
    setScreen('explore');
  };
  const goNext = (): void => {
    uiAudio.sfx.confirm();
    if (isFinal || !next) {
      setScreen('outro');
      return;
    }
    selectMission(next.id as Parameters<typeof selectMission>[0]);
    setScreen('objectives');
  };

  useScreenKeys({ Enter: goNext, r: flyAgain, Escape: goArchive });

  const hullPct = run && run.flight.maxHull > 0 ? Math.round((run.flight.hull / run.flight.maxHull) * 100) : null;
  const stats: { label: string; value: string; note?: string }[] = run
    ? [
        { label: 'Scan accuracy', value: `${Math.round(run.accuracy * 100)}%`, note: `${formatInt(run.correctKeystrokes)}/${formatInt(run.totalKeystrokes)} keys` },
        { label: 'Typing speed', value: `${Math.round(run.wpm)}`, note: 'WPM · during scans' },
        { label: 'Near misses', value: formatInt(run.flight.nearMisses), note: `${formatInt(run.flight.asteroidsDodged)} asteroids dodged` },
        { label: 'Hull integrity', value: `${run.flight.hull}/${run.flight.maxHull}`, note: `${hullPct}% · ${run.flight.hullHits} impacts` },
        { label: 'Perfect scans', value: `${run.perfectScans}/${run.scansCompleted}`, note: 'no penalized errors' },
        { label: 'Flight time', value: formatClock(run.flight.flightSeconds), note: `${formatClock(run.scanSeconds)} scanning` },
      ]
    : [];

  return (
    <section className="mo-screen mo-outcome mo-complete" aria-labelledby="mo-complete-title">
      <div className="mo-outcome__grid">
        <div className="mo-outcome__main">
          <p className="mo-eyebrow">
            {mission.code} · Level {mission.levelNumber} · {mission.spacecraft}
          </p>
          <h1 id="mo-complete-title" className="mo-title mo-complete__title">
            Mission complete
          </h1>
          <p className="mo-lede">
            {mission.objectiveHeadline}
            {run ? (
              <>
                {' '}
                aboard <strong className="mo-complete__callsign">{run.satelliteName}</strong>.
              </>
            ) : (
              '.'
            )}
          </p>

          <StarRating criteria={criteria} />

          {run ? (
            <dl className="mo-statgrid">
              {stats.map((s, i) => (
                <div key={s.label} className="mo-statgrid__cell" style={{ '--mo-i': i } as CSSProperties}>
                  <dt>{s.label}</dt>
                  <dd className="mo-mono">{s.value}</dd>
                  {s.note && <span className="mo-statgrid__note">{s.note}</span>}
                </div>
              ))}
            </dl>
          ) : (
            <p className="mo-outcome__empty">No flight telemetry was received for this run.</p>
          )}

          <div className="mo-worlds" aria-label="Worlds documented">
            <p className="mo-outcome__section-label">Worlds documented · {scannedIds.length}</p>
            <ul className="mo-worlds__list">
              {scannedIds.map((id, i) => {
                const art = bodyArt(id);
                return (
                  <li key={id} className="mo-worlds__item" style={{ '--mo-i': i } as CSSProperties}>
                    <span className="mo-worlds__art" aria-hidden="true">
                      {art ? <BodyPortrait art={art} size={art === 'saturn' ? 18 : 36} glow={false} fps={12} /> : null}
                    </span>
                    {bodyName(id)}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="mo-outcome__actions">
            <button type="button" className="mo-btn mo-btn--ghost" onClick={goArchive}>
              <IconArrowLeft size={16} /> Missions
            </button>
            <button type="button" className="mo-btn mo-btn--ghost" onClick={flyAgain}>
              Fly again
            </button>
            <button type="button" className="mo-btn mo-btn--primary is-pulsing" onClick={goNext}>
              {isFinal ? 'Campaign outro' : `Next: ${next?.folderTitle ?? 'Mission'}`} <IconArrowRight size={16} />
            </button>
          </div>
          <p className="mo-outcome__keys mo-mono" aria-hidden="true">
            ENTER {isFinal ? 'OUTRO' : 'NEXT'} · R FLY AGAIN · ESC MISSIONS
          </p>
        </div>

        <aside className="mo-outcome__side">
          <HistoricalDiscoveryCard mission={mission} />
        </aside>
      </div>
    </section>
  );
}

export default MissionCompleteScreen;
