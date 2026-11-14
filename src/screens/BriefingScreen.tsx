/**
 * BriefingScreen.tsx — The NASA launch log for the chosen level (PRD 4.4).
 *
 * Shows the target body ("Target Acquired") beside an incoming transmission that types out the exact
 * launch date, time, vehicle and site, what the mission was, and what humanity knew on launch day.
 * Skip Transmission reveals everything at once; Next goes to the Objectives; Back returns to Assembly.
 *
 * Keyboard: Enter = Next, Space = Skip transmission, Esc = Back.
 */

import { useEffect, useMemo, useState } from 'react';
import { IconArrowLeft, IconArrowRight, IconSkip } from '../components/ui/icons';
import { BodyPortrait } from '../components/ui/planet/BodyPortrait';
import { ScrollableTransmission, type TransmissionBlock } from '../components/ui/ScrollableTransmission';
import { getBody } from '../data/celestialBodies';
import { getCodexEntry } from '../data/codexEntries';
import { MISSIONS, buildTransmission, formatLaunchDate, getMission, type MissionData } from '../data/missions';
import { uiAudio } from '../engine/uiAudio';
import { useGameStore } from '../store/useGameStore';
import '../styles/briefing.css';

/** The transmission as typed blocks: header, launch facts, story paragraphs, then the NASA sources. */
export function briefingBlocks(mission: MissionData): TransmissionBlock[] {
  const [, ...story] = buildTransmission(mission); // the first paragraph is the launch line, shown as rows
  return [
    { type: 'heading', text: `Incoming transmission · ${mission.code}` },
    {
      type: 'rows',
      rows: [
        ['Spacecraft', mission.spacecraft],
        ['Launch date', formatLaunchDate(mission.launchDateISO)],
        ['Launch time', `${mission.launchTimeUTC} UTC`],
        ['Vehicle', mission.launchVehicle],
        ['Launch site', mission.launchSite],
      ],
    },
    { type: 'divider' },
    ...story.map((text): TransmissionBlock => ({ type: 'paragraph', text })),
    { type: 'divider' },
    { type: 'sources', items: mission.sources.map((s) => ({ label: s.label, url: s.url })) },
  ];
}

export function BriefingScreen() {
  const selectedId = useGameStore((s) => s.selectedMissionId);
  const codexOpen = useGameStore((s) => s.codexOpen);
  const setScreen = useGameStore((s) => s.setScreen);

  const mission: MissionData = getMission(selectedId) ?? MISSIONS[0];
  const target = mission.briefingTarget;
  const art = getCodexEntry(getBody(target.bodyId)?.scanName)?.art;
  const blocks = useMemo(() => briefingBlocks(mission), [mission]);

  const [skipped, setSkipped] = useState(false);
  const [done, setDone] = useState(false);

  const goBack = (): void => {
    uiAudio.sfx.click();
    setScreen('assembly');
  };
  const next = (): void => {
    uiAudio.sfx.next();
    setScreen('objectives');
  };
  const skip = (): void => {
    if (done || skipped) return;
    uiAudio.sfx.click();
    setSkipped(true);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (codexOpen || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      const interactive = t instanceof HTMLElement && ['BUTTON', 'A', 'INPUT'].includes(t.tagName);
      if (e.key === 'Escape') {
        e.preventDefault();
        goBack();
      } else if (e.key === 'Enter' && !interactive) {
        e.preventDefault();
        next();
      } else if (e.key === ' ' && !interactive) {
        e.preventDefault();
        skip();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codexOpen, done, skipped]);

  return (
    <section className="mo-screen mo-brief" aria-labelledby="mo-brief-title">
      <header className="mo-brief__head">
        <p className="mo-eyebrow">
          Level {mission.levelNumber} · {mission.spacecraft}
        </p>
        <h1 id="mo-brief-title" className="mo-title">
          Briefing
        </h1>
      </header>

      <div className="mo-brief__grid">
        <aside className="mo-brief__target" aria-label="Target acquired">
          <p className="mo-brief__tag">Target acquired</p>
          <div className="mo-brief__body" key={mission.id}>
            {art ? (
              <BodyPortrait
                art={art}
                size={art === 'saturn' ? 190 : 230}
                label={`${target.title}, primary target`}
              />
            ) : null}
          </div>
          <p className="mo-brief__name">{target.title}</p>
          <dl className="mo-brief__facts">
            <div>
              <dt>Designation</dt>
              <dd>{target.designation}</dd>
            </div>
            <div>
              <dt>Range</dt>
              <dd>{target.rangeAu} AU</dd>
            </div>
          </dl>
        </aside>

        <div className="mo-brief__tx">
          <ScrollableTransmission
            blocks={blocks}
            skip={skipped}
            onComplete={() => setDone(true)}
            ariaLabel={`Launch transmission for ${mission.spacecraft}`}
          />
        </div>
      </div>

      <div className="mo-brief__actions">
        <button type="button" className="mo-btn mo-btn--ghost" onClick={goBack}>
          <IconArrowLeft size={16} /> Back
        </button>
        <button type="button" className="mo-btn mo-btn--ghost" onClick={skip} disabled={done || skipped}>
          <IconSkip size={16} /> Skip transmission
        </button>
        <button type="button" className={`mo-btn mo-btn--primary${done || skipped ? ' is-pulsing' : ''}`} onClick={next}>
          Next <IconArrowRight size={16} />
        </button>
      </div>
    </section>
  );
}

export default BriefingScreen;
