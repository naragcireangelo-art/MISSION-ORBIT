/**
 * OutroScreen.tsx — Campaign outro, reached from Mission Complete after the final mission.
 *
 * 1. Campaign totals: asteroids dodged, career WPM (scan phases only), worlds documented, stars.
 * 2. Flight log: every mission in launch order with the worlds scanned on it.
 * 3. Closing tribute inspired by Voyager 1's "Pale Blue Dot" photograph (Feb 14, 1990).
 *
 * Keyboard: Esc = Mission Archive.
 */

import type { CSSProperties } from 'react';
import { formatInt, useScreenKeys } from '../components/outcome/outcomeUtils';
import { StarMeter } from '../components/outcome/StarRating';
import { bodyName } from '../components/flight/bodyLookup';
import { IconArrowLeft } from '../components/ui/icons';
import { MISSIONS, formatLaunchDate } from '../data/missions';
import { uiAudio } from '../engine/uiAudio';
import { useGameStore } from '../store/useGameStore';
import { careerWpm, useOutcomeStore } from '../store/useOutcomeStore';
import '../styles/outcome.css';

export function OutroScreen() {
  const career = useOutcomeStore((s) => s.career);
  const completedIds = useGameStore((s) => s.completedMissionIds) as readonly string[];
  const missionStars = useGameStore((s) => s.missionStars);
  const setScreen = useGameStore((s) => s.setScreen);

  const log = MISSIONS.map((m) => {
    const c = career.missions[m.id];
    const completed = Boolean(c) || completedIds.includes(m.id);
    const worlds = c?.scannedIds.length ? c.scannedIds : completed ? [...m.targetIds] : [];
    const stars = Math.max(c?.bestStars ?? 0, missionStars[m.id] ?? 0);
    return { mission: m, completed, worlds, stars };
  });

  const uniqueWorlds = new Set(log.flatMap((l) => l.worlds));
  const totalStars = log.reduce((sum, l) => sum + l.stars, 0);
  const wpm = careerWpm(career);

  const goArchive = (): void => {
    uiAudio.sfx.click();
    setScreen('archive');
  };
  const goTitle = (): void => {
    uiAudio.sfx.click();
    setScreen('splash');
  };
  useScreenKeys({ Escape: goArchive });

  const totals = [
    { label: 'Asteroids dodged', value: formatInt(career.asteroidsDodged) },
    { label: 'Career WPM', value: wpm > 0 ? String(Math.round(wpm)) : '--' },
    { label: 'Worlds documented', value: String(uniqueWorlds.size) },
    { label: 'Mission stars', value: `${totalStars}/${MISSIONS.length * 3}` },
  ];

  return (
    <section className="mo-screen mo-outcome mo-outro" aria-labelledby="mo-outro-title">
      <header className="mo-outro__head">
        <p className="mo-eyebrow">
          Campaign complete · {MISSIONS.length} missions · {MISSIONS[0].launchDateISO.slice(0, 4)}–
          {MISSIONS[MISSIONS.length - 1].launchDateISO.slice(0, 4)}
        </p>
        <h1 id="mo-outro-title" className="mo-title">
          End of transmission
        </h1>
        <p className="mo-lede">
          Nearly fifty years of planetary exploration, flown in launch order. Here is what your satellites sent home.
        </p>
      </header>

      <dl className="mo-outro__totals">
        {totals.map((t, i) => (
          <div key={t.label} className="mo-outro__total" style={{ '--mo-i': i } as CSSProperties}>
            <dt>{t.label}</dt>
            <dd className="mo-mono">{t.value}</dd>
          </div>
        ))}
      </dl>

      <section className="mo-outro__log" aria-label="Flight log">
        <p className="mo-outcome__section-label">Flight log · worlds scanned</p>
        <ol className="mo-outro__missions">
          {log.map(({ mission: m, completed, worlds, stars }, i) => (
            <li
              key={m.id}
              className={`mo-outro__mission${completed ? '' : ' is-pending'}`}
              style={{ '--mo-i': i } as CSSProperties}
            >
              <div className="mo-outro__mission-id">
                <span className="mo-outro__code mo-mono">{m.code}</span>
                <strong>{m.spacecraft}</strong>
                <span className="mo-outro__date mo-mono">{formatLaunchDate(m.launchDateISO)}</span>
              </div>
              <ul className="mo-outro__worlds">
                {worlds.length > 0 ? (
                  worlds.map((id) => <li key={id}>{bodyName(id)}</li>)
                ) : (
                  <li className="is-empty">Not flown</li>
                )}
              </ul>
              <StarMeter stars={stars} />
            </li>
          ))}
        </ol>
      </section>

      <section className="mo-pbd" aria-labelledby="mo-pbd-title">
        <div className="mo-pbd__frame" aria-hidden="true">
          <span className="mo-pbd__ray mo-pbd__ray--1" />
          <span className="mo-pbd__ray mo-pbd__ray--2" />
          <span className="mo-pbd__ray mo-pbd__ray--3" />
          <span className="mo-pbd__ray mo-pbd__ray--4" />
          <span className="mo-pbd__dot" />
          <span className="mo-pbd__grain" />
        </div>
        <div className="mo-pbd__text">
          <p className="mo-eyebrow">Voyager 1 · February 14, 1990 · about 6 billion km from home</p>
          <h2 id="mo-pbd-title" className="mo-pbd__title">
            A pale blue dot
          </h2>
          <p>
            Before switching its cameras off for good, Voyager 1 turned around and photographed the planets it had
            left behind. At Carl Sagan's suggestion, one of those frames pointed back at Earth. From beyond Neptune's
            orbit, our world is less than a single pixel, a speck of light caught in a scattered sunbeam.
          </p>
          <p>
            Every spacecraft in this archive left from that speck. Every world you scanned was first wondered about
            by people standing on it. Thank you for flying with Mission Control.
          </p>
          <p className="mo-pbd__sign mo-mono">— Mission Orbit flight team</p>
        </div>
      </section>

      <div className="mo-outcome__actions mo-outro__actions">
        <button type="button" className="mo-btn mo-btn--ghost" onClick={goTitle}>
          Title screen
        </button>
        <button type="button" className="mo-btn mo-btn--primary" onClick={goArchive}>
          <IconArrowLeft size={16} /> Mission archive
        </button>
      </div>
    </section>
  );
}

export default OutroScreen;
