/**
 * ObjectivesScreen.tsx — The level's objectives (replaces the old Briefing).
 *
 * Opens when a level is chosen in the Archive. Shows the level's goal, one checklist line for every
 * target to scan, and the NASA launch details. Press Play to hand over to the Explore (gameplay)
 * screen, which is built separately.
 *
 * Keyboard: Enter = Play, Esc = Back to the Archive.
 */

import { useEffect } from 'react';
import type { CSSProperties } from 'react';
import { LaunchDateBadge } from '../components/archive/LaunchDateBadge';
import { IconArrowLeft, IconArrowRight } from '../components/ui/icons';
import { BodyPortrait } from '../components/ui/planet/BodyPortrait';
import { getCodexEntry } from '../data/codexEntries';
import { MISSIONS, getMission, type Mission } from '../data/missions';
import { uiAudio } from '../engine/uiAudio';
import { useGameStore } from '../store/useGameStore';

export function ObjectivesScreen() {
  const selectedId = useGameStore((s) => s.selectedMissionId);
  const scanned = useGameStore((s) => s.scannedBodies);
  const codexOpen = useGameStore((s) => s.codexOpen);
  const openCodex = useGameStore((s) => s.openCodex);
  const setScreen = useGameStore((s) => s.setScreen);

  // Fall back to level 1 if someone lands here without choosing a level.
  const mission: Mission = getMission(selectedId) ?? MISSIONS[0];
  const featured = getCodexEntry(mission.featuredBody);

  const goBack = (): void => {
    uiAudio.sfx.click();
    setScreen('archive');
  };
  const play = (): void => {
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
  }, [codexOpen]);

  const scannedSet = new Set(scanned.map((n) => n.toLowerCase()));

  return (
    <section className="mo-screen mo-obj" aria-labelledby="mo-obj-title">
      <div className="mo-obj__grid">
        <aside className="mo-obj__target" aria-label="Level target">
          <div className="mo-obj__body" key={mission.id}>
            <BodyPortrait
              art={mission.featuredBody}
              size={mission.featuredBody === 'saturn' ? 200 : 250}
              label={`${featured?.title ?? mission.featuredBody}, primary target`}
            />
          </div>
          <LaunchDateBadge launch={mission.launch} />
          <p className="mo-obj__launch">
            {mission.launch.vehicle} · {mission.launch.site}
          </p>
        </aside>

        <div className="mo-obj__main">
          <p className="mo-eyebrow">
            Level {mission.level} · {mission.spacecraft}
          </p>
          <h1 id="mo-obj-title" className="mo-title">
            Objectives
          </h1>
          <p className="mo-obj__goal">{mission.goal}</p>

          <ol className="mo-obj__list">
            {mission.targets.map((t, i) => {
              const isDone = scannedSet.has(t.toLowerCase());
              return (
                <li key={t} className={isDone ? 'is-done' : ''} style={{ '--mo-i': i } as CSSProperties}>
                  <span className="mo-obj__check" aria-hidden="true" />
                  <span className="mo-obj__name">Scan {t}</span>
                  <button
                    type="button"
                    className="mo-obj__info"
                    onClick={() => {
                      uiAudio.sfx.click();
                      openCodex(t);
                    }}
                    aria-label={`Read about ${t} in the Celestial Codex`}
                  >
                    About
                  </button>
                </li>
              );
            })}
          </ol>

          <p className="mo-obj__how">
            Dodge the asteroids. When a target comes into range, time slows and your movement keys lock. Type its
            name to scan it.
          </p>

          <div className="mo-obj__actions">
            <button type="button" className="mo-btn mo-btn--ghost" onClick={goBack}>
              <IconArrowLeft size={16} /> Back
            </button>
            <button type="button" className="mo-btn mo-btn--primary is-pulsing" onClick={play}>
              Play <IconArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ObjectivesScreen;
