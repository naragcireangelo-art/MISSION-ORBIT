/**
 * ObjectivesScreen.tsx — Pre-launch checklist for the chosen level.
 *
 * Shows the level's headline, one checklist line per objective (ticked once its targets have been
 * scanned), the spacecraft-readiness panel (callsign, installed parts, key stats), and the NASA
 * launch details. Press Play to launch into the Explore (gameplay) screen.
 *
 * Play is blocked until the build is ready (a valid callsign and all four parts); "Edit build"
 * returns to Assembly. Keyboard: Enter = Play, Esc = Back to Assembly.
 */

import { useEffect, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { IconArrowLeft, IconArrowRight, IconCheck } from '../components/ui/icons';
import { BodyPortrait } from '../components/ui/planet/BodyPortrait';
import { getBody } from '../data/celestialBodies';
import { getCodexEntry } from '../data/codexEntries';
import { MISSIONS, formatLaunchDate, getMission, type MissionData } from '../data/missions';
import {
  PART_SLOTS,
  PART_SLOT_LABELS,
  computeBuildStats,
  getPart,
  integrationProgress,
  validateSatelliteName,
} from '../data/parts';
import { uiAudio } from '../engine/uiAudio';
import { useAssemblyStore } from '../store/useAssemblyStore';
import { useGameStore } from '../store/useGameStore';
import '../styles/assembly.css';

export function ObjectivesScreen() {
  const selectedId = useGameStore((s) => s.selectedMissionId);
  const scanned = useGameStore((s) => s.scannedBodies);
  const codexOpen = useGameStore((s) => s.codexOpen);
  const openCodex = useGameStore((s) => s.openCodex);
  const setScreen = useGameStore((s) => s.setScreen);
  const build = useAssemblyStore((s) => s.build);

  // Fall back to level 1 if someone lands here without choosing a level.
  const mission: MissionData = getMission(selectedId) ?? MISSIONS[0];
  const targetBody = getBody(mission.briefingTarget.bodyId);
  const art = getCodexEntry(targetBody?.scanName)?.art;

  const scannedSet = useMemo(() => new Set(scanned.map((n) => n.toLowerCase())), [scanned]);
  const isScanned = (bodyId: string): boolean => {
    const body = getBody(bodyId);
    return scannedSet.has(bodyId.toLowerCase()) || (body ? scannedSet.has(body.name.toLowerCase()) : false);
  };

  const stats = useMemo(() => computeBuildStats(build), [build]);
  const nameOk = validateSatelliteName(build.name).valid;
  const partsOk = integrationProgress(build) === 1;
  const ready = nameOk && partsOk;

  const goBack = (): void => {
    uiAudio.sfx.click();
    setScreen('assembly');
  };
  const play = (): void => {
    if (!ready) {
      uiAudio.sfx.denied();
      return;
    }
    uiAudio.sfx.confirm();
    setScreen('explore');
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (codexOpen || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target;
      const interactive = target instanceof HTMLElement && ['BUTTON', 'A', 'INPUT'].includes(target.tagName);
      if (e.key === 'Escape') {
        e.preventDefault();
        goBack();
      } else if (e.key === 'Enter' && !interactive) {
        e.preventDefault();
        play();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codexOpen, ready]);

  const readiness: { label: string; ok: boolean; detail: string }[] = [
    { label: 'Callsign', ok: nameOk, detail: nameOk ? build.name : 'Not set' },
    ...PART_SLOTS.map((slot) => {
      const part = getPart(slot, build[slot]);
      return { label: PART_SLOT_LABELS[slot], ok: part !== undefined, detail: part?.name ?? 'Not installed' };
    }),
  ];

  return (
    <section className="mo-screen mo-obj" aria-labelledby="mo-obj-title">
      <div className="mo-obj__grid">
        <aside className="mo-obj__target" aria-label="Level target">
          <div className="mo-obj__body" key={mission.id}>
            {art ? (
              <BodyPortrait
                art={art}
                size={art === 'saturn' ? 200 : 250}
                label={`${mission.briefingTarget.title}, primary target`}
              />
            ) : null}
          </div>
          <p className="mo-obj__launch">
            Launched {formatLaunchDate(mission.launchDateISO)} · {mission.launchTimeUTC} UTC
          </p>
          <p className="mo-obj__launch">
            {mission.launchVehicle} · {mission.launchSite}
          </p>
        </aside>

        <div className="mo-obj__main">
          <p className="mo-eyebrow">
            Level {mission.levelNumber} · {mission.spacecraft}
          </p>
          <h1 id="mo-obj-title" className="mo-title">
            Objectives
          </h1>
          <p className="mo-obj__goal">{mission.objectiveHeadline}</p>

          <ol className="mo-obj__list">
            {mission.objectives.map((o, i) => {
              const isDone = o.targetIds.every(isScanned);
              const firstBody = getBody(o.targetIds[0]);
              return (
                <li key={o.id} className={isDone ? 'is-done' : ''} style={{ '--mo-i': i } as CSSProperties}>
                  <span className="mo-obj__check" aria-hidden="true" />
                  <span className="mo-obj__name">{o.label}</span>
                  {firstBody ? (
                    <button
                      type="button"
                      className="mo-obj__info"
                      onClick={() => {
                        uiAudio.sfx.click();
                        openCodex(firstBody.scanName);
                      }}
                      aria-label={`Read about ${firstBody.name} in the Celestial Codex`}
                    >
                      About
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ol>

          <section className={`mo-obj__ready${ready ? ' is-ready' : ''}`} aria-label="Spacecraft readiness">
            <h2 className="mo-obj__ready-title">
              Spacecraft readiness
              <span>{ready ? 'All systems go' : 'Action needed'}</span>
            </h2>
            <ul className="mo-obj__ready-list">
              {readiness.map((r) => (
                <li key={r.label} className={r.ok ? 'is-ok' : 'is-bad'}>
                  <span className="mo-obj__ready-mark" aria-hidden="true">
                    {r.ok ? <IconCheck size={12} /> : '!'}
                  </span>
                  <span className="mo-obj__ready-label">{r.label}</span>
                  <span className="mo-obj__ready-detail">{r.detail}</span>
                </li>
              ))}
            </ul>
            <p className="mo-obj__ready-stats">
              Hull {stats.maxHull} · Speed {stats.moveSpeed.toFixed(2)} · Range{' '}
              {Math.round(stats.scanRangeMultiplier * 100)}% · Free errors {stats.freeErrors}
            </p>
            <button type="button" className="mo-obj__info" onClick={goBack}>
              Edit build
            </button>
          </section>

          <p className="mo-obj__how">
            Dodge the asteroids. When a target comes into range, time slows and your movement keys lock. Type its
            name to scan it.
          </p>

          <div className="mo-obj__actions">
            <button type="button" className="mo-btn mo-btn--ghost" onClick={goBack}>
              <IconArrowLeft size={16} /> Back
            </button>
            <button
              type="button"
              className={`mo-btn mo-btn--primary${ready ? ' is-pulsing' : ''}`}
              onClick={play}
              disabled={!ready}
            >
              Play <IconArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ObjectivesScreen;
